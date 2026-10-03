# Dynamic Battle Cards Implementation Plan

**Status:** Complete — implemented and verified on `codex/dynamic-battle-cards`.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace generic eight-row Battle Cards with evidence-backed, product-class layout families centred on structured physical connections and capabilities.

**Architecture:** Extend `SpecSheet` with normalized connection groups and tri-state capabilities, populate them only from governed catalogue/profile fields, then derive a shared semantic card schema from the competitor and selected WyreStorm sheet. `BattleCard` renders that schema so both cards use corresponding sections while empty or inapplicable groups disappear.

**Tech Stack:** React 18, TypeScript, Vitest, Testing Library, CSS.

**Spec:** `C:/Users/steve/.codex/attachments/11ed584c-3dbb-42be-9054-cf3fe6cdba71/pasted-text.txt`

## Global Constraints

- Never infer a connector or capability from missing evidence merely to fill a card.
- `Not verified`, `Not supported`, and `Not applicable` remain distinct states.
- Connector type and quantity must be independently represented.
- The same `SpecSheet` evidence remains the source for cards, Proof, and the one-pager.
- Compare styling remains scoped to the compare route in `wingman-workflow-theme.css`.
- Validate with `npx tsc --noEmit -p tsconfig.typecheck.json` and targeted Vitest suites.

---

### Task 1: Structured comparison model and normalization

**Files:**
- Modify: `src/wingman2/lib/compareSpecEngine.ts`
- Test: `src/wingman2/lib/compareSpecEngine.test.ts`

**Interfaces:**
- Produces: `ConnectionItem`, `SpecConnections`, `CapabilityState`, `SpecCapabilities`, and populated `SpecSheet.connections` / `SpecSheet.capabilities`.

- [ ] **Step 1: Write failing normalization tests**

Assert competitor input/output arrays retain connector-specific counts and governed WyreStorm ports populate video, USB, network, audio, and control groups without prose inference.

- [ ] **Step 2: Run the targeted engine suite and verify failure**

Run: `npx vitest run src/wingman2/lib/compareSpecEngine.test.ts`

- [ ] **Step 3: Add normalized types and fail-closed helpers**

Define connection items as `{ type, count, detail? }`, connection groups as explicit arrays, and capability values as `true | false | null` where null means not verified. Normalize only structured catalogue arrays, technical-profile ports, and governed feature keys.

- [ ] **Step 4: Populate both normalizers**

Populate competitor connections from structured `inputs` / `outputs` plus explicit audio/control arrays. Populate WyreStorm connections from `technicalProfile.io.ports` or governed `ports`; map explicit feature booleans for wireless casting, BYOM, multiview, scaling, video wall, and KVM.

- [ ] **Step 5: Run the engine suite**

Run: `npx vitest run src/wingman2/lib/compareSpecEngine.test.ts`

### Task 2: Product-class card schema and renderer

**Files:**
- Modify: `src/wingman2/components/compare/BattleCard.tsx`
- Create: `src/wingman2/components/compare/BattleCard.test.tsx`

**Interfaces:**
- Consumes: `SpecSheet.connections`, `SpecSheet.capabilities`.
- Produces: `BattleCardLayout`, `BattleCardSection`, `buildBattleCardLayout(sheet, counterpart?)`, and the dynamic `BattleCard` UI.

- [ ] **Step 1: Write layout-family tests**

Cover Switcher/Matrix, AV-over-IP, Extender/HDBaseT, Distribution, Wireless/UC, Video Processing, and Specialist layouts. Assert connector quantities are readable, irrelevant empty sections disappear, and unsupported differs from unverified.

- [ ] **Step 2: Run the component test and verify failure**

Run: `npx vitest run src/wingman2/components/compare/BattleCard.test.tsx`

- [ ] **Step 3: Implement layout selection and semantic sections**

Map `specClass` to seven layout families. Build ordered connection, capability, transport, and performance sections with layout-specific priorities; include counterpart groups only when needed for semantic alignment.

- [ ] **Step 4: Replace trading-card markup**

Render a compact identity header, product-class/role subtitle, grouped connector chips, capability states, and performance facts. Preserve article accessible names and evidence footnotes.

- [ ] **Step 5: Run the component test**

Run: `npx vitest run src/wingman2/components/compare/BattleCard.test.tsx`

### Task 3: Aligned showdown integration and presentation

**Files:**
- Modify: `src/wingman2/components/compare/CompareShowdown.tsx`
- Modify: `src/wingman2/components/compare/CompareShowdown.test.tsx`
- Modify: `src/wingman2/styles/wingman-workflow-theme.css`

**Interfaces:**
- Consumes: dynamic `BattleCard` and shared counterpart-driven section alignment.
- Produces: paired cards with corresponding information architecture and preserved Proof/one-pager behavior.

- [ ] **Step 1: Update showdown tests**

Assert paired cards show corresponding connection section labels and no longer render explanatory italic stat paragraphs.

- [ ] **Step 2: Remove the generic aligned-stat path**

Pass each card the opposing sheet so `BattleCard` derives shared groups; retain verdict rating, decision, selection, Proof, and print export behavior.

- [ ] **Step 3: Add compare-route-scoped dynamic-card CSS**

Style the identity header, layout badge, responsive connection grid, connector chips, capability states, and performance facts. Keep the two cards equal-width and responsive.

- [ ] **Step 4: Run targeted UI tests**

Run: `npx vitest run src/wingman2/components/compare/BattleCard.test.tsx src/wingman2/components/compare/CompareShowdown.test.tsx`

### Task 4: Full verification

**Files:**
- Modify only files required by failures attributable to this feature.

**Interfaces:**
- Consumes: all previous tasks.
- Produces: strict-typechecked, tested Dynamic Battle Cards.

- [ ] **Step 1: Run strict typecheck**

Run: `npx tsc --noEmit -p tsconfig.typecheck.json`

- [ ] **Step 2: Run relevant comparison tests**

Run: `npx vitest run src/wingman2/lib/compareSpecEngine.test.ts src/wingman2/components/compare/BattleCard.test.tsx src/wingman2/components/compare/CompareShowdown.test.tsx src/wingman2/components/compare/CompareProofTable.provenance.test.tsx`

- [ ] **Step 3: Run production build**

Run: `npm run build`

- [ ] **Step 4: Review the final diff**

Confirm no inferred values were added, no unrelated user changes were overwritten, and all acceptance criteria map to implementation/tests.
