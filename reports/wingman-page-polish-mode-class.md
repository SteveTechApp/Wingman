# Wingman Page Polish Mode Class

Generated: 2026-05-05 13:10:16

Changed:

- Replaced the route-heavy polish contract with a lower-risk class-based contract.
- Added src\wingman2\utils\installWingmanPagePolishMode.ts.
- Body class used: wm-polish-page.

Protected routes:

- discovery
- call-cards / callCards

Reason:

The previous polish contract became the highest-risk active CSS file. This version avoids route-specific selector sprawl and applies a lighter visual contract to weaker pages.

Backup:

C:\Users\steve\wingman\backups\page-polish-mode-class-20260505-131015