# Finder Surface Legacy Isolation Test

Generated: 2026-05-05 09:48:47

Disabled import:

- src/wingman2/styles/legacy-overrides/021-product-finder-surface-hierarchy.css

Reason:

This file is route-specific to Product Finder and is a likely cause of the mixed light/dark Finder surface collision.

Rollback:

Open src\wingman2\styles\wingman-entry-legacy-overrides.css and replace:

retired-finder-surface-test: @import

with:

@import