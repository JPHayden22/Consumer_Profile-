# Delivery status

Implemented nine navigation sections; local CSV/JSON imports; D3 force graph with weighted category/domain/known-brand/search-title/catalog-product edges and weighted label-propagation communities, zoom/pan/drag/search and evidence inspection; weekday/hour heatmap, radial daily timeline, 91-day activity calendar and two-window category-share comparison; transparent behavioral ratios and overlapping category segments; real imported product catalog matching; corrective feedback; individual/source/all deletion; light/dark mode and responsive CSS.

Automated verification: 13 tests passed; TypeScript and production Vite build passed. Empty dashboard, consent gating, responsive sidebar navigation, privacy navigation, and empty-session reset verified in local browser. Real extension installation, actual history permission flow, loaded-data visual/performance QA and mobile browser QA remain unverified. No personal records accessed or analyzed (0). Extension is packaged, unpublished and not installed. No external AI calls.

Limitations: keyword-based inference, known-brand domains only; no general brand/product identity resolution, no reliable cross-retailer same-product comparison, no automatic retailer scraping or product capture, no live price verification, no ZIP/HTML import, no universal retailer order-schema parsing. No independent validation of behavioral measures. See README for supported schemas and methods.

Minimum student steps: load unpacked extension and approve history in its popup, reload dashboard, consent/select period/analyze; alternatively select a voluntary CSV/JSON export. Chrome Web Store submission requires an owner account, support contact, declarations, and external review.
