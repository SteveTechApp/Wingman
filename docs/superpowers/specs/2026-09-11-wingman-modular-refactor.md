# Wingman Modular Refactor Specification

## Objective

Refactor Wingman into focused domain modules and route-owned UI boundaries so feature work no longer requires editing multi-thousand-line files or inflating broad shared chunks. Preserve all user-visible behaviour, persisted project compatibility, API contracts, proposal output, and governed recommendation semantics.

## Current constraints

- `projectStore.ts` remains the public compatibility facade while its types, normalisation, persistence, sync, and domain commands move behind it.
- Existing imports continue to compile during migration; consumers move to narrower entry points incrementally.
- Discovery, Recommendations, Project Detail, Product Call Cards, and Compare remain lazy routes.
- No size baseline may be raised merely to make CI pass.
- Each extraction begins with characterisation coverage and ends with strict typecheck, focused tests, build, and dependency-boundary verification.
- Generated product data, server contracts, local-storage keys, sync envelopes, route URLs, analytics identifiers, and sales-facing copy remain stable unless a dedicated test proves an intentional change.

## Target architecture

Wingman is organised by feature domains under `src/wingman2/features/`. Each domain exposes a small public `index.ts`; pages compose domain hooks and panels but do not own persistence, normalisation, or business rules. Project persistence is separated into schema/types, codecs, repository, sync, and commands. Large static registries are asynchronously loaded at their route boundary.

The build uses explicit domain chunk groups rather than filename-wide regular expressions. CI retains shipped-size limits for initial JavaScript, total JavaScript/CSS, and named heavy data chunks. Raw page-source byte limits are replaced by structural rules: maximum file size, dependency direction, and forbidden cross-domain imports, with temporary migration allowlists that only shrink.

## Acceptance criteria

1. No production TypeScript/TSX file under `src/wingman2` exceeds 1,200 lines; page entry files target 400 lines or fewer.
2. `projectStore.ts` is a compatibility facade of 250 lines or fewer and contains no network, local-storage codec, or domain mutation implementation.
3. Route entry points import only their feature public API plus shared UI/runtime modules.
4. The project workflow chunk is split into project core, project sync, discovery export, proposal generation, and template workflow chunks; none is accidentally eager.
5. `initial:js`, `total:js`, and `total:css` do not exceed their pre-refactor measured values.
6. Raw source-byte budgets for named pages are removed only after equivalent architecture guards are enforced.
7. `npm run verify` passes, including blind recommendations, authenticated project sync, Windows critical E2E, and proposal screen/DOCX/PDF parity.
