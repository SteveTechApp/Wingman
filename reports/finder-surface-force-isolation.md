# Finder Surface Force Isolation

Generated: 2026-05-05 10:06:17

Disabled without deleting:

- 021-product-finder-surface-hierarchy.css

Reason:

This legacy Finder-only layer contains broad route and shell selectors that can fight the shared migrated-page layout and cause mixed dark/light surfaces.

Rollback:

Replace this line in src\wingman2\styles\wingman-entry-legacy-overrides.css:

/* isolated-finder-surface-test disabled 021-product-finder-surface-hierarchy.css */

with:

@import "./legacy-overrides/021-product-finder-surface-hierarchy.css";