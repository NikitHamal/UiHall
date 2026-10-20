/* ⌘K — one box to jump anywhere: references (ranked by the real engine),
   facets, patterns, pages and actions. */

import { $, esc, icon, debounce } from './lib.js';
import { thumb, label } from './views/shared.js';

let open = false;

const PAGES = [
  ['Library', '#/library', 'Browse every reference'],
  ['Patterns', '#/patterns', 'Structural moves with build rules'],
  ['Colour', '#/colour', 'Search the corpus by colour'],
  ['Motion', '#/motion', 'Clips that actually move'],
  ['For agents', '#/agents', 'MCP server, skill and playground'],
  ['Board', '#/board', 'Your pinned references'],
  ['Playground', '#/agents?tab=playground', 'Run the MCP tools in your browser'],
];

export function openCmd(app) {
  if (open) return;
  open = true;
  const { h } = app;
  const root = $('#cmd');
  root.innerHTML = `
    <div class="cmd" role="dialog" aria-modal="true" aria-label="Search">
      <div class="cmd__scrim"></div>
      <div class="cmd__box">
        <div class="cmd__input">${icon.search}<input id="cmdQ" placeholder="Search references, styles, patterns… or a #hex" autocomplete="off" spellcheck="false" role="combobox" aria-expanded="true" aria-controls="cmdList"><kbd>esc</kbd></div>
        <div class="cmd__list" id="cmdList" role="listbox"></div>
        <div class="cmd__foot"><span><kbd>↑</kbd><kbd>↓</kbd> move</span><span><kbd>↵</kbd> open</span><span><kbd>esc</kbd> close</span></div>
      </div>
    </div>`;
  const input = $('#cmdQ', root), listEl = $('#cmdList', root);
  let items = [], sel = 0;

  const close = () => { open = false; root.innerHTML = ''; removeEventListener('keydown', onKey, true); };
  const choose = (i) => { const it = items[i]; if (!it) return; close(); location.hash = it.href; };

  const draw = () => {
    const q = input.value.trim();
    const groups = [];
    const hex = q.match(/^#?([0-9a-f]{6}|[0-9a-f]{3})$/i);
    if (hex) {
      groups.push(['Colour', [{ title: `Find references using #${hex[1].toUpperCase()}`, sub: 'Perceptual match over measured palettes', href: `#/colour?hex=${hex[1]}`, swatch: `#${hex[1]}` }]]);
    }
    if (q) {
      const res = h.search({ query: q, limit: 7 }).results;
      if (res.length) groups.push(['References', res.map((r) => ({ title: r.asset.title, sub: `${r.asset.id} · ${label(r.asset.category)} · ${(r.asset.roles || []).join(', ')}`, href: `#/a/${r.asset.id}`, img: thumb(r.asset), meta: r.asset.kind === 'video' ? 'video' : '' }))]);
      const ql = q.toLowerCase();
      const facets = [];
      for (const [k, key] of [['categories', 'category'], ['roles', 'role'], ['styles', 'style'], ['tags', 'tag']]) {
        for (const f of h.corpus[k]) if (f.id.includes(ql) || (f.label || '').toLowerCase().includes(ql)) facets.push({ title: `${label(f.label || f.id)}`, sub: `${key} · ${f.count} references`, href: `#/library?${key}=${f.id}`, icon: icon.filter });
      }
      if (facets.length) groups.push(['Filters', facets.slice(0, 5)]);
      const pats = h.patterns().filter((p) => p.name.toLowerCase().includes(ql) || p.why.toLowerCase().includes(ql)).slice(0, 3);
      if (pats.length) groups.push(['Patterns', pats.map((p) => ({ title: p.name, sub: `${p.evidence_count} examples`, href: `#/patterns#${p.slug}`, icon: icon.grid }))]);
      groups.push(['Search', [{ title: `Search the library for “${q}”`, sub: 'Open with this query', href: `#/library?q=${encodeURIComponent(q)}`, icon: icon.search }]]);
    } else {
      groups.push(['Go to', PAGES.map(([t, href, sub]) => ({ title: t, sub, href, icon: icon.right }))]);
      groups.push(['Try', ['dark onboarding', 'pricing toggle', 'bottom sheet', 'bento grid', 'ai chat'].map((s) => ({ title: s, sub: 'search', href: `#/library?q=${encodeURIComponent(s)}`, icon: icon.search })) ]);
    }
    items = groups.flatMap(([, xs]) => xs);
    sel = Math.min(sel, items.length - 1);
    let i = 0;
    listEl.innerHTML = groups.map(([name, xs]) => `<div class="cmd__sec">${esc(name)}</div>${xs.map((it) => {
      const k = i++;
      return `<div class="cmd__item" role="option" id="ci${k}" data-i="${k}" aria-selected="${k === sel}">
        <span class="th">${it.img ? `<img src="${it.img}" alt="">` : it.swatch ? `<i style="width:100%;height:100%;background:${it.swatch}"></i>` : it.icon || ''}</span>
        <span style="min-width:0"><b>${esc(it.title)}</b><small>${esc(it.sub || '')}</small></span><em>${esc(it.meta || '')}</em></div>`;
    }).join('')}`).join('');
    input.setAttribute('aria-activedescendant', `ci${sel}`);
  };
  const mark = () => {
    for (const el of listEl.querySelectorAll('.cmd__item')) el.setAttribute('aria-selected', String(+el.dataset.i === sel));
    listEl.querySelector(`[data-i="${sel}"]`)?.scrollIntoView({ block: 'nearest' });
    input.setAttribute('aria-activedescendant', `ci${sel}`);
  };
  const onKey = (e) => {
    if (e.key === 'Escape') { e.stopImmediatePropagation(); close(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); sel = (sel + 1) % items.length; mark(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); sel = (sel - 1 + items.length) % items.length; mark(); }
    else if (e.key === 'Enter') { e.preventDefault(); choose(sel); }
  };
  addEventListener('keydown', onKey, true);
  input.addEventListener('input', debounce(() => { sel = 0; draw(); }, 60));
  listEl.addEventListener('pointermove', (e) => { const it = e.target.closest('.cmd__item'); if (it && +it.dataset.i !== sel) { sel = +it.dataset.i; mark(); } });
  listEl.addEventListener('click', (e) => { const it = e.target.closest('.cmd__item'); if (it) choose(+it.dataset.i); });
  root.querySelector('.cmd__scrim').addEventListener('click', close);
  draw();
  input.focus();
}

/** "?" — the keyboard map. */
export function openKeys() {
  if (open) return;
  open = true;
  const root = $('#cmd');
  const rows = [['⌘K  /', 'Search everything'], ['?', 'This help'], ['G', 'Home'], ['L', 'Library'], ['B', 'Board'], ['C', 'Colour'], ['M', 'Motion'], ['A', 'For agents'],
    ['←  →', 'Previous / next reference (in a detail view)'], ['P', 'Pin to board (in a detail view)'], ['Esc', 'Close']];
  root.innerHTML = `<div class="cmd" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts"><div class="cmd__scrim"></div>
    <div class="cmd__box" style="width:min(460px,100%);padding:26px 28px"><h3 class="display" style="font-size:30px;margin-bottom:18px">Keyboard</h3>
    <div class="keys">${rows.map(([k, d]) => `<kbd>${k}</kbd><span>${d}</span>`).join('')}</div></div></div>`;
  const close = () => { open = false; root.innerHTML = ''; removeEventListener('keydown', onKey, true); };
  const onKey = (e) => { if (e.key === 'Escape' || e.key === '?') { e.preventDefault(); e.stopImmediatePropagation(); close(); } };
  addEventListener('keydown', onKey, true);
  root.querySelector('.cmd__scrim').addEventListener('click', close);
}
