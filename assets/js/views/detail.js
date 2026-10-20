/* The detail sheet: one reference, everything we know about it. Opens over
   whatever view is underneath so closing returns you exactly where you were. */

import { $, esc, icon, bindCopy, ink, segmented, tint } from '../lib.js';
import { thumb, label } from './shared.js';
import { board, pinIcon, flyToBoard } from '../board.js';

let host = null, current = null, list = [], keyHandler = null;

export const isDetailOpen = () => !!host;

export function openDetail(app, id, { morph = false } = {}) {
  const { h } = app;
  const a = h.get(id);
  if (!a) { location.hash = '#/library'; return; }
  list = app.view?.order?.() || h.assets.map((x) => x.id);
  if (!host) {
    host = document.createElement('div');
    host.className = 'modal';
    host.setAttribute('role', 'dialog');
    host.setAttribute('aria-modal', 'true');
    host.innerHTML = '<div class="modal__scrim"></div><article class="sheet"></article>';
    host.classList.toggle('morph', morph);
    $('#overlay').append(host);
    document.documentElement.style.overflow = 'hidden';
    host.querySelector('.modal__scrim').addEventListener('click', () => close(app));
    keyHandler = (e) => {
      if (e.key === 'Escape') close(app);
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
      if ((e.key === 'p' || e.key === 'P') && !/input|textarea/i.test(document.activeElement?.tagName)) host?.querySelector('.sheet__pin')?.click();
    };
    addEventListener('keydown', keyHandler);
    bindCopy(host);
  }
  current = a;
  fill(app, a);
  if (morph) {
    const m = host.querySelector('.sheet__media img, .sheet__media video');
    if (m) { m.style.viewTransitionName = 'uh-media'; setTimeout(() => { m.style.viewTransitionName = ''; }, 700); }
  }
}

function step(d) {
  const i = list.indexOf(current?.id);
  if (i < 0) return;
  const next = list[(i + d + list.length) % list.length];
  history.replaceState(null, '', `#/a/${next}`);
  dispatchEvent(new HashChangeEvent('hashchange'));
}

function close(app) {
  if (app.cameFromApp && history.length > 1) history.back();
  else location.hash = app.viewName ? `#/${app.viewName}` : '#/library';
}

export function closeDetail() {
  if (!host) return;
  const tileImg = current && document.querySelector(`.tile[data-id="${current.id}"] img`);
  const media = host.querySelector('.sheet__media img, .sheet__media video');
  const r = tileImg?.getBoundingClientRect();
  if (tileImg && media && document.startViewTransition && r.bottom > 0 && r.top < innerHeight && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const el = host;
    host = null; current = null;
    removeEventListener('keydown', keyHandler);
    media.style.viewTransitionName = 'uh-media';
    document.startViewTransition(() => {
      el.remove(); document.documentElement.style.overflow = '';
      tileImg.style.viewTransitionName = 'uh-media';
    }).finished.finally(() => { tileImg.style.viewTransitionName = ''; });
    return;
  }
  const el = host;
  host = null; current = null;
  removeEventListener('keydown', keyHandler);
  el.classList.add('closing');
  setTimeout(() => { el.remove(); document.documentElement.style.overflow = ''; }, 260);
}

