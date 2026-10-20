# Pattern library

Generated from the corpus (v3.0.0, 332 references) by `tools/build_release.mjs`.
Evidence ids open at `https://nikithamal.github.io/UiHall/#/a/<id>` or via `get_design` / `view_design`.

## One hero number

A single figure set far larger than everything around it, with supporting detail subordinated. The fastest way to give a screen a focal point without decoration.

- Hero figure 2.5–4× body size, tabular numerals, tight tracking (-0.02em).
- One supporting line directly under it (delta, period or unit) at muted contrast.
- Nothing else on the screen above the fold at the same weight.

Evidence (49): ORG-0001 (Analytics overview with sidebar), ORG-0017 (Card patterns sheet), ORG-0029 (Money home with hero balance), ORG-0185 (Crypto desktop dashboard · Halo)

## Metric grid

Small multiples of equal-weight tiles, each one number and one label. Reads in a glance and reflows cleanly to narrow screens.

- 2-up on mobile, 3–4-up on desktop; identical tile height.
- Number first, label second; never more than one chart per tile.
- Colour encodes status only, never decoration.

Evidence (47): ORG-0001 (Analytics overview with sidebar), ORG-0029 (Money home with hero balance), ORG-0045 (Profile with stats and streak grid), ORG-0061 (Activity rings and workout list)

## Bottom tab bar, 4–5 destinations

Fixed bottom navigation with a small, stable set of destinations; the active one marked by tint, not weight.

- 44pt+ hit targets, labels under icons, max five items.
- Active = accent tint + filled icon; inactive = 60% ink.
- Respect the home indicator safe area.

Evidence (19): ORG-0029 (Money home with hero balance), ORG-0145 (Social feed with post actions), ORG-0165 (Podcast library with continue listening), ORG-0197 (Crypto home · Halo)

## Scrollable chip-filter row

Filters as chips in one horizontally scrolling row — never wrapping, never clipping.

- Fixed 36–44px height, min-width ~72px so "All" never collapses to a circle.
- white-space: nowrap; overflow-x: auto; hidden scrollbar; edge fade.
- Selected chip inverts (ink fill), not just a border change.

Evidence (79): ORG-0005 (AI assistant chat with composer), ORG-0021 (Buttons, inputs and controls sheet), ORG-0049 (Search with filter chips and results), ORG-0069 (Messages inbox with pinned threads)

## Segmented range control

A Week / Month switch that redraws one view and moves nothing else. One state, one controller.

- 2–4 segments, equal widths, sliding thumb animated 200–250ms.
- Abbreviate day labels to three letters, never one.
- Only the controlled region re-renders.

Evidence (21): ORG-0021 (Buttons, inputs and controls sheet), ORG-0057 (Calendar day with timeline), ORG-0061 (Activity rings and workout list), ORG-0089 (Flight selection with date strip)

## Empty state that teaches

The zero-data screen explains what will appear and offers exactly one action, instead of a grey "No data".

- Illustration or icon ≤ 30% of the viewport.
- One sentence of value, one primary button.
- Show a ghosted preview of the filled state when possible.

Evidence (17): ORG-0025 (Empty inbox that teaches), ORG-0193 (Crypto empty state · Halo), ORG-0249 (Events & tickets empty state · Gather), ORG-0305 (Fitness empty state · Pulse)

## Single-promise onboarding

Each onboarding step makes one promise with one visual; progress dots and a single primary CTA carry the flow.

- Visual top 55–60%, headline + one line below.
- Primary CTA full-width at the thumb zone; "Log in" as secondary text.
- Three steps maximum before value.

Evidence (18): ORG-0025 (Empty inbox that teaches), ORG-0037 (Welcome with orbit illustration), ORG-0209 (Crypto welcome · Halo), ORG-0265 (Events & tickets welcome · Gather)

## Type-led marketing hero

A large statement in a confident face, with the product shot secondary. Survives translation and small screens.

- Headline 56–96px desktop, line-height 0.95–1.05, max ~12 words.
- One sentence of support, two CTAs max (primary + ghost).
- Product visual below or beside, never behind the headline.

Evidence (37): ORG-0033 (Product landing hero with app preview), ORG-0093 (Feature bento grid section), ORG-0097 (Pricing section with anchored plan), ORG-0101 (Testimonials wall with logo strip)

## AI chat with anchored composer

Conversation scrolls; the composer stays anchored with attachments and model controls inline. The pattern most AI products converge on.

- Composer pinned bottom, grows to ~6 lines then scrolls.
- Assistant replies full-width, user messages as compact bubbles.
- Suggested prompts as chips only in the empty state.

Evidence (20): ORG-0005 (AI assistant chat with composer), ORG-0069 (Messages inbox with pinned threads), ORG-0105 (AI image studio with prompt and grid), ORG-0129 (Chat thread with reactions and composer)

## Dense data table with quiet chrome

Tables carry the data; chrome recedes. Zebra-free rows, hairline dividers, status as small pills.

- Row height 40–48px, tabular numerals, right-align numbers.
- Sticky header; filters above, not in the header row.
- Status pills: tinted background at 12–16% with full-strength text.

Evidence (54): ORG-0001 (Analytics overview with sidebar), ORG-0061 (Activity rings and workout list), ORG-0065 (Kanban board with swimlane columns), ORG-0121 (Email client with three panes)

## Sidebar workspace shell

A persistent left rail for navigation and a content canvas on the right — the default shell for productive web apps.

- Rail 220–260px, collapsible to 64px icons.
- Group nav with small caps headings; active row tinted, not bold.
- Canvas max-width only for reading views, never for tables.

Evidence (21): ORG-0001 (Analytics overview with sidebar), ORG-0065 (Kanban board with swimlane columns), ORG-0121 (Email client with three panes), ORG-0133 (Customers table with filters and bulk actions)

## Progress ring as the hero

Goal completion shown as one ring (or nested rings) carrying the number inside. Instantly legible for habits, fitness and budgets.

- Stroke 8–14% of diameter with rounded caps.
- Number centred inside, unit below at small size.
- Animate fill on appear (600–900ms, ease-out).

Evidence (25): ORG-0017 (Card patterns sheet), ORG-0037 (Welcome with orbit illustration), ORG-0045 (Profile with stats and streak grid), ORG-0061 (Activity rings and workout list)

## Three tiers, one anchored

Three plans side by side with the recommended one visually anchored — darker, taller or tagged — so the decision is made for most visitors before they compare rows.

- Three columns max; middle or right plan anchored by fill, not just a badge.
- Billing toggle directly above the prices it changes; show the saving as a number.
- One CTA per plan, the anchored plan's CTA is the only filled one.

Evidence (18): ORG-0041 (Paywall with anchored yearly plan), ORG-0097 (Pricing section with anchored plan), ORG-0213 (Crypto pricing · Halo), ORG-0269 (Events & tickets pricing · Gather)

## Sticky bottom action

The primary action pinned to the bottom of a scrolling screen with the total or state beside it — always reachable by the thumb, never hidden below long content.

- Pinned bar 64–84pt with a safe-area inset; content gets matching bottom padding.
- Show the consequence on the button ("Pay $42.10", not "Continue").
- Hairline or blur behind the bar instead of a heavy shadow.

Evidence (54): ORG-0013 (Cart with sticky pay button), ORG-0041 (Paywall with anchored yearly plan), ORG-0081 (Product detail with size picker), ORG-0089 (Flight selection with date strip)
