/* Originals: screens and components designed and built in code for UI Hall,
   rendered and measured like every other reference — and free to reuse (MIT). */

import library from './library.js';

export default function originals(root, app, route) {
  const n = app.h.corpus.totals.originals || 0;
  return library(root, app, route, {
    base: '#/originals',
    fixed: { source: 'original' },
    head: `<div class="page-head page-head--row">
      <div><span class="eyebrow">Originals · MIT licensed</span>
        <h1 class="display h-lg mt-s">Designed here, <em>free to use.</em></h1>
        <p class="lede">${n} screens and components built in code for UI Hall. Each one ships in four themes from a single source file — open it to switch palettes and interact with the live screen. Written up and colour-measured like everything else, and MIT licensed: study it, remix it, ship it.</p></div>
      <a class="btn btn--sm" href="https://github.com/NikitHamal/UiHall/tree/main/originals">View the source</a>
    </div>`,
  });
}
