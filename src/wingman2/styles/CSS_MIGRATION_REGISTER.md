# Wingman CSS Migration Register

## Current rule

The app uses one consolidated style stack plus one app-wide redesign layer:

- `wingman-style-stack.css`
- `wingman-redesign-theme.css`, imported immediately after the stack

The retired split stylesheets and legacy override folders have been archived out of the repo. Do not reintroduce page-level CSS imports.

## Current Rule

1. `src/main.tsx` imports the style stack followed by the redesign theme.
2. New app-wide layout, route, card, button, and form rules go into `wingman-style-stack.css`; visual-system overrides belong in `wingman-redesign-theme.css`.
3. Page files must not import CSS directly.
4. Prefer shared layout components before adding new selectors.
5. Retire stale selectors after the page has been migrated and verified.

## Archived Files

These should stay archived and should not be imported again:

- `legacy-overrides/`
- `wingman-authority-system.css`
- `wingman-density-governance.css`
- `wingman-ui-redesign.css`
- `wingman.css`
- `wm-*.css`
- route-specific visual patch files

## Target

Move Wingman toward:

- one app shell
- one page frame
- one hero pattern
- one panel/card system
- one button/form system
- one support/Guru guidance pattern

## Page density rule

- Hero: one purpose line only.
- Cards: title plus one short subtitle.
- Buttons: action text only.
- Long help: right guidance panel or Guru.
- Advanced filters: collapsed by default.
- Technical explanations: reveal after user action.

## Style audit implementation pass

The visual audit is now treated as an implementation control, not just a report.

Required visual target:

- body text is white or near-white;
- section headings and page titles are aquamarine;
- cards and panels use dark navy surfaces;
- buttons are clean rectangular controls, not heavy orange pills;
- page-level CSS imports remain banned;
- visual-system overrides live in `wingman-redesign-theme.css`;
- `check:style-drift-baseline` fails if hard-coded colour, inline style, arbitrary Tailwind, page-specific CSS, or legacy pill drift increases.

Migration order remains:

1. Dashboard / shared shell
2. Product Family / Finder / Product Pitch
3. Discovery
4. Proposal
5. Compare
6. Templates / Videowall Builder

## Page markup migration pass

Affected pages now use shared `wm-ui-*` classes directly in page markup rather than relying only on late CSS overrides.

Required shared primitives:

- `wm-ui-page` for page roots;
- `wm-ui-hero` for primary page hero panels;
- `wm-ui-section` for major content groups;
- `wm-ui-card` for panels, options, results, tiles and cards;
- `wm-ui-card-header` for card and section header rows;
- `wm-ui-title` for page, section and card headings;
- `wm-ui-copy` for explanatory text;
- `wm-ui-kicker` for eyebrow labels;
- `wm-ui-button` plus primary/secondary button variants;
- `wm-ui-input` for inputs, selects and textareas.

`check:page-markup-migration` must pass before merge. The check is deliberately structural: it confirms the affected page files contain shared visual primitives, not just page-specific selectors.

## Visual utility migration pass

Migrated page files should not depend on hard-coded Tailwind colour utilities once a shared `wm-ui-*` primitive is present.

Allowed:

- layout utilities such as grid, flex, gap, width, padding and responsive behaviour;
- semantic shared classes such as `wm-ui-page`, `wm-ui-card`, `wm-ui-title`, `wm-ui-copy`, `wm-ui-button` and `wm-ui-input`.

Avoid adding new page-level visual colour utilities such as:

- `bg-white`, `bg-slate-*`, `bg-[#...]`;
- `text-slate-*`, `text-white`, `text-[#...]`;
- `border-slate-*`, `border-[#...]`;
- gradient colour utilities such as `from-*`, `via-*`, `to-*`.

`check:page-visual-classes` prevents the migrated page files from increasing hard-coded visual utility drift after this pass.

## Dashboard visual correction pass

The Dashboard is the visual baseline page for Wingman. It must not look like a simple recolour of the previous interface.

Dashboard visual requirements:

- readable desktop-scale text;
- compact topbar and reduced empty vertical space;
- dark navy cards with lower border dominance;
- aquamarine headings without every container becoming equally outlined;
- primary actions as clean buttons, not oversized square tiles;
- Active Projects presented as project cards with useful hierarchy.

`check:dashboard-visual-correction` confirms the dashboard route-specific correction block remains installed.
