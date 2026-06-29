# Codex / PowerShell implementation instructions — Wingman redesign update

## Goal

Install the Wingman redesign update safely into the local Wingman repo.

The update has two layers:

1. **Required additive theme layer**
   - Add `src/wingman2/styles/wingman-redesign-theme.css`.
   - Import it once in `src/main.tsx` immediately after `wingman-style-stack.css`.
   - Do not directly edit the large `wingman-style-stack.css` unless a later targeted fix proves unavoidable.

2. **Optional structural Dashboard layer**
   - Replace/update `src/wingman2/pages/DashboardPage.tsx` only if the supplied update pack includes the replacement file.
   - Preserve all previously exported constants and route behaviour.
   - Wire the dashboard to the real `useProjectStore()` data, not hardcoded mock data.

## Source facts from the design analysis

The design analysis says the theme can be installed as a drop-in override by adding one import after the existing style stack and copying `wingman-redesign-theme.css` into `src/wingman2/styles/`. It also says the approach works by retuning the existing `--wm-*`, `--wm-uniform-*`, and `--wm-consistency-*` token systems, with near-white headings, aqua accents, flat hairline panels, one radius scale, lighter weights, and an aqua active-nav state.

The later structural dashboard pass identifies two files to apply:

- `src/wingman2/pages/DashboardPage.tsx`
- `src/wingman2/styles/wingman-redesign-theme.css`

The Dashboard should include:

- hero call-to-actions
- resume-last-project card
- active-projects rail
- real `useProjectStore()` wiring
- real `resumeTo` links
- `setActiveProjectId` on click
- retained existing exported constants
- dashboard styles under `wm-dash-*`
- fix for the legacy home-page link rule that forces large `min-height:150px` card links

## Files expected in the update pack

Place these beside `install-wingman-redesign-update.ps1`, or in the same repo-relative folders under the script folder:

```text
wingman-redesign-theme.css
DashboardPage.tsx                  # optional structural dashboard
REDESIGN-INSTALL.md                # optional; script can generate a basic one
```

or:

```text
src/wingman2/styles/wingman-redesign-theme.css
src/wingman2/pages/DashboardPage.tsx
REDESIGN-INSTALL.md
```

## PowerShell install command

From PowerShell:

```powershell
Set-Location C:\Users\steve\wingman
PowerShell -ExecutionPolicy Bypass -File C:\path\to\install-wingman-redesign-update.ps1 -RepoRoot C:\Users\steve\wingman -RunTests
```

To skip the structural Dashboard replacement:

```powershell
PowerShell -ExecutionPolicy Bypass -File C:\path\to\install-wingman-redesign-update.ps1 -RepoRoot C:\Users\steve\wingman -SkipStructuralDashboard
```

To install and commit in one run:

```powershell
PowerShell -ExecutionPolicy Bypass -File C:\path\to\install-wingman-redesign-update.ps1 -RepoRoot C:\Users\steve\wingman -RunTests -Commit
```

## Codex implementation task

Use this as the implementation brief:

```text
You are working in the Wingman repo.

Implement the Wingman redesign update safely.

Requirements:
1. Do not rewrite the whole app.
2. Do not directly edit the large base stylesheet unless absolutely necessary.
3. Add or update src/wingman2/styles/wingman-redesign-theme.css as an additive override layer.
4. Ensure src/main.tsx imports the redesign theme exactly once, immediately after:
   import "./wingman2/styles/wingman-style-stack.css";
5. If a supplied DashboardPage.tsx replacement exists, apply it to src/wingman2/pages/DashboardPage.tsx.
6. Preserve all existing exports from DashboardPage.tsx so existing tests continue to pass.
7. DashboardPage.tsx must use the real useProjectStore() data, including projects, resumeTo links, and setActiveProjectId on click.
8. Dashboard must include hero CTAs, a resume-last-project card, and an active-projects rail.
9. Theme CSS must include wm-dash-* structural styles and neutralise the legacy home-page link rule that forces min-height:150px / oversized pill buttons onto dashboard links.
10. Keep headings near-white and reserve aqua for accents, active nav, labels, and interaction highlights.
11. Use flatter panels, hairline borders, one consistent radius scale, reduced glow, and lighter font weights.
12. Confirm that the dashboard rail is three-up at desktop width and stacks below roughly 1100px.
13. Ensure status chips do not wrap awkwardly.
14. Run npm run build.
15. Run the available test script if present.
16. Show git diff --stat and git status --short before committing.
```

## Manual verification checklist

After install, verify:

- `src/main.tsx` contains exactly one redesign-theme import.
- `wingman-style-stack.css` remains untouched unless there is a separate deliberate fix.
- `wingman-redesign-theme.css` exists in `src/wingman2/styles/`.
- Dashboard loads without white-on-white text.
- Sidebar active state remains visible.
- Dashboard hero CTAs do not balloon into large pill cards.
- Resume card uses real project data.
- Active projects rail links resume into the correct project route.
- `npm run build` passes.
- `git diff --stat` only shows intended files.

## Rollback

The installer creates a timestamped backup folder named similar to:

```text
_wingman_backup_redesign_update_YYYYMMDD-HHMMSS
```

Rollback steps:

```powershell
# 1. Restore backed-up files manually from the backup folder.
# 2. Remove this import from src/main.tsx:
#    import "./wingman2/styles/wingman-redesign-theme.css";
# 3. Re-run:
npm run build
```

## Recommended commit message

```text
Install Wingman redesign theme and structural dashboard
```
