# Competitor Domain Ownership

Use this folder as the canonical home for competitor-domain logic that is shared by the app:

- local dataset access
- fit / scoring logic
- local competitor lookup
- repository and store access
- compare trace types and domain models

Keep feature UI out of this folder. UI belongs in `src/features/compare/`.

Live web lookup infrastructure belongs in `src/services/competitor/`, where the fetch, extraction, cache, and fallback pipeline are kept together.
