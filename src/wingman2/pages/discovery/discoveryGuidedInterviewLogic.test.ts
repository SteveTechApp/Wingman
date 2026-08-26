import { beforeAll, describe, expect, it } from "vitest";
import {
  buildInterviewQuestions,
  matchSpokenAnswer,
} from "./discoveryGuidedInterviewLogic";
import { buildDiscoveryConversation } from "./discoveryAnswerUtils";
import { loadInterviewLanguage } from "./discoveryGuidedInterviewI18n";

// The non-English interpretation tables are lazy-loaded (see
// loadInterviewLanguage); the French/Spanish/German/... assertions below need
// them in the registry, so load every language once before the suite runs.
beforeAll(async () => {
  await Promise.all(
    ["fr", "es", "de", "pt", "it", "nl", "sv", "nb", "ru", "zh", "hi"]
      .map((lang) => loadInterviewLanguage(lang)),
  );
});

// UC detail questions (cameras, microphones, USB) only appear in the visible
// list once a UC workflow is selected, so tests pass the governing answers in.
const UC_ENABLED = { "uc-purpose": ["video-conferencing"] };

function questionFor(application: string, id: string, answers = {}) {
  const list = buildInterviewQuestions(application, answers);
  const question = list.find((candidate) => candidate.id === id);
  if (!question) {
    throw new Error(`Question "${id}" not found for application "${application}"`);
  }
  return question;
}

function matchedValues(application: string, id: string, transcript: string) {
  return matchSpokenAnswer(questionFor(application, id), transcript).values;
}

describe("guided interview question list", () => {
  it("builds the same visible question set as the standard flow", () => {
    const meetingRoom = buildInterviewQuestions("meeting-room", {});
    expect(meetingRoom.length).toBeGreaterThanOrEqual(12);
    expect(meetingRoom.map((question) => question.id)).toContain("opportunity");
    expect(meetingRoom.map((question) => question.id)).toContain("locations-connections");
  });

  it("adds the AVoIP profile question for distributed-video projects", () => {
    const avoip = buildInterviewQuestions("av-over-ip", {});
    expect(avoip.map((question) => question.id)).toContain("avoip-profile");
  });
});

