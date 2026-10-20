import { $, esc, split } from '../lib.js';
import { thumb, footer } from './shared.js';

export default function patterns(root, app) {
  const { h } = app;
  const ps = h.patterns();
  root.innerHTML = `
  <div class="container page-head">
    <span class="eyebrow" data-reveal>Pattern library · ${ps.length} patterns</span>
    <h1 class="display h-lg" id="pt">Patterns, <em>with receipts.</em></h1>
    <p class="lede" data-reveal style="--d:2">Recurring structural moves found across the corpus. Each one says why it works, gives build rules an engineer can follow, and links the references that prove it. A move seen fewer times than its threshold isn’t listed — no evidence, no claim.</p>
  </div>
  <div class="container patterns">
    ${ps.map((p, i) => `
    <article class="pattern" id="${p.slug}" data-reveal>
      <div class="pattern__n">${String(i + 1).padStart(2, '0')}</div>
      <div>
        <h3>${esc(p.name)}</h3>
        <p>${esc(p.why)}</p>
        <ul>${p.build.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>
        <p class="pattern__count">${p.evidence_count} screens · <a href="#/library?q=${encodeURIComponent(p.name)}" style="color:var(--accent-text)">search similar</a></p>
      </div>
      <div class="pattern__ev">${p.examples.map((a) => `<a href="#/a/${a.id}" title="${esc(a.title)}"${a.viewport && a.viewport !== 'phone' ? ' class="wide"' : ''}><img src="${thumb(a)}" alt="${esc(a.title)}" loading="lazy"></a>`).join('')}</div>
    </article>`).join('')}
  </div>
  ${footer(h)}`;
  const t = $('#pt', root); split(t); requestAnimationFrame(() => t.classList.add('in'));
  const target = location.hash.split('#')[2];
  if (target) setTimeout(() => document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
  return { order: () => ps.flatMap((p) => p.examples.map((a) => a.id)) };
}
