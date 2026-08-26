import { describe, expect, it } from "vitest";
import { waitFor } from "@testing-library/react";
import {
  isInterviewLanguageLoaded,
  prefetchInterviewLanguage,
} from "./discoveryGuidedInterviewI18n";

// Fresh module state per file (vitest isolates by default), so no language is
// preloaded here — this file tests the idle-time prefetch helper in isolation.
describe("prefetchInterviewLanguage", () => {
  it("is a no-op for English, which is always in the registry", async () => {
    await expect(prefetchInterviewLanguage("en")).resolves.toBeUndefined();
    expect(isInterviewLanguageLoaded("en")).toBe(true);
  });

  it("schedules the fetch of an unloaded capture language and warms the registry", async () => {
    expect(isInterviewLanguageLoaded("es")).toBe(false);

    await prefetchInterviewLanguage("es");

    // jsdom has no requestIdleCallback, so the helper falls back to a deferred
    // setTimeout — wait for the locale chunk's dynamic import to land.
    await waitFor(() => expect(isInterviewLanguageLoaded("es")).toBe(true));
  });

  it("is a no-op for a language already in the registry", async () => {
    expect(isInterviewLanguageLoaded("fr")).toBe(false);
    await prefetchInterviewLanguage("fr");
    await waitFor(() => expect(isInterviewLanguageLoaded("fr")).toBe(true));

    // Second prefetch resolves without re-fetching (registry is warm).
    await expect(prefetchInterviewLanguage("fr")).resolves.toBeUndefined();
    expect(isInterviewLanguageLoaded("fr")).toBe(true);
  });
});