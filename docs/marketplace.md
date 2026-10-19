# UiHall design workbench — listing draft

**One-line description:** Give your agent a design research workflow: search real interfaces, inspect images and motion, and turn reference evidence into an original implementation.

**Category:** Design / frontend development / agent skill

## What installs

The `stormy-design` skill (legacy folder name retained) teaches reference discovery,
visual inspection, comparison, semantic token design, purposeful motion and browser
verification. Its CLI uses the same tool engine as the UiHall MCP server. The ZIP
contains skill instructions, two focused references, the CLI, tool engine and corpus
metadata. Third-party screenshots and video files are not in this bundle.

For visual inspection and MCP, clone the full UiHall repository, install Node 18+,
and set `UIHALL_ROOT` to the checkout if you copy the skill elsewhere. The local MCP
server needs no API key, paid provider, database or dependency install.

## What makes it useful

- 766 indexed references, with 273 playable derivatives in the full checkout.
- Native MCP image content, not just inaccessible paths.
- Search filters, ranked results with match terms, and pagination.
- Side-by-side reference metadata and evidence-linked implementation worksheets.
- Motion discovery with observation prompts that avoid invented timing claims.
- Measured pixel palettes, printed-card values and actual contrast checks.
- Explicit separation of inherited descriptions, scoped visual review and inference.

## Honest limits

32 records have a scoped visual review in this release; 734 remain without that
independent review. All 766 pass structural integrity checks. Description presence
is not proof of accuracy. Nine descriptions were rewritten after direct media
inspection. Review scopes are recorded per item; poster checks and sampled video
frames are not full playback reviews.

Search is local weighted term overlap, not semantic embeddings. Original designer
attribution is incomplete. Media remains reference-only; this skill grants no
commercial media reuse rights. Installation/configuration differs across clients;
do not advertise untested support for "20+ agents" as a verified integration claim.

## Demonstration

UiHall's own redesigned archive is the worked example: inspect VID-0377 and
VID-0397, author an independent olive/neutral token system, implement a responsive
archive and motion player, and test the complete browser journey. See
[case-study.md](case-study.md).

## Release checklist

1. Run `npm test` and `npm run test:browser`.
2. Run `npm run package:skill` and inspect the ZIP in an isolated directory.
3. Use the ZIP for marketplace review, explaining the full-checkout requirement.
4. Choose price, support terms and final listing copy yourself before publication.

This is a prepared listing draft. No marketplace listing has been submitted.
