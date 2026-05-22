# wm-av-workspace Isolation Test

Generated: 2026-05-05 12:27:29

Disabled without deleting:

- src\wingman2\styles\wm-av-workspace.css

Reason:

This is currently the highest-risk active CSS file. It contains 313 important rules and old guidance rail styling that can fight the shared Wingman visual system.

Rollback:

Replace this line in src\wingman2\styles\wingman-style-stack.css:

/* isolated-av-workspace-test disabled wm-av-workspace.css */

with:

@import "./wm-av-workspace.css";