# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A static personal site (headgonebynoise.com) for Michael Sheppard — no framework, no build tool, no
package.json. Plain HTML/CSS/vanilla JS, hosted on GitHub Pages, deployed straight from `main`.

## Commands

There is no build/lint/test tooling. To preview locally:

```
python3 -m http.server 3456
```

(This matches the `site` config in `.claude/launch.json`, used by the `run` skill / Claude's browser preview.)

There are no automated tests. Verify changes by opening the page in a browser (or the preview tool) and
checking the console/network tab — especially for `comments.js` and `header.js`, which are shared across
every content page and fail silently (`catch (e) {}`) rather than throwing.

## Deploy model

- Every push to `main` auto-deploys via `.github/workflows/static.yml` (GitHub Pages). No PR/merge
  step required — pushing to `main` *is* the deploy.
- That workflow also cache-busts assets: it `sed`-replaces the literal string `BUILD_SHA` with the short
  commit SHA across all `.html` files before upload. Every `<script src>` / `<link>` in source therefore
  reads `?v=BUILD_SHA` literally — leave it as `BUILD_SHA`, don't hand-edit it to a real hash.
- A second workflow, `.github/workflows/bake-content.yml`, runs on a cron (every 2 hours) and on
  `workflow_dispatch`. It fetches each writing page's Google Doc via an Apps Script endpoint and writes the
  HTML into that page's `<!-- BAKED_START -->...<!-- BAKED_END -->` markers, then commits directly to
  `main` as `github-actions[bot]`. This means `main` can move without any local action — **check
  `git status -sb` / fetch before assuming local is current**, since these bot commits land independently
  of any device's work. The doc IDs and page list are hardcoded in that workflow file's Python script.
  Google Docs used here must have "Anyone with the link" sharing on, or `DocumentApp.openById()` in the
  Apps Script throws even for docs owned by the same account.

## Architecture

**Pages** (each a standalone `.html` file, no templating — shared structure is duplicated per file):
`index.html`, `writing.html` (index of writing pieces), `contact.html`, and six "live doc" pages —
`thinking.html`, `standup.html`, `catchphrase.html`, `calling.html`, `worst-thing.html`,
`unemployment-journal.html`.

**Shared includes**, loaded via `<script src="...">` on every page:
- `header.js` — injects the `<header>` content and the sidebar nav into `<header></header>` + the start of
  `<body>`. Also handles the hamburger sidebar open/close, shrinking the header on scroll, and (if the page
  declares `const PAGE_TITLE = '...'` before this script runs) rendering that as a second header row.
- `styles.css` — all styling for every page, single shared file.

**The live-doc pages share one pattern** (see `thinking.html` as the reference implementation):
1. Inline `<script>` block near the end of `<body>` declares three globals *before* loading `comments.js`:
   `PAGE_TITLE`, `PAGE_SLUG` (used as the Supabase `doc_id` key), and `DOC_ID` (the Google Doc ID).
2. `#live-content` holds baked fallback HTML inside `<!-- BAKED_START -->...<!-- BAKED_END -->` — this is
   what search engines and no-JS clients see, and what the bake workflow overwrites on its cron.
3. `comments.js` (shared, one copy for all of them) then does two independent jobs at runtime:
   - **Live doc sync**: polls the Apps Script endpoint every 60s, diffs against the last-seen HTML, and
     replaces `#live-content` in place when the doc changed. Status dot (`connecting` / `live` /
     `disconnected`) reflects fetch health.
   - **Inline comments**: Supabase-backed (`comments` table, keyed by `doc_id` = `PAGE_SLUG`). Users
     select text to comment on; the anchor is stored as raw `anchor_text` (no offsets), so on render each
     comment's anchor is matched via `indexOf` against the flattened text content — first occurrence only,
     and overlapping ranges are skipped rather than nested (nesting `<mark>` spans breaks the DOM). See the
     comments atop `applyCommentHighlights()` / `applyHighlight()` in `comments.js` before touching
     highlight logic — this area has had several correctness bugs (anchor drift, overlap, block-boundary
     spans).
   Both the Google Doc fetch and the Supabase calls are unauthenticated public endpoints; the Supabase key
   in `comments.js` is the publishable/anon key, not a secret.

Pages *not* in the live-doc set (`index.html`, `writing.html`, `contact.html`) are plain static HTML with
no `comments.js` dependency.

## Conventions

- No JS framework, no bundler — scripts are loaded directly as `<script src>` tags and rely on load order
  (e.g. `PAGE_SLUG`/`DOC_ID` must be declared before `comments.js` loads).
- SEO metadata (title/description/OG tags/canonical) is hand-duplicated in every page's `<head>` — update
  each page individually, there's no shared partial for it.
- `sitemap.xml` and `robots.txt` are hand-maintained; update `sitemap.xml` when adding or removing pages.
