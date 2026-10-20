/**
 * MCP tool surface for UI Hall. Every tool answers a design question.
 *
 * Each handler returns { text, data, images? }:
 *   text   compact markdown the model reads (cheap on context)
 *   data   the full structured result (MCP structuredContent)
 *   images optional [{ id, which }] the server turns into image content blocks
 */

import { contrast, wcag, fitContrast, normHex, hueFamily, HUE_FAMILIES } from './color.js';

const str = (description, extra = {}) => ({ type: 'string', description, ...extra });
const arr = (description, items = { type: 'string' }) => ({ type: 'array', items, description });
const int = (description, min, max, def) => ({ type: 'integer', minimum: min, maximum: max, default: def, description });
const RO = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };

const SURFACE = { type: 'string', enum: ['dark', 'light', 'mid'], description: 'Dominant surface lightness, measured from the palette.' };
const FILTERS = {
  kind: { type: 'string', enum: ['all', 'image', 'video'], description: 'Media kind.' },
  category: arr('Category ids, e.g. mobile-app-ui, website, dashboard, motion-demo, design-system, before-after.'),
  role: arr('Screen roles (any of), e.g. onboarding, auth, dashboard, checkout, pricing, settings, empty-state, chat.'),
  style: arr('Visual styles (all of), e.g. dark-mode, minimal, editorial, glassmorphism, playful, bold-typography.'),
  tag: arr('Tags (all of), e.g. bottom-nav, chips, serif, kpi, 3d, sheet. See corpus_overview for the vocabulary.'),
  surface: SURFACE,
  hue: { type: 'string', enum: HUE_FAMILIES, description: 'Only assets using this colour family as a real accent.' },
  has_motion: { type: 'boolean', description: 'Only assets that ship a playable motion clip.' },
};

/* ------------------------------------------------------------ renderers -- */

const pal = (p) => (p || []).slice(0, 5).join(' ');
function line(h, a, extra = '') {
  const c = h.card(a);
  return `- **${c.id}** · ${c.title} — _${c.category}/${c.type}${c.motion ? ', motion' : ''}, ${c.surface}_${extra}\n  ${c.summary}\n  palette ${pal(c.palette)}${c.accent ? ` · accent ${c.accent}` : ''} · ${c.url}`;
}
function rolesMd(r, cx) {
  return `bg ${r.background} · surface ${r.surface} · text ${r.text} (${cx.text_on_background.ratio}:1 ${cx.text_on_background.verdict})`
    + (r.accent ? ` · accent ${r.accent} / on-accent ${r.on_accent} (${cx.on_accent_on_accent.ratio}:1)` : '');
}

/* ---------------------------------------------------------------- tools -- */

