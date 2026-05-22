# Global Design Pass Isolation Test

Generated: 2026-05-05 09:51:10

Disabled imports for test only:

- 017-workflow-clarity-pass.css
- 018-new-wingman-design-pass.css

Reason:

These are broad legacy visual passes and are likely fighting the newer shared layout primitives and migrated-page hardening layer.

Rollback:

Open:

src\wingman2\styles\wingman-entry-legacy-overrides.css

Replace:

isolated-global-design-pass-test: @import

with:

@import