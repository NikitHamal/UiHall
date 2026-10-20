// Bundle src/ into single dependency-free files:
//   dist/uihall-mcp.mjs                    the MCP server (curl-and-run install)
//   ../skills/uihall/scripts/uihall.mjs    the CLI the skill uses when MCP isn't available
import fs from 'node:fs';

const CORE = ['color.js', 'patterns.js', 'engine.js', 'corpus.js', 'tools.js'];
const HEAD = '#!/usr/bin/env node\n// Single-file build of uihall-mcp. Source: https://github.com/NikitHamal/UiHall/tree/main/mcp/src — edit there, then `node mcp/build.mjs`.\n';

function bundle(files) {
  const imports = new Set();
  let body = '';
  for (const f of files) {
    let s = fs.readFileSync(new URL(`./src/${f}`, import.meta.url), 'utf8');
    s = s.replace(/^#!.*\n/, '')
      .replace(/^import [^;]+ from 'node:[^']+';\n/gm, (m) => { imports.add(m.trim()); return ''; })
      .replace(/import\s*\{[^}]*\}\s*from\s*'\.\/[^']+';\n/gs, '')
      .replace(/^export \{[^}]*\};\n/gm, '')
      .replace(/^export (const|let|function|class|async function) /gm, '$1 ');
    body += `\n// ---- ${f} ----\n${s}`;
  }
  return HEAD + [...imports].join('\n') + '\n' + body;
}

const out = [
  ['./dist/uihall-mcp.mjs', [...CORE, 'server.js']],
  ['../skills/uihall/scripts/uihall.mjs', [...CORE, 'cli.js']],
];
for (const [file, files] of out) {
  const url = new URL(file, import.meta.url);
  fs.mkdirSync(new URL('./', url), { recursive: true });
  const code = bundle(files);
  fs.writeFileSync(url, code, { mode: 0o755 });
  console.log(file, (code.length / 1024).toFixed(1), 'KB');
}
