// Auto-updates the box-spread benchmark rates on box-spreads.html from the
// official U.S. Treasury daily par yield curve (free, no API key).
// Run by .github/workflows/update-box-rates.yml on a schedule.
//
// It rewrites only the block between the BOX_RATES_START / BOX_RATES_END
// markers in box-spreads.html. Nothing else is touched.

import { readFileSync, writeFileSync } from 'node:fs';

const PAGE = new URL('../box-spreads.html', import.meta.url);

function feedUrl(yyyymm) {
  return `https://home.treasury.gov/resource-center/data-chart-center/interest-rates/pages/xml?data=daily_treasury_yield_curve&field_tdr_date_value_month=${yyyymm}`;
}

function ym(d) {
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'stqcap-rate-updater' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

function field(entry, name) {
  const m = entry.match(new RegExp(`<d:${name}[^>]*>([^<]*)</d:${name}>`));
  if (!m || m[1].trim() === '') return null;
  const v = parseFloat(m[1]);
  return Number.isFinite(v) ? v : null;
}

// Returns the most recent entry (with a usable 1Y yield) from a month's feed.
function latestEntry(xml) {
  const entries = xml.split('<entry>').slice(1);
  let best = null;
  for (const e of entries) {
    const dm = e.match(/<d:NEW_DATE[^>]*>([^<]+)</);
    if (!dm) continue;
    const date = new Date(dm[1]);
    if (field(e, 'BC_1YEAR') == null) continue;
    if (!best || date > best.date) best = { date, raw: e };
  }
  return best;
}

async function getCurve() {
  const now = new Date();
  const months = [ym(now)];
  const prev = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  months.push(ym(prev));

  let entry = null;
  for (const mth of months) {
    try {
      const xml = await fetchText(feedUrl(mth));
      const e = latestEntry(xml);
      if (e && (!entry || e.date > entry.date)) entry = e;
      if (entry) break; // current month had data; good enough
    } catch (err) {
      console.error(`warn: ${err.message}`);
    }
  }
  if (!entry) throw new Error('No Treasury data found in current or previous month.');

  const r = entry.raw;
  const pct = (n) => (n == null ? null : +(n / 100).toFixed(4)); // percent -> decimal, 4dp
  const y1 = pct(field(r, 'BC_1YEAR'));
  const y2 = pct(field(r, 'BC_2YEAR'));
  const y3 = pct(field(r, 'BC_3YEAR'));
  const y5 = pct(field(r, 'BC_5YEAR'));
  const y7 = pct(field(r, 'BC_7YEAR'));
  const y10 = pct(field(r, 'BC_10YEAR'));
  const y20 = pct(field(r, 'BC_20YEAR'));
  const y30 = pct(field(r, 'BC_30YEAR'));
  // 4Y is not published; interpolate linearly between 3Y and 5Y.
  const y4 = y3 != null && y5 != null ? +((y3 + y5) / 2).toFixed(4) : null;

  if ([y1, y2, y3, y5].some((v) => v == null)) {
    throw new Error('Treasury feed missing a required tenor (1/2/3/5Y).');
  }

  const asOf = entry.date.toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
  });

  return { y1, y2, y3, y4, y5, y7, y10, y20, y30, asOf };
}

function buildBlock(c) {
  const rates = { 1: c.y1, 2: c.y2, 3: c.y3, 4: c.y4 ?? +((c.y3 + c.y5) / 2).toFixed(4), 5: c.y5 };
  const ratesStr = `{${Object.entries(rates).map(([k, v]) => `${k}:${v}`).join(',')}}`;
  const curve = [
    ['1 Year', c.y1], ['2 Year', c.y2], ['3 Year', c.y3], ['5 Year', c.y5],
    ['7 Year', c.y7], ['10 Year', c.y10], ['20 Year', c.y20], ['30 Year', c.y30],
  ].filter(([, v]) => v != null);
  const curveStr = '[' + curve.map(([l, v]) => `{label:'${l}',rate:${v}}`).join(',') + ']';
  return [
    '/* BOX_RATES_START — auto-updated daily by scripts/update-box-rates.mjs (U.S. Treasury par yield curve) */',
    `var STQ_RATES=${ratesStr};`,
    `var STQ_AS_OF='${c.asOf}';`,
    `var STQ_CURVE=${curveStr};`,
    '/* BOX_RATES_END */',
  ].join('\n');
}

const curve = await getCurve();
const html = readFileSync(PAGE, 'utf8');
const re = /\/\* BOX_RATES_START[\s\S]*?BOX_RATES_END \*\//;
if (!re.test(html)) throw new Error('BOX_RATES markers not found in box-spreads.html');
const updated = html.replace(re, buildBlock(curve));

if (updated === html) {
  console.log('No change in rates.');
} else {
  writeFileSync(PAGE, updated);
  console.log(`Updated to Treasury curve as of ${curve.asOf}: 1Y ${(curve.y1 * 100).toFixed(2)}%, 3Y ${(curve.y3 * 100).toFixed(2)}%, 5Y ${(curve.y5 * 100).toFixed(2)}%`);
}
