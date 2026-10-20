/* Install recipes, shared by the home page and the agents page.
   One place to change when the npm package is published. */

export const SITE = 'https://nikithamal.github.io/UiHall/';
export const BUNDLE = `${SITE}mcp/dist/uihall-mcp.mjs`;
export const FETCH = `curl -fsSL ${BUNDLE} -o ~/.uihall-mcp.mjs`;

export const CLIENTS = [
  {
    id: 'plugin', name: 'Claude Code plugin', short: '✦', hint: 'Skill + MCP in one install',
    blurb: 'The easiest path: one plugin bundles the skill and the MCP server. Claude Code fetches only the plugin folder, not the image corpus.',
    steps: [
      ['Add the marketplace', `claude plugin marketplace add ${SITE}.claude-plugin/marketplace.json`],
      ['Install the plugin', 'claude plugin install uihall@uihall'],
    ],
  },
  {
    id: 'claude-code', name: 'Claude Code', short: 'CC', hint: 'Skill + MCP, set up by hand',
    blurb: 'Add the MCP server, then drop in the skill so Claude reaches for UI Hall whenever it designs or builds UI.',
    steps: [
      ['Fetch the server (one file, zero dependencies)', FETCH],
      ['Register it', 'claude mcp add uihall --scope user -- node ~/.uihall-mcp.mjs'],
      ['Install the skill', `mkdir -p ~/.claude/skills && curl -fsSL ${SITE}skills/uihall.tar.gz | tar -xz -C ~/.claude/skills`],
    ],
  },
  {
    id: 'cursor', name: 'Cursor', short: 'Cu', hint: '~/.cursor/mcp.json',
    blurb: 'Fetch the server, then add it to your global MCP config. Cursor picks it up in Settings → MCP.',
    steps: [
      ['Fetch the server', FETCH],
      ['Add to ~/.cursor/mcp.json', JSON.stringify({ mcpServers: { uihall: { command: 'node', args: ['${userHome}/.uihall-mcp.mjs'] } } }, null, 2)],
    ],
  },
  {
    id: 'vscode', name: 'VS Code · Copilot', short: 'VS', hint: '.vscode/mcp.json',
    blurb: 'Agent mode in VS Code reads MCP servers from mcp.json — per workspace or in your user profile.',
    steps: [
      ['Fetch the server', FETCH],
      ['Add to .vscode/mcp.json', JSON.stringify({ servers: { uihall: { type: 'stdio', command: 'node', args: ['${userHome}/.uihall-mcp.mjs'] } } }, null, 2)],
    ],
  },
  {
    id: 'codex', name: 'Codex CLI', short: 'Cx', hint: 'codex mcp add',
    blurb: 'OpenAI’s Codex CLI speaks MCP over stdio too.',
    steps: [
      ['Fetch the server', FETCH],
      ['Register it', 'codex mcp add uihall -- node ~/.uihall-mcp.mjs'],
    ],
  },
  {
    id: 'desktop', name: 'Claude Desktop', short: 'CD', hint: 'claude_desktop_config.json',
    blurb: 'Settings → Developer → Edit config. Use the absolute path to the file you fetched.',
    steps: [
      ['Fetch the server', FETCH],
      ['Add to claude_desktop_config.json', JSON.stringify({ mcpServers: { uihall: { command: 'node', args: ['/Users/you/.uihall-mcp.mjs'] } } }, null, 2)],
    ],
  },
  {
    id: 'http', name: 'Any client · HTTP', short: '⇄', hint: 'Streamable HTTP',
    blurb: 'Run it as a Streamable HTTP server for clients and hosted agents that connect by URL.',
    steps: [
      ['Start the server', 'node ~/.uihall-mcp.mjs --http 8787'],
      ['Point your client at', 'http://127.0.0.1:8787/mcp'],
    ],
  },
];
