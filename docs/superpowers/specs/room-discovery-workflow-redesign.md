# Room Discovery Workflow Redesign

## Goal

Make room creation understandable for a non-technical user in Focused view and complete, section-oriented, and technically useful for an engineer in Expert view, with templates and custom discovery editing the same room design.

## Product decisions

- A project starts from either a room template or a custom room. A template creates a project copy whose assumptions, context, devices, locations, connections, and schedule remain editable.
- Focused and Expert are two authoring views over one room design. Switching views never discards fields or equipment.
- Focused view uses plain-language questions grouped into a visible room-building journey. Users can answer approximately or leave a question open.
- Expert view presents all applicable questions and technical design data in logical room-design sections. It is not a second label for question depth.
- Physical room and construction details are structured, editable fields with an explicit unknown state; they are not hidden only in notes.
- Equipment may be a real selected SKU, an explicit placeholder, or an assumption. Unknown third-party equipment does not block saving a room brief.
- Keep product identity explicit: WyreStorm, competitor alternative, or complementary third-party product.

## Experience requirements

Focused room journey: room purpose and users; room/site conditions; source devices; displays and outputs; how content is shared and switched; audio and conferencing; room operation; equipment and locations; review and save.

Expert room sections: Room brief; Site and construction; Sources; Displays; Video routing; Audio; Conferencing and USB; Control; Network and infrastructure; Locations and cabling; Equipment schedule; Review and validation.

The current application-specific question branches remain available. Expert sections group those questions rather than creating a competing answer store. Both views show unknowns, assumptions, and confirmation status without turning missing information into a hard stop.

## Shared room data

Continue using `DiscoveryAnswers`, `DiscoveryNotes`, and `ProjectTopology` as the workflow source of truth for this implementation. Carry template topology through template-edit handoff. Add structured site fields to discovery answers and ensure they survive brief compilation, save, export, and view changes.

## Acceptance checks

- Switching Focused ↔ Expert retains discovery answers, site fields, devices, locations, and connections.
- Expert exposes section navigation and grouped applicable technical questions without the Essential/Detailed control being confused with the global view switch.
- Focused exposes a staged plain-language journey and structured room/site fields, with an explicit way to leave unknowns open.
- Editing and saving a custom template retains its selected equipment and topology.
- Template design continues to distinguish WyreStorm products, competitor alternatives, and complementary equipment.
- Automated checks cover the template round-trip and mode data preservation, not just visible navigation.
