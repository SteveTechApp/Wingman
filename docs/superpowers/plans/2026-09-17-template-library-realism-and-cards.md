# Template Library Realism and Card Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor every template-library surface to use application imagery and useful descriptions while making all 55 room designs governed, realistic, proportionate, and traceable to active WyreStorm SKUs.

**Architecture:** Add an explicit application-profile layer beside the existing template BOM data, then derive card facts, visual selection, publication readiness, and detail-page content from that layer. Replace the two divergent library tile/card renderers with one component, and replace the universal third-party placeholder expansion with capability-driven scope generation. Keep the existing editable BOM and proposal handoff contracts intact.

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library, CSS, existing Wingman product-intelligence index and room-template libraries.

**Spec:** `docs/superpowers/specs/2026-09-17-template-library-realism-and-cards.md`

## Global Constraints

- Preserve the existing `RoomTemplate`, editable BOM, custom-template, proposal, and discovery handoff behaviour.
- Use `npx tsc --noEmit -p tsconfig.typecheck.json`; the default TypeScript config is not the full gate.
- Run Vitest through `npx vitest run`; do not use raw `node --test`.
- Do not raise size or style-drift budgets without the documented exception process.
- All published templates must resolve active SKUs, use canonical markets, expose an explicit image key and sizing basis, and contain at least one Required governed WyreStorm row.
- Essential card information must remain visible without hover and usable by keyboard and touch.

---

### Task 1: Define governed application profiles and audit rules

**Files:**
- Create: `src/wingman2/lib/templateApplicationProfiles.ts`
- Create: `src/wingman2/lib/templateApplicationProfiles.test.ts`
- Modify: `src/wingman2/lib/roomTemplates.ts`
- Modify: `src/wingman2/lib/customRoomTemplates.ts`

**Interfaces:**
- Consumes: existing `RoomTemplate`, `TemplateBomRow`, and canonical market values from `templateMarkets.ts`.
- Produces: `TemplateApplicationProfile`, `TemplateArchitectureFamily`, `TemplateCapability`, `TemplateReviewStatus`, `getTemplateApplicationProfile(template)`, and `templateDesignFacts(template)`.

- [ ] **Step 1: Write failing profile coverage tests**

```ts
import { describe, expect, it } from "vitest";
import { roomTemplates } from "./roomTemplates";
import { getTemplateApplicationProfile, templateDesignFacts } from "./templateApplicationProfiles";

describe("template application profiles", () => {
  it("profiles every published template with a reviewed real-world design basis", () => {
    for (const template of roomTemplates) {
      const profile = getTemplateApplicationProfile(template);
      expect(profile.reviewStatus).toBe("reviewed");
      expect(profile.imageKey).toBeTruthy();
      expect(profile.userJourney.length).toBeGreaterThan(40);
      expect(profile.sizingBasis.length).toBeGreaterThan(0);
      expect(profile.capabilities.length).toBeGreaterThan(0);
      expect(templateDesignFacts(template).requiredSkuCount).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Run the test and verify that profiles are missing**

Run: `npx vitest run src/wingman2/lib/templateApplicationProfiles.test.ts`

Expected: FAIL because `templateApplicationProfiles.ts` does not exist.

- [ ] **Step 3: Add the profile contract and derived facts**

```ts
export type TemplateArchitectureFamily = "Local UC" | "HDBaseT" | "Matrix" | "AV over IP" | "Video wall" | "Hybrid";
export type TemplateCapability = "video" | "audio" | "microphones" | "uc" | "control" | "network" | "recording" | "signage" | "resilience" | "accessibility";
export type TemplateReviewStatus = "reviewed" | "needs-review";

export type TemplateApplicationProfile = {
  templateId: string;
  canonicalMarket: string;
  architectureFamily: TemplateArchitectureFamily;
  imageKey: string;
  userJourney: string;
  sizingBasis: string[];
  capabilities: TemplateCapability[];
  environmentConstraints: string[];
  inclusions: string[];
  exclusions: string[];
  reviewStatus: TemplateReviewStatus;
  reviewNotes: string[];
};

