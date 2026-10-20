#!/usr/bin/env node
/**
 * uihall-mcp — MCP server for UI Hall, a curated corpus of real interface design.
 *
 *   npx -y uihall-mcp                 stdio (Claude Code, Cursor, Codex, VS Code …)
 *   npx -y uihall-mcp --http 8787     Streamable HTTP at http://localhost:8787/mcp
 *
 * Zero dependencies. The corpus is read from a local checkout when there is
 * one, otherwise fetched once from the public site and cached.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { UiHall, SITE } from './engine.js';
import { TOOLS, PROMPTS } from './tools.js';

const VERSION = '2.0.0';
const PROTOCOLS = ['2025-06-18', '2025-03-26', '2024-11-05'];
const HERE = path.dirname(fileURLToPath(import.meta.url));
const SITE_URL = (process.env.UIHALL_SITE || SITE).replace(/\/?$/, '/');
const CACHE = process.env.UIHALL_CACHE || path.join(os.homedir(), '.cache', 'uihall');
const log = (...m) => process.stderr.write(`[uihall] ${m.join(' ')}\n`);

/* ------------------------------------------------------------- corpus -- */

/** A local site root (the folder holding data/corpus.json and assets/), if any. */
function localRoot() {
  const cands = [process.env.UIHALL_ROOT, path.resolve(HERE, '..', '..', 'ui-hall'), path.resolve(HERE, '..', 'ui-hall'), path.resolve(process.cwd(), 'ui-hall')];
  return cands.find((c) => c && fs.existsSync(path.join(c, 'data', 'corpus.json'))) || null;
}

