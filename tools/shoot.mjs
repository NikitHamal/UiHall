/**
 * Capture screenshots of UI Hall's routes so a human can actually look at them.
 *
 *   node tools/shoot.mjs [url] [outdir]
 *
 * Uses the same minimal CDP client as verify_ui.mjs. Writes PNGs to _work/shots/.
 *
 * If no url is given this starts its own static server and tears it down again
 * at the end. Relying on a server started by the calling shell is fragile: the
 * background process gets reaped between commands, every shot then captures
 * Chrome's "site can't be reached" page, and the only tell is that all nine
 * PNGs come out the same size.
 */
import http from "node:http";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const OUT = path.resolve(process.argv[3] || "E:/Stormy/_work/shots");
const CHROME = process.env.CHROME_BIN ||
  path.join(os.homedir(), "AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe");
const PORT = 9334;
const SERVE_PORT = 8099;
const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));

let server = null;
async function startServer() {
  server = spawn(process.execPath, [path.join(HERE, "serve.mjs"), String(SERVE_PORT)], {
    stdio: ["ignore", "ignore", "ignore"],
  });
  const t0 = Date.now();
  while (Date.now() - t0 < 10000) {
    try {
      const code = await new Promise((res) => {
        http.get(`http://127.0.0.1:${SERVE_PORT}/`, (r) => { r.resume(); res(r.statusCode); })
          .on("error", () => res(0));
      });
      if (code === 200) return;
    } catch { /* keep polling */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`static server never came up on ${SERVE_PORT}`);
}

const URL_UNDER_TEST = process.argv[2] || `http://127.0.0.1:${SERVE_PORT}/`;

fs.mkdirSync(OUT, { recursive: true });

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => { try { resolve(JSON.parse(d)); } catch (e) { reject(e); } });
    }).on("error", reject);
  });
}

async function waitForDevTools(timeoutMs = 20000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try { return await getJson(`http://127.0.0.1:${PORT}/json/version`); }
    catch { await new Promise((r) => setTimeout(r, 250)); }
  }
  throw new Error("no devtools");
}

class CDP {
  constructor(ws) { this.ws = ws; this.seq = 0; this.pending = new Map(); this.listeners = []; }
  static connect(wsUrl) {
    return new Promise((resolve, reject) => {
      const u = new URL(wsUrl);
      const req = http.request({
        hostname: u.hostname, port: u.port, path: u.pathname + u.search,
        headers: {
          Connection: "Upgrade", Upgrade: "websocket",
          "Sec-WebSocket-Key": Buffer.from(String(Math.random())).toString("base64"),
          "Sec-WebSocket-Version": "13",
        },
      });
      req.on("upgrade", (res, socket) => {
        const c = new CDP(socket);
        socket.on("data", (b) => c._onData(b));
        resolve(c);
      });
      req.on("error", reject);
      req.end();
    });
  }
  _onData(buf) {
    this._buf = Buffer.concat([this._buf || Buffer.alloc(0), buf]);
    for (;;) {
      const b = this._buf;
      if (b.length < 2) return;
      const fin = (b[0] & 0x80) !== 0, op = b[0] & 0x0f, masked = (b[1] & 0x80) !== 0;
      let len = b[1] & 0x7f, off = 2;
      if (len === 126) { if (b.length < 4) return; len = b.readUInt16BE(2); off = 4; }
      else if (len === 127) { if (b.length < 10) return; len = Number(b.readBigUInt64BE(2)); off = 10; }
      const mk = masked ? b.subarray(off, off + 4) : null;
      if (masked) off += 4;
      if (b.length < off + len) return;
      let p = b.subarray(off, off + len);
      if (masked) { const u = Buffer.alloc(len); for (let i = 0; i < len; i++) u[i] = p[i] ^ mk[i % 4]; p = u; }
      this._buf = b.subarray(off + len);
      if (op === 0x1 || op === 0x0) {
        if (!fin) { this._frag = Buffer.concat([this._frag || Buffer.alloc(0), p]); continue; }
        const full = this._frag ? Buffer.concat([this._frag, p]) : p;
        this._frag = null;
        let m; try { m = JSON.parse(full.toString("utf8")); } catch { continue; }
        if (m.id !== undefined && this.pending.has(m.id)) {
          const { resolve, reject } = this.pending.get(m.id);
          this.pending.delete(m.id);
          m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result);
        } else if (m.method) for (const fn of this.listeners) fn(m);
      }
    }
  }
  send(method, params = {}) {
    const id = ++this.seq;
    const data = Buffer.from(JSON.stringify({ id, method, params }), "utf8");
    const len = data.length;
    let head;
    if (len < 126) head = Buffer.alloc(2), head[1] = 0x80 | len;
    else if (len < 65536) head = Buffer.alloc(4), head[1] = 0x80 | 126, head.writeUInt16BE(len, 2);
    else head = Buffer.alloc(10), head[1] = 0x80 | 127, head.writeBigUInt64BE(BigInt(len), 2);
    head[0] = 0x81;
    const mask = Buffer.from([9, 8, 7, 6]);
    const masked = Buffer.alloc(len);
    for (let i = 0; i < len; i++) masked[i] = data[i] ^ mask[i % 4];
    this.ws.write(Buffer.concat([head, mask, masked]));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }
  on(fn) { this.listeners.push(fn); }
  async eval(expr) {
    const r = await this.send("Runtime.evaluate", {
      expression: `(async () => { ${expr} })()`, awaitPromise: true, returnByValue: true,
    });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || "eval threw");
    return r.result.value;
  }
  async shot(file, full = false) {
    const r = await this.send("Page.captureScreenshot", {
      format: "png", captureBeyondViewport: full, fromSurface: true,
    });
    fs.writeFileSync(file, Buffer.from(r.data, "base64"));
    return fs.statSync(file).size;
  }
}

