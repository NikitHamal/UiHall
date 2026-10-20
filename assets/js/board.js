/* The board: references you pin while browsing, kept in localStorage and
   shareable as a URL. Views subscribe to 'uh:board' to stay in sync. */

const KEY = 'uh-board';
let ids = [];
try { ids = JSON.parse(localStorage.getItem(KEY) || '[]').filter((x) => /^(IMG|VID)-\d{4}$/.test(x)); } catch {}

const save = () => {
  try { localStorage.setItem(KEY, JSON.stringify(ids)); } catch {}
  dispatchEvent(new CustomEvent('uh:board', { detail: ids.slice() }));
};

export const board = {
  list: () => ids.slice(),
  has: (id) => ids.includes(id),
  toggle(id) { ids = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id].slice(-24); save(); return ids.includes(id); },
  set(list) { ids = [...new Set(list)].slice(0, 24); save(); },
  clear() { ids = []; save(); },
};

export const pinIcon = (on) => `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5.5 3.5h9v13.2L10 13.4l-4.5 3.3z" ${on ? 'fill="currentColor"' : ''}/></svg>`;

/** A thumbnail arcs from the pin to the Board link — confirms where it went. */
export function flyToBoard(fromEl, src) {
  const target = [...document.querySelectorAll('[data-nav="board"]')].find((e) => e.getBoundingClientRect().width > 0 && e.getBoundingClientRect().left >= 0);
  if (!fromEl || !target || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const a = fromEl.getBoundingClientRect(), b = target.getBoundingClientRect();
  const f = Object.assign(document.createElement('div'), { className: 'flyer' });
  f.style.backgroundImage = `url("${src}")`;
  f.style.left = `${a.left + a.width / 2 - 27}px`; f.style.top = `${a.top + a.height / 2 - 33}px`;
  document.body.append(f);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
  f.animate([
    { transform: 'translate(0,0) scale(1) rotate(0)', opacity: 1 },
    { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 80}px) scale(.8) rotate(-8deg)`, opacity: 1, offset: 0.55 },
    { transform: `translate(${dx}px, ${dy}px) scale(.18) rotate(-14deg)`, opacity: 0.2 },
  ], { duration: 720, easing: 'cubic-bezier(.5,0,.3,1)' }).onfinish = () => f.remove();
}
