import { $, $$, esc, split, countUp, reveal, bindCopy, ink, reduced, isTouch } from '../lib.js';
import { TOOLS } from '../../../../mcp/src/tools.js';
import { contrast } from '../../../../mcp/src/color.js';
import { footer, installBlock, bindInstall, thumb, arrowBtn } from './shared.js';
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

  root.innerHTML = `
  <section class="hero">
    <div class="wall" aria-hidden="true"></div>
    <div class="container hero__inner">
      <span class="eyebrow" data-reveal>A design reference corpus · MCP server · agent skill</span>
      <h1 class="display h-xl hero__title" id="heroTitle">Stop designing from <em>the average.</em></h1>
      <div class="hero__row">
        <p class="lede" data-reveal style="--d:3">${t.assets} real interfaces, each one looked at and written up by hand, every colour measured from the pixels. Browse the hall — or plug it into Claude Code, Cursor and any MCP agent so it designs from evidence instead of habit.</p>
        <div class="hero__cta" data-reveal style="--d:4">
          ${arrowBtn('#/library', 'Explore the library', true)}
          <a class="btn" href="#/agents">Connect your agent</a>
        </div>
      </div>
      <div class="hero__stats" data-reveal style="--d:5">
        <div class="stat"><b class="num" data-count="${t.assets}">0</b><span>references</span></div>
        <div class="stat"><b class="num" data-count="${t.clips}">0</b><span>motion clips</span></div>
        <div class="stat"><b class="num" data-count="${h.patterns().length}">0</b><span>patterns with evidence</span></div>
        <div class="stat"><b class="num" data-count="${h.assets.reduce((s, a) => s + (a.palette_detail?.length || 0), 0)}">0</b><span>colours measured</span></div>
        <div class="stat"><b class="num" data-count="${TOOLS.length}">0</b><span>agent tools</span></div>
      </div>
    </div>
    <div class="scroll-cue"><i></i>Scroll</div>
  </section>

  <section class="container section">
    <div class="claims" data-reveal>
      <div><span class="k">Observed</span><b>Read by eye, not guessed.</b><p>Every reference was opened and described: what it is, what it says, how it’s built, and the one idea worth stealing. In October 2026 all ${t.assets} were re-audited against the pixels.</p></div>
      <div><span class="k">Measured</span><b>Colour from pixels, not vibes.</b><p>Palettes are k-means over the real image with area percentages, split into background, surface, text and accent — and checked for WCAG contrast.</p></div>
      <div><span class="k">Agent-ready</span><b>Built to be called.</b><p>A zero-dependency MCP server and a skill turn the hall into tools an agent uses mid-task: briefs, references, patterns, palettes and tokens.</p></div>
    </div>
  </section>

  <section class="container section" id="anatomy">
    <div class="section__head">
      <h2 class="display h-lg" data-reveal>Every pixel, <em>measured.</em></h2>
      <p class="lede" data-reveal style="--d:1">Pick a reference. Its palette is what the image is actually made of — ranked by area, assigned to UI roles and contrast-checked. This runs the same engine the MCP server does, right here in your browser.</p>
    </div>
    <div class="anatomy" data-reveal style="--d:2">
      <div class="anatomy__media"><img alt=""><div class="scan"></div></div>
      <div class="anatomy__panel card"></div>
    </div>
  </section>

  <section class="container section" id="agent" data-io>
    <div class="section__head">
      <h2 class="display h-lg" data-reveal>Your agent, <em>with taste.</em></h2>
      <p class="lede" data-reveal style="--d:1">Ask for a screen and the agent pulls a brief from UI Hall before it writes a line: the closest real references, the patterns that apply, measured palettes and a checklist. Everything on the right is live output.</p>
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

  <section class="container section" id="install">
    <div class="section__head">
      <h2 class="display h-lg" data-reveal>Thirty seconds <em>to install.</em></h2>
      <p class="lede" data-reveal style="--d:1">One file, zero dependencies, no API key. Works with Claude Code, Cursor, VS Code, Codex, Claude Desktop — anything that speaks MCP.</p>
    </div>
    <div data-reveal style="--d:2">${installBlock()}</div>
    <div class="row mt-m" data-reveal style="--d:3">${arrowBtn('../demo/sleep/', 'See a screen built with the skill')}<a class="btn btn--ghost" href="#/agents?tab=playground">Try the tools in your browser</a></div>
  </section>

  <section class="container section">
    <div class="section__head">
      <h2 class="display h-lg" data-reveal>${TOOLS.length} tools, <em>one job:</em> better UI.</h2>
      <p class="lede" data-reveal style="--d:1">Each tool answers a design question, not a database one. Try any of them in the <a href="#/agents?tab=playground" style="color:var(--accent)">playground</a>.</p>
    </div>
    <div class="tools-grid">
      ${TOOLS.map((tl, i) => `<a class="tool-card" href="#/agents?tab=playground&tool=${tl.name}" data-reveal style="--d:${i % 4}"><code>${tl.name}</code><p>${esc(BLURB[tl.name])}</p></a>`).join('')}
    </div>
  </section>

  <section class="container section">
    <div class="section__head">
      <h2 class="display h-lg" data-reveal>Walk <em>the hall.</em></h2>
      <p class="lede" data-reveal style="--d:1">Mobile screens, websites, dashboards, motion studies, design systems and redesigns — filtered by what a screen is for, how it looks and what it’s made of.</p>
    </div>
    <div class="bento">
      ${h.corpus.categories.filter((c) => c.count >= 10).slice(0, 8).map((c, i) => {
        const pick = h.search({ category: c.id, kind: 'image', limit: 30 }).results.map((r) => r.asset).find((a) => (a.w / a.h) > 0.7) || h.search({ category: c.id, limit: 1 }).results[0]?.asset;
        return `<a href="#/library?category=${c.id}" data-reveal style="--d:${i % 4}"><img src="${pick ? thumb(pick) : ''}" alt="" loading="lazy"><b>${esc(c.label)}</b><span>${c.count} references</span></a>`;
      }).join('')}
    </div>
  </section>

  <section class="section">
    <div class="container section__head">
      <h2 class="display h-lg" data-reveal>Patterns, <em>with receipts.</em></h2>
      <p class="lede" data-reveal style="--d:1">Recurring structural moves found across the corpus, each with build rules and the references that prove it. No evidence, no pattern.</p>
    </div>
    <div class="marquee" data-reveal><div class="marquee__track">
      ${(() => { const items = h.patterns().map((p) => `<a class="chip" style="height:44px;padding:0 18px;font-size:15px" href="#/patterns#${p.slug}">${esc(p.name)} <span class="n">${p.evidence_count}</span></a>`).join(''); return items + items; })()}
    </div></div>
    <div class="container mt-l" data-reveal>${arrowBtn('#/patterns', 'Read the pattern library')}</div>
  </section>

  ${footer(h)}`;

  /* hero headline + counters */
  const title = $('#heroTitle', root);
  split(title);
  requestAnimationFrame(() => title.classList.add('in'));
  $('.hero__stats', root).addEventListener('reveal', () => $$('[data-count]', root).forEach((el, i) => setTimeout(() => countUp(el, +el.dataset.count), i * 90)), { once: true });

  /* ---------------------------------------------------------- the wall -- */
  const wall = $('.wall', root);
  const cols = innerWidth < 640 ? 3 : innerWidth < 1000 ? 5 : 7;
  wall.style.setProperty('--cols', cols);
  const pool = h.assets.filter((a) => a.thumb && !a.crop_of && a.w / a.h > 0.45 && a.w / a.h < 1.9 && a.category !== 'color-palette');
  const seeded = pool.map((a, i) => [((i * 2654435761) >>> 0) % 997, a]).sort((x, y) => x[0] - y[0]).map((x) => x[1]);
  const per = 9;
  let colsHtml = '';
  for (let c = 0; c < cols; c++) {
    const items = seeded.slice(c * per, c * per + per);
    const cell = items.map((a) => `<img src="${thumb(a)}" alt="" loading="${c < 3 ? 'eager' : 'lazy'}" decoding="async" style="--ar:${(a.w / a.h).toFixed(3)}">`).join('');
    colsHtml += `<div class="wall__col" style="--dur:${80 + (c % 3) * 22}s">${cell}${cell}</div>`;
  }
  wall.innerHTML = colsHtml;
  const onMove = (e) => {
    const x = (e.clientX / innerWidth - 0.5) * -30, y = (e.clientY / innerHeight - 0.5) * -20;
    wall.style.setProperty('--px', `${x}px`); wall.style.setProperty('--py', `${y}px`);
  };
  if (!isTouch() && !reduced()) addEventListener('pointermove', onMove, { passive: true });

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
    cleanup() { alive = false; timers.forEach(clearTimeout); removeEventListener('pointermove', onMove); },
  };
}
