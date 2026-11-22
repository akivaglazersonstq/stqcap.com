// Writes seo-status.html (noindex dashboard) and appends to seo-status.json.
// Run by the daily workflow after the audit; also runnable manually.
// Env: AUDIT_RESULT=pass|fail, AUDIT_SUMMARY=<one line>, RUN_SOURCE=schedule|manual

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';

const result = process.env.AUDIT_RESULT || 'pass';
const summary = process.env.AUDIT_SUMMARY || '';
const source = process.env.RUN_SOURCE || 'manual';

const pages = readdirSync('.').filter(f => f.endsWith('.html') && !f.startsWith('_')).length
  + readdirSync('insights').filter(f => f.endsWith('.html')).length;
const insights = [...readFileSync('insights.html', 'utf8').matchAll(/url: "([^"]+)"/g)].length;
const sitemapUrls = [...readFileSync('sitemap.xml', 'utf8').matchAll(/<loc>/g)].length;
const llmsFull = existsSync('llms-full.txt') ? readFileSync('llms-full.txt', 'utf8').length : 0;
const ratesAsOf = (readFileSync('box-spread-rates.html', 'utf8').match(/Benchmark curve as of ([^<]+)</) || [, 'unknown'])[1];

const history = existsSync('seo-status.json') ? JSON.parse(readFileSync('seo-status.json', 'utf8')) : [];
history.unshift({ at: new Date().toISOString(), result, source, pages, insights, sitemapUrls, llmsFull, ratesAsOf, summary });
while (history.length > 60) history.pop();
writeFileSync('seo-status.json', JSON.stringify(history, null, 1));

const latest = history[0];
const ok = latest.result === 'pass';
const rows = history.map(h => `<tr>
  <td>${h.at.replace('T', ' ').slice(0, 16)} UTC</td>
  <td><span class="pill ${h.result === 'pass' ? 'ok' : 'bad'}">${h.result === 'pass' ? 'PASS' : 'FAIL'}</span></td>
  <td>${h.pages}</td><td>${h.insights}</td><td>${h.sitemapUrls}</td>
  <td>${Math.round(h.llmsFull / 1000)}k</td><td>${h.ratesAsOf}</td>
  <td>${h.source}</td><td class="sum">${(h.summary || '').replace(/</g, '&lt;').slice(0, 120)}</td>
</tr>`).join('\n');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex">
<title>Daily Optimization Run | STQ Capital</title>
<link rel="icon" href="/favicon.svg?v=3" type="image/svg+xml">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:'DM Sans',-apple-system,sans-serif; background:#F0EFEB; color:#1B2E4B; padding:40px clamp(16px,4vw,60px) 80px; }
h1 { font-family:'Chakra Petch',sans-serif; font-size:1.6rem; margin-bottom:4px; }
.sub { color:#5a6a7e; font-size:0.9rem; margin-bottom:28px; }
.cards { display:grid; grid-template-columns:repeat(auto-fit,minmax(170px,1fr)); gap:14px; margin-bottom:32px; max-width:1200px; }
.card { background:#fff; border:1px solid rgba(27,46,75,0.12); border-radius:8px; padding:18px 20px; }
.card .k { font-size:0.65rem; text-transform:uppercase; letter-spacing:0.12em; color:#5a6a7e; font-weight:700; }
.card .v { font-family:'Chakra Petch',sans-serif; font-size:1.5rem; font-weight:700; margin-top:6px; }
.pill { font-family:'Chakra Petch',sans-serif; font-size:0.7rem; font-weight:700; padding:3px 10px; border-radius:4px; letter-spacing:0.08em; }
.pill.ok { background:#e2efe6; color:#2c5a3f; } .pill.bad { background:#f3e0e0; color:#8a3b3b; }
.what { background:#fff; border:1px solid rgba(27,46,75,0.12); border-radius:8px; padding:22px 24px; margin-bottom:32px; max-width:1200px; font-size:0.9rem; line-height:1.8; color:#2a3a4a; }
.what b { font-family:'Chakra Petch',sans-serif; font-size:0.8rem; text-transform:uppercase; letter-spacing:0.1em; display:block; margin-bottom:8px; color:#1B2E4B; }
table { border-collapse:collapse; width:100%; max-width:1200px; background:#fff; border:1px solid rgba(27,46,75,0.12); border-radius:8px; overflow:hidden; font-size:0.82rem; }
th { background:#1B2E4B; color:#F0EFEB; text-align:left; padding:10px 14px; font-family:'Chakra Petch',sans-serif; font-size:0.72rem; letter-spacing:0.06em; }
td { padding:9px 14px; border-top:1px solid rgba(27,46,75,0.07); color:#2a3a4a; }
.sum { color:#5a6a7e; font-size:0.76rem; }
.wrap { overflow-x:auto; }
a { color:#1B2E4B; }
</style>
</head>
<body>
<h1>Daily Optimization Run</h1>
<div class="sub">Automated SEO and AI-surface maintenance for stqcap.com · updated by the run itself · <a href="https://github.com/akivaglazersonstq/stqcap.com/actions" target="_blank">raw logs on GitHub</a></div>
<div class="cards">
  <div class="card"><div class="k">Last run</div><div class="v"><span class="pill ${ok ? 'ok' : 'bad'}">${ok ? 'PASS' : 'FAIL'}</span></div></div>
  <div class="card"><div class="k">Pages audited</div><div class="v">${latest.pages}</div></div>
  <div class="card"><div class="k">Insights live</div><div class="v">${latest.insights}</div></div>
  <div class="card"><div class="k">Sitemap URLs</div><div class="v">${latest.sitemapUrls}</div></div>
  <div class="card"><div class="k">AI ingestion file</div><div class="v">${Math.round(latest.llmsFull / 1000)}k chars</div></div>
  <div class="card"><div class="k">Rates as of</div><div class="v" style="font-size:1rem;padding-top:8px;">${latest.ratesAsOf}</div></div>
</div>
<div class="what"><b>What each run does</b>
Every business morning: audits all pages for titles, meta descriptions, canonicals, social cards, structured data validity, broken links, and sitemap completeness · verifies the AI files (robots.txt crawler allows, llms.txt, llms-full.txt) · rebuilds llms-full.txt from live page text so AI crawlers ingest current content including the latest rate benchmarks · commits changes, which deploys the site and pings Google and Bing via IndexNow. Separately, every business evening the rate bot refreshes the box spread benchmarks from the U.S. Treasury curve. A FAIL emails Akiva automatically.</div>
<div class="wrap"><table>
<tr><th>Run (UTC)</th><th>Result</th><th>Pages</th><th>Insights</th><th>Sitemap</th><th>llms-full</th><th>Rates as of</th><th>Source</th><th>Notes</th></tr>
${rows}
</table></div>
</body>
</html>`;

writeFileSync('seo-status.html', html);
console.log(`status page written: ${latest.result}, ${latest.pages} pages`);
