/**
 * stormy-mcp — tool implementations.
 *
 * Design rule for this file: every tool answers a *design* question, not a
 * database question. "find_assets_matching_tag" would be a database question.
 * "what_pattern_fits_this_screen" is a design question. The corpus has enough
 * hand-written metadata to support the latter, so that is what is exposed.
 */

import fs from 'node:fs';
import path from 'node:path';

/* ------------------------------------------------------------- helpers --- */

const lc = (s) => String(s ?? '').toLowerCase();

function haystack(a) {
  if (a.__hay) return a.__hay;
  a.__hay = [
    a.id, a.title, a.description, a.category, a.type,
    ...(a.tags || []), ...(a.style || []), ...(a.roles || []),
  ].join(' ').toLowerCase();
  return a.__hay;
}

function score(a, terms, weights = {}) {
  const title = lc(a.title);
  const desc = lc(a.description);
  const tags = (a.tags || []).map(lc);
  const styles = (a.style || []).map(lc);
  const roles = (a.roles || []).map(lc);
  let s = 0;
  for (const t of terms) {
    if (title.includes(t)) s += 8;
    if (roles.some((r) => r === t)) s += 7;
    if (tags.some((x) => x === t)) s += 6;
    else if (tags.some((x) => x.includes(t))) s += 3;
    if (styles.some((x) => x === t)) s += 4;
    else if (styles.some((x) => x.includes(t))) s += 2;
    if (desc.includes(t)) s += 2;
    if (lc(a.category) === t) s += 6;
    if (lc(a.type) === t) s += 4;
  }
  for (const [k, w] of Object.entries(weights)) {
    if (a[k]) s += w;
  }
  return s;
}

const byCount = (map) => [...map.entries()].sort((a, b) => b[1] - a[1]);

function tally(assets, fn) {
  const m = new Map();
  for (const a of assets) for (const v of fn(a)) m.set(v, (m.get(v) || 0) + 1);
  return m;
}

/** Compact projection — enough for an agent to judge relevance without the
 *  full write-up blowing out the context window. */
function brief(a, { withPalette = true } = {}) {
  const o = {
    id: a.id,
    title: a.title,
    kind: a.kind,
    category: a.category,
    type: a.type,
  };
  if (a.roles?.length) o.roles = a.roles;
  if (a.style?.length) o.style = a.style;
  if (a.tags?.length) o.tags = a.tags.slice(0, 10);
  if (withPalette && a.palette?.length) o.palette = a.palette.slice(0, 6);
  if (a.clip) o.motion_clip = true;
  o.summary = (a.description || '').split('. ').slice(0, 2).join('. ').slice(0, 340);
  return o;
}

/** Turn a screen description into search terms, dropping the filler words that
 *  would otherwise match everything. */
const STOP = new Set(['a', 'an', 'the', 'for', 'of', 'to', 'and', 'or', 'with', 'in', 'on', 'that', 'this', 'is', 'are', 'be', 'it', 'as', 'at', 'by', 'my', 'i', 'want', 'need', 'app', 'screen', 'page', 'design', 'ui', 'ux', 'into', 'from']);

