# Wingman Dashboard CSS Risk Reduction

Generated: 2026-05-05 13:29:17

Changed:

- Replaced route-heavy Dashboard CSS with class-scoped Dashboard CSS.
- Removed duplicated body.wm-route-dashboard and body[data-wm-route="dashboard"] selectors.
- Reduced !important usage to a small cascade protection block.

Reason:

The first Dashboard restore fixed the layout but became the highest-risk active CSS file. This version keeps the Dashboard repair while making the CSS much easier to maintain.

Backup:

C:\Users\steve\wingman\backups\dashboard-css-risk-reduction-20260505-132916