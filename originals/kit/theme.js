// Applies a theme from kit/themes.json to an original screen: ?theme=ember
(async () => {
  const id = new URLSearchParams(location.search).get('theme') || 'ember';
  const t = (await (await fetch('../kit/themes.json')).json())[id];
  const r = document.documentElement.style;
  for (const k of ['bg', 'surface', 'surface2', 'text', 'muted', 'line', 'accent', 'onAccent', 'accent2', 'back']) r.setProperty(`--${k}`, t[k]);
  r.setProperty('--r', `${t.radius}px`);
  document.body.classList.add(t.scheme, t.display === 'serif' ? 'serif' : 'sans');
  document.querySelectorAll('[data-status]').forEach((el) => { el.innerHTML = `<span>9:41</span><svg viewBox="0 0 66 12" aria-hidden="true"><g fill="currentColor"><rect x="0" y="7" width="3" height="5" rx="1"/><rect x="5" y="5" width="3" height="7" rx="1"/><rect x="10" y="2.5" width="3" height="9.5" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/><rect x="40" y="0.5" width="22" height="11" rx="3.5" fill="none" stroke="currentColor" opacity=".4"/><rect x="42" y="2.5" width="16" height="7" rx="2"/></g><path d="M29 3.2a8 8 0 0 1 9.5 0M30.6 5.6a5 5 0 0 1 6.3 0M32.4 8a2 2 0 0 1 2.7 0" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>`; });
  document.querySelectorAll('[data-t]').forEach((el) => { el.textContent = t[el.dataset.t] ?? el.textContent; });
  await document.fonts.ready;
  document.body.dataset.ready = '1';
})();
