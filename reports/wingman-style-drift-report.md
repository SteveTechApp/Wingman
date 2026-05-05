# Wingman Style Drift Report

Generated: 2026-05-05T08:01:16.412Z

## Summary

- CSS files found: **20**
- TS/TSX CSS import statements found: **1**
- CSS @import statements found: **19**
- Active CSS files through import graph: **20**
- Inactive CSS files: **0**

## Highest-risk active CSS files

| Risk | Active | File | Lines | Size KB | !important | :root | Shell | Main | Sidebar | Topbar | Route | Light/Dark | Imported by |
|---:|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| 3425 | yes | `src/wingman2/styles/entry.css` | 4542 | 114.1 | 1314 | 4 | 29 | 9 | 29 | 56 | 41 | 50 | src/wingman2/styles/wingman-style-stack.css -> ./entry.css |
| 1701 | yes | `src/wingman2/styles/wingman-authority-system.css` | 589 | 18.5 | 154 | 1 | 7 | 179 | 13 | 7 | 83 | 0 | src/wingman2/styles/wingman-style-stack.css -> ./wingman-authority-system.css |
| 736 | yes | `src/wingman2/styles/wm-route-redesign.css` | 207 | 6.5 | 28 | 0 | 0 | 57 | 0 | 0 | 79 | 0 | src/wingman2/styles/wingman-style-stack.css -> ./wm-route-redesign.css |
| 716 | yes | `src/wingman2/styles/wm-av-workspace.css` | 819 | 21.6 | 313 | 1 | 1 | 9 | 4 | 12 | 0 | 0 | src/wingman2/styles/wingman-style-stack.css -> ./wm-av-workspace.css |
| 612 | yes | `src/wingman2/styles/wm-command-ui.css` | 992 | 24.2 | 269 | 1 | 5 | 1 | 2 | 16 | 0 | 0 | src/wingman2/styles/wingman-style-stack.css -> ./wm-command-ui.css |
| 528 | yes | `src/wingman2/styles/wm-brand-reset.css` | 313 | 8.3 | 85 | 1 | 15 | 55 | 0 | 0 | 0 | 0 | src/wingman2/styles/wingman-style-stack.css -> ./wm-brand-reset.css |
| 346 | yes | `src/styles/wingman-discovery-builder-layout.css` | 554 | 16.6 | 156 | 1 | 0 | 0 | 0 | 3 | 0 | 5 | src/wingman2/styles/wingman-style-stack.css -> ../../styles/wingman-discovery-builder-layout.css |
| 194 | yes | `src/wingman2/styles/wm-sidebar-no-horizontal-scroll.css` | 80 | 1.7 | 24 | 0 | 28 | 0 | 3 | 0 | 0 | 0 | src/wingman2/styles/wingman-style-stack.css -> ./wm-sidebar-no-horizontal-scroll.css |
| 170 | yes | `src/wingman2/styles/wm-sidebar-compact.css` | 175 | 4.6 | 27 | 1 | 0 | 0 | 49 | 5 | 0 | 0 | src/wingman2/styles/wingman-style-stack.css -> ./wm-sidebar-compact.css |
| 100 | yes | `src/wingman2/styles/discovery-calm.css` | 163 | 4.7 | 50 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | src/wingman2/styles/wingman-style-stack.css -> ./discovery-calm.css |
| 68 | yes | `src/wingman2/styles/wingman-layout-primitives.css` | 284 | 4.9 | 9 | 0 | 0 | 0 | 0 | 0 | 10 | 0 | src/wingman2/styles/wingman-style-stack.css -> ./wingman-layout-primitives.css |
| 66 | yes | `src/wingman2/styles/wm-logo-scale.css` | 49 | 1.3 | 13 | 0 | 0 | 0 | 11 | 9 | 0 | 0 | src/wingman2/styles/wingman-style-stack.css -> ./wm-logo-scale.css |
| 18 | yes | `src/wingman2/components/discovery/SourceDeviceCollator.css` | 741 | 15.5 | 7 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | src/wingman2/styles/wingman-style-stack.css -> ../components/discovery/SourceDeviceCollator.css |
| 14 | yes | `src/wingman2/styles/discovery-answer-memory.css` | 185 | 4.2 | 1 | 0 | 0 | 0 | 0 | 6 | 0 | 0 | src/wingman2/styles/wingman-style-stack.css -> ./discovery-answer-memory.css |
| 13 | yes | `src/wingman2/styles/theme.css` | 71 | 1.8 | 0 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | src/wingman2/styles/entry.css -> ./theme.css |
| 11 | yes | `src/wingman2/styles/wingman-style-stack.css` | 42 | 1.3 | 0 | 0 | 0 | 0 | 3 | 0 | 1 | 0 | src/main.tsx -> ./wingman2/styles/wingman-style-stack.css |
| 10 | yes | `src/wingman2/styles/wingman-page-uniformity.css` | 180 | 3.6 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | src/wingman2/styles/wingman-style-stack.css -> ./wingman-page-uniformity.css |
| 4 | yes | `src/wingman2/styles/results-clear-until-action.css` | 68 | 1.6 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | src/wingman2/styles/wingman-style-stack.css -> ./results-clear-until-action.css |
| 0 | yes | `src/wingman2/styles/discovery-clear-project-guard.css` | 127 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | src/wingman2/styles/wingman-style-stack.css -> ./discovery-clear-project-guard.css |
| 0 | yes | `src/wingman2/styles/wm-sales-mode-global.css` | 120 | 2.6 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | src/wingman2/styles/wingman-style-stack.css -> ./wm-sales-mode-global.css |

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
| `src/wingman2/styles/wingman-style-stack.css` | `./entry.css` | yes |
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