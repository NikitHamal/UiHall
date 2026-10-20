/**
 * UI Hall engine — search, similarity, colour and brief logic over the corpus.
 *
 * Isomorphic and dependency-free: the MCP server imports it in Node, and the
 * website imports the very same file in the browser, so the playground on the
 * site runs exactly what an agent gets.
 */

import {
  contrast, deltaE, hueFamily, normHex, paletteRoles, toOklch, fromOklch, wcag, fitContrast, bestInk,
} from './color.js';
import { PATTERNS, matchPatterns } from './patterns.js';

export const SITE = 'https://nikithamal.github.io/UiHall/';

/* ----------------------------------------------------------- text index -- */

const STOP = new Set(('a an the for of to and or with in on that this is are be it as at by my i me we our want need '
  + 'make build create design designing screen screens page pages ui ux app apps into from like some any show give '
  + 'good great nice best look looks looking using use please one new').split(' '));

const SYN = {
  fintech: ['finance', 'banking', 'wallet', 'payment', 'money', 'crypto', 'budgeting', 'balance'],
  finance: ['fintech', 'banking', 'wallet', 'money', 'budgeting'], bank: ['banking', 'finance', 'fintech'],
  banking: ['finance', 'fintech', 'wallet'], money: ['finance', 'wallet', 'payment'], crypto: ['wallet', 'finance', 'fintech'],
  payment: ['checkout', 'wallet', 'card'], invest: ['finance', 'stocks', 'portfolio'],
  login: ['auth', 'sign-in', 'signup'], signin: ['auth', 'sign-in', 'login'], signup: ['auth', 'sign-in', 'onboarding'],
  auth: ['login', 'sign-in', 'signup'], register: ['signup', 'auth'],
  onboard: ['onboarding', 'welcome-screen'], onboarding: ['welcome-screen', 'walkthrough'], welcome: ['onboarding', 'welcome-screen'],
  landing: ['landing-page', 'hero', 'website', 'marketing'], homepage: ['landing-page', 'hero', 'website'],
  website: ['landing-page', 'web'], hero: ['landing-page', 'headline'], saas: ['landing-page', 'web-app', 'dashboard'],
  dashboard: ['analytics', 'kpi', 'metric-tile', 'chart', 'stats'], analytics: ['dashboard', 'chart', 'kpi', 'data-viz'],
  admin: ['dashboard', 'sidebar', 'data-table'], table: ['data-table'], chart: ['bar-chart', 'line-chart', 'data-viz', 'analytics'],
  shop: ['ecommerce', 'shopping', 'product', 'checkout', 'cart'], ecommerce: ['shopping', 'product', 'checkout', 'cart', 'store'],
  store: ['ecommerce', 'shopping'], cart: ['checkout', 'ecommerce'], checkout: ['payment', 'cart'],
  health: ['fitness', 'wellness', 'medical', 'sleep'], fitness: ['workout', 'health', 'streak', 'progress-ring'],
  wellness: ['health', 'meditation', 'sleep', 'calm'], sleep: ['wellness', 'health'], meditation: ['wellness', 'calm'],
  food: ['restaurant', 'delivery', 'recipe', 'grocery'], restaurant: ['food', 'booking'], delivery: ['food', 'tracking', 'map'],
  travel: ['booking', 'flight', 'hotel', 'trip', 'map'], flight: ['travel', 'boarding-pass'], hotel: ['travel', 'booking'],
  chat: ['messaging', 'assistant', 'conversation', 'prompt'], ai: ['assistant', 'prompt', 'ai-agent', 'chat'],
  assistant: ['ai', 'chat', 'prompt'], agent: ['ai-agent', 'ai'], music: ['audio', 'player', 'podcast'],
  video: ['player', 'media', 'streaming'], social: ['feed', 'profile', 'avatar'], profile: ['avatar', 'account'],
  settings: ['preferences', 'toggle', 'account'], calendar: ['schedule', 'week-strip', 'booking'],
  tasks: ['todo', 'productivity', 'checklist'], todo: ['tasks', 'checklist'], notes: ['productivity', 'editor'],
  map: ['location', 'navigation', 'travel'], education: ['learning', 'course', 'study'], learning: ['education', 'course'],
  dark: ['dark-mode', 'dark-ui'], light: ['light-mode', 'light-ui'], glass: ['glassmorphism', 'blur'],
  glassmorphism: ['glass', 'blur'], calm: ['soft', 'pastel', 'minimal'], minimal: ['clean', 'whitespace'],
  premium: ['luxury', 'editorial', 'serif'], luxury: ['premium', 'serif', 'editorial'], elegant: ['editorial', 'serif', 'luxury'],
  playful: ['illustration', 'mascot', 'rounded', 'vibrant'], fun: ['playful', 'vibrant', 'mascot'],
  bold: ['bold-typography', 'high-contrast', 'vibrant'], vibrant: ['gradient', 'bold'], retro: ['pixel', 'vintage'],
  motion: ['animation', 'transition', 'micro-interaction', 'morph'], animation: ['motion', 'transition', 'micro-interaction'],
  interaction: ['micro-interaction', 'gesture'], button: ['cta-button'], cta: ['cta-button'],
  nav: ['navigation', 'bottom-nav', 'tabs', 'sidebar'], navigation: ['bottom-nav', 'tabs', 'sidebar'],
  pricing: ['price', 'plans', 'paywall', 'subscription'], paywall: ['pricing', 'subscription'],
  empty: ['empty-state'], search: ['filters', 'chips'], filter: ['filters', 'chips', 'sorting'],
  form: ['input', 'fields'], input: ['form'], logo: ['brand-mark', 'wordmark', 'identity'], brand: ['identity', 'logo', 'wordmark'],
  palette: ['colour', 'swatch', 'color-palette'], color: ['palette', 'colour'], colour: ['palette', 'color'],
  typography: ['serif', 'type', 'font', 'headline'], font: ['typography', 'serif'],
};