describe("guided interview spoken-answer interpretation", () => {
  it("classifies the room type from plain wording", () => {
    expect(matchedValues("", "opportunity", "it's a boardroom for the exec team")).toEqual(["meeting-room"]);
    expect(matchedValues("", "opportunity", "a bar with TVs and a music system")).toEqual(["hospitality"]);
    expect(matchedValues("", "opportunity", "a 3 by 3 video wall in the lobby")).toEqual(["video-wall"]);
    expect(matchedValues("", "opportunity", "not sure yet")).toEqual(["not-sure"]);
  });

  it("reads source and display counts from spoken numbers", () => {
    expect(matchedValues("meeting-room", "sources", "two laptops at the table")).toEqual(["two-four-sources"]);
    expect(matchedValues("meeting-room", "sources", "about ten sources across the site")).toEqual(["nine-plus-sources"]);
    expect(matchedValues("meeting-room", "displays", "two screens")).toEqual(["two-displays"]);
    expect(matchedValues("meeting-room", "displays", "a video wall")).toEqual(["video-wall-output"]);
  });

  it("reads the scale question", () => {
    expect(matchedValues("meeting-room", "scale", "a large boardroom")).toEqual(["single-large-room"]);
  });

  it("interprets UC workflows, including negatives", () => {
    const conferencing = matchedValues("meeting-room", "uc-purpose", "teams calls and recording lectures");
    expect(conferencing).toContain("video-conferencing");
    expect(conferencing).toContain("recording-streaming");
    expect(matchedValues("meeting-room", "uc-purpose", "no cameras or microphones needed")).toEqual(["no-uc"]);
  });

  it("interprets camera types, including multi-select answers", () => {
    const camera = questionFor("meeting-room", "uc-camera", UC_ENABLED);
    expect(matchSpokenAnswer(camera, "a usb ptz camera").values).toEqual(["usb-ptz-camera"]);
    const twoCameras = matchSpokenAnswer(camera, "an hdmi ptz and a usb ptz").values;
    expect(twoCameras).toContain("hdmi-ptz-camera");
    expect(twoCameras).toContain("usb-ptz-camera");
    expect(matchSpokenAnswer(camera, "not sure yet").values).toEqual(["unknown-camera"]);
  });

  it("interprets microphone requirements", () => {
    const microphones = questionFor("meeting-room", "uc-microphones", UC_ENABLED);
    expect(matchSpokenAnswer(microphones, "a ceiling mic array").values).toEqual(["ceiling-microphone-array"]);
    expect(matchSpokenAnswer(microphones, "no microphones").values).toEqual(["no-microphones"]);
  });

  it("interprets USB ownership and negatives", () => {
    const usb = questionFor("meeting-room", "usb", UC_ENABLED);
    expect(matchSpokenAnswer(usb, "the visitor laptop owns the camera").values).toEqual(["byod-byom"]);
    expect(matchSpokenAnswer(usb, "no usb at all").values).toEqual(["no-usb"]);
  });

  it("interprets audio and signal-standard", () => {
    expect(matchedValues("meeting-room", "audio", "ceiling speakers with an amp")).toContain("room-audio");
    expect(matchedValues("meeting-room", "audio", "dante to the processor")).toEqual(["dante-network-audio"]);
    expect(matchedValues("meeting-room", "signal-standard", "4k hdr screens")).toEqual(["4k60-hdr-hdcp"]);
  });

  it("interprets control requirements", () => {
    expect(matchedValues("meeting-room", "control", "crestron")).toEqual(["third-party-control"]);
  });

  it("returns an empty match for unrelated wording instead of guessing", () => {
    const result = matchSpokenAnswer(questionFor("meeting-room", "sources"), "purple bananas");
    expect(result.values).toEqual([]);
    expect(result.confidence).toBe("none");
    expect(result.labels).toEqual([]);
  });

  it("keeps the raw wording available for notes through matched keywords", () => {
    const result = matchSpokenAnswer(questionFor("meeting-room", "opportunity"), "a classroom for teaching");
    expect(result.values).toEqual(["classroom"]);
    expect(result.confidence).toBe("matched");
    expect(result.matchedKeywords.length).toBeGreaterThan(0);
  });

  it("interprets French answers with the fr-FR phrase table", () => {
    const opportunity = questionFor("meeting-room", "opportunity");
    expect(matchSpokenAnswer(opportunity, "une salle de réunion pour la direction", "fr-FR").values).toEqual(["meeting-room"]);
    expect(matchSpokenAnswer(opportunity, "une salle de classe avec un vidéoprojecteur", "fr").values).toEqual(["classroom"]);

    const usb = questionFor("meeting-room", "usb", UC_ENABLED);
    expect(matchSpokenAnswer(usb, "pas d'usb du tout", "fr").values).toEqual(["no-usb"]);
    expect(matchSpokenAnswer(usb, "le portable de l'utilisateur", "fr").values).toEqual(["byod-byom"]);
  });

  it("interprets Spanish answers, including multi-select and negatives", () => {
    const opportunity = questionFor("meeting-room", "opportunity");
    expect(matchSpokenAnswer(opportunity, "una sala de juntas", "es-ES").values).toEqual(["meeting-room"]);
    expect(matchSpokenAnswer(opportunity, "no sé todavía", "es").values).toEqual(["not-sure"]);

    const camera = questionFor("meeting-room", "uc-camera", UC_ENABLED);
    const cameras = matchSpokenAnswer(camera, "una cámara ptz y una webcam", "es").values;
    expect(cameras).toContain("usb-ptz-camera");
    expect(cameras).toContain("fixed-usb-camera");
  });

  it("interprets German answers and honours the 'nur' only-trim", () => {
    const opportunity = questionFor("meeting-room", "opportunity");
    expect(matchSpokenAnswer(opportunity, "ein besprechungsraum", "de-DE").values).toEqual(["meeting-room"]);
    expect(matchSpokenAnswer(opportunity, "ein klassenzimmer", "de").values).toEqual(["classroom"]);

    const purpose = questionFor("meeting-room", "uc-purpose", UC_ENABLED);
    expect(matchSpokenAnswer(purpose, "nur mikrofone", "de").values).toEqual(["microphones-only"]);
  });

  it("extends the 'only' exclusive-trim to the new languages", () => {
    const purpose = questionFor("meeting-room", "uc-purpose", UC_ENABLED);

    // Pure "only X" answers resolve to the deliberate single pick.
    expect(matchSpokenAnswer(purpose, "só microphones", "pt").values).toEqual(["microphones-only"]);
    expect(matchSpokenAnswer(purpose, "endast mikrofoner", "sv").values).toEqual(["microphones-only"]);
    expect(matchSpokenAnswer(purpose, "bare mikrofoner", "nb").values).toEqual(["microphones-only"]);
    expect(matchSpokenAnswer(purpose, "только микрофоны", "ru").values).toEqual(["microphones-only"]);
    expect(matchSpokenAnswer(purpose, "只要麦克风", "zh").values).toEqual(["microphones-only"]);
    expect(matchSpokenAnswer(purpose, "केवल माइक", "hi").values).toEqual(["microphones-only"]);

    // Ambiguous utterances that would match two options (the microphone
    // curated phrase plus the recording phrase) collapse to a single deliberate
    // pick when the "only" marker is present.
    expect(matchSpokenAnswer(purpose, "só microphones e gravação", "pt").values).toEqual(["microphones-only"]);
    expect(matchSpokenAnswer(purpose, "solo microfoni e registrazione", "it").values).toEqual(["microphones-only"]);
    expect(matchSpokenAnswer(purpose, "alleen microfoons en opname", "nl").values).toHaveLength(1);
    expect(matchSpokenAnswer(purpose, "bara mikrofoner och inspelning", "sv").values).toHaveLength(1);
    expect(matchSpokenAnswer(purpose, "bare mikrofoner og opptak", "nb").values).toHaveLength(1);
    expect(matchSpokenAnswer(purpose, "только микрофоны и запись", "ru").values).toHaveLength(1);
    expect(matchSpokenAnswer(purpose, "只需要麦克风和录制", "zh").values).toHaveLength(1);
    expect(matchSpokenAnswer(purpose, "सिर्फ माइक्रोफोन और रिकॉर्डिंग", "hi").values).toHaveLength(1);
  });

  it("interprets Portuguese, Italian and Dutch answers with their phrase tables", () => {
    const opportunity = questionFor("meeting-room", "opportunity");
    expect(matchSpokenAnswer(opportunity, "uma sala de reuniões para a direção", "pt-PT").values).toEqual(["meeting-room"]);
    expect(matchSpokenAnswer(opportunity, "una sala riunioni per i dirigenti", "it-IT").values).toEqual(["meeting-room"]);
    expect(matchSpokenAnswer(opportunity, "een vergaderruimte voor het bestuur", "nl-NL").values).toEqual(["meeting-room"]);

    const usb = questionFor("meeting-room", "usb", UC_ENABLED);
    expect(matchSpokenAnswer(usb, "sem usb nenhum", "pt").values).toEqual(["no-usb"]);
    expect(matchSpokenAnswer(usb, "il portatile del visitatore", "it").values).toEqual(["byod-byom"]);
    expect(matchSpokenAnswer(usb, "geen usb", "nl").values).toEqual(["no-usb"]);
  });

  it("interprets Swedish, Norwegian and Russian answers with their phrase tables", () => {
    const opportunity = questionFor("meeting-room", "opportunity");
    expect(matchSpokenAnswer(opportunity, "ett konferensrum för ledningen", "sv-SE").values).toEqual(["meeting-room"]);
    expect(matchSpokenAnswer(opportunity, "et møterom for ledelsen", "nb-NO").values).toEqual(["meeting-room"]);
    expect(matchSpokenAnswer(opportunity, "переговорная для руководства", "ru-RU").values).toEqual(["meeting-room"]);

    const cameras = questionFor("meeting-room", "uc-camera", UC_ENABLED);
    const svCameras = matchSpokenAnswer(cameras, "en ptz kamera och en webkamera", "sv").values;
    expect(svCameras).toContain("usb-ptz-camera");
    expect(svCameras).toContain("fixed-usb-camera");
    expect(matchSpokenAnswer(cameras, "без камер", "ru").values).toEqual([]);
  });

  it("interprets Chinese and Hindi answers with their phrase tables", () => {
    const opportunity = questionFor("meeting-room", "opportunity");
    expect(matchSpokenAnswer(opportunity, "一个董事会议室", "zh-CN").values).toEqual(["meeting-room"]);
    expect(matchSpokenAnswer(opportunity, "एक बैठक कक्ष", "hi-IN").values).toEqual(["meeting-room"]);

    const purpose = questionFor("meeting-room", "uc-purpose", UC_ENABLED);
    expect(matchSpokenAnswer(purpose, "只需要麦克风", "zh").values).toEqual(["microphones-only"]);
    expect(matchSpokenAnswer(purpose, "कोई माइक्रोफोन नहीं", "hi").values).toEqual(["no-uc"]);
  });

  it("falls back to English phrases for languages without tables", () => {
    const opportunity = questionFor("meeting-room", "opportunity");
    expect(matchSpokenAnswer(opportunity, "a boardroom for the exec team", "xx-YY").values).toEqual(["meeting-room"]);
  });

  it("resolves the native-review corrections to the right options", () => {
    const usb = questionFor("meeting-room", "usb", UC_ENABLED);
    // "host" ownership phrasing (was "owner" machine-translation in each language).
    expect(matchSpokenAnswer(usb, "o portátil é o host", "pt").values).toContain("byod-byom");
    expect(matchSpokenAnswer(usb, "il laptop è l'host", "it").values).toEqual(["byod-byom"]);
    expect(matchSpokenAnswer(usb, "de laptop is de eigenaar", "nl").values).toEqual(["byod-byom"]);
    expect(matchSpokenAnswer(usb, "ноутбук является хостом", "ru").values).toEqual(["byod-byom"]);
    expect(matchSpokenAnswer(usb, "笔记本是主机", "zh").values).toEqual(["byod-byom"]);
    expect(matchSpokenAnswer(usb, "लैपटॉप होस्ट है", "hi").values).toEqual(["byod-byom"]);
    expect(matchSpokenAnswer(usb, "ikke noe usb", "nb").values).toEqual(["no-usb"]);

    // The Chinese "network camera" collision: 电脑摄像头 is a fixed USB webcam,
    // 网络摄像头 is an IP/NDI camera — they must not land on the same option.
    const camera = questionFor("meeting-room", "uc-camera", UC_ENABLED);
    expect(matchSpokenAnswer(camera, "电脑摄像头", "zh").values).toEqual(["fixed-usb-camera"]);
    expect(matchSpokenAnswer(camera, "网络摄像头", "zh").values).toEqual(["ndi-network-camera"]);

    // Portuguese lectern: "atril" is the word; the wrong "atalaia" is gone.
    const mics = questionFor("meeting-room", "uc-microphones", UC_ENABLED);
    expect(matchSpokenAnswer(mics, "atril", "pt").values).toEqual(["lectern-microphone"]);
    expect(matchSpokenAnswer(mics, "atalaia", "pt").values).toEqual([]);

    // Boardroom phrase fixes resolve in their languages.
    const opportunity = questionFor("meeting-room", "opportunity");
    expect(matchSpokenAnswer(opportunity, "sala da direção", "pt").values).toEqual(["meeting-room"]);
    expect(matchSpokenAnswer(opportunity, "sala direzionale", "it").values).toEqual(["meeting-room"]);
  });
});

