import type {
  CompetitorLookupInput,
  CompetitorLookupResolution,
  CompetitorLiveRecord,
} from "./competitorLiveTypes";
import { extractCompetitorRecordFromPage } from "./competitorLiveExtractor";
import { fetchCompetitorProductPageText } from "./competitorLiveFetch";
import { readCompetitorLiveCache, upsertCompetitorLiveCache } from "./competitorLiveDb";

type RepoLookupFn = (input: CompetitorLookupInput) => Promise<CompetitorLiveRecord | null>;

export async function resolveCompetitorRecordWithLiveFallback(
  input: CompetitorLookupInput,
  lookupFromDatabase: RepoLookupFn
): Promise<CompetitorLookupResolution> {
  const dbRecord = await lookupFromDatabase(input);
  if (dbRecord) {
    return {
      found: true,
      record: dbRecord,
      usedLiveFallback: false,
      databaseUpdated: false,
    };
  }

  const cached = readCompetitorLiveCache(input);
  if (cached) {
    return {
      found: true,
      record: cached,
      usedLiveFallback: true,
      databaseUpdated: false,
      reason: "Loaded from live fallback cache.",
    };
  }

  if (!input.productUrl) {
    return {
      found: false,
      usedLiveFallback: false,
      databaseUpdated: false,
      reason: "Competitor not found locally and no product URL was provided.",
    };
  }

  const pageText = await fetchCompetitorProductPageText(input);
  const extracted = extractCompetitorRecordFromPage(input, pageText);

  upsertCompetitorLiveCache(extracted);

  return {
    found: true,
    record: extracted,
    usedLiveFallback: true,
    databaseUpdated: true,
    reason: "Competitor resolved from live product page and cached.",
  };
}