# Wingman Form Field Identity Guard

Generated: 2026-05-05 13:51:08

Added:

- src\wingman2\utils\installWingmanFormFieldIdentityGuard.ts

Changed:

- src\main.tsx now installs the form field identity guard.

Reason:

Chrome Issues reported missing form field id/name attributes and duplicate form field ids. Finder contains repeated filter controls, so static ids can collide. The guard assigns stable unique ids and names at runtime across input, select and textarea controls.

Backup:

C:\Users\steve\wingman\backups\form-field-identity-guard-20260505-135107