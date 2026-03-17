Competitor live fallback implemented.

New flow:
1. Search local competitor database by manufacturer + model
2. If not found, check local live-cache
3. If still not found and a product URL exists:
   - fetch product page
   - flatten page to text
   - extract technology/category/features
   - cache record locally
   - re-run comparison using extracted record

Required UI additions:
- Manufacturer field
- Competitor model field
- Optional live product URL field

Recommended comparison flow:
- manufacturer narrows brand-specific search
- model resolves local DB first
- if not found, product URL is used for live fallback
- update local competitor cache/database
- re-run comparison immediately

New files:
- src/services/competitor/competitorLiveTypes.ts
- src/services/competitor/competitorLiveExtractor.ts
- src/services/competitor/competitorLiveDb.ts
- src/services/competitor/competitorLiveFetch.ts
- src/services/competitor/competitorLiveFallbackService.ts
- src/services/competitor/competitorLiveShim.ts