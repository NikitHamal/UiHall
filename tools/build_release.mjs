// Release build: bundles the MCP server + skill CLI, regenerates the skill's
// pattern reference from the live corpus, packs skills/uihall.tar.gz, and runs the selftest.
//   node tools/build_release.mjs
import fs from 'node:fs';
import { execSync } from 'node:child_process';
import { UiHall } from '../mcp/src/engine.js';

const root = new URL('../', import.meta.url);
const run = (cmd) => execSync(cmd, { cwd: root, stdio: 'inherit' });

run('node mcp/build.mjs');

const h = new UiHall(JSON.parse(fs.readFileSync(new URL('ui-hall/data/corpus.json', root), 'utf8')));
const md = ['# Pattern library', '', `Generated from the corpus (v${h.corpus.version}, ${h.assets.length} references) by \`tools/build_release.mjs\`.`,
  'Evidence ids open at `https://nikithamal.github.io/UiHall/ui-hall/#/a/<id>` or via `get_design` / `view_design`.', ''];
for (const p of h.patterns()) {
  md.push(`## ${p.name}`, '', p.why, '', ...p.build.map((b) => `- ${b}`), '', `Evidence (${p.evidence_count}): ${p.examples.map((a) => `${a.id} (${a.title})`).join(', ')}`, '');
}
fs.writeFileSync(new URL('skills/uihall/references/patterns.md', root), md.join('\n'));

// Claude Code plugin: the skill + the bundled server, installed via .claude-plugin/marketplace.json
fs.rmSync(new URL('plugin/skills', root), { recursive: true, force: true });
fs.cpSync(new URL('skills/uihall', root), new URL('plugin/skills/uihall', root), { recursive: true });
fs.mkdirSync(new URL('plugin/mcp', root), { recursive: true });
fs.copyFileSync(new URL('mcp/dist/uihall-mcp.mjs', root), new URL('plugin/mcp/uihall-mcp.mjs', root));

run('tar --sort=name --owner=0 --group=0 --numeric-owner --mtime=2026-10-01 -czf skills/uihall.tar.gz -C skills uihall');
run('node mcp/test/selftest.mjs mcp/dist/uihall-mcp.mjs');
