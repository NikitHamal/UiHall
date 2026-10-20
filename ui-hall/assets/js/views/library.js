/* The library: faceted search over every reference, laid out as a true
   masonry (real aspect ratios, ranked order preserved left-to-right). */

import { $, $$, esc, icon, debounce, reduced, isTouch, segmented } from '../lib.js';
import { HUE_FAMILIES } from '../../../../mcp/src/color.js';
import { thumb, label, footer } from './shared.js';

const HUE_SW = { red: '#E5484D', orange: '#F76B15', brown: '#8D5B3A', yellow: '#FFD60A', lime: '#B8F230', green: '#30A46C', teal: '#12A594', cyan: '#00A2C7', blue: '#3E63DD', violet: '#8E4EC6', magenta: '#D6409F', black: '#111111', grey: '#8B8D98', white: '#F5F5F5' };
const MULTI = ['category', 'type', 'role', 'style', 'tag'];
const PAGE = 48;

export default function library(root, app, route) {
  const { h } = app;
  const state = fromParams(route.params);

  root.innerHTML = `
  <div class="container lib">
    <aside class="lib__side" id="side" aria-label="Filters">
      <div class="lib__group"><h3>Kind</h3><div class="seg" id="fKind" role="group" aria-label="Kind">
        ${['all', 'image', 'video'].map((k) => `<button type="button" data-v="${k}" aria-pressed="${state.kind === k}">${{ all: 'All', image: 'Images', video: 'Video' }[k]}</button>`).join('')}
      </div></div>
      ${group('category', 'Category', h.corpus.categories.map((c) => [c.id, c.label, c.count]))}
      ${group('role', 'Screen role', h.corpus.roles.map((c) => [c.id, label(c.id), c.count]))}
      ${group('style', 'Style', h.corpus.styles.map((c) => [c.id, label(c.id), c.count]))}
      <div class="lib__group"><h3>Surface <button type="button" data-clear="surface">clear</button></h3><div class="lib__chips" data-facet="surface">
        ${['dark', 'mid', 'light'].map((s) => `<button class="chip" type="button" data-v="${s}" aria-pressed="false">${s}</button>`).join('')}
      </div></div>
      <div class="lib__group"><h3>Colour family <button type="button" data-clear="hue">clear</button></h3><div class="hues" data-facet="hue">
        ${HUE_FAMILIES.map((x) => `<button class="hue" type="button" data-v="${x}" aria-pressed="false" style="--c:${HUE_SW[x]}" title="${x}" aria-label="${x}"></button>`).join('')}
      </div></div>
      <div class="lib__group"><h3>Motion</h3><div class="lib__chips" data-facet="motion"><button class="chip" type="button" data-v="1" aria-pressed="false">Has a motion clip</button></div></div>
      ${group('tag', 'Popular tags', h.corpus.tags.slice(0, 40).map((c) => [c.id, c.id, c.count]))}
    </aside>
    <div class="lib__main">
      <div class="lib__bar">
        <label class="lib__search">${icon.search}<span class="sr-only">Search</span><input class="input" id="q" type="search" placeholder="Search: “dark crypto onboarding”, “pricing toggle”, “bento”…" autocomplete="off" spellcheck="false"></label>
        <button class="btn btn--sm lib__filters-btn" id="filtersBtn" type="button">${icon.filter} Filters</button>
        <span class="lib__count num" id="count"></span>
      </div>
      <div class="lib__active" id="active"></div>
      <div class="masonry" id="grid" aria-live="polite"></div>
      <div class="sentinel" id="more"></div>
    </div>
  </div>
  ${footer(h)}`;

  const grid = $('#grid', root), side = $('#side', root), q = $('#q', root);
  q.value = state.q;
  let results = [], shown = 0, cols = [], colW = 0, gap = 12;

  /* -------------------------------------------------------- filters UI -- */
  function syncUI() {
    for (const el of $$('[data-facet]', side)) {
      const key = el.dataset.facet;
      for (const b of $$('[data-v]', el)) {
        const on = key === 'motion' ? state.motion : key === 'surface' || key === 'hue' ? state[key] === b.dataset.v : state[key].includes(b.dataset.v);
        b.setAttribute('aria-pressed', String(!!on));
      }
    }
    for (const b of $$('#fKind button', side)) b.setAttribute('aria-pressed', String(b.dataset.v === state.kind));
    placeKind?.();
    const chips = [];
    if (state.q) chips.push(['q', state.q, `“${state.q}”`]);
    for (const k of MULTI) for (const v of state[k]) chips.push([k, v, label(v)]);
    if (state.surface) chips.push(['surface', state.surface, `${state.surface} surface`]);
    if (state.hue) chips.push(['hue', state.hue, state.hue]);
    if (state.motion) chips.push(['motion', '1', 'motion clip']);
    if (state.kind !== 'all') chips.push(['kind', state.kind, state.kind]);
    $('#active', root).innerHTML = chips.map(([k, v, t]) => `<button class="chip" type="button" data-rm="${k}" data-v="${esc(v)}">${esc(t)}</button>`).join('')
      + (chips.length > 1 ? '<button class="chip" type="button" data-rm="all" style="background:none">Clear all</button>' : '');
  }

  side.addEventListener('click', (e) => {
    const clr = e.target.closest('[data-clear]');
    if (clr) { const k = clr.dataset.clear; state[k] = MULTI.includes(k) ? [] : ''; return commit(); }
    const b = e.target.closest('[data-facet] [data-v]');
    if (!b) return;
    const key = b.closest('[data-facet]').dataset.facet, v = b.dataset.v;
    if (key === 'motion') state.motion = !state.motion;
    else if (key === 'surface' || key === 'hue') state[key] = state[key] === v ? '' : v;
    else state[key] = state[key].includes(v) ? state[key].filter((x) => x !== v) : [...state[key], v];
    commit();
  });
  const placeKind = segmented($('#fKind', side), (v) => { state.kind = v; commit(); });
  $('#active', root).addEventListener('click', (e) => {
    const b = e.target.closest('[data-rm]');
    if (!b) return;
    const k = b.dataset.rm, v = b.dataset.v;
    if (k === 'all') Object.assign(state, fromParams(new URLSearchParams()));
    else if (k === 'q') { state.q = ''; q.value = ''; }
    else if (MULTI.includes(k)) state[k] = state[k].filter((x) => x !== v);
    else if (k === 'motion') state.motion = false;
    else if (k === 'kind') state.kind = 'all';
    else state[k] = '';
    commit();
  });
  q.addEventListener('input', debounce(() => { state.q = q.value.trim(); commit(true); }, 140));
  $('#filtersBtn', root).addEventListener('click', () => side.classList.toggle('open'));

  /* push state into the URL without re-rendering the view */
  function commit(replace = false) {
    const p = toParams(state);
    const hash = `#/library${p ? `?${p}` : ''}`;
    if (location.hash !== hash) (replace ? history.replaceState : history.pushState).call(history, null, '', hash);
    run();
  }

  /* --------------------------------------------------------- results ---- */
  function run() {
    syncUI();
    const res = h.search({
      query: state.q, limit: 2000, kind: state.kind, category: state.category, type: state.type, role: state.role, style: state.style,
      tag: state.tag, surface: state.surface || undefined, hue: state.hue || undefined, has_motion: state.motion,
    });
    results = res.results.map((r) => r.asset);
    if (!state.q) results = curated(results);
    $('#count', root).innerHTML = `<b>${results.length}</b> of ${h.assets.length}`;
    layout(true);
  }

  function measure() {
    const w = grid.clientWidth;
    const n = w > 1400 ? 5 : w > 1000 ? 4 : w > 620 ? 3 : 2;
    gap = w > 720 ? 12 : 8;
    colW = (w - gap * (n - 1)) / n;
    return n;
  }

  function layout(reset) {
    if (reset) {
      grid.innerHTML = ''; shown = 0;
      cols = Array(measure()).fill(0);
      if (!results.length) {
        grid.style.height = 'auto';
        grid.innerHTML = `<div class="empty"><b>Nothing here — yet.</b><p>No reference matches every filter. Remove one, or search with broader words.</p><button class="btn btn--sm" type="button" data-rm-all>Clear filters</button></div>`;
        grid.querySelector('[data-rm-all]').onclick = () => { Object.assign(state, fromParams(new URLSearchParams())); q.value = ''; commit(); };
        return;
      }
    }
    const frag = document.createDocumentFragment();
    const batch = results.slice(shown, shown + PAGE);
    batch.forEach((a, i) => {
      const c = cols.indexOf(Math.min(...cols));
      const hgt = Math.round(colW / Math.max(0.45, Math.min(2.4, a.w / a.h)));
      const el = document.createElement('a');
      el.className = 'tile';
      el.href = `#/a/${a.id}`;
      el.dataset.id = a.id;
      el.style.cssText = `left:${c * (colW + gap)}px;top:${cols[c]}px;width:${colW}px;height:${hgt}px;transition-delay:${reduced() ? 0 : Math.min(i, 16) * 28}ms`;
      el.innerHTML = `<img src="${thumb(a)}" alt="${esc(a.title)}" loading="lazy" decoding="async">
        ${a.clip ? `<span class="tile__badge">${a.clip_meta?.duration_s ? Math.round(a.clip_meta.duration_s) + 's' : 'motion'}</span>` : ''}
        <span class="tile__meta"><span>${a.id} · ${esc(label(a.category))}</span><b>${esc(a.title)}</b><span class="tile__pal">${(a.palette || []).slice(0, 5).map((x) => `<i style="--c:${x}"></i>`).join('')}</span></span>`;
      cols[c] += hgt + gap;
      frag.append(el);
    });
    shown += batch.length;
    grid.append(frag);
    grid.style.height = `${Math.max(...cols)}px`;
    requestAnimationFrame(() => requestAnimationFrame(() => $$('.tile:not(.in)', grid).forEach((t) => t.classList.add('in'))));
  }

  const more = new IntersectionObserver((es) => { if (es[0].isIntersecting && shown < results.length) layout(false); }, { rootMargin: '1200px 0px' });
  more.observe($('#more', root));
  let lastW = grid.clientWidth;
  const ro = new ResizeObserver(() => {
    if (Math.abs(grid.clientWidth - lastW) < 4) return;
    lastW = grid.clientWidth;
    const keep = shown; layout(true);
    while (shown < keep) layout(false);
  });
  ro.observe(grid);

  /* hover-to-play: motion clips stream only while you look at them */
  let playing = null;
  const stop = () => { if (!playing) return; const v = playing.querySelector('video'); v?.pause(); v?.remove(); playing.classList.remove('playing'); playing = null; };
  if (!isTouch()) {
    grid.addEventListener('pointerover', (e) => {
      const t = e.target.closest('.tile');
      if (!t || t === playing) return;
      stop();
      const a = h.get(t.dataset.id);
      if (!a?.clip) return;
      playing = t;
      const v = Object.assign(document.createElement('video'), { src: a.clip, muted: true, loop: true, playsInline: true, preload: 'auto' });
      v.addEventListener('playing', () => t.classList.add('playing'), { once: true });
      t.prepend(v);
      v.play().catch(() => {});
    });
    grid.addEventListener('pointerleave', stop);
    grid.addEventListener('pointerout', (e) => { if (playing && !playing.contains(e.relatedTarget)) stop(); });
  }

  run();

  return {
    order: () => results.map((a) => a.id),
    update(r) { Object.assign(state, fromParams(r.params)); q.value = state.q; run(); },
    cleanup() { more.disconnect(); ro.disconnect(); stop(); },
  };
}

