/**
 * Headless verification for UI Hall, driven over the Chrome DevTools Protocol.
 *
 *   node tools/verify_ui.mjs [url]
 *
 * No npm install: it talks to Chrome over a WebSocket built from node:http.
 * Asserts the things a static-HTML check cannot: that the corpus loads, every
 * rendered thumbnail resolves, filters actually change the result set, and no
 * console error or failed request ever fires.
 *
 * With no url it starts and stops its own static server. Relying on one started
 * by the calling shell is a trap: the background process gets reaped between
 * commands, every assertion then fails on ERR_CONNECTION_REFUSED, and it looks
 * like the app broke rather than the harness.
 */
import http from "node:http";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const CHROME = process.env.CHROME_BIN ||
  path.join(os.homedir(), "AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe");
const PORT = 9333;
const SERVE_PORT = 8788;
const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));

let server = null;
async function startServer() {
  server = spawn(process.execPath, [path.join(HERE, "serve.mjs"), String(SERVE_PORT)], {
    stdio: ["ignore", "ignore", "ignore"],
  });
  const t0 = Date.now();
  while (Date.now() - t0 < 10000) {
    const code = await new Promise((res) => {
      http.get(`http://127.0.0.1:${SERVE_PORT}/`, (r) => { r.resume(); res(r.statusCode); })
        .on("error", () => res(0));
    });
    if (code === 200) return;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`static server never came up on ${SERVE_PORT}`);
}

const URL_UNDER_TEST = process.argv[2] || `http://127.0.0.1:${SERVE_PORT}/`;

let pass = 0;
const failures = [];
function check(name, cond, detail = "") {
  if (cond) { pass++; console.log("  ok   " + name); }
  else { failures.push(name + (detail ? " :: " + detail : "")); console.log("  FAIL " + name + (detail ? "  [" + detail + "]" : "")); }
}

/* ------------------------------------------------------------- CDP glue -- */
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
  throw new Error("Chrome never exposed its DevTools endpoint");
}

/** Minimal CDP client over a raw WebSocket (node:http upgrade handshake). */
class CDP {
  constructor(ws) { this.ws = ws; this.seq = 0; this.pending = new Map(); this.listeners = []; }

