# Wingman CSS Consolidation Audit

Generated: 
2026-08-11 19:40:45

## Active CSS footprint

- Active CSS files: 
7
- Combined active CSS size: 
1111.07
 KB
- Combined active CSS lines: 
36429
- Total !important declarations: 
11743
- Duplicate selectors detected: 
1367
- Historical patch/fix marker lines detected: 
75

## Largest active CSS files

- src\wingman2\styles\wingman-style-stack.css: 25350 lines / 708.29 KB / !important=6795
- src\wingman2\styles\wingman-workflow-theme.css: 5858 lines / 245.48 KB / !important=2856
- src\wingman2\styles\wingman-polish-navigation.css: 3056 lines / 98.32 KB / !important=1515
- src\wingman2\styles\wingman-reference-theme.css: 1222 lines / 32.56 KB / !important=294
- src\wingman2\styles\wingman-reference-global.css: 574 lines / 15.01 KB / !important=168
- src\wingman2\styles\wingman-products-light-graphics.css: 188 lines / 5.99 KB / !important=50
- src\wingman2\styles\wingman-product-tools-visual-weight.css: 181 lines / 5.42 KB / !important=65

## CSS import order from src/main.tsx

- line 2: @xyflow/react/dist/style.css
- line 3: ./wingman2/styles/wingman-style-stack.css
- line 4: ./wingman2/styles/wingman-reference-theme.css
- line 5: ./wingman2/styles/wingman-workflow-theme.css
- line 6: ./wingman2/styles/wingman-polish-navigation.css
- line 7: ./wingman2/styles/wingman-reference-global.css
- line 8: ./wingman2/styles/wingman-product-tools-visual-weight.css

## Core selector conflicts

- .wingman-sidebar - 15 occurrences - src\wingman2\styles\wingman-reference-global.css; src\wingman2\styles\wingman-reference-theme.css; src\wingman2\styles\wingman-style-stack.css
- :root - 13 occurrences - src\wingman2\styles\wingman-polish-navigation.css; src\wingman2\styles\wingman-reference-global.css; src\wingman2\styles\wingman-reference-theme.css; src\wingman2\styles\wingman-style-stack.css; src\wingman2\styles\wingman-workflow-theme.css
- .wm-page - 11 occurrences - src\wingman2\styles\wingman-style-stack.css
- .wm-page-header - 9 occurrences - src\wingman2\styles\wingman-style-stack.css
- .wm-sidebar - 8 occurrences - src\wingman2\styles\wingman-style-stack.css
- body - 7 occurrences - src\wingman2\styles\wingman-reference-global.css; src\wingman2\styles\wingman-reference-theme.css; src\wingman2\styles\wingman-style-stack.css
- .wm-section-card - 5 occurrences - src\wingman2\styles\wingman-reference-theme.css; src\wingman2\styles\wingman-style-stack.css
- .wm-button - 4 occurrences - src\wingman2\styles\wingman-style-stack.css
- .wm-btn - 4 occurrences - src\wingman2\styles\wingman-reference-global.css; src\wingman2\styles\wingman-reference-theme.css; src\wingman2\styles\wingman-style-stack.css
- .wm-data-toolbar - 2 occurrences - src\wingman2\styles\wingman-workflow-theme.css

## Most repeated selectors

