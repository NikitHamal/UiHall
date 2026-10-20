# Pattern library

Generated from the corpus (v2.0.0, 755 references) by `tools/build_release.mjs`.
Evidence ids open at `https://nikithamal.github.io/UiHall/#/a/<id>` or via `get_design` / `view_design`.

## One hero number

A single figure set far larger than everything around it, with supporting detail subordinated. The fastest way to give a screen a focal point without decoration.

- Hero figure 2.5–4× body size, tabular numerals, tight tracking (-0.02em).
- One supporting line directly under it (delta, period or unit) at muted contrast.
- Nothing else on the screen above the fold at the same weight.

Evidence (66): IMG-0194 (Kids allowance app home screen), IMG-0219 (Sales overview dashboard in light and dark), IMG-0305 (Finance app balance, analytics and AI coach), IMG-0307 (Multi-currency wallet dark home screen)

## Metric grid

Small multiples of equal-weight tiles, each one number and one label. Reads in a glance and reflows cleanly to narrow screens.

- 2-up on mobile, 3–4-up on desktop; identical tile height.
- Number first, label second; never more than one chart per tile.
- Colour encodes status only, never decoration.

Evidence (42): IMG-0219 (Sales overview dashboard in light and dark), IMG-0301 (Skin scanner home before and after), IMG-0303 (Health app home before and after), IMG-0342 (Creator analytics detail screens with tabs)

## Bento feature grid

Mixed-size tiles on one grid, each selling one capability. Gives a landing page rhythm without long text blocks.

- One 2×2 lead tile, the rest 1×1 / 2×1; consistent 12–20px gutters.
- Each tile: one headline, one visual, no button.
- Corner radius identical on every tile.

Evidence (5): IMG-0577 (Tailark AI features and logo wall), IMG-0599 (Wellness results stat bento), IMG-0653 (Data API dashboard component bento), VID-0147 (Pastel bento of task app features)

## Bottom tab bar, 4–5 destinations

Fixed bottom navigation with a small, stable set of destinations; the active one marked by tint, not weight.

- 44pt+ hit targets, labels under icons, max five items.
- Active = accent tint + filled icon; inactive = 60% ink.
- Respect the home indicator safe area.

Evidence (40): IMG-0184 (Wave training readiness dark home screen), IMG-0194 (Kids allowance app home screen), IMG-0208 (Parcel delivery merchant home screen), IMG-0309 (Marketplace home with category icons)

## Scrollable chip-filter row

Filters as chips in one horizontally scrolling row — never wrapping, never clipping.

- Fixed 36–44px height, min-width ~72px so "All" never collapses to a circle.
- white-space: nowrap; overflow-x: auto; hidden scrollbar; edge fade.
- Selected chip inverts (ink fill), not just a border change.

Evidence (60): IMG-0169 (Dark pill toolbar and status chip set), IMG-0196 (Kids money request and card screens), IMG-0221 (Memrbl book app discover and sign-in), IMG-0228 (Rentify home rental search screen)

## Segmented range control

A Week / Month switch that redraws one view and moves nothing else. One state, one controller.

- 2–4 segments, equal widths, sliding thumb animated 200–250ms.
- Abbreviate day labels to three letters, never one.
- Only the controlled region re-renders.

Evidence (54): IMG-0184 (Wave training readiness dark home screen), IMG-0209 (New delivery form with parcel size picker), IMG-0215 (Productivity home and schedule screens), IMG-0220 (Dark week calendar views with revenue)

## Bottom sheet for secondary tasks

Secondary actions arrive in a sheet over the current context instead of a new screen, so the user never loses their place.

- Grabber + 16–24px top radius; detents at ~50% and full.
- Dim the background 30–40%; tap-outside dismisses.
- Primary action pinned to the bottom of the sheet.

Evidence (38): IMG-0221 (Memrbl book app discover and sign-in), IMG-0257 (New topic sheet with shape picker), IMG-0258 (Pomodoro topic timer settings sheet), IMG-0283 (Four day streak reward modal)

## Empty state that teaches

The zero-data screen explains what will appear and offers exactly one action, instead of a grey "No data".

