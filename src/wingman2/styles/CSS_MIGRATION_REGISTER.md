# Wingman CSS Migration Register

## Current rule

Do not remove layout CSS wholesale.

Some legacy CSS files contain structural layout as well as visual styling. The correct process is:

1. Keep structural CSS active until shared components replace it.
2. Remove duplicate visual override files.
3. Keep `wingman-authority-system.css` as the final visual override.
4. Rebuild one page at a time using shared layout components.
5. Retire old CSS only after the page has been migrated.

## Active structural / legacy files to keep for now

- `wingman-style-stack.css`
- `wm-av-workspace.css`
- `wm-command-ui.css`
- `wm-route-redesign.css`
- `wm-brand-reset.css`
- `wm-sidebar-no-horizontal-scroll.css`
- page/component CSS that contains actual layout geometry

## Obsolete visual override files

These should not be imported:

- `wingman-visual-consistency.css`
- `wingman-authority-override.css`
- `wm-global-visual-system.css`
- `wingman-copy-discipline.css`

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
