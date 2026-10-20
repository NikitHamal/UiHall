// Protocol-level self-test: spawns the real server over stdio and checks every tool.
// Run: node test/selftest.mjs [path/to/server]   (defaults to src/server.js)
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const server = process.argv[2] || fileURLToPath(new URL('../src/server.js', import.meta.url));
const p = spawn(process.execPath, [server], { stdio: ['pipe', 'pipe', 'inherit'] });
const waiting = new Map();
let buf = '', next = 1, pass = 0, fail = 0;
p.stdout.on('data', (d) => {
  buf += d;
  let i;
  while ((i = buf.indexOf('\n')) >= 0) {
    const m = JSON.parse(buf.slice(0, i)); buf = buf.slice(i + 1);
    waiting.get(m.id)?.(m); waiting.delete(m.id);
  }
});
const rpc = (method, params) => new Promise((res) => { const id = next++; waiting.set(id, res); p.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n'); });
const call = async (name, args) => (await rpc('tools/call', { name, arguments: args })).result;
const ok = (cond, label) => { cond ? pass++ : fail++; console.log(`${cond ? '  ok ' : 'FAIL '} ${label}`); };

const init = await rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'selftest', version: '1' } });
ok(init.result?.protocolVersion === '2025-06-18', 'initialize negotiates 2025-06-18');
ok((await rpc('initialize', { protocolVersion: '2024-11-05' })).result.protocolVersion === '2024-11-05', 'initialize accepts 2024-11-05');
ok(/design_brief/.test(init.result.instructions), 'server instructions mention design_brief');
p.stdin.write('{"jsonrpc":"2.0","method":"notifications/initialized"}\n');

const tools = (await rpc('tools/list')).result.tools;
ok(tools.length === 13, `13 tools listed (${tools.length})`);
ok(tools.every((t) => t.annotations?.readOnlyHint && t.inputSchema?.type === 'object' && t.description.length > 60), 'every tool is read-only, typed and described');

let r = await call('search_designs', { query: 'crypto wallet', limit: 5 });
ok(r.structuredContent.results.length === 5 && /wallet|crypto/i.test(r.structuredContent.results[0].title), 'search finds crypto wallets');
r = await call('search_designs', { query: 'fintech', limit: 10 });
ok(r.structuredContent.results.some((x) => /wallet|bank|finance|money/i.test(x.title + x.summary)), 'synonyms: fintech → wallet/banking');
r = await call('search_designs', { role: ['onboarding'], surface: 'dark', limit: 40 });
ok(r.structuredContent.results.every((x) => x.roles?.includes('onboarding') && x.surface === 'dark'), 'facet filters hold');
r = await call('search_designs', { query: 'pricing', limit: 2, include_images: true });
ok(r.content.filter((c) => c.type === 'image').length === 2, 'include_images attaches thumbnails');

r = await call('get_design', { id: 'org-1037' });
ok(/Wander|travel/i.test(r.content[0].text) && r.structuredContent.colour_roles && r.structuredContent.live_url, 'get_design (case-insensitive id) with colour roles + live url');
ok((await call('get_design', { id: 'NOPE-1' })).isError === true, 'unknown id is a tool error, not a crash');

r = await call('view_design', { ids: ['ORG-1037', 'ORG-0073'], size: 'thumb' });
ok(r.content.filter((c) => c.type === 'image').length === 2, 'view_design returns both images');

r = await call('find_similar', { id: 'ORG-1037', limit: 5 });
ok(r.structuredContent.results.length === 5 && !r.structuredContent.results.some((x) => x.id === 'ORG-1037'), 'find_similar excludes self');

r = await call('design_brief', { screen: 'onboarding for a sleep tracking app', platform: 'ios', mood: 'calm' });
const b = r.structuredContent;
ok(b.references.length === 6 && b.patterns.length && b.palettes.length && b.checklist.length, 'design_brief has references, patterns, palettes, checklist');
ok(b.guidance.some((g) => g.role === 'onboarding'), 'design_brief picks onboarding guidance');

r = await call('find_patterns', { about: 'dashboard' });
ok(r.structuredContent.patterns[0].evidence_count >= 3 && r.structuredContent.patterns[0].build.length, 'find_patterns returns build rules with evidence');

r = await call('palette_for', { mood: 'calm', query: 'wellness' });
ok(r.structuredContent.palettes.length >= 2 && r.structuredContent.palettes.every((p) => /^#[0-9A-F]{6}$/.test(p.roles.background)), 'palette_for returns real hex roles');

r = await call('search_by_color', { hex: '#C1FE1A' });
ok(r.structuredContent.results.length > 0 && r.structuredContent.family === 'lime', 'search_by_color finds lime');

for (const f of ['css', 'tailwind', 'dtcg', 'swiftui', 'compose']) {
  r = await call('export_tokens', { id: 'ORG-0085', format: f });
  ok(!r.isError && r.structuredContent.code.length > 200, `export_tokens ${f}`);
}
r = await call('compare_designs', { ids: ['ORG-0197', 'ORG-0109'], include_images: true });
ok(r.structuredContent.assets.length === 2 && r.content.filter((c) => c.type === 'image').length === 2, 'compare_designs with images');
r = await call('generate_design_system', { id: 'ORG-0197', mood: 'editorial' });
ok(/--uh-text-4xl/.test(r.structuredContent.css) && /\.btn-primary/.test(r.structuredContent.css), 'generate_design_system emits tokens + components');
r = await call('check_contrast', { foreground: '#888', background: '#fff' });
ok(r.structuredContent.ratio === 3.54 && r.structuredContent.suggestion, 'check_contrast + fix');
r = await call('corpus_overview', {});
ok(r.structuredContent.totals.assets > 200, 'corpus_overview');

ok((await rpc('resources/templates/list')).result.resourceTemplates.length === 2, 'resource templates');
r = (await rpc('resources/read', { uri: 'uihall://design/ORG-0085' })).result;
ok(/Type scale|token/i.test(r.contents[0].text), 'resources/read design');
r = (await rpc('prompts/get', { name: 'design-screen', arguments: { screen: 'checkout' } })).result;
ok(/design_brief/.test(r.messages[0].content.text), 'prompts/get design-screen');
ok((await rpc('nope/method')).error?.code === -32601, 'unknown method → -32601');

console.log(`\n${pass} passed, ${fail} failed`);
p.kill();
process.exit(fail ? 1 : 0);
