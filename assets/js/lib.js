/* Small DOM + motion helpers shared by every view. No framework: template
   strings for markup, a handful of observers for motion. */

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

export const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
export const isTouch = () => matchMedia('(hover: none)').matches;

export const icon = {
  arrow: '<svg class="arrow" viewBox="0 0 16 16"><path d="M3 8h10M9 4l4 4-4 4"/></svg>',
  copy: '<svg viewBox="0 0 16 16"><rect x="5" y="5" width="8.5" height="8.5" rx="2"/><path d="M10.5 5V3.5A1.5 1.5 0 0 0 9 2H3.5A1.5 1.5 0 0 0 2 3.5V9a1.5 1.5 0 0 0 1.5 1.5H5"/></svg>',
  check: '<svg viewBox="0 0 16 16"><path d="m3 8.5 3 3 7-7"/></svg>',
  close: '<svg viewBox="0 0 20 20"><path d="m5 5 10 10M15 5 5 15"/></svg>',
  left: '<svg viewBox="0 0 20 20"><path d="m12 4-6 6 6 6"/></svg>',
  right: '<svg viewBox="0 0 20 20"><path d="m8 4 6 6-6 6"/></svg>',
  search: '<svg viewBox="0 0 20 20"><circle cx="9" cy="9" r="5.5"/><path d="m13.2 13.2 3.8 3.8"/></svg>',
  grid: '<svg viewBox="0 0 20 20"><rect x="3" y="3" width="6" height="6" rx="1.5"/><rect x="11" y="3" width="6" height="6" rx="1.5"/><rect x="3" y="11" width="6" height="6" rx="1.5"/><rect x="11" y="11" width="6" height="6" rx="1.5"/></svg>',
  bolt: '<svg viewBox="0 0 20 20"><path d="M11 2 4 11h5l-1 7 7-9h-5z"/></svg>',
  play: '<svg viewBox="0 0 20 20"><path d="M6 4v12l10-6z"/></svg>',
  drop: '<svg viewBox="0 0 20 20"><path d="M10 2.5s5.5 6 5.5 9.5a5.5 5.5 0 0 1-11 0C4.5 8.5 10 2.5 10 2.5Z"/></svg>',
  ext: '<svg viewBox="0 0 16 16"><path d="M6 3H3.5A1.5 1.5 0 0 0 2 4.5v8A1.5 1.5 0 0 0 3.5 14h8a1.5 1.5 0 0 0 1.5-1.5V10M9 2h5v5M14 2 7 9"/></svg>',
  filter: '<svg viewBox="0 0 20 20"><path d="M3 5h14M6 10h8M8.5 15h3"/></svg>',
};

/* ---------------------------------------------------------------- toast -- */
let toastTimer;
export function toast(msg, color) {
  const el = $('#toast');
  el.innerHTML = `${color ? `<i style="background:${esc(color)}"></i>` : ''}${esc(msg)}`;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
}

export async function copy(text, label = 'Copied', color) {
  try { await navigator.clipboard.writeText(text); } catch {
    const t = Object.assign(document.createElement('textarea'), { value: text });
    document.body.append(t); t.select(); document.execCommand('copy'); t.remove();
  }
  toast(label, color);
}

/** Wire every [data-copy] inside root. */
export function bindCopy(root) {
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-copy]');
    if (!b) return;
    e.preventDefault();
    const src = b.dataset.copy;
    const text = src.startsWith('#code:') ? $(src.slice(5), root)?.textContent : src;
    copy(text ?? '', b.dataset.copyLabel || 'Copied to clipboard', /^#[0-9a-f]{6}$/i.test(src) ? src : undefined);
    if (b.classList.contains('code__copy')) {
      b.innerHTML = icon.check;
      setTimeout(() => { b.innerHTML = icon.copy; }, 1400);
    }
  });
}

export const codeBlock = (id, html, raw = true) =>
  `<pre class="code" id="${id}">${raw ? html : esc(html)}</pre>`;
export const withCopy = (id, html) =>
  `<div style="position:relative">${codeBlock(id, html)}<button class="code__copy" type="button" data-copy="#code:#${id}" aria-label="Copy">${icon.copy}</button></div>`;

/* --------------------------------------------------------------- motion -- */

const io = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); e.target.dispatchEvent(new CustomEvent('reveal')); }
}, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 }) : null;

export function reveal(root = document) {
  for (const el of $$('[data-reveal], .split, [data-io]', root)) {
    if (el.classList.contains('in')) continue;
    if (!io || reduced()) { el.classList.add('in'); el.dispatchEvent(new CustomEvent('reveal')); } else io.observe(el);
  }
}

/** Split a headline into masked words. Keeps <em> runs intact. */
export function split(el) {
  let i = 0;
  const walk = (node) => {
    for (const n of [...node.childNodes]) {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        for (const part of n.textContent.split(/(\s+)/)) {
          if (!part) continue;
          if (/^\s+$/.test(part)) { frag.append(' '); continue; }
          const w = document.createElement('span'); w.className = 'w';
          const s = document.createElement('span'); s.textContent = part; s.style.setProperty('--i', i++);
          w.append(s); frag.append(w);
        }
        n.replaceWith(frag);
      } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
    }
  };
  walk(el);
  el.classList.add('split');
}

