import { describe, expect, it } from "vitest";
import { deriveDiscoveryAudioDesign, readDiscoveryAudioDesign } from "./discoveryAudioDesign";
import { buildSystemDesign } from "./discoverySystemDesign";
import { normaliseProjectTopology } from "./projectTopology";
import { compileDiscoveryBrief } from "../pages/discovery/discoveryBriefBuilder";
import { buildSalesReadinessPackage } from "./salesReadiness";
import { getVisibleDiscoveryQuestions } from "../pages/discovery/discoveryQuestions";
import { BASIC_MODE_REQUIRED_IDS } from "../pages/discovery/discoveryProgressiveDisclosure";
import { compileProjectApplicationProposal } from "./proposalCompiler";

describe("Discovery audio design direction", () => {
  it("keeps silent signage free of room audio scope and hides its follow-up questions", () => {
    const answers = { audio: "no-room-audio", "uc-purpose": "no-uc" };
    expect(deriveDiscoveryAudioDesign(answers)).toBeUndefined();
    expect(getVisibleDiscoveryQuestions("hospitality", answers).some((q) => q.id === "audio-zones")).toBe(false);
    const uc = { ...answers, "uc-purpose": "video-conferencing" };
    expect(getVisibleDiscoveryQuestions("meeting-room", uc).some((q) => q.id === "room-acoustics")).toBe(true);
    expect(BASIC_MODE_REQUIRED_IDS).toEqual(expect.arrayContaining(["audio", "audio-zones", "audio-programme", "room-acoustics"]));
  });
  it("asks for the programme-audio route only where audio is in scope", () => {
    const inScope = getVisibleDiscoveryQuestions("hospitality", { audio: "room-audio" });
    expect(inScope.some((question) => question.id === "audio-route")).toBe(true);
    // The route sits directly after the audio question, before zones are asked.
    const ids = inScope.map((question) => question.id);
    expect(ids.indexOf("audio-route")).toBe(ids.indexOf("audio") + 1);
    expect(BASIC_MODE_REQUIRED_IDS).toContain("audio-route");

    const silent = getVisibleDiscoveryQuestions("hospitality", { audio: "no-room-audio", "uc-purpose": "no-uc" });
    expect(silent.some((question) => question.id === "audio-route")).toBe(false);
  });
  it("records where programme audio is extracted and where it must arrive", () => {
    const answers = { audio: ["room-audio", "source-audio-deembed"], "audio-route": ["extract-at-switcher", "route-to-room-amplifier", "route-to-uc-host"] };
    const design = deriveDiscoveryAudioDesign(answers)!;

    expect(design.route).toBe("Programme audio is taken from the matrix, switcher or wall processor and delivered to the room amplifier, DSP or loudspeakers and the UC host over USB audio.");
    // The answer is kept as its values too, so the schematic can draw the paths
    // rather than parse the sentence.
    expect(design.extraction).toBe("extract-at-switcher");
    expect(design.destinations).toEqual(["route-to-room-amplifier", "route-to-uc-host"]);
    expect(design.requiredScope.map((scope) => scope.key)).toEqual(expect.arrayContaining(["usb-audio", "processing"]));

    // The brief carries the sentence, and the room-audio slot quotes it as the
    // feed it is being asked to play.
    const visible = getVisibleDiscoveryQuestions("meeting-room", answers);
    const brief = compileDiscoveryBrief({
      answers, notes: {}, topology: normaliseProjectTopology({}), discoveryQuestions: visible, modeQuestions: visible,
      basicQuestionIds: new Set(BASIC_MODE_REQUIRED_IDS), progressiveMode: "expert", selectedApplication: "meeting-room",
      capturedSummary: [], opportunityDescription: "Teaching room", clientName: "", contactName: "", siteName: "",
      budgetLevel: "", timeline: "", completionPercent: 70, confirmedSteps: {}, confidenceByStep: {}, confidenceScoresByStep: {},
      decisionIntegrity: { canProceedToRecommendation: true, issues: [] },
    });
    expect((brief.roomModel as Record<string, unknown>).audioRoute).toBe(design.route);
    const system = buildSystemDesign(brief);
    expect(system.slots.find((slot) => slot.kind === "room-audio")!.derivedFrom.join(" ")).toContain(design.route!);

    // The proposal prints the route before the signal path it explains, and the
    // stored design round-trips it.
    const restored = readDiscoveryAudioDesign(JSON.parse(JSON.stringify(design)))!;
    const packageResult = buildSalesReadinessPackage({ products: [], assumptions: [], discovery: { projectTitle: "Meeting room", summary: "Teaching", roomSize: "8 × 6m", displays: "1", usb: "Room PC owns USB", distance: "10m", budget: "Unknown", audioDesign: restored } });
    const proposal = compileProjectApplicationProposal({ vertical: "Education", application: "Meeting room", summary: "Teaching", architecture: restored.direction, products: [], bomRows: packageResult.bomRows, assumptions: restored.validation, audioDesign: restored });
    expect(proposal.technicalFacts).toContain(design.route);
    // The USB-audio destination is a scope-by-others row, not just a sentence.
    expect(proposal.thirdPartyScope?.some((scope) => scope.description.includes("USB audio bridge"))).toBe(true);
    expect(restored.extraction).toBe("extract-at-switcher");
    expect(readDiscoveryAudioDesign({ ...restored, route: 5 })).toBeUndefined();
    expect(readDiscoveryAudioDesign({ ...restored, destinations: [1] })).toBeUndefined();
    // A design saved before the values were kept still loads on its sentence.
    const legacy = readDiscoveryAudioDesign({ ...design, extraction: undefined, destinations: undefined })!;
    expect(legacy.route).toBe(design.route);
  });
  it("adds the audio network for a Dante route and asks for the half that was not recorded", () => {
    const dante = deriveDiscoveryAudioDesign({ audio: "source-audio-deembed", "audio-route": ["extract-at-display", "route-to-dante"] })!;
    expect(dante.route).toContain("the display or projector output");
    expect(dante.requiredScope.map((scope) => scope.key)).toContain("network");

    const destinationsOnly = deriveDiscoveryAudioDesign({ audio: "room-audio", "audio-route": ["route-to-recorder"] })!;
    expect(destinationsOnly.route).toContain("where it is taken from is not recorded yet");
    expect(destinationsOnly.validation).toContain("Confirm where programme audio is extracted: a destination is recorded without the point the sound is taken from.");

    const extractionOnly = deriveDiscoveryAudioDesign({ audio: "room-audio", "audio-route": ["extract-at-source"] })!;
    expect(extractionOnly.validation).toContain("Confirm where the extracted programme audio must arrive.");

    expect(destinationsOnly.extraction).toBeUndefined();
    expect(destinationsOnly.destinations).toEqual(["route-to-recorder"]);

    const unknown = deriveDiscoveryAudioDesign({ audio: "room-audio", "audio-route": ["unknown-audio-route"] })!;
    expect(unknown.route).toBeUndefined();
    expect(unknown.extraction).toBeUndefined();
    expect(unknown.destinations).toBeUndefined();
    expect(unknown.validation).toContain("Confirm the programme-audio route: the extraction point and every destination.");
  });
  it("specifies independently controlled commercial zones without automatically adding Dante or concert arrays", () => {
    const design = deriveDiscoveryAudioDesign({ audio: "distributed-70v-100v", "audio-zones": "independent-audio-zones", "audio-programme": "speech-background", "room-acoustics": "treated-room" }, { "audio-zones": "Bar, dining and terrace: three independently selected feeds." })!;
    expect(design.direction).toContain("70/100V");
    expect(design.zoning).toContain("independently selects");
    expect(design.requiredScope.map((s) => s.key)).toEqual(["speakers", "amplification", "processing"]);
    expect(design.basis).toContain("three");
  });
  it("distinguishes a reflective lecture room from a live-performance auditorium", () => {
    const answers = { audio: "room-audio", "room-acoustics": ["reflective-room", "deep-tiered-room"], "audio-programme": "speech-background" };
    const speech = deriveDiscoveryAudioDesign(answers)!;
    expect(speech.requiredScope.map((s) => s.key)).toContain("columns");
    expect(speech.requiredScope.map((s) => s.key)).toContain("acoustics");
    expect(speech.requiredScope.map((s) => s.key)).not.toContain("amplification");
    const live = deriveDiscoveryAudioDesign({ ...answers, "audio-programme": "live-performance" })!;
    expect(live.requiredScope.map((s) => s.key)).toContain("arrays");
    expect(live.requiredScope.find((s) => s.key === "arrays")!.notes).toContain("rigging");
  });
  it("accounts for two-way UC, treatment and a separately requested Dante path", () => {
    const design = deriveDiscoveryAudioDesign({ audio: "room-audio", "uc-purpose": "video-conferencing", "uc-microphone-connection": "dante-microphone-path", "room-acoustics": "reflective-room" })!;
    expect(design.signalPath).toContain("AEC reference");
    expect(design.signalPath).toContain("exclude that return");
    expect(design.requiredScope.map((s) => s.key)).toEqual(expect.arrayContaining(["processing", "network", "acoustics"]));
    expect(design.validation).toContain("Confirm audio zones and independent source controls.");
    expect(deriveDiscoveryAudioDesign({ audio: "room-audio", "uc-purpose": "video-conferencing", "uc-audio-processing": "direct-integrated-audio" })!.requiredScope.some((s) => s.key === "amplification")).toBe(false);
  });
  it("carries saved direction into required BOM allowances and the customer proposal", () => {
    const audioDesign = deriveDiscoveryAudioDesign({ audio: "room-audio", "audio-programme": "speech-background", "room-acoustics": ["reflective-room", "deep-tiered-room"] })!;
    const restored = readDiscoveryAudioDesign(JSON.parse(JSON.stringify(audioDesign)))!;
    const packageResult = buildSalesReadinessPackage({ products: [], assumptions: [], discovery: { projectTitle: "Lecture room", summary: "Teaching", roomSize: "24 × 18m", displays: "1", usb: "None", distance: "20m", budget: "Unknown", audioDesign: restored } });
    const columns = packageResult.bomRows.find((r) => r.sku === "BY-OTHERS-DISCOVERY-AUDIO-COLUMNS");
    expect(columns).toMatchObject({ qty: 1, type: "Required", status: "included" });
    expect(columns!.notes).toContain("complete measured package allowance");
    const proposal = compileProjectApplicationProposal({ vertical: "Education", application: "Lecture room", summary: "Teaching", architecture: audioDesign.direction, products: [], bomRows: packageResult.bomRows, assumptions: audioDesign.validation, audioDesign: restored });
    expect(proposal.solutionOverview).toContain(audioDesign.zoning);
    expect(proposal.technicalFacts).toContain(audioDesign.signalPath);
    expect(proposal.thirdPartyScope?.some((scope) => scope.description.includes("steerable"))).toBe(true);
    expect(proposal.thirdPartyScope?.some((scope) => scope.description.includes("Acoustic survey"))).toBe(true);
  });
});