/* Default order when nothing is typed: round-robin across categories so the
   first screenful shows the range of the hall, crops and swatches last. */
let CURATED = null;
function curated(list) {
  if (!CURATED) {
    const buckets = new Map();
    for (const a of list.length ? window.__uh.assets : []) {
      const k = a.crop_of ? 'zz-crop' : a.category === 'color-palette' ? 'zz-pal' : a.category;
      if (!buckets.has(k)) buckets.set(k, []);
      buckets.get(k).push(a);
    }
    const main = [...buckets.entries()].filter(([k]) => !k.startsWith('zz')).sort((a, b) => b[1].length - a[1].length).map(([, v]) => v);
    const weights = main.map((b) => Math.max(1, Math.round(Math.sqrt(b.length / 20))));
    const out = [];
    while (main.some((b) => b.length)) main.forEach((b, i) => { for (let n = 0; n < weights[i] && b.length; n++) out.push(b.shift()); });
    CURATED = new Map([...out, ...(buckets.get('zz-pal') || []), ...(buckets.get('zz-crop') || [])].map((a, i) => [a.id, i]));
  }
  return [...list].sort((a, b) => CURATED.get(a.id) - CURATED.get(b.id));
}

function group(key, title, items) {
  return `<div class="lib__group"><h3>${title} <button type="button" data-clear="${key}">clear</button></h3><div class="lib__chips" data-facet="${key}">
    ${items.map(([id, text, n]) => `<button class="chip" type="button" data-v="${esc(id)}" aria-pressed="false">${esc(text)} <span class="n">${n}</span></button>`).join('')}
  </div></div>`;
}

function fromParams(p) {
  return {
    q: p.get('q') || '', kind: p.get('kind') || 'all',
    category: p.getAll('category'), type: p.getAll('type'), role: p.getAll('role'), style: p.getAll('style'), tag: p.getAll('tag'),
    surface: p.get('surface') || '', hue: p.get('hue') || '', motion: p.get('motion') === '1',
  };
}

function toParams(s) {
  const p = new URLSearchParams();
  if (s.q) p.set('q', s.q);
  if (s.kind !== 'all') p.set('kind', s.kind);
  for (const k of MULTI) for (const v of s[k]) p.append(k, v);
  if (s.surface) p.set('surface', s.surface);
  if (s.hue) p.set('hue', s.hue);
  if (s.motion) p.set('motion', '1');
  return p.toString();
}
