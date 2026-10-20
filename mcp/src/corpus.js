/**
 * Corpus + image loading for Node (server and CLI).
 * Order: $UIHALL_CORPUS → a local checkout (the repo root) → ~/.cache/uihall → the public site.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { UiHall, SITE } from './engine.js';

export const VERSION = '2.1.0';
const HERE = path.dirname(fileURLToPath(import.meta.url));
export const SITE_URL = (process.env.UIHALL_SITE || SITE).replace(/\/?$/, '/');
const CACHE = process.env.UIHALL_CACHE || path.join(os.homedir(), '.cache', 'uihall');
export const log = (...m) => process.stderr.write(`[uihall] ${m.join(' ')}\n`);


/** A local site root (the folder holding data/corpus.json and assets/), if any. */
function localRoot() {
  const cands = [process.env.UIHALL_ROOT, path.resolve(HERE, '..', '..'), process.cwd()];
  return cands.find((c) => c && fs.existsSync(path.join(c, 'data', 'corpus.json'))) || null;
}

async function fetchBuf(url) {
  const r = await fetch(url, { headers: { 'user-agent': `uihall-mcp/${VERSION}` } });
  if (!r.ok) throw new Error(`GET ${url} → ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

let ENGINE = null, ROOT = null, SOURCE = '', LOADING = null;
export function engine() {
  return (LOADING ||= load().catch((e) => { LOADING = null; throw e; }));
}
async function load() {
  ROOT = localRoot();
  let raw;
  if (process.env.UIHALL_CORPUS) {
    raw = fs.readFileSync(process.env.UIHALL_CORPUS, 'utf8'); SOURCE = process.env.UIHALL_CORPUS;
  } else if (ROOT) {
    raw = fs.readFileSync(path.join(ROOT, 'data', 'corpus.json'), 'utf8'); SOURCE = ROOT;
  } else {
    const file = path.join(CACHE, 'corpus.json');
    const fresh = fs.existsSync(file) && Date.now() - fs.statSync(file).mtimeMs < 24 * 3600e3;
    if (fresh) { raw = fs.readFileSync(file, 'utf8'); SOURCE = file; } else {
      try {
        raw = (await fetchBuf(SITE_URL + 'data/corpus.json')).toString('utf8');
        fs.mkdirSync(CACHE, { recursive: true }); fs.writeFileSync(file, raw); SOURCE = SITE_URL;
      } catch (e) {
        if (!fs.existsSync(file)) throw new Error(`Could not load the corpus (${e.message}). Set UIHALL_CORPUS or UIHALL_ROOT to a local copy.`);
        raw = fs.readFileSync(file, 'utf8'); SOURCE = `${file} (stale; ${e.message})`;
      }
    }
  }
  ENGINE = new UiHall(JSON.parse(raw), { site: SITE_URL });
  log(`corpus v${ENGINE.corpus.version}: ${ENGINE.assets.length} references from ${SOURCE}`);
  return ENGINE;
}

const MIME = { webp: 'image/webp', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png' };

/** Bytes for an asset image: local checkout → cache → site. */
export async function imageBytes(a, which) {
  const rel = which === 'thumb' ? a.thumb : which === 'strip' ? a.strip?.src : a.src;
  if (!rel) return null;
  const mimeType = MIME[rel.split('.').pop()] || 'image/webp';
  if (ROOT && fs.existsSync(path.join(ROOT, rel))) return { data: fs.readFileSync(path.join(ROOT, rel)), mimeType };
  const cached = path.join(CACHE, rel);
  if (fs.existsSync(cached)) return { data: fs.readFileSync(cached), mimeType };
  const data = await fetchBuf(SITE_URL + rel);
  fs.mkdirSync(path.dirname(cached), { recursive: true }); fs.writeFileSync(cached, data);
  return { data, mimeType };
}

