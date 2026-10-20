import { $, $$, esc, split, countUp, reveal, bindCopy, ink, reduced, isTouch, segmented, tint } from '../lib.js';
import { TOOLS } from '../../../mcp/src/tools.js';
import { contrast } from '../../../mcp/src/color.js';
import { footer, installBlock, bindInstall, thumb, arrowBtn } from './shared.js';
import { icon } from '../lib.js';
const JUMP_IC = {
  grid: '<svg viewBox="0 0 20 20"><rect x="3" y="3" width="6" height="6" rx="1.5"/><rect x="11" y="3" width="6" height="6" rx="1.5"/><rect x="3" y="11" width="6" height="6" rx="1.5"/><rect x="11" y="11" width="6" height="6" rx="1.5"/></svg>',
  star: '<svg viewBox="0 0 20 20"><path d="m10 2.8 2.1 4.3 4.7.7-3.4 3.3.8 4.7L10 13.6l-4.2 2.2.8-4.7-3.4-3.3 4.7-.7z"/></svg>',
  pin: '<svg viewBox="0 0 20 20"><path d="M5.5 3.5h9v13.2L10 13.4l-4.5 3.3z"/></svg>',
  code: '<svg viewBox="0 0 20 20"><path d="M7 6 3 10l4 4M13 6l4 4-4 4"/></svg>',
};
import { BLURB } from '../blurbs.js';

/* Curated picks for the "measured" demo — strong, varied palettes. */
const ANATOMY = ['IMG-0468', 'IMG-0473', 'IMG-0055', 'IMG-0397', 'IMG-0587', 'IMG-0618'];

/* Scripted agent sessions; results come from the real engine at runtime. */
const SESSIONS = [
  { ask: 'Design the onboarding for a sleep-tracking app. Calm, iOS.', tool: 'design_brief', args: { screen: 'onboarding for a sleep tracking app', platform: 'ios', mood: 'calm' } },
  { ask: 'Show me real interfaces built on an acid-lime accent.', tool: 'search_by_color', args: { hex: '#C6F432', tolerance: 0.1 } },
  { ask: 'I need a premium dark crypto wallet home.', tool: 'design_brief', args: { screen: 'crypto wallet home', mood: 'premium', surface: 'dark' } },
  { ask: 'Pricing page for a developer tool — what works?', tool: 'search_designs', args: { query: 'pricing plans toggle', limit: 6 } },
];

