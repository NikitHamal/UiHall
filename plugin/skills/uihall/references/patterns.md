# Pattern library

Generated from the corpus (v3.0.0, 404 references) by `tools/build_release.mjs`.
Evidence ids open at `https://nikithamal.github.io/UiHall/#/a/<id>` or via `get_design` / `view_design`.

## One hero number

A single figure set far larger than everything around it, with supporting detail subordinated. The fastest way to give a screen a focal point without decoration.

- Hero figure 2.5–4× body size, tabular numerals, tight tracking (-0.02em).
- One supporting line directly under it (delta, period or unit) at muted contrast.
- Nothing else on the screen above the fold at the same weight.

Evidence (60): ORG-0017 (Card patterns sheet), ORG-0801 (Ride-hailing desktop dashboard · Glide), ORG-1025 (Travel desktop dashboard · Wander), ORG-1073 (Crypto insights · Halo)

## Metric grid

Small multiples of equal-weight tiles, each one number and one label. Reads in a glance and reflows cleanly to narrow screens.

- 2-up on mobile, 3–4-up on desktop; identical tile height.
- Number first, label second; never more than one chart per tile.
- Colour encodes status only, never decoration.

Evidence (58): ORG-1553 (Smart home desktop dashboard · Hearth), ORG-0925 (Social home · Loop), ORG-1481 (News & reading desktop dashboard · Margin), ORG-0253 (Events & tickets home · Gather)

## Bottom tab bar, 4–5 destinations

Fixed bottom navigation with a small, stable set of destinations; the active one marked by tint, not weight.

- 44pt+ hit targets, labels under icons, max five items.
- Active = accent tint + filled icon; inactive = 60% ink.
- Respect the home indicator safe area.

Evidence (104): ORG-1001 (Productivity profile · Plan), ORG-0849 (Fashion e-commerce activity feed · Thread), ORG-1033 (Travel empty state · Wander), ORG-0813 (Ride-hailing home · Glide)

## Scrollable chip-filter row

Filters as chips in one horizontally scrolling row — never wrapping, never clipping.

- Fixed 36–44px height, min-width ~72px so "All" never collapses to a circle.
- white-space: nowrap; overflow-x: auto; hidden scrollbar; edge fade.
- Selected chip inverts (ink fill), not just a border change.

Evidence (96): ORG-1577 (Smart home device list · Hearth), ORG-1537 (News & reading support chat · Margin), ORG-1213 (Music streaming support chat · Tide), ORG-1261 (Ride-hailing support chat · Glide)

## Segmented range control

A Week / Month switch that redraws one view and moves nothing else. One state, one controller.

- 2–4 segments, equal widths, sliding thumb animated 200–250ms.
- Abbreviate day labels to three letters, never one.
- Only the controlled region re-renders.

Evidence (25): ORG-1157 (Real estate schedule · Nest), ORG-1189 (Personal finance schedule · Ledger), ORG-1141 (Health schedule · Dose), ORG-1237 (Plant care schedule · Fern)

## Empty state that teaches

The zero-data screen explains what will appear and offers exactly one action, instead of a grey "No data".

- Illustration or icon ≤ 30% of the viewport.
- One sentence of value, one primary button.
- Show a ghosted preview of the filled state when possible.

Evidence (21): ORG-1033 (Travel empty state · Wander), ORG-0529 (Language learning empty state · Fable), ORG-0305 (Fitness empty state · Pulse), ORG-1345 (Business invoicing empty state · Tally)

## Single-promise onboarding

Each onboarding step makes one promise with one visual; progress dots and a single primary CTA carry the flow.

- Visual top 55–60%, headline + one line below.
- Primary CTA full-width at the thumb zone; "Log in" as secondary text.
- Three steps maximum before value.

Evidence (22): ORG-1437 (Job search welcome · Shortlist), ORG-1509 (News & reading welcome · Margin), ORG-0025 (Empty inbox that teaches), ORG-0037 (Welcome with orbit illustration)

## Type-led marketing hero

A large statement in a confident face, with the product shot secondary. Survives translation and small screens.

- Headline 56–96px desktop, line-height 0.95–1.05, max ~12 words.
- One sentence of support, two CTAs max (primary + ghost).
- Product visual below or beside, never behind the headline.

Evidence (45): ORG-0761 (Plant care landing hero · Fern), ORG-0773 (Plant care pricing · Fern), ORG-0705 (Pet care landing hero · Paws), ORG-0717 (Pet care pricing · Paws)

## AI chat with anchored composer

Conversation scrolls; the composer stays anchored with attachments and model controls inline. The pattern most AI products converge on.

- Composer pinned bottom, grows to ~6 lines then scrolls.
- Assistant replies full-width, user messages as compact bubbles.
- Suggested prompts as chips only in the empty state.

Evidence (24): ORG-1277 (Fashion e-commerce support chat · Thread), ORG-1245 (Plant care support chat · Fern), ORG-1213 (Music streaming support chat · Tide), ORG-1117 (Fitness support chat · Pulse)

