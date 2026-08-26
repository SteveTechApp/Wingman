import { beforeAll, describe, expect, it } from "vitest";
import {
  curatedPhrasesFor,
  guidedVoicePreview,
  isInterviewLanguageLoaded,
  loadInterviewLanguage,
  normalizeInterviewLang,
  SPOKEN_LANGUAGE_OPTIONS,
  translateInterviewQuestion,
} from "./discoveryGuidedInterviewI18n";

// The non-English tables are lazy-loaded (see loadInterviewLanguage); the
// completeness and translation assertions below need them in the registry, so
// load every language once before the suite runs.
beforeAll(async () => {
  await Promise.all(ALL_TRANSLATED_LANGS.map((lang) => loadInterviewLanguage(lang)));
});

// Every supported capture language with a full table (stems + interpretation).
const ALL_TRANSLATED_LANGS = ["fr", "es", "de", "pt", "it", "nl", "sv", "nb", "ru", "zh", "hi"] as const;

// The fifteen core questions whose option values are interpreted per language.
// The option keys are language-independent, so the same keys must exist in
// every language table — this gate fails when a new language skips one.
const CORE_QUESTION_OPTIONS: Record<string, string[]> = {
  opportunity: ["meeting-room", "classroom", "hospitality", "video-wall", "av-over-ip", "not-sure"],
  scale: ["single-small-room", "single-large-room", "multi-room", "building-wide", "unknown-scale"],
  sources: ["one-source", "two-four-sources", "five-eight-sources", "nine-plus-sources", "unknown-sources"],
  displays: ["one-display", "two-displays", "three-eight-displays", "nine-plus-displays", "video-wall-output"],
  "display-behaviour": ["same-content-all-displays", "independent-routing-per-display", "video-wall-or-processor-feed", "multiview-on-one-output", "unknown-display-behaviour"],
  "signal-standard": ["1080p-standard-hdmi", "4k60-standard", "4k60-hdr-hdcp", "legacy-edid-risk", "unknown-signal-standard"],
  "source-connection": ["fixed-hdmi-sources", "laptops-wireless-inputs", "mixed-hdmi-usbc", "network-video-sources", "unknown-source-connectors"],
  "uc-purpose": ["video-conferencing", "recording-streaming", "camera-distribution-only", "microphones-only", "no-uc", "unknown-uc"],
  "uc-camera": ["fixed-usb-camera", "usb-ptz-camera", "hdmi-ptz-camera", "ndi-network-camera", "other-camera", "unknown-camera"],
  "uc-camera-count": ["one-camera", "two-cameras", "three-four-cameras", "five-plus-cameras", "unknown-camera-count"],
  "uc-microphones": ["speakerphone", "table-microphone", "ceiling-microphone-array", "wireless-microphone", "lectern-microphone", "existing-microphone-system", "no-microphones", "unknown-microphones"],
  "uc-microphone-count": ["one-microphone-feed", "two-four-microphone-feeds", "five-eight-microphone-feeds", "nine-plus-microphone-feeds", "unknown-microphone-count"],
  usb: ["no-usb", "byod-byom", "room-pc-uc", "switchable-host-usb", "room-host-usb2", "usb3-high-bandwidth-path", "usb-extension-required", "interactive-usb", "unknown-usb"],
  audio: ["no-room-audio", "display-audio", "source-audio-deembed", "room-audio", "stereo-low-impedance", "multichannel-audio", "distributed-70v-100v", "separate-programme-voice", "analogue-audio-override", "digital-audio-interface", "dante-network-audio", "unknown-audio"],
  control: ["simple-auto", "front-panel-remote", "touch-panel", "software-app-control", "third-party-control", "unknown-control"],
};

