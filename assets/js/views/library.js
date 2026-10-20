/* The library: a toolbar of popover filters over a true masonry grid.
   Ranked order is preserved left-to-right; density, sort and every filter
   live in the URL so any view can be shared. */

import { $, $$, esc, icon, debounce, reduced, isTouch, segmented } from '../lib.js';
import { HUE_FAMILIES } from '../../../mcp/src/color.js';
import { thumb, label, footer, pickTheme } from './shared.js';
import { board, pinIcon, flyToBoard } from '../board.js';
import { openDetail } from './detail.js';

export const HUE_SW = { red: '#E5484D', orange: '#F76B15', brown: '#8D5B3A', yellow: '#FFD60A', lime: '#B8F230', green: '#30A46C', teal: '#12A594', cyan: '#00A2C7', blue: '#3E63DD', violet: '#8E4EC6', magenta: '#D6409F', black: '#111111', grey: '#8B8D98', white: '#F5F5F5' };
const MULTI = ['category', 'type', 'role', 'style', 'tag'];
const PAGE = 48;
const SORTS = [['curated', 'Curated'], ['az', 'A → Z'], ['dark', 'Dark first'], ['light', 'Light first']];

export default function library(root, app, route, opts = {}) {
  const { h } = app;
  const fixed = opts.fixed || {};
  const state = fromParams(route.params);

  const facet = (key) => {
    if (key === 'category') return h.corpus.categories.map((c) => [c.id, c.label, c.count]);
    if (key === 'role') return h.corpus.roles.map((c) => [c.id, label(c.id), c.count]);
    if (key === 'style') return h.corpus.styles.map((c) => [c.id, label(c.id), c.count]);
    if (key === 'tag') return h.corpus.tags.filter((t) => t.count >= 3).map((c) => [c.id, c.id, c.count]);
    if (key === 'surface') return [['dark', 'Dark', 0], ['mid', 'Mid', 0], ['light', 'Light', 0]];
    if (key === 'source') return [['original', 'Originals · MIT', h.corpus.totals.originals || 0], ['reference', 'Collected references', h.corpus.totals.assets - (h.corpus.totals.originals || 0)]];
    return [];
  };

  root.innerHTML = `
  <div class="container">
    ${opts.head || `<div class="page-head page-head--row">
      <div><h1 class="display h-lg">Library</h1><p class="lede">Every screen, ranked by what you type and filtered by what it’s for, how it looks and what it’s made of — all built in code, all live.</p></div>
    </div>`}
    <div class="toolbar" id="toolbar">
      <div class="toolbar__row">
        <label class="tsearch">${icon.search}<span class="sr-only">Search the library</span><input id="q" type="search" placeholder="Search screens — try “dark onboarding”" autocomplete="off" spellcheck="false"></label>
        <div class="toolbar__end">
          <button class="fbtn lib__filters-btn" id="filtersBtn" type="button">${icon.filter}<span>Filters</span></button>
          <label class="select"><span class="sr-only">Sort</span><select id="sort">${SORTS.map(([v, l]) => `<option value="${v}" ${state.sort === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
          <div class="seg seg--sm" id="density" role="group" aria-label="Density">
            ${[['s', 'S'], ['m', 'M'], ['l', 'L']].map(([v, l]) => `<button type="button" data-v="${v}" aria-pressed="${state.size === v}" title="${{ s: 'Compact', m: 'Comfortable', l: 'Large' }[v]}">${l}</button>`).join('')}
          </div>
        </div>
      </div>
      <div class="toolbar__row toolbar__filters" id="filters">
        <div class="seg seg--sm" id="fKind" role="group" aria-label="Format">
          ${['all', 'phone', 'desktop', 'canvas'].map((k) => `<button type="button" data-v="${k}" aria-pressed="${state.kind === k}">${{ all: 'All', phone: 'Mobile', desktop: 'Desktop', canvas: 'Systems' }[k]}</button>`).join('')}
        </div>
        <span class="toolbar__sep" aria-hidden="true"></span>
        ${pop('category', 'Category')}${pop('role', 'Screen')}${pop('style', 'Style')}${pop('hue', 'Colour')}${pop('surface', 'Surface')}${pop('tag', 'Tags', true)}
      </div>
    </div>
    <div class="lib__status"><span class="lib__count num" id="count"></span><div class="lib__active" id="active"></div></div>
    <div class="masonry" id="grid" aria-live="polite"></div>
    <div class="sentinel" id="more"></div>
  </div>
  ${footer(h)}`;

  const grid = $('#grid', root), bar = $('#toolbar', root), q = $('#q', root);
  q.value = state.q;
  let results = [], shown = 0, cols = [], colW = 0, gap = 12, openPop = null;

  /* ------------------------------------------------------------ popovers -- */
  function pop(key, title, searchable = false) {
    return `<div class="pop" data-pop="${key}"><button class="fbtn" type="button" aria-expanded="false" aria-haspopup="true"><span>${title}</span><em class="fbtn__n num"></em><svg class="chev" viewBox="0 0 20 20" aria-hidden="true"><path d="m6 8 4 4 4-4"/></svg></button>
      <div class="pop__panel" role="dialog" aria-label="${title}">${searchable ? '<input class="pop__find" type="search" placeholder="Find…" aria-label="Find">' : ''}<div class="pop__list"></div><div class="pop__foot"><button type="button" class="pop__clear">Clear</button><button type="button" class="pop__done btn btn--sm btn--primary">Done</button></div></div></div>`;
  }
  const isMulti = (k) => MULTI.includes(k);
  const selected = (k) => (isMulti(k) ? state[k] : state[k] ? [state[k]] : []);
  function drawPop(el, filter = '') {
    const key = el.dataset.pop, list = el.querySelector('.pop__list');
    if (key === 'hue') {
      list.innerHTML = `<div class="hues">${HUE_FAMILIES.map((x) => `<button class="hue" type="button" data-v="${x}" aria-pressed="${state.hue === x}" style="--c:${HUE_SW[x]}" title="${x}"><span class="sr-only">${x}</span></button>`).join('')}</div>`;
      return;
    }
    const f = filter.toLowerCase();
    const items = facet(key).filter(([id, t]) => !f || id.includes(f) || String(t).toLowerCase().includes(f)).slice(0, 120);
    list.innerHTML = items.map(([id, t, n]) => `<button type="button" class="opt" role="${isMulti(key) ? 'menuitemcheckbox' : 'menuitemradio'}" data-v="${esc(id)}" aria-checked="${selected(key).includes(id)}"><i class="opt__box"></i><span>${esc(t)}</span>${n ? `<em class="num">${n}</em>` : ''}</button>`).join('') || '<p class="faint" style="padding:10px 12px;font-size:13px">No matches</p>';
  }
  function closePop() { if (!openPop) return; openPop.classList.remove('open'); openPop.querySelector('.fbtn').setAttribute('aria-expanded', 'false'); openPop = null; }
  bar.addEventListener('click', (e) => {
    const p = e.target.closest('.pop');
    const trigger = e.target.closest('.pop > .fbtn');
    if (trigger) {
      if (openPop === p) return closePop();
      closePop(); openPop = p; p.classList.add('open'); trigger.setAttribute('aria-expanded', 'true');
      drawPop(p); p.querySelector('.pop__find')?.focus();
      const r = p.querySelector('.pop__panel'); r.style.left = ''; r.style.right = '';
      const rect = r.getBoundingClientRect();
      if (rect.right > innerWidth - 8) { r.style.left = 'auto'; r.style.right = '0'; }
      return;
    }
    if (e.target.closest('.pop__done')) return closePop();
    if (e.target.closest('.pop__clear')) { const k = p.dataset.pop; state[k] = isMulti(k) ? [] : ''; drawPop(p); return commit(); }
    const opt = e.target.closest('.pop [data-v]');
    if (opt) {
      const k = p.dataset.pop, v = opt.dataset.v;
      if (isMulti(k)) state[k] = state[k].includes(v) ? state[k].filter((x) => x !== v) : [...state[k], v];
      else state[k] = state[k] === v ? '' : v;
      drawPop(p, p.querySelector('.pop__find')?.value || '');
      commit();
    }
  });
  bar.addEventListener('input', (e) => { if (e.target.matches('.pop__find')) drawPop(e.target.closest('.pop'), e.target.value); });
  const outside = (e) => { if (openPop && !openPop.contains(e.target)) closePop(); };
  const esc_ = (e) => { if (e.key === 'Escape' && openPop) { e.stopPropagation(); closePop(); } };
  document.addEventListener('pointerdown', outside);
  addEventListener('keydown', esc_, true);

  const placeKind = segmented($('#fKind', root), (v) => { state.kind = v; commit(); });
  segmented($('#density', root), (v) => { state.size = v; commit(); });
  $('#sort', root).addEventListener('change', (e) => { state.sort = e.target.value; commit(); });
  q.addEventListener('input', debounce(() => { state.q = q.value.trim(); commit(true); }, 140));
  $('#filtersBtn', root).addEventListener('click', () => bar.classList.toggle('show-filters'));

  function syncUI() {
    for (const p of $$('.pop', bar)) {
      const n = selected(p.dataset.pop).length;
      p.querySelector('.fbtn__n').textContent = n || '';
      p.querySelector('.fbtn').classList.toggle('on', n > 0);
    }
    for (const b of $$('#fKind button', root)) b.setAttribute('aria-pressed', String(b.dataset.v === state.kind));
    placeKind?.();
    const chips = [];
    if (state.q) chips.push(['q', state.q, `“${state.q}”`]);
    for (const k of MULTI) for (const v of state[k]) chips.push([k, v, label(v)]);
    for (const k of ['surface', 'hue', 'source']) if (state[k]) chips.push([k, state[k], k === 'source' ? (state[k] === 'original' ? 'originals' : 'references') : `${state[k]}${k === 'surface' ? ' surface' : ''}`]);
    if (state.motion) chips.push(['motion', '1', 'motion clip']);
    $('#active', root).innerHTML = chips.map(([k, v, t]) => `<button class="chip chip--x" type="button" data-rm="${k}" data-v="${esc(v)}">${esc(t)}</button>`).join('')
      + (chips.length > 1 ? '<button class="chip chip--ghost" type="button" data-rm="all">Clear all</button>' : '');
  }
  $('#active', root).addEventListener('click', (e) => {
    const b = e.target.closest('[data-rm]');
    if (!b) return;
    const k = b.dataset.rm, v = b.dataset.v;
    if (k === 'all') { Object.assign(state, fromParams(new URLSearchParams()), { size: state.size, sort: state.sort }); q.value = ''; }
    else if (k === 'q') { state.q = ''; q.value = ''; }
    else if (MULTI.includes(k)) state[k] = state[k].filter((x) => x !== v);
    else if (k === 'motion') state.motion = false;
    else state[k] = '';
    commit();
  });

  function commit(replace = false) {
    const p = toParams(state);
    const base = opts.base || '#/library';
    const hash = `${base}${p ? `?${p}` : ''}`;
    if (location.hash !== hash) (replace ? history.replaceState : history.pushState).call(history, null, '', hash);
    run();
  }

  /* ------------------------------------------------------------ results -- */
  function run() {
    syncUI();
    const res = h.search({
      query: state.q, limit: 3000, viewport: state.kind, category: state.category, type: state.type, role: state.role, style: state.style,
      tag: state.tag, surface: state.surface || undefined, hue: state.hue || undefined, has_motion: state.motion,
      source: fixed.source || state.source || undefined,
    });
    results = res.results.map((r) => r.asset);
    if (!state.q && state.sort === 'curated') results = curated(results);
    if (state.sort === 'az') results.sort((a, b) => a.title.localeCompare(b.title));
    if (state.sort === 'dark') results.sort((a, b) => a._d.lightness - b._d.lightness);
    if (state.sort === 'light') results.sort((a, b) => b._d.lightness - a._d.lightness);
    $('#count', root).innerHTML = `<b>${results.length}</b> ${results.length === 1 ? 'result' : 'results'}`;
    layout(true);
  }

  function measure() {
    const w = grid.clientWidth;
    const target = { s: 210, m: 290, l: 400 }[state.size] || 290;
    gap = w > 720 ? 12 : 8;
    const n = Math.max(2, Math.round((w + gap) / (target + gap)));
    colW = (w - gap * (n - 1)) / n;
    return n;
  }

  function layout(reset) {
    if (reset) {
      grid.innerHTML = ''; shown = 0;
      cols = Array(measure()).fill(0);
      if (!results.length) {
        grid.style.height = 'auto';
        grid.innerHTML = `<div class="empty"><b>Nothing matches — yet.</b><p>No reference fits every filter. Remove one, or search with broader words.</p><button class="btn btn--sm" type="button" data-rm-all>Clear filters</button></div>`;
        grid.querySelector('[data-rm-all]').onclick = () => { Object.assign(state, fromParams(new URLSearchParams()), { size: state.size }); q.value = ''; commit(); };
        return;
      }
    }
    const frag = document.createDocumentFragment();
    const batch = results.slice(shown, shown + PAGE);
    const showMeta = colW > 230;
    batch.forEach((a, i) => {
      const c = cols.indexOf(Math.min(...cols));
      const hgt = Math.round(colW / Math.max(0.5, Math.min(2.2, a.w / a.h)));
      const el = document.createElement('a');
      el.className = 'tile';
      el.href = `#/a/${a.id}`;
      el.dataset.id = a.id;
      el.style.cssText = `left:${c * (colW + gap)}px;top:${cols[c]}px;width:${colW}px;height:${hgt}px;transition-delay:${reduced() ? 0 : Math.min(i, 16) * 26}ms`;
      el.innerHTML = `<img src="${thumb(a)}" alt="${esc(a.title)}" loading="lazy" decoding="async">
        <span class="tile__pin" role="button" tabindex="0" data-pin="${a.id}" aria-label="Pin ${a.id} to board" aria-pressed="${board.has(a.id)}">${pinIcon(board.has(a.id))}</span>
        ${a.original ? '' : a.clip ? `<span class="tile__badge">${a.clip_meta?.duration_s ? Math.round(a.clip_meta.duration_s) + 's' : 'motion'}</span>` : ''}
        ${showMeta ? `<span class="tile__meta"><span>${a.id} · ${esc(label(a.category))}</span><b>${esc(a.title)}</b><span class="tile__pal">${((pickTheme(a) && a.variants?.[pickTheme(a)]?.palette) || a.palette || []).slice(0, 5).map((x) => `<i style="--c:${x}"></i>`).join('')}</span></span>` : ''}`;
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

  /* pin, and morph tile → sheet with a shared-element view transition */
  grid.addEventListener('click', (e) => {
    const pin = e.target.closest('[data-pin]');
    if (pin) {
      e.preventDefault(); e.stopPropagation();
      if (board.toggle(pin.dataset.pin)) flyToBoard(pin, thumb(h.get(pin.dataset.pin)));
      return;
    }
    const t = e.target.closest('.tile');
    if (!t || e.metaKey || e.ctrlKey || e.shiftKey || !document.startViewTransition || reduced()) return;
    e.preventDefault();
    const img = t.querySelector('img');
    img.style.viewTransitionName = 'uh-media';
    document.startViewTransition(() => {
      img.style.viewTransitionName = '';
      history.pushState(null, '', `#/a/${t.dataset.id}`);
      app.cameFromApp = true;
      openDetail(app, t.dataset.id, { morph: true });
    });
  });
  grid.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-pin]')) { e.preventDefault(); e.target.click(); } });
  const onBoard = () => { for (const p of grid.querySelectorAll('[data-pin]')) { const on = board.has(p.dataset.pin); p.setAttribute('aria-pressed', String(on)); p.innerHTML = pinIcon(on); } };
  addEventListener('uh:board', onBoard);

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
    cleanup() { more.disconnect(); ro.disconnect(); stop(); removeEventListener('uh:board', onBoard); document.removeEventListener('pointerdown', outside); removeEventListener('keydown', esc_, true); },
  };
}

