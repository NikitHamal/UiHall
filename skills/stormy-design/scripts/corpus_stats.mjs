#!/usr/bin/env node
/**
 * corpus_stats.mjs — what the corpus contains, and how much of it is verified.
 *
 * Deliberately reports coverage gaps alongside the totals, so an agent citing
 * this corpus can be honest about what it does and does not know.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

function findCorpus() {
  const home = process.env.USERPROFILE || process.env.HOME || '';
  // HERE is skills/stormy-design/scripts, so the repo root is three levels up.
  // Resolving only two levels up landed on skills/ and never found the corpus.
  const candidates = [
    process.env.STORMY_CORPUS,
    path.resolve(HERE, '..', '..', '..', 'ui-hall', 'data', 'corpus.json'),
    path.resolve(HERE, '..', '..', 'ui-hall', 'data', 'corpus.json'),
    path.resolve(HERE, '..', 'corpus.json'),
    home && path.join(home, 'Stormy', 'ui-hall', 'data', 'corpus.json'),
  ].filter(Boolean);
  return candidates.find((c) => fs.existsSync(c)) || null;
}

const file = findCorpus();
if (!file) {
  console.error('Corpus not found. Set STORMY_CORPUS or build it with tools/build_corpus.py.');
  process.exit(2);
}

const corpus = JSON.parse(fs.readFileSync(file, 'utf8'));
const assets = corpus.assets;

const imgDir = path.resolve(path.dirname(file), '..', 'assets', 'img');
const thumbDir = path.resolve(path.dirname(file), '..', 'assets', 'thumb');
const clipDir = path.resolve(path.dirname(file), '..', 'assets', 'vid');

const missing = [];
for (const a of assets) {
  const rel = a.src.replace(/^assets\//, '');
  const p = path.resolve(path.dirname(file), '..', 'assets', rel);
  if (!fs.existsSync(p)) missing.push({ id: a.id, expected: p });
  if (a.clip) {
    const cp = path.resolve(path.dirname(file), '..', 'assets', a.clip.replace(/^assets\//, ''));
    if (!fs.existsSync(cp)) missing.push({ id: a.id, expected: cp });
  }
}

const described = assets.filter((a) => a.description);
const withQuality = assets.filter((a) => a.quality);
const withoutDesc = assets.filter((a) => !a.description);

const fmt = new Intl.NumberFormat('en');

console.log(`\nStormy design corpus`);
console.log(`  file        ${file}`);
console.log(`  assets      ${fmt.format(assets.length)}  (${fmt.format(corpus.totals.images)} images, ${fmt.format(corpus.totals.videos)} video sources)`);
console.log(`  described   ${fmt.format(described.length)}  (${Math.round((described.length / assets.length) * 100)}% carry a hand-written visual review)`);
console.log(`  motion      ${fmt.format(corpus.totals.clips)} assets ship a playable clip`);

console.log(`\nby category`);
for (const c of corpus.categories) {
  const pct = Math.round((c.count / assets.length) * 100);
  console.log(`  ${String(c.count).padStart(4)}  ${String(pct).padStart(3)}%  ${c.id.padEnd(20)} ${c.label}`);
}

console.log(`\ntop roles`);
for (const r of corpus.roles.slice(0, 10)) console.log(`  ${String(r.count).padStart(4)}  ${r.id}`);

console.log(`\ntop styles`);
for (const s of corpus.styles.slice(0, 10)) console.log(`  ${String(s.count).padStart(4)}  ${s.id}`);

console.log(`\ntop tags`);
for (const t of corpus.tags.slice(0, 14)) console.log(`  ${String(t.count).padStart(4)}  ${t.id}`);

console.log(`\ncoverage gaps — read this before making strong claims`);
if (withoutDesc.length) {
  console.log(`  ${withoutDesc.length} assets have no hand-written description:`);
  const byCat = new Map();
  for (const a of withoutDesc) byCat.set(a.category, (byCat.get(a.category) || 0) + 1);
  for (const [c, n] of [...byCat.entries()].sort((x, y) => y[1] - x[1])) {
    console.log(`      ${String(n).padStart(4)}  ${c}`);
  }
}
if (withQuality.length) {
  console.log(`  ${withQuality.length} assets carry a salvage note (cropped, low-res or partially obscured).`);
}
if (missing.length) {
  console.log(`  ${missing.length} referenced files are missing on disk — the corpus needs a rebuild:`);
  for (const m of missing.slice(0, 10)) console.log(`      ${m.id}  ${m.expected}`);
} else {
  console.log(`  every referenced asset file exists on disk`);
}
console.log();
