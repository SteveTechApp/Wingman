# Wingman UI consistency review — 26 September 2026

## Direction

Keep the shared navy surfaces, aqua primary actions, Geist typography and restrained borders. Use room illustrations to help users recognise projects and a white document cover to make the proposal output tangible. Diagrams, product imagery and customer outcomes should carry the sales story. Forms collect the remaining information without becoming the entire experience.

## Changes

- Projects now use illustrated cards with the existing search, ownership, status and management actions.
- Responses has a clear step rail, grouped fields and a live editable cover concept. The cover is explicitly a concept, not an exact Word rendering.
- Restored proposal styling on the Responses route and Sales Helper styling on Call Coach. Added the missing shared illustration container around Call Coach workflows.
- Proposal Visuals now has explicit responsive layout rules for its output choices, project brief and generation action.
- Removed broad surface selectors that painted nested card labels as separate panels.
- Shared rules align controls, focus states, navigation mode controls, scrolling and the next-tools panel. Home no longer appears active alongside another primary route.

## Verification

The reusable `tools/audit-ui-consistency.mjs` visits 31 route entries, including legacy aliases, Data Manager and a project detail page. Screenshots and geometry reports are saved in the ignored `data/runtime/` directory. Reviewed desktop screenshots and route contact sheets, plus key mobile screens.

- 1440px full workspace, 390px full workspace and 1280px focused mode: no route render-error messages, document-level horizontal overflow or visible next-tools overlap detected.
- Strict application typecheck passed.
- Targeted Projects, proposal wizard, sales content, export and schematic tests: 58 passed.
- Production build and architecture checks passed.
- Additional whole-working-tree ratchets still flag CSS size (954.61 KB against 939.52 KB allowed) and literal colour count (2116 against 2107 allowed). Their baselines were not raised. Other uncommitted work is present, so these measurements cover more than this change.

The sweep is a visual and layout review, not an exhaustive interaction or accessibility certification. Application-specific layouts remain intentional: diagrams need canvas space, product tools need comparison layouts, and the proposal cover uses a light paper surface.