/* Default order when nothing is typed: round-robin across categories so the
   first screenful shows the range of the hall; originals lead, crops and swatches last. */
let CURATED = null;
/* Default order: hand-built screens and every screen type interleaved, so the
   first screenful shows the range of the hall rather than one product. */
function curated(list) {
  if (!CURATED) {
    const buckets = new Map();
    for (const a of window.__uh.assets) {
      const slug = (a.live || a.id).split('/').pop().replace('.html', '');
      const m = slug.match(/^gen-([a-z]+)-(.+)$/);
      const k = m ? m[2] : 'hand';
      if (!buckets.has(k)) buckets.set(k, []);
      buckets.get(k).push(a);
    }
    const lists = [...buckets.entries()].sort((x, y) => (x[0] === 'hand' ? -1 : y[0] === 'hand' ? 1 : 0)).map(([, v]) => v.map((a, i) => [a, i]));
    lists.forEach((l, j) => { const r = (j * 5) % Math.max(1, l.length); l.push(...l.splice(0, r)); });
    const out = [];
    for (let i = 0; lists.some((l) => l.length); i++) lists.forEach((l, j) => { if (l.length) out.push(l.shift()[0]); if (j === 0 && lists[0].length) out.push(lists[0].shift()[0]); });
    CURATED = new Map(out.map((a, i) => [a.id, i]));
  }
  return [...list].sort((a, b) => (CURATED.get(a.id) ?? 1e6) - (CURATED.get(b.id) ?? 1e6));
}

function fromParams(p) {
  return {
    q: p.get('q') || '', kind: p.get('kind') || 'all',
    category: p.getAll('category'), type: p.getAll('type'), role: p.getAll('role'), style: p.getAll('style'), tag: p.getAll('tag'),
    surface: p.get('surface') || '', hue: p.get('hue') || '', source: p.get('source') || '', motion: p.get('motion') === '1',
    sort: p.get('sort') || 'curated', size: p.get('size') || 'm',
  };
}

function toParams(s) {
  const p = new URLSearchParams();
  if (s.q) p.set('q', s.q);
  if (s.kind !== 'all') p.set('kind', s.kind);
  for (const k of MULTI) for (const v of s[k]) p.append(k, v);
  for (const k of ['surface', 'hue', 'source']) if (s[k]) p.set(k, s[k]);
  if (s.motion) p.set('motion', '1');
  if (s.sort !== 'curated') p.set('sort', s.sort);
  if (s.size !== 'm') p.set('size', s.size);
  return p.toString();
}