async function fetchBuf(url) {
  const r = await fetch(url, { headers: { 'user-agent': `uihall-mcp/${VERSION}` } });
  if (!r.ok) throw new Error(`GET ${url} → ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

let ENGINE = null, ROOT = null, SOURCE = '', LOADING = null;
function engine() {
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
async function imageBytes(a, which) {
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

/* ------------------------------------------------------------ protocol -- */

const err = (id, code, message) => ({ jsonrpc: '2.0', id, error: { code, message } });
const ok = (id, result) => ({ jsonrpc: '2.0', id, result });

const INSTRUCTIONS = `UI Hall is a curated corpus of ~750 real interface designs (mobile, web, dashboards, motion, design systems). Every item was looked at and written up by hand; every palette was measured from the pixels.
Use it before designing or building any UI, so layout and colour decisions come from evidence rather than the generic average:
- design_brief(screen) to start a screen — references, patterns, palettes, checklist in one call.
- search_designs / find_similar / search_by_color to explore; view_design to actually look at the images.
- palette_for + export_tokens + check_contrast for colour you can paste into code.
Copy structure (hierarchy, layout, rhythm), not skin. Cite reference ids in your work.`;

const RESOURCE_TEMPLATES = [
  { uriTemplate: 'uihall://design/{id}', name: 'design', title: 'Design record', description: 'Markdown write-up of one reference.', mimeType: 'text/markdown' },
  { uriTemplate: 'uihall://image/{id}', name: 'image', title: 'Design image', description: 'The reference image itself.', mimeType: 'image/webp' },
];

async function handle(msg) {
  const { id, method, params = {} } = msg;
  if (id === undefined || id === null) return null; // notification
  switch (method) {
    case 'initialize': {
      const v = PROTOCOLS.includes(params.protocolVersion) ? params.protocolVersion : PROTOCOLS[0];
      return ok(id, {
        protocolVersion: v,
        capabilities: { tools: { listChanged: false }, resources: { listChanged: false }, prompts: { listChanged: false } },
        serverInfo: { name: 'uihall', title: 'UI Hall', version: VERSION, websiteUrl: SITE_URL },
        instructions: INSTRUCTIONS,
      });
    }
    case 'ping': return ok(id, {});
    case 'tools/list':
      return ok(id, { tools: TOOLS.map(({ name, title, description, inputSchema, annotations }) => ({ name, title, description, inputSchema, annotations })) });
    case 'tools/call': {
      const tool = TOOLS.find((t) => t.name === params.name);
      if (!tool) return err(id, -32602, `Unknown tool: ${params.name}`);
      try {
        const h = await engine();
        const out = tool.run(h, params.arguments || {});
        const content = [{ type: 'text', text: out.text }];
        for (const im of out.images || []) {
          try {
            const a = h.get(im.id);
            const b = await imageBytes(a, im.which);
            if (b) content.push({ type: 'image', data: b.data.toString('base64'), mimeType: b.mimeType });
          } catch (e) { content.push({ type: 'text', text: `(image for ${im.id} unavailable: ${e.message})` }); }
        }
        return ok(id, { content, structuredContent: out.data, isError: false });
      } catch (e) {
        return ok(id, { content: [{ type: 'text', text: `${tool.name}: ${e.message}` }], isError: true });
      }
    }
    case 'resources/list': {
      return ok(id, {
        resources: [
          { uri: 'uihall://overview', name: 'overview', title: 'Corpus overview', description: 'Vocabulary, counts and provenance.', mimeType: 'text/markdown' },
          { uri: 'uihall://patterns', name: 'patterns', title: 'Pattern library', description: 'Structural patterns with build rules and evidence.', mimeType: 'text/markdown' },
        ],
      });
    }
    case 'resources/templates/list': return ok(id, { resourceTemplates: RESOURCE_TEMPLATES });
    case 'resources/read': {
      const h = await engine();
      const uri = String(params.uri || '');
      const run = (name, args) => TOOLS.find((t) => t.name === name).run(h, args).text;
      if (uri === 'uihall://overview') return ok(id, { contents: [{ uri, mimeType: 'text/markdown', text: run('corpus_overview', { tags: true }) }] });
      if (uri === 'uihall://patterns') return ok(id, { contents: [{ uri, mimeType: 'text/markdown', text: run('find_patterns', { limit: 30 }) }] });
      let m = uri.match(/^uihall:\/\/design\/([\w-]+)$/);
      if (m) return ok(id, { contents: [{ uri, mimeType: 'text/markdown', text: run('get_design', { id: m[1] }) }] });
      m = uri.match(/^uihall:\/\/image\/([\w-]+)$/);
      if (m && h.get(m[1])) {
        const b = await imageBytes(h.get(m[1]), 'src');
        return ok(id, { contents: [{ uri, mimeType: b.mimeType, blob: b.data.toString('base64') }] });
      }
      return err(id, -32002, `Resource not found: ${uri}`);
    }
    case 'prompts/list':
      return ok(id, { prompts: PROMPTS.map(({ name, title, description, arguments: a }) => ({ name, title, description, arguments: a })) });
    case 'prompts/get': {
      const p = PROMPTS.find((x) => x.name === params.name);
      if (!p) return err(id, -32602, `Unknown prompt: ${params.name}`);
      return ok(id, { description: p.description, messages: [{ role: 'user', content: { type: 'text', text: p.render(params.arguments || {}) } }] });
    }
    case 'logging/setLevel': return ok(id, {});
    case 'completion/complete': return ok(id, { completion: { values: [], hasMore: false } });
    default: return err(id, -32601, `Method not found: ${method}`);
  }
}

async function dispatch(payload) {
  if (Array.isArray(payload)) return (await Promise.all(payload.map(dispatch1))).filter(Boolean);
  return dispatch1(payload);
}
async function dispatch1(m) {
  if (!m || m.jsonrpc !== '2.0' || typeof m.method !== 'string') return m && m.id != null ? err(m.id, -32600, 'Invalid request') : null;
  try { return await handle(m); } catch (e) { return m.id != null ? err(m.id, -32603, e.message) : null; }
}

/* ---------------------------------------------------------- transports -- */

function stdio() {
  let buf = '', pending = 0, ended = false;
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => {
    buf += chunk;
    let nl;
    while ((nl = buf.indexOf('\n')) !== -1) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line) continue;
      let msg;
      try { msg = JSON.parse(line); } catch { process.stdout.write(JSON.stringify(err(null, -32700, 'Parse error')) + '\n'); continue; }
      pending++;
      dispatch(msg).then((res) => {
        if (res && (!Array.isArray(res) || res.length)) process.stdout.write(JSON.stringify(res) + '\n');
        if (--pending === 0 && ended) process.exit(0);
      });
    }
  });
  process.stdin.on('end', () => { ended = true; if (!pending) process.exit(0); });
  engine().catch((e) => log(e.message)); // warm the corpus while the client handshakes
}

function serveHttp(port, host) {
  const srv = http.createServer(async (req, res) => {
    res.setHeader('access-control-allow-origin', '*');
    res.setHeader('access-control-allow-headers', 'content-type, mcp-protocol-version, mcp-session-id, authorization');
    res.setHeader('access-control-allow-methods', 'POST, GET, OPTIONS');
    if (req.method === 'OPTIONS') return res.writeHead(204).end();
    const url = new URL(req.url, 'http://x');
    if (url.pathname === '/health') return res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ ok: true, version: VERSION }));
    if (url.pathname !== '/mcp') return res.writeHead(404).end('Not found. MCP endpoint is POST /mcp');
    if (req.method === 'GET') return res.writeHead(405, { allow: 'POST' }).end();
    if (req.method !== 'POST') return res.writeHead(405).end();
    let body = '';
    for await (const c of req) body += c;
    let msg;
    try { msg = JSON.parse(body); } catch { return res.writeHead(400, { 'content-type': 'application/json' }).end(JSON.stringify(err(null, -32700, 'Parse error'))); }
    const out = await dispatch(msg);
    if (!out || (Array.isArray(out) && !out.length)) return res.writeHead(202).end();
    res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(out));
  });
  srv.listen(port, host, () => log(`Streamable HTTP on http://${host}:${port}/mcp`));
  engine().catch((e) => log(e.message));
}

const argv = process.argv.slice(2);
if (argv.includes('--help') || argv.includes('-h')) {
  process.stdout.write(`uihall-mcp ${VERSION}\n\n  uihall-mcp                  stdio transport\n  uihall-mcp --http [port]    Streamable HTTP on /mcp (default 8787)\n\nEnv: UIHALL_ROOT (local site folder), UIHALL_CORPUS (corpus.json), UIHALL_SITE (asset base URL), UIHALL_CACHE\n`);
} else if (argv.includes('--version')) {
  process.stdout.write(VERSION + '\n');
} else if (argv.includes('--http')) {
  const p = Number(argv[argv.indexOf('--http') + 1]) || Number(process.env.PORT) || 8787;
  serveHttp(p, process.env.HOST || '127.0.0.1');
} else {
  stdio();
}
