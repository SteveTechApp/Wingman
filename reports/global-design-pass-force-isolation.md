# Global Design Pass Force Isolation

Generated: 2026-05-05 09:53:04

Disabled without leaving @import inside comments:

- 017-workflow-clarity-pass.css
- 018-new-wingman-design-pass.css

Rollback:

Replace these two comment lines in src\wingman2\styles\wingman-entry-legacy-overrides.css:

/* isolated-global-design-pass-test disabled 017-workflow-clarity-pass.css */
/* isolated-global-design-pass-test disabled 018-new-wingman-design-pass.css */

with:

@import "./legacy-overrides/017-workflow-clarity-pass.css";
@import "./legacy-overrides/018-new-wingman-design-pass.css";