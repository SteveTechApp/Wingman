# Legacy Density Retirement Stage 1

Generated: 2026-05-05 09:34:16

The following legacy override imports were disabled, not deleted:

- 006-wingman-compact-page-length.css
- 008-compact-sidebar-tooltips.css
- 014-prominent-card-buttons.css
- 015-declutter-guidance-popovers.css
- 019-balanced-compact-app-headers.css

Reason:

These were classified as density-duplicate legacy overrides and should now be covered by:

- wingman-layout-primitives.css
- wingman-density-governance.css
- migrated WingmanPageFrame wrappers

Rollback:

Open src\wingman2\styles\wingman-entry-legacy-overrides.css and replace:

retired-density-stage-1: @import

with:

@import

Then rerun checks.