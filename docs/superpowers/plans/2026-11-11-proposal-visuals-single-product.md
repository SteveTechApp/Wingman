# Proposal Visuals Single Product Source Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Proposal Visuals understandable and useful when entered with one product, and clarify empty, generated, and save states.

**Architecture:** Keep the project-derived schematic engine and React Flow canvas. Add a bounded product-source adapter that uses the selected, catalogued SKU and explicitly marks all unspecified endpoints/connections as unconfirmed; route product discussion seeds into that adapter when no project is active. Replace the misleading empty-box preview with an instructional state, and gate room concepts and project saves on the context they actually need.

**Tech Stack:** React, TypeScript, existing Product Intelligence summary cache, native schematic/visual diagram models, React Flow, Tailwind and route-scoped CSS.

**Spec:** `docs/proposal-visuals-consolidation-audit.md`, especially Start screen, Shared workflow, and Output requirements.

## Global Constraints

- Never invent a product, port, cable, route, room dimension, or customer requirement.
- Keep real WyreStorm SKUs distinct from customer-supplied or unconfirmed equipment.
- Preserve project-derived diagrams and project asset revision saves.
- Product-only context can create a block diagram or technical product context view, but cannot create a room concept or save a project asset without a project.
- Empty states must tell the rep what to do next; generated diagrams must use the real canvas, not decorative placeholders.

---

### Task 1: Create a product-context visual model

**Files:**
- Create: `src/wingman2/lib/schematic/singleProductVisualDiagram.ts`
- Read: `src/wingman2/lib/visualStudioTypes.ts`
- Read: `src/wingman2/lib/schematic/wholeProjectVisualDiagram.ts`
- Modify: `src/wingman2/lib/visualStudioDiagramFactory.ts`
- Modify: `src/wingman2/components/VisualStudioCanvas.tsx`
- Modify: `src/wingman2/components/diagramPresentation.css`
- Read: `public/product-intelligence-summary.json`

**Interfaces:**
- Consumes: a product summary record from `loadProductIntelligenceSummary()`.
- Produces: `buildSingleProductVisualDiagram(product: Record<string, unknown>): VisualDiagramModel`.
- The model centers on the real SKU. Surrounding source/destination context is explicitly marked “confirm”; it does not assert a verified connection or technical port.

- [x] Inspect how the product summary stores SKU, name, category, family, inputs, outputs, and feature evidence.
- [x] Build a diagram model with one real SKU node and a review card; do not draw unconfirmed signal links; include plain-language assumptions and next actions.
- [x] Ensure the helper has no project-store dependency and no fabricated port/cable detail.
- [x] Show only signal types present in the model and label single-product output as product context.

### Task 2: Resolve product seeds and explain the workflow

**Files:**
- Modify: `src/wingman2/pages/ProposalVisualsPage.tsx`
- Read: `src/wingman2/pages/ProductCallCardsPage.tsx`
- Read: `src/wingman2/lib/productIntelligenceIndexCache.ts`

**Interfaces:**
- Reads query `seedSku` and the optional session seed from `wingman.visualStudio.productSeed`.
- Resolves the SKU against the current product intelligence summary before displaying/generating a visual.
- Active project remains the preferred source when present; otherwise a resolved product seed is a valid source for block and technical outputs.

- [x] Add loading, valid product, and unresolved SKU states; use catalogued product information as the authority and session seed only as contextual copy.
- [x] Present an explicit source summary (project or single product), and explain the three output types in terms of what they show.
- [x] Replace decorative empty boxes with concise instructions describing the selected output, source, and Generate action.
- [x] Enable Generate for product-source block/technical outputs; require a project for room concepts and disable it with a direct explanation.
- [x] Keep save-to-project unavailable without a project while leaving canvas exports usable.

### Task 3: Verify product and project paths

**Files:**
- Read/modify only if needed: `src/wingman2/pages/ProposalVisualsPage.*`
- Read/modify only if needed: `src/wingman2/lib/schematic/singleProductVisualDiagram.*`

- [x] Check representative product-source behavior for MX-0402-MST using the existing browser workflow.
- [x] Confirm the seeded product handoff resolves from the catalogue, and the generated product context displays the known name/connectors and an explicit application check without a signal route.
- [ ] Confirm a no-source visit and project-source generation/save behavior in browser; these are not required to validate the product handoff change.
- [x] Run the repository typecheck/build gate only if required to verify implementation; do not add tests unless requested. Vite build passed. Typecheck remains blocked by the existing readonly-family-array error in `catalogFiltering.test.ts:61`.

## Self-review

- The plan covers the product handoff, project workflow, output selection, empty state, product-only export, and save limitation.
- No product-only path claims unknown ports or a room layout.
- Existing project-derived diagram generation remains the technical source of truth for project context.
