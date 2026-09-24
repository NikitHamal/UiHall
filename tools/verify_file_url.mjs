/**
 * Check that UI Hall works when opened straight off disk (file://), where the
 * browser blocks fetch(). Runs the same CDP client style as verify_ui.mjs but
 * points at a file:// URL, so it needs no server at all.
 *
 *   node tools/verify_file_url.mjs
 */
import http from "node:http";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const CHROME = process.env.CHROME_BIN ||
  path.join(os.homedir(), "AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe");
const PORT = 9336;
const FILE_URL = "file:///E:/Stormy/ui-hall/index.html";

let pass = 0, fail = 0;
const failures = [];
function check(name, cond, detail = "") {
  if (cond) { pass++; console.log("  ok   " + name); }
  else { fail++; failures.push(name + (detail ? " :: " + detail : "")); console.log("  FAIL " + name + (detail ? "  " + detail : "")); }
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => { try { resolve(JSON.parse(d)); } catch (e) { reject(e); } });
    }).on("error", reject);
  });
}

const userDir = fs.mkdtempSync(path.join(os.tmpdir(), "ui-hall-file-"));
const chrome = spawn(CHROME, [
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${userDir}`,
  "--headless=new", "--no-first-run", "--no-default-browser-check",
  "--disable-gpu", "--hide-scrollbars", "--allow-file-access-from-files",
  "--window-size=1600,1100", "about:blank",
], { stdio: ["ignore", "ignore", "ignore"] });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

try {
  let list;
  for (let i = 0; i < 60; i++) {
    try { list = await getJson(`http://127.0.0.1:${PORT}/json/list`); if (list.length) break; } catch {}
    await sleep(200);
  }
  const page = list.find((t) => t.type === "page");
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));

  let id = 0;
  const pending = new Map();
  const consoleErrors = [];
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    if (m.method === "Runtime.exceptionThrown") {
      consoleErrors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
    }
    if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") {
      consoleErrors.push((m.params.args || []).map((a) => a.value).join(" "));
    }
  };
  const send = (method, params = {}) => new Promise((r) => {
    const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params }));
  });
  const evalJs = async (expr) => {
    const r = await send("Runtime.evaluate", {
      expression: `(async () => { ${expr} })()`, awaitPromise: true, returnByValue: true,
    });
    if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || "eval threw");
    return r.result?.result?.value;
  };

  await send("Runtime.enable");
  await send("Page.enable");

  const loaded = new Promise((r) => {
    const h = (e) => { const m = JSON.parse(e.data); if (m.method === "Page.loadEventFired") r(); };
    ws.addEventListener("message", h);
  });
  await send("Page.navigate", { url: FILE_URL });
  await loaded;
  await sleep(6000);

  console.log("\nfile:// load path");
  const state = JSON.parse(await evalJs(`
    return JSON.stringify({
      protocol: location.protocol,
      hasGlobal: typeof window.STORMY_CORPUS !== 'undefined',
      cards: document.querySelectorAll('.card').length,
      text: document.body.innerText.length,
      total: (typeof DATA !== 'undefined' && DATA.corpus) ? DATA.corpus.assets.length : -1,
      title: document.title,
      facets: document.querySelectorAll('#fCategory .chip').length,
    });
  `));

  check("page is on file://", state.protocol === "file:", state.protocol);
  check("corpus.js global is defined", state.hasGlobal);
  check("data layer resolved the corpus", state.total === 483, String(state.total));
  check("cards rendered", state.cards > 0, String(state.cards));
  check("page has real text", state.text > 500, String(state.text));
  check("category facets built", state.facets > 5, String(state.facets));
  check("no console errors", consoleErrors.length === 0, consoleErrors.slice(0, 3).join(" | "));

  console.log("\nmedia from disk");
  const media = JSON.parse(await evalJs(`
    const imgs = [...document.querySelectorAll('.card img')];
    const done = imgs.filter(i => i.complete);
    const broken = done.filter(i => !i.naturalWidth);
    return JSON.stringify({
      total: imgs.length,
      complete: done.length,
      broken: broken.length,
      firstSrc: imgs[0] ? imgs[0].getAttribute('src') : null,
    });
  `));
  check("thumbnails loaded from disk", media.complete > 10, JSON.stringify(media));
  check("no broken thumbnails", media.broken === 0, String(media.broken));

  // A video element on file:// - does the clip actually decode? Take the id
  // from the corpus rather than hardcoding one; asset ids are not contiguous.
  const video = JSON.parse(await evalJs(`
    const withClip = DATA.corpus.assets.find(a => a.clip);
    if (!withClip) return JSON.stringify({ skip: 'no clip in corpus' });
    const v = document.createElement('video');
    v.src = withClip.clip;
    v.muted = true;
    document.body.appendChild(v);
    await new Promise((res) => {
      v.addEventListener('loadeddata', res, { once: true });
      v.addEventListener('error', res, { once: true });
      setTimeout(res, 6000);
    });
    const out = JSON.stringify({
      id: withClip.id, readyState: v.readyState,
      w: v.videoWidth, h: v.videoHeight, err: v.error ? v.error.code : null,
    });
    v.remove();
    return out;
  `));
  check("video clip decodes from disk", video.readyState >= 2 && video.w > 0, JSON.stringify(video));

  ws.close();
} catch (e) {
  console.error("harness error:", e.message);
  fail++;
} finally {
  try { chrome.kill(); } catch {}
  try { fs.rmSync(userDir, { recursive: true, force: true }); } catch {}
}

console.log(`\n${pass} passed, ${fail} failed`);
if (failures.length) { console.log("\nfailed:"); for (const f of failures) console.log("  - " + f); }
process.exit(fail ? 1 : 0);