function terms(text) {
  return lc(text)
    .split(/[^a-z0-9+#]+/)
    .filter((t) => t.length > 1 && !STOP.has(t))
    .slice(0, 12);
}

/* --------------------------------------------------------------- tools --- */

export const TOOLS = [
  {
    name: 'search_designs',
    description:
      'Search the design corpus for examples relevant to what you are building. Returns compact ' +
      'records with a summary and measured palette. Use this as the first step when designing any ' +
      'app screen or page: real examples beat invented ones. Query freely in natural language — ' +
      '"dark mode crypto wallet with a big balance" works. Filter with category/role/style/tag/' +
      'orientation/hue/surface for precision once you know the vocabulary from list_facets.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Natural-language description of what you are looking for.' },
        category: { type: 'array', items: { type: 'string' }, description: 'Filter to these categories.' },
        role: { type: 'array', items: { type: 'string' }, description: 'Filter to these screen roles.' },
        style: { type: 'array', items: { type: 'string' }, description: 'Filter to these visual styles.' },
        tag: { type: 'array', items: { type: 'string' }, description: 'Filter to these tags.' },
        orientation: { type: 'array', items: { type: 'string' }, enum: ['portrait', 'landscape', 'square'] },
        surface: { type: 'array', items: { type: 'string' }, description: "'dark', 'light' or 'mid' — derived from the measured palette." },
        has_motion: { type: 'boolean', description: 'Only assets that ship a playable motion clip.' },
        only_described: { type: 'boolean', description: 'Only assets with a full hand-written write-up.' },
        limit: { type: 'integer', minimum: 1, maximum: 50, default: 12 },
      },
      required: ['query'],
    },
  },

  {
    name: 'get_asset',
    description:
      'Get the complete record for one asset: the full hand-written description of what is on the ' +
      'screen, its measured palette with area percentages, structural metadata, and the local file ' +
      'path so you can look at the image itself. Use after search_designs when one result matters.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Asset id, e.g. IMG-0055 or VID-0240.' },
        include_markdown: { type: 'boolean', default: false, description: 'Wrap the write-up as markdown.' },
      },
      required: ['id'],
    },
  },

  {
    name: 'list_facets',
    description:
      'List the vocabulary and counts available in the corpus: categories, screen roles, visual ' +
      'styles, tags, types, orientations. Call this first if you are unsure what values ' +
      'search_designs accepts, or to see what the corpus can speak to at all.',
    inputSchema: {
      type: 'object',
      properties: {
        dimension: {
          type: 'string',
          enum: ['all', 'categories', 'roles', 'styles', 'tags', 'types'],
          default: 'all',
        },
        limit: { type: 'integer', minimum: 1, maximum: 400, default: 60 },
      },
    },
  },

  {
    name: 'find_patterns',
    description:
      'Return named layout patterns that recur across the corpus, with a description of why each ' +
      'one works and the assets that demonstrate it. Use this when you need a structural ' +
      'starting point rather than a specific example — e.g. "how should I lay out a dashboard".',
    inputSchema: {
      type: 'object',
      properties: {
        about: { type: 'string', description: 'Optional topic to rank patterns by, e.g. "onboarding" or "pricing".' },
        limit: { type: 'integer', minimum: 1, maximum: 20, default: 6 },
      },
    },
  },

  {
    name: 'design_brief',
    description:
      'Given a screen you need to design, return a synthesised brief: the best matching examples, ' +
      'the palettes they actually use, the layout patterns that apply, and the recurring decisions ' +
      'worth knowing about. This is the highest-value tool — call it instead of stitching together ' +
      'several searches by hand.',
    inputSchema: {
      type: 'object',
      properties: {
        screen: { type: 'string', description: 'What you need to design, e.g. "onboarding for a sleep-tracking app".' },
        platform: { type: 'string', enum: ['ios', 'android', 'web', 'any'], default: 'any' },
        mood: { type: 'string', description: 'Optional tonal direction, e.g. "calm", "high-energy", "premium".' },
        dark: { type: 'boolean', description: 'Force a dark-surface bias when true, light when false.' },
        examples: { type: 'integer', minimum: 1, maximum: 12, default: 6 },
      },
      required: ['screen'],
    },
  },

  {
    name: 'palette_for',
    description:
      'Produce a usable colour palette for a product direction, grounded in the corpus. Returns ' +
      'named two-tone schemes that fit the brief plus the colours that actually recur in matching ' +
      'screens, with WCAG contrast ratios for each pair. Every value is measured from real ' +
      'interfaces, so it is directly usable as CSS.',
    inputSchema: {
      type: 'object',
      properties: {
        mood: { type: 'string', description: 'What it should feel like, e.g. "warm and quiet" or "loud and synthetic".' },
        surface: { type: 'string', enum: ['dark', 'light', 'either'], default: 'either' },
        category: { type: 'string', description: 'Optional product area, e.g. fintech, health, food.' },
        count: { type: 'integer', minimum: 1, maximum: 10, default: 4 },
      },
      required: ['mood'],
    },
  },

  {
    name: 'compare_pair',
    description:
      'Find before/after evidence in the corpus — the same brief executed twice, where the ' +
      'difference is the lesson. Use this to justify a design decision: "here is the same screen ' +
      'done badly and well, and here is precisely what changed".',
    inputSchema: {
      type: 'object',
      properties: {
        topic: { type: 'string', description: 'What the comparison should be about, e.g. "wallet balance screen".' },
        limit: { type: 'integer', minimum: 1, maximum: 12, default: 5 },
      },
    },
  },

  {
    name: 'asset_image',
    description:
      'Resolve an asset id to the local image files on disk — the full-size web image, the ' +
      'thumbnail, and the original source file. Use this when you actually need to look at the ' +
      'design rather than read about it.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        which: { type: 'string', enum: ['web', 'thumb', 'original', 'all'], default: 'all' },
      },
      required: ['id'],
    },
  },

  {
    name: 'corpus_stats',
    description:
      'Report what the corpus contains: totals, and the distribution of categories, roles and ' +
      'styles. Useful to establish what evidence is available before making claims.',
    inputSchema: { type: 'object', properties: {} },
  },

  {
    name: 'list_groups',
    description:
      'List the same-app / same-set groups: screens verified as belonging to one product or one ' +
      'exploration (e.g. all four screens of a CRM, both states of a contacts table). Use this ' +
      'when a design must stay consistent across several screens of one app — pull the whole ' +
      'group instead of one lucky example. An optional query filters by group or member title.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Optional text matched against group titles and member titles, e.g. "crm" or "lease".' },
        limit: { type: 'integer', minimum: 1, maximum: 60, default: 20 },
      },
    },
  },
];

