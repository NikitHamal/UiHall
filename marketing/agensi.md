# Agensi listing — UI Hall

Everything needed to submit at https://www.agensi.io/dashboard/submit. Upload **`skills/uihall.zip`**
(built by `node tools/build_release.mjs`; also downloadable from
https://nikithamal.github.io/UiHall/skills/uihall.zip).

---

**Name:** UI Hall — Design From Evidence

**Tagline (≤ 80 chars):** Your agent designs from 755 real, hand-described UIs — not the generic average.

**Category:** Design / Frontend · **Tags:** ui, ux, design, frontend, design-system, tailwind, swiftui, accessibility, palette, mcp

**Works with:** Claude Code, Cursor, Codex CLI, GitHub Copilot (VS Code agent mode), Gemini CLI, Windsurf,
Claude Desktop — any agent that reads SKILL.md; MCP server optional.

## Short description

Ask an agent for "a finance app" and you get a blue gradient, a card and a rounded button. UI Hall gives your agent a
corpus of 755 real interfaces — mobile screens, websites, dashboards, motion studies, design systems, redesigns — each
written up by a person who looked at it, with every palette measured from the pixels. The skill makes the agent pull a
brief, actually look at the closest references, take their structure (not their skin), use measured colour, export
tokens and check contrast before it calls the work done.

## What you get

- **A workflow, not a prompt.** Brief → look → steal structure → measured colour → checklist, plus a critique rubric
  for reviewing existing UI.
- **`design_brief` in one call:** closest references, motion references, structural patterns with build rules, three
  measured palettes split into background / surface / text / accent with WCAG checks, do/avoid guidance and a
  done-checklist.
- **References the agent can see:** returns real images (and six-frame strips for videos) to multimodal models.
- **Colour you can paste:** palette → CSS variables, Tailwind, W3C design tokens, SwiftUI or Jetpack Compose, with
  11-step ramps and contrast fixes.
- **21 patterns with receipts:** hero number, bento grid, chip-filter row, bottom sheet, dark + single accent, AI chat
  composer… each with build rules and the references that prove it.
- **A whole design system from one reference:** `generate_design_system` emits colour, a type pairing and scale chosen
  from the reference's style, radius, motion and base components as one CSS file.
- **Compare directions:** `compare_designs` puts 2–4 references side by side with shared vs distinct traits and contrast.
- **Search by colour:** "show me real interfaces built on this lime" — matched perceptually in OKLab.
- **Zero setup:** a bundled single-file Node CLI (no dependencies, no API key). Optional MCP server for agents that
  prefer tools.

## Example prompts

- "Design the onboarding for a sleep-tracking app. Calm, iOS."
- "Build a pricing section for our dev tool in Tailwind."
- "Critique this dashboard screenshot and give me the top three fixes."
- "Give me a premium dark palette for a crypto wallet as SwiftUI colours."

## Honesty / review notes (for the reviewer)

- **Network:** the CLI makes plain HTTPS GETs to the public GitHub Pages site
  (`nikithamal.github.io/UiHall/`) for the corpus JSON (cached 24 h in `~/.cache/uihall`) and, only when asked,
  a reference image. No user data is sent. No telemetry, no credentials. Disclosed in SKILL.md.
- **Code:** `scripts/uihall.mjs` is a readable, unminified single-file build of the open-source engine at
  https://github.com/NikitHamal/UiHall/tree/main/mcp/src. MIT.
- **Data:** descriptions were written by looking at each asset and re-audited against the pixels in October 2026;
  palettes and motion are computed. Reference images remain the property of their designers and are used as study
  references; the skill instructs agents to learn structure and never ship clones.

## Pricing suggestion

The repo and site are public, so the paid value is the packaging, curation and workflow. Two reasonable options:

1. **Free** for the first listing — builds reviews and ranking, drives traffic to the site and GitHub.
2. **$9 one-time** — comparable to other design skills; keep the GitHub version as the free tier.

## Proof it works

Three prototypes built by following the skill end to end: https://nikithamal.github.io/UiHall/demo/ — each cites the
references and measured palette it used. `evals/README.md` in the skill lists the behaviours it is graded on.

## Screenshots

`marketing/shots/` — home hero, the agent demo, detail view with tokens, playground running `design_brief`, library.
