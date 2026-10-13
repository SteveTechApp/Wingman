# Product diagram audit

Goal: check shared template, project and product diagram paths; correct unsupported routing and add usable viewing controls.

- [x] Check NetworkHD encoder input types against manufacturer specifications; allocate compatible input slots independently of source order.
- [x] Remove generic USB/audio/control routes without confirmed interfaces; retain their scope and open design checks.
- [x] Prevent cable distance from selecting an unsupported transport; honour zero equipment quantities and correct multiview classification.
- [x] Share technical sheet viewer on project output and zoom/full-screen viewer on individual product schematics.
- [x] Exercise every built-in template and existing product topology tests; inspect a NetworkHD template in the browser.
- [x] Verify typecheck/build and synchronize touched files with main.

Validation: 75 tests passed across 13 files; strict full-source typecheck and production build passed. All 59 built-in template graphs checked. Manufacturer profiles cover reviewed interfaces; unspecified audio, USB and control paths remain open design checks.

Equipment: removed category filters; ALL leads scope tabs and is the default. Template library: removed the short nested scrolling panel; cards use natural page height.
