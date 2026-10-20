/* Shared runtime for the phone demos: a view stack with push/pop, tabs, sheets, toasts, segmented controls and tiny charts. */
export const $ = (s, r = document) => r.querySelector(s);
const P = (d) => `<svg class="i" viewBox="0 0 20 20" aria-hidden="true">${d}</svg>`;
export const icon = {
  home: P('<path d="M3.5 9 10 3.5 16.5 9v7.5h-13z"/>'), chart: P('<path d="M3 16 8 10l3 3 6-8"/>'), clock: P('<circle cx="10" cy="10" r="7"/><path d="M10 6v4l3 2"/>'),
  user: P('<circle cx="10" cy="7" r="3.5"/><path d="M3.5 17a6.5 6.5 0 0 1 13 0"/>'), send: P('<path d="M5 15 15 5M8 5h7v7"/>'), receive: P('<path d="M15 5 5 15M12 15H5V8"/>'),
  swap: P('<path d="M4 7h11l-3-3M16 13H5l3 3"/>'), swapv: P('<path d="M7 4v12l-3-3M13 16V4l3 3"/>'), buy: P('<path d="M10 4v12M4 10h12"/>'), back: P('<path d="m12 4-6 6 6 6"/>'),
  chev: P('<path d="m8 5 5 5-5 5"/>'), eye: P('<path d="M2 10s3-5.5 8-5.5S18 10 18 10s-3 5.5-8 5.5S2 10 2 10Z"/><circle cx="10" cy="10" r="2.5"/>'),
  scan: P('<path d="M3 7V4h3M14 4h3v3M17 13v3h-3M6 16H3v-3M3 10h14"/>'), search: P('<circle cx="9" cy="9" r="5.5"/><path d="m13.2 13.2 3.8 3.8"/>'),
  star: P('<path d="m10 2.8 2.1 4.3 4.7.7-3.4 3.3.8 4.7L10 13.6l-4.2 2.2.8-4.7-3.4-3.3 4.7-.7z"/>'), doc: P('<path d="M5 3h7l3 3v11H5z"/><path d="M12 3v3h3M8 10h5M8 13h5"/>'),
  globe: P('<circle cx="10" cy="10" r="7"/><path d="M3 10h14M10 3c2.2 2.4 2.2 11.6 0 14M10 3c-2.2 2.4-2.2 11.6 0 14"/>'), bell: P('<path d="M5 14V9a5 5 0 0 1 10 0v5l1.5 1.5h-13zM8.5 17.5h3"/>'),
  lock: P('<rect x="4.5" y="9" width="11" height="8" rx="2"/><path d="M7 9V6.5a3 3 0 0 1 6 0V9"/>'), key: P('<circle cx="7" cy="10" r="3.5"/><path d="M10.5 10H17M14.5 10v3"/>'),
  check: P('<path d="m5 10.5 3 3 7-7"/>'), share: P('<path d="M10 3v10M6 7l4-4 4 4M4 12v4h12v-4"/>'), sliders: P('<path d="M4 6h8M15 6h1M4 14h2M9 14h7"/><circle cx="13.5" cy="6" r="1.8"/><circle cx="7.5" cy="14" r="1.8"/>'),
  card: P('<rect x="2.5" y="5" width="15" height="10" rx="2"/><path d="M2.5 8.5h15"/>'), arrow: P('<path d="M4 10h12M11 5l5 5-5 5"/>'), plus: P('<path d="M10 4v12M4 10h12"/>'),
  moon: P('<path d="M15.5 12.3A6.5 6.5 0 0 1 7.7 4.5a6.5 6.5 0 1 0 7.8 7.8Z"/>'), heart: P('<path d="M10 16s-6-3.6-6-8a3.5 3.5 0 0 1 6-2.4A3.5 3.5 0 0 1 16 8c0 4.4-6 8-6 8Z"/>'),
  play: P('<path d="M7 4.5v11l9-5.5z" fill="currentColor"/>'), pause: P('<path d="M7 4.5v11M13 4.5v11"/>'), book: P('<path d="M4 4h5a2 2 0 0 1 2 2v10a1.5 1.5 0 0 0-1.5-1.5H4zM16 4h-5"/><path d="M16 4v10.5h-5"/>'),
  sun: P('<circle cx="10" cy="10" r="3.2"/><path d="M10 3v1.5M10 15.5V17M3 10h1.5M15.5 10H17M5 5l1 1M14 14l1 1M5 15l1-1M14 6l1-1"/>'), edit: P('<path d="M4 16h3l8-8-3-3-8 8z"/>'),
};

export function el(html, init) {
  const t = document.createElement('template'); t.innerHTML = html.trim();
  const node = t.content.firstElementChild; init?.(node); return node;
}

