# STQ Capital Website — Project Context

This file orients you (Claude Code) to the stqcap.com website project. Read it before making changes.

## What this is
The public marketing site for STQ Capital, a California RIA. Static HTML/CSS/JS — no build framework, no bundler. Each page is a self-contained `.html` file with inline `<style>` and `<script>`.

## Hosting & deploy
- **GitHub repo:** `akivaglazersonstq/stqcap.com` (public), production branch `main`.
- **Host:** Netlify project `peppy-semolina-3f0808`, serving `https://stqcap.com`.
- **Deploy:** automatic. Any push to `main` rebuilds and publishes the live site within ~1 minute.
- **`netlify.toml`:** publishes the repo root (`publish = "."`), `pretty_urls = false`, post-processing skipped. Don't change without reason.

## Repo structure
Top-level pages: `index.html` (home), `box-spreads.html`, `asset-location.html`, `research.html`, `research-direct-indexing.html`, `insights.html` (insights listing), `get-started.html`, `contact.html`, `stq-consulting.html`, `privacy.html`.
Templates (prefixed `_`, not linked publicly): `_article-template.html`, `_email-template.html`, `_research-template.html`.
`insights/` — ~40 individual insight article pages (`insight-*.html`).
Assets: favicons, `*.png` images, `robots.txt`, `sitemap.xml`, `CNAME` (stqcap.com).

## Workflow: preview before prod
Default for anything non-trivial:
1. Create a branch, make the edit.
2. Open a PR against `main`.
3. Netlify auto-builds a deploy preview at `https://deploy-preview-<PR#>--peppy-semolina-3f0808.netlify.app` — review the change live, off the real domain.
4. On approval, merge to `main`. Live site updates automatically. Delete the branch.

For trivial fixes (typos), pushing straight to `main` is fine if the user says so. Always confirm before merging/pushing anything that goes live.

Note: in the Claude Code on the web environment, direct `git push` is read-only for this repo (the git relay returns 403 on push). GitHub writes go through the GitHub integration (API), which also produces verified commits. Pull requests are opened the same way.

## Local preview
Static site — serve the folder and open in a browser, e.g. `python -m http.server 8000` (or `netlify dev` if Netlify CLI is installed) before committing.

## Brand & voice (apply to all content)
- **Palette:** navy `#1B2E4B`, cream `#F0EFEB`. No new colors.
- **Fonts:** Chakra Petch (headings), DM Sans (body). No new fonts.
- **Voice:** punchy, dry, minimal, institutional. First person for Akiva's published content.
- **Hard rules:** no em dashes. No hedging, no filler, no AI scaffolding. After-tax framing is the default. Contrast STQ against "most advisors" without naming competitors.
- **Compliance:** RIA — disclaim where appropriate, don't over-lawyer copy. Marketing pages intentionally hedge tax claims (e.g. box spread interest is "potentially tax-deductible").

## Content pipeline
Each new topic produces three assets: (1) an HTML insight page in `insights/` plus a listing entry in `insights.html`, (2) a MailerLite HTML email (tease, don't reveal — hook + 2-3 lines driving to the full article), (3) a LinkedIn post (short, opinionated). Sitemap should be updated when adding pages.

## Conventions
- Contact email is `akiva.glazerson@stqcap.com` sitewide, EXCEPT:
  - `contact.html` — uses `info@stqcap.com` (changed June 2026).
  - `index.html` home-page footer contact block — uses `info@stqcap.com` (changed June 2026).
  All other contact points (CTA buttons across pages, every `insights/insight-*.html` article, and the `_`-prefixed templates) remain `akiva.glazerson@stqcap.com`.
- New insight pages should follow the structure of an existing `insights/insight-*.html` file (copy one as a starting point).

## Session history
- **June 2026:** Changed the contact page email (`contact.html`) from `akiva.glazerson@stqcap.com` to `info@stqcap.com` — merged to `main`, live.
- **June 2026:** Changed the home-page (`index.html`) footer contact email to `info@stqcap.com` (one-off; sitewide CTAs/articles/templates intentionally left on `akiva.glazerson@stqcap.com`).

## Note
This project was previously managed via Claude in Cowork mode (sandbox + browser-driven PRs). It's now managed via Claude Code on the web (direct local edits; GitHub writes via the GitHub integration). A fine-grained GitHub token named `STQ Cowork` may still exist — it can be revoked once Claude Code is using its own credentials.