export const TOOLS = [
  {
    name: 'search_designs',
    title: 'Search designs',
    description: 'Search 755 curated, hand-described UI/UX references (mobile screens, web pages, dashboards, motion clips, design systems). '
      + 'Ranked full-text search with synonyms ("fintech" also finds wallet, banking…) plus facet filters. '
      + 'Use this first whenever you design, build or critique an interface, so decisions come from real examples instead of the generic average. '
      + 'Set include_images to actually see the top results.',
    inputSchema: {
      type: 'object',
      properties: {
        query: str('What you are looking for, in plain words: "dark crypto wallet home", "pricing page with toggle", "onboarding with illustration".'),
        ...FILTERS,
        limit: int('Max results.', 1, 40, 8),
        offset: int('Skip this many results (paging).', 0, 1000, 0),
        include_images: { type: 'boolean', default: false, description: 'Attach thumbnails of the top results (max 6) so you can see them.' },
      },
    },
    annotations: { title: 'Search designs', ...RO },
    run(h, a) {
      const { total, results } = h.search({ ...a, limit: a.limit ?? 8, offset: a.offset ?? 0 });
      const text = total
        ? `**${total}** matches${a.query ? ` for “${a.query}”` : ''}. Showing ${results.length}:\n\n${results.map((r) => line(h, r.asset, ` · score ${r.score}`)).join('\n')}\n\nNext: get_design(id) for the full write-up, view_design(ids) to see them, find_similar(id) to branch out.`
        : `No matches${a.query ? ` for “${a.query}”` : ''}. Loosen the filters or try broader words; corpus_overview lists the vocabulary.`;
      return {
        text,
        data: { total, results: results.map((r) => h.card(r.asset, { score: r.score, matched: r.matched })) },
        images: a.include_images ? results.slice(0, 6).map((r) => ({ id: r.asset.id, which: 'thumb' })) : [],
      };
    },
  },
  {
    name: 'get_design',
    title: 'Get design',
    description: 'Full record for one reference: the hand-written description, facets, the measured palette with area percentages, '
      + 'colour roles (background/surface/text/accent) with WCAG contrast, printed palette names if any, and image/clip URLs.',
    inputSchema: { type: 'object', required: ['id'], properties: { id: str('Asset id, e.g. IMG-0468 or VID-0221.') } },
    annotations: { title: 'Get design', ...RO },
    run(h, { id }) {
      const a = h.get(id);
      if (!a) throw new Error(`Unknown id ${id}. Ids look like IMG-0468 or VID-0221; get them from search_designs.`);
      const f = h.full(a);
      const cr = f.colour_roles;
      const text = [
        `# ${a.title} (${a.id})`,
        `${a.kind} · ${a.category} / ${a.type}${a.roles?.length ? ` · roles: ${a.roles.join(', ')}` : ''} · style: ${(a.style || []).join(', ')}`,
        `tags: ${(a.tags || []).join(', ')}`,
        '', a.description, '',
        `**Measured palette** (k-means over pixels): ${(a.palette_detail || []).map((p) => `${p.hex} ${p.pct}%`).join(' · ')}`,
        cr ? `**Colour roles**: ${rolesMd(cr.roles, cr.contrast)}${cr.fixes ? `\n${cr.fixes.note} → ${cr.fixes.accent_for_text_and_icons}` : ''}` : '',
        f.printed_palette ? `**Printed swatches**: ${f.printed_palette.map((s) => `${s.name} ${s.hex}`).join(' · ')}` : '',
        `size ${a.w}×${a.h}${a.clip ? ` · motion clip ${a.clip_meta?.duration_s ?? a.duration_s}s` : ''}${a.crop_of ? ` · crop of ${a.crop_of}` : ''} · quality: ${a.quality || 'n/a'}`,
        `page ${f.url} · image ${f.image}${f.clip ? ` · clip ${f.clip}` : ''}`,
      ].filter(Boolean).join('\n');
      return { text, data: f };
    },
  },
  {
    name: 'view_design',
    title: 'View design',
    description: 'Look at references. Returns the actual images (up to 4 ids) so you can judge proportion, rhythm and polish — '
      + 'the things a description cannot carry. For videos you get the poster plus a 6-frame strip across the clip.',
    inputSchema: {
      type: 'object', required: ['ids'],
      properties: {
        ids: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 4, description: 'Asset ids to view.' },
        size: { type: 'string', enum: ['thumb', 'full'], default: 'full', description: 'thumb ≈ 480px (cheap), full ≈ up to 1600px.' },
      },
    },
    annotations: { title: 'View design', ...RO },
    run(h, { ids, size = 'full' }) {
      const list = (Array.isArray(ids) ? ids : [ids]).slice(0, 4).map((id) => h.get(id)).filter(Boolean);
      if (!list.length) throw new Error('None of those ids exist.');
      const images = [];
      for (const a of list) {
        images.push({ id: a.id, which: size === 'thumb' ? 'thumb' : 'src' });
        if (a.strip) images.push({ id: a.id, which: 'strip' });
      }
      return {
        text: list.map((a) => `**${a.id}** · ${a.title}${a.strip ? ' (poster + 6-frame strip)' : ''}`).join('\n'),
        data: { assets: list.map((a) => h.card(a)) },
        images,
      };
    },
  },
  {
    name: 'find_similar',
    title: 'Find similar',
    description: 'Branch out from one reference: assets close in content (tags, roles, style, category) and in measured colour. '
      + 'Use by="palette" for colour-only neighbours, by="content" for structure-only.',
    inputSchema: {
      type: 'object', required: ['id'],
      properties: { id: str('Asset id.'), by: { type: 'string', enum: ['all', 'content', 'palette'], default: 'all' }, limit: int('Max results.', 1, 24, 8) },
    },
    annotations: { title: 'Find similar', ...RO },
    run(h, { id, by = 'all', limit = 8 }) {
      const a = h.get(id);
      if (!a) throw new Error(`Unknown id ${id}.`);
      const res = h.similar(id, { by, limit });
      return {
        text: `Closest to **${a.id}** · ${a.title} (by ${by}):\n\n${res.map((r) => line(h, r.asset, ` · similarity ${r.score}`)).join('\n')}`,
        data: { of: a.id, by, results: res.map((r) => h.card(r.asset, { similarity: r.score })) },
      };
    },
  },
  {
    name: 'design_brief',
    title: 'Design brief',
    description: 'One call to start any screen: the best references, motion references, the structural patterns that apply (with build rules), '
      + 'three real measured palettes split into UI roles with contrast checks, role-specific do/avoid guidance and a done-checklist.',
    inputSchema: {
      type: 'object', required: ['screen'],
      properties: {
        screen: str('What you are designing: "onboarding for a sleep-tracking app", "pricing page for a dev tool", "crypto wallet home".'),
        platform: { type: 'string', enum: ['ios', 'android', 'mobile', 'web'], description: 'Target platform.' },
        mood: str('Tone: "calm", "premium", "playful", "high-energy", "editorial".'),
        surface: SURFACE,
        limit: int('Number of references.', 3, 12, 6),
      },
    },
    annotations: { title: 'Design brief', ...RO },
    run(h, a) {
      const b = h.brief(a);
      const md = [
        `# Brief: ${b.screen}`, `platform ${b.platform || 'any'} · mood ${b.mood || 'unspecified'} · surface ${b.surface}`, '',
        '## References', ...b.references.map((r) => line(h, r.asset)),
        b.motion_references.length ? '\n## Motion references' : '', ...b.motion_references.map((r) => line(h, r.asset)),
        '\n## Patterns that apply', ...b.patterns.map((p) => `- **${p.name}** (${p.evidence_count} examples, e.g. ${p.examples.map((e) => e.id).join(', ')}) — ${p.why}\n  Build: ${p.build.join(' ')}`),
        '\n## Palettes (measured from real references)', ...b.palettes.map((p) => `- from ${p.source.id}: ${rolesMd(p.roles, p.contrast)}${p.fixes ? ` · accent-as-text → ${p.fixes.accent_for_text_and_icons}` : ''}`),
        b.guidance.length ? '\n## Guidance' : '', ...b.guidance.map((g) => `**${g.role}** — do: ${g.do.join(' ')} Avoid: ${g.avoid.join(' ')}`),
        '\n## Done when', ...b.checklist.map((c) => `- [ ] ${c}`),
        '\nNext: view_design on the 2–3 closest references before writing code.',
      ].filter((x) => x !== '').join('\n');
      return {
        text: md,
        data: {
          ...b,
          references: b.references.map((r) => h.card(r.asset, { score: r.score })),
          motion_references: b.motion_references.map((r) => h.card(r.asset)),
          patterns: b.patterns.map((p) => ({ ...p, examples: p.examples.map((e) => e.id) })),
          palettes: b.palettes.map((p) => ({ ...p, source: p.source.id })),
        },
      };
    },
  },
  {
    name: 'find_patterns',
    title: 'Find patterns',
    description: 'The pattern library: recurring structural moves found across the corpus (hero number, chip row, bottom sheet, bento, '
      + 'dark + single accent …), each with why it works, concrete build rules and evidence. Pass a topic to rank by relevance.',
    inputSchema: { type: 'object', properties: { about: str('Optional topic: "fintech dashboard", "onboarding", "pricing".'), limit: int('Max patterns.', 1, 30, 8) } },
    annotations: { title: 'Find patterns', ...RO },
    run(h, { about = '', limit = 8 }) {
      const ps = h.patterns(about).slice(0, limit);
      return {
        text: ps.map((p) => `### ${p.name}\n${p.why}\n${p.build.map((b) => `- ${b}`).join('\n')}\nEvidence (${p.evidence_count}): ${p.examples.map((e) => `${e.id} ${e.title}`).join(' · ')}`).join('\n\n'),
        data: { about: about || null, patterns: ps.map((p) => ({ ...p, examples: p.examples.map((e) => h.card(e)) })) },
      };
    },
  },
  {
    name: 'palette_for',
    title: 'Palette for',
    description: 'Real palettes for a mood or product, taken from the closest references (measured from pixels, not invented). '
      + 'Each comes split into background / surface / text / muted / accent / on-accent with WCAG contrast and fixes where needed.',
    inputSchema: {
      type: 'object',
      properties: {
        mood: str('Feeling: "warm and quiet", "loud and synthetic", "trustworthy", "premium".'),
        query: str('Product or screen context: "meditation app", "crypto exchange".'),
        surface: SURFACE, category: arr('Restrict to categories.'), count: int('How many palettes.', 1, 8, 4),
      },
    },
    annotations: { title: 'Palette for', ...RO },
    run(h, a) {
      const r = h.paletteFor(a);
      return {
        text: `Palettes for “${r.query || 'anything'}” from ${r.evidence_size} references. Common accent families: ${r.common_accent_families.map((f) => `${f.family} (${f.assets})`).join(', ') || 'n/a'}\n\n`
          + r.palettes.map((p, i) => `${i + 1}. from **${p.source.id}** ${p.source.title}\n   ${rolesMd(p.roles, p.contrast)}${p.fixes ? `\n   accent as text → ${p.fixes.accent_for_text_and_icons}` : ''}`).join('\n')
          + '\n\nexport_tokens(id) turns any of these into CSS / Tailwind / SwiftUI / Compose tokens.',
        data: { ...r, palettes: r.palettes.map((p) => ({ ...p, source: h.card(p.source) })) },
      };
    },
  },
  {
    name: 'search_by_color',
    title: 'Search by colour',
    description: 'Find references that actually use a colour (perceptual OKLab distance over measured swatches). '
      + 'Answers "show me real interfaces built on this lime / this navy" and how much area it takes.',
    inputSchema: {
      type: 'object', required: ['hex'],
      properties: {
        hex: str('Colour, e.g. #C1FE1A.'),
        tolerance: { type: 'number', minimum: 0.01, maximum: 0.3, default: 0.09, description: 'OKLab distance. 0.03 ≈ same colour, 0.1 ≈ clearly related.' },
        limit: int('Max results.', 1, 40, 10),
      },
    },
    annotations: { title: 'Search by colour', ...RO },
    run(h, { hex, tolerance = 0.09, limit = 10 }) {
      const r = h.byColor(hex, { tolerance, limit });
      return {
        text: r.length
          ? `${r.length} references use ${normHex(hex)} (${hueFamily(hex)}):\n\n${r.map((x) => line(h, x.asset, ` · ${x.match} covers ${x.area_pct}% (Δ${x.distance})`)).join('\n')}`
          : `Nothing within ${tolerance} of ${normHex(hex)}. Raise tolerance to ~0.15.`,
        data: { hex: normHex(hex), family: hueFamily(hex), results: r.map((x) => h.card(x.asset, { match: x.match, distance: x.distance, area_pct: x.area_pct })) },
      };
    },
  },
  {
    name: 'export_tokens',
    title: 'Export design tokens',
    description: 'Turn a reference\'s measured palette (or your own hex list) into ready-to-paste tokens: semantic colours, an 11-step accent ramp, '
      + 'a neutral ramp, radius and spacing — as CSS variables, Tailwind config, W3C design-tokens JSON, SwiftUI or Jetpack Compose.',
    inputSchema: {
      type: 'object',
      properties: {
        id: str('Asset id to take the palette from.'),
        colors: arr('Or explicit hex colours, most-used first.'),
        format: { type: 'string', enum: ['css', 'tailwind', 'dtcg', 'swiftui', 'compose'], default: 'css' },
        prefix: str('Variable prefix.', { default: 'uh' }),
      },
    },
    annotations: { title: 'Export design tokens', ...RO },
    run(h, { id, colors, format = 'css', prefix = 'uh' }) {
      const t = h.tokens({ id, colors, format, name: prefix });
      const lang = { css: 'css', tailwind: 'js', dtcg: 'json', json: 'json', swiftui: 'swift', compose: 'kotlin' }[format];
      return { text: `Tokens (${t.scheme} scheme${t.source ? `, from ${t.source}` : ''}):\n\n\`\`\`${lang}\n${t.code}\`\`\``, data: t };
    },
  },
  {
    name: 'compare_designs',
    title: 'Compare designs',
    description: 'Put 2–4 references side by side: shared and distinct roles, styles and tags, each one\'s colour roles with WCAG contrast, '
      + 'and how far apart their palettes are. Use it to choose between directions or to explain why one works better. Set include_images to see them together.',
    inputSchema: {
      type: 'object', required: ['ids'],
      properties: {
        ids: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 4, description: 'Asset ids to compare.' },
        include_images: { type: 'boolean', default: false, description: 'Attach the thumbnails.' },
      },
    },
    annotations: { title: 'Compare designs', ...RO },
    run(h, { ids, include_images = false }) {
      const c = h.compare(Array.isArray(ids) ? ids : [ids]);
      const md = [
        `# Comparing ${c.assets.map((a) => a.id).join(' · ')}`, '',
        ...c.assets.map((a) => line(h, a)), '',
        `**Shared** — roles: ${c.shared.roles.join(', ') || '—'} · style: ${c.shared.style.join(', ') || '—'} · tags: ${c.shared.tags.join(', ') || '—'}`,
        '**Distinct**', ...c.distinct.tags.map((d, i) => `- ${d.id}: ${[...c.distinct.style[i].values, ...d.values].slice(0, 10).join(', ') || '—'}`),
        '**Colour**', ...c.colour.map((x) => `- ${x.id} (${x.surface}): ${x.roles ? rolesMd(x.roles, x.contrast) : 'n/a'}`),
        `**Palette distance** (OKLab, 0 = identical): ${c.palette_distance.map((p) => `${p.a}↔${p.b} ${p.palette_distance}`).join(' · ')}`,
      ].join('\n');
      return {
        text: md,
        data: { ...c, assets: c.assets.map((a) => h.card(a)) },
        images: include_images ? c.assets.map((a) => ({ id: a.id, which: 'thumb' })) : [],
      };
    },
  },
  {
    name: 'generate_design_system',
    title: 'Generate design system',
    description: 'A complete, paste-ready starter design system from a reference (or your own colours): semantic colour + 11-step ramps, '
      + 'a type pairing and modular scale chosen from the reference\'s style, spacing, radius, elevation and motion tokens, '
      + 'plus base CSS for buttons, cards, inputs and chips. Contrast-checked. The fastest way from "I like this one" to code.',
    inputSchema: {
      type: 'object',
      properties: {
        id: str('Asset id to build from.'),
        colors: arr('Or explicit hex colours, most-used first.'),
        mood: str('Optional tone that nudges type and radius: "editorial", "playful", "dense".'),
        prefix: str('CSS variable prefix.', { default: 'uh' }),
      },
    },
    annotations: { title: 'Generate design system', ...RO },
    run(h, { id, colors, mood = '', prefix = 'uh' }) {
      const d = h.designSystem({ id, colors, mood, name: prefix });
      return {
        text: `Design system (${d.scheme}${d.source ? `, from ${d.source}` : ''}) — ${d.type.rationale} Base ${d.type.base}px × ${d.type.ratio}.\n\n\`\`\`css\n${d.css}\`\`\``,
        data: d,
      };
    },
  },
  {
    name: 'check_contrast',
    title: 'Check contrast',
    description: 'WCAG 2.x contrast for a text/background pair, the AA/AAA verdict, and the nearest passing text colour if it fails.',
    inputSchema: {
      type: 'object', required: ['foreground', 'background'],
      properties: { foreground: str('Text colour hex.'), background: str('Background colour hex.'), target: { type: 'number', default: 4.5, description: 'Target ratio (4.5 body, 3 large text, 7 AAA).' } },
    },
    annotations: { title: 'Check contrast', ...RO },
    run(h, { foreground, background, target = 4.5 }) {
      const fg = normHex(foreground), bg = normHex(background);
      if (!fg || !bg) throw new Error('Both colours must be hex values like #1A1A1A.');
      const w = wcag(contrast(fg, bg));
      const fix = w.ratio < target ? fitContrast(fg, bg, target) : null;
      return {
        text: `${fg} on ${bg}: **${w.ratio}:1** — ${w.verdict}.${fix ? ` Nearest passing (${target}:1): ${fix} (${contrast(fix, bg)}:1).` : ''}`,
        data: { foreground: fg, background: bg, ...w, target, suggestion: fix },
      };
    },
  },
  {
    name: 'before_after',
    title: 'Before / after',
    description: 'Redesign evidence: the same screen done weakly and done well, with the write-up of what changed. Best teaching material in the corpus for critiques.',
    inputSchema: { type: 'object', properties: { topic: str('Optional topic: "wallet", "landing page", "settings".'), limit: int('Max results.', 1, 20, 6) } },
    annotations: { title: 'Before / after', ...RO },
    run(h, { topic = '', limit = 6 }) {
      const r = h.beforeAfter({ topic, limit });
      return {
        text: r.length ? r.map((x) => line(h, x.asset)).join('\n') : 'No before/after pairs match; try without a topic.',
        data: { topic: topic || null, results: r.map((x) => h.card(x.asset)) },
      };
    },
  },
  {
    name: 'corpus_overview',
    title: 'Corpus overview',
    description: 'What the corpus contains and the exact vocabulary for filters: categories, types, roles, styles, tags with counts, surfaces, colour families, patterns and provenance.',
    inputSchema: { type: 'object', properties: { tags: { type: 'boolean', default: false, description: 'Include the full tag vocabulary (long).' } } },
    annotations: { title: 'Corpus overview', ...RO },
    run(h, { tags = false }) {
      const f = h.facets(), s = h.stats();
      const fmt = (xs) => xs.map((x) => `${x.id} (${x.count})`).join(', ');
      const text = [
        `# UI Hall corpus v${s.version}: ${s.totals.assets} references — ${s.totals.images} images, ${s.totals.videos} videos (${s.totals.clips} with motion clips)`,
        `**categories**: ${fmt(f.categories)}`, `**types**: ${fmt(f.types)}`, `**roles**: ${fmt(f.roles)}`, `**styles**: ${fmt(f.styles)}`,
        `**surfaces**: ${Object.entries(f.surfaces).map(([k, v]) => `${k} (${v})`).join(', ')}`,
        `**colour families**: ${Object.entries(f.hue_families).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} (${v})`).join(', ')}`,
        `**patterns**: ${s.patterns.map((p) => `${p.name} (${p.evidence})`).join(', ')}`,
        `**tags**: ${tags ? fmt(f.tags) : `${fmt(f.tags.slice(0, 60))} … (${f.tags.length} total; pass tags:true for all)`}`,
        '', ...Object.values(s.provenance).map((p) => `- ${p}`),
      ].join('\n');
      return { text, data: { ...s, facets: tags ? f : { ...f, tags: f.tags.slice(0, 60) } } };
    },
  },
];

/* --------------------------------------------------------------- prompts -- */

export const PROMPTS = [
  {
    name: 'design-screen',
    title: 'Design a screen from evidence',
    description: 'Design and build a screen grounded in real references from UI Hall.',
    arguments: [
      { name: 'screen', description: 'What to design, e.g. "onboarding for a sleep tracker".', required: true },
      { name: 'platform', description: 'ios, android, mobile or web.', required: false },
      { name: 'mood', description: 'Tone, e.g. calm, premium, playful.', required: false },
    ],
    render: ({ screen, platform = '', mood = '' }) => `Design "${screen}"${platform ? ` for ${platform}` : ''}${mood ? `, mood: ${mood}` : ''}.

1. Call design_brief with these inputs.
2. view_design the 2–3 closest references and say, in one line each, what structure you are taking from them (hierarchy, layout, rhythm — not their skin).
3. Pick one palette from the brief (or palette_for) and export_tokens it in the format the codebase uses. Check every text/background pair with check_contrast.
4. Build the screen. Cite the reference ids you used in a comment at the top.
5. Finish with the brief's checklist, ticking each item honestly.`,
  },
  {
    name: 'critique-ui',
    title: 'Critique an interface against references',
    description: 'Critique a screen by comparing it with real references and before/after evidence.',
    arguments: [{ name: 'description', description: 'What the screen is and what it contains (or attach a screenshot).', required: true }],
    render: ({ description }) => `Critique this interface: ${description}

1. search_designs for the same kind of screen and view_design the best 3.
2. before_after for the topic, to see what redesigns typically fix.
3. Report: the 3 changes with the biggest impact first (hierarchy, primary action, density, colour/contrast, type), each tied to a reference id. Then smaller polish notes. Be specific: sizes, colours, spacing values.`,
  },
  {
    name: 'pick-palette',
    title: 'Pick a palette',
    description: 'Choose a production palette from measured references and export tokens.',
    arguments: [
      { name: 'mood', description: 'What it should feel like.', required: true },
      { name: 'format', description: 'css, tailwind, dtcg, swiftui or compose.', required: false },
    ],
    render: ({ mood, format = 'css' }) => `Find a palette that feels "${mood}". Call palette_for, view_design the sources of the two best options, choose one and explain why in two sentences, then export_tokens(id, format="${format}"). Flag any contrast fixes.`,
  },
];