const stem = (w) => (w.length > 4 ? w.replace(/(ings|ing|ies|es|s)$/, (m) => (m === 'ies' ? 'y' : '')) : w);

export function tokenize(text) {
  return String(text ?? '').toLowerCase().replace(/[’']/g, '').split(/[^a-z0-9#+]+/).filter((t) => t.length > 1);
}

const FIELDS = [
  ['title', 3.2], ['tags', 2.6], ['roles', 2.6], ['style', 1.6], ['category', 2.2], ['type', 1.2], ['description', 1],
];

/* -------------------------------------------------------------- engine -- */

export class UiHall {
  constructor(corpus, { site = SITE } = {}) {
    this.corpus = corpus;
    this.site = site.endsWith('/') ? site : site + '/';
    this.assets = corpus.assets;
    this.byId = new Map(this.assets.map((a) => [a.id, a]));
    this.vocab = new Set();
    for (const k of ['categories', 'types', 'roles', 'styles', 'tags']) for (const x of corpus[k] || []) this.vocab.add(x.id);
    this.#index();
  }

  /* derived per-asset facts, computed once */
  #derive(a) {
    const det = (a.palette_detail || []).filter((p) => normHex(p.hex));
    const roles = paletteRoles(det);
    const L = det.reduce((s, p) => s + toOklch(p.hex)[0] * p.pct, 0) / (det.reduce((s, p) => s + p.pct, 0) || 1);
    const hues = [...new Set(det.filter((p) => p.pct >= 4 && toOklch(p.hex)[1] >= 0.06).map((p) => hueFamily(p.hex)))];
    return {
      surface: L < 0.42 ? 'dark' : L > 0.72 ? 'light' : 'mid',
      roles,
      accent: roles?.accent || null,
      accent_family: roles?.accent ? hueFamily(roles.accent) : null,
      hues,
      lightness: Math.round(L * 100) / 100,
    };
  }

  #index() {
    this.docs = [];
    this.df = new Map();
    let total = 0;
    for (const a of this.assets) {
      a._d = this.#derive(a);
      const tf = new Map();
      const add = (tok, w) => tf.set(tok, (tf.get(tok) || 0) + w);
      for (const [f, w] of FIELDS) {
        const v = a[f];
        const list = Array.isArray(v) ? v : [v];
        for (const item of list) {
          if (!item) continue;
          if (f !== 'description' && f !== 'title') add(String(item).toLowerCase(), w); // whole tag, e.g. "bottom-nav"
          for (const t of tokenize(item)) add(stem(t), w);
        }
      }
      add(a._d.surface, 0.8);
      for (const h of a._d.hues) add(h, 0.6);
      if (a.clip) { add('motion', 0.8); add('animated', 0.6); }
      let len = 0;
      for (const v of tf.values()) len += v;
      this.docs.push({ a, tf, len });
      total += len;
      for (const t of tf.keys()) this.df.set(t, (this.df.get(t) || 0) + 1);
    }
    this.avgLen = total / this.docs.length;
  }

  /** Expand a query into weighted terms: exact words, then synonyms at lower weight. */
  expand(query) {
    const words = tokenize(query).filter((w) => !STOP.has(w));
    const terms = new Map();
    const put = (t, w) => terms.set(t, Math.max(terms.get(t) || 0, w));
    // hyphenated vocab phrases ("bottom nav" -> bottom-nav)
    for (let i = 0; i < words.length - 1; i++) {
      const pair = `${words[i]}-${words[i + 1]}`;
      if (this.vocab.has(pair)) put(pair, 1.4);
    }
    for (const w of words) {
      put(stem(w), 1);
      if (this.vocab.has(w)) put(w, 1);
      for (const s of SYN[w] || SYN[stem(w)] || []) put(s.includes('-') ? s : stem(s), 0.45);
    }
    return terms;
  }

  #bm25(doc, terms) {
    const k1 = 1.2, b = 0.72, N = this.docs.length;
    let s = 0; const hits = [];
    for (const [t, qw] of terms) {
      const f = doc.tf.get(t);
      if (!f) continue;
      const df = this.df.get(t) || 0;
      const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
      s += qw * idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * doc.len) / this.avgLen)));
      if (qw >= 1) hits.push(t);
    }
    return { s, hits };
  }

  filter(list, f = {}) {
    const arr = (v) => (v == null || v === '' ? [] : Array.isArray(v) ? v : [v]);
    const cat = arr(f.category), role = arr(f.role), sty = arr(f.style), tg = arr(f.tag), typ = arr(f.type);
    const surf = arr(f.surface), hue = arr(f.hue);
    return list.filter((a) => {
      if (f.kind && f.kind !== 'all' && a.kind !== f.kind) return false;
      if (f.viewport && f.viewport !== 'all' && a.viewport !== f.viewport) return false;
      if (cat.length && !cat.includes(a.category)) return false;
      if (typ.length && !typ.includes(a.type)) return false;
      if (role.length && !role.some((r) => a.roles?.includes(r))) return false;
      if (sty.length && !sty.every((s) => a.style?.includes(s))) return false;
      if (tg.length && !tg.every((t) => a.tags?.includes(t))) return false;
      if (surf.length && !surf.includes(a._d.surface)) return false;
      if (hue.length && !hue.some((h) => a._d.hues.includes(h) || a._d.accent_family === h)) return false;
      if (f.has_motion && !a.clip) return false;
      if (f.exclude_crops && a.crop_of) return false;
      if (f.source === 'original' && !a.original) return false;
      if (f.source === 'reference' && a.original) return false;
      return true;
    });
  }

  /**
   * Ranked search. Returns {total, results:[{asset, score, matched}]}.
   * With no query, returns the filtered set in curated order.
   */
  search({ query = '', boost = '', prefer_surface, min_score = 0.15, limit = 12, offset = 0, ...filters } = {}) {
    const pool = new Set(this.filter(this.assets, filters));
    const terms = this.expand(query);
    for (const [t, w] of this.expand(boost)) if (!terms.has(t)) terms.set(t, w * 0.35);
    let ranked;
    if (!terms.size) {
      ranked = this.assets.filter((a) => pool.has(a)).map((asset) => ({ asset, score: 0, matched: [] }));
    } else {
      ranked = [];
      for (const doc of this.docs) {
        if (!pool.has(doc.a)) continue;
        const { s, hits } = this.#bm25(doc, terms);
        if (s <= 0) continue;
        const coverage = hits.length / Math.max(1, [...terms.values()].filter((w) => w >= 1).length);
        ranked.push({ asset: doc.a, score: s * (0.6 + 0.4 * coverage) * (doc.a.crop_of ? 0.85 : 1) * (prefer_surface && doc.a._d.surface === prefer_surface ? 1.35 : 1), matched: hits });
      }
      ranked.sort((x, y) => y.score - x.score);
      const top = ranked[0]?.score || 1;
      for (const r of ranked) r.score = Math.round((r.score / top) * 1000) / 1000;
      ranked = ranked.filter((r) => r.score >= min_score); // drop the long tail of one-synonym matches
    }
    return { total: ranked.length, results: ranked.slice(offset, offset + limit) };
  }

  get(id) {
    return this.byId.get(String(id || '').trim().toUpperCase()) || null;
  }

  #tagSet(a) { return new Set([...(a.tags || []), ...(a.roles || []).map((r) => 'r:' + r), ...(a.style || []).map((s) => 's:' + s)]); }

  #paletteDist(a, b) {
    const pa = (a.palette_detail || []).slice(0, 4), pb = (b.palette_detail || []).slice(0, 4);
    if (!pa.length || !pb.length) return 0.5;
    let s = 0, w = 0;
    for (const p of pa) {
      const d = Math.min(...pb.map((q) => deltaE(p.hex, q.hex)));
      s += d * p.pct; w += p.pct;
    }
    return s / (w || 1);
  }

  /** Visually and semantically similar assets: tags, roles, style, category and measured palette. */
  similar(id, { limit = 8, by = 'all' } = {}) {
    const a = this.get(id);
    if (!a) return [];
    const ta = this.#tagSet(a);
    const out = [];
    for (const b of this.assets) {
      if (b === a || b.crop_of === a.id || a.crop_of === b.id) continue;
      const tb = this.#tagSet(b);
      let inter = 0;
      for (const t of ta) if (tb.has(t)) inter++;
      const jac = inter / (ta.size + tb.size - inter || 1);
      const pal = Math.max(0, 1 - this.#paletteDist(a, b) / 0.25);
      const score = by === 'palette' ? pal : by === 'content'
        ? jac + (a.category === b.category ? 0.15 : 0)
        : 0.55 * jac + 0.25 * pal + (a.category === b.category ? 0.12 : 0) + (a.type === b.type ? 0.05 : 0) + (a._d.surface === b._d.surface ? 0.03 : 0);
      out.push({ asset: b, score: Math.round(score * 1000) / 1000 });
    }
    return out.sort((x, y) => y.score - x.score).slice(0, limit);
  }

  /** Assets that actually use a colour (OKLab distance over measured swatches). */
  byColor(hex, { limit = 12, tolerance = 0.09, min_pct = 1.5, kind } = {}) {
    const h = normHex(hex);
    if (!h) throw new Error(`Not a hex colour: ${hex}`);
    const out = [];
    for (const a of this.assets) {
      if (kind && a.kind !== kind) continue;
      let best = null;
      const sets = [[null, a.palette_detail || []], ...Object.entries(a.variants || {}).map(([t, v]) => [t, v.palette_detail || []])];
      for (const [theme, det] of sets) for (const p of det) {
        if (p.pct < min_pct) continue;
        const d = deltaE(h, p.hex);
        if (!best || d < best.d) best = { d, hex: normHex(p.hex), pct: p.pct, theme };
      }
      if (best && best.d <= tolerance) out.push({ asset: a, match: best.hex, distance: Math.round(best.d * 1000) / 1000, area_pct: best.pct, ...(best.theme ? { theme: best.theme } : {}) });
    }
    return out.sort((x, y) => x.distance - y.distance || y.area_pct - x.area_pct).slice(0, limit);
  }

  facets() {
    const c = this.corpus;
    const ids = (k) => (c[k] || []).map((x) => ({ id: x.id, count: x.count, ...(x.label && x.label !== x.id ? { label: x.label } : {}), ...(x.blurb ? { blurb: x.blurb } : {}) }));
    const surfaces = {}, hues = {};
    for (const a of this.assets) {
      surfaces[a._d.surface] = (surfaces[a._d.surface] || 0) + 1;
      for (const h of a._d.hues) hues[h] = (hues[h] || 0) + 1;
    }
    return {
      categories: ids('categories'), types: ids('types'), roles: ids('roles'), styles: ids('styles'),
      tags: ids('tags').filter((t) => t.count >= 2), surfaces, hue_families: hues,
      kinds: { image: c.totals.images, video: c.totals.videos, with_motion_clip: c.totals.clips },
    };
  }

  stats() {
    const c = this.corpus;
    return {
      version: c.version, totals: c.totals,
      by_category: (c.categories || []).map((x) => ({ id: x.id, label: x.label, count: x.count })),
      top_roles: (c.roles || []).slice(0, 10), top_styles: (c.styles || []).slice(0, 10), top_tags: (c.tags || []).slice(0, 24),
      patterns: this.patterns().map((p) => ({ name: p.name, evidence: p.evidence_count })),
      provenance: {
        screens: 'Every screen is an original built in code for UI Hall, live and MIT licensed, in four themes.',
        descriptions: 'Each write-up is generated from the exact content the screen renders.',
        palettes: 'Measured: k-means over the rendered pixels, with area percentages.',
      },
    };
  }

  /** Patterns with evidence; optionally ranked by relevance to a topic. */
  patterns(about = '') {
    const all = matchPatterns(this.assets);
    let ranked = all.map((p) => ({ p, rel: 0 }));
    let hits = new Map();
    if (about.trim()) {
      hits = new Map(this.search({ query: about, limit: 300 }).results.map((r) => [r.asset.id, r.score]));
      const words = tokenize(about).map(stem);
      ranked = all.map((p) => {
        // mean of the best five matches, so a pattern with 300 loose examples can't outrank a specific one
        const evid = p.evidence.map((a) => hits.get(a.id) || 0).sort((x, y) => y - x).slice(0, 5).reduce((s, v) => s + v, 0);
        const text = tokenize(`${p.name} ${p.why}`).map(stem);
        const lex = words.filter((w) => text.includes(w)).length;
        return { p, rel: evid + lex * 2 };
      }).sort((x, y) => y.rel - x.rel);
    }
    return ranked.map(({ p, rel }) => {
      // with no topic, a stable per-pattern shuffle so each pattern shows its own evidence, not the corpus head
      const mix = (a) => { let h = 2166136261; for (const c of p.slug + a.id) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
      const ev = [...p.evidence].filter((a) => !a.crop_of).sort((x, y) => (hits.get(y.id) || 0) - (hits.get(x.id) || 0) || mix(x) - mix(y));
      return {
        slug: p.slug, name: p.name, why: p.why, build: p.build, relevance: Math.round(rel * 100) / 100,
        evidence_count: p.evidence.length, examples: ev.slice(0, 4),
      };
    });
  }

  /** Real palettes from the assets closest to a mood / product, each split into UI roles with contrast checks. */
  paletteFor({ mood = '', query = '', surface, category, count = 4 } = {}) {
    const q = `${mood} ${query}`.trim();
    const found = this.search({ query: query || mood, boost: query ? mood : '', limit: 60, surface, category, exclude_crops: true }).results.map((r) => r.asset);
    const pool = found.length ? found : this.filter(this.assets, { surface, category });
    const picks = [];
    const cands = [];
    for (const a of pool) {
      cands.push([a, a._d.roles]);
      for (const [th, v] of Object.entries(a.variants || {})) if (v.palette_detail && th !== a.themes?.[0]) cands.push([{ ...a, id: a.id, theme: th }, paletteRoles(v.palette_detail)]);
    }
    for (const [a, r] of cands) {
      if (!r || !r.accent) continue;
      if (picks.some((p) => deltaE(p.roles.accent, r.accent) < 0.06 && deltaE(p.roles.background, r.background) < 0.06)) continue;
      picks.push({ asset: a, roles: r });
      if (picks.length >= count) break;
    }
    const fam = {};
    for (const a of pool.slice(0, 30)) if (a._d.accent_family) fam[a._d.accent_family] = (fam[a._d.accent_family] || 0) + 1;
    return {
      query: q || null,
      evidence_size: pool.length,
      common_accent_families: Object.entries(fam).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([family, n]) => ({ family, assets: n })),
      palettes: picks.map(({ asset, roles }) => ({ source: asset, ...this.checkRoles(roles) })),
    };
  }

  checkRoles(r) {
    const c = (fg, bg) => wcag(contrast(fg, bg));
    return {
      roles: r,
      contrast: {
        text_on_background: c(r.text, r.background),
        muted_on_background: c(r.muted, r.background),
        ...(r.accent ? { on_accent_on_accent: c(r.on_accent, r.accent), accent_on_background: c(r.accent, r.background) } : {}),
      },
      fixes: r.accent && contrast(r.accent, r.background) < 3
        ? { accent_for_text_and_icons: fitContrast(r.accent, r.background, 4.5), note: 'Measured accent is fine as a fill, too weak as text on the background; use this nudged value for text/icons.' }
        : undefined,
    };
  }

  /** Turn an asset's measured palette (or explicit colours) into code-ready design tokens. */
  tokens({ id, colors, format = 'css', name = 'uh' } = {}) {
    let roles, source = null;
    if (id) {
      const a = this.get(id);
      if (!a) throw new Error(`Unknown asset id: ${id}`);
      roles = a._d.roles; source = a.id;
    } else if (colors?.length) {
      roles = paletteRoles(colors.map((hex, i) => ({ hex, pct: 100 / (i + 1) })));
    }
    if (!roles) throw new Error('Pass an asset id or a list of hex colours.');
    const accent = roles.accent || roles.text;
    const [aL, aC, aH] = toOklch(accent);
    const [bL, bC, bH0] = toOklch(roles.background);
    const bH = bC < 0.02 ? aH : bH0; // near-neutral grounds borrow the accent hue, so greys lean cool or warm on purpose
    const nC = bC < 0.02 ? 0.006 : 0.014;
    const steps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
    const Ls = [0.97, 0.93, 0.87, 0.79, 0.7, 0.62, 0.54, 0.46, 0.38, 0.3, 0.22];
    const ramp = (C, H) => Object.fromEntries(steps.map((s, i) => [s, fromOklch([Ls[i], C * (1 - Math.abs(Ls[i] - 0.62) * 0.9), H])]));
    const accentRamp = ramp(Math.max(aC, 0.04), aH);
    const neutralRamp = ramp(nC, bH);
    const t = {
      color: {
        background: roles.background, surface: roles.surface, text: roles.text, 'text-muted': fitContrast(roles.muted, roles.background, 4.5),
        accent, 'on-accent': bestInk(accent), border: fromOklch([bL + (bL > 0.5 ? -0.09 : 0.1), nC, bH]),
      },
      accent: accentRamp, neutral: neutralRamp,
      radius: { sm: '8px', md: '12px', lg: '20px', pill: '999px' },
      space: { 1: '4px', 2: '8px', 3: '12px', 4: '16px', 5: '24px', 6: '32px', 7: '48px', 8: '64px' },
    };
    const flat = [];
    for (const [g, obj] of Object.entries(t)) for (const [k, v] of Object.entries(obj)) flat.push([g === 'color' ? k : `${g}-${k}`, v, g]);
    let code;
    if (format === 'tailwind') {
      code = `// tailwind.config.js — generated by UI Hall${source ? ` from ${source}` : ''}\nexport default {\n  theme: {\n    extend: {\n      colors: ${JSON.stringify({ ...t.color, accent: { DEFAULT: accent, ...accentRamp }, neutral: neutralRamp }, null, 2).replace(/\n/g, '\n      ')},\n      borderRadius: ${JSON.stringify(t.radius)},\n    },\n  },\n};\n`;
    } else if (format === 'json' || format === 'dtcg') {
      const dt = {};
      for (const [g, obj] of Object.entries(t)) {
        dt[g] = {};
        for (const [k, v] of Object.entries(obj)) dt[g][k] = { $value: v, $type: g === 'color' || g === 'accent' || g === 'neutral' ? 'color' : 'dimension' };
      }
      code = JSON.stringify(dt, null, 2);
    } else if (format === 'swiftui') {
      const sw = (hex) => { const n = parseInt(hex.slice(1), 16); const f = (v) => (v / 255).toFixed(3); return `Color(red: ${f((n >> 16) & 255)}, green: ${f((n >> 8) & 255)}, blue: ${f(n & 255)})`; };
      code = `import SwiftUI\n\n// Generated by UI Hall${source ? ` from ${source}` : ''}\nextension Color {\n${Object.entries(t.color).map(([k, v]) => `    static let ${name}${k.replace(/(^|-)(\w)/g, (_, __, c) => c.toUpperCase())} = ${sw(v)} // ${v}`).join('\n')}\n}\n`;
    } else if (format === 'compose') {
      code = `// Generated by UI Hall${source ? ` from ${source}` : ''}\nimport androidx.compose.ui.graphics.Color\n\nobject ${name.toUpperCase()}Colors {\n${Object.entries(t.color).map(([k, v]) => `    val ${k.replace(/-(\w)/g, (_, c) => c.toUpperCase())} = Color(0xFF${v.slice(1)})`).join('\n')}\n}\n`;
    } else {
      code = `/* Generated by UI Hall${source ? ` from ${source}` : ''} — scheme: ${roles.scheme} */\n:root {\n${flat.map(([k, v]) => `  --${name}-${k}: ${v};`).join('\n')}\n}\n`;
    }
    return { source, scheme: roles.scheme, tokens: t, contrast: this.checkRoles(roles).contrast, format, code };
  }

  /** Everything needed to start a screen: references, patterns, palettes and a checklist. */
  brief({ screen, platform, mood = '', surface, limit = 6 } = {}) {
    if (!screen) throw new Error('Describe the screen, e.g. "onboarding for a sleep-tracking app".');
    const q = `${screen} ${mood}`;
    const text = q.toLowerCase();
    const surf = surface || (/\bdark\b/.test(text) ? 'dark' : /\blight\b/.test(text) ? 'light' : undefined);
    const cat = platform === 'web' ? ['website', 'dashboard', 'design-system', 'motion-demo', 'before-after']
      : platform ? ['mobile-app-ui', 'app-store-screens', 'motion-demo', 'before-after', 'design-system'] : undefined;
    const base = { query: screen, boost: mood, prefer_surface: surf, exclude_crops: true };
    let refs = this.search({ ...base, limit: limit * 3, category: cat }).results.filter((r) => r.asset.category !== 'promo-reel');
    if (refs.length < limit) refs = refs.concat(this.search({ ...base, limit: limit * 3 }).results.filter((r) => !refs.some((x) => x.asset === r.asset)));
    const references = refs.slice(0, limit);
    const motion = this.search({ ...base, limit: 6, has_motion: true }).results.filter((r) => !references.some((x) => x.asset === r.asset)).slice(0, 3);
    const roleHits = new Set(references.flatMap((r) => r.asset.roles || []));
    const words = new Set(tokenize(screen).map(stem));
    const guide = Object.entries(ROLE_GUIDE).filter(([k, g]) => words.has(k) || g.aliases.some((x) => words.has(x)) || (roleHits.has(k) && references[0]?.asset.roles?.includes(k)));
    return {
      screen, platform: platform || null, mood: mood || null, surface: surf || 'either',
      references,
      motion_references: motion,
      patterns: this.patterns(q).slice(0, 4),
      palettes: this.paletteFor({ query: screen, mood, surface: surf, count: 3 }).palettes,
      guidance: guide.slice(0, 2).map(([k, g]) => ({ role: k, do: g.do, avoid: g.avoid })),
      checklist: [
        'Name the one primary action; it gets the only filled button.',
        'Pick the dominant element and make it at least 2× the size of the next.',
        'Take literal hex values from a reference palette; check text contrast ≥ 4.5:1.',
        'Use one type family for UI, a second only for display, and a 4/8px spacing scale.',
        'Design the empty, loading and error state before calling it done.',
      ],
    };
  }

  /** Side-by-side: what 2–4 references share, where they differ, and their colour roles. */
  compare(ids = []) {
    const list = [...new Set(ids.map((i) => String(i).toUpperCase()))].map((i) => this.get(i)).filter(Boolean);
    if (list.length < 2) throw new Error('Pass 2–4 valid ids.');
    const sets = (k) => list.map((a) => new Set(a[k] || []));
    const shared = (k) => [...sets(k)[0]].filter((v) => sets(k).every((s) => s.has(v)));
    const only = (k) => list.map((a, i) => ({ id: a.id, values: [...sets(k)[i]].filter((v) => !sets(k).every((s) => s.has(v))) }));
    const pair = [];
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      pair.push({ a: list[i].id, b: list[j].id, palette_distance: Math.round(this.#paletteDist(list[i], list[j]) * 1000) / 1000 });
    }
    return {
      assets: list,
      shared: { roles: shared('roles'), style: shared('style'), tags: shared('tags') },
      distinct: { roles: only('roles'), style: only('style'), tags: only('tags') },
      colour: list.map((a) => ({ id: a.id, surface: a._d.surface, ...(a._d.roles ? this.checkRoles(a._d.roles) : {}) })),
      palette_distance: pair,
    };
  }

  /**
   * A complete starter design system: colour roles + ramps from a measured palette,
   * a type scale and pairing chosen from the reference's style, spacing, radius,
   * elevation and motion tokens, and base component CSS that uses them.
   */
  designSystem({ id, colors, mood = '', name = 'uh' } = {}) {
    const t = this.tokens({ id, colors, format: 'css', name });
    const a = id ? this.get(id) : null;
    const style = new Set([...(a?.style || []), ...(a?.tags || []), ...tokenize(mood)]);
    const has = (...xs) => xs.some((x) => style.has(x));
    const serif = has('serif', 'editorial', 'luxury', 'premium', 'elegant', 'calm');
    const playful = has('playful', 'rounded', 'mascot', 'illustration-led', 'fun');
    const dense = has('data-dense', 'dashboard', 'data-table', 'kpi');
    const ratio = dense ? 1.2 : serif ? 1.333 : 1.25;
    const base = dense ? 14 : 16;
    const steps = ['xs', 'sm', 'base', 'md', 'lg', 'xl', '2xl', '3xl', '4xl'];
    const scale = Object.fromEntries(steps.map((k, i) => [k, `${Math.round(base * ratio ** (i - 2) * 10) / 10}px`]));
    const r = playful ? { sm: '10px', md: '16px', lg: '28px' } : has('brutalist', 'flat') ? { sm: '2px', md: '4px', lg: '8px' } : { sm: '8px', md: '12px', lg: '20px' };
    const type = {
      display: serif ? "'Instrument Serif', 'Iowan Old Style', Georgia, serif" : playful ? "'Bricolage Grotesque', system-ui, sans-serif" : "'Inter Tight', system-ui, sans-serif",
      body: dense ? "'Inter', system-ui, sans-serif" : "'Inter Tight', system-ui, sans-serif",
      mono: "'JetBrains Mono', ui-monospace, monospace",
      rationale: serif ? 'Serif display over a neutral sans — the reference reads editorial/calm.' : playful ? 'A characterful grotesque for display — the reference is playful/rounded.' : dense ? 'One tight sans at a smaller base with a 1.2 ratio — the reference is data-dense.' : 'One neutral grotesque throughout — the reference is restrained.',
    };
    const c = t.tokens.color, p = `--${name}`;
    const css = `/* Design system generated by UI Hall${t.source ? ` from ${t.source}` : ''} · ${t.scheme} scheme
   ${type.rationale} Type ratio ${ratio}, base ${base}px. Contrast: text ${t.contrast.text_on_background.ratio}:1. */
:root {
${t.code.split('\n').filter((l) => l.trim().startsWith('--')).join('\n')}
  ${p}-font-display: ${type.display};
  ${p}-font-body: ${type.body};
  ${p}-font-mono: ${type.mono};
${Object.entries(scale).map(([k, v]) => `  ${p}-text-${k}: ${v};`).join('\n')}
  ${p}-leading-tight: 1.1; ${p}-leading-body: 1.55;
  ${p}-r-sm: ${r.sm}; ${p}-r-md: ${r.md}; ${p}-r-lg: ${r.lg}; ${p}-r-pill: 999px;
  ${p}-shadow-1: 0 1px 2px rgb(0 0 0 / .06), 0 1px 1px rgb(0 0 0 / .04);
  ${p}-shadow-2: 0 12px 32px -12px rgb(0 0 0 / .22);
  ${p}-ease-out: cubic-bezier(.16, 1, .3, 1); ${p}-ease-in-out: cubic-bezier(.65, 0, .35, 1);
  ${p}-dur-fast: 150ms; ${p}-dur-med: 250ms; ${p}-dur-slow: 450ms;
}

body { background: var(${p}-background); color: var(${p}-text); font: var(${p}-text-base)/var(${p}-leading-body) var(${p}-font-body); }
h1, h2, h3 { font-family: var(${p}-font-display); line-height: var(${p}-leading-tight); letter-spacing: -0.02em; font-weight: ${serif ? 400 : 650}; }
h1 { font-size: var(${p}-text-4xl); } h2 { font-size: var(${p}-text-2xl); } h3 { font-size: var(${p}-text-lg); }
.muted { color: var(${p}-text-muted); }

.btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 44px; padding: 0 18px; border: 0; border-radius: var(${p}-r-${playful ? 'lg' : 'md'}); font: 600 var(${p}-text-sm)/1 var(${p}-font-body); cursor: pointer; transition: transform var(${p}-dur-fast) var(${p}-ease-out), filter var(${p}-dur-fast); }
.btn:active { transform: scale(.97); }
.btn-primary { background: var(${p}-accent); color: var(${p}-on-accent); }
.btn-primary:hover { filter: brightness(1.06); }
.btn-ghost { background: transparent; color: var(${p}-text); box-shadow: inset 0 0 0 1px var(${p}-border); }
.card { background: var(${p}-surface); border-radius: var(${p}-r-lg); padding: 20px; box-shadow: ${t.scheme === 'dark' ? `inset 0 0 0 1px var(${p}-border)` : `var(${p}-shadow-1)`}; }
.input { width: 100%; min-height: 44px; padding: 0 14px; border-radius: var(${p}-r-md); border: 1px solid var(${p}-border); background: var(${p}-background); color: var(${p}-text); font: inherit; }
.input:focus { outline: none; border-color: var(${p}-accent); box-shadow: 0 0 0 4px color-mix(in oklab, var(${p}-accent) 22%, transparent); }
.chip { display: inline-flex; align-items: center; height: 32px; padding: 0 12px; border-radius: var(${p}-r-pill); background: var(${p}-surface); color: var(${p}-text-muted); font-size: var(${p}-text-sm); white-space: nowrap; }
.chip[aria-pressed="true"] { background: var(${p}-text); color: var(${p}-background); }
:focus-visible { outline: 2px solid var(${p}-accent); outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) { * { transition-duration: 1ms !important; animation-duration: 1ms !important; } }
`;
    return { source: t.source, scheme: t.scheme, type: { ...type, base, ratio, scale }, radius: r, contrast: t.contrast, tokens: t.tokens, css };
  }

  beforeAfter({ topic = '', limit = 6 } = {}) {
    const res = this.search({ query: `${topic} before after redesign`, limit: 100 }).results
      .filter((r) => r.asset.category === 'before-after' || r.asset.tags?.includes('before-after') || r.asset.tags?.includes('redesign'));
    return res.slice(0, limit);
  }

  /* -------------------------------------------------------- projections -- */

  url(a, which = 'page') {
    if (which === 'page') return `${this.site}#/a/${a.id}`;
    const rel = which === 'thumb' ? a.thumb : which === 'clip' ? a.clip : a.src;
    return rel ? this.site + rel : null;
  }

  /** Compact card: enough to judge relevance without blowing the context window. */
  card(a, extra = {}) {
    const sentences = (a.description || '').split(/(?<=[.!?])\s+(?=[A-Z'"‘“(])/);
    return {
      id: a.id, title: a.title, kind: a.kind, category: a.category, type: a.type,
      ...(a.roles?.length ? { roles: a.roles } : {}), style: a.style, tags: (a.tags || []).slice(0, 8),
      summary: sentences.slice(0, 2).join(' ').trim(),
      surface: a._d.surface, accent: a._d.accent, palette: (a.palette || []).slice(0, 5),
      ...(a.clip ? { motion: true } : {}), ...(a.crop_of ? { crop_of: a.crop_of } : {}), ...(a.original ? { original: true, license: 'MIT', source_html: a.source_html } : {}),
      url: this.url(a), image: this.url(a, 'thumb'),
      ...extra,
    };
  }

  /** The full record, with derived colour roles and contrast. */
  full(a) {
    const { _d, origin, ...rest } = a;
    return {
      ...rest,
      surface: _d.surface,
      colour_roles: _d.roles ? this.checkRoles(_d.roles) : null,
      palette_detail: (a.palette_detail || []).map((p) => ({ ...p, family: hueFamily(p.hex) })),
      printed_palette: this.corpus.printed_palettes?.[a.id],
      url: this.url(a), image: this.url(a, 'src'), thumbnail: this.url(a, 'thumb'), ...(a.clip ? { clip: this.url(a, 'clip') } : {}),
      source_file: origin?.path,
      ...(a.live ? { live_url: this.site + a.live, themes: a.themes, license: 'MIT' } : {}),
    };
  }
}

/* What good looks like per screen role — distilled from the corpus examples. */
export const ROLE_GUIDE = {
  onboarding: { aliases: ['welcome', 'intro', 'walkthrough'],
    do: ['One promise per step, one visual, one primary CTA in the thumb zone.', 'Show progress (dots or a bar) and let people skip.', 'Ask for permissions in context, after showing value.'],
    avoid: ['More than three steps before the product is usable.', 'Feature lists disguised as onboarding.'] },
  auth: { aliases: ['login', 'signin', 'signup', 'register', 'sign'],
    do: ['Social / passkey options first, email second.', 'Show password rules before the error, not after.', 'Keep the brand moment small; the form is the hero.'],
    avoid: ['Two primary buttons of equal weight.', 'Placeholder-only labels.'] },
  dashboard: { aliases: ['analytics', 'overview', 'admin', 'metrics'],
    do: ['Lead with the one number that answers "am I OK?".', 'Group metrics in a consistent grid; colour only for status.', 'Default to a sensible time range with a segmented switch.'],
    avoid: ['Charts without a takeaway label.', 'Rainbow categorical colours for unrelated series.'] },
  home: { aliases: ['main'],
    do: ['Show the user’s current state first, actions second.', 'Make the most frequent action reachable in one tap.'],
    avoid: ['A marketing carousel as the first thing a returning user sees.'] },
  checkout: { aliases: ['payment', 'cart', 'pay'],
    do: ['Total always visible; one pinned primary button.', 'Summarise, then collect — express pay first.'],
    avoid: ['Surprise fees at the last step.', 'Leaving the flow to create an account.'] },
  pricing: { aliases: ['plans', 'paywall', 'subscription'],
    do: ['Three tiers max with the recommended one visually anchored.', 'Annual / monthly toggle near the prices it changes.'],
    avoid: ['Feature matrices longer than the screen without grouping.'] },
  settings: { aliases: ['preferences'],
    do: ['Grouped list rows with clear section headers.', 'Toggles apply instantly; destructive actions at the bottom, in red.'],
    avoid: ['Save buttons for instant settings.'] },
  'empty-state': { aliases: ['empty', 'zero'],
    do: ['Explain what will appear here and give one action to make it happen.'],
    avoid: ['A grey "No data" with no next step.'] },
  'landing-section': { aliases: ['landing', 'homepage', 'marketing', 'website', 'saas'],
    do: ['Headline that states the outcome, one sentence of support, one primary CTA.', 'Social proof directly under the hero.', 'A real product visual above the fold.'],
    avoid: ['Abstract gradient blobs instead of the product.', 'Four CTAs in the hero.'] },
  chat: { aliases: ['assistant', 'ai', 'messaging', 'agent'],
    do: ['Anchored composer; suggestions only in the empty state.', 'Stream responses; show tool activity as quiet inline status.'],
    avoid: ['Bubbles for long assistant answers — use full width.'] },
  detail: { aliases: ['product', 'item'],
    do: ['Media first, key facts in a scannable block, one sticky primary action.'],
    avoid: ['Burying the price or availability below the fold.'] },
  list: { aliases: ['feed', 'inbox'],
    do: ['Consistent row anatomy: leading visual, two lines of text, trailing meta.', 'Filters as a scrollable chip row above the list.'],
    avoid: ['Cards when rows would do — cards cost density.'] },
  profile: { aliases: ['account'],
    do: ['Identity at the top, stats as a compact row, content below.'],
    avoid: ['Settings mixed into the profile surface.'] },
  search: { aliases: ['find', 'explore'],
    do: ['Recent and suggested queries in the empty state.', 'Results update as you type; filters as chips.'],
    avoid: ['A search page that is blank until you type.'] },
};

export { PATTERNS };
