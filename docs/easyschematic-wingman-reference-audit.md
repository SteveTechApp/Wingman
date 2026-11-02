# EasySchematic reference audit for Wingman

Generated: 2026-07-01T21:06:20

## Purpose

This audit records what was found in the EasySchematic package so Wingman can review schematic design ideas without importing the external application into the Wingman source tree.

## Important licence caution

Detected package licence: **AGPL-3.0**

Treat the extracted material as local reference only. Do not copy implementation code into Wingman without licence review.

That caution is enforced rather than remembered. `_external_reference/.gitignore`
ignores everything in the pen and re-opens only its own file and
`EasySchematic/README.md`, so an extraction beside the package or a folder
written straight into the pen cannot reach the index by an ordinary `git add`.
The guard sits at the top of the pen, not inside the package folder, because a
nested file covers only the directory it lives in. A force-add bypasses it, which
is why the rule is stated here as well as ignored there; `git ls-files
_external_reference` is the check that nothing else is tracked. The README beside
the package carries the same licence caution, so a reader who opens the pen
without this document still meets it.

## Package summary

| Item | Value |
|---|---:|
| Package name | easyschematic |
| Version | 0.42.0 |
| Files scanned | 451 |
| Approx source size bytes | 8091973 |
| Selected files copied for local review | 176 |
| Reference manifest entries | 16 |
| Package dependencies detected | 29 |

## File type snapshot

| Extension | Count |
|---|---:|
| .ts | 188 |
| .tsx | 121 |
| .sql | 35 |
| .json | 32 |
| .md | 9 |
| .png | 8 |
| .yml | 7 |
| .ttf | 7 |
| .css | 5 |
| .toml | 4 |
| .svg | 4 |
| .js | 4 |

## Dependencies of interest

- @types/react: ^19.2.14
- @types/react-dom: ^19.2.3
- @vitejs/plugin-react: ^6.0.0
- @xyflow/react: 12.10.1
- dxf-parser: ^1.1.2
- eslint-plugin-react-hooks: ^7.0.1
- eslint-plugin-react-refresh: ^0.5.2
- jspdf: ^4.2.0
- react: ^19.2.4
- react-dom: ^19.2.4
- vite: ^8.0.0
- vite-plugin-pwa: ^1.2.0
- vitest: ^4.1.0
- zustand: ^5.0.11

## Licence files found

- LICENSE

## Selected reference areas copied locally

The list below is what the audit run copied into `_external_reference/EasySchematic/`
for review. Those copies are not part of this repository and are not expected in
a checkout: the pen ignores them, and only its README and guard file are tracked.
The list records what was read while the audit was written, so a reader can tell
which areas the findings rest on, not what is on disk today.

- api
- devices
- docs
- src/cableSchedule.ts
- src/components/DeviceNode.tsx
- src/components/OffsetEdge.tsx
- src/connectorTypes.ts
- src/deviceLibrary.ts
- src/dxfExport
- src/networkReport.ts
- src/pdfExport.ts
- src/powerReport.ts
- src/routing
- src/signalColors.ts
- src/store.ts
- src/types.ts

## Requested areas not found

The package does not ship these paths, so nothing was read from them and no
finding rests on them:

- src/components/Canvas.tsx — the canvas behaviour was reviewed from the node
  and edge components copied above; the view component itself was not available.

## Signal terms detected in selected files

- ANALOG
- AUDIO
- CONTROL
- DANTE
- ETHERNET
- FIBER
- FIBRE
- HDMI
- IR
- NDI
- POWER
- RS-232
- SDI
- USB
- USB-C

## Wingman relevance

Useful ideas to review for Wingman Visual Design Studio:

- Device and port modelling.
- Signal compatibility rules.
- Canvas node and edge behaviour.
- Cable schedule, power report and network report concepts.
- PDF or DXF export workflow ideas.

Use these as design references only. Do not import the external application as a Wingman dependency without a separate technical and licence review. Most of the list has since been built natively — see "Status since this audit" below, which is the half that goes stale if only this section is read.

## Status since this audit

This report dates the audit run and records what was read; the planning pass it
recommended has since happened, so the recommendation is history rather than an
open task. Read the tree for the current state, not this list:

- Device, port and signal modelling is Wingman's own, in
  `src/wingman2/lib/schematic/` — `schematicTypes.ts` for the model,
  `schematicProductRules.ts` for signal rules, `schematicLayoutEngine.ts` for the
  drawing and `wingmanSchematicEngine.ts` for the brief-to-model step, with its
  spec beside it. `docs/wingman-native-schematic-engine.md` states the rule the
  engine keeps: Wingman decides the architecture, the engine draws it.
- The cable schedule is `src/wingman2/lib/schematic/nativeCableSchedule.ts`,
  built from a `SchematicModel` with a validation status per row.
- Power and network are answered as design assurance rather than as standalone
  reports: `src/wingman2/lib/powerBudget.ts` and
  `src/wingman2/lib/networkInfrastructureAssurance.ts`. There is no "power
  report" or "network report" surface by those names.
- The canvas is `src/wingman2/components/TechnicalSchematic.tsx`, which renders
  a `SchematicModel` inside the template and proposal surfaces. There is no visual-studio route, so the
  "Visual Design Studio" framing in the recommendation below no longer names a
  place in the app.
- The printed document is the proposal itself (`buildProposalHtml` and print), so
  a separate PDF export path was not built. DXF is not implemented: nothing in
  the tree reads or writes a `.dxf` file, so that idea remains unread.

## Recommended next step (as of the audit run)

Create a separate Wingman Visual Design Studio planning pass that defines Wingman's own native device, port, signal and cable-schedule model. Keep the implementation original and Wingman-owned.

## Suggested commit scope

Commit only the audit report and the pen's own guard and README, by name:

    git add docs/easyschematic-wingman-reference-audit.md
    git add _external_reference/.gitignore
    git add _external_reference/EasySchematic/README.md
    git commit -m 'Add EasySchematic reference audit for Visual Design Studio'

There is no `.gitignore` inside `EasySchematic/`, and adding one would be a
mistake: two copies of that list is how they stop agreeing about what is ignored,
and the pen's copy is the one that covers the whole pen. Do not use `git add .`
for this pass, and do not force-add anything under `_external_reference/`.
