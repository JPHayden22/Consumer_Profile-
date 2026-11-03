# Orbit — Personal Consumer Intelligence Laboratory

React + TypeScript + Vite + D3. Private local processing, no external AI provider, no telemetry, no default persistent storage. The application starts empty. No personal data is included in this repository.

## Run

Node 22+: `npm install`, `npm test`, `npm run dev`. Open the printed URL with `/Consumer_Profile-/` appended. `npm run build` generates static `dist/`. GitHub Pages base is `/Consumer_Profile-/`.

## Chrome connection (unpublished)

1. Open the dashboard in Chrome. Download its extension ZIP, unzip, visit `chrome://extensions`, enable Developer mode, Load unpacked, select the extension directory.
2. Open the extension popup and explicitly approve optional history permission. Reload the dashboard.
3. Connect data → consent → period → Analyze approved history.

No Chrome Web Store listing exists. Do not invent one. Installation testing and publication require the owner’s explicit action and Chrome Web Store review. The extension can communicate only on the configured Pages origin/path or the two exact loopback origins on port 5173. The background worker rejects other ports even though Chrome content-script match patterns cannot restrict ports.

## Supported imports

Unzip exports yourself; choose CSV/JSON files voluntarily. Chrome/Takeout Browser History, Google activity arrays with titleUrl, ChatGPT conversations.json (user messages only), generic browsing and order records: url,title,time/timestamp/date/kind. CSV supports quoted fields. No standalone HTML or ZIP import. Shopping exports need normalization to the documented fields if their retailer format differs. Dates absent from imports are not invented. Imported Chrome summaries represent URLs; extension uses getVisits for individual visits. Duplicate identical URL/title/time keys are ignored across imports.

Product catalog: name,url,category; optional price,currency,verifiedAt. Prices are imported observations, not live independently verified prices. No scraping or product capture permission. Retailer links open safely for manual discovery. Recommendations require three category evidence records and a matching catalog category. No fabricated names, images, stock, ratings or prices.

## Methods and limitations

Categories are transparent keyword rules on sanitized URLs and titles. Domains and category evidence create graph nodes, record overlap weights edges, radius scales with square root of evidence. Choose rule-based category colors or deterministic weighted label-propagation community detection, capped at 20 iterations. Detected communities describe network structure, never validated consumer identities. Force layout supports zoom/pan/drag/search and evidence inspection, with display caps for performance. Sensitive-topic rules exclude matches from category scoring, but a keyword filter cannot identify every sensitive topic; the engine never creates sensitive-attribute categories.

Research/price/repeat indicators are ratios, not validated personality tests. Min five eligible records, no false certainty. Unscored traits show insufficient data. Segment memberships overlap. Feedback removes inaccurate interests from recommendations while retaining observed evidence. Date/hour visuals use local timezone. No claim of product-level identity resolution, causal inference, brand identity detection, or reliable cross-site same-product price comparison. Graph includes evidence-backed known-brand domains, recognized Google/Bing search-result titles and imported catalog products. Two 30-day windows show category-share changes, anchored to the latest imported timestamp; partial coverage is disclosed. A 91-day interactive calendar complements heatmaps and radial activity. Product-level identity resolution and category-flow causality are not claimed.

Conversation imports omit assistant text and common explicit quotes (blockquotes, paired quotation marks). Unmarked quotes, copied content and prompt injection are not reliably attributable; inspect evidence. Statements are treated as text evidence, never executed. Raw files are not saved. Refresh deletes session records and feedback. Removing dashboard records never deletes actual Chrome history.

## Deployment

Workflow runs tests, TypeScript and Vite, then deploys `dist` through GitHub Actions Pages. Repository Settings → Pages → Source must be GitHub Actions. Public assets include only code, extension ZIP, and privacy documentation. Never add exports, profiles, screenshots containing personal records or browser data to Git.

## Verification

Thirteen automated tests cover parsing, user-only attribution, quote exclusion, sensitive-topic rules, feedback, recommendation thresholds, no-data behavior, extension optional permissions, sender allowlist, selected visit range, sanitization and revoke. These are mocked extension tests; they do not certify real Chrome installation or Chrome Web Store acceptance. See HANDOFF.md for actual run results.
