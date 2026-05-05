# Wingman Style Drift Report

Generated: 2026-05-05T08:44:01.856Z

## Summary

- CSS files found: **43**
- TS/TSX CSS import statements found: **1**
- CSS @import statements found: **42**
- Active CSS files through import graph: **43**
- Inactive CSS files: **0**

## Highest-risk active CSS files

| Risk | Active | File | Lines | Size KB | !important | :root | Shell | Main | Sidebar | Topbar | Route | Light/Dark | Imported by |
|---:|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| 736 | yes | `src/wingman2/styles/wm-route-redesign.css` | 207 | 6.5 | 28 | 0 | 0 | 57 | 0 | 0 | 79 | 0 | src/wingman2/styles/wingman-style-stack.css -> ./wm-route-redesign.css |
| 716 | yes | `src/wingman2/styles/wm-av-workspace.css` | 819 | 21.6 | 313 | 1 | 1 | 9 | 4 | 12 | 0 | 0 | src/wingman2/styles/wingman-style-stack.css -> ./wm-av-workspace.css |
| 612 | yes | `src/wingman2/styles/wm-command-ui.css` | 992 | 24.2 | 269 | 1 | 5 | 1 | 2 | 16 | 0 | 0 | src/wingman2/styles/wingman-style-stack.css -> ./wm-command-ui.css |
| 601 | yes | `src/wingman2/styles/legacy-overrides/018-new-wingman-design-pass.css` | 626 | 16.7 | 265 | 1 | 3 | 2 | 6 | 9 | 0 | 2 | src/wingman2/styles/wingman-entry-legacy-overrides.css -> ./legacy-overrides/018-new-wingman-design-pass.css |
| 528 | yes | `src/wingman2/styles/wm-brand-reset.css` | 313 | 8.3 | 85 | 1 | 15 | 55 | 0 | 0 | 0 | 0 | src/wingman2/styles/wingman-style-stack.css -> ./wm-brand-reset.css |
| 488 | yes | `src/wingman2/styles/legacy-overrides/017-workflow-clarity-pass.css` | 447 | 10.7 | 223 | 0 | 0 | 0 | 0 | 3 | 0 | 9 | src/wingman2/styles/wingman-entry-legacy-overrides.css -> ./legacy-overrides/017-workflow-clarity-pass.css |
| 424 | yes | `src/wingman2/styles/legacy-overrides/021-product-finder-surface-hierarchy.css` | 157 | 8 | 41 | 0 | 25 | 0 | 0 | 2 | 41 | 2 | src/wingman2/styles/wingman-entry-legacy-overrides.css -> ./legacy-overrides/021-product-finder-surface-hierarchy.css |
| 355 | yes | `src/wingman2/styles/wingman-authority-system.css` | 288 | 6.9 | 0 | 1 | 6 | 59 | 11 | 0 | 0 | 0 | src/wingman2/styles/wingman-style-stack.css -> ./wingman-authority-system.css |
| 346 | yes | `src/styles/wingman-discovery-builder-layout.css` | 554 | 16.6 | 156 | 1 | 0 | 0 | 0 | 3 | 0 | 5 | src/wingman2/styles/wingman-style-stack.css -> ../../styles/wingman-discovery-builder-layout.css |
| 277 | yes | `src/wingman2/styles/legacy-overrides/019-balanced-compact-app-headers.css` | 217 | 5.5 | 119 | 1 | 0 | 1 | 0 | 13 | 0 | 0 | src/wingman2/styles/wingman-entry-legacy-overrides.css -> ./legacy-overrides/019-balanced-compact-app-headers.css |
| 263 | yes | `src/wingman2/styles/wingman-density-governance.css` | 85 | 3.2 | 18 | 0 | 0 | 36 | 0 | 1 | 9 | 0 | src/wingman2/styles/wingman-style-stack.css -> ./wingman-density-governance.css |
| 262 | yes | `src/wingman2/styles/legacy-overrides/015-declutter-guidance-popovers.css` | 265 | 6.7 | 120 | 0 | 0 | 0 | 0 | 3 | 0 | 4 | src/wingman2/styles/wingman-entry-legacy-overrides.css -> ./legacy-overrides/015-declutter-guidance-popovers.css |
| 248 | yes | `src/wingman2/styles/legacy-overrides/006-wingman-compact-page-length.css` | 338 | 7 | 106 | 1 | 0 | 2 | 0 | 9 | 0 | 0 | src/wingman2/styles/wingman-entry-legacy-overrides.css -> ./legacy-overrides/006-wingman-compact-page-length.css |
| 194 | yes | `src/wingman2/styles/wm-sidebar-no-horizontal-scroll.css` | 80 | 1.7 | 24 | 0 | 28 | 0 | 3 | 0 | 0 | 0 | src/wingman2/styles/wingman-style-stack.css -> ./wm-sidebar-no-horizontal-scroll.css |
| 180 | yes | `src/wingman2/styles/legacy-overrides/010-compare-swot-engine.css` | 363 | 6.5 | 50 | 0 | 0 | 0 | 0 | 2 | 0 | 19 | src/wingman2/styles/wingman-entry-legacy-overrides.css -> ./legacy-overrides/010-compare-swot-engine.css |
| 178 | yes | `src/wingman2/styles/legacy-overrides/014-prominent-card-buttons.css` | 197 | 35.8 | 89 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | src/wingman2/styles/wingman-entry-legacy-overrides.css -> ./legacy-overrides/014-prominent-card-buttons.css |
| 170 | yes | `src/wingman2/styles/wm-sidebar-compact.css` | 175 | 4.6 | 27 | 1 | 0 | 0 | 49 | 5 | 0 | 0 | src/wingman2/styles/wingman-style-stack.css -> ./wm-sidebar-compact.css |
| 161 | yes | `src/wingman2/styles/entry.css` | 715 | 15.5 | 42 | 1 | 1 | 4 | 8 | 14 | 0 | 0 | src/wingman2/styles/wingman-style-stack.css -> ./entry.css |
| 116 | yes | `src/wingman2/styles/legacy-overrides/009-compare-accuracy-contrast-fix.css` | 95 | 2.6 | 30 | 0 | 0 | 0 | 0 | 0 | 0 | 14 | src/wingman2/styles/wingman-entry-legacy-overrides.css -> ./legacy-overrides/009-compare-accuracy-contrast-fix.css |
| 100 | yes | `src/wingman2/styles/discovery-calm.css` | 163 | 4.7 | 50 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | src/wingman2/styles/wingman-style-stack.css -> ./discovery-calm.css |
| 100 | yes | `src/wingman2/styles/legacy-overrides/008-compact-sidebar-tooltips.css` | 89 | 2.4 | 47 | 0 | 0 | 0 | 3 | 0 | 0 | 0 | src/wingman2/styles/wingman-entry-legacy-overrides.css -> ./legacy-overrides/008-compact-sidebar-tooltips.css |
| 94 | yes | `src/wingman2/styles/legacy-overrides/020-discovery-application-step-restore.css` | 115 | 3.1 | 47 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | src/wingman2/styles/wingman-entry-legacy-overrides.css -> ./legacy-overrides/020-discovery-application-step-restore.css |
| 84 | yes | `src/wingman2/styles/legacy-overrides/011-compare-simplified-view.css` | 132 | 2.7 | 41 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | src/wingman2/styles/wingman-entry-legacy-overrides.css -> ./legacy-overrides/011-compare-simplified-view.css |
| 68 | yes | `src/wingman2/styles/wingman-layout-primitives.css` | 317 | 5.5 | 9 | 0 | 0 | 0 | 0 | 0 | 10 | 0 | src/wingman2/styles/wingman-style-stack.css -> ./wingman-layout-primitives.css |
| 66 | yes | `src/wingman2/styles/wm-logo-scale.css` | 49 | 1.3 | 13 | 0 | 0 | 0 | 11 | 9 | 0 | 0 | src/wingman2/styles/wingman-style-stack.css -> ./wm-logo-scale.css |
| 54 | yes | `src/wingman2/styles/legacy-overrides/002-logo-sizing-fix.css` | 57 | 1.5 | 23 | 0 | 0 | 0 | 4 | 0 | 0 | 0 | src/wingman2/styles/wingman-entry-legacy-overrides.css -> ./legacy-overrides/002-logo-sizing-fix.css |
| 46 | yes | `src/wingman2/styles/legacy-overrides/007-mobile-shade-desktop-fix.css` | 52 | 1.4 | 22 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | src/wingman2/styles/wingman-entry-legacy-overrides.css -> ./legacy-overrides/007-mobile-shade-desktop-fix.css |
| 38 | yes | `src/wingman2/styles/legacy-overrides/003-wingman-logo-svg-fix.css` | 39 | 1.1 | 15 | 0 | 0 | 0 | 4 | 0 | 0 | 0 | src/wingman2/styles/wingman-entry-legacy-overrides.css -> ./legacy-overrides/003-wingman-logo-svg-fix.css |
| 38 | yes | `src/wingman2/styles/legacy-overrides/004-real-wingman-logo.css` | 39 | 1.1 | 15 | 0 | 0 | 0 | 4 | 0 | 0 | 0 | src/wingman2/styles/wingman-entry-legacy-overrides.css -> ./legacy-overrides/004-real-wingman-logo.css |
| 28 | yes | `src/wingman2/styles/legacy-overrides/001-logo-reinstate.css` | 90 | 1.9 | 14 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | src/wingman2/styles/wingman-entry-legacy-overrides.css -> ./legacy-overrides/001-logo-reinstate.css |
| 18 | yes | `src/wingman2/components/discovery/SourceDeviceCollator.css` | 741 | 15.5 | 7 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | src/wingman2/styles/wingman-style-stack.css -> ../components/discovery/SourceDeviceCollator.css |
| 14 | yes | `src/wingman2/styles/discovery-answer-memory.css` | 185 | 4.2 | 1 | 0 | 0 | 0 | 0 | 6 | 0 | 0 | src/wingman2/styles/wingman-style-stack.css -> ./discovery-answer-memory.css |
| 13 | yes | `src/wingman2/styles/theme.css` | 71 | 1.8 | 0 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | src/wingman2/styles/entry.css -> ./theme.css |
| 11 | yes | `src/wingman2/styles/wingman-style-stack.css` | 41 | 1.3 | 0 | 0 | 0 | 0 | 3 | 0 | 1 | 0 | src/main.tsx -> ./wingman2/styles/wingman-style-stack.css |
| 10 | yes | `src/wingman2/styles/wingman-page-uniformity.css` | 180 | 3.6 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | src/wingman2/styles/wingman-style-stack.css -> ./wingman-page-uniformity.css |
| 8 | yes | `src/wingman2/styles/legacy-overrides/005-guru-chat-refresh.css` | 332 | 6.6 | 3 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | src/wingman2/styles/wingman-entry-legacy-overrides.css -> ./legacy-overrides/005-guru-chat-refresh.css |
| 4 | yes | `src/wingman2/styles/wingman-entry-legacy-overrides.css` | 33 | 1.7 | 0 | 0 | 0 | 0 | 1 | 1 | 0 | 0 | src/wingman2/styles/wingman-style-stack.css -> ./wingman-entry-legacy-overrides.css |
| 4 | yes | `src/wingman2/styles/results-clear-until-action.css` | 68 | 1.6 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | src/wingman2/styles/wingman-style-stack.css -> ./results-clear-until-action.css |
| 2 | yes | `src/wingman2/styles/legacy-overrides/012-call-cards-starter-visuals.css` | 30 | 0.8 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | src/wingman2/styles/wingman-entry-legacy-overrides.css -> ./legacy-overrides/012-call-cards-starter-visuals.css |
| 2 | yes | `src/wingman2/styles/legacy-overrides/013-hide-development-notes-ui.css` | 28 | 0.7 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | src/wingman2/styles/wingman-entry-legacy-overrides.css -> ./legacy-overrides/013-hide-development-notes-ui.css |

