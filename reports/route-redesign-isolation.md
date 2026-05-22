# Route Redesign Isolation Test

Generated: 2026-05-05 09:54:43

Disabled without deleting:

- src\wingman2\styles\wm-route-redesign.css

Reason:

This file has the highest active risk score and contains broad route-level styling that may be fighting the shared layout primitives and migrated-page visual hardening.

Rollback:

Replace this line in src\wingman2\styles\wingman-style-stack.css:

/* isolated-route-redesign-test disabled wm-route-redesign.css */

with:

@import "./wm-route-redesign.css";