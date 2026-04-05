# Strict Refactor Archive

Archived on `2026-04-04` during a repo cleanup pass focused on shrinking the live app surface.

What moved here:

- Backup snapshots such as `*.bak-*`.
- Placeholder files such as `New Text Document.txt`.
- Unreachable frontend code that was no longer referenced from `src/main.tsx`.
- Legacy theme/runtime layers replaced by the active `src/theme/ThemeProvider.tsx` flow.
- Obsolete `public/` assets after confirming Vite is configured to use `public-static/`.
- One-off repair/install PowerShell scripts from `tools/` and `scripts/`.
- Legacy server files that were no longer part of the active `server/package.json` entrypoints.

What stayed live:

- Frontend entrypoint: `src/main.tsx`
- Active theme provider: `src/theme/ThemeProvider.tsx`
- Active public asset directory: `public-static/`
- Active backend entrypoints: `npm --prefix server run dev` and `npm --prefix server run start`

This archive is intended to preserve recovery history while keeping the working tree focused on code that is still part of the running app.
