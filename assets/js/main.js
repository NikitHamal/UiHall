/* UI Hall — app shell: data, router, navigation, theme, command palette.
   The engine is the same file the MCP server runs (mcp/src/engine.js). */

import { UiHall } from '../../mcp/src/engine.js';
import { $, $$, glow, reveal } from './lib.js';
import { openCmd, openKeys } from './cmdk.js';
import { board } from './board.js';
import { openDetail, closeDetail, isDetailOpen } from './views/detail.js';

const VIEWS = {
  '': () => import('./views/home.js'),
  library: () => import('./views/library.js'),
  patterns: () => import('./views/patterns.js'),
  colour: () => import('./views/colour.js'),
  motion: () => import('./views/motion.js'),
  agents: () => import('./views/agents.js'),
  board: () => import('./views/board.js'),
  originals: () => import('./views/originals.js'),
  demos: () => import('./views/demos.js'),
};

export const app = { h: null, view: null, viewName: null, cleanup: null, cameFromApp: false };

/* ---------------------------------------------------------------- data -- */
async function loadCorpus() {
  const r = await fetch('data/corpus.json');
  if (!r.ok) throw new Error(`corpus.json → ${r.status}`);
  return r.json();
}

/* -------------------------------------------------------------- router -- */
export function parseHash() {
  const raw = location.hash.replace(/^#\/?/, '');
  const [path, qs = ''] = raw.split('?');
  const parts = path.split('/').filter(Boolean);
  return { name: parts[0] || '', arg: parts[1], params: new URLSearchParams(qs) };
}

export function go(hash) {
  if (location.hash !== hash) location.hash = hash;
}

async function route() {
  const r = parseHash();
  if (r.name === 'a' && r.arg) {
    if (!app.viewName && app.viewName !== '') await render('library', r);
    openDetail(app, r.arg.toUpperCase());
    return;
  }
  if (isDetailOpen()) closeDetail();
  const name = r.name in VIEWS ? r.name : '';
  if (name === app.viewName && app.view?.update) { app.view.update(r); return; }
  await render(name, r);
}

async function render(name, r) {
  const mod = await VIEWS[name]();
  app.cleanup?.();
  const main = $('#main');
  const doRender = () => {
    main.innerHTML = '';
    main.classList.remove('view-enter');
    void main.offsetWidth;
    main.classList.add('view-enter');
    app.view = mod.default(main, app, r) || {};
    app.cleanup = app.view.cleanup;
    app.viewName = name;
    reveal(main);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };
  if (document.startViewTransition && app.viewName !== null && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    await document.startViewTransition(doRender).finished.catch(() => {});
  } else doRender();
  markNav(name);
  document.title = { '': 'UI Hall — design evidence for humans and agents', library: 'Library · UI Hall', patterns: 'Patterns · UI Hall', colour: 'Colour · UI Hall', motion: 'Motion · UI Hall', agents: 'For agents · UI Hall', board: 'Board · UI Hall', originals: 'Originals · UI Hall', demos: 'Demos · UI Hall' }[name];
}

/* ----------------------------------------------------------------- nav -- */
function markNav(name) {
  for (const a of $$('.rail__link, .tabbar a')) {
    if (a.dataset.nav === name) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  }
  $('#rail').classList.remove('open');
}

function drawer() {
  const rail = $('#rail'), scrim = $('#railScrim');
  $('#menuBtn').addEventListener('click', () => rail.classList.add('open'));
  scrim.addEventListener('click', () => rail.classList.remove('open'));
  addEventListener('keydown', (e) => { if (e.key === 'Escape') rail.classList.remove('open'); });
}

function theme() {
  $('#themeBtn').addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    const swap = () => {
      document.documentElement.dataset.theme = next;
      $('meta[name="theme-color"]').content = next === 'dark' ? '#0A0A0B' : '#F3F1EC';
    };
    document.startViewTransition ? document.startViewTransition(swap) : swap();
    try { localStorage.setItem('uh-theme', next); } catch {}
  });
}

/* ---------------------------------------------------------------- boot -- */
async function boot() {
  theme();
  drawer();
  glow();
  $('#openCmd').addEventListener('click', () => openCmd(app));
  addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openCmd(app); }
    if (e.key === '/' && !/input|textarea|select/i.test(document.activeElement?.tagName)) { e.preventDefault(); openCmd(app); }
  });
  $('#keysBtn').addEventListener('click', () => openKeys());
  addEventListener('keydown', (e) => {
    if (/input|textarea|select/i.test(document.activeElement?.tagName) || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === '?') { e.preventDefault(); openKeys(); }
    const jump = { g: '#/', l: '#/library', b: '#/board', a: '#/agents', c: '#/colour', m: '#/motion' }[e.key];
    if (jump && !isDetailOpen()) location.hash = jump;
  });
  const badge = $('#boardBadge');
  const syncBadge = (bump) => {
    badge.textContent = board.list().length || '';
    if (bump) { badge.classList.remove('bump'); void badge.offsetWidth; badge.classList.add('bump'); }
  };
  addEventListener('uh:board', () => syncBadge(true));
  syncBadge(false);
  app.viewName = null;
  try {
    app.h = new UiHall(await loadCorpus(), { site: new URL('.', location.href).href });
    window.__uh = app.h;
    const t = app.h.corpus.totals;
    $('#railStat').innerHTML = `<b>${t.assets}</b> references · <b>${t.originals || 0}</b> originals`;
    $('.search__ph').textContent = `Search ${t.assets} references, patterns, colours…`;
  } catch (e) {
    $('#main').innerHTML = `<div class="container page-head"><h1 class="display h-md">The corpus didn’t load.</h1><p class="lede">${e.message}. If you opened this file directly, serve the repo over http: <code>node tools/serve.mjs</code>.</p></div>`;
    return;
  }
  addEventListener('hashchange', () => { app.cameFromApp = true; route(); });
  await route();
}

boot();
