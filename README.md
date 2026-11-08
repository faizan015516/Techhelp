# Printer Resolve

Independent, free printer, Wi-Fi and Windows troubleshooting resources. Source for [printerresolve.com](https://printerresolve.com/).

## Site layout
- Static HTML/CSS/JavaScript. Homepage: `index.html`; complete library: `guides.html`.
- Existing articles retain their public `/<slug>` URLs.
- Shared styles: `premium.css`, `trust.css`; homepage 3D animation: `assets/experience.css` and `assets/experience.js`.
- Privacy-preserving article notes: `assets/guide-tools.js`; only works locally in the browser.
- Original tools: `printer-problem-checker.html`, `tools/connection-path.html`, `tools/page-fit.html`.
- Editorial and policy pages: `about.html`, `disclaimer.html`, `privacy.html`, `terms.html`.

## Editorial standards
See [QUALITY-REBUILD.md](QUALITY-REBUILD.md). A guide should define a clear symptom, show the safest useful test, explain what different results mean, and avoid claiming unperformed hands-on tests. Cite original product documentation for specific procedures.

## Test and release
Run `node --test tests/site-integrity.test.cjs` (after the test file is committed). Preview locally and via Cloudflare Pages, testing desktop/mobile layout, keyboard navigation, reduced-motion preferences and interactive calculations. Merge the reviewed draft PR only when checks pass. Content and design improvements do **not** guarantee AdSense approval.
