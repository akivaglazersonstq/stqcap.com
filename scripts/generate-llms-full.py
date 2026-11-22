#!/usr/bin/env python3
# Regenerates llms-full.txt (full text of pillar guides and key articles for
# AI ingestion) from the live page sources. Run daily by
# .github/workflows/daily-seo-audit.yml so AI crawlers always get current text,
# including the daily-updated box spread rate benchmarks.

import re, html as H

PAGES = [
    ('tax-aware-investing-guide.html', 'Tax-Aware Investing: The Complete Guide'),
    ('tax-loss-harvesting.html', 'Tax-Loss Harvesting: Building a Loss Bank'),
    ('long-short-tax-loss-harvesting.html', 'Long/Short Tax-Loss Harvesting'),
    ('what-is-a-box-spread.html', 'What Is a Box Spread?'),
    ('box-spread-borrowing-guide.html', 'Box Spread Borrowing: The Complete Guide'),
    ('box-spreads.html', 'Box Spread Financing'),
    ('box-spread-rates.html', 'Box Spread Rates Today'),
    ('insights/insight-box-spread-vs-sbloc.html', 'Box Spread vs SBLOC'),
    ('insights/insight-box-spread-overlooked-features.html', 'The Two Box Spread Features Almost Everyone Overlooks'),
    ('how-direct-indexing-works.html', 'How Direct Indexing Works'),
    ('concentrated-stock-positions.html', 'What to Do With a Concentrated Stock Position'),
    ('asset-location.html', 'Asset Location'),
]

SUMMARY = ("> Complete text of STQ Capital's pillar guides and key articles on tax-aware investing and box "
           "spread financing. STQ Capital is an independent registered investment adviser (RIA) registered in "
           "California and New York, pairing institutional-grade quantitative methods with private-client "
           "service for a select group of high-income and high-net-worth investors. Contact: info@stqcap.com. "
           "Schedule: https://calendly.com/stqcapital/30min")


def clean(t):
    t = re.sub(r'<[^>]+>', ' ', t)
    t = H.unescape(t)
    return re.sub(r'\s+', ' ', t).strip()


out = ["# STQ Capital: Full Guide Text", "", SUMMARY, ""]
for f, name in PAGES:
    s = open(f, encoding='utf-8', errors='ignore').read()
    s = re.sub(r'<script[\s\S]*?</script>', '', s)
    s = re.sub(r'<style[\s\S]*?</style>', '', s)
    s = re.sub(r'<nav[\s\S]*?</nav>', '', s)
    s = re.sub(r'<footer[\s\S]*?</footer>', '', s)
    s = re.sub(r'<div class="mobile-nav">[\s\S]*?</div>\n', '', s)
    out.append(f"## {name}")
    out.append(f"Source: https://stqcap.com/{f}")
    out.append("")
    for m in re.finditer(r'<(h1|h2|h3|h4|p|li)[^>]*>([\s\S]*?)</\1>', s):
        tag, body = m.group(1), clean(m.group(2))
        if not body or len(body) < 3:
            continue
        out.append(f"### {body}" if tag.startswith('h') else body)
        out.append("")
    out.append("")

text = "\n".join(out).replace('—', ', ').replace('–', '-')
open('llms-full.txt', 'w').write(text)
print(f"llms-full.txt regenerated: {len(text)} chars")