export type TemplateDesignFacts = {
  requiredSkuCount: number;
  sourceEndpointCount: number;
  outputEndpointCount: number;
  architectureFamily: TemplateArchitectureFamily;
};
```

Store the 55 reviewed records in `TEMPLATE_APPLICATION_PROFILES`, keyed by exact template ID. `getTemplateApplicationProfile` must throw for an unprofiled published template and derive a conservative `needs-review` profile for a custom template. `templateDesignFacts` must count only non-`BY-OTHERS` rows and derive endpoint quantities from the profile's authored sizing basis and BOM roles.

- [ ] **Step 4: Extend custom-template persistence without breaking old records**

Add optional `applicationProfile?: TemplateApplicationProfile` support to custom templates. On deserialisation, generate a `needs-review` profile from the saved application, scale, and BOM when the field is absent.

- [ ] **Step 5: Run profile and custom-template tests**

Run: `npx vitest run src/wingman2/lib/templateApplicationProfiles.test.ts src/__tests__/templateMarketFiltersAndCustomTemplates.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/wingman2/lib/templateApplicationProfiles.ts src/wingman2/lib/templateApplicationProfiles.test.ts src/wingman2/lib/roomTemplates.ts src/wingman2/lib/customRoomTemplates.ts
git commit -m "feat(templates): add governed application profiles"
```

### Task 2: Replace universal placeholders with capability-driven design scope

**Files:**
- Modify: `src/wingman2/lib/roomTemplatePlaceholders.ts`
- Modify: `src/wingman2/lib/roomTemplatePlaceholders.test.ts`
- Modify: `src/wingman2/lib/roomTemplates.ts`
- Modify: `src/wingman2/lib/roomTemplatesExtra.ts`

**Interfaces:**
- Consumes: `TemplateCapability[]` and application profiles from Task 1.
- Produces: `designScopeRows(prefix, capabilities, extras)` and capability-appropriate BOM scope.

- [ ] **Step 1: Write failing capability-scope tests**

```ts
it("does not add meeting-room audio scope to silent signage", () => {
  const rows = designScopeRows("qsr", ["video", "signage", "network"]);
  expect(rows.some((row) => /microphone|aec|audio capture/i.test(`${row.role} ${row.description}`))).toBe(false);
});

it("adds resilience and network validation to operational control rooms", () => {
  const rows = designScopeRows("noc", ["video", "control", "network", "resilience"]);
  expect(rows.some((row) => /redundan|failover|ups|recovery/i.test(`${row.description} ${row.notes}`))).toBe(true);
});
```

- [ ] **Step 2: Run tests and verify universal rows fail the assertions**

Run: `npx vitest run src/wingman2/lib/roomTemplatePlaceholders.test.ts`

Expected: FAIL because `completeDesignPlaceholders` adds audio/microphone/speaker rows to every application.

- [ ] **Step 3: Implement the capability-to-scope map**

Create a typed map where `video` supplies output/mounting/cabling, `audio` supplies DSP/speaker scope, `microphones` supplies capture, `uc` supplies camera/compute/licensing, `control` supplies UI/programming, `network` supplies switch/VLAN/PoE, `recording` supplies capture/storage, `resilience` supplies UPS/failover/spares, `accessibility` supplies assistive listening/captioning, and all applications retain labour, commissioning, and project-delivery rows.

- [ ] **Step 4: Update template expansion to consume the exact profile capabilities**

Change `withRequiredRoomElements(template)` to call `getTemplateApplicationProfile(template)` and merge only missing semantic roles. Preserve explicitly authored third-party rows and avoid duplicates.

- [ ] **Step 5: Fix the three templates with no Required governed row**

Review their existing architecture and convert the chosen core routing product to `Required` only when the documented sizing basis supports it. If more discovery is genuinely required, split the template into a concrete baseline design plus an alternative rather than leaving every governed row as Validate.

- [ ] **Step 6: Run room-template contract tests**

Run: `npx vitest run src/wingman2/lib/roomTemplates.test.ts src/wingman2/lib/roomTemplatePlaceholders.test.ts src/wingman2/lib/solutionTemplates.defaults.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/wingman2/lib/roomTemplatePlaceholders.ts src/wingman2/lib/roomTemplatePlaceholders.test.ts src/wingman2/lib/roomTemplates.ts src/wingman2/lib/roomTemplatesExtra.ts
git commit -m "refactor(templates): tailor design scope to room capabilities"
```

### Task 3: Add publication-time realism and SKU governance checks

**Files:**
- Create: `tools/check-template-realism.mjs`
- Create: `tools/check-template-realism.test.mjs`
- Modify: `package.json`
- Modify: `src/wingman2/lib/solutionTemplates.ts`
- Modify: `src/wingman2/lib/solutionTemplates.defaults.test.ts`

**Interfaces:**
- Consumes: room templates, application profiles, `public/product-intelligence-index.json`, suppression/lifecycle data.
- Produces: `npm run check:template-realism`, structured findings, and stricter `validatePublishedTemplate` results.

- [ ] **Step 1: Write failing audit tests**

```js
it("rejects an unknown required SKU", () => {
  const findings = auditTemplates([fixture({ sku: "NOT-A-SKU" })], catalogueFixture);
  expect(findings).toContainEqual(expect.objectContaining({ code: "unknown-sku", severity: "error" }));
});

