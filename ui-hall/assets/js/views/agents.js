/* For agents: what the MCP server and skill are, how to install them, and a
   playground that runs the real tool handlers against the corpus in-browser. */

import { $, $$, esc, split, md, jsonHtml, bindCopy, segmented, tint, withCopy, icon } from '../lib.js';
import { TOOLS, PROMPTS } from '../../../../mcp/src/tools.js';
import { footer, installBlock, bindInstall, thumb } from './shared.js';

const EXAMPLES = {
  search_designs: { query: 'dark onboarding with illustration', limit: 6 },
  get_design: { id: 'IMG-0468' },
  view_design: { ids: ['IMG-0468', 'VID-0221'] },
  find_similar: { id: 'IMG-0473', limit: 6 },
  design_brief: { screen: 'checkout for a food delivery app', platform: 'ios', mood: 'warm' },
  find_patterns: { about: 'analytics dashboard', limit: 4 },
  palette_for: { mood: 'calm and trustworthy', query: 'health app', count: 3 },
  search_by_color: { hex: '#3E63DD', limit: 8 },
  export_tokens: { id: 'IMG-0473', format: 'tailwind' },
  check_contrast: { foreground: '#8A8A8A', background: '#FFFFFF' },
  before_after: { topic: 'wallet' },
  corpus_overview: {},
};

export default function agents(root, app, route) {
  const { h } = app;
  const tab0 = route.params.get('tab') || 'mcp';

  root.innerHTML = `
  <div class="container page-head agents-hero">
    <div>
      <span class="eyebrow" data-reveal>uihall-mcp · v2 · MCP 2025-06-18</span>
      <h1 class="display h-lg mt-s" id="at">Give your agent <em>an eye.</em></h1>
    </div>
    <p class="lede" data-reveal style="--d:2">Coding agents design from the statistical average — a blue gradient, a card, a rounded button. UI Hall gives them evidence instead: real references they can search and actually look at, measured palettes, patterns with build rules, and tokens they can paste. One MCP server, one skill.</p>
  </div>
  <div class="container">
    <div class="seg" id="tabs" role="tablist" data-reveal style="--d:3">
      ${[['mcp', 'MCP server'], ['playground', 'Playground'], ['skill', 'Skill']].map(([k, t]) => `<button type="button" data-v="${k}" aria-pressed="${k === tab0}">${t}</button>`).join('')}
    </div>
  </div>
  <div id="tabBody"></div>
  ${footer(h)}`;

  const t = $('#at', root); split(t); requestAnimationFrame(() => t.classList.add('in'));
  const body = $('#tabBody', root);
  bindCopy(root);

  const show = (tab) => {
    history.replaceState(null, '', `#/agents${tab === 'mcp' ? '' : `?tab=${tab}`}`);
    body.innerHTML = tab === 'playground' ? playgroundHtml() : tab === 'skill' ? skillHtml() : mcpHtml(h);
    body.animate?.([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 500, easing: 'cubic-bezier(.16,1,.3,1)' });
    if (tab === 'mcp') bindInstall(body);
    if (tab === 'playground') bindPlayground(body, h, route.params.get('tool'));
    if (tab === 'skill') loadSkill(body);
    for (const el of $$('[data-reveal]', body)) el.classList.add('in');
  };
  segmented($('#tabs', root), show);
  show(tab0);
  return { update(r) { const tb = r.params.get('tab') || 'mcp'; $$('#tabs button', root).find((b) => b.dataset.v === tb)?.click(); } };
}