describe("guided interview Q&A trail (buildDiscoveryConversation)", () => {
  it("records question, governed answer and customer wording per captured step", () => {
    const questions = buildInterviewQuestions("meeting-room", {});
    const trail = buildDiscoveryConversation(
      questions,
      { opportunity: "meeting-room", sources: "two-four-sources" },
      { opportunity: "A boardroom for the exec team." },
      "meeting-room",
    );

    const opportunity = trail.find((item) => item.stepId === "opportunity");
    expect(opportunity?.question).toBe("What type of opportunity is this?");
    expect(opportunity?.answer).toBe("Meeting room / boardroom");
    expect(opportunity?.note).toBe("A boardroom for the exec team.");

    const sources = trail.find((item) => item.stepId === "sources");
    expect(sources?.answer).toBe("2-4 sources");
    expect(sources?.note).toBe("");
  });

  it("marks note-only captures as open answers instead of guessing", () => {
    const questions = buildInterviewQuestions("meeting-room", {});
    const trail = buildDiscoveryConversation(
      questions,
      {},
      { opportunity: "Customer wants something for the lobby." },
    );
    expect(trail).toHaveLength(1);
    expect(trail[0].answer).toBe("Captured note only");
    expect(trail[0].note).toBe("Customer wants something for the lobby.");
  });

  it("returns an empty trail when nothing has been captured", () => {
    const questions = buildInterviewQuestions("meeting-room", {});
    expect(buildDiscoveryConversation(questions, {}, {})).toEqual([]);
  });

  it("keeps the typed wording beside a chip-confirmed governed answer", () => {
    // Mirrors the standard-flow capture box: the rep types "several rooms",
    // the suggestion chip maps it to multiple-rooms, and confirming stores the
    // governed answer while the typed note is retained untouched.
    const questions = buildInterviewQuestions("meeting-room", {});
    const trail = buildDiscoveryConversation(
      questions,
      { scale: "multi-room" },
      { scale: "several rooms" },
      "meeting-room",
    );

    const scale = trail.find((item) => item.stepId === "scale");
    expect(scale?.answer).toBe("Multiple rooms / zones");
    expect(scale?.note).toBe("several rooms");
  });

  it("carries both values of a chip-confirmed multi-select alongside the wording", () => {
    const questions = buildInterviewQuestions("meeting-room", {});
    const trail = buildDiscoveryConversation(
      questions,
      { "uc-purpose": ["video-conferencing", "recording-streaming"] },
      { "uc-purpose": "teams calls and recording lectures" },
      "meeting-room",
    );

    const purpose = trail.find((item) => item.stepId === "uc-purpose");
    expect(purpose?.answer).toBe("Video conferencing, Recording or live streaming");
    expect(purpose?.note).toBe("teams calls and recording lectures");
  });

  it("flags only rep-confirmed rows as confirmed in the trail", () => {
    const questions = buildInterviewQuestions("meeting-room", {});
    const trail = buildDiscoveryConversation(
      questions,
      { opportunity: "meeting-room", sources: "two-four-sources" },
      {},
      "meeting-room",
      { opportunity: true },
    );

    const opportunity = trail.find((item) => item.stepId === "opportunity");
    expect(opportunity?.confirmed).toBe(true);

    const sources = trail.find((item) => item.stepId === "sources");
    expect(sources?.confirmed).toBe(false);
  });

  it("defaults rows to open when no confirmation map is supplied", () => {
    const questions = buildInterviewQuestions("meeting-room", {});
    const trail = buildDiscoveryConversation(
      questions,
      { opportunity: "meeting-room" },
      {},
      "meeting-room",
    );
    expect(trail[0].confirmed).toBe(false);
  });
});
