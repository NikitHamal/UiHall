// Bundle src/ into one dependency-free file: dist/uihall-mcp.mjs.
// That file is what people can curl and run without npm, and what the site serves.
import fs from 'node:fs';
const order = ['color.js', 'patterns.js', 'engine.js', 'tools.js', 'server.js'];
let out = '#!/usr/bin/env node\n// uihall-mcp — single-file build. Source: https://github.com/NikitHamal/UiHall/tree/main/mcp\n';
for (const f of order) {
  let s = fs.readFileSync(new URL(`./src/${f}`, import.meta.url), 'utf8');
  s = s.replace(/^#!.*\n/, '')
    .replace(/import\s*\{[^}]*\}\s*from\s*'\.\/[^']+';\n/gs, '')
    .replace(/^export \{[^}]*\};\n/gm, '')
    .replace(/^export (const|function|class|async function) /gm, '$1 ');
  out += `\n// ---- ${f} ----\n${s}`;
}
fs.mkdirSync(new URL('./dist/', import.meta.url), { recursive: true });
fs.writeFileSync(new URL('./dist/uihall-mcp.mjs', import.meta.url), out, { mode: 0o755 });
console.log('dist/uihall-mcp.mjs', (out.length / 1024).toFixed(1), 'KB');
