# Wingman Production Audit

Date: 2026-03-28

## What Changed

- Consolidated the live global styling entrypoint to `src/styles/app.css` plus `src/styles/wm-enterprise-pass.css`.
- Removed duplicate or dead feature files for sales, templates, dashboard experiments, catalog experiments, legacy navigation helpers, and stray text/backup files.
- Switched the routed catalog page from hardcoded sample data to the real product dataset in `src/data/productService.ts`.
- Fixed the remaining lint warnings that were blocking a clean `npm run verify`.
- Normalized the live brand import to `src/assets/branding/heroLogo.png` for safer cross-platform builds.

## Verification

`npm run verify` passed on 2026-03-28.

- `typecheck`: pass
- `lint`: pass
- `build`: pass

## Current Readiness

Overall status: internal beta / pilot ready, not production ready.

### Ready or close

- Public shell, auth screens, dashboard shell, navigation, and routed tool pages now build cleanly and use a more consistent shared visual system.
- The catalog now uses real SKU data instead of placeholder sample products.
- Bundle output is stable after cleanup and route-level chunking still works.

### Production blockers

1. Authentication and session handling still allow demo-mode access and local fallback sessions.
   Files: `src/context/AuthContext.tsx`, `src/app/api/wingmanDeploymentClient.ts`, `src/context/UserContext.tsx`

2. Project state is still browser-local rather than durable multi-user backend state for the main workflows.
   Files: `src/features/projects/projectStore.ts`, `src/app/logic/wingmanProjectState.ts`, `src/app/logic/wingmanProjectPersistence.ts`

3. The product intelligence admin gate is client-side only and uses session storage, so it is not a real security boundary.
   File: `src/components/admin/ProductIntelligenceAdminGate.tsx`

4. Commercial BOM pricing still relies on placeholder pricing logic rather than production pricing or quoting data.
   File: `src/app/logic/wingmanBomIntelligence.ts`

5. Several workflow helpers still depend on local or session storage caches instead of audited server-side persistence.
   Files: `src/features/guru/GuruPage.tsx`, `src/features/discovery/discoveryStore.ts`, `src/features/systemDesign/designBundleStore.ts`, `src/features/import/importIntakeSupport.ts`

6. The repository no longer contains an active automated regression suite for end-to-end or unit tests.
   Removed files already indicate this gap: `e2e/*`, `playwright.config.ts`, `vitest.config.ts`

## Feature Readiness

- Public landing and auth: UI-ready, but auth model is not production-safe yet.
- Dashboard and navigation: ready for pilot use.
- Discovery, projects, room wizard, proposal: functional for internal use, but persistence and pricing keep them below production.
- Catalog: improved and usable, but still not a live backend catalog/search experience.
- Product intelligence and competitor tooling: internal-admin beta only.
- Guru: useful for pilot workflows, but still local-state heavy and should be treated as assisted tooling, not a controlled production system.

## Recommended Next Steps

1. Remove demo-mode and local auto-auth from the production deployment path.
2. Move project, proposal, and workflow persistence to the backend with role-aware access control.
3. Replace placeholder commercial pricing with controlled pricing inputs or a pricing service.
4. Reinstate automated test coverage for critical flows before any production release.
5. Replace client-side admin gating with backend authorization checks.
