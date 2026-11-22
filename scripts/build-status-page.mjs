// Writes seo-status.html (noindex, n8n-style live dashboard) and appends to
// seo-status.json. Run by the daily workflow after the audit.
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
const okDot = ok ? 'ok' : 'bad';
const lastRun = latest.at.replace('T', ' ').slice(0, 16) + ' UTC';

// --- n8n canvas ---
const NW = 196, NH = 80;
const NODES = [
  { id:'cron1', x:40,  y:70,  icon:'&#9200;',  title:'Daily Trigger',        sub:'Mon-Fri · 6:17pm ET',                    accent:'#8a6d3b', dot:'ok' },
  { id:'tsy',   x:320, y:70,  icon:'&#127963;&#65039;', title:'U.S. Treasury Feed', sub:'Par yield curve',                accent:'#1B2E4B', dot:'ok' },
  { id:'rates', x:600, y:70,  icon:'&#128200;', title:'Update Live Rates',   sub:`as of ${latest.ratesAsOf}`,              accent:'#1B2E4B', dot:'ok' },
  { id:'cron2', x:40,  y:270, icon:'&#9200;',  title:'Daily Trigger',        sub:'Mon-Fri · 6:47am PT',                    accent:'#8a6d3b', dot:'ok' },
  { id:'audit', x:320, y:270, icon:'&#128269;', title:'SEO / AI Audit',      sub:`${latest.pages} pages · ${latest.insights} insights`, accent:'#1B2E4B', dot: okDot },
  { id:'llms',  x:600, y:270, icon:'&#129504;', title:'Rebuild llms-full.txt', sub:`${Math.round(latest.llmsFull/1000)}k chars of live text`, accent:'#1B2E4B', dot:'ok' },
  { id:'alert', x:600, y:400, icon:'&#128231;', title:'Alert Akiva',         sub: ok ? 'Idle · only on failure' : 'TRIGGERED', accent:'#8a3b3b', dot: ok ? 'idle' : 'bad' },
  { id:'deploy',x:880, y:170, icon:'&#128640;', title:'Deploy',              sub:'Commit → Netlify · ~60s',                accent:'#1B2E4B', dot:'ok' },
  { id:'ping',  x:1150,y:170, icon:'&#128225;', title:'IndexNow Ping',       sub:'Google · Bing · engines',                accent:'#1B2E4B', dot:'ok' },
  { id:'serp',  x:1430,y:70,  icon:'&#128270;', title:'Search Results',      sub:`${latest.sitemapUrls} URLs in sitemap`,  accent:'#3b6d4f', dot:'ok' },
  { id:'bots',  x:1430,y:270, icon:'&#129302;', title:'AI Crawlers Ingest',  sub:'GPTBot · ClaudeBot · Perplexity',        accent:'#3b6d4f', dot:'ok' },
];
const EDGES = [
  ['cron1','tsy'], ['tsy','rates'], ['rates','deploy'],
  ['cron2','audit'], ['audit','llms'], ['audit','alert'],
  ['llms','deploy'], ['deploy','ping'], ['ping','serp'], ['ping','bots'],
];
const byId = Object.fromEntries(NODES.map(n => [n.id, n]));
const CW = 1670, CH = 510;
const paths = EDGES.map(([a, b]) => {
  const x1 = byId[a].x + NW, y1 = byId[a].y + NH / 2;
  const x2 = byId[b].x, y2 = byId[b].y + NH / 2;
  const mx = (x1 + x2) / 2;
  return `<path d="M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}" class="edge"/><circle cx="${x2}" cy="${y2}" r="4" class="edot"/>`;
}).join('');
const nodeHtml = NODES.map(n => `
  <div class="node" style="left:${n.x}px;top:${n.y}px;border-top:3px solid ${n.accent};">
    <span class="status ${n.dot}"></span>
    <div class="nicon">${n.icon}</div>
    <div><div class="ntitle">${n.title}</div><div class="nsub">${n.sub}</div></div>
  </div>`).join('');

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
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@600;700&family=DM+Sans:opsz,wght@9..40,500;9..40,700&display=swap" rel="stylesheet">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:'DM Sans',-apple-system,sans-serif; background:#F0EFEB; color:#1B2E4B; padding:36px clamp(16px,3vw,48px) 80px; }
h1 { font-family:'Chakra Petch',sans-serif; font-size:1.55rem; }
.sub { color:#5a6a7e; font-size:0.88rem; margin:4px 0 10px; }
.runline { font-size:0.82rem; color:#5a6a7e; margin-bottom:20px; }
.pill { font-family:'Chakra Petch',sans-serif; font-size:0.68rem; font-weight:700; padding:3px 10px; border-radius:4px; letter-spacing:0.08em; }
.pill.ok { background:#e2efe6; color:#2c5a3f; } .pill.bad { background:#f3e0e0; color:#8a3b3b; }
.canvas-wrap { overflow-x:auto; border:1px solid rgba(27,46,75,0.12); border-radius:10px; background:#fff; margin-bottom:34px; }
.canvas { position:relative; width:${CW}px; height:${CH}px;
  background-image: radial-gradient(rgba(27,46,75,0.10) 1.2px, transparent 1.2px); background-size:22px 22px; }
svg.wires { position:absolute; inset:0; }
.edge { fill:none; stroke:rgba(27,46,75,0.35); stroke-width:2; }
.edot { fill:#1B2E4B; }
.node { position:absolute; width:${NW}px; height:${NH}px; background:#fff; border:1px solid rgba(27,46,75,0.15); border-radius:10px; box-shadow:0 4px 14px rgba(27,46,75,0.10); display:flex; align-items:center; gap:10px; padding:0 14px; }
.nicon { font-size:21px; flex:none; }
.ntitle { font-family:'Chakra Petch',sans-serif; font-weight:700; font-size:13px; }
.nsub { font-size:10.5px; color:#5a6a7e; margin-top:2px; font-weight:500; }
.status { position:absolute; top:8px; right:9px; width:9px; height:9px; border-radius:50%; }
.status.ok { background:#3b6d4f; box-shadow:0 0 0 3px rgba(59,109,79,0.18); }
.status.bad { background:#a33b3b; box-shadow:0 0 0 3px rgba(163,59,59,0.2); }
.status.idle { background:#c3c9d2; }
h2 { font-family:'Chakra Petch',sans-serif; font-size:0.95rem; margin-bottom:12px; }
table { border-collapse:collapse; width:100%; background:#fff; border:1px solid rgba(27,46,75,0.12); border-radius:8px; overflow:hidden; font-size:0.82rem; }
th { background:#1B2E4B; color:#F0EFEB; text-align:left; padding:10px 14px; font-family:'Chakra Petch',sans-serif; font-size:0.7rem; letter-spacing:0.06em; }
td { padding:9px 14px; border-top:1px solid rgba(27,46,75,0.07); color:#2a3a4a; }
.sum { color:#5a6a7e; font-size:0.76rem; }
.twrap { overflow-x:auto; }
a { color:#1B2E4B; }
</style>
</head>
<body>
<h1>Daily Optimization Run</h1>
<div class="sub">Automated SEO and AI-surface maintenance for stqcap.com · the run updates this page itself · <a href="https://github.com/akivaglazersonstq/stqcap.com/actions" target="_blank">raw logs</a></div>
<div class="runline">Last run: ${lastRun} · <span class="pill ${ok ? 'ok' : 'bad'}">${ok ? 'PASS' : 'FAIL'}</span> ${latest.summary ? '· ' + latest.summary.replace(/</g, '&lt;') : ''}</div>
<div class="canvas-wrap"><div class="canvas">
  <svg class="wires" width="${CW}" height="${CH}">${paths}</svg>
  ${nodeHtml}
</div></div>
<h2>Run history</h2>
<div class="twrap"><table>
<tr><th>Run (UTC)</th><th>Result</th><th>Pages</th><th>Insights</th><th>Sitemap</th><th>llms-full</th><th>Rates as of</th><th>Source</th><th>Notes</th></tr>
${rows}
</table></div>
</body>
</html>`;

writeFileSync('seo-status.html', html);
console.log(`status page written: ${latest.result}, ${latest.pages} pages`);
