/**
 * The pattern library: recurring structural moves found across the corpus.
 * Each pattern names the move, says why it works, gives build rules an
 * engineer can follow, and matches the assets that evidence it. A pattern
 * with fewer than `min` matching assets is not reported — no evidence, no claim.
 */

const any = (list, xs) => xs.some((x) => (list || []).includes(x));
const tag = (a, ...xs) => any(a.tags, xs);
const role = (a, ...xs) => any(a.roles, xs);
const style = (a, ...xs) => any(a.style, xs);

export const PATTERNS = [
  {
    slug: 'hero-number', name: 'One hero number', min: 4,
    why: 'A single figure set far larger than everything around it, with supporting detail subordinated. The fastest way to give a screen a focal point without decoration.',
    build: ['Hero figure 2.5–4× body size, tabular numerals, tight tracking (-0.02em).', 'One supporting line directly under it (delta, period or unit) at muted contrast.', 'Nothing else on the screen above the fold at the same weight.'],
    match: (a) => tag(a, 'balance', 'kpi', 'hero-metric', 'big-number') || (role(a, 'dashboard') && tag(a, 'finance', 'fintech', 'crypto', 'wallet')),
  },
  {
    slug: 'metric-grid', name: 'Metric grid', min: 4,
    why: 'Small multiples of equal-weight tiles, each one number and one label. Reads in a glance and reflows cleanly to narrow screens.',
    build: ['2-up on mobile, 3–4-up on desktop; identical tile height.', 'Number first, label second; never more than one chart per tile.', 'Colour encodes status only, never decoration.'],
    match: (a) => tag(a, 'metric-tile', 'kpi', 'stats') && (role(a, 'dashboard') || tag(a, 'grid', 'bento')),
  },
  {
    slug: 'bento', name: 'Bento feature grid', min: 3,
    why: 'Mixed-size tiles on one grid, each selling one capability. Gives a landing page rhythm without long text blocks.',
    build: ['One 2×2 lead tile, the rest 1×1 / 2×1; consistent 12–20px gutters.', 'Each tile: one headline, one visual, no button.', 'Corner radius identical on every tile.'],
    match: (a) => tag(a, 'bento', 'feature-grid') || (tag(a, 'grid') && role(a, 'landing-section')),
  },
  {
    slug: 'bottom-tabs', name: 'Bottom tab bar, 4–5 destinations', min: 4,
    why: 'Fixed bottom navigation with a small, stable set of destinations; the active one marked by tint, not weight.',
    build: ['44pt+ hit targets, labels under icons, max five items.', 'Active = accent tint + filled icon; inactive = 60% ink.', 'Respect the home indicator safe area.'],
    match: (a) => tag(a, 'bottom-nav', 'tab-bar') || (role(a, 'navigation') && a.category === 'mobile-app-ui'),
  },
  {
    slug: 'chip-row', name: 'Scrollable chip-filter row', min: 4,
    why: 'Filters as chips in one horizontally scrolling row — never wrapping, never clipping.',
    build: ['Fixed 36–44px height, min-width ~72px so "All" never collapses to a circle.', 'white-space: nowrap; overflow-x: auto; hidden scrollbar; edge fade.', 'Selected chip inverts (ink fill), not just a border change.'],
    match: (a) => tag(a, 'chips', 'chip-filter', 'filters'),
  },
  {
    slug: 'segmented', name: 'Segmented range control', min: 4,
    why: 'A Week / Month switch that redraws one view and moves nothing else. One state, one controller.',
    build: ['2–4 segments, equal widths, sliding thumb animated 200–250ms.', 'Abbreviate day labels to three letters, never one.', 'Only the controlled region re-renders.'],
    match: (a) => tag(a, 'segmented-control', 'tabs', 'week-strip'),
  },
  {
    slug: 'bottom-sheet', name: 'Bottom sheet for secondary tasks', min: 4,
    why: 'Secondary actions arrive in a sheet over the current context instead of a new screen, so the user never loses their place.',
    build: ['Grabber + 16–24px top radius; detents at ~50% and full.', 'Dim the background 30–40%; tap-outside dismisses.', 'Primary action pinned to the bottom of the sheet.'],
    match: (a) => tag(a, 'sheet', 'bottom-sheet', 'modal'),
  },
  {
    slug: 'teaching-empty', name: 'Empty state that teaches', min: 3,
    why: 'The zero-data screen explains what will appear and offers exactly one action, instead of a grey "No data".',
    build: ['Illustration or icon ≤ 30% of the viewport.', 'One sentence of value, one primary button.', 'Show a ghosted preview of the filled state when possible.'],
    match: (a) => role(a, 'empty-state') || tag(a, 'empty-state', 'zero-state'),
  },
  {
    slug: 'onboarding-hero', name: 'Single-promise onboarding', min: 4,
    why: 'Each onboarding step makes one promise with one visual; progress dots and a single primary CTA carry the flow.',
    build: ['Visual top 55–60%, headline + one line below.', 'Primary CTA full-width at the thumb zone; "Log in" as secondary text.', 'Three steps maximum before value.'],
    match: (a) => role(a, 'onboarding') || tag(a, 'welcome-screen', 'onboarding'),
  },
  {
    slug: 'dark-hot-accent', name: 'Dark surface, single hot accent', min: 4,
    why: 'A near-black canvas with exactly one saturated accent carrying every interactive element. The accent does all the wayfinding.',
    build: ['Background L≈0.15–0.2 (not pure black) so elevation can still read.', 'One accent at chroma ≥ 0.15; every CTA, toggle and active state uses it.', 'Body text ~#E8E8E8, never pure white on black.'],
    match: (a) => style(a, 'dark-mode') && style(a, 'high-contrast', 'bold-typography'),
  },
  {
    slug: 'soft-light', name: 'Soft light canvas, tinted cards', min: 4,
    why: 'Off-white ground with cards separated by a light tint instead of shadows. Calm, airy and survives low-quality displays.',
    build: ['Ground #F5–F8 neutral; cards one step lighter or tinted 4–6%.', 'Radius 16–24px, no drop shadow or a 1px hairline at most.', 'Accent reserved for the single primary action.'],
    match: (a) => style(a, 'soft', 'soft-shadow') && style(a, 'light-mode'),
  },
  {
    slug: 'type-hero', name: 'Type-led marketing hero', min: 4,
    why: 'A large statement in a confident face, with the product shot secondary. Survives translation and small screens.',
    build: ['Headline 56–96px desktop, line-height 0.95–1.05, max ~12 words.', 'One sentence of support, two CTAs max (primary + ghost).', 'Product visual below or beside, never behind the headline.'],
    match: (a) => role(a, 'hero') || (style(a, 'bold-typography', 'editorial') && role(a, 'landing-section')),
  },
  {
    slug: 'serif-editorial', name: 'Editorial serif display', min: 4,
    why: 'A serif display face over a neutral sans for UI. Signals craft and calm; strongest in finance, wellness and content products.',
    build: ['Serif only at ≥ 28px; sans for everything interactive.', 'Generous leading on body (1.5–1.6).', 'Pair with a restrained palette — the type is the ornament.'],
    match: (a) => tag(a, 'serif') && style(a, 'editorial', 'luxury', 'minimal'),
  },
  {
    slug: 'chat-composer', name: 'AI chat with anchored composer', min: 4,
    why: 'Conversation scrolls; the composer stays anchored with attachments and model controls inline. The pattern most AI products converge on.',
    build: ['Composer pinned bottom, grows to ~6 lines then scrolls.', 'Assistant replies full-width, user messages as compact bubbles.', 'Suggested prompts as chips only in the empty state.'],
    match: (a) => role(a, 'chat') || tag(a, 'prompt', 'assistant', 'ai-agent'),
  },
  {
    slug: 'data-table', name: 'Dense data table with quiet chrome', min: 4,
    why: 'Tables carry the data; chrome recedes. Zebra-free rows, hairline dividers, status as small pills.',
    build: ['Row height 40–48px, tabular numerals, right-align numbers.', 'Sticky header; filters above, not in the header row.', 'Status pills: tinted background at 12–16% with full-strength text.'],
    match: (a) => tag(a, 'data-table', 'table') || style(a, 'data-dense'),
  },
  {
    slug: 'sidebar-app', name: 'Sidebar workspace shell', min: 4,
    why: 'A persistent left rail for navigation and a content canvas on the right — the default shell for productive web apps.',
    build: ['Rail 220–260px, collapsible to 64px icons.', 'Group nav with small caps headings; active row tinted, not bold.', 'Canvas max-width only for reading views, never for tables.'],
    match: (a) => tag(a, 'sidebar') && (tag(a, 'desktop', 'web-app') || a.category === 'dashboard'),
  },
  {
    slug: 'progress-ring', name: 'Progress ring as the hero', min: 3,
    why: 'Goal completion shown as one ring (or nested rings) carrying the number inside. Instantly legible for habits, fitness and budgets.',
    build: ['Stroke 8–14% of diameter with rounded caps.', 'Number centred inside, unit below at small size.', 'Animate fill on appear (600–900ms, ease-out).'],
    match: (a) => tag(a, 'progress-ring', 'streak', 'progress') && a.category !== 'website',
  },
  {
    slug: 'device-on-colour', name: 'Frameless device on flat colour', min: 6,
    why: 'A phone on a solid tint — the workhorse presentation for a single screen; the screen becomes the whole composition.',
    build: ['Backdrop picked from the screen\'s own accent at low chroma.', 'Device at 60–70% of frame height, centred, no props.', 'One line of caption maximum.'],
    match: (a) => tag(a, 'phone-mockup', 'device-frame', 'mockup') || a.type === 'mockup',
  },
  {
    slug: 'flow-strip', name: 'Multi-screen flow strip', min: 4,
    why: 'Three or more screens of one flow left to right. Encodes the journey rather than any single screen.',
    build: ['Equal device sizes, equal gaps; sequence reads left → right.', 'Annotate only the step that changes something.', 'Keep shared chrome identical across steps so the delta stands out.'],
    match: (a) => a.type === 'multi-screen' || a.type === 'flow-walkthrough',
  },
  {
    slug: 'anchored-pricing', name: 'Three tiers, one anchored', min: 4,
    why: 'Three plans side by side with the recommended one visually anchored — darker, taller or tagged — so the decision is made for most visitors before they compare rows.',
    build: ['Three columns max; middle or right plan anchored by fill, not just a badge.', 'Billing toggle directly above the prices it changes; show the saving as a number.', 'One CTA per plan, the anchored plan\'s CTA is the only filled one.'],
    match: (a) => role(a, 'pricing') || tag(a, 'pricing', 'plans', 'subscription', 'paywall'),
  },
  {
    slug: 'sticky-cta', name: 'Sticky bottom action', min: 4,
    why: 'The primary action pinned to the bottom of a scrolling screen with the total or state beside it — always reachable by the thumb, never hidden below long content.',
    build: ['Pinned bar 64–84pt with a safe-area inset; content gets matching bottom padding.', 'Show the consequence on the button ("Pay $42.10", not "Continue").', 'Hairline or blur behind the bar instead of a heavy shadow.'],
    match: (a) => role(a, 'checkout') || tag(a, 'cart', 'sticky-cta', 'checkout', 'booking'),
  },
  {
    slug: 'micro-interaction', name: 'Purposeful micro-interaction', min: 4,
    why: 'Motion that confirms an action or explains a state change — a toggle that morphs, a button that becomes its result.',
    build: ['150–300ms for UI feedback, 400–600ms for spatial transitions.', 'Ease-out for entering, ease-in for leaving; springs for direct manipulation.', 'Honour prefers-reduced-motion with an opacity-only fallback.'],
    match: (a) => tag(a, 'micro-interaction', 'morph', 'transition') && !!a.clip,
  },
  {
    slug: 'before-after', name: 'Before / after with the delta labelled', min: 3,
    why: 'Two states side by side with an explicit label on each. Shows the reasoning, not just the result.',
    build: ['Same crop, same device, same content in both states.', 'Label each side; call out the 2–3 changes that matter.', 'Put the improved version on the right.'],
    match: (a) => a.category === 'before-after' || tag(a, 'before-after', 'redesign'),
  },
];

export function matchPatterns(assets) {
  return PATTERNS.map((p) => {
    const evidence = assets.filter(p.match);
    return { ...p, evidence };
  }).filter((p) => p.evidence.length >= p.min);
}