/* ------------------------------------------------------------------ MCP -- */
function mcpHtml(h) {
  return `
  <section class="container section" style="padding-top:56px">
    <div class="flow">
      <div><b>Brief</b><p><code>design_brief</code> turns “a sleep app onboarding” into references, patterns, palettes and a checklist.</p></div>
      <div><b>Look</b><p><code>view_design</code> returns the actual images — and frame strips for video — so the model sees proportion and polish.</p></div>
      <div><b>Lift</b><p><code>palette_for</code> + <code>export_tokens</code> give measured colour as CSS, Tailwind, SwiftUI or Compose.</p></div>
      <div><b>Check</b><p><code>check_contrast</code> and the checklist keep the result accessible and finished.</p></div>
    </div>
  </section>
  <section class="container section" style="padding-top:72px">
    <div class="section__head"><h2 class="display h-md">Install</h2><p class="lede">Node 18+. The single-file server fetches the corpus from this site on first run and caches it in <code>~/.cache/uihall</code>.</p></div>
    ${installBlock()}
  </section>
  <section class="container section" style="padding-top:72px">
    <div class="section__head"><h2 class="display h-md">Tools</h2><p class="lede">All read-only, all annotated, every result as compact markdown for the model plus <code>structuredContent</code> for code.</p></div>
    <div class="faq">
      ${TOOLS.map((tl) => `<details><summary><span><code style="color:var(--accent)">${tl.name}</code> <span class="faint" style="font-weight:400">— ${esc(tl.title)}</span></span></summary>
        <p>${esc(tl.description)}</p>
        <div style="padding-bottom:18px">${withCopy(`schema-${tl.name}`, jsonHtml(tl.inputSchema))}</div></details>`).join('')}
    </div>
  </section>
  <section class="container section" style="padding-top:72px">
    <div class="section__head"><h2 class="display h-md">Resources <em>&amp;</em> prompts</h2><p class="lede">For clients that browse context or offer slash-commands.</p></div>
    <div class="tools-grid">
      <div class="tool-card"><code>uihall://overview</code><p>Counts, vocabulary and provenance as markdown.</p></div>
      <div class="tool-card"><code>uihall://patterns</code><p>The full pattern library with build rules.</p></div>
      <div class="tool-card"><code>uihall://design/{id}</code><p>One reference’s write-up.</p></div>
      <div class="tool-card"><code>uihall://image/{id}</code><p>The image itself, as a blob.</p></div>
      ${PROMPTS.map((p) => `<div class="tool-card"><code>/${p.name}</code><p>${esc(p.description)}</p></div>`).join('')}
    </div>
  </section>
  <section class="container section" style="padding-top:72px">
    <div class="section__head"><h2 class="display h-md">Questions</h2></div>
    <div class="faq">
      <details><summary>Does it need an API key or a clone of this repo?</summary><p>No. The server is one dependency-free file. On first run it downloads the corpus (~1.3 MB) from this site and caches it; images are fetched on demand when an agent asks to see them. Point <code>UIHALL_ROOT</code> at a local checkout to run fully offline.</p></details>
      <details><summary>Can agents really “see” the designs?</summary><p>Yes — <code>view_design</code> and <code>search_designs(include_images: true)</code> return standard MCP image content. Multimodal models (Claude, GPT-4o-class, Gemini) read them directly. Videos come back as a poster plus a six-frame strip across the clip.</p></details>
      <details><summary>How accurate are the descriptions?</summary><p>Every reference was written up by looking at it, then the whole corpus was re-audited against the pixels in October 2026 — 707 of 766 write-ups were corrected (wrong app names, invented copy, miscounted screens, videos described as stills) and 11 duplicates or empty captures were removed. Palettes and motion scores are computed, not estimated.</p></details>
      <details><summary>Is it safe to copy these designs?</summary><p>Learn the vocabulary — hierarchy, spacing, colour logic — not the skin. The interfaces belong to the people who designed them. The skill and the <code>design-screen</code> prompt explicitly tell agents to take structure, not surface, and to cite reference ids.</p></details>
    </div>
  </section>`;
}

