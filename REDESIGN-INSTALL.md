# Wingman redesign — implementation

This applies the refreshed visual system to the **live app** with no React/JSX
changes. The whole `wingman-style-stack.css` is driven by `:root` design tokens
and a stable set of class names, so the redesign ships as a single override
stylesheet that re-tunes the tokens and refines the high-impact component rules.

## Install (one line)

Add the new stylesheet, imported **after** the main one, in `src/main.tsx`:

```diff
  import "./wingman2/styles/wingman-style-stack.css";
+ import "./wingman2/styles/wingman-redesign-theme.css";
```

Copy `src/wingman2/styles/wingman-redesign-theme.css` into the repo at the same
path. That's the entire change.

## What it does

- **Palette** — calmer, higher-contrast dark surfaces; flat panels instead of
  layered gradients + glow shadows.
- **Hierarchy** — page headings become near-white; aqua is reserved as an accent
  for eyebrows, small labels and links (drives `--wm-uniform-*` and the
  page-host `--wm-consistency-*` variable systems).
- **Radius** — one consistent scale (8 / 10 / 12 / 14 / 16) replacing the
  4/6/8 vs 16/18/22/28 mix.
- **Type** — lighter, disciplined weights (body 450, UI 600, heading 700).
- **Components** — refined sidebar, nav links (aqua active state, not orange),
  topbar, primary button (aqua→blue gradient), hero, and destination cards
  (hairline borders, lift-on-hover).

It is purely additive and overrides via the cascade, so it is safe to remove
(delete the import) to revert.

## Follow-up (optional, needs React changes)

The override re-skins everything. The *structural* dashboard upgrades shown in
the `Wingman Redesign.dc.html` mock — the "resume last project" card, the
active-projects rail, and the rebuilt Compare verdict / Finder fit-score
layouts — are new markup and would be applied per page in their respective
components (`DashboardPage.tsx`, `ComparePageNew.tsx`, `FinderPage.tsx`).