/* ------------------------------------------------------------ the impls --- */

const CORPUS_ROOT = (corpus) => path.resolve(path.dirname(corpus.__path), '..');

export async function callTool(name, args, corpus, here) {
  const assets = corpus.assets;

  switch (name) {
    /* ------------------------------------------------------- search ---- */
    case 'search_designs': {
      const limit = Math.min(args.limit ?? 12, 50);
      const q = args.query || '';
      const t = terms(q);

      let pool = assets;
      const eq = (v, list) => !list?.length || list.some((x) => lc(x) === lc(v));

      pool = pool.filter((a) => {
        if (args.category?.length && !args.category.some((c) => lc(a.category) === lc(c))) return false;
        if (args.role?.length && !args.role.some((r) => (a.roles || []).some((x) => lc(x) === lc(r)))) return false;
        if (args.style?.length && !args.style.some((s) => (a.style || []).some((x) => lc(x) === lc(s)))) return false;
        if (args.tag?.length && !args.tag.some((x) => (a.tags || []).some((y) => lc(y) === lc(x)))) return false;
        if (args.orientation?.length && !eq(a.orientation, args.orientation)) return false;
        if (args.has_motion && !a.clip) return false;
        if (args.only_described && !a.description) return false;
        if (args.surface?.length) {
          const dark = (a.palette_detail || []).filter((p) => lum(p.hex) < 38).reduce((s, p) => s + p.pct, 0);
          const light = (a.palette_detail || []).filter((p) => lum(p.hex) > 72).reduce((s, p) => s + p.pct, 0);
          const got = dark >= 45 ? 'dark' : light >= 45 ? 'light' : 'mid';
          if (!args.surface.map(lc).includes(got)) return false;
        }
        return true;
      });

      const scored = pool
        .map((a) => ({ a, s: t.length ? score(a, t, { description: a.description ? 1 : 0 }) : 1 }))
        .filter((x) => x.s > 0)
        .sort((x, y) => y.s - x.s);

      // if the strict pass found nothing, fall back to OR-matching so the agent
      // gets *something* related rather than an empty result
      let used = scored;
      let note = null;
      if (!scored.length && t.length) {
        const loose = pool
          .map((a) => ({ a, s: t.reduce((n, term) => n + (haystack(a).includes(term) ? 1 : 0), 0) }))
          .filter((x) => x.s > 0)
          .sort((x, y) => y.s - x.s);
        used = loose;
        note = 'No asset matched every term; these match at least one.';
      }

      return {
        query: q,
        matched: used.length,
        showing: Math.min(limit, used.length),
        ...(note ? { note } : {}),
        results: used.slice(0, limit).map(({ a, s }) => ({ ...brief(a), relevance: s })),
      };
    }

    /* ---------------------------------------------------------- get ---- */
    case 'get_asset': {
      const a = assets.find((x) => x.id === args.id);
      if (!a) {
        const near = assets
          .filter((x) => lc(x.id).includes(lc(args.id)) || lc(x.title).includes(lc(args.id)))
          .slice(0, 5)
          .map((x) => ({ id: x.id, title: x.title }));
        throw new Error(`No asset ${args.id}.` + (near.length ? ` Did you mean: ${near.map((n) => n.id).join(', ')}?` : ''));
      }
      const full = {
        id: a.id,
        title: a.title,
        kind: a.kind,
        category: a.category,
        type: a.type,
        description: a.description || '(no hand-written description for this asset)',
        roles: a.roles,
        style: a.style,
        tags: a.tags,
        palette_measured: (a.palette_detail || []).map((p) => ({
          hex: p.hex,
          area_pct: p.pct,
          contrast_on_white: ratio(p.hex, '#FFFFFF'),
          contrast_on_black: ratio(p.hex, '#000000'),
        })),
        dimensions: a.w && a.h ? { w: a.w, h: a.h, orientation: a.orientation, aspect: a.aspect } : undefined,
        motion: a.kind === 'video'
          ? { duration_s: a.duration_s, fps: a.fps, frame_diff: a.motion, clip_available: !!a.clip }
          : undefined,
        salvage_note: a.quality,
        source_file: a.origin?.path,
        web_image: a.src,
        thumbnail: a.thumb,
        motion_clip: a.clip,
        group: a.group
          ? (() => {
              const g = (corpus.groups || []).find((x) => x.id === a.group);
              if (!g) return undefined;
              return {
                id: g.id,
                title: g.title,
                verified: !!g.verified,
                position: a.group_index + 1,
                of: g.count,
                siblings: g.members
                  .filter((m) => m !== a.id)
                  .map((m) => {
                    const s = assets.find((x) => x.id === m);
                    return { id: m, title: s ? s.title : m };
                  }),
              };
            })()
          : undefined,
      };
      if (args.include_markdown) {
        return renderAssetMarkdown(full);
      }
      return full;
    }

    /* ------------------------------------------------------- facets ---- */
    case 'list_facets': {
      const dim = args.dimension || 'all';
      const limit = args.limit ?? 60;
      const out = { totals: corpus.totals };
      const cap = (arr) => arr.slice(0, limit);
      // Truncation must be visible: a caller that sums counts off a capped list
      // would silently conclude the corpus is smaller than it is.
      const omitted = [];

      if (dim === 'all' || dim === 'categories') {
        if (corpus.categories.length > limit) omitted.push(`categories(+${corpus.categories.length - limit})`);
        out.categories = cap(corpus.categories);
      }
      if (dim === 'all' || dim === 'roles') {
        if (corpus.roles.length > limit) omitted.push(`roles(+${corpus.roles.length - limit})`);
        out.roles = cap(corpus.roles);
      }
      if (dim === 'all' || dim === 'styles') {
        if (corpus.styles.length > limit) omitted.push(`styles(+${corpus.styles.length - limit})`);
        out.styles = cap(corpus.styles);
      }
      if (dim === 'all' || dim === 'types') {
        if (corpus.types.length > limit) omitted.push(`types(+${corpus.types.length - limit})`);
        out.types = cap(corpus.types);
      }

      if (dim === 'all' || dim === 'tags') {
        // tags are ordered by count; the long tail is noise for a first look
        const tags = corpus.tags.slice(0, limit).map((t) => ({ tag: t.id, count: t.count }));
        out.tags = tags;
        out.tags_omitted = Math.max(0, corpus.tags.length - tags.length);
        if (out.tags_omitted) omitted.push(`tags(+${out.tags_omitted})`);
      }
      out.limit = limit;
      out.truncated = omitted.length ? omitted : false;

      if (dim === 'all') {
        const ori = tally(assets, (a) => (a.orientation ? [a.orientation] : []));
        out.orientations = [...ori.entries()].map(([id, count]) => ({ id, count }));
        out.surfaces = ['dark', 'light', 'mid'].map((s) => ({
          id: s,
          count: assets.filter((a) => deriveSurface(a) === s).length,
        }));
      }
      out.usage = {
        start_with: 'search_designs',
        for_a_full_writeup: 'get_asset',
        for_a_structural_start: 'find_patterns',
        for_synthesis: 'design_brief',
        for_colour: 'palette_for',
      };
      return out;
    }

    /* ----------------------------------------------------- patterns ---- */
    case 'find_patterns': {
      const limit = args.limit ?? 6;
      const about = terms(args.about || '');
      const defs = PATTERN_DEFS;

      const scored = defs.map((d) => {
        const examples = assets.filter(d.match);
        let s = examples.length ? 1 : 0;
        if (about.length) {
          const text = lc(d.name + ' ' + d.why + ' ' + examples.slice(0, 30).map((e) => haystack(e)).join(' '));
          s += about.reduce((n, t) => n + (text.includes(t) ? 3 : 0), 0);
        }
        return { d, examples, s };
      })
        .filter((x) => x.examples.length >= (about.length ? 1 : x.d.min))
        .sort((x, y) => y.s - x.s || y.examples.length - x.examples.length);

      return {
        about: args.about || null,
        patterns: scored.slice(0, limit).map(({ d, examples }) => ({
          name: d.name,
          why_it_works: d.why,
          example_count: examples.length,
          examples: examples.slice(0, 5).map((e) => ({ id: e.id, title: e.title, category: e.category })),
        })),
      };
    }

    /* -------------------------------------------------------- brief ---- */
    case 'design_brief': {
      const t = terms(args.screen);
      const mood = terms(args.mood || '');
      const wantPlatform = args.platform && args.platform !== 'any' ? args.platform : null;

      const ranked = assets
        .map((a) => {
          let s = score(a, t);
          s += score(a, mood) * 0.7;
          if (wantPlatform) {
            const p = lc(a.platform || a.tags?.join(' ') || '');
            if (p.includes(wantPlatform) || (a.tags || []).some((x) => lc(x) === wantPlatform)) s += 3;
          }
          if (args.dark === true && deriveSurface(a) === 'dark') s += 3;
          if (args.dark === false && deriveSurface(a) === 'light') s += 3;
          if (a.description) s += 0.6;
          if (a.category === 'before-after') s += 0.8;
          return { a, s };
        })
        .filter((x) => x.s > 0)
        .sort((x, y) => y.s - x.s);

      const nEx = args.examples ?? 6;
      const top = ranked.slice(0, nEx).map((x) => x.a);

      // palettes: weight every colour in the top examples by its area share
      const colourWeight = new Map();
      for (const [i, ref] of ranked.slice(0, 16).entries()) {
        const decay = 1 / (1 + i * 0.35);
        for (const p of ref.a.palette_detail || []) {
          if (p.pct < 3) continue;
          const cur = colourWeight.get(p.hex) || { hex: p.hex, weight: 0, seen_in: 0 };
          cur.weight += p.pct * decay;
          cur.seen_in += 1;
          colourWeight.set(p.hex, cur);
        }
      }
      const palettes = [...colourWeight.values()]
        .sort((x, y) => y.weight - x.weight)
        .slice(0, 10)
        .map((c) => ({
          hex: c.hex,
          appears_in: c.seen_in,
          weight: Math.round(c.weight),
          role: colourRole(c.hex),
        }));

      const matched = PATTERN_DEFS
        .map((d) => ({ d, examples: assets.filter(d.match) }))
        .filter((x) => x.examples.length >= 3)
        .map((x) => {
          const overlap = top.filter((e) => x.d.match(e)).length;
          return { ...x, overlap };
        })
        .filter((x) => x.overlap > 0)
        .sort((x, y) => y.overlap - x.overlap)
        .slice(0, 4);

      const styles = byCount(tally(top, (a) => a.style || [])).slice(0, 6);
      const roles = byCount(tally(top, (a) => a.roles || [])).slice(0, 6);

      // the honest part: what the top examples agree on
      const notes = [];
      if (top.length) {
        const dark = top.filter((a) => deriveSurface(a) === 'dark').length;
        if (dark >= top.length * 0.6) notes.push(`The majority of close matches (${dark}/${top.length}) are dark-surface designs.`);
        if (dark === 0 && top.length >= 3) notes.push(`All ${top.length} close matches are light-surface.`);
        const withClip = top.filter((a) => a.clip).length;
        if (withClip) notes.push(`${withClip} of these have a playable motion clip if transitions matter — query has_motion.`);
        const pairs = top.filter((a) => a.category === 'before-after');
        if (pairs.length) notes.push(`${pairs.length} are before/after comparisons, useful to justify the decision rather than just show it.`);
      }
      if (!ranked.length) notes.push('Nothing in the corpus matched this brief. Try broader terms, or list_facets to see what vocabulary exists.');

      return {
        brief: args.screen,
        platform: args.platform || 'any',
        mood: args.mood || null,
        evidence_count: ranked.length,
        examples: top.map((a) => brief(a, { withPalette: false })),
        recurring_colours: palettes,
        applicable_patterns: matched.map((x) => ({
          name: x.d.name,
          why_it_works: x.d.why,
          overlap_with_matches: x.overlap,
          examples: x.examples.slice(0, 3).map((e) => e.id),
        })),
        dominant_styles: styles.map(([id, n]) => ({ id, n })),
        dominant_roles: roles.map(([id, n]) => ({ id, n })),
        notes,
      };
    }

    /* ------------------------------------------------------ palette ---- */
    case 'palette_for': {
      const t = terms(args.mood);
      const count = args.count ?? 4;
      const cats = terms(args.category || '');

      const named = assets.filter((a) => a.category === 'color-palette');
      const scoredNamed = named
        .map((a) => {
          let s = 1;
          const text = lc(a.title + ' ' + a.description);
          s += t.reduce((n, term) => n + (text.includes(term) ? 4 : 0), 0);
          s += cats.reduce((n, term) => n + (text.includes(term) ? 3 : 0), 0);
          if (args.surface === 'dark' && lum(a.palette?.[0] || '#fff') < 45) s += 2;
          if (args.surface === 'light' && lum(a.palette?.[0] || '#000') > 60) s += 2;
          return { a, s };
        })
        .sort((x, y) => y.s - x.s);

      const schemes = scoredNamed.slice(0, count).map(({ a }) => {
        const pair = (a.palette || []).slice(0, 2);
        const [x, y] = pair;
        return {
          id: a.id,
          name: a.title,
          colours: pair,
          contrast: pair.length === 2 ? ratio(x, y) : null,
          why: a.description,
        };
      });

      // colours that recur in real screens matching the mood
      const screenPool = assets.filter((a) => a.category !== 'color-palette');
      const weigh = new Map();
      for (const a of screenPool) {
        const s = score(a, t) + score(a, cats);
        if (s <= 0) continue;
        for (const p of a.palette_detail || []) {
          if (p.pct < 4) continue;
          const cur = weigh.get(p.hex) || { hex: p.hex, w: 0, n: 0 };
          cur.w += p.pct * (1 + s * 0.1);
          cur.n += 1;
          weigh.set(p.hex, cur);
        }
      }
      const observed = [...weigh.values()].sort((x, y) => y.w - x.w).slice(0, 12)
        .map((c) => ({ hex: c.hex, appears_in: c.n, role: colourRole(c.hex) }));

      const ink = observed.length
        ? { light_text_on: (observed.find((c) => lum(c.hex) > 55) || observed[0]).hex,
            dark_text_on: (observed.find((c) => lum(c.hex) < 40) || observed[0]).hex }
        : null;

      const checks = [];
      for (const s of schemes) {
        if (s.contrast != null) {
          checks.push({
            scheme: s.name,
            pair: s.colours,
            ratio: s.contrast,
            verdict: s.contrast >= 4.5 ? 'AA for body text' : s.contrast >= 3 ? 'AA for large text only' : 'decorative — too low for text',
          });
        }
      }

      return {
        mood: args.mood,
        surface: args.surface || 'either',
        named_schemes: schemes,
        contrast_checks: checks,
        observed_in_matching_screens: observed,
        suggested_ink: ink,
        note: 'Hex values are measured from the source images (or printed on the named cards). Contrast ratios follow WCAG: 4.5:1 body text, 3:1 large text.',
      };
    }

    /* ------------------------------------------------------ compare ---- */
    case 'compare_pair': {
      const t = terms(args.topic || '');
      const limit = args.limit ?? 5;

      const ba = assets.filter((a) => a.category === 'before-after');
      const ranked = ba
        .map((a) => ({ a, s: t.length ? score(a, t) || countOverlap(a, assets, t) : 1 }))
        .filter((x) => x.s > 0)
        .sort((x, y) => y.s - x.s)
        .slice(0, limit);

      return {
        topic: args.topic || null,
        comparisons_found: ranked.length,
        available_total: ba.length,
        comparisons: ranked.map(({ a }) => ({
          id: a.id,
          title: a.title,
          what_changed: a.description,
          kind: a.kind,
          has_motion_clip: !!a.clip,
          tags: a.tags,
        })),
        how_to_use: 'These are argument, not layout. Cite one when you need to justify a decision — the description names the specific delta rather than just asserting the second version is better.',
      };
    }

    /* ------------------------------------------------------- image ----- */
    case 'asset_image': {
      const a = assets.find((x) => x.id === args.id);
      if (!a) throw new Error(`No asset ${args.id}`);
      const root = CORPUS_ROOT(corpus);
      const which = args.which || 'all';
      const out = { id: a.id, title: a.title };
      const abs = (rel) => (rel ? path.resolve(root, rel).replace(/\\/g, '/') : null);
      if (which === 'all' || which === 'web') out.web_image = abs(a.src);
      if (which === 'all' || which === 'thumb') out.thumbnail = abs(a.thumb);
      if (which === 'all' || which === 'original') out.original_source = a.origin?.path || null;
      if (a.clip && (which === 'all' || which === 'web')) out.motion_clip = abs(a.clip);
      out.dimensions = a.w && a.h ? `${a.w}x${a.h}` : null;
      return out;
    }

    /* ------------------------------------------------------- stats ----- */
    case 'corpus_stats': {
      const described = assets.filter((a) => a.description).length;
      const clips = assets.filter((a) => a.clip).length;
      return {
        totals: corpus.totals,
        described_pct: Math.round((described / assets.length) * 1000) / 10,
        by_category: corpus.categories.map((c) => ({ id: c.id, label: c.label, count: c.count })),
        top_roles: corpus.roles.slice(0, 12),
        top_styles: corpus.styles.slice(0, 12),
        top_tags: corpus.tags.slice(0, 20),
        groups: {
          total: (corpus.groups || []).length,
          verified: (corpus.groups || []).filter((g) => g.verified).length,
          grouped_assets: assets.filter((a) => a.group).length,
        },
        corpus_file: corpus.__path,
        honesty: {
          described: `${described} of ${assets.length} assets carry a full hand-written visual description.`,
          clips: `${clips} assets ship a playable motion clip. The rest are video sources that were found to be static and are kept as poster frames only.`,
          measured: 'All palettes are k-means samples of the actual pixels, not estimates.',
          groups: `${(corpus.groups || []).filter((g) => g.verified).length} same-app groups were verified by viewing every member; the remainder come from title prefixes and are suggestive, not certain.`,
        },
      };
    }

    /* -------------------------------------------------------- groups ---- */
    case 'list_groups': {
      const q = (args.query || '').trim().toLowerCase();
      const limit = Math.min(args.limit ?? 20, 60);
      const rows = [];
      for (const g of corpus.groups || []) {
        const members = g.members
          .map((m) => assets.find((x) => x.id === m))
          .filter(Boolean);
        if (members.length < 2) continue;
        if (q) {
          const text = (g.title + ' ' + members.map((m) => `${m.title} ${(m.tags || []).join(' ')} ${(m.category || '')}`).join(' ')).toLowerCase();
          if (!text.includes(q)) continue;
        }
        rows.push({
          id: g.id,
          title: g.title,
          verified: !!g.verified,
          count: members.length,
          members: members.map((m) => ({ id: m.id, title: m.title, category: m.category })),
        });
      }
      rows.sort((a, b) => Number(b.verified) - Number(a.verified) || b.count - a.count);
      return {
        groups: (corpus.groups || []).length,
        matched: rows.length,
        showing: Math.min(limit, rows.length),
        note: 'verified = every member was looked at and confirmed as one app/set.',
        results: rows.slice(0, limit),
      };
    }

    default:
      throw new Error(`Unimplemented tool: ${name}`);
  }
}