## Dense data table with quiet chrome

Tables carry the data; chrome recedes. Zebra-free rows, hairline dividers, status as small pills.

- Row height 40–48px, tabular numerals, right-align numbers.
- Sticky header; filters above, not in the header row.
- Status pills: tinted background at 12–16% with full-strength text.

Evidence (66): ORG-0353 (Food delivery desktop dashboard · Bowl), ORG-1265 (Fashion e-commerce insights · Thread), ORG-1217 (Pet care insights · Paws), ORG-1185 (Personal finance insights · Ledger)

## Sidebar workspace shell

A persistent left rail for navigation and a content canvas on the right — the default shell for productive web apps.

- Rail 220–260px, collapsible to 64px icons.
- Group nav with small caps headings; active row tinted, not bold.
- Canvas max-width only for reading views, never for tables.

Evidence (25): ORG-0065 (Kanban board with swimlane columns), ORG-0745 (Plant care desktop dashboard · Fern), ORG-0689 (Pet care desktop dashboard · Paws), ORG-0521 (Language learning desktop dashboard · Fable)

## Progress ring as the hero

Goal completion shown as one ring (or nested rings) carrying the number inside. Instantly legible for habits, fitness and budgets.

- Stroke 8–14% of diameter with rounded caps.
- Number centred inside, unit below at small size.
- Animate fill on appear (600–900ms, ease-out).

Evidence (29): ORG-1497 (News & reading insights · Margin), ORG-1569 (Smart home insights · Hearth), ORG-1201 (Music streaming insights · Tide), ORG-1233 (Plant care insights · Fern)

## Three tiers, one anchored

Three plans side by side with the recommended one visually anchored — darker, taller or tagged — so the decision is made for most visitors before they compare rows.

- Three columns max; middle or right plan anchored by fill, not just a badge.
- Billing toggle directly above the prices it changes; show the saving as a number.
- One CTA per plan, the anchored plan's CTA is the only filled one.

Evidence (22): ORG-0493 (Real estate pricing · Nest), ORG-0549 (Language learning pricing · Fable), ORG-0213 (Crypto pricing · Halo), ORG-0269 (Events & tickets pricing · Gather)

## Sticky bottom action

The primary action pinned to the bottom of a scrolling screen with the total or state beside it — always reachable by the thumb, never hidden below long content.

- Pinned bar 64–84pt with a safe-area inset; content gets matching bottom padding.
- Show the consequence on the button ("Pay $42.10", not "Continue").
- Hairline or blur behind the bar instead of a heavy shadow.

Evidence (66): ORG-0581 (Personal finance account detail · Ledger), ORG-1193 (Personal finance confirmation · Ledger), ORG-0461 (Real estate book a viewing · Nest), ORG-1161 (Real estate confirmation · Nest)

## Grouped settings, instant toggles

Preferences split into small labelled groups of rows, each change applied the moment it is made. Scannable, forgiving, and nothing to save.

- Account row first; 2–4 rows per group under a small-caps header.
- Toggles apply instantly — no Save button; values (System, Classic) sit right-aligned with a chevron.
- Destructive actions last, alone, in red text rather than a red fill.

Evidence (22): ORG-0953 (Social settings · Loop), ORG-1065 (Travel settings · Wander), ORG-0897 (Fashion e-commerce settings · Thread), ORG-1009 (Productivity settings · Plan)

## Celebrate, then itemise

A brief, confident success moment followed immediately by exactly what happened — the receipt is what actually reassures.

- One large check in the accent with a soft halo; headline under 3 words.
- Itemised card: 3–4 lines and a bold total, tabular numerals.
- One primary "Done", one quiet secondary (share, add to calendar).

Evidence (20): ORG-1081 (Crypto confirmation · Halo), ORG-1193 (Personal finance confirmation · Ledger), ORG-1161 (Real estate confirmation · Nest), ORG-1177 (Language learning confirmation · Fable)

## Week strip over a day timeline

A compact row of days picks the date; a time rail below lays out that day. Both scales in one view, no month grid needed.

- Seven equal day cells; selected day filled with the accent, today marked with a dot.
- Times in a fixed 44–56px left rail, tabular numerals.
- Highlight the current or next block; everything else stays neutral.

Evidence (21): ORG-1449 (Job search schedule · Shortlist), ORG-1189 (Personal finance schedule · Ledger), ORG-1109 (Fitness schedule · Pulse), ORG-1077 (Crypto schedule · Halo)

## Search that helps before you type

A focused field with recents, scopes and top results already showing — the screen is useful at zero characters.

- Field focused with a clear button; scopes as a chip row directly below.
- Recent searches as small pills; top results as full rows with a trailing value.
- Group results under small-caps labels; never an empty white page.

Evidence (42): ORG-0317 (Fitness workout list · Pulse), ORG-0333 (Fitness search · Pulse), ORG-0389 (Food delivery search · Bowl), ORG-1381 (Business invoicing search · Tally)