/* ----------------------------------------------------------- playground -- */
function playgroundHtml() {
  return `
  <section class="container section" style="padding-top:40px">
    <div class="playground">
      <div class="pg__side" role="tablist" aria-label="Tools">
        ${TOOLS.map((tl) => `<button class="pg__tool" type="button" role="tab" data-tool="${tl.name}" aria-selected="false"><code>${tl.name}</code><span>${esc(tl.description.split('. ')[0]).slice(0, 92)}</span></button>`).join('')}
      </div>
      <div class="pg__main">
        <form class="pg__form" id="pgForm" autocomplete="off"></form>
        <div class="pg__out" id="pgOut"></div>
      </div>
    </div>
    <p class="faint mt-s" style="font-size:13px">This runs the exact handlers from <code>mcp/src/tools.js</code> against the same corpus, in your browser. What you see is what an agent gets.</p>
  </section>`;
}

function field(name, s, v) {
  const id = `f-${name}`;
  const lab = `${name}${s.description ? ` <span title="${esc(s.description)}" style="opacity:.6">ⓘ</span>` : ''}`;
  if (s.type === 'boolean') return `<label class="check" for="${id}"><input type="checkbox" id="${id}" name="${name}" ${v ? 'checked' : ''}> ${name}</label>`;
  if (s.enum) return `<label for="${id}">${lab}<select class="input" id="${id}" name="${name}"><option value="">—</option>${s.enum.map((e) => `<option ${v === e ? 'selected' : ''}>${e}</option>`).join('')}</select></label>`;
  const val = Array.isArray(v) ? v.join(', ') : v ?? '';
  const wide = ['query', 'screen', 'mood', 'about', 'topic'].includes(name) ? 'wide' : '';
  const type = s.type === 'integer' || s.type === 'number' ? `type="number" step="${s.type === 'integer' ? 1 : 0.01}"` : 'type="text"';
  return `<label class="${wide}" for="${id}">${lab}<input class="input" id="${id}" name="${name}" ${type} value="${esc(val)}" placeholder="${esc(s.type === 'array' ? 'comma, separated' : s.default ?? '')}"></label>`;
}

function bindPlayground(root, h, initial) {
  const form = $('#pgForm', root), out = $('#pgOut', root);
  let tool = TOOLS.find((x) => x.name === initial) || TOOLS[4];
  let view = 'md';

  const readArgs = () => {
    const args = {};
    for (const [k, s] of Object.entries(tool.inputSchema.properties || {})) {
      const el = form.elements[k];
      if (!el) continue;
      if (s.type === 'boolean') { if (el.checked) args[k] = true; continue; }
      const v = el.value.trim();
      if (!v) continue;
      args[k] = s.type === 'array' ? v.split(',').map((x) => x.trim()).filter(Boolean) : s.type === 'integer' ? parseInt(v, 10) : s.type === 'number' ? parseFloat(v) : v;
    }
    return args;
  };

  const exec = () => {
    const args = readArgs();
    const t0 = performance.now();
    let res, err;
    try { res = tool.run(h, args); } catch (e) { err = e.message; }
    const ms = (performance.now() - t0).toFixed(1);
    $('#pgCall', root).textContent = `${tool.name}(${JSON.stringify(args)})`;
    if (err) { out.innerHTML = `<div class="md"><p style="color:#FF6B6B">isError: ${esc(err)}</p></div>`; return; }
    const imgs = (res.images || []).map((im) => {
      const a = h.get(im.id);
      const src = im.which === 'thumb' ? a.thumb : im.which === 'strip' ? a.strip?.src : a.src;
      return `<a href="#/a/${a.id}" style="${im.which === 'strip' ? 'grid-column:1/-1;aspect-ratio:6/1' : ''}"><img src="${src}" alt="${esc(a.title)}" ${im.which === 'strip' ? 'style="object-fit:contain;background:#111"' : ''}></a>`;
    }).join('');
    out.innerHTML = `
      <div class="pg__tabs"><div class="seg" id="pgView">${[['md', 'What the model reads'], ['json', 'structuredContent']].map(([k, l]) => `<button type="button" data-v="${k}" aria-pressed="${view === k}">${l}</button>`).join('')}</div>
        <span class="meta">${ms} ms · ${(JSON.stringify(res.data).length / 1024).toFixed(1)} KB${res.images?.length ? ` · ${res.images.length} image${res.images.length > 1 ? 's' : ''}` : ''}</span></div>
      ${imgs ? `<div class="pg__imgs">${imgs}</div>` : ''}
      <div id="pgBody"></div>`;
    const draw = () => { $('#pgBody', out).innerHTML = view === 'md' ? `<div class="md">${md(res.text)}</div>` : `<pre class="json">${jsonHtml(res.data)}</pre>`; };
    segmented($('#pgView', out), (v) => { view = v; draw(); });
    draw();
  };

  const select = (name) => {
    tool = TOOLS.find((x) => x.name === name);
    for (const b of $$('.pg__tool', root)) b.setAttribute('aria-selected', String(b.dataset.tool === name));
    const ex = EXAMPLES[name] || {};
    form.innerHTML = Object.entries(tool.inputSchema.properties || {}).map(([k, s]) => field(k, s, ex[k])).join('')
      + `<div class="pg__run"><button class="btn btn--primary btn--sm" type="submit">${icon.play.replace('<svg', '<svg style="fill:currentColor;stroke:none"')} Run</button><code class="pg__call" id="pgCall"></code></div>`;
    history.replaceState(null, '', `#/agents?tab=playground&tool=${name}`);
    exec();
  };
  form.addEventListener('submit', (e) => { e.preventDefault(); exec(); });
  form.addEventListener('change', exec);
  root.querySelector('.pg__side').addEventListener('click', (e) => { const b = e.target.closest('[data-tool]'); if (b) select(b.dataset.tool); });
  select(tool.name);
}

