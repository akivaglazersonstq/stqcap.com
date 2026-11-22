// Daily SEO/AI health audit. Scans every public page for the signals search
// and AI engines rely on; exits non-zero (failing the workflow, which emails
// the owner) if anything is broken. Run by .github/workflows/daily-seo-audit.yml.

import { readFileSync, readdirSync, existsSync } from 'node:fs';

const pages = [
  ...readdirSync('.').filter(f => f.endsWith('.html') && !f.startsWith('_')),
  ...readdirSync('insights').filter(f => f.endsWith('.html')).map(f => 'insights/' + f),
];

const problems = [];
const titles = new Map();

for (const f of pages) {
  const s = readFileSync(f, 'utf8');
  const noindex = s.includes('noindex');
  const title = (s.match(/<title>([^<]*)<\/title>/) || [])[1];
  const desc = (s.match(/name="description" content="([^"]*)"/) || [])[1];

  if (title) {
    if (titles.has(title)) problems.push(`duplicate title: ${f} and ${titles.get(title)}`);
    titles.set(title, f);
  } else if (!noindex) problems.push(`${f}: no <title>`);

  if (!noindex) {
    if (!desc) problems.push(`${f}: no meta description`);
    else if (desc.length > 165) problems.push(`${f}: description ${desc.length} chars (max 165)`);
    if (!s.includes('rel="canonical"')) problems.push(`${f}: no canonical`);
    if (!s.includes('og:image')) problems.push(`${f}: no og:image`);
  }

  for (const m of s.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { JSON.parse(m[1]); } catch (e) { problems.push(`${f}: invalid JSON-LD (${e.message.slice(0, 60)})`); }
  }

  for (const m of s.matchAll(/href="(\/[^"#?]+\.(?:html|pdf|png))"/g)) {
    if (!existsSync(m[1].slice(1))) problems.push(`${f}: broken link ${m[1]}`);
  }
}

// insights listing: JS array and prerendered grid must match
const ins = readFileSync('insights.html', 'utf8');
const arr = [...ins.matchAll(/url: "([^"]+)"/g)].map(m => m[1]).sort();
const grid = [...ins.matchAll(/class="issue-card" href="([^"]+)"/g)].map(m => m[1]).filter(u => !u.startsWith('$')).sort();
if (JSON.stringify(arr) !== JSON.stringify(grid)) problems.push(`insights.html: array (${arr.length}) and grid (${grid.length}) differ`);
for (const u of arr) if (!existsSync(u.slice(1))) problems.push(`insights.html lists missing page ${u}`);

// sitemap: every URL resolves; every insight is present
const sm = readFileSync('sitemap.xml', 'utf8');
const smUrls = [...sm.matchAll(/<loc>https:\/\/stqcap\.com\/?([^<]*)<\/loc>/g)].map(m => m[1]);
for (const p of smUrls) if (p && !existsSync(p)) problems.push(`sitemap lists missing page /${p}`);
for (const f of pages) {
  if (f.startsWith('insights/insight-') && !smUrls.includes(f)) problems.push(`sitemap missing ${f}`);
}

// AI surface files
for (const f of ['llms.txt', 'llms-full.txt', 'robots.txt']) {
  if (!existsSync(f)) problems.push(`missing ${f}`);
}
if (!readFileSync('robots.txt', 'utf8').includes('GPTBot')) problems.push('robots.txt lost AI crawler allows');

if (problems.length) {
  console.error(`AUDIT FAILED: ${problems.length} problem(s)\n` + problems.map(p => ' - ' + p).join('\n'));
  process.exit(1);
}
console.log(`Audit clean: ${pages.length} pages, ${arr.length} insights, ${smUrls.length} sitemap URLs.`);