it("rejects an output quantity with no sizing statement", () => {
  const findings = auditTemplates([fixture({ sizingBasis: [] })], catalogueFixture);
  expect(findings).toContainEqual(expect.objectContaining({ code: "missing-sizing-basis", severity: "error" }));
});
```

- [ ] **Step 2: Run the tests and verify the audit module is missing**

Run: `npx vitest run tools/check-template-realism.test.mjs`

Expected: FAIL.

- [ ] **Step 3: Implement audit codes and command output**

Audit for `unknown-sku`, `suppressed-sku`, `noncanonical-market`, `missing-required-core`, `missing-sizing-basis`, `unprofiled-template`, `unreviewed-template`, `missing-image-key`, `capability-scope-mismatch`, `duplicate-semantic-row`, and implausible endpoint ratios such as zero receivers for an AV-over-IP display design. Print one line per finding and exit non-zero for errors.

- [ ] **Step 4: Wire the audit into repository verification**

Add `"check:template-realism": "node tools/check-template-realism.mjs"` and include it in the existing data/contract verification chain without changing ratchet budgets.

- [ ] **Step 5: Extend published-template validation**

Return human-readable issues for an unreviewed profile, missing sizing basis, absent image key, no required governed row, or unresolved SKU. Keep custom templates draft-safe rather than pretending they are published.

- [ ] **Step 6: Run the new audit and existing data gates**

Run: `npm run check:template-realism && npm run verify:data`

Expected: PASS with 55 reviewed templates and zero error findings.

- [ ] **Step 7: Commit**

```bash
git add tools/check-template-realism.mjs tools/check-template-realism.test.mjs package.json src/wingman2/lib/solutionTemplates.ts src/wingman2/lib/solutionTemplates.defaults.test.ts
git commit -m "test(templates): enforce realistic governed designs"
```

### Task 4: Make image selection explicit and application-specific

**Files:**
- Modify: `src/wingman2/lib/templateImages.ts`
- Create: `src/wingman2/lib/templateImages.test.ts`
- Add as required: `public/template-photos/photo-<application>.jpg`
- Modify: `public/template-photos/README.md`

**Interfaces:**
- Consumes: `TemplateApplicationProfile.imageKey`.
- Produces: `templateImageFor(template)` with no keyword or boardroom fallback for published templates.

- [ ] **Step 1: Write failing explicit-image tests**

```ts
it("uses the reviewed profile image key for every published template", () => {
  for (const template of roomTemplates) {
    const src = templateImageFor(template);
    expect(src).toContain(`/template-photos/${getTemplateApplicationProfile(template).imageKey}`);
    expect(src).not.toContain("room-boardroom.jpg");
  }
});
```

- [ ] **Step 2: Run the test and verify keyword fallback failures**

Run: `npx vitest run src/wingman2/lib/templateImages.test.ts`

Expected: FAIL for templates currently routed by keywords or the generic boardroom fallback.

- [ ] **Step 3: Replace keyword matching with profile lookup**

Resolve published images from `imageKey`. Custom templates may use their saved profile image or the neutral `vertical-all.jpg` fallback and must carry `needs-review` state.

- [ ] **Step 4: Audit image reuse and add missing application photos**

For each reused image, confirm that it depicts the same workflow and room form. Add assets for materially distinct cases such as courtroom, house of worship, private cinema, airport/FIDS, clinical theatre, QSR menu boards, broadcast studio, and network operations centre. Record source/licence and intended template IDs in the README.

- [ ] **Step 5: Run image tests**

Run: `npx vitest run src/wingman2/lib/templateImages.test.ts`

Expected: PASS and no missing asset paths.

- [ ] **Step 6: Commit**

```bash
git add src/wingman2/lib/templateImages.ts src/wingman2/lib/templateImages.test.ts public/template-photos
git commit -m "feat(templates): map reviewed application imagery"
```

### Task 5: Build one information-rich template card for all library views

**Files:**
- Create: `src/wingman2/components/TemplateLibraryCard.tsx`
- Create: `src/wingman2/components/TemplateLibraryCard.test.tsx`
- Modify: `src/wingman2/pages/TemplatesPage.tsx`
- Modify: `src/wingman2/styles/wingman-workflow-theme.css`
- Remove after verification: `src/wingman2/lib/templatesCardExpansion.ts`

**Interfaces:**
- Consumes: template, application profile, design facts, custom-template management callbacks.
- Produces: `TemplateLibraryCard` used by All, filtered, and custom views.

- [ ] **Step 1: Write failing rendered-card tests**

```tsx
render(<TemplateLibraryCard template={template} onReview={vi.fn()} onPersonalise={vi.fn()} />);
expect(screen.getByRole("img", { name: /corporate huddle room/i })).toBeVisible();
expect(screen.getByText(template.summary)).toBeVisible();
expect(screen.getByText(template.scale)).toBeVisible();
expect(screen.getByText(/1 required sku/i)).toBeVisible();
expect(screen.getByRole("button", { name: /review design/i })).toBeVisible();
expect(screen.getByRole("button", { name: /personalise/i })).toBeVisible();
```

- [ ] **Step 2: Run the component test and verify the component is missing**

Run: `npx vitest run src/wingman2/components/TemplateLibraryCard.test.tsx`

Expected: FAIL.

- [ ] **Step 3: Implement the shared card**

Use a 16:9 `<figure>` with application image, canonical market badge, and review state; a body with title, scale, two-line visible summary, and a compact facts row; and a footer with `Review design` and `Personalise`. Preserve custom-template Edit / Duplicate / Delete in an overflow details menu.

- [ ] **Step 4: Replace both TemplatesPage render branches**

Delete the `market === ALL_MARKET_FILTER` text-only tile branch. Map every result through `TemplateLibraryCard`, pass callbacks, and keep filtering behaviour unchanged.

- [ ] **Step 5: Replace accumulated hover-expansion CSS**

Remove fixed four-by-four row sizing, 70px image strips, tooltip-only purpose, and hover-dependent action-height rules. Use responsive `repeat(auto-fill, minmax(280px, 1fr))`, consistent card height, visible two-line summary, `aspect-ratio: 16 / 9`, `object-fit: cover`, and a mobile single-column layout. Preserve visible focus and reduced-motion behaviour.

- [ ] **Step 6: Run rendered workflow tests**

Run: `npx vitest run src/wingman2/components/TemplateLibraryCard.test.tsx src/__tests__/templateWorkflowRendered.test.tsx src/__tests__/templateMarketFiltersAndCustomTemplates.test.tsx`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/wingman2/components/TemplateLibraryCard.tsx src/wingman2/components/TemplateLibraryCard.test.tsx src/wingman2/pages/TemplatesPage.tsx src/wingman2/styles/wingman-workflow-theme.css src/wingman2/lib/templatesCardExpansion.ts
git commit -m "refactor(templates): use visual application brief cards"
```