/** Count a number up when it appears. */
export function countUp(el, to, ms = 1400) {
  if (reduced()) { el.textContent = to.toLocaleString(); return; }
  const t0 = performance.now();
  const tick = (t) => {
    const p = Math.min(1, (t - t0) / ms);
    const e = 1 - Math.pow(1 - p, 4);
    el.textContent = Math.round(to * e).toLocaleString();
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/** Primary buttons track the pointer for their inner glow. */
export function glow(root = document) {
  root.addEventListener('pointermove', (e) => {
    const b = e.target.closest?.('.btn--primary');
    if (!b) return;
    const r = b.getBoundingClientRect();
    b.style.setProperty('--mx', `${e.clientX - r.left}px`);
    b.style.setProperty('--my', `${e.clientY - r.top}px`);
  });
}

/** Animated segmented control: moves a thumb under the pressed button. */
export function segmented(seg, onChange) {
  const thumb = document.createElement('span');
  thumb.className = 'seg__thumb';
  seg.prepend(thumb);
  const place = () => {
    const on = seg.querySelector('button[aria-pressed="true"]');
    if (!on) return;
    thumb.style.left = `${on.offsetLeft}px`;
    thumb.style.width = `${on.offsetWidth}px`;
  };
  seg.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    for (const x of seg.querySelectorAll('button')) x.setAttribute('aria-pressed', String(x === b));
    place();
    onChange?.(b.dataset.v, b);
  });
  requestAnimationFrame(place);
  new ResizeObserver(place).observe(seg);
  return place;
}

/* ------------------------------------------------------------ rendering -- */

/** Ink colour (black/white) for a hex background. */
export function ink(hex) {
  const n = parseInt(String(hex).slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return (L + 0.05) / 0.0532 >= 1.05 / (L + 0.05) ? '#0A0A0A' : '#FFFFFF'; // whichever gives more contrast
}

/** Minimal, safe markdown for tool output: headings, lists, bold, italics, code, links, hex swatches. */
export function md(src) {
  const lines = esc(src).split('\n');
  let html = '', inList = false, inCode = false, code = '';
  const inline = (s) => s
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])_([^_]+)_/g, '$1<em>$2</em>')
    .replace(/(https?:\/\/[^\s<)]+)/g, (u) => `<a href="${u}" target="_blank" rel="noopener">${u.replace(/^https?:\/\/[^/]+\/UiHall\/#\/a\//, '#')}</a>`)
    .replace(/(^|[\s(])(#[0-9A-Fa-f]{6})\b/g, '$1<span class="sw" style="background:$2"></span>$2')
    .replace(/\b((?:IMG|VID)-\d{4})\b(?![^<]*<\/a>)/g, '<a href="#/a/$1">$1</a>');
  let table = null;
  const flushTable = () => { if (!table) return; const [hd, ...rows] = table.filter((r) => !/^\|?\s*:?-{3,}/.test(r)); const cells = (r) => r.replace(/^\||\|$/g, '').split('|').map((c) => inline(c.trim()));
    html += `<table><thead><tr>${cells(hd).map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${cells(r).map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`; table = null; };
  let prevBlank = true;
  for (const raw of lines) {
    const l = raw; const blank = !l.trim();
    if (blank && !inCode) { prevBlank = true; flushTable(); if (inList) { html += '</ul>'; inList = false; } continue; }
    const pb = prevBlank; prevBlank = false;
    if (!inCode && /^\|.*\|\s*$/.test(l.trim())) { (table ||= []).push(l.trim()); continue; }
    flushTable();
    if (l.startsWith('```')) {
      if (inCode) { html += `<pre><code>${code}</code></pre>`; code = ''; }
      inCode = !inCode; continue;
    }
    if (inCode) { code += l + '\n'; continue; }
    const li = l.match(/^\s*[-*] (?:\[ \] )?(.*)/);
    if (li) { if (!inList) { html += '<ul>'; inList = true; } html += `<li>${inline(li[1])}</li>`; continue; }
    if (inList && /^\s{2,}\S/.test(l)) { html = html.replace(/<\/li>$/, `<br>${inline(l.trim())}</li>`); continue; }
    if (inList) { html += '</ul>'; inList = false; }
    const h = l.match(/^(#{1,3}) (.*)/);
    if (h) { html += `<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`; continue; }
    const n = l.match(/^\s*(\d+)\. (.*)/);
    if (n) { html += `<p><strong>${n[1]}.</strong> ${inline(n[2])}</p>`; continue; }
    if (l.trim()) { if (html.endsWith('</p>') && !pb) html = html.slice(0, -4) + ' ' + inline(l) + '</p>'; else html += `<p>${inline(l)}</p>`; }
  }
  flushTable();
  if (inList) html += '</ul>';
  return html;
}

export function jsonHtml(obj) {
  return esc(JSON.stringify(obj, null, 2))
    .replace(/(&quot;[^&]*?&quot;)(\s*:)/g, '<span class="k">$1</span>$2')
    .replace(/:\s(&quot;.*?&quot;)/g, ': <span class="s">$1</span>')
    .replace(/:\s(-?\d+\.?\d*)/g, ': <span class="n">$1</span>');
}

/** Syntax-tint a shell/JSON snippet already escaped. */
export function tint(src) {
  return esc(src)
    .replace(/(^|\n)(#[^\n]*)/g, '$1<span class="c">$2</span>')
    .replace(/(&quot;[^&\n]*?&quot;)/g, '<span class="s">$1</span>')
    .replace(/(?<![\w./-])(claude|npx|node|curl|codex|code|git)(?![\w./-])/g, '<span class="k">$1</span>');
}

export const debounce = (fn, ms = 160) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