const userDir = fs.mkdtempSync(path.join(os.tmpdir(), "ui-hall-shoot-"));
if (!process.argv[2]) await startServer();
const chrome = spawn(CHROME, [
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${userDir}`,
  "--headless=new", "--no-first-run", "--no-default-browser-check",
  "--disable-gpu", "--disable-extensions", "--hide-scrollbars",
  "--window-size=1600,1100", "about:blank",
], { stdio: ["ignore", "ignore", "ignore"] });

let cdp;
try {
  await waitForDevTools();
  const targets = await getJson(`http://127.0.0.1:${PORT}/json/list`);
  const page = targets.find((t) => t.type === "page");
  cdp = await CDP.connect(page.webSocketDebuggerUrl);
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");

  const loaded = new Promise((r) => cdp.on((m) => { if (m.method === "Page.loadEventFired") r(); }));
  await cdp.send("Page.navigate", { url: URL_UNDER_TEST });
  await loaded;
  await new Promise((r) => setTimeout(r, 3000));

  // Refuse to shoot an unreachable page. Without this the script happily writes
  // nine identical PNGs of Chrome's "site can't be reached" screen, and the
  // only symptom is that every file has the same byte size.
  const health = await cdp.eval(`
    return JSON.stringify({
      reachable: !!document.querySelector('.card, #gallery, nav'),
      cards: document.querySelectorAll('.card').length,
      text: document.body.innerText.length,
    });
  `);
  const h = JSON.parse(health);
  if (h.cards === 0 || h.text < 500) {
    throw new Error(`page did not render (cards=${h.cards}, text=${h.text}) - is the server up?`);
  }

  const routes = [
    ["01-gallery", "#/", false],
    ["02-gallery-full", "#/", true],
    ["03-palettes", "#/palettes", false],
    ["04-patterns", "#/patterns", false],
    ["05-before-after", "#/before-after", false],
    ["06-motion", "#/motion", false],
    ["07-about", "#/about", false],
  ];

  for (const [name, hash, full] of routes) {
    await cdp.eval(`
      // Make sure nothing modal is left open from a previous step.
      document.getElementById('lightbox')?.setAttribute('hidden', '');
      document.body.style.overflow = '';
      document.documentElement.dataset.theme = 'dark';
      location.hash = ${JSON.stringify(hash)};
      window.dispatchEvent(new HashChangeEvent('hashchange'));
      await new Promise(r => setTimeout(r, 1500));
      window.scrollTo(0, 0);
      await new Promise(r => setTimeout(r, 500));
      return true;
    `);
    const size = await cdp.shot(path.join(OUT, name + ".png"), full);
    console.log(`  ${name}.png  ${(size / 1024).toFixed(0)} KB`);
  }

  // Lightbox on a described asset
  await cdp.eval(`
    document.getElementById('lightbox')?.setAttribute('hidden', '');
    document.body.style.overflow = '';
    document.documentElement.dataset.theme = 'dark';
    location.hash = '#/';
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    await new Promise(r => setTimeout(r, 1800));
    window.scrollTo(0, 0);
    await new Promise(r => setTimeout(r, 400));
    const btn = document.querySelector('.card .card__media');
    if (btn) btn.click();
    await new Promise(r => setTimeout(r, 1500));
    return true;
  `);
  console.log(`  08-lightbox.png  ${((await cdp.shot(path.join(OUT, "08-lightbox.png")))/1024).toFixed(0)} KB`);

  // Light theme
  await cdp.eval(`
    document.getElementById('lightbox')?.setAttribute('hidden', '');
    document.body.style.overflow = '';
    await new Promise(r => setTimeout(r, 400));
    document.documentElement.dataset.theme = 'light';
    await new Promise(r => setTimeout(r, 900));
    return true;
  `);
  console.log(`  09-light-theme.png  ${((await cdp.shot(path.join(OUT, "09-light-theme.png")))/1024).toFixed(0)} KB`);

  // The custom listbox, open - the control that replaced the native select popup.
  await cdp.eval(`
    document.documentElement.dataset.theme = 'dark';
    await new Promise(r => setTimeout(r, 500));
    const sel = document.getElementById('sort');
    if (typeof Listbox !== 'undefined' && Listbox.registry.get(sel)) {
      Listbox.registry.get(sel).show();
    }
    await new Promise(r => setTimeout(r, 500));
    return true;
  `);
  console.log(`  10-listbox-open.png  ${((await cdp.shot(path.join(OUT, "10-listbox-open.png")))/1024).toFixed(0)} KB`);

  cdp.ws.destroy();
} catch (e) {
  console.error("shoot failed:", e.message);
} finally {
  try { chrome.kill(); } catch {}
  try { fs.rmSync(userDir, { recursive: true, force: true }); } catch {}
  if (server) { try { server.kill(); } catch {} }
}
console.log("\nwrote", OUT);