let app, stack = [], cfg;
const STATUS = `<span>9:41</span><svg viewBox="0 0 66 12" aria-hidden="true"><g fill="currentColor"><rect x="0" y="7" width="3" height="5" rx="1"/><rect x="5" y="5" width="3" height="7" rx="1"/><rect x="10" y="2.5" width="3" height="9.5" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/><rect x="40" y="0.5" width="22" height="11" rx="3.5" fill="none" stroke="currentColor" opacity=".4"/><rect x="42" y="2.5" width="16" height="7" rx="2"/></g><path d="M29 3.2a8 8 0 0 1 9.5 0M30.6 5.6a5 5 0 0 1 6.3 0M32.4 8a2 2 0 0 1 2.7 0" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>`;

export function mountPhone(c) {
  cfg = c; app = $('#app');
  document.querySelectorAll('[data-status]').forEach((s) => { s.innerHTML = STATUS; });
  const bar = $('#tabbar');
  if (bar && c.tabs) {
    bar.innerHTML = c.tabs.map(([k, l, ic]) => `<button data-tab="${k}" aria-label="${l}" aria-current="false">${icon[ic]}</button>`).join('');
  }
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-tab]'); if (t && (t.closest('#tabbar') || t.closest('#app'))) { c.onTab(t.dataset.tab); return; }
    const b = e.target.closest('[data-back]'); if (b) { pop(); return; }
    const a = e.target.closest('[data-act]'); if (a && a.closest('.phone')) { c.onAction?.(a.dataset.act, a); return; }
    const g = e.target.closest('[data-go]'); if (g && g.closest('.phone')) { c.onGo?.(g.dataset.go, g); }
  });
  $('#scrim')?.addEventListener('click', closeSheet);
}

export function setRoot(view, animate = true) {
  app.innerHTML = ''; stack = [view]; app.append(view);
  if (animate) view.classList.add('fade');
  $('#tabbar')?.classList.remove('hide');
}
export function push(view) {
  const prev = stack.at(-1); prev?.classList.add('under');
  stack.push(view); app.append(view); view.classList.add('enter');
  $('#tabbar')?.classList.add('hide');
}
export function pop() {
  if (stack.length < 2) return;
  const v = stack.pop(); v.classList.remove('enter'); v.classList.add('leave');
  const prev = stack.at(-1); prev.classList.remove('under'); prev._refresh?.();
  setTimeout(() => v.remove(), 500);
  if (stack.length === 1) $('#tabbar')?.classList.remove('hide');
}
export function openSheet(html, init) {
  const s = $('#sheetBody'); s.innerHTML = html; init?.(s); $('#sheet').scrollTop = 0; $('#phone').classList.add('open');
}
export function closeSheet() { $('#phone').classList.remove('open'); }
let tt;
export function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('on'), 1700); }

export function seg(root, onChange) {
  if (!root) return;
  let th = root.querySelector('.th'); if (!th) { th = document.createElement('span'); th.className = 'th'; root.prepend(th); }
  const place = () => { const b = root.querySelector('[aria-pressed=true]'); if (!b) return; th.style.left = `${b.offsetLeft}px`; th.style.width = `${b.offsetWidth}px`; };
  root.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b || !root.contains(b)) return; e.stopPropagation(); root.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', x === b)); place(); onChange?.(b.dataset.v); });
  requestAnimationFrame(() => requestAnimationFrame(place));
}

export function spark(vals, color = 'currentColor') {
  const mx = Math.max(...vals), mn = Math.min(...vals), W = 64, H = 26;
  const pts = vals.map((v, i) => `${(i * W / (vals.length - 1)).toFixed(1)},${(H - 3 - (v - mn) / (mx - mn || 1) * (H - 6)).toFixed(1)}`).join(' L');
  return `<svg class="sp" viewBox="0 0 ${W} ${H}"><path d="M${pts}" fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

export function curve(svg, vals, color = 'var(--accent)') {
  const W = 390, H = 110, mx = Math.max(...vals), mn = Math.min(...vals);
  const pts = vals.map((v, i) => [i * W / (vals.length - 1), H - 12 - (v - mn) / (mx - mn || 1) * (H - 30)]);
  let d = `M${pts[0]}`;
  for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], cx = (x0 + x1) / 2; d += ` C${cx},${y0} ${cx},${y1} ${x1},${y1}`; }
  const id = `g${Math.random().toString(36).slice(2, 7)}`;
  svg.innerHTML = `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".3"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs><path class="a" d="${d} L${W},${H} L0,${H}Z" fill="url(#${id})"/><path class="l" d="${d}" style="stroke:${color}"/><circle cx="${pts.at(-1)[0] - 4}" cy="${pts.at(-1)[1]}" r="4" fill="${color}"><animate attributeName="r" values="4;7;4" dur="2s" repeatCount="indefinite"/></circle>`;
}
