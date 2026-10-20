import { esc } from '../lib.js';
import { footer } from './shared.js';

export const DEMOS = [
  { id: 'wallet', name: 'Halo', kind: 'iOS app · dark · fintech', title: 'A premium wallet, <em>one blue at a time.</em>', refs: ['ORG-0197', 'ORG-0109', 'ORG-0189'],
    text: 'A complete wallet: home with live balance and chart, markets, asset detail, swap, activity, profile — plus Send and Receive flows.' },
  { id: 'dashboard', name: 'Kiln', kind: 'Web app · dark · analytics', title: 'A dashboard that <em>leads with the number.</em>', refs: ['ORG-0001', 'ORG-0577', 'ORG-0297'],
    text: 'Overview, reports, transactions with a detail drawer, accounts and settings — sortable, filterable and keyboard friendly.' },
  { id: 'pricing', name: 'Relay', kind: 'Website · light · developer tool', title: 'A product site, <em>no surprises.</em>', refs: ['ORG-0097', 'ORG-0997', 'ORG-0033'],
    text: 'Landing, pricing with a usage-based recommender, compare table, FAQ and a sign-up flow.' },
  { id: 'sleep', name: 'Hush', kind: 'iOS app · light · wellness', title: 'A calm onboarding, <em>from evidence.</em>', refs: ['ORG-0125', 'ORG-0037', 'ORG-0061'],
    text: 'Onboarding into a working app: tonight’s plan, a wind-down timer, sleep insights and a journal.' },
];

export default function demos(root, app) {
  root.innerHTML = `
  <div class="container">
    <div class="page-head page-head--row">
      <div><span class="eyebrow">Built with the skill</span><h1 class="display h-lg mt-s">Evidence in, <em>product out.</em></h1>
      <p class="lede">Complete, working prototypes made by following the uihall skill end to end — brief, look, take the structure, use the measured palette, walk the checklist. Each links the related originals in the hall. Open them and click around: every tab works.</p></div>
    </div>
    <div class="demo-list">
      ${DEMOS.map((d) => `
      <a class="demo-card" href="demo/${d.id}/">
        <div class="demo-card__img"><img src="demo/${d.id}/cover.jpg" alt="${esc(d.name)}" loading="lazy"></div>
        <div class="demo-card__body">
          <span class="eyebrow">${esc(d.kind)}</span>
          <h2 class="display">${esc(d.name)} — ${d.title}</h2>
          <p>${esc(d.text)}</p>
          <div class="demo-card__refs">${d.refs.map((r) => `<img src="${app.h.get(r)?.thumb || ''}" alt="${r}" title="${r}">`).join('')}<span>${d.refs.join(' · ')}</span></div>
        </div>
      </a>`).join('')}
    </div>
  </div>
  ${footer(app.h)}`;
}
