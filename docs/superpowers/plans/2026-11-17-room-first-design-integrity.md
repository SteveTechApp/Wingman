# Room-First Design Integrity Repair Plan

> **For agentic workers:** Execute this plan inline because the user asked for repairs. Tasks use checkbox syntax for tracking.

**Goal:** Make custom room signal requirements explicit, represent repeated physical devices individually in routing, and preserve these facts through project persistence and review.

**Architecture:** Carry the isolated room-first feature onto the current stable baseline, then extend `ProjectTopology` with source-to-destination requirements and one-based unit references on requirements and route segments. Normalize legacy records conservatively, validate each required service path over unit-level graph nodes, and expose the model in Discovery editors and downstream evidence. Add focused tests for normalization, routing logic, editor behavior, and project codec round trips.

**Tech Stack:** TypeScript, React, Vitest, Testing Library, existing project topology and codecs.

**Spec:** `docs/room-first-custom-av-design.md`

## Global Constraints

- Preserve existing saved topology and project records; legacy routes without unit indices normalize to unit 1.
- Do not infer source-to-destination requirements, signal services, connectors, or technical compatibility.
- Keep missing requirements visible as open design checks.
- Maintain the existing product-library and market-template paths.

---

### Task 1: Model required routes and physical units

**Files:**
- Modify: `src/wingman2/lib/projectTopology.ts` (also bring forward room-first role, ownership, and port fields)
- Test: `src/wingman2/lib/projectTopology.test.ts`

**Interfaces:**
- Add `ProjectSignalRequirement` with stable ID, source/destination device IDs, one-based source/destination unit numbers, and required services.
- Add `signalRequirements` to `ProjectTopology`; add optional `fromUnit` and `toUnit` to `ProjectConnection`.
- Normalize missing legacy unit indices to 1 and malformed requirements away without inventing required paths.

- [x] Add model tests for legacy normalization, explicit per-unit paths, and preservation across repeated normalization.
- [x] Implement requirement and unit fields plus conservative normalization.
- [x] Implement service-specific path validation on `(deviceId, unit)` graph nodes; require every explicit source/destination/service requirement to have a route.
- [x] Flag missing requirements when sources and destinations exist, invalid references, units outside device quantity, empty services, and uncovered route services.
- [x] Run `npx vitest run src/wingman2/lib/projectTopology.test.ts`.

### Task 2: Capture required pairings and unit-specific route segments

**Files:**
- Modify: `src/wingman2/pages/DiscoveryPage.tsx`
- Modify: `src/wingman2/pages/discovery/DiscoveryMarketEntry.tsx`
- Add: `src/wingman2/pages/discovery/RoomEndpointEditor.tsx`
- Add: `src/wingman2/pages/discovery/RoomDevicePortsEditor.tsx`
- Modify: `src/wingman2/pages/discovery/RoomConnectionsEditor.tsx`
- Modify: `src/wingman2/pages/discovery/DiscoveryRoomLocations.tsx`
- Modify: `src/wingman2/pages/discovery/DiscoveryRoomWizard.tsx`
- Modify: `src/wingman2/pages/discovery/operationalDiscovery.ts`
- Modify: `docs/DISCOVERY.md`
- Modify: `AGENTS.md`
- Test: `src/wingman2/pages/discovery/RoomConnectionsEditor.test.tsx`
- Test: `src/wingman2/pages/discovery/DiscoveryMarketEntry.test.tsx`

**Interfaces:**
- Add and remove explicit source-to-destination requirements with one-based unit selection and required services.
- Route segments select source and receiving units when the referenced device quantity exceeds one.
- Manually entered and library devices remain grouped by model and quantity; one-based unit selectors identify the physical unit on every requirement and route segment.

- [x] Add editor tests for requirements, multi-unit selectors, and serialized state updates.
- [x] Implement source/destination requirement controls without auto-creating pairings.
- [x] Implement unit selectors on route segments and preserve unit selections when unrelated fields change.
- [x] Ensure repeated manually entered and library endpoints can be routed separately by unit index.
- [x] Include unit identity and declared requirements in the design schedule and evidence lines.
- [x] Run `npx vitest run src/wingman2/pages/discovery/RoomConnectionsEditor.test.tsx`.

### Task 3: Verify project persistence and close the repair

**Files:**
- Test: `src/wingman2/features/projects/persistence/projectCodecs.test.ts`
- Modify if required: `src/wingman2/features/projects/persistence/projectCodecs.ts`
- Modify: `docs/room-first-custom-av-design.md`
- Modify: `docs/DISCOVERY.md`

- [x] Add a project codec round-trip test for requirements, unit-indexed routes, and legacy defaults.
- [x] Update codec behavior only if the round-trip test shows fields are not preserved.
- [x] Document that each required source/destination/service path is checked, while protocol, bandwidth, acoustic, network-admission and physical compatibility still require evidence.
- [x] Run the focused topology, room editor, and project codec tests, then `npx tsc --noEmit -p tsconfig.typecheck.json`.