### Task 6: Carry the application brief into preview and template detail pages

**Files:**
- Modify: `src/wingman2/pages/TemplatesPage.tsx`
- Modify: `src/wingman2/pages/TemplateReviewPage.tsx`
- Modify: `src/wingman2/styles/wingman-workflow-theme.css`
- Modify: `src/__tests__/templateWorkflowRendered.test.tsx`

**Interfaces:**
- Consumes: profile/image/facts from Tasks 1 and 4.
- Produces: consistent preview drawer, detail hero, and Overview content.

- [ ] **Step 1: Add failing detail-page assertions**

```tsx
expect(screen.getByRole("img", { name: /boardroom/i })).toBeVisible();
expect(screen.getByText(/sizing basis/i)).toBeVisible();
expect(screen.getByText(profile.userJourney)).toBeVisible();
expect(screen.getByText(profile.architectureFamily)).toBeVisible();
expect(screen.getByText(/third-party scope/i)).toBeVisible();
```

- [ ] **Step 2: Run the workflow test and verify the new application brief is absent**

Run: `npx vitest run src/__tests__/templateWorkflowRendered.test.tsx`

Expected: FAIL.

- [ ] **Step 3: Upgrade the preview drawer**

Place the application image and visible summary first, followed by user journey, architecture family, sizing basis, included WyreStorm scope, third-party boundary, assumptions, and unresolved validation items. Keep personalisation controls and actions unchanged.

