/* UI Hall — small utilities: DOM helpers, formatting, colour maths, state sync. */

/* ------------------------------------------------------------------ DOM --- */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (v === true) node.setAttribute(k, '');
    else node.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (m) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]
));

/* --------------------------------------------------------------- format --- */

const fmt = {
  n(v) { return new Intl.NumberFormat('en').format(v); },
  bytes(b) {
    if (!b) return '—';
    const u = ['B', 'KB', 'MB', 'GB'];
    let i = 0, x = b;
    while (x >= 1024 && i < u.length - 1) { x /= 1024; i++; }
    return `${x < 10 && i > 0 ? x.toFixed(1) : Math.round(x)} ${u[i]}`;
  },
  dims(w, h) { return w && h ? `${w} × ${h}` : '—'; },
  secs(s) { return s ? `${s}s` : '—'; },
  titleCase(s) { return String(s || '').replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()); },
};

/* --------------------------------------------------------------- colour --- */

function hexToRgb(hex) {
  const h = String(hex || '').replace('#', '');
  const v = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(v.slice(0, 6), 16);
  return Number.isFinite(n) ? { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 } : null;
}

function relLum(hex) {
  const c = hexToRgb(hex);
  if (!c) return 0;
  const f = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
}

/** Perceptual lightness, 0..100 — used to decide "is this a dark UI". */
function lightness(hex) {
  const c = hexToRgb(hex);
  if (!c) return 50;
  return Math.round((0.299 * c.r + 0.587 * c.g + 0.114 * c.b) / 2.55);
}

/** Hue family name for a hex, or null for near-greys. */
function hueFamily(hex) {
  const c = hexToRgb(hex);
  if (!c) return null;
  const r = c.r / 255, g = c.g / 255, b = c.b / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (s < 0.18) return null;                 // effectively grey
  let h;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  if (h < 15 || h >= 345) return 'red';
  if (h < 45) return 'orange';
  if (h < 70) return 'yellow';
  if (h < 165) return 'green';
  if (h < 200) return 'teal';
  if (h < 255) return 'blue';
  if (h < 290) return 'purple';
  if (h < 345) return 'pink';
  return null;
}

function isDarkSurface(hex) { return lightness(hex) < 38; }
function isLightSurface(hex) { return lightness(hex) > 72; }

/** Contrast ratio between two hex colours. */
function contrast(a, b) {
  const la = relLum(a), lb = relLum(b);
  const hi = Math.max(la, lb), lo = Math.min(la, lb);
  return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100;
}

/** Accessible text colour for a given background. */
function inkOn(hex) {
  return contrast(hex, '#ffffff') >= contrast(hex, '#111111') ? '#ffffff' : '#111111';
}

/* ----------------------------------------------------------------- misc --- */

function debounce(fn, ms = 180) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

function copyText(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  const ta = el('textarea', { style: 'position:fixed;opacity:0' });
  ta.value = text;
  document.body.append(ta);
  ta.select();
  document.execCommand('copy');
  ta.remove();
  return Promise.resolve();
}

/* Deterministic shuffle so a shared link reproduces the same order. */
function seededShuffle(arr, seed) {
  const a = arr.slice();
  let s = seed >>> 0;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/* ---------------------------------------------------------------- icons --- */

const ICON = {
  close: '<svg viewBox="0 0 20 20"><path d="M5 5l10 10M15 5L5 15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>',
  copy: '<svg viewBox="0 0 20 20"><rect x="7" y="7" width="9" height="9" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M13 7V5.5A1.5 1.5 0 0011.5 4h-6A1.5 1.5 0 004 5.5v6A1.5 1.5 0 005.5 13H7" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
  check: '<svg viewBox="0 0 20 20"><path d="M4 10.5l4 4 8-8.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  play: '<svg viewBox="0 0 16 16"><path d="M4.5 2.8v10.4L13 8z"/></svg>',
  external: '<svg viewBox="0 0 20 20"><path d="M8 5h7v7M15 5L7 13" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M13 13v2H5V7h2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
};
