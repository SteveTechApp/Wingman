/**
 * The I/O and fact side of a comparison: what each side's ports and features
 * actually are, how the competitor's connector coverage lines up with a
 * WyreStorm candidate, and the core fact table the page renders from it.
 *
 * This was the fact-table half of `ComparePageNew.advanced.tsx`. It is pure
 * (profiles and candidates in, strings and rows out), so the page entry reads
 * it instead of carrying it.
 */

import { weakestLinkTier } from "../../components/GovernedDataBadge";
import type { ScoredCandidate, WyreStormProduct } from "../../features/compare";
import type { CompareSpecFacts } from "../../lib/competitorCompareDecision";
import { findKnownWyrestormCompareProfile, hydrateWyrestormCompareProfile, type KnownWyrestormCompareProfile } from "../../lib/knownWyrestormCompareProfiles";
import { buildWyrestormCompareProfile } from "../../lib/wyrestormCompareProfile";
import { commercializeCompareCopy, salesImportantDifference, uniqueText } from "../../lib/repScript";
import {
  commercialPortLabel,
  competitorAudioNetworkFacts,
  competitorControlFacts,
  competitorHdbasetFacts,
  competitorUsbFacts,
  competitorVideoProtectionFacts,
  joinCommercialFactParts,
  unsupportedCompetitorVideoPorts,
} from "./compareCompetitorFacts";
import type { CompareCoreFact, CompetitorProfile, CompetitorSummary, WyreStormSummary } from "./compareTypes";

type CompareIoSnapshot = {
  inputCount?: number;
  outputCount?: number;
  inputFamilies: string[];
  outputFamilies: string[];
  additionalVideoFamilies: string[];
  waivedAdditionalVideoFamilies: string[];
};

const WYRESTORM_NATIVE_INPUT_FAMILIES = new Set(["HDMI", "HDBaseT/TPS", "Network/LAN", "USB-C"]);
const WYRESTORM_NATIVE_OUTPUT_FAMILIES = new Set(["HDMI", "HDBaseT/TPS", "Network/LAN"]);

export function assessCompetitorConnectorCoverage(snapshot: CompareIoSnapshot): {
  supportedFamilies: string[];
  unsupportedFamilies: string[];
  predominantlyUnsupported: boolean;
} {
  const supportedInputFamilies = snapshot.inputFamilies.filter((family) => WYRESTORM_NATIVE_INPUT_FAMILIES.has(family));
  const supportedOutputFamilies = snapshot.outputFamilies.filter((family) => WYRESTORM_NATIVE_OUTPUT_FAMILIES.has(family));
  const supportedFamilies = uniqueText([
    ...supportedInputFamilies,
    ...supportedOutputFamilies,
  ], 12);
  const unsupportedFamilies = uniqueText(snapshot.additionalVideoFamilies, 12);
  const supportedPathCount = supportedInputFamilies.length + supportedOutputFamilies.length;
  const unsupportedPathCount =
    snapshot.inputFamilies.filter((family) => unsupportedFamilies.includes(family)).length +
    snapshot.outputFamilies.filter((family) => unsupportedFamilies.includes(family)).length;

  return {
    supportedFamilies,
    unsupportedFamilies,
    predominantlyUnsupported:
      unsupportedFamilies.length > 0 &&
      (supportedPathCount === 0 || unsupportedPathCount > supportedPathCount),
  };
}

function connectorFamilyLabel(value: string): string {
  const normalized = value.toLowerCase().trim();
  if (/displayport|\bdp\b/.test(normalized)) return "DisplayPort";
  if (/dvi/.test(normalized)) return "DVI";
  if (/vga/.test(normalized)) return "VGA";
  if (/sdi/.test(normalized)) return "SDI";
  if (/composite|cvbs/.test(normalized)) return "Composite";
  if (/component|ypbpr/.test(normalized)) return "Component";
  if (/usb-?c|type-?c/.test(normalized)) return "USB-C";
  if (/hdbaset|tps/.test(normalized)) return "HDBaseT/TPS";
  if (/network|ethernet|lan|avoip/.test(normalized)) return "Network/LAN";
  if (/hdmi/.test(normalized)) return "HDMI";
  return value.trim();
}

function uniqueConnectorFamilies(values: Array<string | null | undefined>): string[] {
  return uniqueText(values.map((value) => value ? connectorFamilyLabel(value) : ""), 12);
}

