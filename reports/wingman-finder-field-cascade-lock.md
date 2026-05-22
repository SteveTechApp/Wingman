# Wingman Finder Field Cascade Lock

Generated: 2026-05-05 14:39:13

Changed:

- Cleaned reusable Finder select field class from old Tailwind light field styling to wm-finder-select.
- Added a small scoped Finder field cascade lock to beat global app input rules.
- Kept the lock inside body.wm-finder-surface-mode .wm-finder-page.

Reason:

DevTools showed global polish/page-host input rules with !important overriding Finder's compact 32px field sizing.

Backup:

C:\Users\steve\wingman\backups\finder-field-cascade-lock-20260505-143913