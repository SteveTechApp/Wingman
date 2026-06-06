# Wingman CSS Migration Register

## Current rule

The app now uses one consolidated stylesheet:

- `wingman-style-stack.css`

The retired split stylesheets and legacy override folders have been archived out of the repo. Do not reintroduce page-level CSS imports.

## Current Rule

1. `src/main.tsx` imports exactly one stylesheet.
2. New app-wide layout, route, card, button, and form rules go into `wingman-style-stack.css`.
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