- [ ] **Step 4: Upgrade the detail header and Overview tab**

Add the same image/facts in a compact hero. Ensure Overview explains what users do in the room, why the selected architecture fits, what quantities are based on, what is supplied by WyreStorm, and what still requires third-party selection or site validation.

- [ ] **Step 5: Verify touch, keyboard, and responsive behaviour**

At 1440x900 and 390x844, confirm no text or actions require hover, tabs remain keyboard navigable, images crop without distortion, and Equipment/Proposal workflows remain unchanged.

- [ ] **Step 6: Run the route tests**

Run: `npx vitest run src/__tests__/templateWorkflowRendered.test.tsx src/__tests__/proposalVisualTemplateHandoff.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/wingman2/pages/TemplatesPage.tsx src/wingman2/pages/TemplateReviewPage.tsx src/wingman2/styles/wingman-workflow-theme.css src/__tests__/templateWorkflowRendered.test.tsx
git commit -m "feat(templates): show governed application briefs"
```

### Task 7: Produce the template review report and run full verification

**Files:**
- Create: `docs/template-library-application-review.md`
- Modify: `docs/CURRENT_STATUS.md`
- Modify only if generated by existing commands: governed product/index artifacts.

**Interfaces:**
- Consumes: audit results and reviewed profiles from Tasks 1–6.
- Produces: a human-readable review matrix for all 55 templates and verified release evidence.

- [ ] **Step 1: Generate the review matrix**

For every template record: market, real-world application, intended scale, architecture family, required/validate/optional SKU counts, source/output quantities, image key, review status, corrections made, and remaining site-specific checks. Explicitly call out the three formerly no-required-core templates and every corrected third-party-scope mismatch.

- [ ] **Step 2: Run the focused verification chain**

Run: `npm run check:template-realism && npx vitest run src/wingman2/lib/roomTemplates.test.ts src/wingman2/lib/templateApplicationProfiles.test.ts src/wingman2/lib/templateImages.test.ts src/wingman2/components/TemplateLibraryCard.test.tsx src/__tests__/templateWorkflowRendered.test.tsx src/__tests__/templateMarketFiltersAndCustomTemplates.test.tsx`

Expected: PASS.

- [ ] **Step 3: Run typecheck and build**

Run: `npx tsc --noEmit -p tsconfig.typecheck.json && npm run build`

Expected: PASS; existing chunk warnings may remain but no new template-specific warning or error is introduced.

- [ ] **Step 4: Perform visual QA**

Capture and review All, Corporate, Education, Hospitality, Healthcare, Government, Control Rooms, and custom-template library views plus one detail page at desktop and mobile sizes. Confirm useful image crops, visible descriptions, consistent actions, no hover-only information, no overflow, and accurate fact labels.

- [ ] **Step 5: Update status documentation**

Record the 55-template audit result, governance command, test evidence, and any intentionally deferred application-photo work in `docs/CURRENT_STATUS.md` without claiming production readiness beyond the evidence.

- [ ] **Step 6: Commit**

```bash
git add docs/template-library-application-review.md docs/CURRENT_STATUS.md
git commit -m "docs(templates): record application realism review"
```

## Self-review

- Spec coverage: card imagery/text, all library views, detail-page continuity, template realism, proportional quantities, governed SKUs, third-party scope, canonical markets, image governance, tests, and visual QA each map to a task.
- Placeholder scan: no TBD/TODO or unspecified implementation step remains.
- Type consistency: Tasks 2–7 consume the exact `TemplateApplicationProfile`, `TemplateCapability`, `getTemplateApplicationProfile`, and `templateDesignFacts` interfaces introduced in Task 1.