- Illustration or icon ≤ 30% of the viewport.
- One sentence of value, one primary button.
- Show a ghosted preview of the filled state when possible.

Evidence (16): IMG-0198 (Dark AI agent app empty start screen), IMG-0210 (Delivery app first-run home with steps), IMG-0343 (Smart alarms home with empty state), IMG-0353 (Voice library empty state with 3D stack)

## Single-promise onboarding

Each onboarding step makes one promise with one visual; progress dots and a single primary CTA carry the flow.

- Visual top 55–60%, headline + one line below.
- Primary CTA full-width at the thumb zone; "Log in" as secondary text.
- Three steps maximum before value.

Evidence (105): IMG-0161 (Scripture app onboarding screens, eight variants), IMG-0180 (Volta splash built in four steps), IMG-0185 (Nova AI splash built in three steps), IMG-0210 (Delivery app first-run home with steps)

## Dark surface, single hot accent

A near-black canvas with exactly one saturated accent carrying every interactive element. The accent does all the wayfinding.

- Background L≈0.15–0.2 (not pure black) so elevation can still read.
- One accent at chroma ≥ 0.15; every CTA, toggle and active state uses it.
- Body text ~#E8E8E8, never pure white on black.

Evidence (30): IMG-0180 (Volta splash built in four steps), IMG-0223 (Health score home with care plan), IMG-0224 (Dosebase paywall, success and invite screens), IMG-0296 (Crypto wallet receive QR screen)

## Soft light canvas, tinted cards

Off-white ground with cards separated by a light tint instead of shadows. Calm, airy and survives low-quality displays.

- Ground #F5–F8 neutral; cards one step lighter or tinted 4–6%.
- Radius 16–24px, no drop shadow or a 1px hairline at most.
- Accent reserved for the single primary action.

Evidence (82): IMG-0188 (Focus3 landing hero with daily wins card), IMG-0189 (Focus3 daily intentions landing page), IMG-0191 (Muse goals list store screen), IMG-0192 (Muse personal agent chat store screen)

## Type-led marketing hero

A large statement in a confident face, with the product shot secondary. Survives translation and small screens.

- Headline 56–96px desktop, line-height 0.95–1.05, max ~12 words.
- One sentence of support, two CTAs max (primary + ghost).
- Product visual below or beside, never behind the headline.

Evidence (58): IMG-0150 (Verdant SEO landing hero with dashboard), IMG-0183 (Wandor AI trip planner landing page), IMG-0187 (Elsewhere poster with ringed planet), IMG-0188 (Focus3 landing hero with daily wins card)

## Editorial serif display

A serif display face over a neutral sans for UI. Signals craft and calm; strongest in finance, wellness and content products.

- Serif only at ≥ 28px; sans for everything interactive.
- Generous leading on body (1.5–1.6).
- Pair with a restrained palette — the type is the ornament.

Evidence (39): IMG-0161 (Scripture app onboarding screens, eight variants), IMG-0187 (Elsewhere poster with ringed planet), IMG-0189 (Focus3 daily intentions landing page), IMG-0193 (Elsewhere poster with ringed blue planet)

## AI chat with anchored composer

Conversation scrolls; the composer stays anchored with attachments and model controls inline. The pattern most AI products converge on.

- Composer pinned bottom, grows to ~6 lines then scrolls.
- Assistant replies full-width, user messages as compact bubbles.
- Suggested prompts as chips only in the empty state.

Evidence (70): IMG-0169 (Dark pill toolbar and status chip set), IMG-0183 (Wandor AI trip planner landing page), IMG-0191 (Muse goals list store screen), IMG-0192 (Muse personal agent chat store screen)

## Dense data table with quiet chrome

Tables carry the data; chrome recedes. Zebra-free rows, hairline dividers, status as small pills.

- Row height 40–48px, tabular numerals, right-align numbers.
- Sticky header; filters above, not in the header row.
- Status pills: tinted background at 12–16% with full-strength text.

Evidence (73): IMG-0184 (Wave training readiness dark home screen), IMG-0199 (AI agent task chat with results table), IMG-0220 (Dark week calendar views with revenue), IMG-0222 (Health vitals home with vertical bars)

## Sidebar workspace shell

