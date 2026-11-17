# Room-First Custom AV Design

## Goal

Let a user start a complete AV design from the actual room and its requirements, without choosing a vertical market or inheriting a template's equipment assumptions.

## Product behavior

- Market and room templates are optional reference context. They may offer examples, but they never pre-answer the custom room's requirements.
- A custom design begins with the user's own room description, dimensions and construction facts. Unknown facts remain open for confirmation.
- The room inventory records user-named sources, processing devices, destinations and infrastructure at their actual locations, with explicit ownership and input/output interfaces. Unclassified or ownerless devices remain open review items, including older records that predate these fields.
- The user records each intended source-unit to destination-unit pairing and the services it must carry. Wingman checks that every declared physical source and destination unit participates in at least one pairing, without assuming that every source must feed every destination.
- Route segments record the sending unit, receiving unit, selected interfaces, carried services, transport, route length/basis and confirmation state. Older route records without unit indices remain readable as unit 1.
- Discovery turns the captured facts into a design review that distinguishes known facts, assumptions and open work. It checks each required service across a directed sequence of unit-specific route segments and surfaces missing mappings, paths, roles, ownership, ports, connector/protocol, route transport, length or confirmation.
- An explicit route does not prove electrical or protocol compatibility, bandwidth, acoustic performance, network admission or product suitability. Those checks require manufacturer evidence, site conditions or specialist review; the design is not issue-ready merely because equipment is listed and connected.
- Existing template, saved-product and project records remain readable. A saved room with devices but no route yet remains a valid incomplete design record and is not discarded during project decoding.

## Scope for this implementation

Add a room-first start to Discovery, make endpoint and interface capture available without requiring a saved product, connect routes to named interfaces, and expose topology completeness/open route details in the room review. Keep existing market, template and product flows.

## Out of scope

This change does not infer source/destination pairings or all-to-all routing, and does not automate acoustic prediction, RF coordination, structural approval, network admission, format/HDCP interoperability, bandwidth or product compatibility from incomplete evidence. Those remain named design checks or specialist/site actions. Unit-aware graph reachability verifies the paths the user declared; it does not prove electrical, protocol or performance compatibility.