function connectorFamilyWaived(rawText: string, family: string): boolean {
  const token = family.toLowerCase().replace(/\//g, " ");
  const compact = token.replace(/\s+/g, "[\\s-]*");
  const patterns = [
    new RegExp(`\\b(no|without|ignore|excluding?)\\s+${compact}\\b`, "i"),
    new RegExp(`\\b${compact}\\b.{0,24}\\b(not required|not used|unused|not needed|ignore|exclude)\\b`, "i"),
    new RegExp(`\\b(not required|not used|unused|not needed|ignore|exclude)\\b.{0,24}\\b${compact}\\b`, "i"),
  ];

  return patterns.some((pattern) => pattern.test(rawText));
}

export function buildCompetitorIoSnapshot(profile: CompetitorProfile): CompareIoSnapshot {
  const specs = profile.resolvedSpec?.specs;
  const rawText = profile.rawText.toLowerCase();
  const additionalVideoFamilies = uniqueConnectorFamilies([
    specs?.displayPortInputs || specs?.displayPortOutputs ? "DisplayPort" : "",
    specs?.dviInputs || specs?.dviOutputs ? "DVI" : "",
    specs?.vgaInputs || specs?.vgaOutputs ? "VGA" : "",
    specs?.sdiInputs || specs?.sdiOutputs ? "SDI" : "",
    specs?.compositeInputs || specs?.compositeOutputs ? "Composite" : "",
    specs?.componentInputs || specs?.componentOutputs ? "Component" : "",
  ]);

  return {
    inputCount: profile.resolvedSpec?.inputCount,
    outputCount: profile.resolvedSpec?.outputCount,
    inputFamilies: uniqueConnectorFamilies([
      specs?.hdmiInputs ? "HDMI" : "",
      specs?.usbCPorts ? "USB-C" : "",
      specs?.displayPortInputs ? "DisplayPort" : "",
      specs?.dviInputs ? "DVI" : "",
      specs?.vgaInputs ? "VGA" : "",
      specs?.sdiInputs ? "SDI" : "",
      specs?.compositeInputs ? "Composite" : "",
      specs?.componentInputs ? "Component" : "",
      specs?.networkPorts && /encoder|transmitter|av over ip|avoip|networkhd/.test(rawText) ? "Network/LAN" : "",
      /hdbaset|tps/.test(rawText) && /matrix|switcher|presentation|extender|input/.test(rawText) ? "HDBaseT/TPS" : "",
      !specs?.hdmiInputs && /\bhdmi\b/.test(rawText) && /matrix|switcher|presentation|encoder|transmitter|source/.test(rawText) ? "HDMI" : "",
      /\busb-?c\b/.test(rawText) ? "USB-C" : "",
    ]),
    outputFamilies: uniqueConnectorFamilies([
      specs?.hdmiOutputs ? "HDMI" : "",
      specs?.displayPortOutputs ? "DisplayPort" : "",
      specs?.dviOutputs ? "DVI" : "",
      specs?.vgaOutputs ? "VGA" : "",
      specs?.sdiOutputs ? "SDI" : "",
      specs?.compositeOutputs ? "Composite" : "",
      specs?.componentOutputs ? "Component" : "",
      specs?.networkPorts && /decoder|receiver|av over ip|avoip|networkhd/.test(rawText) ? "Network/LAN" : "",
      /hdbaset|tps/.test(rawText) && /matrix|switcher|presentation|extender|output|display/.test(rawText) ? "HDBaseT/TPS" : "",
      !specs?.hdmiOutputs && /\bhdmi\b/.test(rawText) && /output|display|decoder|receiver|matrix|switcher/.test(rawText) ? "HDMI" : "",
    ]),
    additionalVideoFamilies,
    waivedAdditionalVideoFamilies: additionalVideoFamilies.filter((family) => connectorFamilyWaived(profile.rawText, family)),
  };
}

export function buildWyrestormIoSnapshot(product: WyreStormProduct): CompareIoSnapshot {
  const knownProfile = findKnownWyrestormCompareProfile(product.sku);
  const hydratedProduct = hydrateWyrestormCompareProfile({
    ...product,
    title: product.name,
    category: product.productClass,
    role: product.role,
    description: product.name,
    summary: product.caveat,
    technologies: [product.transport],
    features: product.tags,
    capabilities: product.tags,
  }) as Parameters<typeof buildWyrestormCompareProfile>[0];
  const profile = buildWyrestormCompareProfile(hydratedProduct);
  const specs = profile.specs;
  const transportText = `${product.transport} ${profile.transport} ${product.role} ${product.productClass}`.toLowerCase();

  return {
    inputCount: knownProfile?.routedInputCount ?? profile.inputCount,
    outputCount: knownProfile?.routedOutputCount ?? profile.outputCount,
    inputFamilies: uniqueConnectorFamilies([
      ...(knownProfile?.inputTypes ?? []),
      specs?.hdmiInputs ? "HDMI" : "",
      specs?.usbCPorts ? "USB-C" : "",
      specs?.networkPorts && /encoder|transmitter|av over ip|avoip|networkhd/.test(transportText) ? "Network/LAN" : "",
      /\bhdbaset\b|\btps\b/.test(transportText) && /matrix|switcher|presentation|extender|input/.test(transportText) ? "HDBaseT/TPS" : "",
      /\bhdmi\b/.test(transportText) && /matrix|switcher|presentation|encoder|transmitter|source/.test(transportText) ? "HDMI" : "",
      /\busb-?c\b/.test(transportText) ? "USB-C" : "",
    ]),
    outputFamilies: uniqueConnectorFamilies([
      ...(knownProfile?.routedOutputTypes ?? knownProfile?.outputTypes ?? []),
      specs?.hdmiOutputs ? "HDMI" : "",
      specs?.networkPorts && /decoder|receiver|av over ip|avoip|networkhd/.test(transportText) ? "Network/LAN" : "",
      /\bhdbaset\b/.test(transportText) ? "HDBaseT/TPS" : "",
      /\bhdmi\b/.test(transportText) && /output|display|decoder|receiver|matrix|switcher/.test(transportText) ? "HDMI" : "",
    ]),
    additionalVideoFamilies: [],
    waivedAdditionalVideoFamilies: [],
  };
}

export function coversConnectorFamily(candidateFamilies: string[], requiredFamily: string): boolean {
  return candidateFamilies.includes(requiredFamily);
}

export function compareInputOutputFit(
  label: "input" | "output",
  competitorCount: number | undefined,
  candidateCount: number | undefined,
  matched: string[],
  partialMatches: string[],
  mismatches: string[],
  blockers: string[],
): number {
  if (!competitorCount || !candidateCount) {
    return 0;
  }

  if (candidateCount < competitorCount) {
    mismatches.push(`WyreStorm provides ${candidateCount} ${label}${candidateCount === 1 ? "" : "s"}, but the competitor brief needs ${competitorCount}.`);
    blockers.push(`Do not recommend a product with fewer ${label}${competitorCount === 1 ? "" : "s"} than the competitor brief requires.`);
    return -72;
  }

  if (candidateCount === competitorCount) {
    matched.push(`Same ${label} count: ${candidateCount}.`);
    return 22;
  }

  const spare = candidateCount - competitorCount;
  matched.push(`Covers the required ${label} count (${competitorCount}) with ${spare} spare.`);

  if (spare >= 4) {
    partialMatches.push(`Larger ${label} frame than the competitor brief; confirm that the extra I/O is commercially acceptable.`);
  }

  return Math.max(10, 18 - spare * 2);
}

function normalizeCompareValue(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function compareValueCount(value: string): number | null {
  const match = value.match(/\b(\d+)x\b/i);
  return match ? Number(match[1]) : null;
}

function compareSharesToken(value: string, tokens: string[]): boolean {
  const normalized = normalizeCompareValue(value);
  return tokens.some((token) => normalized.includes(token));
}

function compareOutputMode(value: string): "mirrored" | "loop" | "local-monitor" | "routed" | "unknown" {
  const normalized = normalizeCompareValue(value);
  if (normalized.includes("mirrored")) return "mirrored";
  if (normalized.includes("loop")) return "loop";
  if (normalized.includes("local monitor")) return "local-monitor";
  if (normalized.includes("routed") || normalized.includes("display zone")) return "routed";
  return "unknown";
}

function compareOutputFamilies(value: string): string[] {
  const normalized = normalizeCompareValue(value);
  const families: string[] = [];
  if (normalized.includes("hdbaset") || normalized.includes("tps")) families.push("hdbaset");
  if (normalized.includes("hdmi")) families.push("hdmi");
  if (normalized.includes("network") || normalized.includes("lan") || normalized.includes("avoip")) families.push("network");
  if (normalized.includes("displayport")) families.push("displayport");
  if (normalized.includes("dvi")) families.push("dvi");
  if (normalized.includes("sdi")) families.push("sdi");
  return families;
}

function compareOutputEvidenceResult(competitor: string, wyrestorm: string): string | null {
  const competitorMode = compareOutputMode(competitor);
  const wyrestormMode = compareOutputMode(wyrestorm);

  if (
    competitorMode !== "unknown"
    && wyrestormMode !== "unknown"
    && competitorMode !== wyrestormMode
  ) {
    return "Output behaviour differs - verify";
  }

  const competitorFamilies = compareOutputFamilies(competitor);
  const wyrestormFamilies = compareOutputFamilies(wyrestorm);

  if (competitorFamilies.length && wyrestormFamilies.length) {
    const familyOverlap = competitorFamilies.some((family) => wyrestormFamilies.includes(family));
    if (!familyOverlap) {
      return "Output type differs - verify";
    }
  }

  return null;
}

function compareRowResult(label: string, competitor: string, wyrestorm: string): string {
  const competitorValue = commercializeCompareCopy(competitor);
  const wyrestormValue = commercializeCompareCopy(wyrestorm);

  if (label === "Main caveat") {
    return "Check before quote";
  }

  if (!competitorValue || !wyrestormValue) {
    return "Needs verification";
  }

  if (normalizeCompareValue(competitorValue) === normalizeCompareValue(wyrestormValue)) {
    return "Aligned";
  }

  if (label === "Inputs" || label === "Outputs") {
    const competitorCount = compareValueCount(competitorValue);
    const wyrestormCount = compareValueCount(wyrestormValue);

    if (label === "Outputs") {
      const outputEvidenceResult = compareOutputEvidenceResult(competitorValue, wyrestormValue);
      if (outputEvidenceResult) return outputEvidenceResult;
    }

    if (competitorCount !== null && wyrestormCount !== null) {
      if (wyrestormCount < competitorCount) return "Too few ports";
      return competitorCount === wyrestormCount ? "Counts align" : "Covers required count";
    }

    return "Check connection mix";
  }

  if (label === "USB") {
    if (/needs checking before quote/i.test(`${competitorValue} ${wyrestormValue}`)) return "USB check";
    if (/usb/i.test(competitorValue) && /usb/i.test(wyrestormValue)) return "USB path present";
    return "USB differs";
  }

  if (label === "Max resolution") {
    if (normalizeCompareValue(competitorValue) === normalizeCompareValue(wyrestormValue)) return "Resolution aligns";
    if (compareSharesToken(competitorValue, ["4k"]) && compareSharesToken(wyrestormValue, ["4k"])) return "Same 4K class";
    return "Resolution differs";
  }

  if (label === "Transport") {
    if (compareSharesToken(competitorValue, ["av over ip"]) && compareSharesToken(wyrestormValue, ["avoip", "networkhd"])) return "Same transport lane";
    if (compareSharesToken(competitorValue, ["hdbaset", "tps"]) && compareSharesToken(wyrestormValue, ["hdbaset", "tps"])) return "Same transport lane";
    if (compareSharesToken(competitorValue, ["hdmi"]) && compareSharesToken(wyrestormValue, ["hdmi"])) return "Same transport lane";
    return "Closest direction";
  }

  if (label === "Signal direction") {
    if (compareSharesToken(competitorValue, ["source side", "encoder"]) && compareSharesToken(wyrestormValue, ["source side", "encoder"])) return "Same signal role";
    if (compareSharesToken(competitorValue, ["display side", "decoder"]) && compareSharesToken(wyrestormValue, ["display side", "decoder"])) return "Same signal role";
    if (compareSharesToken(competitorValue, ["room core", "switching", "in room"]) && compareSharesToken(wyrestormValue, ["room core", "switching", "in room"])) return "Same signal role";
    return "Role differs";
  }

  if (label === "Product type") {
    if (compareSharesToken(competitorValue, ["matrix"]) && compareSharesToken(wyrestormValue, ["matrix"])) return "Matrix match";
    if (compareSharesToken(competitorValue, ["presentation switcher", "switcher"]) && compareSharesToken(wyrestormValue, ["presentation switcher", "switcher"])) return "Switcher match";
    if (compareSharesToken(competitorValue, ["ndi camera", "camera"]) && compareSharesToken(wyrestormValue, ["ndi camera", "camera"])) return "Camera match";
    if (compareSharesToken(competitorValue, ["av over ip"]) && compareSharesToken(wyrestormValue, ["av over ip"])) return "AV-over-IP match";
    return "Closest direction";
  }

  return "Check fit";
}

function _compareQuoteChecks(competitor: CompetitorSummary, candidate: ScoredCandidate): string[] {
  return uniqueText([
    ...candidate.blockers,
    ...candidate.mismatches,
    ...candidate.dependencies,
    ...candidate.unknowns,
    ...candidate.checks,
    ...candidate.gaps,
    ...competitor.verifyItems,
    competitor.warning,
  ].map((item) => commercializeCompareCopy(item)).filter(Boolean), 8);
}

function compareSpecificQuoteChecks(competitor: CompetitorSummary, candidate: ScoredCandidate): string[] {
  return uniqueText([
    ...candidate.unknowns,
    ...candidate.checks,
    ...candidate.gaps,
    ...competitor.verifyItems,
    competitor.warning,
    ...candidate.mismatches,
    ...candidate.blockers,
  ].map((item) => commercializeCompareCopy(item)).filter(Boolean), 8);
}

function compareCompetitorMainCaveat(competitor: CompetitorSummary, candidate: ScoredCandidate): string {
  const checks = compareSpecificQuoteChecks(competitor, candidate);
  const preferred = checks.find((item) => /needs checking before quote|closest direction only|not a direct/i.test(item)) || checks[0];

  if (preferred) {
    return preferred;
  }

  if (/presentation switcher/i.test(competitor.recognisedClass)) {
    return "USB path, display behaviour and room workflow need checking before quote.";
  }

  if (/matrix/i.test(competitor.recognisedClass)) {
    return "Input/output count and output behaviour need checking before quote.";
  }

  if (/av-over-ip/i.test(competitor.recognisedClass)) {
    return "Controller, codec and network requirements need checking before quote.";
  }

  if (/hdbaset|extender/i.test(competitor.recognisedClass) || /extender/i.test(competitor.role)) {
    return "Distance, USB and control requirements need checking before quote.";
  }

  if (/ndi camera|ptz camera/i.test(competitor.recognisedClass) || /camera/i.test(competitor.role)) {
    return "Camera control, output path and resolution need checking before quote.";
  }

  if (/wireless/i.test(competitor.recognisedClass) || /wireless/i.test(competitor.role)) {
    return "Wireless policy and guest-share workflow need checking before quote.";
  }

  return "Feature fit needs checking before quote.";
}

function compareWyreStormMainCaveat(competitor: CompetitorSummary, candidate: ScoredCandidate): string {
  if (/av-over-ip/i.test(competitor.recognisedClass) && /^NHD-/i.test(candidate.product.sku)) {
    return "Closest direction, not confirmed one-box replacement.";
  }

  if (/presentation switcher/i.test(competitor.recognisedClass) && /^SW-|^MX-/i.test(candidate.product.sku)) {
    return "Switcher direction matches, but USB path and room workflow must line up.";
  }

  if (/matrix/i.test(competitor.recognisedClass) && /^MX/i.test(candidate.product.sku)) {
    return "Matrix direction matches, but routed I/O and output behaviour must line up.";
  }

  if (/hdbaset|extender/i.test(competitor.recognisedClass) || /^EX-/i.test(candidate.product.sku)) {
    return "Extender direction matches, but distance, USB and control must line up.";
  }

  if (/ndi camera|ptz camera/i.test(competitor.recognisedClass) || /^CAM-/i.test(candidate.product.sku)) {
    return "Camera direction matches, but control, optics and output expectations must line up.";
  }

  if (/wireless/i.test(competitor.recognisedClass) || /^SW-6\d{2}.*-W$/i.test(candidate.product.sku)) {
    return "Wireless direction matches, but policy and guest-share expectations must line up.";
  }

  return commercializeCompareCopy(salesImportantDifference(competitor, candidate))
    || "Closest direction, not confirmed one-box replacement.";
}

function explicitPortSummary(specs: CompareSpecFacts | undefined, direction: "input" | "output"): string {
  if (!specs) {
    return "";
  }

  const connectorParts = [
    commercialPortLabel(direction === "input" ? specs.hdmiInputs : specs.hdmiOutputs, direction === "input" ? "HDMI input" : "HDMI output", direction === "input" ? "HDMI inputs" : "HDMI outputs"),
    commercialPortLabel(direction === "input" ? specs.displayPortInputs : specs.displayPortOutputs, direction === "input" ? "DisplayPort input" : "DisplayPort output", direction === "input" ? "DisplayPort inputs" : "DisplayPort outputs"),
    commercialPortLabel(direction === "input" ? specs.dviInputs : specs.dviOutputs, direction === "input" ? "DVI input" : "DVI output", direction === "input" ? "DVI inputs" : "DVI outputs"),
    commercialPortLabel(direction === "input" ? specs.vgaInputs : specs.vgaOutputs, direction === "input" ? "VGA input" : "VGA output", direction === "input" ? "VGA inputs" : "VGA outputs"),
    commercialPortLabel(direction === "input" ? specs.sdiInputs : specs.sdiOutputs, direction === "input" ? "SDI input" : "SDI output", direction === "input" ? "SDI inputs" : "SDI outputs"),
    commercialPortLabel(direction === "input" ? specs.compositeInputs : specs.compositeOutputs, direction === "input" ? "composite input" : "composite output", direction === "input" ? "composite inputs" : "composite outputs"),
    commercialPortLabel(direction === "input" ? specs.componentInputs : specs.componentOutputs, direction === "input" ? "component input" : "component output", direction === "input" ? "component inputs" : "component outputs"),
  ].filter(Boolean);

  return joinCommercialFactParts(connectorParts);
}

function inferredCompetitorInputLabel(profile: CompetitorProfile): { singular: string; plural: string } {
  const transport = `${profile.transport} ${profile.resolvedSpec?.transport ?? ""}`.toLowerCase();
  const role = profile.role.toLowerCase();
  const domain = profile.resolvedSpec?.domain ?? "";

  if (domain === "AVOIP" || transport.includes("avoip")) {
    if (/decoder|receiver/.test(role)) return { singular: "LAN/network port", plural: "LAN/network ports" };
    if (transport.includes("hdmi")) return { singular: "HDMI input", plural: "HDMI inputs" };
    return { singular: "local source input", plural: "local source inputs" };
  }

  if (domain === "HDBASET" || /tps|hdbaset/.test(transport)) {
    return { singular: "HDMI input", plural: "HDMI inputs" };
  }

  if (transport.includes("usb-c") && transport.includes("hdmi")) {
    return { singular: "source input (HDMI / USB-C)", plural: "source inputs (HDMI / USB-C)" };
  }

  if (transport.includes("usb-c")) {
    return { singular: "USB-C input", plural: "USB-C inputs" };
  }

  if (transport.includes("hdmi")) {
    return { singular: "HDMI input", plural: "HDMI inputs" };
  }

  return { singular: "source input", plural: "source inputs" };
}

function inferredCompetitorOutputLabel(profile: CompetitorProfile): { singular: string; plural: string } {
  const transport = `${profile.transport} ${profile.resolvedSpec?.transport ?? ""}`.toLowerCase();
  const role = profile.role.toLowerCase();
  const domain = profile.resolvedSpec?.domain ?? "";

  if (domain === "AVOIP" || transport.includes("avoip")) {
    if (/decoder|receiver/.test(role) && transport.includes("hdmi")) return { singular: "HDMI output", plural: "HDMI outputs" };
    return { singular: "LAN/network port", plural: "LAN/network ports" };
  }

  if (transport.includes("tps")) {
    return { singular: "TPS output", plural: "TPS outputs" };
  }

  if (domain === "HDBASET" || transport.includes("hdbaset")) {
    return { singular: "HDBaseT output", plural: "HDBaseT outputs" };
  }

  if (transport.includes("hdmi")) {
    return { singular: "HDMI output", plural: "HDMI outputs" };
  }

  return { singular: "display output", plural: "display outputs" };
}

function competitorInputSummary(profile: CompetitorProfile): string {
  const explicit = explicitPortSummary(profile.resolvedSpec?.specs, "input");
  const count = profile.resolvedSpec?.inputCount;
  const routedArchitecture = profile.productClass === "Matrix" || profile.productClass === "Presentation switcher";

  if (routedArchitecture && count) {
    const routed = commercialPortLabel(count, "routed source input", "routed source inputs");
    return explicit ? `${routed} (${explicit})` : routed;
  }

  if (explicit) {
    return explicit;
  }

  if (!count) {
    return "";
  }

  const label = inferredCompetitorInputLabel(profile);
  return commercialPortLabel(count, label.singular, label.plural);
}

function competitorOutputSummary(profile: CompetitorProfile): string {
  const specs = profile.resolvedSpec?.specs;
  const catalogOutputs = Array.isArray(profile.knownProfile?.outputs) ? profile.knownProfile.outputs : [];
  const catalogLoopOutputs = catalogOutputs.reduce((total, output) => {
    if (!output || typeof output !== "object") return total;
    const item = output as Record<string, unknown>;
    return /loop/i.test(String(item.type ?? item.label ?? "")) ? total + Number(item.count ?? 0) : total;
  }, 0);
  const loopOutputs = specs?.hdmiLoopOutputs ?? catalogLoopOutputs;
  const statedHdmiOutputs = specs?.hdmiOutputs ?? 0;
  const displayHdmiOutputs = loopOutputs > 0 && statedHdmiOutputs >= loopOutputs
    ? statedHdmiOutputs - loopOutputs
    : statedHdmiOutputs;
  const explicit = explicitPortSummary(
    specs ? { ...specs, hdmiOutputs: displayHdmiOutputs || undefined, hdmiLoopOutputs: undefined } : undefined,
    "output",
  );
  const count = profile.resolvedSpec?.outputCount;
  const explicitVideoOutputCount = displayHdmiOutputs +
    (specs?.displayPortOutputs ?? 0) +
    (specs?.dviOutputs ?? 0) +
    (specs?.vgaOutputs ?? 0) +
    (specs?.sdiOutputs ?? 0);
  const inferredHdbasetOutputs = profile.resolvedSpec?.features?.hdbtOutput && count && count > explicitVideoOutputCount
    ? count - explicitVideoOutputCount
    : 0;
  const typedOutputs = joinCommercialFactParts([
    explicit,
    inferredHdbasetOutputs ? commercialPortLabel(inferredHdbasetOutputs, "HDBaseT output", "HDBaseT outputs") : "",
  ]);
  const physicalOutputs = joinCommercialFactParts([
    typedOutputs,
    loopOutputs ? `${loopOutputs}x local HDMI loop output${loopOutputs === 1 ? "" : "s"} (non-routed)` : "",
  ]);
  const routedArchitecture = profile.productClass === "Matrix" || profile.productClass === "Presentation switcher";

  if (routedArchitecture && count) {
    const routed = commercialPortLabel(count, "routed display output", "routed display outputs");
    return typedOutputs ? `${routed} (${typedOutputs})` : routed;
  }

  if (physicalOutputs) {
    return physicalOutputs;
  }

  if (!count) {
    return "";
  }

  const label = inferredCompetitorOutputLabel(profile);
  return commercialPortLabel(count, label.singular, label.plural);
}

export function wyrestormInputSummary(
  candidate: ScoredCandidate,
  profile: ReturnType<typeof buildWyrestormCompareProfile>,
  knownProfile?: KnownWyrestormCompareProfile,
): string {
  const role = candidate.product.role.toLowerCase();
  const family = candidate.product.family.toLowerCase();
  const isAvoipEncoder = /encoder|transmitter/.test(role) && /networkhd|av-over-ip/.test(family);

  // AV-over-IP encoders physically take an HDMI cable, but the customer-facing
  // wording should match the "local source input" language used elsewhere for
  // this family/role rather than the raw HDMI port count.
  const explicit = isAvoipEncoder ? "" : explicitPortSummary(profile.specs, "input");

  if (explicit) {
    return explicit;
  }

  // "Routed source input" wording implies matrix-style switching among several
  // inputs; a single-input AV-over-IP encoder doesn't route anything, so keep
  // it on the "local source input" wording below instead.
  if (knownProfile?.routedInputCount && !isAvoipEncoder) {
    const typeText = knownProfile.inputTypes.length ? ` (${knownProfile.inputTypes.join(" / ")})` : "";
    return `${knownProfile.routedInputCount}x routed source input${knownProfile.routedInputCount === 1 ? "" : "s"}${typeText}`;
  }

  return stripComparePrefix(wyrestormHeadlineIo(candidate, profile.inputCount, profile.outputCount).split(",")[0] ?? "", "Headline I/O");
}

export function wyrestormOutputSummary(
  candidate: ScoredCandidate,
  profile: ReturnType<typeof buildWyrestormCompareProfile>,
  knownProfile?: KnownWyrestormCompareProfile,
): string {
  const explicit = explicitPortSummary(profile.specs, "output");
  const explicitOutputCount = (profile.specs?.hdmiOutputs ?? 0) +
    (profile.specs?.displayPortOutputs ?? 0) +
    (profile.specs?.dviOutputs ?? 0) +
    (profile.specs?.vgaOutputs ?? 0) +
    (profile.specs?.sdiOutputs ?? 0);
  const hdbasetOutputCount = /hdbaset/i.test(`${candidate.product.transport} ${candidate.product.name}`) &&
    profile.outputCount && profile.outputCount > explicitOutputCount
      ? profile.outputCount - explicitOutputCount
      : 0;
  const typedOutputs = joinCommercialFactParts([
    explicit,
    hdbasetOutputCount ? commercialPortLabel(hdbasetOutputCount, "HDBaseT output", "HDBaseT outputs") : "",
  ]);
  const extras = joinCommercialFactParts([
    knownProfile?.mirroredOutputCount
      ? `${knownProfile.mirroredOutputCount}x mirrored ${knownProfile.mirroredOutputTypes.join(" / ")} output${knownProfile.mirroredOutputCount === 1 ? "" : "s"}`
      : "",
    knownProfile?.loopOutputCount
      ? `${knownProfile.loopOutputCount}x loop ${knownProfile.loopOutputTypes.join(" / ")} output${knownProfile.loopOutputCount === 1 ? "" : "s"}`
      : "",
  ]);
  const isPointToPointExtender = /extender|extension|hdbaset/i.test([
    candidate.product.productClass,
    candidate.product.family,
    candidate.product.role,
  ].join(" "));

  if (isPointToPointExtender) {
    const displayOutput = typedOutputs || "1x receiver-side HDMI display output";
    return joinCommercialFactParts([displayOutput, extras]);
  }

  if (knownProfile?.routedOutputCount) {
    const routedTypes = knownProfile.routedOutputTypes.length ? ` (${knownProfile.routedOutputTypes.join(" / ")})` : "";
    const routed = `${knownProfile.routedOutputCount}x routed display output${knownProfile.routedOutputCount === 1 ? "" : "s"}${routedTypes}`;
    return joinCommercialFactParts([routed, extras]);
  }

  if (typedOutputs) {
    return joinCommercialFactParts([typedOutputs, extras]);
  }

  const headlineParts = wyrestormHeadlineIo(candidate, profile.inputCount, profile.outputCount).split(",").slice(1).join(",").trim();
  return joinCommercialFactParts([headlineParts, extras]);
}

function competitorComparisonFacts(competitor: CompetitorSummary, profile: CompetitorProfile): Array<{ label: string; value: string }> {
  const unsupportedPorts = unsupportedCompetitorVideoPorts(profile);
  const competitorLoopOutputs = profile.resolvedSpec?.specs?.hdmiLoopOutputs ?? 0;
  const transport = `${profile.transport} ${profile.resolvedSpec?.transport ?? ""}`.trim();

  return [
    { label: "Inputs", value: competitorInputSummary(profile) },
    { label: "Outputs", value: competitorOutputSummary(profile) },
    { label: "HDMI / HDCP", value: stripComparePrefix(competitorVideoProtectionFacts(profile), "HDMI / HDCP") },
    { label: "USB", value: stripComparePrefix(competitorUsbFacts(profile), "USB") },
    {
      label: "HDBaseT / TPS",
      value: joinCommercialFactParts([
        stripComparePrefix(competitorHdbasetFacts(profile), "HDBaseT"),
        textHasToken(transport, /\btps\b/) ? "TPS transport path evidenced" : "",
      ]),
    },
    { label: "Max resolution", value: competitor.resolution !== "Not verified locally" ? competitor.resolution : "" },
    {
      label: "Control / network",
      value: joinCommercialFactParts([
        stripComparePrefix(competitorControlFacts(profile), "Control"),
        stripComparePrefix(competitorAudioNetworkFacts(profile), "Audio / Network"),
      ]),
    },
    {
      label: "Other video I/O",
      value: joinCommercialFactParts([
        unsupportedPorts.join(", "),
        competitorLoopOutputs ? `${competitorLoopOutputs}x local HDMI loop output${competitorLoopOutputs === 1 ? "" : "s"} (non-routed)` : "",
      ]),
    },
  ].filter((entry) => entry.value);
}

export function buildCoreComparisonFacts(
  competitor: CompetitorSummary,
  profile: CompetitorProfile,
  wyrestorm: WyreStormSummary,
  candidate: ScoredCandidate,
): CompareCoreFact[] {
  const competitorFacts = new Map(competitorComparisonFacts(competitor, profile).map((entry) => [entry.label, entry.value]));
  const wyrestormFacts = new Map(wyrestorm.comparisonFacts.map((entry) => [entry.label, entry.value]));
  const mainQuoteCheck = compareCompetitorMainCaveat(competitor, candidate);
  const wyrestormCaveat = compareWyreStormMainCaveat(competitor, candidate);
  const entries: CompareCoreFact[] = [
    {
      label: "Product type",
      competitor: safeCompareValue(competitor.recognisedClass),
      wyrestorm: safeCompareValue(wyrestorm.productType),
      result: "",
    },
    {
      label: "Inputs",
      competitor: safeCompareValue(competitorFacts.get("Inputs")),
      wyrestorm: safeCompareValue(wyrestormFacts.get("Inputs")),
      result: "",
    },
    {
      label: "Outputs",
      competitor: safeCompareValue(competitorFacts.get("Outputs")),
      wyrestorm: safeCompareValue(wyrestormFacts.get("Outputs")),
      result: "",
    },
    {
      label: "HDMI / HDCP",
      competitor: safeCompareValue(competitorFacts.get("HDMI / HDCP")),
      wyrestorm: safeCompareValue(wyrestormFacts.get("HDMI / HDCP")),
      result: "",
    },
    {
      label: "Other video I/O",
      competitor: safeCompareValue(competitorFacts.get("Other video I/O")),
      wyrestorm: safeCompareValue(wyrestormFacts.get("Other video I/O")),
      result: "",
    },
    {
      label: "USB",
      competitor: safeCompareValue(competitorFacts.get("USB")),
      wyrestorm: safeCompareValue(wyrestormFacts.get("USB")),
      result: "",
    },
    {
      label: "Control / network",
      competitor: safeCompareValue(competitorFacts.get("Control / network")),
      wyrestorm: safeCompareValue(wyrestormFacts.get("Control / network")),
      result: "",
    },
    {
      label: "Max resolution",
      competitor: safeCompareValue(competitorFacts.get("Max resolution") || competitor.resolution),
      wyrestorm: safeCompareValue(wyrestormFacts.get("Max resolution") || wyrestorm.resolution),
      result: "",
    },
    {
      label: "Transport",
      competitor: safeCompareValue(competitor.transport),
      wyrestorm: safeCompareValue(wyrestorm.transport),
      result: "",
    },
    {
      label: "Network class",
      competitor: compareNetworkClassLabel(
        profile.resolvedSpec?.specs,
        competitor.transport,
        profile.resolvedSpec?.domain === "AVOIP" || /av-over-ip/i.test(competitor.recognisedClass),
      ),
      wyrestorm: safeCompareValue(wyrestormFacts.get("Network class")),
      result: compareNetworkClassResult(
        compareNetworkClassLabel(
          profile.resolvedSpec?.specs,
          competitor.transport,
          profile.resolvedSpec?.domain === "AVOIP" || /av-over-ip/i.test(competitor.recognisedClass),
        ),
        safeCompareValue(wyrestormFacts.get("Network class")),
      ),
    },
    {
      label: "Signal direction",
      competitor: safeCompareValue(competitor.signalDirection),
      wyrestorm: safeCompareValue(wyrestorm.signalDirection),
      result: "",
    },
    {
      label: "Main caveat",
      competitor: safeCompareValue(mainQuoteCheck),
      wyrestorm: safeCompareValue(wyrestormCaveat),
      result: "Check before quote",
    },
  ];

  if (profile.resolvedSpec?.domain === "HDBASET" || /hdbaset/i.test(competitor.transport)) {
    entries.splice(1, 0, {
      label: "HDBaseT class / reach",
      competitor: safeCompareValue(competitorFacts.get("HDBaseT / TPS")),
      wyrestorm: safeCompareValue(wyrestormFacts.get("HDBaseT / distance")),
      result: "",
    });
  }

  const alwaysVisible = new Set(["Product type", "Inputs", "Outputs"]);
  return entries
    .filter((entry) => alwaysVisible.has(entry.label) || Boolean(entry.competitor) || Boolean(entry.wyrestorm))
    .map((entry) => ({
      ...entry,
      competitor: displayCompareValue(entry.competitor),
      wyrestorm: displayCompareValue(entry.wyrestorm),
      result: entry.result || compareRowResult(entry.label, entry.competitor, entry.wyrestorm),
    }));
}

function _wyrestormIdentityItems(candidate: ScoredCandidate): string[] {
  return buildWyrestormSummary(candidate).identityItems;
}

function stripComparePrefix(value: string, prefix: string): string {
  return value.startsWith(`${prefix}: `) ? value.slice(prefix.length + 2) : value;
}

function textHasToken(value: string, pattern: RegExp): boolean {
  return pattern.test(value.toLowerCase());
}

function safeCompareValue(value: string | undefined): string {
  return String(value ?? "").trim();
}

/** A surfaced cell counts as resolved only when it carries a real value. */
export function surfaceValueResolved(value: string): boolean {
  const cleaned = String(value ?? "").trim();
  return Boolean(cleaned) && cleaned !== "Needs verification" && !/verify datasheet/i.test(cleaned);
}

/**
 * Weakest-link tier for a match card: the least trustworthy tier across every
 * field the card surfaces (both columns). A surfaced row is a weak link when
 * either side's value is unresolved - a card that shows "Needs verification"
 * or "Verify datasheet" anywhere must not claim the strongest governed tier.
 */
export function weakestLinkCardTier(
  coreFacts: CompareCoreFact[],
  wyrestormTier: string | undefined,
): string {
  const rowTiers = coreFacts
    .filter((fact) => fact.label !== "Main caveat")
    .map((fact) => {
      if (!surfaceValueResolved(fact.competitor) || !surfaceValueResolved(fact.wyrestorm)) {
        return "missing";
      }
      return wyrestormTier ?? "missing";
    });
  return weakestLinkTier([wyrestormTier, ...rowTiers]);
}

function displayCompareValue(value: string | undefined): string {
  const cleaned = commercializeCompareCopy(safeCompareValue(value))
    .replace(/\s*[-–—]\s*verify (?:against (?:the )?)?datasheet.*$/i, "")
    .replace(/\s+(?:direction\s+)?from (?:the )?(?:\d{4}\s+)?(?:catalog|local product intelligence).*$/i, "")
    .replace(/^verify (?:against (?:the )?)?datasheet$/i, "")
    .trim();
  return cleaned || "Not verified";
}
function compareCodecLabel(specs: CompareSpecFacts | undefined, transport: string): string {
  if (specs?.avoipCodec) return specs.avoipCodec;

  const value = transport.toLowerCase();
  if (/\bsdvoe\b/.test(value)) return "SDVoE";
  if (/jpeg\s*-?\s*2000|jpeg2000/.test(value)) return "JPEG2000";
  if (/jpeg\s*-?\s*xs|jpegxs/.test(value)) return "JPEG XS";
  if (/h\.?265|hevc/.test(value)) return "H.265";
  if (/h\.?264|avc/.test(value)) return "H.264";
  return "";
}
export function compareNetworkClassLabel(
  specs: CompareSpecFacts | undefined,
  transport: string,
  isAvoip: boolean,
): string {
  const speed = String(specs?.networkSpeed || "").trim();
  const confidence = specs?.networkSpeedConfidence;
  const codec = compareCodecLabel(specs, transport);

  if (speed) {
    if (confidence === "inferred") {
      return `${speed} — inferred from ${codec || "available codec evidence"}`;
    }

    if (confidence === "verify") {
      return "Network class — verify";
    }

    return `${speed} — confirmed`;
  }

  if (/\bipmx\b/i.test(transport)) {
    return "Network class — verify";
  }

  if (codec === "SDVoE") return "10GbE — inferred from SDVoE";
  if (["JPEG2000", "JPEG XS", "H.264", "H.265"].includes(codec)) {
    return `1GbE — inferred from ${codec}`;
  }

  return isAvoip ? "Network class — verify" : "";
}
function compareNetworkClassResult(competitorValue: string, wyrestormValue: string): string {
  const speed = (value: string) => value.match(/\b(?:1|10)GbE\b/i)?.[0]?.toUpperCase() || "";
  const competitorSpeed = speed(competitorValue);
  const wyrestormSpeed = speed(wyrestormValue);
  const inferred = /inferred/i.test(competitorValue) || /inferred/i.test(wyrestormValue);
  const verify = /verify/i.test(competitorValue) || /verify/i.test(wyrestormValue);

  if (verify || !competitorSpeed || !wyrestormSpeed) return "Verify network class";
  if (competitorSpeed === wyrestormSpeed) {
    return inferred ? "Likely same network class — verify source" : "Network class matches";
  }

  return inferred ? "Potential network mismatch — review" : "Network class mismatch";
}
function wyrestormHeadlineIo(candidate: ScoredCandidate, inputCount?: number, outputCount?: number): string {
  const role = candidate.product.role.toLowerCase();
  const family = candidate.product.family.toLowerCase();
  const inputLabel = pickProductConnectorLabel(candidate, "input");
  const outputLabel = pickProductConnectorLabel(candidate, "output");
  const items: string[] = [];

  if (/encoder|transmitter/.test(role) && /networkhd|av-over-ip/.test(family)) {
    items.push("1x local source input");
    items.push("1x LAN/network port");
  } else if (/decoder|receiver/.test(role) && /networkhd|av-over-ip/.test(family)) {
    items.push("1x LAN/network port");
    items.push("1x display/video output");
  } else if (/tx\/rx extender kit/.test(role)) {
    items.push("1x transmitter");
    items.push("1x receiver");
    items.push("category-cable link");
  } else {
    items.push(commercialPortLabel(inputCount, inputLabel) || "");
    items.push(commercialPortLabel(outputCount, outputLabel) || "");
  }

  return joinCommercialFactParts(items) || "I/O still needs confirmation from current local data";
}
function wyrestormFeatureCallouts(candidate: ScoredCandidate, resolution: string): string {
  const values = candidate.product.tags.map((tag) => tag.toLowerCase());
  const highlights = [
    resolution && resolution !== "Not verified locally" ? `Resolution ${resolution}` : "",
    values.includes("444") ? "4:4:4" : "",
    values.includes("hdr") ? "HDR" : "",
    values.includes("usb-c") ? "USB-C" : "",
    values.includes("wireless") ? "Wireless presentation" : "",
    values.includes("mst") ? "MST" : "",
    values.includes("hdbaset3") ? "HDBaseT 3.0 direction" : "",
    candidate.product.sku === "NHD-510-TX" ? "Audio-network / Dante-oriented endpoint direction" : "",
  ].filter(Boolean);

  return joinCommercialFactParts(highlights);
}
export function buildWyrestormSummary(candidate: ScoredCandidate): WyreStormSummary {
  const knownProfile = findKnownWyrestormCompareProfile(candidate.product.sku);
  const hydratedProduct = hydrateWyrestormCompareProfile({
    ...candidate.product,
    title: candidate.product.name,
    category: candidate.product.productClass,
    role: candidate.product.role,
    description: candidate.product.name,
    summary: candidate.product.caveat,
    technologies: [candidate.product.transport],
    features: candidate.product.tags,
    capabilities: candidate.product.tags,
  }) as Parameters<typeof buildWyrestormCompareProfile>[0];

  const profile = buildWyrestormCompareProfile(hydratedProduct);
  const resolution = profile.maxResolution || "Not verified locally";
  const headlineIo = wyrestormHeadlineIo(candidate, profile.inputCount, profile.outputCount);
  const featureCallouts = wyrestormFeatureCallouts(candidate, resolution);
  const hdmiProtection = joinCommercialFactParts([
    knownProfile?.hdmiVersion,
    knownProfile?.hdcpVersion,
  ].filter((item) => item && !/^verify datasheet$/i.test(item)));
  const hasVerifiedUsbPhysicalCounts = Boolean(
    profile.specs?.usbCPorts ||
      profile.specs?.usbHostPorts ||
      profile.specs?.usbDevicePorts ||
      profile.specs?.usbTotalPorts,
  );
  const usbFacts = joinCommercialFactParts([
    profile.specs?.usbCPorts ? `${profile.specs.usbCPorts}x USB-C` : "",
    profile.specs?.usbHostPorts ? `${profile.specs.usbHostPorts}x USB host` : "",
    profile.specs?.usbDevicePorts ? `${profile.specs.usbDevicePorts}x USB device` : "",
    profile.specs?.usbTotalPorts ? `${profile.specs.usbTotalPorts}x USB total` : "",
    profile.specs?.usbStandard || "",
    profile.specs?.usbStandard && !hasVerifiedUsbPhysicalCounts
      ? "physical connector count requires verification"
      : "",
    !profile.specs?.usbTotalPorts && knownProfile?.inputTypes.includes("USB-C") ? "USB-C source input path" : "",
  ]);
  const hdbasetFacts = joinCommercialFactParts([
    profile.specs?.hdbasetVersion || "",
    profile.specs?.hdbasetClass || "",
    knownProfile?.distanceClass && !/^verify datasheet$/i.test(knownProfile.distanceClass) ? knownProfile.distanceClass : "",
  ]);
  const controlFacts = joinCommercialFactParts([
    profile.specs?.networkPorts ? `${profile.specs.networkPorts}x LAN/network port${profile.specs.networkPorts === 1 ? "" : "s"}` : "",
    profile.specs?.rs232 ? "RS-232" : "",
    profile.specs?.ir ? "IR" : "",
    profile.specs?.relay ? "Relay" : "",
    profile.specs?.gpio ? "GPIO" : "",
    knownProfile?.control?.filter((item) => !/verify/i.test(item)).join(" | ") || "",
  ]);
  const otherVideoIo = joinCommercialFactParts([
    knownProfile?.mirroredOutputCount
      ? `${knownProfile.mirroredOutputCount}x mirrored ${knownProfile.mirroredOutputTypes.join(" / ")} output${knownProfile.mirroredOutputCount === 1 ? "" : "s"}`
      : "",
    knownProfile?.loopOutputCount
      ? `${knownProfile.loopOutputCount}x local ${knownProfile.loopOutputTypes.join(" / ")} loop output${knownProfile.loopOutputCount === 1 ? "" : "s"} (non-routed)`
      : profile.specs?.hdmiLoopOutputs
        ? `${profile.specs.hdmiLoopOutputs}x local HDMI loop output${profile.specs.hdmiLoopOutputs === 1 ? "" : "s"} (non-routed)`
        : "",
  ]);
  const identityItems = uniqueText([
    `This WyreStorm option is a ${candidate.product.productClass.toLowerCase()} in the ${candidate.product.family} family.`,
    headlineIo !== "I/O still needs confirmation from current local data" ? `Headline I/O: ${headlineIo}.` : "",
    featureCallouts ? `Key feature callouts: ${featureCallouts}.` : "",
    candidate.dependencies[0] || "",
  ], 4);

  return {
    heading: candidate.product.sku,
    detail: candidate.product.name,
    family: candidate.product.family,
    productType: candidate.product.productClass,
    role: candidate.product.role,
    signalDirection: roleSignalDirection(candidate.product.role),
    transport: candidate.product.transport,
    resolution,
    headlineIo,
    identityItems,
    facts: [
      { label: "Product type", value: candidate.product.productClass },
      { label: "Role", value: candidate.product.role },
      { label: "Signal direction", value: roleSignalDirection(candidate.product.role) },
      { label: "Transport", value: candidate.product.transport },
      { label: "Headline I/O", value: headlineIo },
      { label: "Resolution", value: resolution },
    ],
    comparisonFacts: [
      { label: "Inputs", value: wyrestormInputSummary(candidate, profile, knownProfile) },
      { label: "Outputs", value: wyrestormOutputSummary(candidate, profile, knownProfile) },
      { label: "HDMI / HDCP", value: hdmiProtection },
      { label: "USB", value: usbFacts },
      { label: "HDBaseT / distance", value: hdbasetFacts },
      // The curated known-profile registry predates the governed profiles and
      // still carries "Verify datasheet" placeholders for kit SKUs whose real
      // max resolution is now governed - a placeholder must never override a
      // real governed value on the card a rep reads.
      {
        label: "Max resolution",
        value:
          knownProfile?.maxResolution && !/^verify datasheet/i.test(knownProfile.maxResolution)
            ? knownProfile.maxResolution
            : resolution,
      },
      {
        label: "Network class",
        value: compareNetworkClassLabel(
          profile.specs,
          candidate.product.transport,
          /networkhd|av-over-ip/i.test(`${candidate.product.family} ${candidate.product.productClass}`),
        ),
      },
      { label: "Control / network", value: controlFacts },
      { label: "Other video I/O", value: otherVideoIo },
    ].filter((entry) => entry.value),
  };
}
function roleSignalDirection(role: string): string {
  const value = role.toLowerCase();

  if (/ndi camera|ptz camera|camera bridge/.test(value)) return "Room capture / camera source";
  if (/encoder|transmitter/.test(value)) return "Source-side endpoint";
  if (/decoder|receiver/.test(value)) return "Display-side endpoint";
  if (/transceiver/.test(value)) return "Bi-directional endpoint";
  if (/tx\/rx extender kit|usb extender|extender/.test(value)) return "Point-to-point source-to-display extension";
  if (/matrix/.test(value)) return "Local routed source-to-display switching";
  if (/presentation switcher|switcher/.test(value)) return "In-room source switching";
  if (/distribution amplifier|splitter/.test(value)) return "One source to mirrored display outputs";
  if (/video wall/.test(value)) return "Dedicated video wall processing";

  return "System direction needs confirmation";
}
function pickProductConnectorLabel(candidate: ScoredCandidate, side: "input" | "output"): string {
  const tags = candidate.product.tags.join(" ").toLowerCase();
  const transport = candidate.product.transport.toLowerCase();
  const combined = `${tags} ${transport} ${candidate.product.name.toLowerCase()}`;

  if (/hdbaset/.test(combined)) {
    return side === "input" ? "HDMI source input" : "HDBaseT output";
  }
  if (/usb-c/.test(combined) && /wireless/.test(combined)) {
    return side === "input" ? "local source input" : "display/video output";
  }
  if (/usb-c/.test(combined)) {
    return side === "input" ? "local source input" : "display/video output";
  }
  if (/wireless/.test(combined)) {
    return side === "input" ? "wired/wireless source input" : "display/video output";
  }
  if (/hdmi/.test(combined) || /matrix|presentation switcher|switcher/.test(candidate.product.productClass.toLowerCase())) {
    return side === "input" ? "HDMI input" : "HDMI output";
  }
  if (/networkhd|av-over-ip/.test(combined)) {
    return side === "input" ? "local source input" : "LAN/network port";
  }

  return side === "input" ? "source/video input" : "display/video output";
}