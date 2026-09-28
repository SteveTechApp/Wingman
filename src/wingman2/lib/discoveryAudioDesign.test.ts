import { describe, expect, it } from "vitest";
import { deriveDiscoveryAudioDesign, readDiscoveryAudioDesign } from "./discoveryAudioDesign";
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
