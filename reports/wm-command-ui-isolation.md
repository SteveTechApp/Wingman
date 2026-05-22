# wm-command-ui Isolation Test

Generated: 2026-05-05 12:30:32

Disabled without deleting:

- src\wingman2\styles\wm-command-ui.css

Reason:

This is currently the highest-risk active CSS file after wm-av-workspace was isolated. It contains 269 important rules and may be fighting the shared authority layout.

Rollback:

Replace this line in src\wingman2\styles\wingman-style-stack.css:

/* isolated-command-ui-test disabled wm-command-ui.css */

with:

@import "./wm-command-ui.css";