/* ----------------------------------------------------- pattern defs ----- */
/* Mirrors ui-hall/assets/js/patterns.js. Kept as a separate copy because the
   site is browser JS and this is Node ESM; they share no build step. */

const has = (a, list) => list.some((x) => (a.tags || []).includes(x));
const hasStyle = (a, list) => list.some((x) => (a.style || []).includes(x));
const hasRole = (a, list) => list.some((x) => (a.roles || []).includes(x));

export const PATTERN_DEFS = [
  { name: 'One hero number', min: 4, why: 'A single dominant figure set far larger than everything around it, with supporting detail subordinated. The most reliable way to give a mobile screen an immediate focal point without adding decoration.',
    match: (a) => has(a, ['dashboard', 'analytics']) || (has(a, ['fintech', 'crypto', 'budgeting']) && has(a, ['cards', 'list'])) },
  { name: 'Card over tinted backdrop', min: 4, why: 'A light content card on a saturated or gradient background rather than on white. Separates chrome from content with colour instead of elevation, which survives dark mode far better than a shadow.',
    match: (a) => has(a, ['cards']) && has(a, ['gradient', 'glow', 'vibrant']) },
  { name: 'Progressive disclosure list', min: 4, why: 'Rows stacked flat, each expandable rather than each being its own screen. Keeps perceived length down while still showing everything available.',
    match: (a) => has(a, ['list']) && (has(a, ['onboarding', 'settings']) || hasRole(a, ['settings', 'onboarding'])) },
  { name: 'Bottom tab bar, 4-5 destinations', min: 4, why: 'Fixed bottom navigation with a small consistent set of top-level destinations, active one marked by tint rather than weight. The interesting variation is what the bar does when a sheet or keyboard opens.',
    match: (a) => has(a, ['bottom-nav', 'tabs']) || hasRole(a, ['navigation']) },
  { name: 'Empty state that teaches', min: 3, why: 'The zero-data screen explains what the product does and offers exactly one action, instead of showing a grey "no data" box. Cheap and high-leverage, and most products skip it.',
    match: (a) => has(a, ['empty-state']) || hasRole(a, ['empty-state']) },
  { name: 'Dark surface, single hot accent', min: 4, why: 'A near-black background with exactly one saturated accent carrying every interactive element. The accent is usually warm, because a cool accent on black loses its punch.',
    match: (a) => has(a, ['dark-ui']) && (hasStyle(a, ['high-contrast']) || hasStyle(a, ['bold-typography'])) },
  { name: 'Illustration as the load-bearing element', min: 3, why: 'No strong photograph or data, so illustration holds attention and sets tone. Common in onboarding and education, and the fastest-dating choice on any screen.',
    match: (a) => hasStyle(a, ['playful', 'illustration-led']) || has(a, ['illustration']) },
  { name: 'Metric grid', min: 3, why: 'Small multiples of equal-weight tiles, each carrying one number and one label. Reads in a glance and degrades gracefully on narrow screens.',
    match: (a) => has(a, ['analytics', 'charts', 'dashboard']) && has(a, ['cards', 'grid']) },
  { name: 'Type-led marketing hero', min: 4, why: 'A large statement in a confident weight, with the product shot secondary. The most common landing-page structure collected, and the one that survives translation and small screens.',
    match: (a) => hasRole(a, ['hero']) || (hasStyle(a, ['editorial', 'bold-typography']) && has(a, ['landing-page', 'marketing'])) },
  { name: 'Before / after with the delta labelled', min: 3, why: 'Two states side by side with an explicit label on each. Rarer than it should be: most design documentation shows only the finished state, which hides the reasoning.',
    match: (a) => a.category === 'before-after' || has(a, ['before-after']) },
  { name: 'Frameless device mockup on flat colour', min: 8, why: 'A phone on a solid tint, no browser chrome, no furniture. The workhorse presentation format for a single screen because it makes the screen itself the whole composition.',
    match: (a) => has(a, ['mockup', 'device-frame']) && (has(a, ['light-ui', 'dark-ui']) || hasStyle(a, ['minimal'])) },
  { name: 'Multi-screen flow strip', min: 4, why: 'Three or more screens of one flow laid out left to right. Encodes the sequence rather than any single screen — the most direct way to show an ordered journey.',
    match: (a) => a.type === 'multi-screen' || a.type === 'flow-walkthrough' },
  { name: 'Scrollable chip-filter row', min: 3, why: 'Filter chips in a horizontally scrolling row, never wrapping or clipping. Build rule: fixed height (44px), min-width (>=84px), nowrap labels, overflow-x:auto with hidden scrollbar. Without min-width a short label ("All") collapses to a circle; without overflow the last chip clips at the card edge.',
    match: (a) => has(a, ['chip-filter', 'filters', 'sorting']) },
  { name: 'Segmented range control', min: 3, why: 'A Week/Month switch that re-draws one chart and moves nothing else. One state, one controller. Day labels abbreviated (Mon), never single letters.',
    match: (a) => has(a, ['segmented-control', 'tabs']) },
];