## Inactive high-risk CSS files

| Risk | File | Lines | !important | :root | Shell | Main | Sidebar | Topbar | Route | Light/Dark |
|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|

## TS/TSX CSS imports

| Source file | Import | Exists |
|---|---|---|
| `src/main.tsx` | `./wingman2/styles/wingman-style-stack.css` | yes |

## CSS @imports

| Source CSS | Import | Exists |
|---|---|---|
| `src/wingman2/styles/entry.css` | `./theme.css` | yes |
| `src/wingman2/styles/wingman-entry-legacy-overrides.css` | `./legacy-overrides/001-logo-reinstate.css` | yes |
| `src/wingman2/styles/wingman-entry-legacy-overrides.css` | `./legacy-overrides/002-logo-sizing-fix.css` | yes |
| `src/wingman2/styles/wingman-entry-legacy-overrides.css` | `./legacy-overrides/003-wingman-logo-svg-fix.css` | yes |
| `src/wingman2/styles/wingman-entry-legacy-overrides.css` | `./legacy-overrides/004-real-wingman-logo.css` | yes |
| `src/wingman2/styles/wingman-entry-legacy-overrides.css` | `./legacy-overrides/005-guru-chat-refresh.css` | yes |
| `src/wingman2/styles/wingman-entry-legacy-overrides.css` | `./legacy-overrides/006-wingman-compact-page-length.css` | yes |
| `src/wingman2/styles/wingman-entry-legacy-overrides.css` | `./legacy-overrides/007-mobile-shade-desktop-fix.css` | yes |
| `src/wingman2/styles/wingman-entry-legacy-overrides.css` | `./legacy-overrides/008-compact-sidebar-tooltips.css` | yes |
| `src/wingman2/styles/wingman-entry-legacy-overrides.css` | `./legacy-overrides/009-compare-accuracy-contrast-fix.css` | yes |
| `src/wingman2/styles/wingman-entry-legacy-overrides.css` | `./legacy-overrides/010-compare-swot-engine.css` | yes |
| `src/wingman2/styles/wingman-entry-legacy-overrides.css` | `./legacy-overrides/011-compare-simplified-view.css` | yes |
| `src/wingman2/styles/wingman-entry-legacy-overrides.css` | `./legacy-overrides/012-call-cards-starter-visuals.css` | yes |
| `src/wingman2/styles/wingman-entry-legacy-overrides.css` | `./legacy-overrides/013-hide-development-notes-ui.css` | yes |
| `src/wingman2/styles/wingman-entry-legacy-overrides.css` | `./legacy-overrides/014-prominent-card-buttons.css` | yes |
| `src/wingman2/styles/wingman-entry-legacy-overrides.css` | `./legacy-overrides/015-declutter-guidance-popovers.css` | yes |
| `src/wingman2/styles/wingman-entry-legacy-overrides.css` | `./legacy-overrides/016-visual-templates-landing.css` | yes |
| `src/wingman2/styles/wingman-entry-legacy-overrides.css` | `./legacy-overrides/017-workflow-clarity-pass.css` | yes |
| `src/wingman2/styles/wingman-entry-legacy-overrides.css` | `./legacy-overrides/018-new-wingman-design-pass.css` | yes |
| `src/wingman2/styles/wingman-entry-legacy-overrides.css` | `./legacy-overrides/019-balanced-compact-app-headers.css` | yes |
| `src/wingman2/styles/wingman-entry-legacy-overrides.css` | `./legacy-overrides/020-discovery-application-step-restore.css` | yes |
| `src/wingman2/styles/wingman-entry-legacy-overrides.css` | `./legacy-overrides/021-product-finder-surface-hierarchy.css` | yes |
| `src/wingman2/styles/wingman-style-stack.css` | `./entry.css` | yes |
| `src/wingman2/styles/wingman-style-stack.css` | `./wingman-entry-legacy-overrides.css` | yes |
| `src/wingman2/styles/wingman-style-stack.css` | `./wm-av-workspace.css` | yes |
| `src/wingman2/styles/wingman-style-stack.css` | `./wm-command-ui.css` | yes |
| `src/wingman2/styles/wingman-style-stack.css` | `./wm-brand-reset.css` | yes |
| `src/wingman2/styles/wingman-style-stack.css` | `./wm-sidebar-compact.css` | yes |
| `src/wingman2/styles/wingman-style-stack.css` | `./wm-sidebar-no-horizontal-scroll.css` | yes |
| `src/wingman2/styles/wingman-style-stack.css` | `./wm-logo-scale.css` | yes |
| `src/wingman2/styles/wingman-style-stack.css` | `./wm-route-redesign.css` | yes |
| `src/wingman2/styles/wingman-style-stack.css` | `./wm-sales-mode-global.css` | yes |
| `src/wingman2/styles/wingman-style-stack.css` | `../components/discovery/SourceDeviceCollator.css` | yes |
| `src/wingman2/styles/wingman-style-stack.css` | `../../styles/wingman-discovery-builder-layout.css` | yes |
| `src/wingman2/styles/wingman-style-stack.css` | `./discovery-clear-project-guard.css` | yes |
| `src/wingman2/styles/wingman-style-stack.css` | `./discovery-answer-memory.css` | yes |
| `src/wingman2/styles/wingman-style-stack.css` | `./discovery-calm.css` | yes |
| `src/wingman2/styles/wingman-style-stack.css` | `./results-clear-until-action.css` | yes |
| `src/wingman2/styles/wingman-style-stack.css` | `./wingman-page-uniformity.css` | yes |
| `src/wingman2/styles/wingman-style-stack.css` | `./wingman-layout-primitives.css` | yes |
| `src/wingman2/styles/wingman-style-stack.css` | `./wingman-authority-system.css` | yes |
| `src/wingman2/styles/wingman-style-stack.css` | `./wingman-density-governance.css` | yes |