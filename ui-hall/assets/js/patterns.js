/* UI Hall — named patterns.
   Each pattern is a testable claim about the corpus, not an opinion. The `match`
   predicate runs against the real metadata, so the example count on the page is
   the number of assets that actually satisfy it. If a pattern's count drops to
   zero the pattern is wrong, not the data.

   `min` is the floor below which the pattern is not shown — a "pattern" seen
   once is an anecdote. */

const PATTERNS = [
  {
    name: 'One hero number',
    why: 'A single dominant figure — balance, score, countdown — set far larger than everything around it, with the supporting detail subordinated. The most reliable way to give a mobile screen an immediate focal point without adding decoration. Appears constantly in finance and habit apps.',
    min: 4,
    match: (a) => has(a, ['dashboard', 'analytics']) ||
      (has(a, ['fintech', 'crypto', 'budgeting']) && has(a, ['cards', 'list'])),
  },
  {
    name: 'Card over tinted backdrop',
    why: 'A light content card floating on a saturated or gradient background rather than on white. Separates "chrome" from "content" using colour instead of elevation, which survives dark mode far better than a shadow does.',
    min: 4,
    match: (a) => has(a, ['cards']) && (has(a, ['gradient', 'glow', 'vibrant', 'vibrant'])),
  },
  {
    name: 'Progressive disclosure list',
    why: 'Rows stacked flat, each expandable rather than each being its own screen. Onboarding, settings and FAQ flows lean on this to keep perceived length down while still showing everything available.',
    min: 4,
    match: (a) => has(a, ['list']) && (has(a, ['onboarding', 'settings']) || hasRole(a, ['settings', 'onboarding'])),
  },
  {
    name: 'Bottom tab bar, 4–5 destinations',
    why: 'Fixed bottom navigation with a small, consistent set of top-level destinations and the active one marked by tint rather than weight. Universal on iOS, near-universal on Android. The interesting variation is what happens to the bar when a sheet or keyboard is open.',
    min: 4,
    match: (a) => has(a, ['bottom-nav', 'tabs']) || hasRole(a, ['navigation']),
  },
  {
    name: 'Empty state that teaches',
    why: 'The zero-data screen is used to explain what the product does and offer exactly one action — rather than showing a grey box that says "no data". A cheap, high-leverage screen that most products skip.',
    min: 3,
    match: (a) => has(a, ['empty-state']) || hasRole(a, ['empty-state']),
  },
  {
    name: 'Dark surface, single hot accent',
    why: 'A near-black background with exactly one saturated accent colour carrying every interactive element. The accent is almost always warm (amber, lime, magenta) because a co`ol accent on black loses its punch.',
    min: 4,
    match: (a) => has(a, ['dark-ui']) && (hasStyle(a, ['high-contrast']) || hasStyle(a, ['bold-typography'])),
  },
  {
    name: 'Illustration as the load-bearing element',
    why: 'The layout has no strong photograph or data, so an illustration does the job of holding attention and setting tone. Common in onboarding and education, and the hardest category to get right — it dates fastest of anything on this page.',
    min: 3,
    match: (a) => hasStyle(a, ['playful', 'illustration-led']) || has(a, ['illustration']),
  },
  {
    name: 'Metric grid',
    why: 'Small multiples of equal-weight tiles, each carrying one number and one label. Reads in a glance, degrades gracefully on narrow screens, and avoids the trap of one giant number that says nothing.',
    min: 3,
    match: (a) => has(a, ['analytics', 'charts', 'dashboard']) && has(a, ['cards', 'grid']),
  },
  {
    name: 'Type-led marketing hero',
    why: 'A large statement set in a confident weight, with the product screenshot or illustration secondary. The most common structure in the collected landing pages, and by far the most effective — it survives translation and small screens.',
    min: 4,
    match: (a) => hasRole(a, ['hero']) || (hasStyle(a, ['editorial', 'bold-typography']) && has(a, ['landing-page', 'marketing'])),
  },
  {
    name: 'Before / after with the delta labelled',
    why: 'Two states shown side by side with an explicit label on each. Rarer than it should be: most design documentation shows only the finished state, which makes the reasoning invisible.',
    min: 3,
    match: (a) => a.category === 'before-after' || has(a, ['before-after']),
  },
  {
    name: 'Frameless device mockup on flat colour',
    why: 'A phone presented on a solid tint with no browser chrome and no furniture. The workhorse presentation format for a single screen — it makes the screen itself the whole composition, which is why it appears in the vast majority of the collected app shots.',
    min: 8,
    match: (a) => has(a, ['mockup', 'device-frame']) && (has(a, ['light-ui', 'dark-ui']) || hasStyle(a, ['minimal'])),
  },
  {
    name: 'Multi-screen flow strip',
    why: 'Three or more screens of one flow laid out left to right. Encodes the *sequence* rather than any single screen, and is the most direct way to show an agent what an ordered journey looks like.',
    min: 4,
    match: (a) => a.type === 'multi-screen' || a.type === 'flow-walkthrough',
  },
  {
    name: 'Scrollable chip-filter row',
    why: 'Filter chips in a horizontally scrolling row, never wrapping or clipping. Build rule: fixed height (44px), min-width (≥84px), nowrap labels, overflow-x:auto with hidden scrollbar. Without min-width a short label ("All") collapses to a circle next to pill siblings; without overflow the last chip clips at the card edge. 44px keeps the Android touch target.',
    min: 3,
    match: (a) => has(a, ['chip-filter', 'filters', 'sorting']),
  },
  {
    name: 'Segmented range control',
    why: 'A Week/Month/Year switch that re-draws one chart and moves nothing else. One state, one controller — the control owns the range, the chart owns the render. Day labels are abbreviated (Mon), never single letters.',
    min: 3,
    match: (a) => has(a, ['segmented-control', 'tabs']),
  },
];

/* ---- predicate helpers: metadata shape can be an array or a string ---- */

function has(a, list) { return list.some((x) => (a.tags || []).includes(x)); }
function hasStyle(a, list) { return list.some((x) => (a.style || []).includes(x)); }
function hasRole(a, list) { return list.some((x) => (a.roles || []).includes(x)); }
