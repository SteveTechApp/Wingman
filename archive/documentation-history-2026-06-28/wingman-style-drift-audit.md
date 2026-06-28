# Wingman Style Drift Audit

Generated: 2026-06-27T10:33:45.097Z

## Summary

| Metric | Count |
|---|---:|
| Hard-coded hex colours | 2127 |
| rgb/rgba colours | 2700 |
| Inline style attributes | 60 |
| Arbitrary Tailwind colours | 484 |
| Page-specific CSS sections | 2481 |
| Legacy info-pill/submode-chip occurrences | 4 |

## Top Files By Drift Count

| File | Total | Hex | rgb/rgba | Inline styles | Arbitrary Tailwind | Page CSS | Legacy pills |
|---|---:|---:|---:|---:|---:|---:|---:|
| `src/wingman2/styles/wingman-style-stack.css` | 6182 | 1390 | 2319 | 0 | 21 | 2448 | 4 |
| `src/wingman2/pages/ProjectDetailPage.tsx` | 208 | 104 | 0 | 0 | 104 | 0 | 0 |
| `src/wingman2/pages/CallCardsPage.tsx` | 181 | 59 | 122 | 0 | 0 | 0 | 0 |
| `src/wingman2/pages/FinderPage.tsx` | 173 | 90 | 0 | 0 | 83 | 0 | 0 |
| `src/wingman2/pages/ProposalPage.tsx` | 129 | 64 | 0 | 0 | 65 | 0 | 0 |
| `src/wingman2/pages/ProductCallCardsPage.tsx` | 126 | 39 | 87 | 0 | 0 | 0 | 0 |
| `src/wingman2/components/discovery/SourceDeviceCollator.css` | 110 | 20 | 90 | 0 | 0 | 0 | 0 |
| `src/wingman2/pages/ProjectsPage.tsx` | 86 | 43 | 0 | 0 | 43 | 0 | 0 |
| `src/styles/wingman-discovery-builder-layout.css` | 74 | 20 | 21 | 0 | 0 | 33 | 0 |
| `src/wingman2/components/compare/CompareCandidateShortlist.tsx` | 74 | 14 | 29 | 31 | 0 | 0 | 0 |
| `src/wingman2/pages/TemplateReviewPage.tsx` | 56 | 26 | 3 | 1 | 26 | 0 | 0 |
| `src/wingman2/pages/ProductPitchPage.tsx` | 51 | 25 | 0 | 0 | 26 | 0 | 0 |
| `src/wingman2/pages/ProductFamilyPage.tsx` | 42 | 21 | 0 | 0 | 21 | 0 | 0 |
| `src/wingman2/pages/IngestPage.tsx` | 40 | 20 | 0 | 0 | 20 | 0 | 0 |
| `src/wingman2/lib/productCheatSheet.ts` | 34 | 33 | 1 | 0 | 0 | 0 | 0 |

## Counting Rules

- Scans source files under `src/` with CSS, HTML, JavaScript or TypeScript extensions.
- Counts every literal 3-8 digit hex colour and every `rgb()` or `rgba()` function.
- Counts JSX/HTML `style=` attributes and Tailwind colour utilities using bracket notation.
- Counts CSS rule blocks whose selector contains a Wingman page, route or named workflow hook.
- Counts literal `info-pill` and `submode-chip` legacy class references.

This is a trend audit, not a build gate. Re-run it after each visual migration pass.