A persistent left rail for navigation and a content canvas on the right — the default shell for productive web apps.

- Rail 220–260px, collapsible to 64px icons.
- Group nav with small caps headings; active row tinted, not bold.
- Canvas max-width only for reading views, never for tables.

Evidence (30): IMG-0483 (Recruiting outreach sequence editor), IMG-0499 (WorkStation project dashboard), IMG-0500 (Ocupite payroll dashboard), IMG-0518 (CloseCRM analytics dashboard)

## Progress ring as the hero

Goal completion shown as one ring (or nested rings) carrying the number inside. Instantly legible for habits, fitness and budgets.

- Stroke 8–14% of diameter with rounded caps.
- Number centred inside, unit below at small size.
- Animate fill on appear (600–900ms, ease-out).

Evidence (49): IMG-0195 (Kids piggy bank savings goal screen), IMG-0222 (Health vitals home with vertical bars), IMG-0226 (Steps screen before and after revamp), IMG-0227 (AI study notes app home screen)

## Frameless device on flat colour

A phone on a solid tint — the workhorse presentation for a single screen; the screen becomes the whole composition.

- Backdrop picked from the screen's own accent at low chroma.
- Device at 60–70% of frame height, centred, no props.
- One line of caption maximum.

Evidence (52): IMG-0184 (Wave training readiness dark home screen), IMG-0191 (Muse goals list store screen), IMG-0217 (Rome destination screen over painted backdrop), IMG-0246 (Step game app store screenshot set)

## Multi-screen flow strip

Three or more screens of one flow left to right. Encodes the journey rather than any single screen.

- Equal device sizes, equal gaps; sequence reads left → right.
- Annotate only the step that changes something.
- Keep shared chrome identical across steps so the delta stands out.

Evidence (276): IMG-0161 (Scripture app onboarding screens, eight variants), IMG-0196 (Kids money request and card screens), IMG-0215 (Productivity home and schedule screens), IMG-0219 (Sales overview dashboard in light and dark)

## Three tiers, one anchored

Three plans side by side with the recommended one visually anchored — darker, taller or tagged — so the decision is made for most visitors before they compare rows.

- Three columns max; middle or right plan anchored by fill, not just a badge.
- Billing toggle directly above the prices it changes; show the saving as a number.
- One CTA per plan, the anchored plan's CTA is the only filled one.

Evidence (26): IMG-0224 (Dosebase paywall, success and invite screens), IMG-0225 (Ghost mascot onboarding flow, ten screens), IMG-0240 (Arc habit app onboarding and paywall), IMG-0332 (Settings with iridescent unlock card)

## Sticky bottom action

The primary action pinned to the bottom of a scrolling screen with the total or state beside it — always reachable by the thumb, never hidden below long content.

- Pinned bar 64–84pt with a safe-area inset; content gets matching bottom padding.
- Show the consequence on the button ("Pay $42.10", not "Continue").
- Hairline or blur behind the bar instead of a heavy shadow.

Evidence (31): IMG-0182 (Which one looks better property card test), IMG-0346 (TableMate social dining app screen set), IMG-0376 (Laundry provider, booking and order screens), IMG-0378 (Laundry booking form with return method)

## Purposeful micro-interaction

Motion that confirms an action or explains a state change — a toggle that morphs, a button that becomes its result.

- 150–300ms for UI feedback, 400–600ms for spatial transitions.
- Ease-out for entering, ease-in for leaving; springs for direct manipulation.
- Honour prefers-reduced-motion with an opacity-only fallback.

Evidence (62): VID-0060 (Black blob mascot morphing between shapes), VID-0071 ('Project Folder' component docs page), VID-0073 (Expanding AI status pill on real phone), VID-0074 (Grok Bot icon morphing animation post)

## Before / after with the delta labelled

Two states side by side with an explicit label on each. Shows the reasoning, not just the result.

- Same crop, same device, same content in both states.
- Label each side; call out the 2–3 changes that matter.
- Put the improved version on the right.

Evidence (24): IMG-0182 (Which one looks better property card test), IMG-0226 (Steps screen before and after revamp), IMG-0277 (Language test app before and after), IMG-0279 (Tinker game-making app before and after)
