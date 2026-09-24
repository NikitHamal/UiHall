import fs from "node:fs";
const c = JSON.parse(fs.readFileSync("../ui-hall/data/corpus.json", "utf8"));
const assets = c.assets || c;
console.log("total assets:", assets.length);
const tally = {};
for (const a of assets) {
  const k = Array.isArray(a.category) ? "ARRAY:" + a.category.join("+") : String(a.category);
  tally[k] = (tally[k] || 0) + 1;
}
const sorted = Object.entries(tally).sort((a, b) => b[1] - a[1]);
for (const [k, v] of sorted) console.log(String(v).padStart(5), k);
console.log("sum:", sorted.reduce((s, [, v]) => s + v, 0));
