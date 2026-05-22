# Wingman Dashboard Selector Match

Generated: 2026-05-05 13:34:06

Changed:

- Updated Dashboard layout CSS to match the actual DashboardPage.tsx classes.
- Replaced stale selectors:
  - wm-command-tone-card
  - wm-command-workflow-card
  - wm-command-dashboard__workflow
  - wm-command-dashboard__row
- Matched actual selectors:
  - wm-command-dashboard__tone-card
  - wm-command-dashboard__workflow-grid
  - wm-command-dashboard__workflow-card
  - wm-command-dashboard__table-row
  - wm-command-dashboard__row-actions

Reason:

Dashboard CSS was active and low-risk, but several selectors did not match the actual Dashboard markup.

Backup:

C:\Users\steve\wingman\backups\dashboard-selector-match-20260505-133405