// Render every originals/screens/*.html × theme to PNG (2×) for tools/build_originals.py.
//   node tools/render_originals.mjs <outDir> [baseUrl] [slugFilter]
import { chromium } from 'playwright';
import fs from 'node:fs';
const [,, out = '/tmp/orig_png', base = 'http://localhost:8099', filter = ''] = process.argv;
const root = new URL('../', import.meta.url);
const themes = Object.keys(JSON.parse(fs.readFileSync(new URL('originals/kit/themes.json', root))));
const slugs = fs.readdirSync(new URL('originals/screens/', root)).filter((f) => f.endsWith('.html') && f.includes(filter)).map((f) => f.slice(0, -5));
fs.mkdirSync(out, { recursive: true });
const VP = { phone: [600, 1000], desktop: [1600, 1060], canvas: [1300, 900] };
const b = await chromium.launch();
for (const slug of slugs) {
  const html = fs.readFileSync(new URL(`originals/screens/${slug}.html`, root), 'utf8');
  const meta = JSON.parse(html.match(/<script type="application\/json" id="meta">(.*?)<\/script>/s)[1]);
  const [w, h] = VP[meta.viewport];
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  for (const t of meta.themes || themes) {
    await p.goto(`${base}/originals/screens/${slug}.html?theme=${t}`);
    await p.waitForSelector('body[data-ready="1"]', { timeout: 10000 });
    await p.waitForTimeout(150);
    await p.screenshot({ path: `${out}/${slug}@${t}.png`, fullPage: meta.viewport === 'canvas' });
  }
  await p.close();
  console.log('rendered', slug);
}
await b.close();
