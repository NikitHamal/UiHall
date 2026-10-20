import { $, $$, esc, split, ink, bindCopy, debounce } from '../lib.js';
import { normHex, hueFamily, contrast } from '../../../mcp/src/color.js';
import { thumb, footer } from './shared.js';

// a match on the base palette means the base render — name its theme so the detail opens the same one
const matchTheme = (r) => r.theme || Object.entries(r.asset.variants || {}).find(([, v]) => v.src === r.asset.src)?.[0];

const PRESETS = ['#FF5A1F', '#C6F432', '#3E63DD', '#0D2740', '#F9A8BB', '#18544E', '#FFD60A', '#8E4EC6', '#E5484D', '#12A594', '#D4AA7D', '#111111', '#F5F2EA', '#00A2C7', '#FE00AE', '#433455'];

export default function colour(root, app, route) {
  const { h } = app;
  let hex = normHex(route.params.get('hex') || '') || '#FF5A1F';
  const pairs = h.corpus.palette_order.map((id) => [h.get(id), h.corpus.printed_palettes[id]]).filter(([a, p]) => a && p);

  root.innerHTML = `
  <div class="container page-head">
    <span class="eyebrow" data-reveal>Colour · measured from pixels</span>
    <h1 class="display h-lg" id="ct">Search by <em>colour.</em></h1>
    <p class="lede" data-reveal style="--d:2">Pick any colour and see the screens built on it, across all four themes, matched in OKLab — the perceptual colour space — over palettes measured from the images themselves. Then lift the palette as tokens.</p>
  </div>
  <div class="container colour-tool">
    <div class="picker card" data-reveal>
      <label class="picker__swatch" id="sw"><input type="color" id="pick" aria-label="Pick a colour"><b id="hexLabel"></b><span id="fam"></span></label>
      <input class="input mono" id="hexIn" maxlength="7" spellcheck="false" aria-label="Hex value">
      <div class="picker__presets">${PRESETS.map((p) => `<button type="button" style="--c:${p}" data-hex="${p}" aria-label="${p}" title="${p}"></button>`).join('')}</div>
      <div class="row" style="justify-content:space-between"><span class="faint" style="font-size:13px">Tolerance</span><input type="range" id="tol" min="0.03" max="0.2" step="0.01" value="0.09" style="flex:1;max-width:180px;accent-color:var(--accent-text)"></div>
      <div class="row" id="cx"></div>
    </div>
    <div>
      <div class="row" style="justify-content:space-between;margin-bottom:14px"><span class="eyebrow" id="resLabel"></span></div>
      <div class="color-results" id="res"></div>
    </div>
  </div>
  ${pairs.length ? `<section class="container section">
    <div class="section__head">
      <h2 class="display h-md" data-reveal>Named <em>pairings.</em></h2>
      <p class="lede" data-reveal style="--d:1">Two-tone cards with designer-given names and printed hex values — each one a contrast specimen.</p>
    </div>
    <div class="pairs">${pairs.map(([a, p], i) => `
      <a class="pair" href="#/a/${a.id}" data-reveal style="--d:${i % 4}">
        <div class="pair__bands">${p.map((s) => `<div style="background:${s.hex};color:${s.ink}">${esc(s.name)}</div>`).join('')}</div>
        <div class="pair__meta"><b>${p.map((s) => esc(s.name)).join(' / ')}</b><code>${p.map((s) => s.hex).join(' ')}</code></div>
      </a>`).join('')}</div>
  </section>` : ''}
  ${footer(h)}`;

  const t = $('#ct', root); split(t); requestAnimationFrame(() => t.classList.add('in'));
  const sw = $('#sw', root), pick = $('#pick', root), hexIn = $('#hexIn', root), tol = $('#tol', root);

  const draw = () => {
    sw.style.setProperty('--c', hex); sw.style.setProperty('--ink', ink(hex));
    $('#hexLabel', root).textContent = hex; $('#fam', root).textContent = hueFamily(hex);
    pick.value = hex.toLowerCase(); if (document.activeElement !== hexIn) hexIn.value = hex;
    $('#cx', root).innerHTML = ['#FFFFFF', '#0A0A0A'].map((bg) => { const r = contrast(hex, bg); return `<span class="contrast-pill ${r >= 4.5 ? 'pass' : 'fail'}">on ${bg === '#FFFFFF' ? 'white' : 'black'} ${r}:1</span>`; }).join('');
    const seen = {};
    const res = h.byColor(hex, { tolerance: +tol.value, limit: 300 }).filter((r) => { const k = (r.asset.live || r.asset.id).split('/').pop().replace(/^gen-[a-z]+-/, '').replace('.html', ''); seen[k] = (seen[k] || 0) + 1; return seen[k] <= 2; }).slice(0, 48);
    $('#resLabel', root).textContent = `${res.length} screens use ${hex}`;
    $('#res', root).innerHTML = res.length ? res.map((r, i) => `
      <a class="cres" href="#/a/${r.asset.id}${matchTheme(r) ? `?theme=${matchTheme(r)}` : ''}" style="--i:${i}">
        <div class="cres__img"><img src="${(r.theme && r.asset.variants?.[r.theme]?.thumb) || r.asset.thumb || thumb(r.asset)}" alt="" loading="lazy"></div>
        <div class="cres__meta"><b>${esc(r.asset.title)}</b><span class="cres__match"><i style="--c:${r.match}"></i>${r.match} · ${r.area_pct}%${r.theme ? ` · ${r.theme}` : ''}</span></div>
      </a>`).join('') : '<div class="empty" style="grid-column:1/-1"><b>No close match.</b><p>Raise the tolerance, or try a neighbouring shade.</p></div>';
    history.replaceState(null, '', `#/colour?hex=${hex.slice(1)}`);
  };
  pick.addEventListener('input', debounce(() => { hex = normHex(pick.value); draw(); }, 40));
  hexIn.addEventListener('input', () => { const v = normHex(hexIn.value); if (v) { hex = v; draw(); } });
  tol.addEventListener('input', debounce(draw, 60));
  root.addEventListener('click', (e) => { const b = e.target.closest('[data-hex]'); if (b) { hex = b.dataset.hex; draw(); } });
  bindCopy(root);
  draw();
  return {
    update(r) { const v = normHex(r.params.get('hex') || ''); if (v && v !== hex) { hex = v; draw(); } },
    order: () => [...$$('#res .cres', root)].map((x) => x.getAttribute('href').slice(4)),
  };
}
