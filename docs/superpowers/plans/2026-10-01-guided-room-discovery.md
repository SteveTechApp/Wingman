# Guided Room Discovery Implementation Plan

**Goal:** Give focused users an operational room wizard, a reusable equipment library and a complete editable room brief; retain expert discovery.

**Architecture:** Reuse canonical discovery answer values and existing inference. New presentation helpers translate questions into customer language. Equipment selections become project topology devices, carry into templates and export with unresolved supporting items. Store the reusable library locally.

**Constraints:** Preserve existing user work; do not invent product specifications or silently confirm assumptions. Keep the header mode switch visible in both views. Match existing dark/aqua styles.

- [x] Add local equipment persistence with exact identity, evidence, dependencies and preferences.
- [x] Add operational question presentation, room scope checklist and equipment selection.
- [x] Add a focused wizard with explicit navigation, location capture, live summary and completion actions.
- [x] Integrate with project persistence, templates and HTML/DOCX brief exports.
- [x] Restore the header switch in both modes.
- [x] Test conditional questions, storage, selected equipment, exports and mode switching; typecheck, build and inspect the UI.
- [x] Sync edited files to the main checkout after checking existing changes.
