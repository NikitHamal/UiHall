/**
 * Colour maths for UI Hall. Isomorphic, dependency-free.
 *
 * Distances are measured in OKLab, which is perceptually uniform enough that
 * "nearest colour" means what a designer means by it. Contrast is WCAG 2.x
 * relative luminance, because that is what accessibility audits still check.
 */

export function hexToRgb(hex) {
  const h = String(hex || '').trim().replace(/^#/, '');
  const v = h.length === 3 ? [...h].map((c) => c + c).join('') : h.slice(0, 6);
  if (!/^[0-9a-f]{6}$/i.test(v)) return null;
  const n = parseInt(v, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex([r, g, b]) {
  const c = (x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`.toUpperCase();
}

export function normHex(hex) {
  const rgb = hexToRgb(hex);
  return rgb ? rgbToHex(rgb) : null;
}

const lin = (v) => { const s = v / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
const delin = (v) => 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);

export function luminance(hex) {
  const c = hexToRgb(hex);
  if (!c) return 0;
  const [r, g, b] = c.map(lin);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.x contrast ratio, rounded to two decimals. */
export function contrast(a, b) {
  const la = luminance(a), lb = luminance(b);
  const r = (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  return Math.round(r * 100) / 100;
}

export function wcag(ratio) {
  return {
    ratio,
    AA: ratio >= 4.5, AA_large: ratio >= 3, AAA: ratio >= 7, AAA_large: ratio >= 4.5,
    verdict: ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : ratio >= 3 ? 'AA large text only' : 'fails',
  };
}

export function toOklab(hex) {
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

export function fromOklab([L, a, b]) {
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
export function toOklch(hex) {
  const [L, a, b] = toOklab(hex);
  const C = Math.hypot(a, b);
  let h = C < 1e-4 ? 0 : (Math.atan2(b, a) * 180) / Math.PI;
  if (h < 0) h += 360;
  return [L, C, h];
}

export function fromOklch([L, C, h]) {
  const r = ((Number.isFinite(h) ? h : 0) * Math.PI) / 180;
  return fromOklab([L, C * Math.cos(r), C * Math.sin(r)]);
}

/** Perceptual distance. ~0.02 is "same colour", ~0.1 "clearly related". */
export function deltaE(a, b) {
  const p = toOklab(a), q = toOklab(b);
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
}

const HUES = [
  ['red', 0, 18], ['orange', 18, 70], ['yellow', 70, 110], ['lime', 110, 130], ['green', 130, 165],
  ['teal', 165, 200], ['cyan', 200, 225], ['blue', 225, 275], ['violet', 275, 310], ['magenta', 310, 345], ['red', 345, 361],
];

/** A designer's name for a colour family: 'near-black', 'warm grey', 'orange' … */
export function hueFamily(hex) {
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

export const HUE_FAMILIES = ['red', 'orange', 'brown', 'yellow', 'lime', 'green', 'teal', 'cyan', 'blue', 'violet', 'magenta', 'black', 'grey', 'white'];

/** Pick the text colour (from candidates, else black/white) that reads best on bg. */
export function bestInk(bg, candidates = []) {
  const pool = [...candidates, '#FFFFFF', '#0A0A0A'];
  return pool.reduce((best, c) => (contrast(c, bg) > contrast(best, bg) ? c : best), pool[0]);
}

/** Nudge a colour's lightness in OKLCH until it hits a target contrast on bg. */
export function fitContrast(fg, bg, target = 4.5) {
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
export function paletteRoles(detail) {
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
