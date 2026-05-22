# Wingman Guru Overlay Retirement

Generated: 2026-05-05 13:22:26

Added:

- src\wingman2\styles\wingman-guru-overlay-retirement.css

Reason:

The old Guru FAB/backdrop/drawer is still present in the DOM and has competing CSS. The app should use the new floating Guidance launcher only.

Retired selectors:

- .wingman-guru-fab
- .wingman-guru-backdrop
- .wingman-guru-drawer

Kept active:

- #wm-floating-guidance-root
- .wm-floating-guidance

Backup:

C:\Users\steve\wingman\backups\retire-old-guru-fab-overlay-20260505-132226