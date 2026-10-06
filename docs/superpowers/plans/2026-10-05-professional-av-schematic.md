# Professional AV schematic implementation

Goal: replace template technical diagrams with port-based design-development drawings using verified product paths and explicit unresolved scope.

Reference: AVIXA project-documentation sample AVRD203 (PDF page 107); WyreStorm SW-130-TX-UK and RX-700 manufacturer specifications.

Tasks:
- [x] Add a verified SW-130-TX-US/UK to RX-700 interface profile, with HDMI/USB-C source allocation, HDBaseT, receiver HDMI output, PoH note and missing-pairing blockers.
- [x] Preserve equipment quantities and show audio/control/peripheral scope without invented routing.
- [x] Render named ports, device IDs, right-angle routes, cable IDs, location groups and a drawing issue/status block.
- [x] Use one technical model for native and Visual Studio template views; retain concept output separately.
- [x] Export the actual drawing as SVG/PNG and print; preserve zoom/full-screen/scrolling.
- [x] Test missing receivers, excess sources, duplicate equipment, quantity edits and route geometry. Verify strict typecheck, existing schematic tests and production build.
- [x] Inspect the live school hall drawing and sync changed source files with main.

Validation: 59 tests across schematic, viewport and technical-sheet export suites; strict typecheck; production build; sales-facing language check. Desktop and 740px viewport inspected. Full-screen exposes exports and scrolling on both axes at actual size. SVG export parses as valid XML and project asset serialization preserves the sheet.

Scope: verified port profile covers SW-130-TX-US/UK + RX-700. Other generated paths remain unverified. Audio, control and USB peripheral routing require explicit equipment/interfaces. Visio exports the equipment concept; SVG/PNG/print use the technical sheet. In-app browser download event delivery could not be confirmed.

Primary references:
- https://cdn.avixa.org/production/docs/default-source/default-document-library/avprojectdocsample_fullcontents.pdf (AVRD203, PDF page 107)
- https://www.wyrestorm.com/product/sw-130-tx-uk/
- https://www.wyrestorm.com/product/rx-700/