// Every question id the guided interview can surface. The completeness test
// below fails when a new question is added without fr/es/de spoken stems, so
// this class of gap cannot silently ship.
const ALL_QUESTION_IDS = [
  "opportunity",
  "scale",
  "sources",
  "source-connection",
  "displays",
  "display-behaviour",
  "signal-standard",
  "uc-purpose",
  "uc-platform",
  "mtr-av-integration",
  "uc-camera",
  "uc-camera-count",
  "uc-multi-camera-path",
  "uc-camera-routing",
  "uc-microphones",
  "uc-microphone-connection",
  "uc-microphone-count",
  "usb",
  "audio",
  "control",
  "locations-connections",
  "avoip-profile",
  "video-wall-technology",
  "video-wall-purpose",
  "source-device-workflows",
  "wireless-presentation-operation",
  "multiview-destination",
  "multiview-operation",
  "uc-audio-processing",
];

function englishStub(id: string) {
  return { id, question: `English question ${id}`, prompt: `English prompt ${id}` };
}

describe("normalizeInterviewLang", () => {
  it("maps BCP-47 speech languages to their base id", () => {
    expect(normalizeInterviewLang("fr-FR")).toBe("fr");
    expect(normalizeInterviewLang("es-ES")).toBe("es");
    expect(normalizeInterviewLang("de-DE")).toBe("de");
    expect(normalizeInterviewLang("en-GB")).toBe("en");
    expect(normalizeInterviewLang("en-IN")).toBe("en");
    expect(normalizeInterviewLang("pt-PT")).toBe("pt");
  });

  it("falls back to English for unknown or empty language tags", () => {
    expect(normalizeInterviewLang("xx-YY")).toBe("en");
    expect(normalizeInterviewLang("")).toBe("en");
  });
});

describe("translateInterviewQuestion", () => {
  it("returns the English stem unchanged for English and unknown languages", () => {
    const stub = englishStub("opportunity");
    expect(translateInterviewQuestion(stub, "en")).toEqual({
      question: "English question opportunity",
      prompt: "English prompt opportunity",
    });
    expect(translateInterviewQuestion(stub, "xx-YY")).toEqual({
      question: "English question opportunity",
      prompt: "English prompt opportunity",
    });
  });

  it("translates the question and prompt for every supported capture language", () => {
    const opportunity = englishStub("opportunity");
    expect(translateInterviewQuestion(opportunity, "fr-FR").question).toContain("Quel type de projet");
    expect(translateInterviewQuestion(opportunity, "es-ES").question).toContain("¿Qué tipo de proyecto");
    expect(translateInterviewQuestion(opportunity, "de-DE").question).toContain("Um welche Art");
    expect(translateInterviewQuestion(opportunity, "pt-PT").question).toContain("projeto");
    expect(translateInterviewQuestion(opportunity, "it-IT").question).toContain("progetto");
    expect(translateInterviewQuestion(opportunity, "nl-NL").question).toContain("project");
    expect(translateInterviewQuestion(opportunity, "sv-SE").question).toContain("projekt");
    expect(translateInterviewQuestion(opportunity, "nb-NO").question).toContain("prosjekt");
    expect(translateInterviewQuestion(opportunity, "ru-RU").question).toContain("проект");
    expect(translateInterviewQuestion(opportunity, "zh-CN").question).toContain("项目");
    expect(translateInterviewQuestion(opportunity, "hi-IN").question).toContain("प्रोजेक्ट");

    const usb = englishStub("usb");
    expect(translateInterviewQuestion(usb, "fr").question).toContain("USB");
    expect(translateInterviewQuestion(usb, "de").question).toContain("USB-Geräte");
  });

  it("falls back to English for a question id without a translation", () => {
    const stub = englishStub("brand-new-question");
    expect(translateInterviewQuestion(stub, "fr")).toEqual({
      question: "English question brand-new-question",
      prompt: "English prompt brand-new-question",
    });
  });

  it("covers every guided-interview question id in every translated language", () => {
    for (const id of ALL_QUESTION_IDS) {
      const stub = englishStub(id);
      for (const lang of ALL_TRANSLATED_LANGS) {
        const translated = translateInterviewQuestion(stub, lang);
        expect(translated.question, `${lang} question for ${id}`).not.toBe(stub.question);
        expect(translated.question, `${lang} question for ${id}`).not.toBe("");
        expect(translated.prompt, `${lang} prompt for ${id}`).not.toBe(stub.prompt);
        expect(translated.prompt, `${lang} prompt for ${id}`).not.toBe("");
      }
    }
  });

  it("interprets every core option value in every translated language", () => {
    for (const lang of ALL_TRANSLATED_LANGS) {
      for (const [questionId, optionValues] of Object.entries(CORE_QUESTION_OPTIONS)) {
        for (const value of optionValues) {
          const phrases = curatedPhrasesFor(value, lang);
          expect(phrases, `${lang} phrases for ${questionId}/${value}`).toBeDefined();
          expect(phrases!.length, `${lang} phrases for ${questionId}/${value}`).toBeGreaterThan(0);
        }
      }
    }
  });

  it("uses the language's own interpretation table, not the English fallback", () => {
    // A localized "meeting room" phrase proves the table is registered and
    // consulted — a missing registration would silently return English.
    const localized: Record<string, string> = {
      pt: "sala de reuniões",
      it: "sala riunioni",
      nl: "vergaderruimte",
      sv: "mötesrum",
      nb: "møterom",
      ru: "переговорная",
      zh: "会议室",
      hi: "बैठक कक्ष",
    };
    for (const [lang, phrase] of Object.entries(localized)) {
      const phrases = curatedPhrasesFor("meeting-room", lang as (typeof ALL_TRANSLATED_LANGS)[number]);
      expect(phrases, `${lang} meeting-room`).toContain(phrase);
    }
  });
});

