#!/usr/bin/env node
/**
 * stormy.mjs — drive the design corpus from the command line.
 *
 * Exists so the skill works with or without the MCP server connected. Same
 * corpus file, same vocabulary, same output shape as the MCP tools.
 *
 *   node scripts/stormy.mjs facets [--limit 40]
 *   node scripts/stormy.mjs search "dark crypto wallet" [--surface dark] [--limit 8]
 *   node scripts/stormy.mjs asset IMG-0055 [--markdown]
 *   node scripts/stormy.mjs brief "onboarding for a sleep tracker" [--platform ios]
 *   node scripts/stormy.mjs palette "warm and quiet" [--surface dark]
 *   node scripts/stormy.mjs compare "wallet"
 *   node scripts/stormy.mjs image IMG-0055
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

/* ------------------------------------------------------------- corpus ---- */

function findCorpus() {
  const home = process.env.USERPROFILE || process.env.HOME || '';
  // HERE is skills/stormy-design/scripts, so the repo root is three levels up.
  const candidates = [
    process.env.STORMY_CORPUS,
    path.resolve(HERE, '..', '..', '..', 'ui-hall', 'data', 'corpus.json'),
    path.resolve(HERE, '..', '..', 'ui-hall', 'data', 'corpus.json'),
    path.resolve(HERE, '..', 'corpus.json'),
    path.resolve(HERE, 'corpus.json'),
    home && path.join(home, 'Stormy', 'ui-hall', 'data', 'corpus.json'),
  ].filter(Boolean);
  for (const c of candidates) if (fs.existsSync(c)) return c;
  console.error(
    'Corpus not found. Looked in:\n' + candidates.map((c) => '  ' + c).join('\n') +
    '\nSet STORMY_CORPUS to the file path, or build it with tools/build_corpus.py.'
  );
  process.exit(2);
}

const corpusFile = findCorpus();
const corpus = JSON.parse(fs.readFileSync(corpusFile, 'utf8'));
const ROOT = path.resolve(path.dirname(corpusFile), '..');

/* -------------------------------------------------------------- args ----- */

const argv = process.argv.slice(2);
const cmd = argv[0];
const flags = {};
const positional = [];
for (let i = 1; i < argv.length; i++) {
  const a = argv[i];
  if (a.startsWith('--')) {
    const [k, v] = a.slice(2).split('=');
    if (v !== undefined) flags[k] = v;
    else if (argv[i + 1] && !argv[i + 1].startsWith('--')) flags[k] = argv[++i];
    else flags[k] = true;
  } else positional.push(a);
}

const listFlag = (k) => (flags[k] ? String(flags[k]).split(',') : undefined);

/* ----------------------------------------------------------- helpers ----- */

