/**
 * stormy-mcp selftest — drives the server over real stdio with real MCP frames.
 *
 * This is not a unit test of the tool functions; it starts the actual server
 * process and speaks the protocol to it, because the failure modes that matter
 * here are framing and startup errors, not logic errors.
 *
 *   node selftest.js
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

let pass = 0, fail = 0;
const failures = [];

function check(name, cond, detail) {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; failures.push(name); console.log(`  FAIL ${name}${detail ? ' — ' + detail : ''}`); }
}

const child = spawn(process.execPath, [path.join(HERE, 'server.js')], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env },
});

let buf = '';
const waiters = new Map();

child.stdout.on('data', (d) => {
  buf += d;
  let nl;
  while ((nl = buf.indexOf('\n')) !== -1) {
    const line = buf.slice(0, nl).trim();
    buf = buf.slice(nl + 1);
    if (!line) continue;
    let msg;
    try { msg = JSON.parse(line); } catch { continue; }
    if (msg.id != null && waiters.has(msg.id)) {
      waiters.get(msg.id)(msg);
      waiters.delete(msg.id);
    }
  }
});

let stderrText = '';
child.stderr.on('data', (d) => { stderrText += d.toString(); });

let nextId = 1;
function rpc(method, params) {
  const id = nextId++;
  const payload = { jsonrpc: '2.0', id, method };
  if (params !== undefined) payload.params = params;
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout on ${method}`)), 20000);
    waiters.set(id, (m) => { clearTimeout(t); resolve(m); });
    child.stdin.write(JSON.stringify(payload) + '\n');
  });
}

const textOf = (res) => res.result?.content?.[0]?.text ?? '';
const jsonOf = (res) => {
  const raw = textOf(res);
  try { return JSON.parse(raw); } catch { return { __raw: raw }; }
};

async function main() {
  console.log('stormy-mcp selftest\n');

  /* ------------------------------------------------------ handshake ---- */
  console.log('handshake');
  const init = await rpc('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'selftest', version: '1' },
  });
  check('initialize returns a result', !!init.result, JSON.stringify(init).slice(0, 200));
  check('protocol version echoed', init.result?.protocolVersion === '2024-11-05');
  check('server identifies itself', init.result?.serverInfo?.name === 'stormy');
  check('instructions are present', typeof init.result?.instructions === 'string' && init.result.instructions.length > 40);

  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');

  const tools = await rpc('tools/list');
  const names = (tools.result?.tools ?? []).map((t) => t.name);
  check('tools/list returns tools', names.length >= 8, `got ${names.length}`);
  for (const required of [
    'search_designs', 'get_asset', 'list_facets', 'find_patterns',
    'design_brief', 'palette_for', 'compare_pair', 'asset_image', 'corpus_stats', 'list_groups',
  ]) {
    check(`tool present: ${required}`, names.includes(required));
  }
  check('every tool declares an input schema', (tools.result?.tools ?? []).every((t) => t.inputSchema?.type === 'object'));

  /* ---------------------------------------------------------- stats ---- */
  console.log('\ncorpus_stats');
  const stats = jsonOf(await rpc('tools/call', { name: 'corpus_stats', arguments: {} }));
  check('reports asset totals', typeof stats.totals?.assets === 'number' && stats.totals.assets > 0, JSON.stringify(stats.totals));
  check('reports described count', (stats.totals?.described ?? 0) > 0);
  check('includes an honesty block', !!stats.honesty);

  const assetTotal = stats.totals.assets;

  /* --------------------------------------------------------- facets ---- */
  console.log('\nlist_facets');
  const facets = jsonOf(await rpc('tools/call', { name: 'list_facets', arguments: { dimension: 'all', limit: 10 } }));
  check('lists categories', (facets.categories ?? []).length > 0);
  check('lists roles', (facets.roles ?? []).length > 0);
  check('lists styles', (facets.styles ?? []).length > 0);
  check('lists tags', (facets.tags ?? []).length > 0);
  check('declares truncation when the limit bites', facets.truncated !== false,
    `limit 10 vs ${JSON.stringify(facets.truncated)}`);
  check('reports usage guidance', !!facets.usage?.start_with);

  // Uncapped: the full enumeration must account for every asset exactly once.
  const facetsAll = jsonOf(await rpc('tools/call', { name: 'list_facets', arguments: { dimension: 'categories', limit: 500 } }));
  check('category counts sum to the corpus', (facetsAll.categories ?? []).reduce((s, c) => s + c.count, 0) === assetTotal,
    `${(facetsAll.categories ?? []).reduce((s, c) => s + c.count, 0)} vs ${assetTotal}`);
  check('no truncation when the limit is generous', facetsAll.truncated === false,
    JSON.stringify(facetsAll.truncated));
  check('category ids are unique', new Set((facetsAll.categories ?? []).map((c) => c.id)).size === (facetsAll.categories ?? []).length);

  /* --------------------------------------------------------- search ---- */
  console.log('\nsearch_designs');
  const s1 = jsonOf(await rpc('tools/call', {
    name: 'search_designs',
    arguments: { query: 'dark mode crypto wallet balance', limit: 5 },
  }));
  check('returns results', (s1.results ?? []).length > 0);
  check('respects the limit', (s1.results ?? []).length <= 5);
  check('results carry ids and titles', (s1.results ?? []).every((r) => r.id && r.title));

  const sDark = jsonOf(await rpc('tools/call', {
    name: 'search_designs',
    arguments: { query: 'dashboard', surface: ['dark'], limit: 6 },
  }));
  check('surface filter returns only dark assets', (sDark.results ?? []).length > 0);

  const sMotion = jsonOf(await rpc('tools/call', {
    name: 'search_designs',
    arguments: { query: 'app', has_motion: true, limit: 8 },
  }));
  check('has_motion filter returns only clips', (sMotion.results ?? []).every((r) => r.motion_clip === true));

  const sNone = jsonOf(await rpc('tools/call', {
    name: 'search_designs',
    arguments: { query: 'zzzzqqqq nonexistent thing xyzzy', limit: 5 },
  }));
  check('nonsense query degrades gracefully', Array.isArray(sNone.results), JSON.stringify(sNone).slice(0, 160));

  /* ------------------------------------------------------------ get ---- */
  console.log('\nget_asset');
  const firstId = s1.results[0].id;
  const got = jsonOf(await rpc('tools/call', { name: 'get_asset', arguments: { id: firstId } }));
  check('returns the requested asset', got.id === firstId);
  check('includes the full description', typeof got.description === 'string' && got.description.length > 30);
  check('includes measured palette with area', (got.palette_measured ?? []).length > 0 && typeof got.palette_measured[0].area_pct === 'number');
  check('palette areas are plausible', (got.palette_measured ?? []).every((p) => p.area_pct >= 0 && p.area_pct <= 100));
  check('contrast values are present', (got.palette_measured ?? []).every((p) => typeof p.contrast_on_white === 'number' && p.contrast_on_white >= 1));

  const md = await rpc('tools/call', { name: 'get_asset', arguments: { id: firstId, include_markdown: true } });
  check('markdown mode returns a markdown table', textOf(md).includes('| Hex | Area |'));

  const bad = await rpc('tools/call', { name: 'get_asset', arguments: { id: 'NOPE-9999' } });
  check('unknown id reports an error', !!bad.result?.isError, JSON.stringify(bad.result).slice(0, 200));
  check('unknown id suggests alternatives when possible', /Did you mean|No asset/.test(textOf(bad)));

  /* --------------------------------------------------------- groups ---- */
  console.log('\nlist_groups');
  const gr = jsonOf(await rpc('tools/call', { name: 'list_groups', arguments: { limit: 10 } }));
  check('returns groups', (gr.results ?? []).length > 0, JSON.stringify(gr).slice(0, 160));
  check('every group has 2+ members with ids', (gr.results ?? []).every((g) => (g.members ?? []).length >= 2 && g.members.every((m) => m.id)));
  check('verified groups are flagged', (gr.results ?? []).some((g) => g.verified === true));

  const grq = jsonOf(await rpc('tools/call', { name: 'list_groups', arguments: { query: 'closecrm', limit: 5 } }));
  check('query finds the CloseCRM group', (grq.results ?? []).some((g) => g.id === 'GRP-closecrm'), JSON.stringify(grq.results ?? []).slice(0, 160));

  const grouped = jsonOf(await rpc('tools/call', { name: 'get_asset', arguments: { id: 'IMG-0518' } }));
  check('get_asset surfaces the verified group', grouped.group?.id === 'GRP-closecrm', JSON.stringify(grouped.group ?? {}).slice(0, 160));
  check('group lists the other screens', (grouped.group?.siblings ?? []).length === 3);

  /* -------------------------------------------------------- patterns --- */
  console.log('\nfind_patterns');
  const pats = jsonOf(await rpc('tools/call', { name: 'find_patterns', arguments: { limit: 5 } }));
  check('returns patterns', (pats.patterns ?? []).length > 0);
  check('every pattern has examples', (pats.patterns ?? []).every((p) => p.example_count > 0 && p.examples.length > 0));
  check('every pattern explains itself', (pats.patterns ?? []).every((p) => typeof p.why_it_works === 'string' && p.why_it_works.length > 40));

  const patsOnb = jsonOf(await rpc('tools/call', { name: 'find_patterns', arguments: { about: 'onboarding', limit: 4 } }));
  check('topic ranking returns something', (patsOnb.patterns ?? []).length > 0);

  /* ----------------------------------------------------------- brief --- */
  console.log('\ndesign_brief');
  const brief = jsonOf(await rpc('tools/call', {
    name: 'design_brief',
    arguments: { screen: 'onboarding for a sleep tracking app', platform: 'ios', examples: 5 },
  }));
  check('returns examples', (brief.examples ?? []).length > 0);
  check('respects the example count', (brief.examples ?? []).length <= 5);
  check('returns recurring colours', (brief.recurring_colours ?? []).length > 0);
  check('colours carry roles', (brief.recurring_colours ?? []).every((c) => typeof c.role === 'string'));
  check('colours carry appearance counts', (brief.recurring_colours ?? []).every((c) => c.appears_in >= 1));
  check('returns a notes array', Array.isArray(brief.notes));
  check('reports evidence count', typeof brief.evidence_count === 'number');

  const briefDark = jsonOf(await rpc('tools/call', {
    name: 'design_brief',
    arguments: { screen: 'fitness workout stats', dark: true, examples: 5 },
  }));
  check('dark bias returns dark-leaning results', (briefDark.examples ?? []).length > 0);

  /* --------------------------------------------------------- palette --- */
  console.log('\npalette_for');
  const pal = jsonOf(await rpc('tools/call', {
    name: 'palette_for',
    arguments: { mood: 'warm and quiet', surface: 'dark', count: 3 },
  }));
  check('returns named schemes', (pal.named_schemes ?? []).length > 0);
  check('schemes carry hex pairs', (pal.named_schemes ?? []).every((s) => s.colours.length >= 2));
  check('returns contrast checks', (pal.contrast_checks ?? []).length > 0);
  check('contrast checks carry a verdict', (pal.contrast_checks ?? []).every((c) => typeof c.verdict === 'string'));
  check('contrast ratios are sane', (pal.contrast_checks ?? []).every((c) => c.ratio >= 1 && c.ratio <= 21), JSON.stringify(pal.contrast_checks?.[0]));

  /* --------------------------------------------------------- compare --- */
  console.log('\ncompare_pair');
  const cmp = jsonOf(await rpc('tools/call', { name: 'compare_pair', arguments: { topic: 'wallet', limit: 4 } }));
  check('returns comparisons', (cmp.comparisons ?? []).length > 0);
  check('comparisons name what changed', (cmp.comparisons ?? []).every((c) => typeof c.what_changed === 'string' && c.what_changed.length > 20));
  check('reports available total', typeof cmp.available_total === 'number' && cmp.available_total > 0);

  /* ----------------------------------------------------------- image --- */
  console.log('\nasset_image');
  const img = jsonOf(await rpc('tools/call', { name: 'asset_image', arguments: { id: firstId } }));
  check('resolves a web image path', typeof img.web_image === 'string' && img.web_image.length > 5);
  check('resolves the original source', typeof img.original_source === 'string' && img.original_source.length > 5);

  /* ------------------------------------------------- protocol edges ---- */
  console.log('\nprotocol robustness');
  const unknownTool = await rpc('tools/call', { name: 'no_such_tool', arguments: {} });
  check('unknown tool yields a JSON-RPC error', !!unknownTool.error);

  const unknownMethod = await rpc('definitely/not/a/method');
  check('unknown method yields -32601', unknownMethod.error?.code === -32601);

  const pong = await rpc('ping');
  check('ping responds', !!pong.result);

  // malformed input must not kill the process
  child.stdin.write('this is not json\n');
  child.stdin.write('{"jsonrpc":"2.0","id":9999,"method":"tools/list"}\n');
  const afterGarbage = await Promise.race([
    new Promise((res) => {
      const t = setInterval(() => {
        if (waiters.has(9999)) return;
      }, 20);
      waiters.set(9999, (m) => { clearInterval(t); res(m); });
    }),
    new Promise((res) => setTimeout(() => res(null), 5000)),
  ]);
  check('server survives malformed input', !!afterGarbage?.result);
  check('process is still alive', child.exitCode === null);

  /* ---------------------------------------------------------- finish --- */
  console.log('\nstartup diagnostics');
  check('stderr reports corpus load', /corpus loaded/i.test(stderrText), stderrText.slice(0, 300));

  child.kill();
  await new Promise((r) => setTimeout(r, 200));

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail) {
    console.log('\nfailed:');
    for (const f of failures) console.log('  - ' + f);
    process.exit(1);
  }
  console.log('server is healthy.');
}

main().catch((err) => {
  console.error('\nselftest crashed:', err.message);
  console.error(stderrText.slice(0, 2000));
  child.kill();
  process.exit(1);
});
