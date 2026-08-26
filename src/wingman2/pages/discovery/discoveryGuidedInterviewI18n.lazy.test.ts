import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  curatedPhrasesFor,
  guidedVoicePreview,
  isInterviewLanguageLoaded,
  loadInterviewLanguage,
  translateInterviewQuestion,
} from "./discoveryGuidedInterviewI18n";

// This file runs with a clean module registry (vitest isolates per file), so
// the non-English tables start unloaded — exactly the state a first-time
// visitor is in before the interview preloads their capture language.

function englishStub(id: string) {
  return { id, question: `English question ${id}`, prompt: `English prompt ${id}` };
}

describe("lazy language loading", () => {
  it("serves the English fallback until the language is loaded, then the language's own tables", async () => {
    // English is always available synchronously.
    expect(isInterviewLanguageLoaded("en")).toBe(true);
    expect(curatedPhrasesFor("meeting-room", "de")).toContain("meeting room");
    expect(guidedVoicePreview("de")).toBe(guidedVoicePreview("en"));

    await loadInterviewLanguage("de");

    expect(isInterviewLanguageLoaded("de")).toBe(true);
    expect(curatedPhrasesFor("meeting-room", "de")).toContain("besprechungsraum");
    expect(guidedVoicePreview("de")).toContain("Hallo");
  });

  it("keeps the question stems lazy too: English stem until loaded, then the capture-language stem", async () => {
    const stub = englishStub("opportunity");
    expect(translateInterviewQuestion(stub, "fr").question).toBe(stub.question);
    await loadInterviewLanguage("fr");
    expect(translateInterviewQuestion(stub, "fr").question).toContain("Quel type de projet");
  });

  it("loads each language at most once (idempotent registry)", async () => {
    const first = await loadInterviewLanguage("es");
    const second = await loadInterviewLanguage("es");
    expect(second).toBe(first);
  });
});

describe("the Discovery chunk does not ship every language's phrase data", () => {
  it("keeps the i18n module free of non-English phrase data (it lives in the lazy locales)", () => {
    const source = readFileSync(
      join(process.cwd(), "src/wingman2/pages/discovery/discoveryGuidedInterviewI18n.ts"),
      "utf8",
    );
    // French, German and Chinese phrases must NOT be statically in the loader
    // module — that is what lets Vite split them into on-demand chunks.
    expect(source).not.toContain("salle de réunion");
    expect(source).not.toContain("besprechungsraum");
    expect(source).not.toContain("переговорная");
    expect(source).not.toContain("会议室");
    // And every language must be reachable through the on-demand loaders.
    for (const lang of ["fr", "es", "de", "pt", "it", "nl", "sv", "nb", "ru", "zh", "hi"]) {
      expect(source).toContain(`import(\"./locales/locale-${lang}\")`);
    }
  });

  it("wires the lazy preload into the interview so the capture language is pulled on selection", () => {
    const source = readFileSync(
      join(process.cwd(), "src/wingman2/pages/discovery/DiscoveryGuidedInterview.tsx"),
      "utf8",
    );
    expect(source).toContain("loadInterviewLanguage(activeInterviewLang)");
    // The read-aloud text must not be spoken until the language's tables land.
    expect(source).toContain("isInterviewLanguageLoaded(activeInterviewLang)");
  });
});