const lc = (s) => String(s ?? '').toLowerCase();
const STOP = new Set(['a','an','the','for','of','to','and','or','with','in','on','that','this','is','are','be','it','as','at','by','my','i','want','need','app','screen','page','design','ui','ux']);
const terms = (t) => lc(t).split(/[^a-z0-9+#]+/).filter((x) => x.length > 1 && !STOP.has(x)).slice(0, 12);

function rgb(hex) {
  const h = String(hex || '').replace('#', '');
  const v = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(v.slice(0, 6), 16);
  return Number.isFinite(n) ? { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 } : null;
}
const lum = (hex) => { const c = rgb(hex); return c ? 0.299 * c.r / 2.55 + 0.587 * c.g / 2.55 + 0.114 * c.b / 2.55 : 50; };
function ratio(a, b) {
  const f = (v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
  const L = (x) => { const c = rgb(x); return c ? 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b) : 0; };
  const hi = Math.max(L(a), L(b)), lo = Math.min(L(a), L(b));
  return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100;
}
function deriveSurface(a) {
  const pal = a.palette_detail || [];
  if (!pal.length) return 'mid';
  const d = pal.filter((p) => lum(p.hex) < 38).reduce((s, p) => s + p.pct, 0);
  const l = pal.filter((p) => lum(p.hex) > 72).reduce((s, p) => s + p.pct, 0);
  return d >= 45 ? 'dark' : l >= 45 ? 'light' : 'mid';
}
function score(a, t) {
  if (!t.length) return 1;
  const title = lc(a.title), desc = lc(a.description);
  const tags = (a.tags || []).map(lc), styles = (a.style || []).map(lc), roles = (a.roles || []).map(lc);
  let s = 0;
  for (const x of t) {
    if (title.includes(x)) s += 8;
    if (roles.includes(x)) s += 7;
    if (tags.includes(x)) s += 6; else if (tags.some((y) => y.includes(x))) s += 3;
    if (styles.includes(x)) s += 4; else if (styles.some((y) => y.includes(x))) s += 2;
    if (desc.includes(x)) s += 2;
    if (lc(a.category) === x) s += 6;
  }
  return s;
}

const C = {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  b: (s) => `\x1b[1m${s}\x1b[0m`,
  c: (s) => `\x1b[36m${s}\x1b[0m`,
  y: (s) => `\x1b[33m${s}\x1b[0m`,
  g: (s) => `\x1b[32m${s}\x1b[0m`,
  r: (s) => `\x1b[31m${s}\x1b[0m`,
};

function swatchLine(hex, label) {
  const c = rgb(hex);
  const block = c ? `\x1b[48;2;${c.r};${c.g};${c.b}m      \x1b[0m` : '';
  return `  ${block} ${hex} ${C.dim(label || '')}`;
}
const briefLine = (a) => `${C.c(a.id)} ${C.b(a.title)}\n      ${C.dim(a.category + ' · ' + a.type + (a.clip ? ' · motion clip' : ''))}`;

/* ----------------------------------------------------------- commands ---- */

const cmds = {
  facets() {
    const cap = (arr) => arr.slice(0, parseInt(flags.limit, 10) || 40);
    console.log(C.b('\ncategories'));
    for (const c of cap(corpus.categories)) console.log(`  ${String(c.count).padStart(4)}  ${c.id.padEnd(18)} ${C.dim(c.label)}`);
    console.log(C.b('\nroles'));
    for (const r of cap(corpus.roles)) console.log(`  ${String(r.count).padStart(4)}  ${r.id}`);
    console.log(C.b('\nstyles'));
    for (const s of cap(corpus.styles)) console.log(`  ${String(s.count).padStart(4)}  ${s.id}`);
    console.log(C.b('\ntags'));
    for (const t of cap(corpus.tags)) console.log(`  ${String(t.count).padStart(4)}  ${t.id}`);
    console.log(C.dim(`\n  ${corpus.tags.length} tags total · corpus at ${corpusFile}`));
  },

  search() {
    const q = positional.join(' ');
    const t = terms(q);
    const limit = parseInt(flags.limit, 10) || 10;
    let pool = corpus.assets;
    if (flags.category) pool = pool.filter((a) => listFlag('category').some((c) => lc(a.category) === lc(c)));
    if (flags.role) pool = pool.filter((a) => listFlag('role').some((r) => (a.roles || []).some((x) => lc(x) === lc(r))));
    if (flags.style) pool = pool.filter((a) => listFlag('style').some((s) => (a.style || []).some((x) => lc(x) === lc(s))));
    if (flags.tag) pool = pool.filter((a) => listFlag('tag').some((s) => (a.tags || []).some((x) => lc(x) === lc(s))));
    if (flags.surface) pool = pool.filter((a) => listFlag('surface').includes(deriveSurface(a)));
    if (flags.orientation) pool = pool.filter((a) => listFlag('orientation').includes(a.orientation));
    if (flags.motion) pool = pool.filter((a) => !!a.clip);

    const ranked = pool.map((a) => ({ a, s: score(a, t) })).filter((x) => x.s > 0).sort((x, y) => y.s - x.s);
    console.log(C.b(`\n"${q}" — ${ranked.length} matches, showing ${Math.min(limit, ranked.length)}\n`));
    for (const { a } of ranked.slice(0, limit)) {
      console.log(briefLine(a));
      console.log(`      ${(a.description || '').split('. ').slice(0, 2).join('. ').slice(0, 260)}`);
      if (a.palette?.length) {
        const c = a.palette.slice(0, 5).map((h) => { const x = rgb(h); return `\x1b[48;2;${x.r};${x.g};${x.b}m   \x1b[0m`; }).join('');
        console.log(`      ${c} ${C.dim(a.palette.slice(0, 5).join(' '))}`);
      }
      console.log();
    }
    if (!ranked.length) console.log(C.dim('  nothing matched — try `facets` to see the vocabulary\n'));
  },

  asset() {
    const a = corpus.assets.find((x) => x.id === lc(positional[0]) || x.id === positional[0]);
    if (!a) {
      const near = corpus.assets.filter((x) => lc(x.id).includes(lc(positional[0] || ''))).slice(0, 5);
      console.error(C.r(`no asset ${positional[0]}`) + (near.length ? `\n  did you mean: ${near.map((n) => n.id).join(', ')}` : ''));
      process.exit(1);
    }
    if (flags.markdown) return cmds.assetMarkdown(a);

    console.log(`\n${C.b(a.title)}`);
    console.log(C.dim(`${a.id} · ${a.category} · ${a.type} · ${a.kind}`));
    console.log(`\n${a.description || C.y('(no hand-written description)')}`);
    if (a.quality) console.log(`\n${C.y('Salvage note.')} ${a.quality}`);
    if (a.palette_detail?.length) {
      console.log(C.b('\npalette (measured from pixels)'));
      for (const p of a.palette_detail.slice(0, 8)) {
        console.log(swatchLine(p.hex, `${String(p.pct).padStart(5)}%  on-white ${ratio(p.hex, '#FFFFFF')}:1`));
      }
    }
    console.log(C.b('\ndetails'));
    if (a.w) console.log(`  ${C.dim('dimensions')} ${a.w}×${a.h} (${a.orientation})`);
    if (a.kind === 'video') {
      console.log(`  ${C.dim('motion')} ${a.duration_s}s @ ${a.fps}fps · frame-diff ${a.motion} · clip ${a.clip ? C.g('yes') : C.y('not shipped (static source)')}`);
    }
    if (a.roles?.length) console.log(`  ${C.dim('roles')} ${a.roles.join(', ')}`);
    if (a.style?.length) console.log(`  ${C.dim('style')} ${a.style.join(', ')}`);
    if (a.tags?.length) console.log(`  ${C.dim('tags')} ${a.tags.join(', ')}`);
    console.log(`  ${C.dim('web image')} ${path.resolve(ROOT, a.src).replace(/\\/g, '/')}`);
    console.log(`  ${C.dim('original')} ${a.origin?.path}`);
    console.log();
  },

  assetMarkdown(a) {
    const d = (a.palette_detail || []).map((p) => ({
      hex: p.hex, area_pct: p.pct,
      contrast_on_white: ratio(p.hex, '#FFFFFF'), contrast_on_black: ratio(p.hex, '#000000'),
    }));
    const L = [];
    L.push(`# ${a.title}`, '', `\`${a.id}\` · ${a.category} · ${a.type} · ${a.kind}`, '', a.description || '');
    if (a.quality) L.push('', `> **Salvage note.** ${a.quality}`);
    if (d.length) {
      L.push('', '## Palette (measured)', '', '| Hex | Area | On white | On black |', '| --- | --- | --- | --- |');
      for (const p of d) L.push(`| \`${p.hex}\` | ${p.area_pct}% | ${p.contrast_on_white}:1 | ${p.contrast_on_black}:1 |`);
    }
    if (a.tags?.length) L.push('', `**Tags** ${a.tags.join(', ')}`);
    L.push('', `**Files** ${path.resolve(ROOT, a.src).replace(/\\/g, '/')}`);
    console.log(L.join('\n'));
  },

  brief() {
    const screen = positional.join(' ');
    const t = terms(screen);
    const mood = terms(flags.mood || '');
    const nEx = parseInt(flags.examples, 10) || 6;

    const ranked = corpus.assets
      .map((a) => {
        let s = score(a, t) + score(a, mood) * 0.7;
        if (flags.platform && flags.platform !== 'any') {
          const hay = lc((a.tags || []).join(' ') + ' ' + (a.platform || ''));
          if (hay.includes(lc(flags.platform))) s += 3;
        }
        if (flags.dark === true || flags.dark === 'true') { if (deriveSurface(a) === 'dark') s += 3; }
        if (flags.light === true || flags.light === 'true') { if (deriveSurface(a) === 'light') s += 3; }
        if (a.description) s += 0.6;
        if (a.category === 'before-after') s += 0.8;
        return { a, s };
      })
      .filter((x) => x.s > 0)
      .sort((x, y) => y.s - x.s);

    console.log(C.b(`\nbrief: ${screen}`));
    console.log(C.dim(`${ranked.length} relevant assets in the corpus\n`));

    const top = ranked.slice(0, nEx).map((x) => x.a);
    console.log(C.b('examples'));
    for (const a of top) {
      console.log(briefLine(a));
      console.log(`      ${(a.description || '').slice(0, 240)}`);
      if (a.palette?.length) {
        const sw = a.palette.slice(0, 5).map((h) => { const x = rgb(h); return `\x1b[48;2;${x.r};${x.g};${x.b}m   \x1b[0m`; }).join('');
        console.log(`      ${sw}`);
      }
      console.log();
    }

    const weigh = new Map();
    for (const [i, ref] of ranked.slice(0, 16).entries()) {
      const decay = 1 / (1 + i * 0.35);
      for (const p of ref.a.palette_detail || []) {
        if (p.pct < 2) continue;
        const cur = weigh.get(p.hex) || { hex: p.hex, w: 0, n: 0 };
        cur.w += p.pct * decay; cur.n += 1;
        weigh.set(p.hex, cur);
      }
    }
    console.log(C.b('recurring colours'));
    for (const c of [...weigh.values()].sort((x, y) => y.w - x.w).slice(0, 10)) {
      console.log(swatchLine(c.hex, `in ${c.n} of the top matches`));
    }

    const surface = top.filter((a) => deriveSurface(a) === 'dark').length;
    console.log(C.b('\nnotes'));
    if (top.length) {
      if (surface >= top.length * 0.6) console.log(`  · ${surface} of ${top.length} close matches are dark-surface`);
      if (surface === 0 && top.length >= 3) console.log(`  · all ${top.length} close matches are light-surface`);
      const clips = top.filter((a) => a.clip).length;
      if (clips) console.log(`  · ${clips} ship a motion clip if transitions matter`);
    }
    if (!ranked.length) console.log(C.y('  · nothing relevant — design from first principles and say so'));
    console.log();
  },

  palette() {
    const mood = positional.join(' ');
    const t = terms(mood);
    const n = parseInt(flags.count, 10) || 4;
    const named = corpus.assets.filter((a) => a.category === 'color-palette');
    const ranked = named.map((a) => {
      const text = lc(a.title + ' ' + a.description);
      let s = 1 + t.reduce((x, k) => x + (text.includes(k) ? 4 : 0), 0);
      if (flags.surface === 'dark' && lum(a.palette?.[0] || '#fff') < 45) s += 2;
      if (flags.surface === 'light' && lum(a.palette?.[0] || '#000') > 60) s += 2;
      return { a, s };
    }).sort((x, y) => y.s - x.s);

    console.log(C.b(`\npalette brief: ${mood}${flags.surface ? ' · ' + flags.surface : ''}`));
    console.log(C.b('\nnamed schemes'));
    for (const { a } of ranked.slice(0, n)) {
      const [x, y] = a.palette || [];
      console.log(`\n  ${C.b(a.title)}`);
      if (x) console.log(swatchLine(x));
      if (y) console.log(swatchLine(y));
      if (x && y) {
        const r = ratio(x, y);
        const v = r >= 4.5 ? C.g('AA body text') : r >= 3 ? C.y('AA large text only') : C.r('decorative only');
        console.log(`  ${C.dim('pair contrast')} ${r}:1 — ${v}`);
      }
      console.log(`  ${C.dim((a.description || '').slice(0, 200))}`);
    }

    const pool = corpus.assets.filter((a) => a.category !== 'color-palette');
    const weigh = new Map();
    for (const a of pool) {
      const s = score(a, t);
      if (s <= 0) continue;
      for (const p of a.palette_detail || []) {
        if (p.pct < 4) continue;
        const cur = weigh.get(p.hex) || { hex: p.hex, w: 0, n: 0 };
        cur.w += p.pct * (1 + s * 0.1); cur.n += 1;
        weigh.set(p.hex, cur);
      }
    }
    const obs = [...weigh.values()].sort((x, y) => y.w - x.w).slice(0, 12);
    if (obs.length) {
      console.log(C.b('\ncolours that actually occur in matching screens'));
      for (const c of obs) console.log(swatchLine(c.hex, `in ${c.n} screens`));
    }
    console.log();
  },

  compare() {
    const topic = positional.join(' ');
    const t = terms(topic);
    const ba = corpus.assets.filter((a) => a.category === 'before-after');
    const ranked = ba.map((a) => ({ a, s: t.length ? score(a, t) : 1 })).filter((x) => x.s > 0).sort((x, y) => y.s - x.s);
    console.log(C.b(`\ncomparisons about "${topic}" — ${ranked.length} of ${ba.length}\n`));
    for (const { a } of ranked.slice(0, parseInt(flags.limit, 10) || 5)) {
      console.log(briefLine(a));
      console.log(`      ${a.description}`);
      console.log();
    }
  },

  image() {
    const a = corpus.assets.find((x) => x.id === positional[0]);
    if (!a) { console.error(C.r(`no asset ${positional[0]}`)); process.exit(1); }
    console.log(`web    ${path.resolve(ROOT, a.src).replace(/\\/g, '/')}`);
    console.log(`thumb  ${path.resolve(ROOT, a.thumb).replace(/\\/g, '/')}`);
    if (a.clip) console.log(`clip   ${path.resolve(ROOT, a.clip).replace(/\\/g, '/')}`);
    console.log(`source ${a.origin?.path}`);
  },
};

/* -------------------------------------------------------------- main ----- */

if (!cmd || !cmds[cmd]) {
  console.log(`stormy — design corpus CLI

  facets                      vocabulary and counts
  search <query>              find assets (--category --role --style --tag --surface --motion --limit)
  asset <id>                  full write-up (--markdown)
  brief <screen>              synthesised design brief (--platform --mood --dark --examples)
  palette <mood>              colour schemes (--surface --count)
  compare <topic>             before/after evidence
  image <id>                  resolve file paths

corpus: ${corpusFile}
assets: ${corpus.totals.assets} (${corpus.totals.described} described, ${corpus.totals.clips} motion clips)`);
  process.exit(cmd ? 1 : 0);
}

cmds[cmd]();