export default function home(root, app) {
  const { h } = app;
  const t = h.corpus.totals;
  const timers = [];
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));

  const themes = ['ember', 'mint', 'ink', 'grape'];
  const origBySlug = new Map();
  for (const x of h.assets) if (x.original && x.source_html) { const slug = x.source_html.split('/').pop().split('.')[0]; if (!origBySlug.has(slug)) origBySlug.set(slug, {}); origBySlug.get(slug)[x.theme] = x; }
  const carouselSlugs = ['finance-home', 'music-now-playing', 'assistant-chat', 'product-detail-sneaker', 'fitness-rings', 'travel-flight-select', 'onboarding-welcome', 'paywall-plans', 'calendar-day', 'messages-inbox', 'profile-stats', 'cart-sticky-checkout'].filter((k) => origBySlug.has(k));

  root.innerHTML = `
  <header class="lp-nav" id="lpNav">
    <a class="lp-nav__brand" href="#/" aria-label="UI Hall"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M9 25V15a7 7 0 0 1 14 0v10" fill="none" stroke="var(--accent)" stroke-width="3.2" stroke-linecap="round"/><path d="M16 25v-7" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/></svg><span>UI&nbsp;Hall</span></a>
    <nav class="lp-nav__links" aria-label="Sections"><a href="#/library">Library</a><a href="#/originals">Originals</a><a href="#/patterns">Patterns</a><a href="demo/">Demos</a><a href="#/agents">For agents</a></nav>
    <div class="lp-nav__end"><button class="icon-btn" type="button" data-lp-theme aria-label="Toggle theme"><svg class="sun" viewBox="0 0 20 20"><path d="M10 3v1.5M10 15.5V17M3 10h1.5M15.5 10H17M5 5l1 1M14 14l1 1M5 15l1-1M14 6l1-1"/><circle cx="10" cy="10" r="3.2"/></svg></button><a class="btn btn--sm btn--primary" href="#/library">Open the hall ${icon.arrow}</a></div>
  </header>

  <section class="lp-hero" id="lpHero">
    <div class="lp-grid" aria-hidden="true"></div>
    <div class="lp-hero__copy">
      <span class="lp-kicker" data-reveal><i></i>Design reference · MCP server · agent skill</span>
      <h1 class="lp-title" id="heroTitle">The design reference your agent can <span class="lp-scribble">see.<svg viewBox="0 0 220 40" preserveAspectRatio="none" aria-hidden="true"><path d="M4 26 C40 10 90 8 132 14 S196 30 216 18" pathLength="1"/><path d="M18 34 C70 26 130 26 190 30" pathLength="1"/></svg></span></h1>
      <p class="lp-lede" data-reveal style="--d:4">${t.assets} real interfaces — ${t.originals || 0} built in code and free to use — each one written up by hand and colour-measured from the pixels. Browse it yourself, or hand it to Claude Code, Cursor and any MCP agent so it designs from evidence instead of the average.</p>
      <div class="lp-cta" data-reveal style="--d:5">
        <a class="btn btn--primary lp-btn" href="#/library">Explore the hall ${icon.arrow}</a>
        <button class="lp-copy" type="button" data-copy="claude plugin marketplace add https://nikithamal.github.io/UiHall/.claude-plugin/marketplace.json && claude plugin install uihall@uihall" data-copy-label="Install command copied"><span>$</span>claude plugin install uihall<em>${icon.copy}</em></button>
      </div>
    </div>
    <div class="lp-stage" id="lpStage" aria-hidden="true">
      <div class="lp-blob"></div>
      <img class="lp-phone lp-phone--l" src="assets/landing/chat.webp" alt="">
      <img class="lp-phone lp-phone--r" src="assets/landing/music.webp" alt="">
      <img class="lp-phone lp-phone--c" src="assets/landing/finance.webp" alt="">
      <div class="lp-note lp-note--a"><span>hero number · 3× body</span><svg viewBox="0 0 120 60"><path d="M4 8 C40 6 80 18 112 50" pathLength="1"/><path d="M100 50 L113 51 L110 38" pathLength="1"/></svg></div>
      <div class="lp-note lp-note--b"><svg viewBox="0 0 120 60"><path d="M116 10 C80 4 40 20 10 50" pathLength="1"/><path d="M8 37 L9 51 L22 48" pathLength="1"/></svg><span>one accent carries<br>every action</span></div>
      <div class="lp-chip lp-chip--1"><i style="background:#FF6A2B"></i>#FF6A2B <b>4.2%</b></div>
      <div class="lp-chip lp-chip--2"><i style="background:#181615"></i>#181615 <b>61%</b></div>
      <div class="lp-chip lp-chip--3"><span class="contrast-pill pass" style="height:auto;padding:0;background:none">text 16.4:1 · AAA</span></div>
    </div>
    <a class="lp-scroll" href="#lpProof" aria-label="Scroll"><i></i></a>
  </section>

  <section class="lp-proof" id="lpProof">
    <div class="container lp-stats hero__stats">
      ${[[t.assets, 'references'], [t.originals || 0, 'originals · MIT'], [h.patterns().length, 'patterns with receipts'], [h.assets.reduce((n, x) => n + (x.palette_detail?.length || 0), 0), 'colours measured'], [TOOLS.length, 'agent tools']].map(([n, l]) => `<div class="stat"><b class="num" data-count="${n}">0</b><span>${l}</span></div>`).join('')}
    </div>
    <div class="marquee lp-marquee"><div class="marquee__track">${(() => { const x = h.patterns().map((pt) => `<a class="lp-tag" href="#/patterns#${pt.slug}">${esc(pt.name)}</a><span class="lp-dot">✦</span>`).join(''); return x + x; })()}</div></div>
  </section>

  <section class="container lp-moves" id="lpMoves">
    <div class="lp-moves__copy">
      <span class="eyebrow">How it works</span>
      <h2 class="display h-lg">Three moves, <em>every screen.</em></h2>
      <ol class="lp-steps">
        <li data-step="0" class="on"><b>Brief</b><p>Your agent asks UI Hall for the screen it’s about to build and gets the closest real references, the patterns that apply and three measured palettes — in one call.</p></li>
        <li data-step="1"><b>Look</b><p>It actually opens the images. Proportion, rhythm and density live in pixels, not in descriptions — so it looks before it codes, and takes structure, not skin.</p></li>
        <li data-step="2"><b>Build</b><p>Measured colour becomes tokens, contrast gets checked, and a whole design system lands in your codebase — CSS, Tailwind, SwiftUI or Compose.</p></li>
      </ol>
    </div>
    <div class="lp-moves__stage" id="lpMovesStage">
      <div class="lp-panel" data-panel="0"></div>
      <div class="lp-panel" data-panel="1"></div>
      <div class="lp-panel" data-panel="2"></div>
    </div>
  </section>

  <section class="lp-originals" id="lpOriginals">
    <div class="container section__head">
      <div><span class="eyebrow">Originals · MIT</span><h2 class="display h-lg mt-s">Built in code. <em>Yours to use.</em></h2></div>
      <div class="lp-originals__side"><p class="lede">Every original renders in four themes from one kit — switch them and the whole shelf re-skins. Written up, measured and searchable like everything else.</p>
        <div class="seg lp-themes" id="lpThemes" role="group" aria-label="Theme">${themes.map((x, i) => `<button type="button" data-v="${x}" aria-pressed="${i === 0}"><i class="lp-sw lp-sw--${x}"></i>${x[0].toUpperCase() + x.slice(1)}</button>`).join('')}</div></div>
    </div>
    <div class="lp-shelf" id="lpShelf">${carouselSlugs.map((k, i) => { const x = origBySlug.get(k).ember; return `<a class="lp-shelf__item" href="#/a/${x.id}" data-slug="${k}" style="--i:${i}"><img src="${x.src}" alt="${esc(x.title)}" loading="lazy" draggable="false"><span>${esc(x.title.split(' · ')[0])}</span></a>`; }).join('')}</div>
    <div class="container row mt-m">${arrowBtn('#/originals', `All ${t.originals || 0} originals`)}<span class="faint" style="font-size:13px">Drag the shelf · or use ← →</span></div>
  </section>

  <section class="container section" id="agent" data-io>
    <div class="section__head">
      <h2 class="display h-lg" data-reveal>Your agent, <em>with taste.</em></h2>
      <p class="lede" data-reveal style="--d:1">A real session against the real engine. Ask for a screen; UI Hall answers with references, patterns, a measured palette — and the agent builds from them.</p>
    </div>
    <div class="agent-demo" data-reveal style="--d:2">
      <div class="term" aria-label="Agent session demo">
        <div class="term__bar"><i></i><i></i><i></i><span>claude — ~/sleep-app</span></div>
        <div class="term__body" id="termBody"></div>
      </div>
      <div class="stage" id="stage">
        <div class="stage__label"><span class="eyebrow" id="stageLabel">Waiting for a tool call</span><span class="tag" id="stageTool">—</span></div>
        <div class="stage__grid" id="stageGrid"></div>
        <div class="stage__palette" id="stagePal"></div>
      </div>
    </div>
  </section>

  <section class="container section" id="anatomy">
    <div class="section__head">
      <h2 class="display h-lg" data-reveal>Every pixel, <em>measured.</em></h2>
      <p class="lede" data-reveal style="--d:1">Pick a reference. Its palette is what the image is actually made of — ranked by area, assigned to UI roles and contrast-checked, by the same engine the MCP server runs.</p>
    </div>
    <div class="anatomy" data-reveal style="--d:2">
      <div class="anatomy__media"><img alt=""><div class="scan"></div></div>
      <div class="anatomy__panel card"></div>
    </div>
  </section>

  <section class="container section">
    <div class="section__head">
      <h2 class="display h-lg" data-reveal>Evidence in, <em>product out.</em></h2>
      <p class="lede" data-reveal style="--d:1">Complete, working apps built by following the skill end to end — each one cites the references and measured palette it borrowed.</p>
    </div>
    <div class="showcase">
      ${[['wallet', 'Halo', 'Wallet app · iOS', 'IMG-0365 · IMG-0433 · VID-0382'], ['pricing', 'Relay', 'Product site · web', 'IMG-0587 · IMG-0592 · IMG-0610'], ['dashboard', 'Kiln', 'Analytics · web', 'VID-0314 · IMG-0518 · IMG-0455'], ['sleep', 'Hush', 'Wellness app · iOS', 'VID-0236 · IMG-0618 · VID-0173']].map(([d, n, k, refs], i) => `
      <a class="show" href="demo/${d}/" data-reveal style="--d:${i}"><div class="show__img"><img src="demo/${d}/cover.jpg" alt="${n} prototype" loading="lazy"></div>
        <div class="show__meta"><b>${n}</b><span>${k}</span><small>${refs}</small></div></a>`).join('')}
    </div>
  </section>

  <section class="container section" id="install">
    <div class="section__head">
      <h2 class="display h-lg" data-reveal>Thirty seconds <em>to install.</em></h2>
      <p class="lede" data-reveal style="--d:1">One file, zero dependencies, no API key. Claude Code, Cursor, VS Code, Codex, Claude Desktop — anything that speaks MCP.</p>
    </div>
    <div data-reveal style="--d:2">${installBlock()}</div>
  </section>

  <section class="container lp-final">
    <div class="lp-final__card" data-reveal>
      <h2 class="display">Stop designing from <em>the&nbsp;average.</em></h2>
      <div class="row" style="justify-content:center"><a class="btn btn--primary lp-btn" href="#/library">Open the hall ${icon.arrow}</a><a class="btn lp-btn" href="#/agents">Connect your agent</a></div>
    </div>
  </section>

  ${footer(h)}`;

  /* hero: kinetic headline, hand-drawn scribble, counters */
  const title = $('#heroTitle', root);
  split(title);
  requestAnimationFrame(() => requestAnimationFrame(() => { title.classList.add('in'); $('#lpStage', root).classList.add('in'); }));
  $('.lp-stats', root).addEventListener('reveal', () => $$('[data-count]', root).forEach((el, i) => setTimeout(() => countUp(el, +el.dataset.count), i * 90)), { once: true });
  $('.lp-stats', root).setAttribute('data-io', '');

  /* nav: glass once you leave the hero */
  const nav = $('#lpNav', root);
  const onScroll = () => nav.classList.toggle('solid', scrollY > 40);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  $('[data-lp-theme]', root).addEventListener('click', () => $('#themeBtn').click());

  /* hero stage: pointer parallax with spring-ish easing */
  const stageEl = $('#lpStage', root);
  let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
  const tick = () => { cx += (tx - cx) * 0.08; cy += (ty - cy) * 0.08; stageEl.style.setProperty('--mx', cx.toFixed(3)); stageEl.style.setProperty('--my', cy.toFixed(3)); raf = Math.abs(tx - cx) + Math.abs(ty - cy) > 0.001 ? requestAnimationFrame(tick) : 0; };
  const onMove = (e) => { tx = e.clientX / innerWidth - 0.5; ty = e.clientY / innerHeight - 0.5; if (!raf) raf = requestAnimationFrame(tick); };
  if (!isTouch() && !reduced()) addEventListener('pointermove', onMove, { passive: true });

  /* three moves: sticky story, panels built from the live engine */
  const brief = h.brief({ screen: 'onboarding for a sleep tracking app', platform: 'ios', mood: 'calm' });
  const pal = brief.palettes[0]?.roles;
  const panels = $$('.lp-panel', root);
  panels[0].innerHTML = `<div class="lp-pcard"><div class="lp-pcard__bar"><span class="tag tag--accent">design_brief</span><code>“onboarding for a sleep tracking app”</code></div>
    <div class="lp-refgrid">${brief.references.slice(0, 6).map((r, i) => `<div style="--i:${i}"><img src="${thumb(r.asset)}" alt=""><span>${r.asset.id}</span></div>`).join('')}</div>
    <div class="lp-pcard__foot"><span>${brief.patterns.slice(0, 2).map((x) => esc(x.name)).join(' · ')}</span><span class="stage__palette in" style="display:flex;gap:4px;width:120px">${pal ? [pal.background, pal.surface, pal.accent, pal.text].map((c, i) => `<i style="--c:${c};--i:${i};height:22px"></i>`).join('') : ''}</span></div></div>`;
  const look = brief.references[0].asset;
  panels[1].innerHTML = `<div class="lp-look"><img src="${look.src}" alt="${esc(look.title)}"><div class="lp-look__ann lp-look__ann--1"><b>Structure</b> one promise per step</div><div class="lp-look__ann lp-look__ann--2"><b>Rhythm</b> visual top · CTA in thumb zone</div><div class="lp-look__ann lp-look__ann--3"><b>Skip</b> its mascot and blue — wrong product</div></div>`;
  const sys = h.designSystem({ id: look.id, name: 'hush' });
  panels[2].innerHTML = `<div class="lp-build"><div class="lp-build__ui" style="--b:${sys.tokens.color.background};--s:${sys.tokens.color.surface};--t:${sys.tokens.color.text};--a:${sys.tokens.color.accent};--o:${sys.tokens.color['on-accent']};--m:${sys.tokens.color['text-muted']}">
      <span class="lp-build__eyebrow">Step 1 of 3</span><b>Sleep is a skill.</b><p>Two questions and Hush builds tonight’s wind-down around you.</p><i class="lp-build__btn">Get started</i></div>
    <pre class="code">${tint(sys.css.split('\n').slice(0, 16).join('\n'))}</pre></div>`;
  const steps = $$('.lp-steps li', root);
  const setStep = (n) => { steps.forEach((x) => x.classList.toggle('on', +x.dataset.step === n)); panels.forEach((x) => x.classList.toggle('on', +x.dataset.panel === n)); };
  setStep(0);
  steps.forEach((x) => x.addEventListener('click', () => setStep(+x.dataset.step)));
  const stepIO = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) setStep(+e.target.dataset.step); }), { rootMargin: '-45% 0px -45% 0px' });
  steps.forEach((x) => stepIO.observe(x));
  let autoStep = setInterval(() => { const r = $('#lpMoves', root)?.getBoundingClientRect(); if (r && r.top < innerHeight && r.bottom > 0 && innerWidth < 980) setStep((+(steps.find((x) => x.classList.contains('on'))?.dataset.step || 0) + 1) % 3); }, 3200);

  /* originals shelf: drag to scroll, theme switch re-skins in place */
  const shelf = $('#lpShelf', root);
  segmented($('#lpThemes', root), (th) => {
    $$('.lp-shelf__item', shelf).forEach((it, i) => {
      const x = origBySlug.get(it.dataset.slug)[th]; if (!x) return;
      const img = it.querySelector('img');
      setTimeout(() => { img.style.opacity = '0'; img.style.transform = 'scale(.97)'; setTimeout(() => { img.src = x.src; it.href = `#/a/${x.id}`; img.onload = () => { img.style.opacity = ''; img.style.transform = ''; }; }, 180); }, i * 45);
    });
  });
  let down = null, moved = false;
  shelf.addEventListener('pointerdown', (e) => { down = { x: e.clientX, s: shelf.scrollLeft }; moved = false; shelf.classList.add('drag'); });
  addEventListener('pointermove', (e) => { if (!down) return; const dx = e.clientX - down.x; if (Math.abs(dx) > 4) moved = true; shelf.scrollLeft = down.s - dx; });
  addEventListener('pointerup', () => { down = null; shelf.classList.remove('drag'); });
  shelf.addEventListener('click', (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); } }, true);
  const onKeyShelf = (e) => { const r = shelf.getBoundingClientRect(); if (r.top > innerHeight || r.bottom < 0 || /input|textarea/i.test(document.activeElement?.tagName)) return; if (e.key === 'ArrowRight') shelf.scrollBy({ left: 360, behavior: 'smooth' }); if (e.key === 'ArrowLeft') shelf.scrollBy({ left: -360, behavior: 'smooth' }); };
  addEventListener('keydown', onKeyShelf);

  /* ------------------------------------------------------- anatomy demo -- */
  const anat = $('.anatomy', root);
  const picks = ANATOMY.map((id) => h.get(id)).filter(Boolean);
  const showAsset = (a) => {
    const img = $('.anatomy__media img', anat);
    img.style.opacity = '0';
    const next = new Image();
    next.src = a.src;
    next.onload = () => { img.src = a.src; img.alt = a.title; img.style.opacity = '1'; anat.classList.remove('run'); void anat.offsetWidth; anat.classList.add('run'); };
    const full = h.full(a);
    const r = full.colour_roles;
    const pal = a.palette_detail || [];
    const cx = r?.contrast || {};
    const pill = (name, c) => c ? `<span class="contrast-pill ${c.ratio >= 4.5 ? 'pass' : c.ratio >= 3 ? 'pass' : 'fail'}">${name} ${c.ratio}:1 · ${c.verdict}</span>` : '';
    $('.anatomy__panel', anat).innerHTML = `
      <div class="anatomy__id"><span class="tag">${a.id}</span><span class="faint mono" style="font-size:12px">${a.w}×${a.h} · ${full.surface} surface</span></div>
      <div><h3 class="anatomy__title">${esc(a.title)}</h3><p class="anatomy__desc mt-s">${esc(h.card(a).summary)}</p></div>
      <div class="palette-bar collapsed">${pal.map((p) => `<div style="--c:${p.hex};--pct:${p.pct};--ink:${ink(p.hex)}" data-hex="${p.hex}" data-copy="${p.hex}" title="${p.hex} · ${p.pct}%"></div>`).join('')}</div>
      <div class="palette-rows">${pal.map((p, i) => `<div class="palette-row" style="--c:${p.hex};--pct:${Math.max(2, p.pct)};--i:${i}"><i></i><span>${p.hex}</span><div class="bar"><span></span></div><em>${p.pct}%</em></div>`).join('')}</div>
      ${r ? `<div class="roles">${['background', 'surface', 'text', 'accent'].filter((k) => r.roles[k]).map((k) => `<div class="role" data-copy="${r.roles[k]}" style="cursor:copy"><i style="--c:${r.roles[k]}"></i><div><b>${k}</b><code>${r.roles[k]}</code></div></div>`).join('')}</div>
      <div class="row">${pill('Text', cx.text_on_background)}${pill('On accent', cx.on_accent_on_accent)}</div>` : ''}
      <div class="anatomy__switch">${picks.map((p) => `<button type="button" aria-pressed="${p === a}" data-id="${p.id}" aria-label="${esc(p.title)}"><img src="${thumb(p)}" alt=""></button>`).join('')}</div>`;
    requestAnimationFrame(() => requestAnimationFrame(() => $('.palette-bar', anat)?.classList.remove('collapsed')));
  };
  anat.addEventListener('click', (e) => { const b = e.target.closest('[data-id]'); if (b) showAsset(h.get(b.dataset.id)); });
  bindCopy(anat);
  anat.addEventListener('reveal', () => showAsset(picks[0]), { once: true });

  /* ------------------------------------------------------ agent session -- */
  const term = $('#termBody', root), grid = $('#stageGrid', root), stagePal = $('#stagePal', root);
  let session = 0, alive = true;
  const line = (html, cls = '') => { const d = document.createElement('div'); d.className = `term__line ${cls}`; d.innerHTML = html; term.append(d); while (term.scrollHeight > term.clientHeight + 4 && term.children.length > 1) term.firstChild.remove(); return d; };
  const type = (el, text, done) => {
    let i = 0;
    const step = () => { if (!alive) return; el.innerHTML = esc(text.slice(0, i)) + '<span class="caret"></span>'; if (i++ < text.length) later(step, 18 + Math.random() * 30); else { el.innerHTML = esc(text); done(); } };
    step();
  };
  const run = () => {
    if (!alive) return;
    const s = SESSIONS[session++ % SESSIONS.length];
    const tool = TOOLS.find((x) => x.name === s.tool);
    const out = tool.run(h, s.args);
    const data = out.data;
    const refs = (data.references || data.results || []).slice(0, 6);
    const pals = data.palettes?.[0]?.roles;
    term.innerHTML = '';
    grid.innerHTML = ''; stagePal.classList.remove('in'); stagePal.innerHTML = '';
    $('#stageLabel', root).textContent = 'Waiting for a tool call';
    $('#stageTool', root).textContent = '—';
    const u = line('', 'u');
    type(u, s.ask, () => {
      later(() => line(`<span class="dim">⏺</span> <span class="tool">uihall · ${s.tool}</span><span class="dim">(${esc(Object.entries(s.args).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(', '))})</span>`), 400);
      later(() => {
        $('#stageLabel', root).textContent = s.tool === 'design_brief' ? 'Brief · references' : 'Results';
        $('#stageTool', root).textContent = s.tool;
        const summary = s.tool === 'design_brief'
          ? `${data.references.length} references · ${data.patterns.length} patterns · ${data.palettes.length} measured palettes`
          : `${data.results.length} matches`;
        line(`<span class="ok">  ⎿ ${summary}</span>`);
        refs.forEach((r, i) => later(() => {
          const a = h.get(r.id);
          const el = document.createElement('div');
          el.className = 'stage__item';
          el.innerHTML = `<img src="${thumb(a)}" alt="${esc(a.title)}"><span>${a.id}</span>`;
          el.onclick = () => { location.hash = `#/a/${a.id}`; };
          el.style.cursor = 'pointer';
          grid.append(el);
          requestAnimationFrame(() => el.classList.add('in'));
          if (i < 3) line(`<span class="dim">    ${a.id}</span> ${esc(a.title)}`);
        }, 140 * i));
      }, 1300);
      later(() => {
        const colours = pals ? [pals.background, pals.surface, pals.text, pals.accent, pals.on_accent].filter(Boolean) : (refs[0]?.palette || []).slice(0, 5);
        stagePal.innerHTML = colours.map((c, i) => `<i style="--c:${c};--i:${i}" title="${c}"></i>`).join('');
        requestAnimationFrame(() => stagePal.classList.add('in'));
        if (data.patterns?.length) line(`<span class="dim">  patterns</span> <span class="acc">${esc(data.patterns.slice(0, 2).map((p) => p.name).join(' · '))}</span>`);
        line(`<span class="dim">  palette </span> <span class="swatches">${colours.map((c) => `<i style="--c:${c}"></i>`).join('')}</span> ${pals && contrast(pals.text, pals.background) ? `<span class="dim">text ${contrast(pals.text, pals.background)}:1</span>` : ''}`);
      }, 2400);
      later(() => line('<span class="dim">⏺</span> Building with structure from the top 3 references.'), 3400);
      later(() => {
        const ids = refs.slice(0, 3).map((r) => r.id).join(', ');
        const file = s.tool === 'design_brief' ? 'src/screens/' + s.args.screen.split(' ')[0].replace(/^./, (c) => c.toUpperCase()) + '.tsx' : 'src/theme/tokens.css';
        line(`<span class="ok">  ✎ ${esc(file)}</span>`);
        line(`<span class="dim">    // references: ${esc(ids)}</span>`);
        if (pals) {
          for (const [k, v] of [['background', pals.background], ['text', pals.text], ['accent', pals.accent]].filter((x) => x[1])) {
            line(`<span class="dim">    --${k}:</span> <span class="swatches"><i style="--c:${v}"></i></span> <span class="acc">${v}</span>`);
          }
        }
        line(`<span class="ok">  ✓ contrast checked · empty, loading and error states drafted</span>`);
      }, 4300);
      later(run, 9200);
    });
  };
  $('#agent', root).addEventListener('reveal', () => later(run, 300), { once: true });
  $('#stage', root).addEventListener('reveal', () => {});

  bindInstall(root);
  bindCopy(root);
  reveal(root);

  return {
    cleanup() { alive = false; timers.forEach(clearTimeout); clearInterval(autoStep); stepIO.disconnect(); removeEventListener('pointermove', onMove); removeEventListener('scroll', onScroll); removeEventListener('keydown', onKeyShelf); },
  };
}
