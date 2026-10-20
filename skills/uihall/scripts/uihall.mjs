#!/usr/bin/env node
// Single-file build of uihall-mcp. Source: https://github.com/NikitHamal/UiHall/tree/main/mcp/src — edit there, then `node mcp/build.mjs`.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ---- color.js ----
/**
 * Colour maths for UI Hall. Isomorphic, dependency-free.
 *
 * Distances are measured in OKLab, which is perceptually uniform enough that
 * "nearest colour" means what a designer means by it. Contrast is WCAG 2.x
 * relative luminance, because that is what accessibility audits still check.
 */

function hexToRgb(hex) {
  const h = String(hex || '').trim().replace(/^#/, '');
  const v = h.length === 3 ? [...h].map((c) => c + c).join('') : h.slice(0, 6);
  if (!/^[0-9a-f]{6}$/i.test(v)) return null;
  const n = parseInt(v, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex([r, g, b]) {
  const c = (x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`.toUpperCase();
}

function normHex(hex) {
  const rgb = hexToRgb(hex);
  return rgb ? rgbToHex(rgb) : null;
}

const lin = (v) => { const s = v / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
const delin = (v) => 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);

function luminance(hex) {
  const c = hexToRgb(hex);
  if (!c) return 0;
  const [r, g, b] = c.map(lin);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.x contrast ratio, rounded to two decimals. */
function contrast(a, b) {
  const la = luminance(a), lb = luminance(b);
  const r = (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  return Math.round(r * 100) / 100;
}

function wcag(ratio) {
  return {
    ratio,
    AA: ratio >= 4.5, AA_large: ratio >= 3, AAA: ratio >= 7, AAA_large: ratio >= 4.5,
    verdict: ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : ratio >= 3 ? 'AA large text only' : 'fails',
  };
}

function toOklab(hex) {
  const c = hexToRgb(hex);
  if (!c) return [0, 0, 0];
  const [r, g, b] = c.map(lin);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function fromOklab([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return rgbToHex([
    delin(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    delin(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    delin(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ]);
}

/** OKLCH: lightness 0..1, chroma ~0..0.37, hue in degrees. */
function toOklch(hex) {
  const [L, a, b] = toOklab(hex);
  const C = Math.hypot(a, b);
  let h = C < 1e-4 ? 0 : (Math.atan2(b, a) * 180) / Math.PI;
  if (h < 0) h += 360;
  return [L, C, h];
}

function fromOklch([L, C, h]) {
  const r = ((Number.isFinite(h) ? h : 0) * Math.PI) / 180;
  return fromOklab([L, C * Math.cos(r), C * Math.sin(r)]);
}

/** Perceptual distance. ~0.02 is "same colour", ~0.1 "clearly related". */
function deltaE(a, b) {
  const p = toOklab(a), q = toOklab(b);
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
}

const HUES = [
  ['red', 0, 18], ['orange', 18, 70], ['yellow', 70, 110], ['lime', 110, 130], ['green', 130, 165],
  ['teal', 165, 200], ['cyan', 200, 225], ['blue', 225, 275], ['violet', 275, 310], ['magenta', 310, 345], ['red', 345, 361],
];

/** A designer's name for a colour family: 'near-black', 'warm grey', 'orange' … */
function hueFamily(hex) {
  const [L, C, h] = toOklch(hex);
  if (C < 0.035) {
    if (L < 0.25) return 'black';
    if (L > 0.93) return 'white';
    return 'grey';
  }
  for (const [name, lo, hi] of HUES) if (h >= lo && h < hi) {
    if (name === 'orange' && L < 0.55 && C < 0.12) return 'brown';
    return name;
  }
  return 'red';
}

const HUE_FAMILIES = ['red', 'orange', 'brown', 'yellow', 'lime', 'green', 'teal', 'cyan', 'blue', 'violet', 'magenta', 'black', 'grey', 'white'];

/** Pick the text colour (from candidates, else black/white) that reads best on bg. */
function bestInk(bg, candidates = []) {
  const pool = [...candidates, '#FFFFFF', '#0A0A0A'];
  return pool.reduce((best, c) => (contrast(c, bg) > contrast(best, bg) ? c : best), pool[0]);
}

/** Nudge a colour's lightness in OKLCH until it hits a target contrast on bg. */
function fitContrast(fg, bg, target = 4.5) {
  if (contrast(fg, bg) >= target) return normHex(fg);
  const [L, C, h] = toOklch(fg);
  const dir = luminance(bg) > 0.18 ? -1 : 1;
  for (let i = 1; i <= 100; i++) {
    const nl = Math.min(1, Math.max(0, L + dir * i * 0.01));
    const cand = fromOklch([nl, C * (1 - i / 160), h]);
    if (contrast(cand, bg) >= target) return cand;
  }
  return dir < 0 ? '#000000' : '#FFFFFF';
}

/**
 * Split a measured palette into UI roles. Largest light/dark area → background,
 * the next neutral → surface, highest-contrast neutral → text, most chromatic
 * colour with real presence → accent.
 */
function paletteRoles(detail) {
  const sw = (detail || []).filter((p) => hexToRgb(p.hex)).map((p) => {
    const [L, C, h] = toOklch(p.hex);
    return { ...p, hex: normHex(p.hex), L, C, h };
  });
  if (!sw.length) return null;
  const bg = [...sw].sort((a, b) => b.pct - a.pct)[0];
  const rest = sw.filter((p) => p !== bg);
  const neutrals = rest.filter((p) => p.C < 0.06);
  const surface = neutrals.filter((p) => Math.abs(p.L - bg.L) < 0.2).sort((a, b) => b.pct - a.pct)[0]
    || { hex: fromOklch([bg.L + (bg.L > 0.5 ? -0.04 : 0.06), bg.C, bg.h]) };
  const textCand = [...rest].sort((a, b) => contrast(b.hex, bg.hex) - contrast(a.hex, bg.hex))[0];
  const text = textCand && contrast(textCand.hex, bg.hex) >= 4.5 ? textCand.hex : bestInk(bg.hex);
  const chroma = rest.filter((p) => p.C >= 0.06).sort((a, b) => b.C * Math.sqrt(b.pct + 0.5) - a.C * Math.sqrt(a.pct + 0.5));
  const accent = chroma[0]?.hex || (bg.C >= 0.06 ? bg.hex : null);
  return {
    background: bg.hex,
    surface: surface.hex,
    text,
    muted: fromOklch([(toOklch(text)[0] + bg.L) / 2, 0.01, toOklch(text)[2]]),
    accent,
    on_accent: accent ? bestInk(accent) : null,
    scheme: bestInk(bg.hex) === '#FFFFFF' ? 'dark' : 'light',
  };
}

// ---- patterns.js ----
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

const PATTERNS = [
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

function matchPatterns(assets) {
  return PATTERNS.map((p) => {
    const evidence = assets.filter(p.match);
    return { ...p, evidence };
  }).filter((p) => p.evidence.length >= p.min);
}

// ---- engine.js ----
/**
 * UI Hall engine — search, similarity, colour and brief logic over the corpus.
 *
 * Isomorphic and dependency-free: the MCP server imports it in Node, and the
 * website imports the very same file in the browser, so the playground on the
 * site runs exactly what an agent gets.
 */


const SITE = 'https://nikithamal.github.io/UiHall/';

/* ----------------------------------------------------------- text index -- */

const STOP = new Set(('a an the for of to and or with in on that this is are be it as at by my i me we our want need '
  + 'make build create design designing screen screens page pages ui ux app apps into from like some any show give '
  + 'good great nice best look looks looking using use please one new').split(' '));

const SYN = {
  fintech: ['finance', 'banking', 'wallet', 'payment', 'money', 'crypto', 'budgeting', 'balance'],
  finance: ['fintech', 'banking', 'wallet', 'money', 'budgeting'], bank: ['banking', 'finance', 'fintech'],
  banking: ['finance', 'fintech', 'wallet'], money: ['finance', 'wallet', 'payment'], crypto: ['wallet', 'finance', 'fintech'],
  payment: ['checkout', 'wallet', 'card'], invest: ['finance', 'stocks', 'portfolio'],
  login: ['auth', 'sign-in', 'signup'], signin: ['auth', 'sign-in', 'login'], signup: ['auth', 'sign-in', 'onboarding'],
  auth: ['login', 'sign-in', 'signup'], register: ['signup', 'auth'],
  onboard: ['onboarding', 'welcome-screen'], onboarding: ['welcome-screen', 'walkthrough'], welcome: ['onboarding', 'welcome-screen'],
  landing: ['landing-page', 'hero', 'website', 'marketing'], homepage: ['landing-page', 'hero', 'website'],
  website: ['landing-page', 'web'], hero: ['landing-page', 'headline'], saas: ['landing-page', 'web-app', 'dashboard'],
  dashboard: ['analytics', 'kpi', 'metric-tile', 'chart', 'stats'], analytics: ['dashboard', 'chart', 'kpi', 'data-viz'],
  admin: ['dashboard', 'sidebar', 'data-table'], table: ['data-table'], chart: ['bar-chart', 'line-chart', 'data-viz', 'analytics'],
  shop: ['ecommerce', 'shopping', 'product', 'checkout', 'cart'], ecommerce: ['shopping', 'product', 'checkout', 'cart', 'store'],
  store: ['ecommerce', 'shopping'], cart: ['checkout', 'ecommerce'], checkout: ['payment', 'cart'],
  health: ['fitness', 'wellness', 'medical', 'sleep'], fitness: ['workout', 'health', 'streak', 'progress-ring'],
  wellness: ['health', 'meditation', 'sleep', 'calm'], sleep: ['wellness', 'health'], meditation: ['wellness', 'calm'],
  food: ['restaurant', 'delivery', 'recipe', 'grocery'], restaurant: ['food', 'booking'], delivery: ['food', 'tracking', 'map'],
  travel: ['booking', 'flight', 'hotel', 'trip', 'map'], flight: ['travel', 'boarding-pass'], hotel: ['travel', 'booking'],
  chat: ['messaging', 'assistant', 'conversation', 'prompt'], ai: ['assistant', 'prompt', 'ai-agent', 'chat'],
  assistant: ['ai', 'chat', 'prompt'], agent: ['ai-agent', 'ai'], music: ['audio', 'player', 'podcast'],
  video: ['player', 'media', 'streaming'], social: ['feed', 'profile', 'avatar'], profile: ['avatar', 'account'],
  settings: ['preferences', 'toggle', 'account'], calendar: ['schedule', 'week-strip', 'booking'],
  tasks: ['todo', 'productivity', 'checklist'], todo: ['tasks', 'checklist'], notes: ['productivity', 'editor'],
  map: ['location', 'navigation', 'travel'], education: ['learning', 'course', 'study'], learning: ['education', 'course'],
  dark: ['dark-mode', 'dark-ui'], light: ['light-mode', 'light-ui'], glass: ['glassmorphism', 'blur'],
  glassmorphism: ['glass', 'blur'], calm: ['soft', 'pastel', 'minimal'], minimal: ['clean', 'whitespace'],
  premium: ['luxury', 'editorial', 'serif'], luxury: ['premium', 'serif', 'editorial'], elegant: ['editorial', 'serif', 'luxury'],
  playful: ['illustration', 'mascot', 'rounded', 'vibrant'], fun: ['playful', 'vibrant', 'mascot'],
  bold: ['bold-typography', 'high-contrast', 'vibrant'], vibrant: ['gradient', 'bold'], retro: ['pixel', 'vintage'],
  motion: ['animation', 'transition', 'micro-interaction', 'morph'], animation: ['motion', 'transition', 'micro-interaction'],
  interaction: ['micro-interaction', 'gesture'], button: ['cta-button'], cta: ['cta-button'],
  nav: ['navigation', 'bottom-nav', 'tabs', 'sidebar'], navigation: ['bottom-nav', 'tabs', 'sidebar'],
  pricing: ['price', 'plans', 'paywall', 'subscription'], paywall: ['pricing', 'subscription'],
  empty: ['empty-state'], search: ['filters', 'chips'], filter: ['filters', 'chips', 'sorting'],
  form: ['input', 'fields'], input: ['form'], logo: ['brand-mark', 'wordmark', 'identity'], brand: ['identity', 'logo', 'wordmark'],
  palette: ['colour', 'swatch', 'color-palette'], color: ['palette', 'colour'], colour: ['palette', 'color'],
  typography: ['serif', 'type', 'font', 'headline'], font: ['typography', 'serif'],
};

const stem = (w) => (w.length > 4 ? w.replace(/(ings|ing|ies|es|s)$/, (m) => (m === 'ies' ? 'y' : '')) : w);

function tokenize(text) {
  return String(text ?? '').toLowerCase().replace(/[’']/g, '').split(/[^a-z0-9#+]+/).filter((t) => t.length > 1);
}

const FIELDS = [
  ['title', 3.2], ['tags', 2.6], ['roles', 2.6], ['style', 1.6], ['category', 2.2], ['type', 1.2], ['description', 1],
];

/* -------------------------------------------------------------- engine -- */

class UiHall {
  constructor(corpus, { site = SITE } = {}) {
    this.corpus = corpus;
    this.site = site.endsWith('/') ? site : site + '/';
    this.assets = corpus.assets;
    this.byId = new Map(this.assets.map((a) => [a.id, a]));
    this.vocab = new Set();
    for (const k of ['categories', 'types', 'roles', 'styles', 'tags']) for (const x of corpus[k] || []) this.vocab.add(x.id);
    this.#index();
  }

  /* derived per-asset facts, computed once */
  #derive(a) {
    const det = (a.palette_detail || []).filter((p) => normHex(p.hex));
    const roles = paletteRoles(det);
    const L = det.reduce((s, p) => s + toOklch(p.hex)[0] * p.pct, 0) / (det.reduce((s, p) => s + p.pct, 0) || 1);
    const hues = [...new Set(det.filter((p) => p.pct >= 4 && toOklch(p.hex)[1] >= 0.06).map((p) => hueFamily(p.hex)))];
    return {
      surface: L < 0.42 ? 'dark' : L > 0.72 ? 'light' : 'mid',
      roles,
      accent: roles?.accent || null,
      accent_family: roles?.accent ? hueFamily(roles.accent) : null,
      hues,
      lightness: Math.round(L * 100) / 100,
    };
  }

  #index() {
    this.docs = [];
    this.df = new Map();
    let total = 0;
    for (const a of this.assets) {
      a._d = this.#derive(a);
      const tf = new Map();
      const add = (tok, w) => tf.set(tok, (tf.get(tok) || 0) + w);
      for (const [f, w] of FIELDS) {
        const v = a[f];
        const list = Array.isArray(v) ? v : [v];
        for (const item of list) {
          if (!item) continue;
          if (f !== 'description' && f !== 'title') add(String(item).toLowerCase(), w); // whole tag, e.g. "bottom-nav"
          for (const t of tokenize(item)) add(stem(t), w);
        }
      }
      add(a._d.surface, 0.8);
      for (const h of a._d.hues) add(h, 0.6);
      if (a.clip) { add('motion', 0.8); add('animated', 0.6); }
      let len = 0;
      for (const v of tf.values()) len += v;
      this.docs.push({ a, tf, len });
      total += len;
      for (const t of tf.keys()) this.df.set(t, (this.df.get(t) || 0) + 1);
    }
    this.avgLen = total / this.docs.length;
  }

  /** Expand a query into weighted terms: exact words, then synonyms at lower weight. */
  expand(query) {
    const words = tokenize(query).filter((w) => !STOP.has(w));
    const terms = new Map();
    const put = (t, w) => terms.set(t, Math.max(terms.get(t) || 0, w));
    // hyphenated vocab phrases ("bottom nav" -> bottom-nav)
    for (let i = 0; i < words.length - 1; i++) {
      const pair = `${words[i]}-${words[i + 1]}`;
      if (this.vocab.has(pair)) put(pair, 1.4);
    }
    for (const w of words) {
      put(stem(w), 1);
      if (this.vocab.has(w)) put(w, 1);
      for (const s of SYN[w] || SYN[stem(w)] || []) put(s.includes('-') ? s : stem(s), 0.45);
    }
    return terms;
  }

  #bm25(doc, terms) {
    const k1 = 1.2, b = 0.72, N = this.docs.length;
    let s = 0; const hits = [];
    for (const [t, qw] of terms) {
      const f = doc.tf.get(t);
      if (!f) continue;
      const df = this.df.get(t) || 0;
      const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
      s += qw * idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * doc.len) / this.avgLen)));
      if (qw >= 1) hits.push(t);
    }
    return { s, hits };
  }

  filter(list, f = {}) {
    const arr = (v) => (v == null || v === '' ? [] : Array.isArray(v) ? v : [v]);
    const cat = arr(f.category), role = arr(f.role), sty = arr(f.style), tg = arr(f.tag), typ = arr(f.type);
    const surf = arr(f.surface), hue = arr(f.hue);
    return list.filter((a) => {
      if (f.kind && f.kind !== 'all' && a.kind !== f.kind) return false;
      if (cat.length && !cat.includes(a.category)) return false;
      if (typ.length && !typ.includes(a.type)) return false;
      if (role.length && !role.some((r) => a.roles?.includes(r))) return false;
      if (sty.length && !sty.every((s) => a.style?.includes(s))) return false;
      if (tg.length && !tg.every((t) => a.tags?.includes(t))) return false;
      if (surf.length && !surf.includes(a._d.surface)) return false;
      if (hue.length && !hue.some((h) => a._d.hues.includes(h) || a._d.accent_family === h)) return false;
      if (f.has_motion && !a.clip) return false;
      if (f.exclude_crops && a.crop_of) return false;
      if (f.source === 'original' && !a.original) return false;
      if (f.source === 'reference' && a.original) return false;
      return true;
    });
  }

  /**
   * Ranked search. Returns {total, results:[{asset, score, matched}]}.
   * With no query, returns the filtered set in curated order.
   */
  search({ query = '', boost = '', prefer_surface, min_score = 0.15, limit = 12, offset = 0, ...filters } = {}) {
    const pool = new Set(this.filter(this.assets, filters));
    const terms = this.expand(query);
    for (const [t, w] of this.expand(boost)) if (!terms.has(t)) terms.set(t, w * 0.35);
    let ranked;
    if (!terms.size) {
      ranked = this.assets.filter((a) => pool.has(a)).map((asset) => ({ asset, score: 0, matched: [] }));
    } else {
      ranked = [];
      for (const doc of this.docs) {
        if (!pool.has(doc.a)) continue;
        const { s, hits } = this.#bm25(doc, terms);
        if (s <= 0) continue;
        const coverage = hits.length / Math.max(1, [...terms.values()].filter((w) => w >= 1).length);
        ranked.push({ asset: doc.a, score: s * (0.6 + 0.4 * coverage) * (doc.a.crop_of ? 0.85 : 1) * (prefer_surface && doc.a._d.surface === prefer_surface ? 1.35 : 1), matched: hits });
      }
      ranked.sort((x, y) => y.score - x.score);
      const top = ranked[0]?.score || 1;
      for (const r of ranked) r.score = Math.round((r.score / top) * 1000) / 1000;
      ranked = ranked.filter((r) => r.score >= min_score); // drop the long tail of one-synonym matches
    }
    return { total: ranked.length, results: ranked.slice(offset, offset + limit) };
  }

  get(id) {
    return this.byId.get(String(id || '').trim().toUpperCase()) || null;
  }

  #tagSet(a) { return new Set([...(a.tags || []), ...(a.roles || []).map((r) => 'r:' + r), ...(a.style || []).map((s) => 's:' + s)]); }

  #paletteDist(a, b) {
    const pa = (a.palette_detail || []).slice(0, 4), pb = (b.palette_detail || []).slice(0, 4);
    if (!pa.length || !pb.length) return 0.5;
    let s = 0, w = 0;
    for (const p of pa) {
      const d = Math.min(...pb.map((q) => deltaE(p.hex, q.hex)));
      s += d * p.pct; w += p.pct;
    }
    return s / (w || 1);
  }

  /** Visually and semantically similar assets: tags, roles, style, category and measured palette. */
  similar(id, { limit = 8, by = 'all' } = {}) {
    const a = this.get(id);
    if (!a) return [];
    const ta = this.#tagSet(a);
    const out = [];
    for (const b of this.assets) {
      if (b === a || b.crop_of === a.id || a.crop_of === b.id) continue;
      const tb = this.#tagSet(b);
      let inter = 0;
      for (const t of ta) if (tb.has(t)) inter++;
      const jac = inter / (ta.size + tb.size - inter || 1);
      const pal = Math.max(0, 1 - this.#paletteDist(a, b) / 0.25);
      const score = by === 'palette' ? pal : by === 'content'
        ? jac + (a.category === b.category ? 0.15 : 0)
        : 0.55 * jac + 0.25 * pal + (a.category === b.category ? 0.12 : 0) + (a.type === b.type ? 0.05 : 0) + (a._d.surface === b._d.surface ? 0.03 : 0);
      out.push({ asset: b, score: Math.round(score * 1000) / 1000 });
    }
    return out.sort((x, y) => y.score - x.score).slice(0, limit);
  }

  /** Assets that actually use a colour (OKLab distance over measured swatches). */
  byColor(hex, { limit = 12, tolerance = 0.09, min_pct = 1.5, kind } = {}) {
    const h = normHex(hex);
    if (!h) throw new Error(`Not a hex colour: ${hex}`);
    const out = [];
    for (const a of this.assets) {
      if (kind && a.kind !== kind) continue;
      let best = null;
      for (const p of a.palette_detail || []) {
        if (p.pct < min_pct) continue;
        const d = deltaE(h, p.hex);
        if (!best || d < best.d) best = { d, hex: normHex(p.hex), pct: p.pct };
      }
      if (best && best.d <= tolerance) out.push({ asset: a, match: best.hex, distance: Math.round(best.d * 1000) / 1000, area_pct: best.pct });
    }
    return out.sort((x, y) => x.distance - y.distance || y.area_pct - x.area_pct).slice(0, limit);
  }

  facets() {
    const c = this.corpus;
    const ids = (k) => (c[k] || []).map((x) => ({ id: x.id, count: x.count, ...(x.label && x.label !== x.id ? { label: x.label } : {}), ...(x.blurb ? { blurb: x.blurb } : {}) }));
    const surfaces = {}, hues = {};
    for (const a of this.assets) {
      surfaces[a._d.surface] = (surfaces[a._d.surface] || 0) + 1;
      for (const h of a._d.hues) hues[h] = (hues[h] || 0) + 1;
    }
    return {
      categories: ids('categories'), types: ids('types'), roles: ids('roles'), styles: ids('styles'),
      tags: ids('tags').filter((t) => t.count >= 2), surfaces, hue_families: hues,
      kinds: { image: c.totals.images, video: c.totals.videos, with_motion_clip: c.totals.clips },
    };
  }

  stats() {
    const c = this.corpus;
    return {
      version: c.version, totals: c.totals,
      by_category: (c.categories || []).map((x) => ({ id: x.id, label: x.label, count: x.count })),
      top_roles: (c.roles || []).slice(0, 10), top_styles: (c.styles || []).slice(0, 10), top_tags: (c.tags || []).slice(0, 24),
      patterns: this.patterns().map((p) => ({ name: p.name, evidence: p.evidence_count })),
      provenance: {
        descriptions: 'Every asset was looked at and written up; re-audited against the pixels in October 2026.',
        palettes: 'Measured: k-means over the real pixels, with area percentages.',
        motion: 'Measured: mean frame-to-frame difference. Only clips that actually move ship as video.',
      },
    };
  }

  /** Patterns with evidence; optionally ranked by relevance to a topic. */
  patterns(about = '') {
    const all = matchPatterns(this.assets);
    let ranked = all.map((p) => ({ p, rel: 0 }));
    let hits = new Map();
    if (about.trim()) {
      hits = new Map(this.search({ query: about, limit: 300 }).results.map((r) => [r.asset.id, r.score]));
      const words = tokenize(about).map(stem);
      ranked = all.map((p) => {
        // mean of the best five matches, so a pattern with 300 loose examples can't outrank a specific one
        const evid = p.evidence.map((a) => hits.get(a.id) || 0).sort((x, y) => y - x).slice(0, 5).reduce((s, v) => s + v, 0);
        const text = tokenize(`${p.name} ${p.why}`).map(stem);
        const lex = words.filter((w) => text.includes(w)).length;
        return { p, rel: evid + lex * 2 };
      }).sort((x, y) => y.rel - x.rel);
    }
    return ranked.map(({ p, rel }) => {
      const ev = [...p.evidence].filter((a) => !a.crop_of).sort((x, y) => (hits.get(y.id) || 0) - (hits.get(x.id) || 0));
      return {
        slug: p.slug, name: p.name, why: p.why, build: p.build, relevance: Math.round(rel * 100) / 100,
        evidence_count: p.evidence.length, examples: ev.slice(0, 4),
      };
    });
  }

  /** Real palettes from the assets closest to a mood / product, each split into UI roles with contrast checks. */
  paletteFor({ mood = '', query = '', surface, category, count = 4 } = {}) {
    const q = `${mood} ${query}`.trim();
    const found = this.search({ query: query || mood, boost: query ? mood : '', limit: 60, surface, category, exclude_crops: true }).results.map((r) => r.asset);
    const pool = found.length ? found : this.filter(this.assets, { surface, category });
    const picks = [];
    for (const a of pool) {
      const r = a._d.roles;
      if (!r || !r.accent) continue;
      if (picks.some((p) => deltaE(p.roles.accent, r.accent) < 0.06 && deltaE(p.roles.background, r.background) < 0.06)) continue;
      picks.push({ asset: a, roles: r });
      if (picks.length >= count) break;
    }
    const fam = {};
    for (const a of pool.slice(0, 30)) if (a._d.accent_family) fam[a._d.accent_family] = (fam[a._d.accent_family] || 0) + 1;
    return {
      query: q || null,
      evidence_size: pool.length,
      common_accent_families: Object.entries(fam).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([family, n]) => ({ family, assets: n })),
      palettes: picks.map(({ asset, roles }) => ({ source: asset, ...this.checkRoles(roles) })),
    };
  }

  checkRoles(r) {
    const c = (fg, bg) => wcag(contrast(fg, bg));
    return {
      roles: r,
      contrast: {
        text_on_background: c(r.text, r.background),
        muted_on_background: c(r.muted, r.background),
        ...(r.accent ? { on_accent_on_accent: c(r.on_accent, r.accent), accent_on_background: c(r.accent, r.background) } : {}),
      },
      fixes: r.accent && contrast(r.accent, r.background) < 3
        ? { accent_for_text_and_icons: fitContrast(r.accent, r.background, 4.5), note: 'Measured accent is fine as a fill, too weak as text on the background; use this nudged value for text/icons.' }
        : undefined,
    };
  }

  /** Turn an asset's measured palette (or explicit colours) into code-ready design tokens. */
  tokens({ id, colors, format = 'css', name = 'uh' } = {}) {
    let roles, source = null;
    if (id) {
      const a = this.get(id);
      if (!a) throw new Error(`Unknown asset id: ${id}`);
      roles = a._d.roles; source = a.id;
    } else if (colors?.length) {
      roles = paletteRoles(colors.map((hex, i) => ({ hex, pct: 100 / (i + 1) })));
    }
    if (!roles) throw new Error('Pass an asset id or a list of hex colours.');
    const accent = roles.accent || roles.text;
    const [aL, aC, aH] = toOklch(accent);
    const [bL, bC, bH0] = toOklch(roles.background);
    const bH = bC < 0.02 ? aH : bH0; // near-neutral grounds borrow the accent hue, so greys lean cool or warm on purpose
    const nC = bC < 0.02 ? 0.006 : 0.014;
    const steps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
    const Ls = [0.97, 0.93, 0.87, 0.79, 0.7, 0.62, 0.54, 0.46, 0.38, 0.3, 0.22];
    const ramp = (C, H) => Object.fromEntries(steps.map((s, i) => [s, fromOklch([Ls[i], C * (1 - Math.abs(Ls[i] - 0.62) * 0.9), H])]));
    const accentRamp = ramp(Math.max(aC, 0.04), aH);
    const neutralRamp = ramp(nC, bH);
    const t = {
      color: {
        background: roles.background, surface: roles.surface, text: roles.text, 'text-muted': fitContrast(roles.muted, roles.background, 4.5),
        accent, 'on-accent': bestInk(accent), border: fromOklch([bL + (bL > 0.5 ? -0.09 : 0.1), nC, bH]),
      },
      accent: accentRamp, neutral: neutralRamp,
      radius: { sm: '8px', md: '12px', lg: '20px', pill: '999px' },
      space: { 1: '4px', 2: '8px', 3: '12px', 4: '16px', 5: '24px', 6: '32px', 7: '48px', 8: '64px' },
    };
    const flat = [];
    for (const [g, obj] of Object.entries(t)) for (const [k, v] of Object.entries(obj)) flat.push([g === 'color' ? k : `${g}-${k}`, v, g]);
    let code;
    if (format === 'tailwind') {
      code = `// tailwind.config.js — generated by UI Hall${source ? ` from ${source}` : ''}\nexport default {\n  theme: {\n    extend: {\n      colors: ${JSON.stringify({ ...t.color, accent: { DEFAULT: accent, ...accentRamp }, neutral: neutralRamp }, null, 2).replace(/\n/g, '\n      ')},\n      borderRadius: ${JSON.stringify(t.radius)},\n    },\n  },\n};\n`;
    } else if (format === 'json' || format === 'dtcg') {
      const dt = {};
      for (const [g, obj] of Object.entries(t)) {
        dt[g] = {};
        for (const [k, v] of Object.entries(obj)) dt[g][k] = { $value: v, $type: g === 'color' || g === 'accent' || g === 'neutral' ? 'color' : 'dimension' };
      }
      code = JSON.stringify(dt, null, 2);
    } else if (format === 'swiftui') {
      const sw = (hex) => { const n = parseInt(hex.slice(1), 16); const f = (v) => (v / 255).toFixed(3); return `Color(red: ${f((n >> 16) & 255)}, green: ${f((n >> 8) & 255)}, blue: ${f(n & 255)})`; };
      code = `import SwiftUI\n\n// Generated by UI Hall${source ? ` from ${source}` : ''}\nextension Color {\n${Object.entries(t.color).map(([k, v]) => `    static let ${name}${k.replace(/(^|-)(\w)/g, (_, __, c) => c.toUpperCase())} = ${sw(v)} // ${v}`).join('\n')}\n}\n`;
    } else if (format === 'compose') {
      code = `// Generated by UI Hall${source ? ` from ${source}` : ''}\nimport androidx.compose.ui.graphics.Color\n\nobject ${name.toUpperCase()}Colors {\n${Object.entries(t.color).map(([k, v]) => `    val ${k.replace(/-(\w)/g, (_, c) => c.toUpperCase())} = Color(0xFF${v.slice(1)})`).join('\n')}\n}\n`;
    } else {
      code = `/* Generated by UI Hall${source ? ` from ${source}` : ''} — scheme: ${roles.scheme} */\n:root {\n${flat.map(([k, v]) => `  --${name}-${k}: ${v};`).join('\n')}\n}\n`;
    }
    return { source, scheme: roles.scheme, tokens: t, contrast: this.checkRoles(roles).contrast, format, code };
  }

  /** Everything needed to start a screen: references, patterns, palettes and a checklist. */
  brief({ screen, platform, mood = '', surface, limit = 6 } = {}) {
    if (!screen) throw new Error('Describe the screen, e.g. "onboarding for a sleep-tracking app".');
    const q = `${screen} ${mood}`;
    const text = q.toLowerCase();
    const surf = surface || (/\bdark\b/.test(text) ? 'dark' : /\blight\b/.test(text) ? 'light' : undefined);
    const cat = platform === 'web' ? ['website', 'dashboard', 'design-system', 'motion-demo', 'before-after']
      : platform ? ['mobile-app-ui', 'app-store-screens', 'motion-demo', 'before-after', 'design-system'] : undefined;
    const base = { query: screen, boost: mood, prefer_surface: surf, exclude_crops: true };
    let refs = this.search({ ...base, limit: limit * 3, category: cat }).results.filter((r) => r.asset.category !== 'promo-reel');
    if (refs.length < limit) refs = refs.concat(this.search({ ...base, limit: limit * 3 }).results.filter((r) => !refs.some((x) => x.asset === r.asset)));
    const references = refs.slice(0, limit);
    const motion = this.search({ ...base, limit: 6, has_motion: true }).results.filter((r) => !references.some((x) => x.asset === r.asset)).slice(0, 3);
    const roleHits = new Set(references.flatMap((r) => r.asset.roles || []));
    const words = new Set(tokenize(screen).map(stem));
    const guide = Object.entries(ROLE_GUIDE).filter(([k, g]) => words.has(k) || g.aliases.some((x) => words.has(x)) || (roleHits.has(k) && references[0]?.asset.roles?.includes(k)));
    return {
      screen, platform: platform || null, mood: mood || null, surface: surf || 'either',
      references,
      motion_references: motion,
      patterns: this.patterns(q).slice(0, 4),
      palettes: this.paletteFor({ query: screen, mood, surface: surf, count: 3 }).palettes,
      guidance: guide.slice(0, 2).map(([k, g]) => ({ role: k, do: g.do, avoid: g.avoid })),
      checklist: [
        'Name the one primary action; it gets the only filled button.',
        'Pick the dominant element and make it at least 2× the size of the next.',
        'Take literal hex values from a reference palette; check text contrast ≥ 4.5:1.',
        'Use one type family for UI, a second only for display, and a 4/8px spacing scale.',
        'Design the empty, loading and error state before calling it done.',
      ],
    };
  }

  /** Side-by-side: what 2–4 references share, where they differ, and their colour roles. */
  compare(ids = []) {
    const list = [...new Set(ids.map((i) => String(i).toUpperCase()))].map((i) => this.get(i)).filter(Boolean);
    if (list.length < 2) throw new Error('Pass 2–4 valid ids.');
    const sets = (k) => list.map((a) => new Set(a[k] || []));
    const shared = (k) => [...sets(k)[0]].filter((v) => sets(k).every((s) => s.has(v)));
    const only = (k) => list.map((a, i) => ({ id: a.id, values: [...sets(k)[i]].filter((v) => !sets(k).every((s) => s.has(v))) }));
    const pair = [];
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      pair.push({ a: list[i].id, b: list[j].id, palette_distance: Math.round(this.#paletteDist(list[i], list[j]) * 1000) / 1000 });
    }
    return {
      assets: list,
      shared: { roles: shared('roles'), style: shared('style'), tags: shared('tags') },
      distinct: { roles: only('roles'), style: only('style'), tags: only('tags') },
      colour: list.map((a) => ({ id: a.id, surface: a._d.surface, ...(a._d.roles ? this.checkRoles(a._d.roles) : {}) })),
      palette_distance: pair,
    };
  }

  /**
   * A complete starter design system: colour roles + ramps from a measured palette,
   * a type scale and pairing chosen from the reference's style, spacing, radius,
   * elevation and motion tokens, and base component CSS that uses them.
   */
  designSystem({ id, colors, mood = '', name = 'uh' } = {}) {
    const t = this.tokens({ id, colors, format: 'css', name });
    const a = id ? this.get(id) : null;
    const style = new Set([...(a?.style || []), ...(a?.tags || []), ...tokenize(mood)]);
    const has = (...xs) => xs.some((x) => style.has(x));
    const serif = has('serif', 'editorial', 'luxury', 'premium', 'elegant', 'calm');
    const playful = has('playful', 'rounded', 'mascot', 'illustration-led', 'fun');
    const dense = has('data-dense', 'dashboard', 'data-table', 'kpi');
    const ratio = dense ? 1.2 : serif ? 1.333 : 1.25;
    const base = dense ? 14 : 16;
    const steps = ['xs', 'sm', 'base', 'md', 'lg', 'xl', '2xl', '3xl', '4xl'];
    const scale = Object.fromEntries(steps.map((k, i) => [k, `${Math.round(base * ratio ** (i - 2) * 10) / 10}px`]));
    const r = playful ? { sm: '10px', md: '16px', lg: '28px' } : has('brutalist', 'flat') ? { sm: '2px', md: '4px', lg: '8px' } : { sm: '8px', md: '12px', lg: '20px' };
    const type = {
      display: serif ? "'Instrument Serif', 'Iowan Old Style', Georgia, serif" : playful ? "'Bricolage Grotesque', system-ui, sans-serif" : "'Inter Tight', system-ui, sans-serif",
      body: dense ? "'Inter', system-ui, sans-serif" : "'Inter Tight', system-ui, sans-serif",
      mono: "'JetBrains Mono', ui-monospace, monospace",
      rationale: serif ? 'Serif display over a neutral sans — the reference reads editorial/calm.' : playful ? 'A characterful grotesque for display — the reference is playful/rounded.' : dense ? 'One tight sans at a smaller base with a 1.2 ratio — the reference is data-dense.' : 'One neutral grotesque throughout — the reference is restrained.',
    };
    const c = t.tokens.color, p = `--${name}`;
    const css = `/* Design system generated by UI Hall${t.source ? ` from ${t.source}` : ''} · ${t.scheme} scheme
   ${type.rationale} Type ratio ${ratio}, base ${base}px. Contrast: text ${t.contrast.text_on_background.ratio}:1. */
:root {
${t.code.split('\n').filter((l) => l.trim().startsWith('--')).join('\n')}
  ${p}-font-display: ${type.display};
  ${p}-font-body: ${type.body};
  ${p}-font-mono: ${type.mono};
${Object.entries(scale).map(([k, v]) => `  ${p}-text-${k}: ${v};`).join('\n')}
  ${p}-leading-tight: 1.1; ${p}-leading-body: 1.55;
  ${p}-r-sm: ${r.sm}; ${p}-r-md: ${r.md}; ${p}-r-lg: ${r.lg}; ${p}-r-pill: 999px;
  ${p}-shadow-1: 0 1px 2px rgb(0 0 0 / .06), 0 1px 1px rgb(0 0 0 / .04);
  ${p}-shadow-2: 0 12px 32px -12px rgb(0 0 0 / .22);
  ${p}-ease-out: cubic-bezier(.16, 1, .3, 1); ${p}-ease-in-out: cubic-bezier(.65, 0, .35, 1);
  ${p}-dur-fast: 150ms; ${p}-dur-med: 250ms; ${p}-dur-slow: 450ms;
}

body { background: var(${p}-background); color: var(${p}-text); font: var(${p}-text-base)/var(${p}-leading-body) var(${p}-font-body); }
h1, h2, h3 { font-family: var(${p}-font-display); line-height: var(${p}-leading-tight); letter-spacing: -0.02em; font-weight: ${serif ? 400 : 650}; }
h1 { font-size: var(${p}-text-4xl); } h2 { font-size: var(${p}-text-2xl); } h3 { font-size: var(${p}-text-lg); }
.muted { color: var(${p}-text-muted); }

.btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 44px; padding: 0 18px; border: 0; border-radius: var(${p}-r-${playful ? 'lg' : 'md'}); font: 600 var(${p}-text-sm)/1 var(${p}-font-body); cursor: pointer; transition: transform var(${p}-dur-fast) var(${p}-ease-out), filter var(${p}-dur-fast); }
.btn:active { transform: scale(.97); }
.btn-primary { background: var(${p}-accent); color: var(${p}-on-accent); }
.btn-primary:hover { filter: brightness(1.06); }
.btn-ghost { background: transparent; color: var(${p}-text); box-shadow: inset 0 0 0 1px var(${p}-border); }
.card { background: var(${p}-surface); border-radius: var(${p}-r-lg); padding: 20px; box-shadow: ${t.scheme === 'dark' ? `inset 0 0 0 1px var(${p}-border)` : `var(${p}-shadow-1)`}; }
.input { width: 100%; min-height: 44px; padding: 0 14px; border-radius: var(${p}-r-md); border: 1px solid var(${p}-border); background: var(${p}-background); color: var(${p}-text); font: inherit; }
.input:focus { outline: none; border-color: var(${p}-accent); box-shadow: 0 0 0 4px color-mix(in oklab, var(${p}-accent) 22%, transparent); }
.chip { display: inline-flex; align-items: center; height: 32px; padding: 0 12px; border-radius: var(${p}-r-pill); background: var(${p}-surface); color: var(${p}-text-muted); font-size: var(${p}-text-sm); white-space: nowrap; }
.chip[aria-pressed="true"] { background: var(${p}-text); color: var(${p}-background); }
:focus-visible { outline: 2px solid var(${p}-accent); outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) { * { transition-duration: 1ms !important; animation-duration: 1ms !important; } }
`;
    return { source: t.source, scheme: t.scheme, type: { ...type, base, ratio, scale }, radius: r, contrast: t.contrast, tokens: t.tokens, css };
  }

  beforeAfter({ topic = '', limit = 6 } = {}) {
    const res = this.search({ query: `${topic} before after redesign`, limit: 100 }).results
      .filter((r) => r.asset.category === 'before-after' || r.asset.tags?.includes('before-after') || r.asset.tags?.includes('redesign'));
    return res.slice(0, limit);
  }

  /* -------------------------------------------------------- projections -- */

  url(a, which = 'page') {
    if (which === 'page') return `${this.site}#/a/${a.id}`;
    const rel = which === 'thumb' ? a.thumb : which === 'clip' ? a.clip : a.src;
    return rel ? this.site + rel : null;
  }

  /** Compact card: enough to judge relevance without blowing the context window. */
  card(a, extra = {}) {
    const sentences = (a.description || '').split(/(?<=[.!?])\s+(?=[A-Z'"‘“(])/);
    return {
      id: a.id, title: a.title, kind: a.kind, category: a.category, type: a.type,
      ...(a.roles?.length ? { roles: a.roles } : {}), style: a.style, tags: (a.tags || []).slice(0, 8),
      summary: sentences.slice(0, 2).join(' ').trim(),
      surface: a._d.surface, accent: a._d.accent, palette: (a.palette || []).slice(0, 5),
      ...(a.clip ? { motion: true } : {}), ...(a.crop_of ? { crop_of: a.crop_of } : {}),
      url: this.url(a), image: this.url(a, 'thumb'),
      ...extra,
    };
  }

  /** The full record, with derived colour roles and contrast. */
  full(a) {
    const { _d, origin, ...rest } = a;
    return {
      ...rest,
      surface: _d.surface,
      colour_roles: _d.roles ? this.checkRoles(_d.roles) : null,
      palette_detail: (a.palette_detail || []).map((p) => ({ ...p, family: hueFamily(p.hex) })),
      printed_palette: this.corpus.printed_palettes?.[a.id],
      url: this.url(a), image: this.url(a, 'src'), thumbnail: this.url(a, 'thumb'), ...(a.clip ? { clip: this.url(a, 'clip') } : {}),
      source_file: origin?.path,
    };
  }
}

/* What good looks like per screen role — distilled from the corpus examples. */
const ROLE_GUIDE = {
  onboarding: { aliases: ['welcome', 'intro', 'walkthrough'],
    do: ['One promise per step, one visual, one primary CTA in the thumb zone.', 'Show progress (dots or a bar) and let people skip.', 'Ask for permissions in context, after showing value.'],
    avoid: ['More than three steps before the product is usable.', 'Feature lists disguised as onboarding.'] },
  auth: { aliases: ['login', 'signin', 'signup', 'register', 'sign'],
    do: ['Social / passkey options first, email second.', 'Show password rules before the error, not after.', 'Keep the brand moment small; the form is the hero.'],
    avoid: ['Two primary buttons of equal weight.', 'Placeholder-only labels.'] },
  dashboard: { aliases: ['analytics', 'overview', 'admin', 'metrics'],
    do: ['Lead with the one number that answers "am I OK?".', 'Group metrics in a consistent grid; colour only for status.', 'Default to a sensible time range with a segmented switch.'],
    avoid: ['Charts without a takeaway label.', 'Rainbow categorical colours for unrelated series.'] },
  home: { aliases: ['main'],
    do: ['Show the user’s current state first, actions second.', 'Make the most frequent action reachable in one tap.'],
    avoid: ['A marketing carousel as the first thing a returning user sees.'] },
  checkout: { aliases: ['payment', 'cart', 'pay'],
    do: ['Total always visible; one pinned primary button.', 'Summarise, then collect — express pay first.'],
    avoid: ['Surprise fees at the last step.', 'Leaving the flow to create an account.'] },
  pricing: { aliases: ['plans', 'paywall', 'subscription'],
    do: ['Three tiers max with the recommended one visually anchored.', 'Annual / monthly toggle near the prices it changes.'],
    avoid: ['Feature matrices longer than the screen without grouping.'] },
  settings: { aliases: ['preferences'],
    do: ['Grouped list rows with clear section headers.', 'Toggles apply instantly; destructive actions at the bottom, in red.'],
    avoid: ['Save buttons for instant settings.'] },
  'empty-state': { aliases: ['empty', 'zero'],
    do: ['Explain what will appear here and give one action to make it happen.'],
    avoid: ['A grey "No data" with no next step.'] },
  'landing-section': { aliases: ['landing', 'homepage', 'marketing', 'website', 'saas'],
    do: ['Headline that states the outcome, one sentence of support, one primary CTA.', 'Social proof directly under the hero.', 'A real product visual above the fold.'],
    avoid: ['Abstract gradient blobs instead of the product.', 'Four CTAs in the hero.'] },
  chat: { aliases: ['assistant', 'ai', 'messaging', 'agent'],
    do: ['Anchored composer; suggestions only in the empty state.', 'Stream responses; show tool activity as quiet inline status.'],
    avoid: ['Bubbles for long assistant answers — use full width.'] },
  detail: { aliases: ['product', 'item'],
    do: ['Media first, key facts in a scannable block, one sticky primary action.'],
    avoid: ['Burying the price or availability below the fold.'] },
  list: { aliases: ['feed', 'inbox'],
    do: ['Consistent row anatomy: leading visual, two lines of text, trailing meta.', 'Filters as a scrollable chip row above the list.'],
    avoid: ['Cards when rows would do — cards cost density.'] },
  profile: { aliases: ['account'],
    do: ['Identity at the top, stats as a compact row, content below.'],
    avoid: ['Settings mixed into the profile surface.'] },
  search: { aliases: ['find', 'explore'],
    do: ['Recent and suggested queries in the empty state.', 'Results update as you type; filters as chips.'],
    avoid: ['A search page that is blank until you type.'] },
};


// ---- corpus.js ----
/**
 * Corpus + image loading for Node (server and CLI).
 * Order: $UIHALL_CORPUS → a local checkout (the repo root) → ~/.cache/uihall → the public site.
 */


const VERSION = '2.1.0';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const SITE_URL = (process.env.UIHALL_SITE || SITE).replace(/\/?$/, '/');
const CACHE = process.env.UIHALL_CACHE || path.join(os.homedir(), '.cache', 'uihall');
const log = (...m) => process.stderr.write(`[uihall] ${m.join(' ')}\n`);


/** A local site root (the folder holding data/corpus.json and assets/), if any. */
function localRoot() {
  const cands = [process.env.UIHALL_ROOT, path.resolve(HERE, '..', '..'), process.cwd()];
  return cands.find((c) => c && fs.existsSync(path.join(c, 'data', 'corpus.json'))) || null;
}

async function fetchBuf(url) {
  const r = await fetch(url, { headers: { 'user-agent': `uihall-mcp/${VERSION}` } });
  if (!r.ok) throw new Error(`GET ${url} → ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

let ENGINE = null, ROOT = null, SOURCE = '', LOADING = null;
function engine() {
  return (LOADING ||= load().catch((e) => { LOADING = null; throw e; }));
}
async function load() {
  ROOT = localRoot();
  let raw;
  if (process.env.UIHALL_CORPUS) {
    raw = fs.readFileSync(process.env.UIHALL_CORPUS, 'utf8'); SOURCE = process.env.UIHALL_CORPUS;
  } else if (ROOT) {
    raw = fs.readFileSync(path.join(ROOT, 'data', 'corpus.json'), 'utf8'); SOURCE = ROOT;
  } else {
    const file = path.join(CACHE, 'corpus.json');
    const fresh = fs.existsSync(file) && Date.now() - fs.statSync(file).mtimeMs < 24 * 3600e3;
    if (fresh) { raw = fs.readFileSync(file, 'utf8'); SOURCE = file; } else {
      try {
        raw = (await fetchBuf(SITE_URL + 'data/corpus.json')).toString('utf8');
        fs.mkdirSync(CACHE, { recursive: true }); fs.writeFileSync(file, raw); SOURCE = SITE_URL;
      } catch (e) {
        if (!fs.existsSync(file)) throw new Error(`Could not load the corpus (${e.message}). Set UIHALL_CORPUS or UIHALL_ROOT to a local copy.`);
        raw = fs.readFileSync(file, 'utf8'); SOURCE = `${file} (stale; ${e.message})`;
      }
    }
  }
  ENGINE = new UiHall(JSON.parse(raw), { site: SITE_URL });
  log(`corpus v${ENGINE.corpus.version}: ${ENGINE.assets.length} references from ${SOURCE}`);
  return ENGINE;
}

const MIME = { webp: 'image/webp', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png' };

/** Bytes for an asset image: local checkout → cache → site. */
async function imageBytes(a, which) {
  const rel = which === 'thumb' ? a.thumb : which === 'strip' ? a.strip?.src : a.src;
  if (!rel) return null;
  const mimeType = MIME[rel.split('.').pop()] || 'image/webp';
  if (ROOT && fs.existsSync(path.join(ROOT, rel))) return { data: fs.readFileSync(path.join(ROOT, rel)), mimeType };
  const cached = path.join(CACHE, rel);
  if (fs.existsSync(cached)) return { data: fs.readFileSync(cached), mimeType };
  const data = await fetchBuf(SITE_URL + rel);
  fs.mkdirSync(path.dirname(cached), { recursive: true }); fs.writeFileSync(cached, data);
  return { data, mimeType };
}


// ---- tools.js ----
/**
 * MCP tool surface for UI Hall. Every tool answers a design question.
 *
 * Each handler returns { text, data, images? }:
 *   text   compact markdown the model reads (cheap on context)
 *   data   the full structured result (MCP structuredContent)
 *   images optional [{ id, which }] the server turns into image content blocks
 */


const str = (description, extra = {}) => ({ type: 'string', description, ...extra });
const arr = (description, items = { type: 'string' }) => ({ type: 'array', items, description });
const int = (description, min, max, def) => ({ type: 'integer', minimum: min, maximum: max, default: def, description });
const RO = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };

const SURFACE = { type: 'string', enum: ['dark', 'light', 'mid'], description: 'Dominant surface lightness, measured from the palette.' };
const FILTERS = {
  kind: { type: 'string', enum: ['all', 'image', 'video'], description: 'Media kind.' },
  category: arr('Category ids, e.g. mobile-app-ui, website, dashboard, motion-demo, design-system, before-after.'),
  role: arr('Screen roles (any of), e.g. onboarding, auth, dashboard, checkout, pricing, settings, empty-state, chat.'),
  style: arr('Visual styles (all of), e.g. dark-mode, minimal, editorial, glassmorphism, playful, bold-typography.'),
  tag: arr('Tags (all of), e.g. bottom-nav, chips, serif, kpi, 3d, sheet. See corpus_overview for the vocabulary.'),
  surface: SURFACE,
  hue: { type: 'string', enum: HUE_FAMILIES, description: 'Only assets using this colour family as a real accent.' },
  has_motion: { type: 'boolean', description: 'Only assets that ship a playable motion clip.' },
};

/* ------------------------------------------------------------ renderers -- */

const pal = (p) => (p || []).slice(0, 5).join(' ');
function line(h, a, extra = '') {
  const c = h.card(a);
  return `- **${c.id}** · ${c.title} — _${c.category}/${c.type}${c.motion ? ', motion' : ''}, ${c.surface}_${extra}\n  ${c.summary}\n  palette ${pal(c.palette)}${c.accent ? ` · accent ${c.accent}` : ''} · ${c.url}`;
}
function rolesMd(r, cx) {
  return `bg ${r.background} · surface ${r.surface} · text ${r.text} (${cx.text_on_background.ratio}:1 ${cx.text_on_background.verdict})`
    + (r.accent ? ` · accent ${r.accent} / on-accent ${r.on_accent} (${cx.on_accent_on_accent.ratio}:1)` : '');
}

/* ---------------------------------------------------------------- tools -- */

const TOOLS = [
  {
    name: 'search_designs',
    title: 'Search designs',
    description: 'Search 755 curated, hand-described UI/UX references (mobile screens, web pages, dashboards, motion clips, design systems). '
      + 'Ranked full-text search with synonyms ("fintech" also finds wallet, banking…) plus facet filters. '
      + 'Use this first whenever you design, build or critique an interface, so decisions come from real examples instead of the generic average. '
      + 'Set include_images to actually see the top results.',
    inputSchema: {
      type: 'object',
      properties: {
        query: str('What you are looking for, in plain words: "dark crypto wallet home", "pricing page with toggle", "onboarding with illustration".'),
        ...FILTERS,
        limit: int('Max results.', 1, 40, 8),
        offset: int('Skip this many results (paging).', 0, 1000, 0),
        include_images: { type: 'boolean', default: false, description: 'Attach thumbnails of the top results (max 6) so you can see them.' },
      },
    },
    annotations: { title: 'Search designs', ...RO },
    run(h, a) {
      const { total, results } = h.search({ ...a, limit: a.limit ?? 8, offset: a.offset ?? 0 });
      const text = total
        ? `**${total}** matches${a.query ? ` for “${a.query}”` : ''}. Showing ${results.length}:\n\n${results.map((r) => line(h, r.asset, ` · score ${r.score}`)).join('\n')}\n\nNext: get_design(id) for the full write-up, view_design(ids) to see them, find_similar(id) to branch out.`
        : `No matches${a.query ? ` for “${a.query}”` : ''}. Loosen the filters or try broader words; corpus_overview lists the vocabulary.`;
      return {
        text,
        data: { total, results: results.map((r) => h.card(r.asset, { score: r.score, matched: r.matched })) },
        images: a.include_images ? results.slice(0, 6).map((r) => ({ id: r.asset.id, which: 'thumb' })) : [],
      };
    },
  },
  {
    name: 'get_design',
    title: 'Get design',
    description: 'Full record for one reference: the hand-written description, facets, the measured palette with area percentages, '
      + 'colour roles (background/surface/text/accent) with WCAG contrast, printed palette names if any, and image/clip URLs.',
    inputSchema: { type: 'object', required: ['id'], properties: { id: str('Asset id, e.g. IMG-0468 or VID-0221.') } },
    annotations: { title: 'Get design', ...RO },
    run(h, { id }) {
      const a = h.get(id);
      if (!a) throw new Error(`Unknown id ${id}. Ids look like IMG-0468 or VID-0221; get them from search_designs.`);
      const f = h.full(a);
      const cr = f.colour_roles;
      const text = [
        `# ${a.title} (${a.id})`,
        `${a.kind} · ${a.category} / ${a.type}${a.roles?.length ? ` · roles: ${a.roles.join(', ')}` : ''} · style: ${(a.style || []).join(', ')}`,
        `tags: ${(a.tags || []).join(', ')}`,
        '', a.description, '',
        `**Measured palette** (k-means over pixels): ${(a.palette_detail || []).map((p) => `${p.hex} ${p.pct}%`).join(' · ')}`,
        cr ? `**Colour roles**: ${rolesMd(cr.roles, cr.contrast)}${cr.fixes ? `\n${cr.fixes.note} → ${cr.fixes.accent_for_text_and_icons}` : ''}` : '',
        f.printed_palette ? `**Printed swatches**: ${f.printed_palette.map((s) => `${s.name} ${s.hex}`).join(' · ')}` : '',
        `size ${a.w}×${a.h}${a.clip ? ` · motion clip ${a.clip_meta?.duration_s ?? a.duration_s}s` : ''}${a.crop_of ? ` · crop of ${a.crop_of}` : ''} · quality: ${a.quality || 'n/a'}`,
        `page ${f.url} · image ${f.image}${f.clip ? ` · clip ${f.clip}` : ''}`,
      ].filter(Boolean).join('\n');
      return { text, data: f };
    },
  },
  {
    name: 'view_design',
    title: 'View design',
    description: 'Look at references. Returns the actual images (up to 4 ids) so you can judge proportion, rhythm and polish — '
      + 'the things a description cannot carry. For videos you get the poster plus a 6-frame strip across the clip.',
    inputSchema: {
      type: 'object', required: ['ids'],
      properties: {
        ids: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 4, description: 'Asset ids to view.' },
        size: { type: 'string', enum: ['thumb', 'full'], default: 'full', description: 'thumb ≈ 480px (cheap), full ≈ up to 1600px.' },
      },
    },
    annotations: { title: 'View design', ...RO },
    run(h, { ids, size = 'full' }) {
      const list = (Array.isArray(ids) ? ids : [ids]).slice(0, 4).map((id) => h.get(id)).filter(Boolean);
      if (!list.length) throw new Error('None of those ids exist.');
      const images = [];
      for (const a of list) {
        images.push({ id: a.id, which: size === 'thumb' ? 'thumb' : 'src' });
        if (a.strip) images.push({ id: a.id, which: 'strip' });
      }
      return {
        text: list.map((a) => `**${a.id}** · ${a.title}${a.strip ? ' (poster + 6-frame strip)' : ''}`).join('\n'),
        data: { assets: list.map((a) => h.card(a)) },
        images,
      };
    },
  },
  {
    name: 'find_similar',
    title: 'Find similar',
    description: 'Branch out from one reference: assets close in content (tags, roles, style, category) and in measured colour. '
      + 'Use by="palette" for colour-only neighbours, by="content" for structure-only.',
    inputSchema: {
      type: 'object', required: ['id'],
      properties: { id: str('Asset id.'), by: { type: 'string', enum: ['all', 'content', 'palette'], default: 'all' }, limit: int('Max results.', 1, 24, 8) },
    },
    annotations: { title: 'Find similar', ...RO },
    run(h, { id, by = 'all', limit = 8 }) {
      const a = h.get(id);
      if (!a) throw new Error(`Unknown id ${id}.`);
      const res = h.similar(id, { by, limit });
      return {
        text: `Closest to **${a.id}** · ${a.title} (by ${by}):\n\n${res.map((r) => line(h, r.asset, ` · similarity ${r.score}`)).join('\n')}`,
        data: { of: a.id, by, results: res.map((r) => h.card(r.asset, { similarity: r.score })) },
      };
    },
  },
  {
    name: 'design_brief',
    title: 'Design brief',
    description: 'One call to start any screen: the best references, motion references, the structural patterns that apply (with build rules), '
      + 'three real measured palettes split into UI roles with contrast checks, role-specific do/avoid guidance and a done-checklist.',
    inputSchema: {
      type: 'object', required: ['screen'],
      properties: {
        screen: str('What you are designing: "onboarding for a sleep-tracking app", "pricing page for a dev tool", "crypto wallet home".'),
        platform: { type: 'string', enum: ['ios', 'android', 'mobile', 'web'], description: 'Target platform.' },
        mood: str('Tone: "calm", "premium", "playful", "high-energy", "editorial".'),
        surface: SURFACE,
        limit: int('Number of references.', 3, 12, 6),
      },
    },
    annotations: { title: 'Design brief', ...RO },
    run(h, a) {
      const b = h.brief(a);
      const md = [
        `# Brief: ${b.screen}`, `platform ${b.platform || 'any'} · mood ${b.mood || 'unspecified'} · surface ${b.surface}`, '',
        '## References', ...b.references.map((r) => line(h, r.asset)),
        b.motion_references.length ? '\n## Motion references' : '', ...b.motion_references.map((r) => line(h, r.asset)),
        '\n## Patterns that apply', ...b.patterns.map((p) => `- **${p.name}** (${p.evidence_count} examples, e.g. ${p.examples.map((e) => e.id).join(', ')}) — ${p.why}\n  Build: ${p.build.join(' ')}`),
        '\n## Palettes (measured from real references)', ...b.palettes.map((p) => `- from ${p.source.id}: ${rolesMd(p.roles, p.contrast)}${p.fixes ? ` · accent-as-text → ${p.fixes.accent_for_text_and_icons}` : ''}`),
        b.guidance.length ? '\n## Guidance' : '', ...b.guidance.map((g) => `**${g.role}** — do: ${g.do.join(' ')} Avoid: ${g.avoid.join(' ')}`),
        '\n## Done when', ...b.checklist.map((c) => `- [ ] ${c}`),
        '\nNext: view_design on the 2–3 closest references before writing code.',
      ].filter((x) => x !== '').join('\n');
      return {
        text: md,
        data: {
          ...b,
          references: b.references.map((r) => h.card(r.asset, { score: r.score })),
          motion_references: b.motion_references.map((r) => h.card(r.asset)),
          patterns: b.patterns.map((p) => ({ ...p, examples: p.examples.map((e) => e.id) })),
          palettes: b.palettes.map((p) => ({ ...p, source: p.source.id })),
        },
      };
    },
  },
  {
    name: 'find_patterns',
    title: 'Find patterns',
    description: 'The pattern library: recurring structural moves found across the corpus (hero number, chip row, bottom sheet, bento, '
      + 'dark + single accent …), each with why it works, concrete build rules and evidence. Pass a topic to rank by relevance.',
    inputSchema: { type: 'object', properties: { about: str('Optional topic: "fintech dashboard", "onboarding", "pricing".'), limit: int('Max patterns.', 1, 30, 8) } },
    annotations: { title: 'Find patterns', ...RO },
    run(h, { about = '', limit = 8 }) {
      const ps = h.patterns(about).slice(0, limit);
      return {
        text: ps.map((p) => `### ${p.name}\n${p.why}\n${p.build.map((b) => `- ${b}`).join('\n')}\nEvidence (${p.evidence_count}): ${p.examples.map((e) => `${e.id} ${e.title}`).join(' · ')}`).join('\n\n'),
        data: { about: about || null, patterns: ps.map((p) => ({ ...p, examples: p.examples.map((e) => h.card(e)) })) },
      };
    },
  },
  {
    name: 'palette_for',
    title: 'Palette for',
    description: 'Real palettes for a mood or product, taken from the closest references (measured from pixels, not invented). '
      + 'Each comes split into background / surface / text / muted / accent / on-accent with WCAG contrast and fixes where needed.',
    inputSchema: {
      type: 'object',
      properties: {
        mood: str('Feeling: "warm and quiet", "loud and synthetic", "trustworthy", "premium".'),
        query: str('Product or screen context: "meditation app", "crypto exchange".'),
        surface: SURFACE, category: arr('Restrict to categories.'), count: int('How many palettes.', 1, 8, 4),
      },
    },
    annotations: { title: 'Palette for', ...RO },
    run(h, a) {
      const r = h.paletteFor(a);
      return {
        text: `Palettes for “${r.query || 'anything'}” from ${r.evidence_size} references. Common accent families: ${r.common_accent_families.map((f) => `${f.family} (${f.assets})`).join(', ') || 'n/a'}\n\n`
          + r.palettes.map((p, i) => `${i + 1}. from **${p.source.id}** ${p.source.title}\n   ${rolesMd(p.roles, p.contrast)}${p.fixes ? `\n   accent as text → ${p.fixes.accent_for_text_and_icons}` : ''}`).join('\n')
          + '\n\nexport_tokens(id) turns any of these into CSS / Tailwind / SwiftUI / Compose tokens.',
        data: { ...r, palettes: r.palettes.map((p) => ({ ...p, source: h.card(p.source) })) },
      };
    },
  },
  {
    name: 'search_by_color',
    title: 'Search by colour',
    description: 'Find references that actually use a colour (perceptual OKLab distance over measured swatches). '
      + 'Answers "show me real interfaces built on this lime / this navy" and how much area it takes.',
    inputSchema: {
      type: 'object', required: ['hex'],
      properties: {
        hex: str('Colour, e.g. #C1FE1A.'),
        tolerance: { type: 'number', minimum: 0.01, maximum: 0.3, default: 0.09, description: 'OKLab distance. 0.03 ≈ same colour, 0.1 ≈ clearly related.' },
        limit: int('Max results.', 1, 40, 10),
      },
    },
    annotations: { title: 'Search by colour', ...RO },
    run(h, { hex, tolerance = 0.09, limit = 10 }) {
      const r = h.byColor(hex, { tolerance, limit });
      return {
        text: r.length
          ? `${r.length} references use ${normHex(hex)} (${hueFamily(hex)}):\n\n${r.map((x) => line(h, x.asset, ` · ${x.match} covers ${x.area_pct}% (Δ${x.distance})`)).join('\n')}`
          : `Nothing within ${tolerance} of ${normHex(hex)}. Raise tolerance to ~0.15.`,
        data: { hex: normHex(hex), family: hueFamily(hex), results: r.map((x) => h.card(x.asset, { match: x.match, distance: x.distance, area_pct: x.area_pct })) },
      };
    },
  },
  {
    name: 'export_tokens',
    title: 'Export design tokens',
    description: 'Turn a reference\'s measured palette (or your own hex list) into ready-to-paste tokens: semantic colours, an 11-step accent ramp, '
      + 'a neutral ramp, radius and spacing — as CSS variables, Tailwind config, W3C design-tokens JSON, SwiftUI or Jetpack Compose.',
    inputSchema: {
      type: 'object',
      properties: {
        id: str('Asset id to take the palette from.'),
        colors: arr('Or explicit hex colours, most-used first.'),
        format: { type: 'string', enum: ['css', 'tailwind', 'dtcg', 'swiftui', 'compose'], default: 'css' },
        prefix: str('Variable prefix.', { default: 'uh' }),
      },
    },
    annotations: { title: 'Export design tokens', ...RO },
    run(h, { id, colors, format = 'css', prefix = 'uh' }) {
      const t = h.tokens({ id, colors, format, name: prefix });
      const lang = { css: 'css', tailwind: 'js', dtcg: 'json', json: 'json', swiftui: 'swift', compose: 'kotlin' }[format];
      return { text: `Tokens (${t.scheme} scheme${t.source ? `, from ${t.source}` : ''}):\n\n\`\`\`${lang}\n${t.code}\`\`\``, data: t };
    },
  },
  {
    name: 'compare_designs',
    title: 'Compare designs',
    description: 'Put 2–4 references side by side: shared and distinct roles, styles and tags, each one\'s colour roles with WCAG contrast, '
      + 'and how far apart their palettes are. Use it to choose between directions or to explain why one works better. Set include_images to see them together.',
    inputSchema: {
      type: 'object', required: ['ids'],
      properties: {
        ids: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 4, description: 'Asset ids to compare.' },
        include_images: { type: 'boolean', default: false, description: 'Attach the thumbnails.' },
      },
    },
    annotations: { title: 'Compare designs', ...RO },
    run(h, { ids, include_images = false }) {
      const c = h.compare(Array.isArray(ids) ? ids : [ids]);
      const md = [
        `# Comparing ${c.assets.map((a) => a.id).join(' · ')}`, '',
        ...c.assets.map((a) => line(h, a)), '',
        `**Shared** — roles: ${c.shared.roles.join(', ') || '—'} · style: ${c.shared.style.join(', ') || '—'} · tags: ${c.shared.tags.join(', ') || '—'}`,
        '**Distinct**', ...c.distinct.tags.map((d, i) => `- ${d.id}: ${[...c.distinct.style[i].values, ...d.values].slice(0, 10).join(', ') || '—'}`),
        '**Colour**', ...c.colour.map((x) => `- ${x.id} (${x.surface}): ${x.roles ? rolesMd(x.roles, x.contrast) : 'n/a'}`),
        `**Palette distance** (OKLab, 0 = identical): ${c.palette_distance.map((p) => `${p.a}↔${p.b} ${p.palette_distance}`).join(' · ')}`,
      ].join('\n');
      return {
        text: md,
        data: { ...c, assets: c.assets.map((a) => h.card(a)) },
        images: include_images ? c.assets.map((a) => ({ id: a.id, which: 'thumb' })) : [],
      };
    },
  },
  {
    name: 'generate_design_system',
    title: 'Generate design system',
    description: 'A complete, paste-ready starter design system from a reference (or your own colours): semantic colour + 11-step ramps, '
      + 'a type pairing and modular scale chosen from the reference\'s style, spacing, radius, elevation and motion tokens, '
      + 'plus base CSS for buttons, cards, inputs and chips. Contrast-checked. The fastest way from "I like this one" to code.',
    inputSchema: {
      type: 'object',
      properties: {
        id: str('Asset id to build from.'),
        colors: arr('Or explicit hex colours, most-used first.'),
        mood: str('Optional tone that nudges type and radius: "editorial", "playful", "dense".'),
        prefix: str('CSS variable prefix.', { default: 'uh' }),
      },
    },
    annotations: { title: 'Generate design system', ...RO },
    run(h, { id, colors, mood = '', prefix = 'uh' }) {
      const d = h.designSystem({ id, colors, mood, name: prefix });
      return {
        text: `Design system (${d.scheme}${d.source ? `, from ${d.source}` : ''}) — ${d.type.rationale} Base ${d.type.base}px × ${d.type.ratio}.\n\n\`\`\`css\n${d.css}\`\`\``,
        data: d,
      };
    },
  },
  {
    name: 'check_contrast',
    title: 'Check contrast',
    description: 'WCAG 2.x contrast for a text/background pair, the AA/AAA verdict, and the nearest passing text colour if it fails.',
    inputSchema: {
      type: 'object', required: ['foreground', 'background'],
      properties: { foreground: str('Text colour hex.'), background: str('Background colour hex.'), target: { type: 'number', default: 4.5, description: 'Target ratio (4.5 body, 3 large text, 7 AAA).' } },
    },
    annotations: { title: 'Check contrast', ...RO },
    run(h, { foreground, background, target = 4.5 }) {
      const fg = normHex(foreground), bg = normHex(background);
      if (!fg || !bg) throw new Error('Both colours must be hex values like #1A1A1A.');
      const w = wcag(contrast(fg, bg));
      const fix = w.ratio < target ? fitContrast(fg, bg, target) : null;
      return {
        text: `${fg} on ${bg}: **${w.ratio}:1** — ${w.verdict}.${fix ? ` Nearest passing (${target}:1): ${fix} (${contrast(fix, bg)}:1).` : ''}`,
        data: { foreground: fg, background: bg, ...w, target, suggestion: fix },
      };
    },
  },
  {
    name: 'before_after',
    title: 'Before / after',
    description: 'Redesign evidence: the same screen done weakly and done well, with the write-up of what changed. Best teaching material in the corpus for critiques.',
    inputSchema: { type: 'object', properties: { topic: str('Optional topic: "wallet", "landing page", "settings".'), limit: int('Max results.', 1, 20, 6) } },
    annotations: { title: 'Before / after', ...RO },
    run(h, { topic = '', limit = 6 }) {
      const r = h.beforeAfter({ topic, limit });
      return {
        text: r.length ? r.map((x) => line(h, x.asset)).join('\n') : 'No before/after pairs match; try without a topic.',
        data: { topic: topic || null, results: r.map((x) => h.card(x.asset)) },
      };
    },
  },
  {
    name: 'corpus_overview',
    title: 'Corpus overview',
    description: 'What the corpus contains and the exact vocabulary for filters: categories, types, roles, styles, tags with counts, surfaces, colour families, patterns and provenance.',
    inputSchema: { type: 'object', properties: { tags: { type: 'boolean', default: false, description: 'Include the full tag vocabulary (long).' } } },
    annotations: { title: 'Corpus overview', ...RO },
    run(h, { tags = false }) {
      const f = h.facets(), s = h.stats();
      const fmt = (xs) => xs.map((x) => `${x.id} (${x.count})`).join(', ');
      const text = [
        `# UI Hall corpus v${s.version}: ${s.totals.assets} references — ${s.totals.images} images, ${s.totals.videos} videos (${s.totals.clips} with motion clips)`,
        `**categories**: ${fmt(f.categories)}`, `**types**: ${fmt(f.types)}`, `**roles**: ${fmt(f.roles)}`, `**styles**: ${fmt(f.styles)}`,
        `**surfaces**: ${Object.entries(f.surfaces).map(([k, v]) => `${k} (${v})`).join(', ')}`,
        `**colour families**: ${Object.entries(f.hue_families).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} (${v})`).join(', ')}`,
        `**patterns**: ${s.patterns.map((p) => `${p.name} (${p.evidence})`).join(', ')}`,
        `**tags**: ${tags ? fmt(f.tags) : `${fmt(f.tags.slice(0, 60))} … (${f.tags.length} total; pass tags:true for all)`}`,
        '', ...Object.values(s.provenance).map((p) => `- ${p}`),
      ].join('\n');
      return { text, data: { ...s, facets: tags ? f : { ...f, tags: f.tags.slice(0, 60) } } };
    },
  },
];

/* --------------------------------------------------------------- prompts -- */

const PROMPTS = [
  {
    name: 'design-screen',
    title: 'Design a screen from evidence',
    description: 'Design and build a screen grounded in real references from UI Hall.',
    arguments: [
      { name: 'screen', description: 'What to design, e.g. "onboarding for a sleep tracker".', required: true },
      { name: 'platform', description: 'ios, android, mobile or web.', required: false },
      { name: 'mood', description: 'Tone, e.g. calm, premium, playful.', required: false },
    ],
    render: ({ screen, platform = '', mood = '' }) => `Design "${screen}"${platform ? ` for ${platform}` : ''}${mood ? `, mood: ${mood}` : ''}.

1. Call design_brief with these inputs.
2. view_design the 2–3 closest references and say, in one line each, what structure you are taking from them (hierarchy, layout, rhythm — not their skin).
3. Pick one palette from the brief (or palette_for) and export_tokens it in the format the codebase uses. Check every text/background pair with check_contrast.
4. Build the screen. Cite the reference ids you used in a comment at the top.
5. Finish with the brief's checklist, ticking each item honestly.`,
  },
  {
    name: 'critique-ui',
    title: 'Critique an interface against references',
    description: 'Critique a screen by comparing it with real references and before/after evidence.',
    arguments: [{ name: 'description', description: 'What the screen is and what it contains (or attach a screenshot).', required: true }],
    render: ({ description }) => `Critique this interface: ${description}

1. search_designs for the same kind of screen and view_design the best 3.
2. before_after for the topic, to see what redesigns typically fix.
3. Report: the 3 changes with the biggest impact first (hierarchy, primary action, density, colour/contrast, type), each tied to a reference id. Then smaller polish notes. Be specific: sizes, colours, spacing values.`,
  },
  {
    name: 'pick-palette',
    title: 'Pick a palette',
    description: 'Choose a production palette from measured references and export tokens.',
    arguments: [
      { name: 'mood', description: 'What it should feel like.', required: true },
      { name: 'format', description: 'css, tailwind, dtcg, swiftui or compose.', required: false },
    ],
    render: ({ mood, format = 'css' }) => `Find a palette that feels "${mood}". Call palette_for, view_design the sources of the two best options, choose one and explain why in two sentences, then export_tokens(id, format="${format}"). Flag any contrast fixes.`,
  },
];

// ---- cli.js ----
/**
 * uihall — command-line access to the same tools the MCP server exposes.
 * For agents without MCP (or humans in a terminal). Prints the markdown the
 * model would read; add --json for structuredContent.
 *
 *   node uihall.mjs brief "onboarding for a sleep tracking app" --platform ios --mood calm
 *   node uihall.mjs search "dark crypto wallet" --limit 5
 *   node uihall.mjs get IMG-0468
 *   node uihall.mjs similar IMG-0468
 *   node uihall.mjs palette --mood calm --query wellness
 *   node uihall.mjs color "#C6F432"
 *   node uihall.mjs tokens IMG-0473 --format tailwind
 *   node uihall.mjs compare IMG-0432 IMG-0433
 *   node uihall.mjs system IMG-0473 --mood editorial   → full starter design system CSS
 *   node uihall.mjs contrast "#888" "#fff"
 *   node uihall.mjs patterns "dashboard"
 *   node uihall.mjs before-after wallet
 *   node uihall.mjs overview
 *   node uihall.mjs image IMG-0468        → prints a local file path you can open
 */


const argv = process.argv.slice(2);
const flags = {}, pos = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a.startsWith('--')) {
    const k = a.slice(2).replace(/-/g, '_');
    const v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
    flags[k] = flags[k] === undefined ? v : [].concat(flags[k], v);
  } else pos.push(a);
}
const num = (v) => (v === undefined || v === true ? undefined : Number(v));
const list = (v) => (v === undefined ? undefined : [].concat(v).flatMap((x) => String(x).split(',')).map((x) => x.trim()).filter(Boolean));

const [cmd, ...rest] = pos;
const text = rest.join(' ');
const MAP = {
  search: () => ['search_designs', { query: text, limit: num(flags.limit), category: list(flags.category), role: list(flags.role), style: list(flags.style), tag: list(flags.tag), surface: flags.surface, hue: flags.hue, kind: flags.kind, has_motion: flags.motion ? true : undefined }],
  get: () => ['get_design', { id: rest[0] }],
  similar: () => ['find_similar', { id: rest[0], by: flags.by, limit: num(flags.limit) }],
  brief: () => ['design_brief', { screen: text, platform: flags.platform, mood: flags.mood, surface: flags.surface, limit: num(flags.limit) }],
  patterns: () => ['find_patterns', { about: text, limit: num(flags.limit) }],
  palette: () => ['palette_for', { mood: flags.mood || text, query: flags.query, surface: flags.surface, count: num(flags.count) }],
  color: () => ['search_by_color', { hex: rest[0], tolerance: num(flags.tolerance), limit: num(flags.limit) }],
  tokens: () => ['export_tokens', rest[0]?.startsWith('#') ? { colors: rest, format: flags.format } : { id: rest[0], format: flags.format, prefix: flags.prefix }],
  compare: () => ['compare_designs', { ids: rest }],
  system: () => ['generate_design_system', rest[0]?.startsWith('#') ? { colors: rest, mood: flags.mood } : { id: rest[0], mood: flags.mood, prefix: flags.prefix }],
  contrast: () => ['check_contrast', { foreground: rest[0], background: rest[1], target: num(flags.target) }],
  'before-after': () => ['before_after', { topic: text, limit: num(flags.limit) }],
  overview: () => ['corpus_overview', { tags: !!flags.tags }],
};

async function main() {
  if (!cmd || cmd === 'help' || flags.help) {
    const src = fs.readFileSync(new URL(import.meta.url), 'utf8');
    process.stdout.write(src.match(/\/\*\*([\s\S]*?)\*\//)[1].replace(/^ \* ?/gm, '') + '\n');
    return;
  }
  const h = await engine();
  if (cmd === 'image') {
    const out = [];
    for (const id of rest) {
      const a = h.get(id);
      if (!a) { out.push(`${id}: unknown id`); continue; }
      for (const which of a.strip ? ['src', 'strip'] : ['src']) {
        const b = await imageBytes(a, which);
        const file = path.join(os.tmpdir(), `uihall-${a.id}${which === 'strip' ? '-strip' : ''}.${b.mimeType.split('/')[1]}`);
        fs.writeFileSync(file, b.data);
        out.push(file);
      }
    }
    process.stdout.write(out.join('\n') + '\n');
    return;
  }
  const spec = MAP[cmd];
  if (!spec) throw new Error(`Unknown command "${cmd}". Run with --help.`);
  const [name, args] = spec();
  for (const k of Object.keys(args)) if (args[k] === undefined || args[k] === '') delete args[k];
  const res = TOOLS.find((t) => t.name === name).run(h, args);
  process.stdout.write((flags.json ? JSON.stringify(res.data, null, 2) : res.text) + '\n');
}

main().catch((e) => { process.stderr.write(`uihall: ${e.message}\n`); process.exit(1); });
