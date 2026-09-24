/**
 * stormy-mcp — a zero-dependency MCP server over the Stormy design corpus.
 *
 * The corpus is a curated catalogue of mobile and web interface design: every
 * asset was looked at and written up by hand, and every palette was measured
 * from the pixels. This server exposes that to an agent so it can answer
 * "what does a good finance onboarding look like" with real examples carrying
 * real colour values, instead of inventing them.
 *
 * Transport: stdio, JSON-RPC 2.0, protocol 2024-11-05.
 * No dependencies on purpose — this is meant to run from a checkout.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TOOLS, callTool } from './tools.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROTOCOL = '2024-11-05';
const SERVER = { name: 'stormy', version: '1.0.0' };

let CORPUS = null;

/**
 * Corpus discovery, in order of preference:
 *   1. $STORMY_CORPUS            explicit override
 *   2. ../ui-hall/data/corpus.json   the sibling site build
 *   3. ./corpus.json             a vendored copy
 */
function findCorpus() {
  const candidates = [
    process.env.STORMY_CORPUS,
    path.resolve(HERE, '..', 'ui-hall', 'data', 'corpus.json'),
    path.resolve(HERE, 'corpus.json'),
  ].filter(Boolean);
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

function loadCorpus() {
  if (CORPUS) return CORPUS;
  const file = findCorpus();
  if (!file) {
    throw new Error(
      'Stormy corpus not found. Looked for $STORMY_CORPUS, ../ui-hall/data/corpus.json and ./corpus.json. ' +
      'Build it with tools/build_corpus.py, or point $STORMY_CORPUS at the file.'
    );
  }
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  raw.__path = file;
  CORPUS = raw;
  return CORPUS;
}

/* ------------------------------------------------------------- transport -- */

function send(msg) {
  process.stdout.write(JSON.stringify(msg) + '\n');
}

function reply(id, result) { send({ jsonrpc: '2.0', id, result }); }
function fail(id, code, message, data) {
  send({ jsonrpc: '2.0', id, error: { code, message, ...(data ? { data } : {}) } });
}

async function handle(msg) {
  const { id, method, params } = msg;

  switch (method) {
    case 'initialize':
      return reply(id, {
        protocolVersion: PROTOCOL,
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER,
        instructions:
          'Stormy is a design-reference corpus gathered from real product work. Start with ' +
          'search_designs to find examples for the screen you are building, then get_asset for the ' +
          'full write-up and measured palette. Use list_facets first if you do not know what ' +
          'vocabulary the corpus uses. Palettes returned here are measured from pixels, so they ' +
          'are safe to use as literal values.',
      });

    case 'notifications/initialized':
      return; // notification, no response

    case 'tools/list':
      return reply(id, {
        tools: TOOLS.map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema,
        })),
      });

    case 'tools/call': {
      const name = params?.name;
      const args = params?.arguments ?? {};
      const tool = TOOLS.find((t) => t.name === name);
      if (!tool) return fail(id, -32602, `Unknown tool: ${name}`);
      try {
        const corpus = loadCorpus();
        const out = await callTool(name, args, corpus, HERE);
        return reply(id, {
          content: [{ type: 'text', text: typeof out === 'string' ? out : JSON.stringify(out, null, 1) }],
          isError: false,
        });
      } catch (err) {
        return reply(id, {
          content: [{ type: 'text', text: `Error in ${name}: ${err.message}` }],
          isError: true,
        });
      }
    }

    case 'ping':
      return reply(id, {});

    case 'resources/list':
      return reply(id, { resources: [] });

    case 'prompts/list':
      return reply(id, { prompts: [] });

    default:
      if (id !== undefined) fail(id, -32601, `Method not found: ${method}`);
  }
}

/* ------------------------------------------------------------------ main -- */

async function main() {
  // Fail loudly at startup rather than on the first tool call — an agent that
  // gets a clean error before connecting can tell the user what to fix.
  try {
    const c = loadCorpus();
    process.stderr.write(
      `[stormy] corpus loaded: ${c.totals.assets} assets (${c.totals.described} described, ` +
      `${c.totals.clips} motion clips) from ${c.__path}\n`
    );
  } catch (err) {
    process.stderr.write(`[stormy] ${err.message}\n`);
  }

  let buffer = '';
  process.stdin.setEncoding('utf8');

  process.stdin.on('data', (chunk) => {
    buffer += chunk;

    // newline-delimited JSON, but tolerate a stray Content-Length framing header
    let nl;
    while ((nl = buffer.indexOf('\n')) !== -1) {
      let line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line) continue;

      if (/^Content-Length:/i.test(line)) {
        const headerEnd = buffer.indexOf('\r\n\r\n');
        const bare = buffer.indexOf('\n\n');
        if (headerEnd !== -1 || bare !== -1) {
          const cut = headerEnd !== -1 ? headerEnd + 4 : bare + 2;
          line = buffer.slice(0, cut).trim();
          buffer = buffer.slice(cut);
        } else {
          continue;
        }
      }

      let msg;
      try {
        msg = JSON.parse(line);
      } catch {
        process.stderr.write(`[stormy] unparseable line: ${line.slice(0, 120)}\n`);
        continue;
      }
      handle(msg).catch((err) => {
        if (msg && msg.id !== undefined) fail(msg.id, -32603, err.message);
      });
    }
  });

  process.stdin.on('end', () => process.exit(0));
  process.on('SIGINT', () => process.exit(0));
  process.on('SIGTERM', () => process.exit(0));
}

main();
