# Recalled Text Type-Ahead Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add accessible, browser-local type-ahead recall to repeated client and project identity fields.

**Architecture:** A small storage module owns validation, de-duplication, filtering, and browser failure handling. A controlled `RecalledTextInput` component owns combobox interaction while callers retain their existing form state; initial integrations opt in with semantic memory keys so unrelated text never leaks into suggestions.

**Tech Stack:** React 18, TypeScript, Vitest, Testing Library, browser `localStorage`, ARIA combobox/listbox.

**Spec:** `docs/superpowers/specs/2026-09-18-recalled-text-typeahead.md`

## Global Constraints

- Persist only the explicitly adopted identity/project fields; never persist passwords, tokens, raw JSON, URLs, notes, search queries, competitor evidence, or textarea content.
- Use storage key `wingman.recalledText.v1`, keep 10 values per field, and cap values at 200 characters.
- Storage errors and malformed data must degrade to an ordinary controlled text input.
- Preserve the existing `onValueChange(value: string)` state ownership model.

---

### Task 1: Recalled text storage and matching

**Files:**
- Create: `src/wingman2/lib/recalledTextValues.ts`
- Test: `src/wingman2/lib/recalledTextValues.test.ts`

**Interfaces:**
- Produces: `type RecalledTextFieldKey = "customer-name" | "contact-name" | "project-name"`
- Produces: `loadRecalledTextValues(fieldKey, storage?): string[]`
- Produces: `rememberTextValue(fieldKey, value, storage?): string[]`
- Produces: `matchingRecalledTextValues(values, query, limit?): string[]`

- [ ] **Step 1: Write failing storage and matching tests**

```ts
expect(rememberTextValue("customer-name", " Acme ", storage)).toEqual(["Acme"]);
rememberTextValue("customer-name", "ACME", storage);
expect(loadRecalledTextValues("customer-name", storage)).toEqual(["ACME"]);
expect(matchingRecalledTextValues(["Northfield Council", "Southbank"], "field")).toEqual(["Northfield Council"]);
```

Also assert malformed JSON returns `[]`, unavailable storage does not throw, empty values are ignored, entries are capped at 200 characters, and only the newest 10 unique values remain.

- [ ] **Step 2: Run the focused test and verify failure**

Run: `npx vitest run src/wingman2/lib/recalledTextValues.test.ts`

Expected: FAIL because `recalledTextValues.ts` does not exist.

- [ ] **Step 3: Implement the bounded storage adapter**

```ts
export const RECALLED_TEXT_STORAGE_KEY = "wingman.recalledText.v1";
export type RecalledTextFieldKey = "customer-name" | "contact-name" | "project-name";
const MAX_VALUES = 10;
const MAX_VALUE_LENGTH = 200;
```

Read only string arrays from the record, trim and truncate on save, compare with `toLocaleLowerCase()`, place the newest spelling first, and wrap every storage read/write in `try/catch`. Accept `Storage | null` as an optional test seam and default to safe access to `window.localStorage`.

- [ ] **Step 4: Run the focused test**

Run: `npx vitest run src/wingman2/lib/recalledTextValues.test.ts`

Expected: PASS.

### Task 2: Accessible controlled type-ahead input

**Files:**
- Create: `src/wingman2/components/RecalledTextInput.tsx`
- Create: `src/wingman2/components/RecalledTextInput.test.tsx`
- Modify: `src/wingman2/styles/wingman-workflow-theme.css`

**Interfaces:**
- Consumes: `RecalledTextFieldKey`, `loadRecalledTextValues`, `rememberTextValue`, `matchingRecalledTextValues`
- Produces: `RecalledTextInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">`
- Produces: `RecalledTextInput({ memoryKey, value, onValueChange, ...inputProps })`

- [ ] **Step 1: Write failing component tests**

Render the component with a controlled wrapper and seeded local storage. Assert focus opens recent values, typing filters them, ArrowDown plus Enter selects a suggestion, Escape closes the popup, mouse selection updates the value, blur saves a trimmed value, and the input/listbox expose the required ARIA relationships.

- [ ] **Step 2: Run the focused test and verify failure**

Run: `npx vitest run src/wingman2/components/RecalledTextInput.test.tsx`

Expected: FAIL because `RecalledTextInput` does not exist.

- [ ] **Step 3: Implement combobox state and interactions**