/* ------------------------------------------------------- colour maths ---- */

function rgb(hex) {
  const h = String(hex || '').replace('#', '');
  const v = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(v.slice(0, 6), 16);
  return Number.isFinite(n) ? { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 } : null;
}

function lum(hex) {
  const c = rgb(hex);
  return c ? 0.299 * c.r / 2.55 + 0.587 * c.g / 2.55 + 0.114 * c.b / 2.55 : 50;
}

function ratio(a, b) {
  const la = (() => { const c = rgb(a); return c ? 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b) : 0; })();
  const lb = (() => { const c = rgb(b); return c ? 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b) : 0; })();
  const hi = Math.max(la, lb), lo = Math.min(la, lb);
  return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100;
  function f(v) { const s = v / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); }
}

function colourRole(hex) {
  const l = lum(hex);
  if (l < 18) return 'near-black surface or text';
  if (l < 40) return 'dark surface / chrome';
  if (l > 92) return 'near-white surface';
  if (l > 72) return 'light surface / tint';
  return 'accent or mid surface';
}

function deriveSurface(a) {
  const pal = a.palette_detail || [];
  if (!pal.length) return 'mid';
  const dark = pal.filter((p) => lum(p.hex) < 38).reduce((s, p) => s + p.pct, 0);
  const light = pal.filter((p) => lum(p.hex) > 72).reduce((s, p) => s + p.pct, 0);
  return dark >= 45 ? 'dark' : light >= 45 ? 'light' : 'mid';
}

