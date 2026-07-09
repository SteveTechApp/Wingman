# WyreStorm Wingman

WyreStorm Wingman is an internal sales, discovery, product-selection and proposal-support tool for WyreStorm Technologies.

The application helps sales and pre-sales users move from customer requirements to a practical AV system direction using guided workflows, product intelligence, comparison support, project storage and proposal-ready outputs.

## Active App Files

- App entry: `src/main.tsx`
- Route shell: `src/wingman2/layout/AppShell.tsx`
- Route registry: `src/wingman2/app/routes.tsx` and `src/wingman2/app/routeCatalog.ts`
- Pages: `src/wingman2/pages/`
- Shared components: `src/wingman2/components/`
- Consolidated styling: `src/wingman2/styles/wingman-style-stack.css`

Do not edit root-level drop-in page files or archived backup copies. The active runtime is under `src/wingman2`, and `src/main.tsx` intentionally imports only the consolidated Wingman style stack.

## Current Redesign Direction

The active redesign is focused on making Wingman feel like one cohesive workspace instead of a set of separately patched pages:

- Pages should fill the available workspace width and use a consistent frame.
- The sidebar should behave like styled navigation: clear labels, hidden hover tooltips, active-state color, and no long summary copy in the rail.
- Primary user actions should be visually steered with restrained aqua/cyan highlights and state cues.
- Cards, panels, headings and buttons should share a consistent dark WyreStorm visual system.
- Visual interest should support task direction, not add decorative noise.

## Development

```bash
npm run dev
```

Open `http://127.0.0.1:3000/wingman`.

For faster local validation during UI work, run:

```bash
npm run typecheck
npm run build
```

Before committing larger changes, run:

```bash
npm run verify
```

## Styling Governance

Wingman uses one consolidated stylesheet: `src/wingman2/styles/wingman-style-stack.css`.

Page files should not import their own CSS. Visual work should use the shared `wm-*` primitives and add route-specific rules to the consolidated stack only when needed.

## Cleanup Archive

Old backups, discarded install files, root-level drop-ins and generated zip/log artifacts have been moved out of the active tree to:

```text
archive/repo-cleanup-20260709-050830/
```

That archive includes `MOVED_FILES.md` with the full inventory. Keep new scratch files, generated bundles and one-off backups out of active source folders so future debugging starts from the real runtime files.

## Documentation

Detailed feature, launch, migration and audit notes live under `docs/` and existing dated folders in `archive/`.