- :is( html[data-wingman-route="visualStudio"] - 29 occurrences - src\wingman2\styles\wingman-workflow-theme.css
- @media (max-width: 1180px) - 27 occurrences - src\wingman2\styles\wingman-polish-navigation.css; src\wingman2\styles\wingman-style-stack.css; src\wingman2\styles\wingman-workflow-theme.css
- @media (max-width: 760px) - 25 occurrences - src\wingman2\styles\wingman-polish-navigation.css; src\wingman2\styles\wingman-products-light-graphics.css; src\wingman2\styles\wingman-product-tools-visual-weight.css; src\wingman2\styles\wingman-reference-global.css; src\wingman2\styles\wingman-reference-theme.css; src\wingman2\styles\wingman-style-stack.css; src\wingman2\styles\wingman-workflow-theme.css
- @media (max-width: 980px) - 22 occurrences - src\wingman2\styles\wingman-polish-navigation.css; src\wingman2\styles\wingman-reference-theme.css; src\wingman2\styles\wingman-style-stack.css
- @media (max-width: 720px) - 19 occurrences - src\wingman2\styles\wingman-polish-navigation.css; src\wingman2\styles\wingman-style-stack.css; src\wingman2\styles\wingman-workflow-theme.css
- h2 - 17 occurrences - src\wingman2\styles\wingman-polish-navigation.css; src\wingman2\styles\wingman-reference-global.css; src\wingman2\styles\wingman-style-stack.css; src\wingman2\styles\wingman-workflow-theme.css
- h3 - 16 occurrences - src\wingman2\styles\wingman-reference-global.css; src\wingman2\styles\wingman-style-stack.css; src\wingman2\styles\wingman-workflow-theme.css
- @media (max-width: 900px) - 16 occurrences - src\wingman2\styles\wingman-polish-navigation.css; src\wingman2\styles\wingman-style-stack.css; src\wingman2\styles\wingman-workflow-theme.css
- .wingman-sidebar - 15 occurrences - src\wingman2\styles\wingman-reference-global.css; src\wingman2\styles\wingman-reference-theme.css; src\wingman2\styles\wingman-style-stack.css
- .wm-dashboard-grid - 14 occurrences - src\wingman2\styles\wingman-style-stack.css
- @media (max-width: 1100px) - 14 occurrences - src\wingman2\styles\wingman-polish-navigation.css; src\wingman2\styles\wingman-products-light-graphics.css; src\wingman2\styles\wingman-reference-theme.css; src\wingman2\styles\wingman-style-stack.css; src\wingman2\styles\wingman-workflow-theme.css
- .wingman-guru-fab[data-support-available="true"]::after - 13 occurrences - src\wingman2\styles\wingman-style-stack.css
- button.wingman-guru-fab[data-support-available="true"]::after - 13 occurrences - src\wingman2\styles\wingman-style-stack.css
- :root - 13 occurrences - src\wingman2\styles\wingman-polish-navigation.css; src\wingman2\styles\wingman-reference-global.css; src\wingman2\styles\wingman-reference-theme.css; src\wingman2\styles\wingman-style-stack.css; src\wingman2\styles\wingman-workflow-theme.css
- select - 12 occurrences - src\wingman2\styles\wingman-reference-global.css; src\wingman2\styles\wingman-reference-theme.css; src\wingman2\styles\wingman-style-stack.css; src\wingman2\styles\wingman-workflow-theme.css
- .wingman-guru-fab[data-support-available="true"]::before - 12 occurrences - src\wingman2\styles\wingman-style-stack.css
- button.wingman-guru-fab[data-support-available="true"]::before - 12 occurrences - src\wingman2\styles\wingman-style-stack.css
- .wm-page - 11 occurrences - src\wingman2\styles\wingman-style-stack.css
- .wm-template-detail-hero - 11 occurrences - src\wingman2\styles\wingman-style-stack.css
- .wingman-page - 11 occurrences - src\wingman2\styles\wingman-style-stack.css
- .wingman-app - 11 occurrences - src\wingman2\styles\wingman-style-stack.css
- .wingman-workspace - 11 occurrences - src\wingman2\styles\wingman-reference-global.css; src\wingman2\styles\wingman-reference-theme.css; src\wingman2\styles\wingman-style-stack.css
- html body :is(.wingman-page-host - 10 occurrences - src\wingman2\styles\wingman-products-light-graphics.css
- .wm-shell - 10 occurrences - src\wingman2\styles\wingman-style-stack.css
- .wm-dashboard-project-grid - 9 occurrences - src\wingman2\styles\wingman-style-stack.css

## Recommended consolidation sequence

1. Fix core selectors first: root variables, page frame, cards, navigation, buttons and Data Manager shared primitives.
2. Preserve the current import/cascade order while moving canonical rules into one owner file.
3. Remove historical patch/repair blocks only after their behaviour has been absorbed into canonical selectors.
4. Reduce !important usage once competing selectors have been removed.
5. Retire the smaller override CSS files one at a time, validating after each retirement.
6. Keep page-specific CSS only where a component genuinely needs unique layout behaviour.

## Generated evidence

- active-css-summary.csv
- active-css-import-order.csv
- duplicate-css-selectors.csv
- css-patch-markers.csv
- core-selector-conflicts.csv

## Safety

This pass is read-only. It does not modify application CSS.
The next apply-pass should be based on these conflict lists rather than deleting styles by filename.