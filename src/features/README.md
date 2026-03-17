# Feature Structure

Use the folders below as the canonical feature homes when repairing or debugging the app:

- `catalog/`: active product catalogue experience and its data helpers.
- `compare/`: active competitor comparison workflow used by `/app/tools/compare`.
- `room-wizard/`: active room wizard workflow used by `/app/tools/room-wizard`.

Compatibility paths kept temporarily:

- `competitor/`: compatibility folder only. Do not add new feature code here.
- `roomwizard/RoomWizardPage.tsx`: shim that re-exports the canonical room wizard page.

Legacy or alternate implementations still in the repo:

- `compare/legacy/LegacyResolveMatchPage.tsx`: older resolve-and-rank comparison UI, not the routed compare page.
- `room-wizard/LegacyTemplateRoomWizardPage.tsx`: earlier template-led room wizard kept for reference during the sweep.

When adding new work, prefer keeping feature UI, local data, styles, and helpers together under the active feature folder instead of creating a parallel sibling directory.
