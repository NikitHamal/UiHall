# UiHall, redesigned with UiHall

## Product goal

Help designers and frontend developers find, inspect and reason from a substantial
reference collection. The primary journey is explore → inspect → shortlist → brief.
The website also demonstrates the same workflow taught by the skill and MCP.

## Evidence and authored decisions

| Reference | Inspected evidence | Transfer | Newly authored for UiHall |
|---|---|---|---|
| VID-0377 | Poster with white tree/root art, near-black ground, small supporting text | Let one expressive visual carry a composition | Study-table exhibit, restrained archive chrome |
| VID-0397 | Poster with fanned metallic cards on a dark mobile screen | Use overlap and depth to communicate a selected study | Layered reference display and explicit motion playback |
| VID-0420 | Landscape travel-site poster with full-width terrain imagery | Preserve the reference's aspect and visual context | Contained image presentation rather than aggressive crops |
| VID-0400 | In-hand colour-personalisation poster | Keep capture context visible | Media inspection with capture notes and scoped review evidence |

These poster observations do not establish clip timing or easing. The typography,
olive and neutral colours, layout, shortlist interaction and navigation are authored
choices, not values represented as corpus measurements.

## Delivered behavior

The archive uses a quiet editorial shell and an image-led hero. Category shortcuts,
URL filters, a real image/video kind switch, sorting, theme persistence and keyboard
search support browsing. Cards retain the complete image inside their frame.

The local shortlist survives refresh. A brief export includes the actual selected
IDs, inherited descriptions, sampled palettes, capture notes and implementation
criteria. Nothing is sent to an AI service by the browser.

The Motion Room restricts results to playable derivatives and provides explicit
selection, playback and speed controls. Video does not begin playing merely because
the page opened. Hover previews respect reduced motion, and asset-viewer autoplay
is suppressed for that preference. Native dialogs contain focus and close on Escape.

The MCP now returns actual image content, validates inputs, exposes reference
comparison and implementation planning, and avoids making unrelated results look
like evidence. Search and brief generation previously added a description bonus to
all records; that error is covered by regression tests.

## Data corrections

Targeted inspection uncovered several descriptions attached to the wrong subject:
a collector-achievement clip described as a bookshelf, Dashr onboarding described
as a dark item list, a music gift promo described as receipt OCR, and a lock-screen
editor described as photo mosaics. Nine records were rewritten and 32 records now
carry explicit visual-review scope. The immutable source media was retained.

The portable builder merges review overrides without losing unrelated metadata.
The audit checks files, taxonomy, totals, palette validity, groups and JSON/JS twins.
734 records remain without an independent visual review; structural integrity does
not imply their descriptions are visually accurate.

## Validation

Run `npm test` for protocol, tool regressions and corpus integrity. Run
`npm run test:browser` for the actual archive, shortlist/clipboard, filters, modal
focus, motion player, integration page, themes, mobile and reduced-motion journeys,
plus automated accessibility checks across all routes. These checks complement
manual visual inspection; they do not constitute a complete accessibility audit.
