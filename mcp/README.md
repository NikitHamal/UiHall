# uihall-mcp

MCP server for [UI Hall](https://nikithamal.github.io/UiHall/) — 404 live, MIT-licensed UI screens built in code, with
palettes measured from the pixels. Gives coding agents design evidence: briefs, searchable and *viewable* references,
patterns with build rules, measured palettes, token export and contrast checks.

```bash
curl -fsSL https://nikithamal.github.io/UiHall/mcp/dist/uihall-mcp.mjs -o ~/.uihall-mcp.mjs
claude mcp add uihall --scope user -- node ~/.uihall-mcp.mjs
```

Once published to npm: `claude mcp add uihall -- npx -y uihall-mcp`.

- **Transports:** stdio (default) · Streamable HTTP with `--http [port]` (`POST /mcp`, `GET /health`)
- **Protocol:** 2025-06-18 (negotiates 2025-03-26 and 2024-11-05) · tools with annotations and `structuredContent` ·
  image content · resources + templates · prompts
- **Zero dependencies**, Node 18+. Corpus resolution: `UIHALL_CORPUS` → local checkout (`UIHALL_ROOT`) →
  `~/.cache/uihall` → the public site.

Tools: `design_brief`, `search_designs`, `view_design`, `get_design`, `find_similar`, `find_patterns`, `palette_for`,
`search_by_color`, `export_tokens`, `compare_designs`, `generate_design_system`, `check_contrast`, `corpus_overview`. Full reference and an in-browser
playground: https://nikithamal.github.io/UiHall/#/agents

```bash
npm run build   # src → dist/uihall-mcp.mjs and the skill CLI
npm test        # 31 protocol checks against source and bundle
```