/* ---------------------------------------------------------------- skill -- */
function skillHtml() {
  return `
  <section class="container section" style="padding-top:56px">
    <div class="section__head">
      <h2 class="display h-md">The <em>uihall</em> skill</h2>
      <p class="lede">The MCP gives an agent the tools; the skill tells it when and how to use them — a workflow that starts every UI task from evidence and ends with a checklist. Works with or without the MCP server.</p>
    </div>
    <div class="skill-file">
      <div class="card install__panel">
        <p>Claude Code — personal skill:</p>
        ${withCopy('sk1', tint(`mkdir -p ~/.claude/skills && curl -fsSL https://nikithamal.github.io/UiHall/skills/uihall.tar.gz | tar -xz -C ~/.claude/skills`))}
        <p>Project skill (commit it with your repo):</p>
        ${withCopy('sk2', tint(`mkdir -p .claude/skills && curl -fsSL https://nikithamal.github.io/UiHall/skills/uihall.tar.gz | tar -xz -C .claude/skills`))}
        <p>Any agent that reads <code>SKILL.md</code> (Cursor, Codex, Copilot, Gemini CLI …): download the folder and place it where your agent loads skills or rules from.</p>
        <div class="row"><a class="btn btn--sm" href="../skills/uihall.tar.gz" download>${icon.ext} Download uihall.tar.gz</a><a class="btn btn--sm btn--ghost" href="https://github.com/NikitHamal/UiHall/tree/main/skills/uihall">View on GitHub</a></div>
      </div>
      <div class="card doc"><div class="md" id="skillMd"><p class="faint">Loading SKILL.md…</p></div></div>
    </div>
  </section>`;
}

async function loadSkill(root) {
  try {
    const r = await fetch('../skills/uihall/SKILL.md');
    const text = (await r.text()).replace(/^---[\s\S]*?---\n/, '');
    $('#skillMd', root).innerHTML = md(text);
  } catch { $('#skillMd', root).innerHTML = '<p>Could not load SKILL.md.</p>'; }
}