function fill(app, a) {
  const { h } = app;
  const f = h.full(a);
  const r = f.colour_roles;
  const sheet = host.querySelector('.sheet');
  const pal = a.palette_detail || [];
  const sim = h.similar(a.id, { limit: 8 });
  const facet = (k, v) => `<a class="tag" href="#/library?${k}=${encodeURIComponent(v)}">${esc(label(v))}</a>`;
  const media = a.clip
    ? `<video src="${a.clip}" poster="${a.src}" autoplay muted loop playsinline title="Click to pause"></video>`
    : `<img class="zoomable" src="${a.src}" alt="${esc(a.title)}">`;
  const printed = f.printed_palette;

  sheet.innerHTML = `
    <div class="sheet__media">
      ${media}
      ${a.strip ? `<div class="sheet__strip">${Array.from({ length: 6 }, (_, i) => `<i role="button" tabindex="0" aria-label="Jump to frame ${i + 1}" data-f="${i}" style="--strip:url(${new URL(a.strip.src, document.baseURI).href});--f:${i}"></i>`).join('')}</div>` : ''}
      <button class="sheet__nav prev" type="button" aria-label="Previous">${icon.left}</button>
      <button class="sheet__nav next" type="button" aria-label="Next">${icon.right}</button>
    </div>
    <div class="sheet__info">
      <div class="sheet__top">
        <span class="sheet__id">${a.id} · ${a.kind}${a.clip ? ' · motion' : ''} · ${a.w}×${a.h}</span>
        <div class="row" style="gap:4px">
          <button class="sheet__pin" type="button" aria-pressed="${board.has(a.id)}" aria-label="Pin to board (P)" title="Pin to board (P)">${pinIcon(board.has(a.id))}</button>
          <button class="icon-btn" type="button" data-copy="${location.origin + location.pathname}#/a/${a.id}" data-copy-label="Link copied" aria-label="Copy link">${icon.copy}</button>
          <button class="icon-btn" type="button" data-close aria-label="Close">${icon.close}</button>
        </div>
      </div>
      <div>
        <h2 class="sheet__title">${esc(a.title)}</h2>
        <p class="sheet__desc mt-s">${esc(a.description)}</p>
        ${a.quality ? `<p class="faint mt-s" style="font-size:12.5px">${esc(a.quality)}${a.crop_of ? ` · crop of <a href="#/a/${a.crop_of}" style="color:var(--accent)">${a.crop_of}</a>` : ''}</p>` : ''}
      </div>
      <div class="facets">
        ${facet('category', a.category)}${facet('type', a.type)}
        ${(a.roles || []).map((x) => facet('role', x)).join('')}
        ${(a.style || []).map((x) => facet('style', x)).join('')}
        ${(a.tags || []).map((x) => facet('tag', x)).join('')}
      </div>
      <div>
        <h4><span>Measured palette</span><span>click to copy</span></h4>
        <div class="palette-bar">${pal.map((p) => `<div style="--c:${p.hex};--pct:${p.pct};--ink:${ink(p.hex)}" data-hex="${p.hex}" data-copy="${p.hex}" title="${p.hex} · ${p.pct}%"></div>`).join('')}</div>
        <div class="palette-rows mt-s">${pal.map((p, i) => `<div class="palette-row" style="--c:${p.hex};--pct:${Math.max(2, p.pct)};--i:${i}"><i></i><span>${p.hex}</span><div class="bar"><span></span></div><em>${p.pct}%</em></div>`).join('')}</div>
        ${printed ? `<div class="row mt-s">${printed.map((s) => `<span class="contrast-pill" data-copy="${s.hex}" style="cursor:copy"><span class="sw" style="display:inline-block;width:10px;height:10px;border-radius:3px;background:${s.hex}"></span>${esc(s.name)} ${s.hex}</span>`).join('')}</div>` : ''}
      </div>
      ${r ? `<div>
        <h4><span>Colour roles</span><span>${f.surface} surface</span></h4>
        <div class="roles">${['background', 'surface', 'text', 'muted', 'accent', 'on_accent'].filter((k) => r.roles[k]).map((k) => `<div class="role" data-copy="${r.roles[k]}" style="cursor:copy"><i style="--c:${r.roles[k]}"></i><div><b>${k.replace('_', '-')}</b><code>${r.roles[k]}</code></div></div>`).join('')}</div>
        <div class="row mt-s">${Object.entries(r.contrast).map(([k, c]) => `<span class="contrast-pill ${c.ratio >= 3 ? 'pass' : 'fail'}">${k.replace(/_/g, ' ').replace('on accent on accent', 'on-accent')} ${c.ratio}:1</span>`).join('')}</div>
        ${r.fixes ? `<p class="faint mt-s" style="font-size:12.5px">${esc(r.fixes.note)} <code data-copy="${r.fixes.accent_for_text_and_icons}" style="cursor:copy;color:var(--text)">${r.fixes.accent_for_text_and_icons}</code></p>` : ''}
      </div>` : ''}
      <div class="agent-snippet">
        <h4><span>Use it in code</span><span>generated live</span></h4>
        <div class="seg" role="group" aria-label="Format">
          ${['css', 'tailwind', 'swiftui', 'compose', 'mcp'].map((x, i) => `<button type="button" data-v="${x}" aria-pressed="${i === 0}">${{ css: 'CSS', tailwind: 'Tailwind', swiftui: 'SwiftUI', compose: 'Compose', mcp: 'MCP call' }[x]}</button>`).join('')}
        </div>
        <div style="position:relative"><pre class="code" id="tok"></pre><button class="code__copy" type="button" data-copy="#code:#tok" aria-label="Copy">${icon.copy}</button></div>
      </div>
      <div>
        <h4><span>Similar references</span><span>content + colour</span></h4>
        <div class="related">${sim.map((s) => `<a href="#/a/${s.asset.id}" title="${esc(s.asset.title)}"><img src="${thumb(s.asset)}" alt="" loading="lazy"></a>`).join('')}</div>
      </div>
    </div>`;

  const tok = sheet.querySelector('#tok');
  const showTok = (fmt) => {
    tok.innerHTML = fmt === 'mcp'
      ? tint(`# ask your agent, or call the tools directly\nget_design({ "id": "${a.id}" })\nview_design({ "ids": ["${a.id}"] })\nfind_similar({ "id": "${a.id}" })\nexport_tokens({ "id": "${a.id}", "format": "tailwind" })`)
      : tint(h.tokens({ id: a.id, format: fmt }).code);
  };
  segmented(sheet.querySelector('.seg'), showTok);
  showTok('css');

  const mediaBox = sheet.querySelector('.sheet__media');
  sheet.querySelector('[data-close]').onclick = () => close(app);
  const pinBtn = sheet.querySelector('.sheet__pin');
  pinBtn.onclick = () => {
    const on = board.toggle(a.id);
    pinBtn.setAttribute('aria-pressed', String(on)); pinBtn.innerHTML = pinIcon(on);
    if (on) flyToBoard(pinBtn, thumb(a));
  };
  sheet.querySelector('.prev').onclick = () => step(-1);
  sheet.querySelector('.next').onclick = () => step(1);
  const z = sheet.querySelector('img.zoomable');
  if (z) z.addEventListener('click', (e) => {
    const box = mediaBox.getBoundingClientRect();
    z.style.transformOrigin = `${((e.clientX - box.left) / box.width) * 100}% ${((e.clientY - box.top) / box.height) * 100}%`;
    mediaBox.classList.toggle('zoomed');
  });
  const v = sheet.querySelector('video');
  if (v) {
    v.addEventListener('click', () => (v.paused ? v.play() : v.pause()));
    sheet.querySelector('.sheet__strip')?.addEventListener('click', (e) => {
      const f = e.target.closest('[data-f]');
      if (f && v.duration) { v.currentTime = (+f.dataset.f / 6) * v.duration; v.play(); }
    });
  }
  sheet.querySelector('.sheet__info').scrollTop = 0;
  document.title = `${a.title} · UI Hall`;
}
