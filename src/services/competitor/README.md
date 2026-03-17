# Competitor Service Structure

Canonical public entry points:

- `lookupService.ts`: frontend lookup API used by compare, diagnostics, approvals, and evidence capture.
- `liveFallbackLookupService.ts`: small frontend helper that wraps lookup calls for UI fallback messaging.

Internal live lookup pipeline:

- `competitorLiveFallbackService.ts`: resolve from DB, then cache, then live product page fallback.
- `competitorLiveFetch.ts`: fetches competitor product page text.
- `competitorLiveExtractor.ts`: extracts structured fields from fetched page content.
- `competitorLiveDb.ts`: local cache read/write helpers.
- `competitorLiveTypes.ts`: shared live lookup types.
- `competitorLiveShim.ts`: temporary helper compatibility layer.

Compatibility files kept at the root of `src/services/`:

- `src/services/competitorLookupService.ts`
- `src/services/competitorLiveFallbackService.ts`

Do not add new competitor service logic to the root `src/services/` folder.