function countOverlap(a, assets, t) {
  const text = lc((a.tags || []).join(' '));
  return t.reduce((n, term) => n + (text.includes(term) ? 1 : 0), 0);
}

/* -------------------------------------------------------- markdown ------ */

function renderAssetMarkdown(a) {
  const L = [];
  L.push(`# ${a.title}`);
  L.push('');
  L.push(`\`${a.id}\` · ${a.category} · ${a.type} · ${a.kind}`);
  L.push('');
  L.push(a.description);
  if (a.salvage_note) { L.push(''); L.push(`> **Salvage note.** ${a.salvage_note}`); }
  if (a.palette_measured?.length) {
    L.push('');
    L.push('## Palette (measured from pixels)');
    L.push('');
    L.push('| Hex | Area | On white | On black |');
    L.push('| --- | --- | --- | --- |');
    for (const p of a.palette_measured) {
      L.push(`| \`${p.hex}\` | ${p.area_pct}% | ${p.contrast_on_white}:1 | ${p.contrast_on_black}:1 |`);
    }
  }
  if (a.dimensions) {
    L.push('');
    L.push(`**Dimensions** ${a.dimensions.w}×${a.dimensions.h} (${a.dimensions.orientation})`);
  }
  if (a.motion) {
    L.push('');
    L.push(`**Motion** ${a.motion.duration_s}s @ ${a.motion.fps}fps · frame-diff ${a.motion.frame_diff} · clip ${a.motion.clip_available ? 'available' : 'not shipped (source was static)'}`);
  }
  if (a.tags?.length) { L.push(''); L.push(`**Tags** ${a.tags.join(', ')}`); }
  if (a.style?.length) { L.push(''); L.push(`**Style** ${a.style.join(', ')}`); }
  L.push('');
  L.push(`**Files** web: \`${a.web_image}\``);
  if (a.motion_clip) L.push(`clip: \`${a.motion_clip}\``);
  L.push(`source: \`${a.source_file}\``);
  return L.join('\n');
}
