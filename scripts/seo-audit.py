#!/usr/bin/env python3
"""SEO audit for stqcap.com. Usage: python3 scripts/seo-audit.py
Checks every public page: title/description length, canonical, one H1, lang,
Open Graph tags, valid JSON-LD, image alt text, broken internal links and images.
Pages marked noindex and _templates are skipped. No output under a page = clean."""
import os,re,json,sys,collections
from html.parser import HTMLParser
root=sys.argv[1] if len(sys.argv)>1 else os.path.join(os.path.dirname(os.path.abspath(__file__)),'..')
pages=[]
for d,_,fs in os.walk(root):
    if '.git' in d: continue
    for f in fs:
        if f.endswith('.html'): pages.append(os.path.relpath(os.path.join(d,f),root))
class P(HTMLParser):
    def __init__(s):
        super().__init__(); s.links=[]; s.imgs=[]; s.h1=0; s.title=''; s.intitle=False; s.meta={}; s.canon=None; s.ld=[]; s.inld=False; s.buf=''; s.lang=None; s.done_title=False
    def handle_starttag(s,t,a):
        a=dict(a)
        if t=='html': s.lang=a.get('lang')
        if t=='a' and a.get('href'): s.links.append(a['href'])
        if t=='img': s.imgs.append(a)
        if t=='h1': s.h1+=1
        if t=='title': s.intitle=True
        if t=='meta':
            k=a.get('name') or a.get('property')
            if k: s.meta[k]=a.get('content','')
        if t=='link' and a.get('rel')=='canonical': s.canon=a.get('href')
        if t=='script' and a.get('type')=='application/ld+json': s.inld=True; s.buf=''
    def handle_endtag(s,t):
        if t=='title': s.intitle=False; s.done_title=bool(s.title)
        if t=='script' and s.inld: s.ld.append(s.buf); s.inld=False
    def handle_data(s,d):
        if s.intitle and not s.done_title: s.title+=d
        if s.inld: s.buf+=d
issues=collections.defaultdict(list); titles=collections.defaultdict(list); descs=collections.defaultdict(list)
for p in sorted(pages):
    if os.path.basename(p).startswith('_'): continue
    html=open(os.path.join(root,p),encoding='utf-8',errors='replace').read()
    if re.search(r'<meta name="robots" content="[^"]*noindex',html): continue
    x=P(); x.feed(html)
    t=x.title.strip(); titles[t].append(p)
    d=x.meta.get('description','')
    descs[d].append(p)
    if not t: issues[p].append('no title')
    elif len(t)>65: issues[p].append(f'title {len(t)}ch')
    if not d: issues[p].append('no description')
    elif len(d)>165 or len(d)<70: issues[p].append(f'desc {len(d)}ch')
    if not x.canon: issues[p].append('no canonical')
    else:
        exp='https://stqcap.com/'+('' if p=='index.html' else p)
        if x.canon.rstrip('/')!=exp.rstrip('/'): issues[p].append(f'canonical={x.canon}')
    if x.h1!=1: issues[p].append(f'h1 count {x.h1}')
    if not x.lang: issues[p].append('no lang')
    for k in ['og:title','og:description','og:image','twitter:card']:
        if k not in x.meta: issues[p].append(f'no {k}')
    if 'og:image' in x.meta:
        img=x.meta['og:image'].replace('https://stqcap.com/','')
        if not img.startswith('http') and not os.path.exists(os.path.join(root,img)): issues[p].append(f'og:image missing {img}')
    if not x.ld: issues[p].append('no JSON-LD')
    for b in x.ld:
        try: json.loads(b)
        except Exception as e: issues[p].append(f'bad JSON-LD: {str(e)[:50]}')
    for i in x.imgs:
        if not i.get('alt') and i.get('alt')!='': issues[p].append(f"img no alt {i.get('src','')[:40]}")
        src=i.get('src','')
        if src and not src.startswith(('http','data:')):
            src0=src.split('?')[0]; fp=os.path.normpath(os.path.join(root,src0.lstrip('/')) if src0.startswith('/') else os.path.join(root,os.path.dirname(p),src0))
            if not os.path.exists(fp): issues[p].append(f'broken img {src}')
    for l in x.links:
        if l.startswith(('http','mailto:','tel:','#','javascript')):
            if 'stqcap.com/' in l and not l.startswith('https://stqcap.com/') and 'mailto' not in l: issues[p].append(f'odd abs link {l}')
            if l.startswith('https://stqcap.com/'):
                tgt=l.replace('https://stqcap.com/','').split('#')[0].split('?')[0] or 'index.html'
                if not os.path.exists(os.path.join(root,tgt)): issues[p].append(f'broken abs link {l}')
            continue
        tgt=l.split('#')[0].split('?')[0]
        if not tgt: continue
        fp=os.path.normpath(os.path.join(root, tgt.lstrip('/')) if tgt.startswith('/') else os.path.join(root,os.path.dirname(p),tgt))
        if os.path.isdir(fp): fp=os.path.join(fp,'index.html')
        if not os.path.exists(fp): issues[p].append(f'broken link {l}')
for p,i in issues.items(): print(p,'|','; '.join(i))
print('\n'+('No issues.' if not issues else f'{len(issues)} page(s) with issues.'))
print('\nDUP TITLES'); [print(k,v) for k,v in titles.items() if len(v)>1]
print('\nDUP DESCS'); [print(k[:60],v) for k,v in descs.items() if len(v)>1 and k]