  static connect(wsUrl) {
    return new Promise((resolve, reject) => {
      const u = new URL(wsUrl);
      const key = Buffer.from(String(Math.random())).toString("base64");
      const req = http.request({
        hostname: u.hostname, port: u.port, path: u.pathname + u.search,
        headers: {
          Connection: "Upgrade", Upgrade: "websocket",
          "Sec-WebSocket-Key": key, "Sec-WebSocket-Version": "13",
        },
      });
      req.on("upgrade", (res, socket) => {
        const c = new CDP(socket);
        socket.on("data", (buf) => c._onData(buf));
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
      const fin = (b[0] & 0x80) !== 0;
      const op = b[0] & 0x0f;
      const masked = (b[1] & 0x80) !== 0; // servers normally do not mask, but be correct
      let len = b[1] & 0x7f;
      let off = 2;
      if (len === 126) { if (b.length < 4) return; len = b.readUInt16BE(2); off = 4; }
      else if (len === 127) { if (b.length < 10) return; len = Number(b.readBigUInt64BE(2)); off = 10; }
      const maskKey = masked ? b.subarray(off, off + 4) : null;
      if (masked) off += 4;
      if (b.length < off + len) return;
      let payload = b.subarray(off, off + len);
      if (masked) {
        const un = Buffer.alloc(len);
        for (let i = 0; i < len; i++) un[i] = payload[i] ^ maskKey[i % 4];
        payload = un;
      }
      this._buf = b.subarray(off + len);
      if (op === 0x1 || op === 0x0) {
        if (!fin) { this._frag = Buffer.concat([this._frag || Buffer.alloc(0), payload]); continue; }
        const full = this._frag ? Buffer.concat([this._frag, payload]) : payload;
        this._frag = null;
        let msg; try { msg = JSON.parse(full.toString("utf8")); } catch { continue; }
        if (msg.id !== undefined && this.pending.has(msg.id)) {
          const { resolve, reject } = this.pending.get(msg.id);
          this.pending.delete(msg.id);
          msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
        } else if (msg.method) {
          for (const fn of this.listeners) fn(msg);
        }
      } else if (op === 0x8) { /* close */ }
    }
  }

  send(method, params = {}) {
    const id = ++this.seq;
    const data = Buffer.from(JSON.stringify({ id, method, params }), "utf8");
    // Frame header: FIN+text, then MASK|len. Build the length bytes first so the
    // mask bit does not collide with the 126/127 escape markers.
    const len = data.length;
    let head;
    if (len < 126) head = Buffer.alloc(2), head[1] = 0x80 | len;
    else if (len < 65536) head = Buffer.alloc(4), head[1] = 0x80 | 126, head.writeUInt16BE(len, 2);
    else head = Buffer.alloc(10), head[1] = 0x80 | 127, head.writeBigUInt64BE(BigInt(len), 2);
    head[0] = 0x81;
    const mask = Buffer.from([1, 2, 3, 4]);
    const masked = Buffer.alloc(len);
    for (let i = 0; i < len; i++) masked[i] = data[i] ^ mask[i % 4];
    this.ws.write(Buffer.concat([head, mask, masked]));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }

  on(fn) { this.listeners.push(fn); }

  /** Evaluate an expression in the page and return its JSON value. */
  async eval(expr) {
    const r = await this.send("Runtime.evaluate", {
      expression: `(async () => { ${expr} })()`,
      awaitPromise: true, returnByValue: true,
    });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || "eval threw");
    return r.result.value;
  }

  close() { try { this.ws.destroy(); } catch {} }
}

/* ---------------------------------------------------------------- runner -- */
const userDir = fs.mkdtempSync(path.join(os.tmpdir(), "ui-hall-verify-"));
if (!process.argv[2]) await startServer();
const chrome = spawn(CHROME, [
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${userDir}`,
  "--headless=new",
  "--no-first-run", "--no-default-browser-check",
  "--disable-gpu", "--disable-extensions",
  "--window-size=1440,1000",
  "about:blank",
], { stdio: ["ignore", "ignore", "pipe"] });

let chromeErr = "";
chrome.stderr.on("data", (d) => (chromeErr += d.toString()));

let cdp;
try {
  await waitForDevTools();
  const targets = await getJson(`http://127.0.0.1:${PORT}/json/list`);
  const page = targets.find((t) => t.type === "page");
  cdp = await CDP.connect(page.webSocketDebuggerUrl);

  const consoleErrors = [];
  const failedRequests = [];
  const network404 = [];

  cdp.on((msg) => {
    if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error") {
      consoleErrors.push(msg.params.args.map((a) => a.value ?? a.description ?? a.type).join(" "));
    }
    if (msg.method === "Runtime.exceptionThrown") {
      consoleErrors.push("EXCEPTION: " + (msg.params.exceptionDetails?.exception?.description || ""));
    }
    if (msg.method === "Network.loadingFailed") {
      failedRequests.push(msg.params.errorText);
    }
    if (msg.method === "Network.responseReceived" && msg.params.response.status >= 400) {
      network404.push(msg.params.response.status + " " + msg.params.response.url);
    }
  });

  await cdp.send("Runtime.enable");
  await cdp.send("Network.enable");
  await cdp.send("Page.enable");

  /* ------------------------------------------------------------ load --- */
  console.log("\npage load");
  const loaded = new Promise((r) => {
    const fn = (m) => { if (m.method === "Page.loadEventFired") r(); };
    cdp.on(fn);
  });
  await cdp.send("Page.navigate", { url: URL_UNDER_TEST });
  await loaded;
  // Let the corpus fetch + first render settle.
  await new Promise((r) => setTimeout(r, 2500));

  check("no console errors during load", consoleErrors.length === 0, consoleErrors.slice(0, 4).join(" | "));
  check("no failed network requests", failedRequests.length === 0, failedRequests.slice(0, 4).join(" | "));
  check("no 4xx/5xx responses", network404.length === 0, network404.slice(0, 4).join(" | "));

  /* --------------------------------------------------------- data --- */
  console.log("\ndata layer");
  const dataState = await cdp.eval(`
    return {
      hasData: typeof DATA !== 'undefined',
      hasFilters: typeof Filters !== 'undefined',
      hasApp: typeof App !== 'undefined',
      total: DATA.all().length,
      firstId: DATA.all()[0]?.id,
      described: DATA.all().filter(a => a.description).length,
      corpusKeys: Object.keys(DATA.corpus),
    };
  `);
  check("DATA global is present", dataState.hasData);
  check("Filters global is present", dataState.hasFilters);
  check("App global is present", dataState.hasApp);
  check("corpus resolves 483 assets", dataState.total === 483, String(dataState.total));
  check("assets carry descriptions", dataState.described > 150, String(dataState.described));
  check("corpus exposes printed palettes", dataState.corpusKeys.includes("printed_palettes"), dataState.corpusKeys.join(","));

  /* ------------------------------------------------------ rendering --- */
  console.log("\nrendering");
  const renderState = await cdp.eval(`
    const cards = document.querySelectorAll('.card');
    const imgs = [...document.querySelectorAll('.card img')];
    return {
      cardCount: cards.length,
      imgCount: imgs.length,
      broken: imgs.filter(i => i.complete && i.naturalWidth === 0).map(i => i.getAttribute('src')),
      pending: imgs.filter(i => !i.complete).length,
      bodyText: document.body.innerText.length,
      title: document.title,
    };
  `);
  check("cards render", renderState.cardCount > 0, String(renderState.cardCount));
  check("thumbnails render", renderState.imgCount > 0, String(renderState.imgCount));
  check("no broken thumbnails", renderState.broken.length === 0, renderState.broken.slice(0, 5).join(" , "));
  check("page has real text", renderState.bodyText > 500, String(renderState.bodyText));
  check("document has a title", !!renderState.title, renderState.title);

  /* -------------------------------------------------------- filters --- */
  console.log("\nfilters");
  const filterState = await cdp.eval(`
    // Rendering is chunked (60 cards per animation frame). A poll that stops on
    // "count unchanged" exits during a gap, so require a stable count across
    // several consecutive reads AND an idle frame.
    const settle = async () => {
      const idle = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      let prev = -1, stable = 0;
      for (let i = 0; i < 400; i++) {
        await idle();
        const n = document.querySelectorAll('.card').length;
        if (n === prev) { if (++stable >= 6) return n; } else { stable = 0; prev = n; }
      }
      return document.querySelectorAll('.card').length;
    };
    const before = await settle();
    Filters.set('category', ['website']);
    App.syncControls(); App.renderResults();
    const after = await settle();
    Filters.resetAll(); App.syncControls(); App.renderResults();
    const restored = await settle();
    return { before, after, restored };
  `);
  check("filtering changes the result set", filterState.after > 0 && filterState.after < filterState.before,
    `${filterState.before} -> ${filterState.after}`);
  check("resetting restores the full set", filterState.restored === filterState.before,
    `${filterState.restored} vs ${filterState.before}`);

  /* ------------------------------------------------------- typography --- */
  console.log("\ntypography");
  const typeState = await cdp.eval(`
    const loaded = [...document.fonts].map(f => ({ family: f.family, status: f.status }));
    const bodyFont = getComputedStyle(document.body).fontFamily;
    // Does the shipped face actually render, or are we on the fallback?
    const probe = document.createElement('span');
    probe.style.cssText = 'position:absolute;font-size:48px;font-weight:700;font-family:"Poppins"';
    probe.textContent = 'UI Hall 483';
    document.body.appendChild(probe);
    const wPoppins = probe.getBoundingClientRect().width;
    probe.style.fontFamily = 'monospace';
    const wMono = probe.getBoundingClientRect().width;
    probe.remove();
    return JSON.stringify({
      families: loaded.map(f => f.family + ':' + f.status),
      bodyFont,
      shipsFont: Math.abs(wPoppins - wMono) > 0.5,
      // Poppins has no variable axis, so the four weights must each be present.
      weights: [...document.fonts].map(f => f.weight).sort(),
    });
  `);
  const type = JSON.parse(typeState);
  check("the Poppins face is registered", type.families.some((f) => f.startsWith("Poppins:loaded")),
    type.families.join(", ") || "none");
  check("body resolves to the shipped font", /Poppins/.test(type.bodyFont), type.bodyFont);
  check("Poppins actually measures differently to a fallback", type.shipsFont);
  check("all four static weights are declared",
    ["400", "500", "600", "700"].every((w) => type.weights.includes(w)),
    type.weights.join(","));

  /* ------------------------------------------------- custom components -- */
  console.log("\ncustom controls");
  const ctrlState = await cdp.eval(`
    const sel = document.getElementById('sort');
    const inst = (typeof Listbox !== 'undefined') ? Listbox.registry.get(sel) : null;
    const trig = inst ? inst.trigger : null;
    const out = {};

    out.enhanced = !!inst;
    out.nativeHidden = sel ? sel.classList.contains('listbox__native') : false;
    out.hasNativePopup = !!document.querySelector('.select select:not(.listbox__native)');
    out.options = inst ? inst.list.querySelectorAll('[role="option"]').length : 0;

    // closed state
    out.closedExpanded = trig ? trig.getAttribute('aria-expanded') : null;
    const listClosed = inst ? getComputedStyle(inst.list).visibility : null;
    out.closedHidden = listClosed;

    // open via keyboard on the trigger
    trig.focus();
    trig.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await new Promise(r => setTimeout(r, 60));
    out.openExpanded = trig.getAttribute('aria-expanded');
    out.openVisible = getComputedStyle(inst.list).visibility;
    out.activeDescendant = inst.list.getAttribute('aria-activedescendant');
    out.activeIsReal = !!(out.activeDescendant && document.getElementById(out.activeDescendant));

    // move down, then commit with Enter
    const firstActive = out.activeDescendant;
    trig.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await new Promise(r => setTimeout(r, 30));
    const secondActive = inst.list.getAttribute('aria-activedescendant');
    out.activeMoved = firstActive !== secondActive;

    // ArrowDown from the trigger opens on the *current* value, so one more step
    // lands on the next option; commit it and check the select followed.
    let changed = false;
    sel.addEventListener('change', () => { changed = true; }, { once: true });
    trig.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await new Promise(r => setTimeout(r, 60));
    out.committed = changed;
    out.selectValue = sel.value;
    out.triggerLabel = trig.textContent.trim();
    out.closedAfterCommit = trig.getAttribute('aria-expanded');

    // Escape closes and returns focus
    trig.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await new Promise(r => setTimeout(r, 40));
    inst.list.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await new Promise(r => setTimeout(r, 40));
    out.escaped = trig.getAttribute('aria-expanded') === 'false';
    out.focusReturned = document.activeElement === trig;

    // programmatic sync (what App.syncControls does)
    sel.value = 'title';
    Listbox.sync(sel);
    out.syncedLabel = trig.textContent.trim();

    // restore
    sel.value = 'curated'; Listbox.sync(sel);
    Filters.set('sort', 'curated'); App.syncControls(); App.renderResults();

    // slider: styled track and a computed fill
    const size = document.getElementById('cardSize');
    size.value = '360';
    size.dispatchEvent(new Event('input', { bubbles: true }));
    out.fill = size.style.getPropertyValue('--fill');
    out.cardSize = getComputedStyle(document.documentElement).getPropertyValue('--card-size').trim();
    out.appearance = getComputedStyle(size).appearance;
    size.value = '280'; size.dispatchEvent(new Event('input', { bubbles: true }));
    return JSON.stringify(out);
  `);
  const c = JSON.parse(ctrlState);
  check("native select was replaced", c.enhanced && c.nativeHidden && !c.hasNativePopup,
    `enhanced=${c.enhanced} hidden=${c.nativeHidden} leftover=${c.hasNativePopup}`);
  check("listbox exposes every option", c.options === 5, String(c.options));
  check("popup starts closed", c.closedExpanded === "false" && c.closedHidden === "hidden",
    `${c.closedExpanded} / ${c.closedHidden}`);
  check("keyboard opens the popup", c.openExpanded === "true" && c.openVisible === "visible",
    `${c.openExpanded} / ${c.openVisible}`);
  check("aria-activedescendant points at a real option", c.activeIsReal, String(c.activeDescendant));
  check("arrow keys move the active option", c.activeMoved);
  check("Enter commits and fires change", c.committed, `value=${c.selectValue}`);
  check("trigger label follows the value", c.triggerLabel === "Newest first", c.triggerLabel);
  check("popup closes after committing", c.closedAfterCommit === "false", String(c.closedAfterCommit));
  check("Escape closes the popup", c.escaped);
  check("focus returns to the trigger", c.focusReturned);
  check("programmatic value changes repaint the trigger", c.syncedLabel === "A → Z", c.syncedLabel);
  check("slider is not using the native appearance", c.appearance === "none", c.appearance);
  // (360 - 180) / (460 - 180) = 64.3%
  check("slider fill tracks the value", c.fill === "64.3%", c.fill);
  check("slider drives the card size variable", c.cardSize === "360px", c.cardSize);

  /* ---------------------------------------------------- url routing --- */
  console.log("\nrouting");
  const routeState = await cdp.eval(`
    const settle = async (sel) => {
      const idle = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      let prev = -1, stable = 0;
      for (let i = 0; i < 400; i++) {
        await idle();
        const n = document.querySelectorAll(sel).length;
        if (n === prev) { if (++stable >= 6) return n; } else { stable = 0; prev = n; }
      }
      return document.querySelectorAll(sel).length;
    };
    const go = async (hash) => {
      location.hash = hash;
      window.dispatchEvent(new HashChangeEvent('hashchange'));
      await new Promise(r => setTimeout(r, 250));
    };
    await go('#/palettes');
    const pal = await settle('.palcard:not(.palcard--tally)');
    const tallyTiles = await settle('.palcard--tally');
    const bandText = [...document.querySelectorAll('.palcard:not(.palcard--tally) .palcard__band')].map(b => b.textContent.trim()).filter(Boolean).length;
    await go('#/patterns');
    const pat = await settle('.pattern, .pattern-card, .pcard, .patterns .card');
    await go('#/before-after');
    const ba = await settle('.card');
    await go('#/motion');
    const mo = await settle('.card');
    await go('#/about');
    const about = document.body.innerText.length;
    await go('#/');
    const homeLen = document.body.innerText.length;
    const homeTools = document.querySelectorAll('.toolcard').length;
    const homeGroups = document.querySelectorAll('.groupcard').length;
    await go('#/gallery');
    await settle('.card');
    const expectedPal = DATA.all().filter(a => a.category === 'color-palette' && (DATA.corpus.printed_palettes || {})[a.id]).length;
    return { pal, tallyTiles, bandText, pat, ba, mo, about, expectedPal, homeLen, homeTools, homeGroups };
  `);
  check("home route renders the showcase", routeState.homeLen > 800, String(routeState.homeLen));
  check("home lists every MCP tool card", routeState.homeTools >= 10, String(routeState.homeTools));
  check("home shows verified app sets", routeState.homeGroups >= 4, String(routeState.homeGroups));
  check("palettes route renders every named card",
    routeState.pal > 0 && routeState.pal === routeState.expectedPal,
    `${routeState.pal} rendered vs ${routeState.expectedPal} in data`);
  check("palettes route renders the corpus colour tally",
    routeState.tallyTiles > 10, `${routeState.tallyTiles} tally tiles`);
  check("palette bands carry their printed names", routeState.bandText >= routeState.expectedPal * 2,
    String(routeState.bandText));
  check("patterns route renders patterns", routeState.pat > 0, String(routeState.pat));
  check("before/after route renders cards", routeState.ba > 0, String(routeState.ba));
  check("motion route renders cards", routeState.mo > 0, String(routeState.mo));
  check("about route renders prose", routeState.about > 800, String(routeState.about));

  // A route sets a baseline scope. Leaving it must release that scope, or a
  // stale kind=video silently narrows every screen visited afterwards.
  const scopeLeak = await cdp.eval(`
    const settle = async (sel) => {
      const idle = () => new Promise(r => requestAnimationFrame(r));
      let prev = -1, stable = 0;
      for (let i = 0; i < 300; i++) {
        await idle();
        const n = document.querySelectorAll(sel).length;
        if (n === prev) { if (++stable >= 8) return n; } else { stable = 0; prev = n; }
      }
      return document.querySelectorAll(sel).length;
    };
    const go = async (h) => {
      location.hash = h;
      window.dispatchEvent(new HashChangeEvent('hashchange'));
      await new Promise(r => setTimeout(r, 250));
    };
    await go('#/');
    const cleanCount = await settle('.card');
    const cleanKind = Filters.state.kind;
    await go('#/motion');
    const motionCount = await settle('.card');
    const motionKind = Filters.state.kind;
    await go('#/');
    const afterCount = await settle('.card');
    const afterKind = Filters.state.kind;
    return { cleanCount, cleanKind, motionCount, motionKind, afterCount, afterKind };
  `);
  check("motion route scopes to video", scopeLeak.motionKind === "video", scopeLeak.motionKind);
  check("motion route narrows the set", scopeLeak.motionCount < scopeLeak.cleanCount,
    `${scopeLeak.motionCount} vs ${scopeLeak.cleanCount}`);
  check("leaving motion releases the video scope", scopeLeak.afterKind === "all", scopeLeak.afterKind);
  check("leaving motion restores the full set", scopeLeak.afterCount === scopeLeak.cleanCount,
    `${scopeLeak.afterCount} vs ${scopeLeak.cleanCount}`);

  /* ------------------------------------------------------ lightbox --- */
  console.log("\nlightbox");
  const lightboxState = await cdp.eval(`
    // The click target is the inner .card__media button, not the card wrapper.
    await new Promise(r => setTimeout(r, 300));
    const target = document.querySelector('.card .card__media') || document.querySelector('.card');
    if (!target) return { opened: false, reason: 'no card' };
    target.click();
    await new Promise(r => setTimeout(r, 800));
    const box = document.getElementById('lightbox');
    const media = document.getElementById('lbMedia');
    const info = document.getElementById('lbInfo');
    const open = !!box && box.hidden === false;
    const res = {
      opened: open,
      hasMedia: !!media && media.children.length > 0,
      mediaTag: media?.querySelector('img, video')?.tagName || null,
      infoLen: info?.innerText?.length || 0,
    };
    // Escape must close it.
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await new Promise(r => setTimeout(r, 250));
    res.closedByEscape = !!box && box.hidden === true;
    res.bodyOverflowRestored = document.body.style.overflow === '';
    return res;
  `);
  check("clicking a card opens the lightbox", lightboxState.opened === true, JSON.stringify(lightboxState));
  check("lightbox shows media", lightboxState.hasMedia === true, String(lightboxState.mediaTag));
  check("lightbox shows a written description", lightboxState.infoLen > 40, String(lightboxState.infoLen));
  check("Escape closes the lightbox", lightboxState.closedByEscape === true);
  check("closing restores page scroll", lightboxState.bodyOverflowRestored === true);

  /* -------------------------------------------------- after settling --- */
  console.log("\nstability");
  // Only the cards actually rendered and scrolled into view will have loaded;
  // the rest are lazy. Assert that every image that *did* load decoded, and
  // that the set of loaded images is non-trivial.
  await cdp.eval(`window.scrollTo(0, document.body.scrollHeight); return true;`);
  await new Promise((r) => setTimeout(r, 2500));
  const settled = await cdp.eval(`
    const imgs = [...document.querySelectorAll('.card img')];
    return {
      total: imgs.length,
      loaded: imgs.filter(i => i.complete && i.naturalWidth > 0).length,
      broken: imgs.filter(i => i.complete && i.naturalWidth === 0).length,
    };
  `);
  check("no image failed to decode", settled.broken === 0, String(settled.broken));
  check("images actually decoded", settled.loaded > 20, `${settled.loaded}/${settled.total}`);
  check("no console errors overall", consoleErrors.length === 0, consoleErrors.slice(0, 4).join(" | "));
  check("no 404s overall", network404.length === 0, network404.slice(0, 6).join(" | "));

  /* ------------------------------------------------ hidden semantics --- */
  console.log("\nhidden semantics");
  // A class rule that sets `display` outranks the UA sheet's [hidden] rule.
  // Any element toggled with `hidden` must actually be display:none, or it
  // stays laid out invisibly and keeps intercepting clicks.
  const hiddenState = await cdp.eval(`
    const ids = ['lightbox', 'activeFilters', 'emptyState', 'sentinel'];
    const out = {};
    for (const id of ids) {
      const n = document.getElementById(id);
      if (!n) continue;
      n.setAttribute('hidden', '');
      out[id] = getComputedStyle(n).display;
    }
    // put the page back the way it was
    document.getElementById('lightbox')?.setAttribute('hidden', '');
    return out;
  `);
  for (const [id, display] of Object.entries(hiddenState)) {
    check(`${id} honours [hidden]`, display === "none", `computed display: ${display}`);
  }

  // And a closed lightbox must not intercept a click aimed at the gallery.
  const passthrough = await cdp.eval(`
    document.getElementById('lightbox')?.setAttribute('hidden', '');
    document.body.style.overflow = '';
    await new Promise(r => setTimeout(r, 200));
    const el = document.elementFromPoint(120, window.innerHeight / 2);
    return { tag: el?.tagName || null, inLightbox: !!el?.closest('#lightbox') };
  `);
  check("a closed lightbox does not cover the page", passthrough.inLightbox === false,
    JSON.stringify(passthrough));

  /* --------------------------------------------------- deep video --- */
  console.log("\nvideo clips");
  const videoState = await cdp.eval(`
    // Find a corpus asset that has a clip and confirm the file is reachable.
    const withClip = DATA.all().filter(a => a.clip);
    if (!withClip.length) return { count: 0 };
    const a = withClip[0];
    const r = await fetch(a.clip, { method: 'HEAD' });
    return { count: withClip.length, ok: r.ok, status: r.status, url: a.clip };
  `);
  check("clips exist in the corpus", videoState.count > 0, String(videoState.count));
  check("a clip file is served", videoState.ok === true, `${videoState.status} ${videoState.url}`);

  cdp.close();
} catch (e) {
  failures.push("harness: " + e.message);
  console.log("  FAIL harness: " + e.message);
} finally {
  try { chrome.kill(); } catch {}
  try { fs.rmSync(userDir, { recursive: true, force: true }); } catch {}
  if (server) { try { server.kill(); } catch {} }
}

console.log(`\n${pass} passed, ${failures.length} failed`);
if (failures.length) {
  console.log("\nfailed:");
  for (const f of failures) console.log("  - " + f);
}
process.exit(failures.length ? 1 : 0);