describe("guidedVoicePreview", () => {
  it("returns a sample phrase in the spoken language", () => {
    expect(guidedVoicePreview("fr")).toContain("Bonjour");
    expect(guidedVoicePreview("es-ES")).toContain("Hola");
    expect(guidedVoicePreview("de-DE")).toContain("Hallo");
    expect(guidedVoicePreview("en")).toContain("Hello");
    expect(guidedVoicePreview("pt-PT")).toContain("Olá");
    expect(guidedVoicePreview("it-IT")).toContain("Ciao");
    expect(guidedVoicePreview("nl-NL")).toContain("Hallo");
    expect(guidedVoicePreview("sv-SE")).toContain("Hej");
    expect(guidedVoicePreview("nb-NO")).toContain("Hei");
    expect(guidedVoicePreview("ru-RU")).toContain("Здравствуйте");
    expect(guidedVoicePreview("zh-CN")).toContain("您好");
    expect(guidedVoicePreview("hi-IN")).toContain("नमस्ते");
  });

  it("falls back to English for unknown languages", () => {
    expect(guidedVoicePreview("xx-YY")).toBe(guidedVoicePreview("en"));
  });
});

describe("SPOKEN_LANGUAGE_OPTIONS", () => {
  it("covers every supported spoken language with a display label", () => {
    const langs = SPOKEN_LANGUAGE_OPTIONS.map((option) => option.lang);
    expect(langs).toEqual(["en", "fr", "es", "de", "pt", "it", "nl", "sv", "nb", "ru", "zh", "hi"]);
    for (const option of SPOKEN_LANGUAGE_OPTIONS) {
      expect(option.label.length).toBeGreaterThan(0);
    }
  });
});

describe("curatedPhrasesFor", () => {
  it("returns the language table first, then the English table as fallback", () => {
    expect(curatedPhrasesFor("meeting-room", "fr")).toContain("salle de réunion");
    expect(curatedPhrasesFor("meeting-room", "es")).toContain("sala de reuniones");
    expect(curatedPhrasesFor("meeting-room", "de")).toContain("besprechungsraum");
    expect(curatedPhrasesFor("meeting-room", "pt")).toContain("sala de reuniões");

    // Values without a language entry still recognise shared AV jargon.
    expect(curatedPhrasesFor("multiview-single-display", "fr")).toBeDefined();
    // An unknown language falls back to the English table.
    expect(curatedPhrasesFor("meeting-room", "xx" as never)).toContain("meeting room");
    // Multiview-destination is outside the per-language core set, so it falls back.
    expect(curatedPhrasesFor("multiview-single-display", "sv")).toContain("single display");
  });
});
