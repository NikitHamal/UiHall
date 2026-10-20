import { $, $$, esc, split, isTouch } from '../lib.js';
import { footer, label } from './shared.js';

export default function motion(root, app) {
  const { h } = app;
  const clips = h.assets.filter((a) => a.clip).sort((a, b) => (b.motion || 0) - (a.motion || 0));
  const cats = [...new Set(clips.map((a) => a.category))];
  root.innerHTML = `
  <div class="container page-head">
    <span class="eyebrow" data-reveal>Motion · ${clips.length} clips that actually move</span>
    <h1 class="display h-lg" id="mt">Motion, <em>measured.</em></h1>
    <p class="lede" data-reveal style="--d:2">Every source video was probed frame by frame; only the ones that genuinely move ship as clips. Transitions, micro-interactions, scroll choreography and morphs — playing as you scroll.</p>
    <div class="lib__chips" data-reveal style="--d:3" id="mf"><button class="chip" type="button" data-v="" aria-pressed="true">All</button>${cats.map((c) => `<button class="chip" type="button" data-v="${c}" aria-pressed="false">${esc(label(c))}</button>`).join('')}</div>
  </div>
  <div class="container reel" id="reel"></div>
  ${footer(h)}`;
  const t = $('#mt', root); split(t); requestAnimationFrame(() => t.classList.add('in'));
  let list = clips;
  const vio = new IntersectionObserver((es) => {
    for (const e of es) {
      const v = e.target.querySelector('video');
      if (e.isIntersecting) { if (!v.src) v.src = v.dataset.src; v.play().catch(() => {}); } else v.pause();
    }
  }, { rootMargin: '100px', threshold: 0.35 });
  const draw = (cat) => {
    vio.disconnect();
    list = cat ? clips.filter((a) => a.category === cat) : clips;
    $('#reel', root).innerHTML = list.map((a) => `
      <a class="reel__item" href="#/a/${a.id}" style="--ar:${Math.max(0.6, Math.min(1.9, a.clip_meta?.w / a.clip_meta?.h || a.w / a.h)).toFixed(3)}">
        <video data-src="${a.clip}" poster="${a.thumb}" muted loop playsinline preload="none"></video>
        <figcaption>${esc(a.title)}<span>${a.id} · ${Math.round(a.clip_meta?.duration_s || a.duration_s || 0)}s · motion ${a.motion ?? '—'}</span></figcaption>
      </a>`).join('');
    $$('.reel__item', root).forEach((el) => vio.observe(el));
  };
  $('#mf', root).addEventListener('click', (e) => {
    const b = e.target.closest('[data-v]'); if (!b) return;
    $$('#mf .chip', root).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    draw(b.dataset.v);
  });
  draw('');
  return { order: () => list.map((a) => a.id), cleanup: () => vio.disconnect() };
}
