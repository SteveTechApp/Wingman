# Remaining Legacy Overrides Isolation Test

Generated: 2026-05-05 12:52:43

Disabled without deleting:

- src\wingman2\styles\wingman-entry-legacy-overrides.css

Reason:

This wrapper imports old logo, sidebar, Guru, Compare, Discovery and Templates patch files. The major dangerous legacy files are already inactive, so this is the next clean test to see whether the current shared visual system can stand on its own.

Rollback:

Replace this line in src\wingman2\styles\wingman-style-stack.css:

/* isolated-remaining-legacy-overrides-test disabled wingman-entry-legacy-overrides.css */

with:

@import "./wingman-entry-legacy-overrides.css";