Use `useId()` for the listbox id, local `open`, `values`, and `activeIndex` state, and a ref that suppresses blur commit during pointer selection. Reload values on focus, compute matches from the controlled value, commit on blur and Enter, and call `onValueChange(selectedValue)` when an option is accepted.

```tsx
<input
  {...inputProps}
  value={value}
  onChange={(event) => onValueChange(event.target.value)}
  role="combobox"
  aria-autocomplete="list"
  aria-expanded={open && suggestions.length > 0}
  aria-controls={listboxId}
  aria-activedescendant={activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined}
/>
```

Render options in a positioned `role="listbox"` beneath the input and keep the wrapper neutral so caller-provided input classes continue to work.

- [ ] **Step 4: Add focused visual styles**

Add `.wm-recalled-text`, `.wm-recalled-text__listbox`, `.wm-recalled-text__option`, and active/hover states using existing Wingman surface, border, text, and focus colors. Keep the popup above adjacent cards and constrain it to 240px height with scrolling.

- [ ] **Step 5: Run component and storage tests**

Run: `npx vitest run src/wingman2/components/RecalledTextInput.test.tsx src/wingman2/lib/recalledTextValues.test.ts`

Expected: PASS.

### Task 3: Adopt recall in discovery and project identity fields

**Files:**
- Modify: `src/wingman2/pages/discovery/DiscoveryClientDetailsPanel.tsx`
- Create: `src/wingman2/pages/discovery/DiscoveryClientDetailsPanel.test.tsx`
- Modify: `src/wingman2/pages/ProjectDetailPage.tsx`
- Modify: the existing `ProjectDetailPage` test that covers edit mode, or create `src/wingman2/pages/ProjectDetailPage.recalledText.test.tsx` if no focused test exists.

**Interfaces:**
- Consumes: `RecalledTextInput`, `memoryKey`, `value`, and `onValueChange`
- Produces: no new public API; existing page callbacks continue receiving strings.

- [ ] **Step 1: Write failing discovery integration test**

Seed `customer-name`, `contact-name`, and `project-name` histories, render `DiscoveryClientDetailsPanel`, focus each text field, and assert only the semantically matching suggestions appear. Select a client suggestion and assert `onClientNameChange` receives it.

- [ ] **Step 2: Replace the three discovery identity inputs**

Use `memoryKey="customer-name"` for client/company, `memoryKey="contact-name"` for contact, and `memoryKey="project-name"` for site/project. Preserve classes, placeholders, labels, and the existing callbacks.

- [ ] **Step 3: Write failing project edit integration test**

Enter project edit mode, seed histories, focus Project name and Owner/customer, accept suggestions, and assert saving persists the selected controlled values through the existing project save path.

- [ ] **Step 4: Replace the project edit identity inputs**

Use `memoryKey="project-name"` for Project name and `memoryKey="customer-name"` for Owner/customer. Keep the current `setProjectDraft` updates inside `onValueChange`.

- [ ] **Step 5: Run integration tests**

Run: `npx vitest run src/wingman2/pages/discovery/DiscoveryClientDetailsPanel.test.tsx src/wingman2/pages/ProjectDetailPage*.test.tsx`

Expected: PASS.

### Task 4: Repository verification

**Files:**
- Modify only if a gate reports a defect caused by this feature.

**Interfaces:**
- Consumes: completed Tasks 1–3.
- Produces: a verified feature with no new architecture or contract regression.

- [ ] **Step 1: Run strict typecheck**

Run: `npx tsc --noEmit -p tsconfig.typecheck.json`

Expected: PASS.

- [ ] **Step 2: Run the complete fast verification**

Run: `npm run verify:fast`

Expected: PASS; existing non-blocking warnings may remain unchanged.

- [ ] **Step 3: Run architecture boundaries**

Run: `npm run check:architecture-boundaries`

Expected: PASS without adding or raising an architecture allowlist entry.

- [ ] **Step 4: Review the final diff**

Run: `git diff --check` and `git diff --stat`.

Expected: no whitespace errors; only the storage module, component, styles, specified integrations, tests, spec, and plan are changed.

## Self-review

- Spec coverage: persistence, field isolation, keyboard and pointer interaction, ARIA, failure handling, privacy exclusions, and both initial adoption surfaces map to Tasks 1–3.
- Placeholder scan: no deferred implementation steps or unspecified error handling remain.
- Type consistency: all integrations use `RecalledTextInput`, `RecalledTextFieldKey`, `memoryKey`, `value`, and `onValueChange` exactly as defined above.
