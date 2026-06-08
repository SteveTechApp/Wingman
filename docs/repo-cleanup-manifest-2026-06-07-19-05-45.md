# Wingman repo cleanup manifest

Generated: 2026-06-07-19-05-45
Repo: C:\Users\Steve\Wingman
Archive: C:\Users\Steve\Wingman-archive\repo-cleanup-2026-06-07-19-05-45
Apply: True
RemoveDependencies: False

## Candidate actions

- ARCHIVE: backups -> C:\Users\Steve\Wingman-archive\repo-cleanup-2026-06-07-19-05-45\backups - Historical backup folders should be outside the active app root.
- ARCHIVE: reports -> C:\Users\Steve\Wingman-archive\repo-cleanup-2026-06-07-19-05-45\reports - Generated audits and reports should be outside the active repo root.
- ARCHIVE: dist -> C:\Users\Steve\Wingman-archive\repo-cleanup-2026-06-07-19-05-45\dist - Vite build output should be regenerated, not maintained manually.
- ARCHIVE: WyreStorm Wingman -> C:\Users\Steve\Wingman-archive\repo-cleanup-2026-06-07-19-05-45\WyreStorm Wingman - Likely duplicate or old exported project folder.
- SKIP DEPENDENCY: node_modules - add -RemoveDependencies to delete
- SKIP DEPENDENCY: server\node_modules - add -RemoveDependencies to delete

## .gitignore checks

- Ensure ignore rule: node_modules/
- Ensure ignore rule: server/node_modules/
- Ensure ignore rule: dist/
- Ensure ignore rule: reports/
- Ensure ignore rule: backups/
- Ensure ignore rule: .vite/
- Ensure ignore rule: .vite-temp/
- Ensure ignore rule: *.log

## Next audit command

Run this before moving old source folders:
rg -n "src/(components|features|styles)|../components|../features|../styles|server/server" src server tools package.json tsconfig*.json vite.config.*

