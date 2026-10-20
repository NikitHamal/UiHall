#!/usr/bin/env node
/**
 * uihall — command-line access to the same tools the MCP server exposes.
 * For agents without MCP (or humans in a terminal). Prints the markdown the
 * model would read; add --json for structuredContent.
 *
 *   node uihall.mjs brief "onboarding for a sleep tracking app" --platform ios --mood calm
 *   node uihall.mjs search "dark crypto wallet" --limit 5
 *   node uihall.mjs get ORG-1037
 *   node uihall.mjs similar ORG-1037
 *   node uihall.mjs palette --mood calm --query wellness
 *   node uihall.mjs color "#C6F432"
 *   node uihall.mjs tokens ORG-0197 --theme mint --format tailwind
 *   node uihall.mjs compare ORG-0197 ORG-0109
 *   node uihall.mjs system ORG-0197 --mood editorial   → full starter design system CSS
 *   node uihall.mjs contrast "#888" "#fff"
 *   node uihall.mjs patterns "dashboard"
 *   node uihall.mjs overview
 *   node uihall.mjs image ORG-1037        → prints a local file path you can open
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { engine, imageBytes } from './corpus.js';
import { TOOLS } from './tools.js';

const argv = process.argv.slice(2);
const flags = {}, pos = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a.startsWith('--')) {
    const k = a.slice(2).replace(/-/g, '_');
    const v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
    flags[k] = flags[k] === undefined ? v : [].concat(flags[k], v);
  } else pos.push(a);
}
const num = (v) => (v === undefined || v === true ? undefined : Number(v));
const list = (v) => (v === undefined ? undefined : [].concat(v).flatMap((x) => String(x).split(',')).map((x) => x.trim()).filter(Boolean));

const [cmd, ...rest] = pos;
const text = rest.join(' ');
const MAP = {
  search: () => ['search_designs', { query: text, limit: num(flags.limit), category: list(flags.category), role: list(flags.role), style: list(flags.style), tag: list(flags.tag), surface: flags.surface, hue: flags.hue, kind: flags.kind, has_motion: flags.motion ? true : undefined }],
  get: () => ['get_design', { id: rest[0] }],
  similar: () => ['find_similar', { id: rest[0], by: flags.by, limit: num(flags.limit) }],
  brief: () => ['design_brief', { screen: text, platform: flags.platform, mood: flags.mood, surface: flags.surface, limit: num(flags.limit) }],
  patterns: () => ['find_patterns', { about: text, limit: num(flags.limit) }],
  palette: () => ['palette_for', { mood: flags.mood || text, query: flags.query, surface: flags.surface, count: num(flags.count) }],
  color: () => ['search_by_color', { hex: rest[0], tolerance: num(flags.tolerance), limit: num(flags.limit) }],
  tokens: () => ['export_tokens', rest[0]?.startsWith('#') ? { colors: rest, format: flags.format } : { id: rest[0], theme: flags.theme, format: flags.format, prefix: flags.prefix }],
  compare: () => ['compare_designs', { ids: rest }],
  system: () => ['generate_design_system', rest[0]?.startsWith('#') ? { colors: rest, mood: flags.mood } : { id: rest[0], mood: flags.mood, prefix: flags.prefix }],
  contrast: () => ['check_contrast', { foreground: rest[0], background: rest[1], target: num(flags.target) }],
  overview: () => ['corpus_overview', { tags: !!flags.tags }],
};

async function main() {
  if (!cmd || cmd === 'help' || flags.help) {
    const src = fs.readFileSync(new URL(import.meta.url), 'utf8');
    process.stdout.write(src.match(/\/\*\*([\s\S]*?)\*\//)[1].replace(/^ \* ?/gm, '') + '\n');
    return;
  }
  const h = await engine();
  if (cmd === 'image') {
    const out = [];
    for (const id of rest) {
      const a = h.get(id);
      if (!a) { out.push(`${id}: unknown id`); continue; }
      for (const which of ['src']) {
        const b = await imageBytes(a, which);
        const file = path.join(os.tmpdir(), `uihall-${a.id}.${b.mimeType.split('/')[1]}`);
        fs.writeFileSync(file, b.data);
        out.push(file);
      }
    }
    process.stdout.write(out.join('\n') + '\n');
    return;
  }
  const spec = MAP[cmd];
  if (!spec) throw new Error(`Unknown command "${cmd}". Run with --help.`);
  const [name, args] = spec();
  for (const k of Object.keys(args)) if (args[k] === undefined || args[k] === '') delete args[k];
  const res = TOOLS.find((t) => t.name === name).run(h, args);
  process.stdout.write((flags.json ? JSON.stringify(res.data, null, 2) : res.text) + '\n');
}

main().catch((e) => { process.stderr.write(`uihall: ${e.message}\n`); process.exit(1); });
