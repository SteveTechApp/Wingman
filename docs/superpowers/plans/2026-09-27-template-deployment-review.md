# Complete AV room concepts and template BOM review

> Implementation will run inline in this chat, using the existing feature branch and preserving template IDs and saved custom designs.

**Goal:** Review all 59 published designs, size each transport to the actual deployment, and publish a persuasive concept with a complete supplier-neutral system schedule.

**Architecture:** Replace the verbose equipment-led template records with explicitly authored deployment records and a shared, deterministic BOM builder. Keep the public RoomTemplate interface compatible; add a structured concept and I/O schedule. Render that concept in the existing overview and carry it into proposal output and saved projects.

**Tech Stack:** TypeScript, React, Vitest, existing Vite audit and proposal pipelines.

**Spec:** The request in this chat on 27 September 2026; manufacturer references and per-template decisions will be recorded in `docs/WINGMAN_TEMPLATE_DEPLOYMENT_REVIEW_2026-09-27.md`.

## Constraints

- Cover all 59 IDs; do not silently retire links or overwrite saved custom templates.
- Room dimensions, construction, occupancy and distances are stated assumptions, never surveyed facts.
- Prefer local switching/HDBaseT/fixed matrices for bounded rooms. Retained NetworkHD needs an explicit distribution requirement and endpoint count.
- Sources, displays, mounting, audio, microphones/UC where used, control, network, power, cabling and delivery must have a quantity or a clearly labelled measured allowance.
- Third-party scope remains editable with manufacturer, model and supplier; include it in whole-system output.
- Do not invent human verification, product compatibility, safety certification or clinical approval.
- Do not raise size or style baselines to pass checks.

## Tasks

- [x] Inventory all published templates and manufacturer evidence; record old and revised architectures and counts.
- [x] Add `roomTemplateDeployment.ts` for typed source/output schedules, topology selection, complete scope and concept composition. Author every design in the existing three template data modules.
- [x] Verify examples: a four-source/three-output boardroom has no NHD; matrix outputs have matching receivers or complete extender sets; large NHD layouts have one transport endpoint per scheduled physical input/output; microphones and UC do not appear in silent signage.
- [x] Add `TemplateConceptOverview.tsx`; show environment, function, I/O schedule, architecture reason and supplier responsibilities in the Overview tab. Correct BY-OTHERS prefix handling and preserve supplier entries in BOM exports.
- [x] Carry concept and physical assumptions through `proposalCompiler.ts`; preserve custom-template compatibility and avoid labelling assumed parameters as verified.
- [x] Update template audits to inspect the published runtime catalogue instead of regex-scanning old literal files. Test all IDs for complete concepts, coherent counts, unique row IDs, active SKUs and correct architecture classifications.
- [x] Run typecheck, focused template/proposal/rendered tests, template realism/signal-path/lifecycle checks, build and browser verification. Review the generated all-template audit and the rendered overview.

## Verification commands

```powershell
npm run typecheck
npx vitest run src/wingman2/lib/roomTemplateDeployment.test.ts src/wingman2/lib/roomTemplates.test.ts src/wingman2/lib/roomTemplatesEmergency.test.ts src/wingman2/lib/roomTemplatePlaceholders.test.ts src/wingman2/lib/templateApplicationProfiles.test.ts
npm run check:template-realism
npm run check:template-signal-path
npm run check:template-sku-lifecycle
npm run build
```

## Verification outcome

All 59 runtime templates pass realism, signal-path and active-SKU audits. Typecheck, lint, focused tests, production compilation, contract and visual/proposal-parity checks pass. Browser inspection confirmed the concept, zone controls narrative, steerable-system scope, acoustic treatment and editable supplier fields. The CSS size gate remains above its existing limit: the original template-only change added 38 Tailwind bytes; subsequent UI changes compact the template context strip and add the Guru dismiss button. The existing product-profile freshness gate still needs genuine owner confirmation; neither budget nor review records were altered to bypass gates.

## Follow-up scope (28 September)

Discovery now asks about independent listening areas, programme versus voice requirements, and physical/acoustic conditions. Its derived audio direction, complete supplier allowances and validation questions flow into saved briefs, exports and proposals. The template context strip no longer inherits a 280px hero minimum height; Guru has an accessible session dismiss button.
