# Recalled Text Type-Ahead Specification

## Goal

Let users quickly reuse previously entered client and project text while keeping each field's suggestions relevant, private to the current browser, and easy to dismiss.

## Scope

- Provide an opt-in reusable text field for client names, contact names, site names, project names, and owner/customer names.
- Save a non-empty value when the field blurs or the user confirms it with Enter.
- Show matching saved values as the user types and recent values when the field receives focus empty.
- Keep histories separate by semantic field key. Project name and site name may share a `project-name` history; client and owner/customer may share a `customer-name` history.
- Store at most 10 unique values per field in browser `localStorage`, newest first, using case-insensitive de-duplication while preserving the latest spelling.
- Never persist passwords, tokens, raw JSON, URLs, free-form notes, search queries, competitor evidence, or textarea content through this feature.

## Interaction and accessibility

- Use the ARIA combobox/listbox pattern with `aria-expanded`, `aria-controls`, `aria-activedescendant`, and `role="option"`.
- Arrow Up/Down moves through suggestions, Enter accepts the active suggestion, and Escape closes the list.
- Pointer selection must not cause blur to save the unselected partial value first.
- Suggestions filter case-insensitively by substring and exclude a value identical to the current input.
- The field remains fully usable when storage is unavailable or malformed.

## Persistence

- Storage key: `wingman.recalledText.v1`.
- Stored shape: `{ [fieldKey: string]: string[] }`.
- Trim values before saving, reject empty values, cap individual values at 200 characters, and cap each history at 10 entries.
- Do not sync this browser-local convenience history to project or workspace APIs.

## Initial adoption

- `DiscoveryClientDetailsPanel`: client/company, contact, and site/project fields.
- `ProjectDetailPage`: project name and owner/customer fields.

## Verification

- Unit tests cover malformed storage, de-duplication, limits, filtering, and unavailable storage.
- Component tests cover keyboard and pointer selection, commit-on-blur, empty-focus recall, and ARIA state.
- Existing discovery and project flows continue to receive ordinary string change events through explicit `onValueChange` callbacks.
