// UI Hall originals runtime: applies a theme (?theme=ember), switches live on
// postMessage({ uihallTheme }), fits the frame in ?embed=1, and makes the kit's
// controls interactive — toggles, chips, segmented controls, steppers, tabs, fields.
(async () => {
  const qs = new URLSearchParams(location.search);
  const THEMES = await (await fetch('../kit/themes.json')).json();
  const root = document.documentElement.style;
  const apply = (id) => {
    const t = THEMES[id] || THEMES.ember;
    for (const k of ['bg', 'surface', 'surface2', 'text', 'muted', 'line', 'accent', 'onAccent', 'accent2', 'back']) root.setProperty(`--${k}`, t[k]);
    root.setProperty('--r', `${t.radius}px`);
    document.body.classList.remove('dark', 'light', 'serif', 'sans');
    document.body.classList.add(t.scheme, t.display === 'serif' ? 'serif' : 'sans');
    document.querySelectorAll('[data-t]').forEach((el) => { el.textContent = t[el.dataset.t] ?? el.textContent; });
  };
  apply(qs.get('theme') || 'ember');
  document.querySelectorAll('[data-status]').forEach((el) => { el.innerHTML = `<span>9:41</span><svg viewBox="0 0 66 12" aria-hidden="true"><g fill="currentColor"><rect x="0" y="7" width="3" height="5" rx="1"/><rect x="5" y="5" width="3" height="7" rx="1"/><rect x="10" y="2.5" width="3" height="9.5" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/><rect x="40" y="0.5" width="22" height="11" rx="3.5" fill="none" stroke="currentColor" opacity=".4"/><rect x="42" y="2.5" width="16" height="7" rx="2"/></g><path d="M29 3.2a8 8 0 0 1 9.5 0M30.6 5.6a5 5 0 0 1 6.3 0M32.4 8a2 2 0 0 1 2.7 0" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>`; });

  /* embed: fit the device/canvas to the frame and drop the presentation backdrop */
  if (qs.has('embed')) {
    document.body.classList.add('embed');
    const frame = document.querySelector('.device, .desk, .sheet-canvas');
    const fit = () => {
      // the bezel is drawn outside the box, and the host overlays a hint at the bottom — leave room for both
      const w = frame.offsetWidth, h = frame.offsetHeight;
      const s = Math.min((innerWidth - 72) / w, (innerHeight - 112) / h, 1.6);
      frame.style.transform = `translate(-50%, -50%) scale(${s})`; frame.style.top = `${(innerHeight - 28) / 2}px`;
    };
    addEventListener('resize', fit); fit();
    document.body.classList.add('interactive');
  }
  addEventListener('message', (e) => { if (e.data && e.data.uihallTheme) { document.body.classList.add('swap'); apply(e.data.uihallTheme); } });

  /* interactions ---------------------------------------------------------- */
  const tap = (el) => { el.animate?.([{ transform: 'scale(1)' }, { transform: 'scale(.95)' }, { transform: 'scale(1)' }], { duration: 260, easing: 'cubic-bezier(.34,1.56,.64,1)' }); };
  document.addEventListener('click', (e) => {
    const t = e.target;
    const tg = t.closest('.toggle'); if (tg) { tg.classList.toggle('on'); return; }
    const pill = t.closest('.pill'); if (pill && pill.parentElement) {
      const sibs = [...pill.parentElement.children].filter((x) => x.classList.contains('pill'));
      if (sibs.some((x) => x.classList.contains('on')) && sibs.length > 1) { sibs.forEach((x) => x.classList.toggle('on', x === pill)); tap(pill); return; }
    }
    const step = t.closest('span,button'); if (step && /^[−+-]$/.test(step.textContent.trim())) {
      const box = step.parentElement; const n = box && box.querySelector('b.num');
      if (n && /^\d+$/.test(n.textContent.trim())) { const v = Math.max(0, +n.textContent + (step.textContent.trim() === '+' ? 1 : -1)); n.textContent = v; tap(n); return; }
    }
    const tab = t.closest('.tabbar .t'); if (tab) { tab.parentElement.querySelectorAll('.t').forEach((x) => x.classList.toggle('on', x === tab)); return; }
    const btn = t.closest('.btn, .ico, .tag, .av'); if (btn) { tap(btn); if (btn.classList.contains('btn')) ripple(btn, e); }
  });
  function ripple(el, e) {
    const r = el.getBoundingClientRect(); const s = document.createElement('i');
    const d = Math.max(r.width, r.height) * 2;
    Object.assign(s.style, { position: 'absolute', left: `${(e.clientX - r.left) / (r.width / el.offsetWidth) - d / 2}px`, top: `${(e.clientY - r.top) / (r.height / el.offsetHeight) - d / 2}px`, width: `${d}px`, height: `${d}px`, borderRadius: '50%', background: 'currentColor', opacity: '.18', pointerEvents: 'none', transform: 'scale(0)', transition: 'transform .5s cubic-bezier(.16,1,.3,1), opacity .6s' });
    el.style.position ||= 'relative'; el.style.overflow = 'hidden'; el.append(s);
    requestAnimationFrame(() => { s.style.transform = 'scale(1)'; s.style.opacity = '0'; });
    setTimeout(() => s.remove(), 650);
  }
  document.querySelectorAll('.field span').forEach((s) => { s.contentEditable = 'plaintext-only'; s.spellcheck = false; s.style.outline = 'none'; s.style.minWidth = '40px'; });
  document.querySelectorAll('.field').forEach((f) => { f.addEventListener('focusin', () => f.classList.add('focus')); f.addEventListener('focusout', () => f.classList.remove('focus')); });

  await document.fonts.ready;
  document.body.dataset.ready = '1';
})();
