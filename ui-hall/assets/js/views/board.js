/* Board: pin references while browsing, then turn them into something an agent
   can use — a synthesised palette, shared traits, a side-by-side comparison,
   a design system and a ready-to-paste prompt. */

import { $, esc, split, icon, bindCopy, ink, md, tint, toast, copy } from '../lib.js';
import { deltaE, normHex } from '../../../../mcp/src/color.js';
import { board, pinIcon } from '../board.js';
import { thumb, footer, label, arrowBtn } from './shared.js';

const STARTERS = [
  ['Calm wellness', 'calm wellness meditation sleep', 'light'],
  ['Dark fintech', 'wallet balance finance crypto', 'dark'],
  ['Editorial web', 'serif editorial landing hero', ''],
  ['AI assistant', 'ai chat assistant prompt', ''],
];

export default function boardView(root, app, route) {
  const { h } = app;
  const shared = (route.params.get('ids') || '').split(',').map((x) => x.trim().toUpperCase()).filter((x) => h.get(x));
  let viewingShared = shared.length > 0;
  const ids = () => (viewingShared ? shared : board.list()).filter((x) => h.get(x));

  root.innerHTML = `
  <div class="container page-head">
    <span class="eyebrow" data-reveal>Board · your working set</span>
    <h1 class="display h-lg" id="bt">Pin it. Compare it. <em>Hand it over.</em></h1>
    <p class="lede" data-reveal style="--d:2">Collect references while you browse, then turn them into evidence an agent can use: one synthesised palette, the traits they share, a side-by-side comparison, a design system and a prompt you can paste straight into Claude Code or Cursor.</p>
  </div>
  <div class="container" id="boardBody"></div>
  ${footer(h)}`;
  const t = $('#bt', root); split(t); requestAnimationFrame(() => t.classList.add('in'));
  const body = $('#boardBody', root);
  bindCopy(root);

  const draw = () => {
    const list = ids().map((x) => h.get(x));
    if (!list.length) { body.innerHTML = empty(h); return; }
    const syn = synthesise(list);
    const promptText = prompt(h, list, syn);
    const sys = h.designSystem({ colors: syn.palette.map((p) => p.hex), name: 'board' });
    const cmp = list.length >= 2 && list.length <= 4 ? h.compare(list.map((a) => a.id)) : null;

    body.innerHTML = `
      ${viewingShared ? `<div class="board-banner card"><span>You’re viewing a shared board of ${list.length}.</span><div class="row"><button class="btn btn--sm btn--primary" data-act="adopt">Make it my board</button><a class="btn btn--sm btn--ghost" href="#/board" data-act="mine">Back to mine</a></div></div>` : ''}
      <div class="board-bar">
        <span class="lib__count num"><b>${list.length}</b> pinned${list.length >= 24 ? ' · max 24' : ''}</span>
        <div class="row">
          <button class="btn btn--sm" data-act="share">${icon.copy} Share link</button>
          <button class="btn btn--sm" data-act="css">${icon.ext} Design system CSS</button>
          ${viewingShared ? '' : '<button class="btn btn--sm btn--ghost" data-act="clear">Clear</button>'}
        </div>
      </div>
      <div class="board-grid">
        ${list.map((a, i) => `
          <figure class="bcard" style="--i:${i}">
            <a href="#/a/${a.id}" class="bcard__img"><img src="${thumb(a)}" alt="${esc(a.title)}" loading="lazy"></a>
            <figcaption><span class="mono faint">${a.id}</span><b>${esc(a.title)}</b>
              <span class="tile__pal">${(a.palette || []).slice(0, 6).map((c) => `<i style="--c:${c}"></i>`).join('')}</span></figcaption>
            ${viewingShared ? '' : `<button class="bcard__rm" data-rm="${a.id}" aria-label="Remove ${a.id}">${icon.close}</button>`}
          </figure>`).join('')}
      </div>

      <section class="board-syn">
        <div class="card syn-card">
          <h4 class="syn-h"><span>Synthesised palette</span><span>${syn.palette.length} colours · area-weighted</span></h4>
          <div class="palette-bar">${syn.palette.map((p) => `<div style="--c:${p.hex};--pct:${p.pct};--ink:${ink(p.hex)}" data-hex="${p.hex}" data-copy="${p.hex}" title="${p.hex} · ${p.pct}%"></div>`).join('')}</div>
          <div class="roles mt-s">${['background', 'surface', 'text', 'accent'].filter((k) => sys.tokens.color[k]).map((k) => `<div class="role" data-copy="${sys.tokens.color[k]}" style="cursor:copy"><i style="--c:${sys.tokens.color[k]}"></i><div><b>${k}</b><code>${sys.tokens.color[k]}</code></div></div>`).join('')}</div>
          <h4 class="syn-h mt-m"><span>What they share</span><span>appears in ≥ half</span></h4>
          <div class="facets">${syn.traits.length ? syn.traits.map(([k, v, n]) => `<a class="tag ${k === 'style' ? 'tag--accent' : ''}" href="#/library?${k}=${encodeURIComponent(v)}">${esc(label(v))} <span style="opacity:.55;margin-left:4px">${n}/${list.length}</span></a>`).join('') : '<span class="faint">Nothing in common yet — that’s a range, not a direction.</span>'}</div>
        </div>
        <div class="card syn-card">
          <h4 class="syn-h"><span>Hand it to your agent</span><span>paste into Claude Code, Cursor…</span></h4>
          <div style="position:relative"><pre class="code" id="bprompt" style="white-space:pre-wrap;max-height:360px;overflow:auto">${esc(promptText)}</pre><button class="code__copy" type="button" data-copy="#code:#bprompt" data-copy-label="Prompt copied" aria-label="Copy">${icon.copy}</button></div>
          <p class="faint mt-s" style="font-size:12.5px">Works with the UI Hall MCP server or skill installed — the agent will open these exact references. <a href="#/agents" style="color:var(--accent)">Install →</a></p>
        </div>
      </section>

      ${cmp ? `<section class="section" style="padding-top:72px">
        <div class="section__head"><h2 class="display h-md">Side by <em>side.</em></h2><p class="lede">The same comparison <code>compare_designs</code> gives an agent: what they share, where they differ, and how their colour holds up.</p></div>
        <div class="compare-grid" style="--n:${cmp.assets.length}">
          ${cmp.assets.map((a, i) => {
            const c = cmp.colour[i];
            const own = [...cmp.distinct.style[i].values, ...cmp.distinct.tags[i].values].slice(0, 8);
            return `<div class="cmp-col">
              <a class="cmp-img" href="#/a/${a.id}"><img src="${a.src}" alt="${esc(a.title)}" loading="lazy"></a>
              <b class="cmp-title">${esc(a.title)}</b>
              <div class="stage__palette in">${(a.palette || []).slice(0, 6).map((x, k) => `<i style="--c:${x};--i:${k}" title="${x}"></i>`).join('')}</div>
              ${c.roles ? `<div class="row">${Object.entries(c.contrast).slice(0, 2).map(([k, v]) => `<span class="contrast-pill ${v.ratio >= 4.5 ? 'pass' : 'fail'}">${k === 'text_on_background' ? 'text' : 'muted'} ${v.ratio}:1</span>`).join('')}<span class="tag">${c.surface}</span></div>` : ''}
              <div class="facets">${own.map((x) => `<span class="tag">${esc(label(x))}</span>`).join('') || '<span class="faint" style="font-size:13px">Nothing unique</span>'}</div>
            </div>`;
          }).join('')}
        </div>
        <p class="faint mt-s" style="font-size:13px">Palette distance (OKLab): ${cmp.palette_distance.map((p) => `${p.a} ↔ ${p.b} <b class="num" style="color:var(--text)">${p.palette_distance}</b>`).join(' · ')}</p>
      </section>` : list.length > 4 ? '<p class="faint mt-l">Pin 2–4 references to compare them side by side.</p>' : ''}

      <section class="section" style="padding-top:72px">
        <div class="section__head"><h2 class="display h-md">A design system, <em>from the board.</em></h2><p class="lede">${esc(sys.type.rationale)} Generated by <code>generate_design_system</code> from the synthesised palette — contrast-checked, ready to paste.</p></div>
        <div style="position:relative"><pre class="code" id="bsys" style="max-height:420px;overflow:auto">${tint(sys.css)}</pre><button class="code__copy" type="button" data-copy="#code:#bsys" data-copy-label="CSS copied" aria-label="Copy">${icon.copy}</button></div>
      </section>`;

    body.onclick = (e) => {
      const rm = e.target.closest('[data-rm]');
      if (rm) { board.toggle(rm.dataset.rm); return; }
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (act === 'share') copy(`${location.origin}${location.pathname}#/board?ids=${list.map((a) => a.id).join(',')}`, 'Board link copied');
      if (act === 'clear') { board.clear(); toast('Board cleared'); }
      if (act === 'adopt') { board.set(shared); viewingShared = false; history.replaceState(null, '', '#/board'); draw(); toast('Saved as your board'); }
      if (act === 'mine') viewingShared = false;
      if (act === 'css') {
        const url = URL.createObjectURL(new Blob([sys.css], { type: 'text/css' }));
        Object.assign(document.createElement('a'), { href: url, download: 'uihall-board.css' }).click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    };
  };

  const onBoard = () => { if (!viewingShared) draw(); };
  addEventListener('uh:board', onBoard);
  body.addEventListener('click', (e) => {
    const s = e.target.closest('[data-starter]');
    if (!s) return;
    const [, q, surface] = STARTERS[+s.dataset.starter];
    board.set(h.search({ query: q, surface: surface || undefined, limit: 6, exclude_crops: true }).results.map((r) => r.asset.id));
    toast(`Started a “${STARTERS[+s.dataset.starter][0]}” board`);
  });
  draw();
  return {
    order: () => ids(),
    update(r) { const s = (r.params.get('ids') || '').split(',').filter(Boolean); viewingShared = s.length > 0; if (!viewingShared) draw(); else location.reload(); },
    cleanup: () => removeEventListener('uh:board', onBoard),
  };
}

function empty(h) {
  return `<div class="board-empty card">
    <div class="board-empty__art" aria-hidden="true">${[0, 1, 2].map((i) => `<i style="--i:${i}">${pinIcon(i === 1)}</i>`).join('')}</div>
    <h3 class="display" style="font-size:36px">Your board is empty.</h3>
    <p class="muted" style="max-width:46ch;margin:10px auto 0">Hover any reference and press the pin, or hit <kbd>P</kbd> in a detail view. Or start from a ready-made direction:</p>
    <div class="row" style="justify-content:center;margin-top:20px">${STARTERS.map(([n], i) => `<button class="chip" type="button" data-starter="${i}" style="height:38px;padding:0 16px">${n}</button>`).join('')}</div>
    <div class="mt-m">${arrowBtn('#/library', 'Browse the library', true)}</div>
  </div>`;
}

/** Area-weighted union of the board's palettes, merging perceptually-equal colours. */
function synthesise(list) {
  const pool = [];
  for (const a of list) for (const p of a.palette_detail || []) {
    const hex = normHex(p.hex);
    const w = p.pct / list.length;
    const hit = pool.find((q) => deltaE(q.hex, hex) < 0.06);
    if (hit) hit.pct += w; else pool.push({ hex, pct: w });
  }
  const palette = pool.sort((a, b) => b.pct - a.pct).slice(0, 8).map((p) => ({ ...p, pct: Math.round(p.pct * 10) / 10 }));
  const count = new Map();
  for (const a of list) for (const [k, vs] of [['style', a.style], ['role', a.roles], ['tag', a.tags]]) for (const v of vs || []) count.set(`${k}|${v}`, (count.get(`${k}|${v}`) || 0) + 1);
  const traits = [...count].filter(([, n]) => n >= Math.max(2, Math.ceil(list.length / 2))).sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k, n]) => [...k.split('|'), n]);
  return { palette, traits };
}

function prompt(h, list, syn) {
  const traits = syn.traits.map(([, v]) => v).slice(0, 8).join(', ');
  return `Design this using UI Hall references as evidence (not as templates).

References I picked:
${list.map((a) => `- ${a.id} — ${a.title}: ${h.card(a).summary.split('. ')[0].replace(/\.$/, '')}.`).join('\n')}

What they share: ${traits || 'a deliberate range — pick one direction'}.
Measured palette across them: ${syn.palette.slice(0, 6).map((p) => `${p.hex} (${p.pct}%)`).join(', ')}.

Steps:
1. view_design ${JSON.stringify(list.slice(0, 4).map((a) => a.id))} and name the structure you are taking from each (hierarchy, layout, rhythm).
2. generate_design_system for ${list[0].id}${list.length > 1 ? ' (or the closest one to the brief)' : ''}, or export_tokens in our stack's format; check_contrast every text pair.
3. Build it. Cite the reference ids in a comment at the top.
4. Finish with the design_brief checklist: one primary action, a dominant element, measured colour, a 4/8 spacing scale, and empty / loading / error states.`;
}
