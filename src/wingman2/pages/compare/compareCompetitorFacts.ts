import type { ScoredCandidate, Verdict, WyreStormProduct } from "../../features/compare";
import { uniqueText } from "../../lib/repScript";
import type { CompetitorProfile, CompetitorSummary } from "./compareTypes";
import { isAtlonaOmeExKitProfile, matrixReceiverRequirement, wantsClassA } from "./compareProfileSignals";

/**
 * The competitor side of a comparison, in the words a rep reads: the fact
 * sheet built from a competitor profile, its I/O and commercial facts, and the
 * summary the page renders above the candidates.
 *
 * This was the fact-sheet half of `ComparePageNew.advanced.tsx`. It is pure
 * (a profile in, copy out), so the page entry reads it instead of carrying it.
 */

export function verdictClass(verdict: Verdict): string {
  if (verdict === "GOOD MATCH") return "is-good";
  if (verdict === "PARTIAL MATCH") return "is-partial";
  if (verdict === "ARCHITECTURE ALTERNATIVE") return "is-partial";
  return "is-no-match";
}

export function productPitchUrl(sku: string): string {
  const params = new URLSearchParams();
  params.set("sku", sku);
  params.set("source", "compare");
  return `/wingman/product-pitch?${params.toString()}`;
}

export function exactLimitedDataWarning(profile: CompetitorProfile): string {
  const limited =
    !profile.resolvedSpec
    || profile.resolvedSpec.specTier !== "verified-profile"
    || profile.knownProfile === null;

  return limited
    ? "Wingman has limited local data for this competitor SKU. Closest direction only until the competitor specification is confirmed."
    : "";
}

function compareSignalDirection(profile: CompetitorProfile): string {
  const role = (profile.role || "").toLowerCase();
  const identity = `${profile.rawText} ${profile.resolvedSpec?.title ?? ""}`.toLowerCase();
  const productClass = (profile.productClass || "").toLowerCase();
  const transport = (profile.transport || "").toLowerCase();

  // Extender kits: point-to-point
  if (
    role.includes("extender kit") ||
    role.includes("extension kit") ||
    (/extender|extension/.test(identity) && /\bkit\b|\bset\b/.test(identity))
  ) return "Point-to-point source-to-display extension";

  // Encoder/decoder direction from role
  if (role.includes("encoder") || role.includes("transmitter")) return "Source-side / encoder path";
  if (role.includes("decoder") || role.includes("receiver")) return "Display-side / decoder path";
  if (role.includes("transceiver")) return "Bidirectional / transceiver path";

  // Matrix / switcher: derive from I/O topology
  if (role.includes("switcher") || role.includes("matrix") || productClass.includes("matrix")) {
    // A matrix with HDBaseT outputs routes signals from local sources to remote displays
    if (transport.includes("hdbaset") || /hdbt|hdbase/.test(identity)) {
      return "Local source-to-remote display switching";
    }
    // A pure HDMI matrix routes within the same rack/room
    if (transport.includes("hdmi") || /\bhdmi\b/.test(identity)) {
      return "Local source-to-display switching";
    }
    // Mixed transport matrix
    return "Room core / switching path";
  }

  // Distribution amplifier: implicit 1:N fan-out
  if (productClass.includes("distribution") || role.includes("splitter") || role.includes("distribution amplifier")) {
    return "One source to mirrored display outputs";
  }

  if (role.includes("processor")) return "Processing path";

  // AVoIP: derive from role
  if (productClass.includes("avoip") || /networkhd|avoip|nhd-/.test(identity)) {
    if (role.includes("encoder") || role.includes("transmitter")) return "Source-side encoder to network";
    if (role.includes("decoder") || role.includes("receiver")) return "Network to display decoder";
    return "Networked AV transport";
  }

  return "Signal direction needs confirmation";
}

function compareCompetitorEcosystem(profile: CompetitorProfile): string {
  const combined = [profile.brand, profile.sku, profile.rawText].join(" ").toUpperCase();

  if (combined.includes("OMNISTREAM") || combined.includes("AT-OMNI") || combined.includes("ATOMNI")) {
    return "Atlona OmniStream";
  }

  if (profile.resolvedSpec?.title) return profile.resolvedSpec.title;
  if (profile.resolvedSpec?.brand && profile.productClass !== "Unknown") {
    return `${profile.resolvedSpec.brand} ${profile.productClass}`;
  }
  return profile.brand || "Not confirmed";
}

function verifiedVideoInputLabels(profile: CompetitorProfile): string[] {
  const specs = profile.resolvedSpec?.specs;

  return uniqueText([
    specs?.hdmiInputs ? "HDMI" : "",
    specs?.displayPortInputs ? "DisplayPort" : "",
    specs?.dviInputs ? "DVI" : "",
    specs?.vgaInputs ? "VGA" : "",
    specs?.sdiInputs ? "SDI" : "",
    specs?.compositeInputs ? "composite video" : "",
    specs?.componentInputs ? "component video" : "",
  ], 6);
}

function _verifiedLocalSourcePhrase(profile: CompetitorProfile): string {
  const inputs = verifiedVideoInputLabels(profile);

  if (inputs.length === 1) {
    return `local ${inputs[0]} source`;
  }

  if (inputs.length > 1) {
    return `local ${inputs.slice(0, -1).join(", ")} or ${inputs[inputs.length - 1]} source`;
  }

  return "local source";
}

function inputConnectorUnknownText(profile: CompetitorProfile): string {
  const role = (profile.role || "").toLowerCase();
  const sourceSide = role.includes("encoder") || role.includes("transmitter") || role.includes("transceiver");

  if (!sourceSide) {
    return "";
  }

  return verifiedVideoInputLabels(profile).length > 0 ? "" : "Input connector not confirmed locally.";
}

function humanizeMissingFact(fact: string): string {
  const value = fact.trim().toLowerCase();

  if (value === "endpoint role") return "Exact endpoint role not fully confirmed from local competitor data.";
  if (value === "network class or codec") return "Network class or codec not verified locally.";
  if (value === "max resolution") return "Maximum supported resolution not verified locally.";
  if (value === "transport") return "Transport method not verified locally.";
  if (value === "controller/network requirement") return "Controller or managed-network requirement not verified locally.";
  if (value === "input/output endpoint count") return "Exact endpoint input/output count not verified locally.";
  if (value === "input types") return "Input connector types not verified locally.";
  if (value === "output types") return "Output connector types not verified locally.";
  if (value === "usb-c/usb behaviour") return "USB-C or USB behaviour not verified locally.";
  if (value === "scaling") return "Scaling behaviour not verified locally.";
  if (value === "audio support") return "Audio handling not verified locally.";
  if (value === "control support") return "Control ports and control behaviour not verified locally.";
  return `${fact.trim()} not verified locally.`;
}

function compareFeatureFlagSummary(profile: CompetitorProfile): string[] {
  const features = profile.resolvedSpec?.features ?? {};
  const specs = profile.resolvedSpec?.specs;
  return uniqueText([
    features.receiverKit ? "Receiver kit packaging evidenced" : "",
    features.hdbtOutput ? "HDBaseT output path evidenced" : "",
    features.usbRouting ? "USB routing evidenced" : "",
    features.usbC ? "USB-C connectivity evidenced" : "",
    features.tenGig ? "10GbE transport evidenced" : "",
    features.zeroLatency ? "Zero-latency transport evidenced" : "",
    features.lossless ? "Visually lossless / uncompressed transport evidenced" : "",
    features.wireless ? "Wireless casting evidenced" : "",
    specs?.dante ? "Dante audio evidenced" : "",
    specs?.audioDeEmbed ? "Audio de-embed evidenced" : "",
    specs?.audioEmbed ? "Audio embed evidenced" : "",
  ], 8);
}

export function compareUnknownFeatureSummary(profile: CompetitorProfile): string[] {
  const specs = profile.resolvedSpec?.specs;
  const unknowns = uniqueText([
    !profile.resolvedSpec ? "No verified local competitor specification profile found." : "",
    !profile.resolvedSpec?.maxResolution ? "Resolution ceiling not verified locally." : "",
    !profile.role || profile.role === "Unknown" ? "Endpoint role not proven from local competitor data." : "",
    !profile.transport || profile.transport === "Unknown" ? "Transport type not proven from local competitor data." : "",
    inputConnectorUnknownText(profile),
    !specs?.hdmiVersion ? "HDMI version not verified locally." : "",
    !specs?.hdcpVersion ? "HDCP version not verified locally." : "",
    !specs?.usbStandard && profile.requestedTags.includes("usb") ? "USB standard and port behaviour not verified locally." : "",
    !specs?.hdbasetClass && profile.requestedTags.includes("hdbaset") ? "HDBaseT class/distance not verified locally." : "",
    !specs?.networkPorts && profile.requestedTags.includes("avoip") ? "LAN port count and network control details not verified locally." : "",
    ...(profile.resolvedSpec?.missingFacts ?? []).map(humanizeMissingFact),
  ], 8);

  return unknowns;
}

export function candidateRequiredDependencies(product: WyreStormProduct, profile: CompetitorProfile): string[] {
  if (product.sku.startsWith("NHD-")) {
    return uniqueText([
      "Specify one NHD-CTL-PRO-V2 controller per NetworkHD system unless the site already has one.",
      product.role.includes("Encoder") ? "Quote compatible decoder endpoints at the display side if the system needs a full end-to-end AVoIP path." : "",
      product.role.includes("Decoder") ? "Quote compatible encoder endpoints at the source side if the system needs a full end-to-end AVoIP path." : "",
      product.sku.includes("-DNT-") || product.sku.includes("-510-") ? "Only position this path when the Dante / network-audio workflow is genuinely part of the brief." : "",
      product.sku.includes("-IW-") ? "Only position this path if the physical in-wall form factor is a project requirement." : "",
      "Confirm network switch readiness, VLAN policy, multicast handling and who owns network setup before quoting.",
    ], 6);
  }

  if (product.sku.startsWith("MXV-")) {
    return uniqueText([
      wantsClassA(profile)
        ? matrixReceiverRequirement(profile, true)
        : matrixReceiverRequirement(profile, false),
      "Confirm the receiver model, HDBaseT class and actual cable-distance requirement before quoting.",
      "Confirm whether local mirrored HDMI outputs, audio breakouts or scaling are required.",
    ], 5);
  }

  if (product.productClass === "HDBaseT extender") {
    return uniqueText([
      "Quote the transmitter/receiver kit or matching endpoint pair; do not treat this as a matrix or AVoIP system.",
      "Confirm HDBaseT class, cable run, USB version and control path before quoting.",
    ], 4);
  }

  if (product.productClass === "Presentation switcher") {
    return uniqueText([
      "Confirm whether the room needs switching, BYOD/BYOM, wireless presentation or USB transport, not just a nearest technical SKU.",
      /H3|HDBASET/i.test(product.transport) ? "Confirm whether the downstream HDBaseT / room-capture path is genuinely part of the requirement." : "",
      /Wireless/i.test(product.transport) ? "Confirm whether wireless presentation and guest connection are actually required." : "",
    ], 4);
  }

  return uniqueText([
    "Confirm the final room workflow, dependencies and adjacent products before quoting.",
  ], 3);
}

export function plainLanguageOutcome(profile: CompetitorProfile, candidate: ScoredCandidate): string {
  const limited = Boolean(exactLimitedDataWarning(profile));
  const hasClassMismatch = candidate.blockers.some((line) => /class mismatch|role mismatch|wrong product class/i.test(line))
    || candidate.mismatches.some((line) => /not an AVoIP|wrong architecture|point-to-point|does not replace/i.test(line));

  if (hasClassMismatch || candidate.verdict === "NO MATCH") {
    return "Wrong product type";
  }

  if (limited && candidate.verdict !== "GOOD MATCH") {
    return "Insufficient competitor data";
  }

  if (candidate.verdict === "VERIFY") {
    return "Evidence required";
  }

  if (candidate.verdict === "ARCHITECTURE ALTERNATIVE") {
    return "Architecture alternative";
  }

  if (candidate.verdict === "GOOD MATCH" && candidate.matched.some((line) => /Same product class|Same endpoint role|matrix topology|role-compatible/i.test(line))) {
    return "Same product job";
  }

  if (candidate.verdict === "PARTIAL MATCH") {
    return "Feature check needed";
  }

  return limited ? "Insufficient competitor data" : "Feature check needed";
}

function competitorIoTypeLabel(profile: CompetitorProfile): string {
  const spec = profile.resolvedSpec;
  const transport = String(spec?.transport || profile.transport || "").toLowerCase();

  if (spec?.domain === "NDI_CAMERA" || /ndi/.test(transport)) return "NDI / camera endpoint";
  if (spec?.domain === "PTZ_CAMERA" || /ptz/.test(profile.role.toLowerCase())) return "Camera endpoint";
  if (spec?.domain === "WIRELESS_CASTING" || /wireless|wi-fi/.test(transport)) return "Wireless presentation";
  if (spec?.domain === "AVOIP" || transport.includes("avoip")) return "AV-over-IP endpoint";
  if (spec?.domain === "HDBASET" || transport.includes("hdbaset") || transport.includes("tps")) return "HDBaseT / extension";
  if (transport.includes("usb-c")) return "HDMI / USB-C";
  if (transport.includes("hdmi")) return "HDMI";
  if (transport.includes("usb")) return "USB / video";
  return "signal path";
}

export function joinCommercialFactParts(parts: Array<string | null | undefined>): string {
  return parts.filter(Boolean).join(", ");
}

export function commercialPortLabel(count: number | undefined, singular: string, plural = `${singular}s`): string {
  if (!count) return "";
  return `${count}x ${count === 1 ? singular : plural}`;
}

function competitorHeadlineIo(profile: CompetitorProfile): string {
  const inputs = profile.resolvedSpec?.inputCount;
  const outputs = profile.resolvedSpec?.outputCount;

  if (!inputs && !outputs) {
    return "";
  }

  const parts = [
    inputs ? `${inputs} in` : "",
    outputs ? `${outputs} out` : "",
  ].filter(Boolean);

  return `I/O: ${parts.join(" / ")}${parts.length ? ` | ${competitorIoTypeLabel(profile)}` : ""}`;
}

export function unsupportedCompetitorVideoPorts(profile: CompetitorProfile): string[] {
  const specs = profile.resolvedSpec?.specs;

  if (!specs) {
    return [];
  }

  return [
    specs.displayPortInputs || specs.displayPortOutputs ? `DP ${[specs.displayPortInputs ? `${specs.displayPortInputs} in` : "", specs.displayPortOutputs ? `${specs.displayPortOutputs} out` : ""].filter(Boolean).join(" / ")}` : "",
    specs.dviInputs || specs.dviOutputs ? `DVI ${[specs.dviInputs ? `${specs.dviInputs} in` : "", specs.dviOutputs ? `${specs.dviOutputs} out` : ""].filter(Boolean).join(" / ")}` : "",
    specs.vgaInputs || specs.vgaOutputs ? `VGA ${[specs.vgaInputs ? `${specs.vgaInputs} in` : "", specs.vgaOutputs ? `${specs.vgaOutputs} out` : ""].filter(Boolean).join(" / ")}` : "",
    specs.sdiInputs || specs.sdiOutputs ? `SDI ${[specs.sdiInputs ? `${specs.sdiInputs} in` : "", specs.sdiOutputs ? `${specs.sdiOutputs} out` : ""].filter(Boolean).join(" / ")}` : "",
    specs.compositeInputs || specs.compositeOutputs ? `Composite ${[specs.compositeInputs ? `${specs.compositeInputs} in` : "", specs.compositeOutputs ? `${specs.compositeOutputs} out` : ""].filter(Boolean).join(" / ")}` : "",
    specs.componentInputs || specs.componentOutputs ? `Component ${[specs.componentInputs ? `${specs.componentInputs} in` : "", specs.componentOutputs ? `${specs.componentOutputs} out` : ""].filter(Boolean).join(" / ")}` : "",
  ].filter(Boolean);
}

export function competitorVideoProtectionFacts(profile: CompetitorProfile): string {
  const specs = profile.resolvedSpec?.specs;
  const items = [specs?.hdmiVersion, specs?.hdcpVersion].filter(Boolean);
  return items.length ? `HDMI / HDCP: ${items.join(" / ")}` : "";
}

export function competitorUsbFacts(profile: CompetitorProfile): string {
  const specs = profile.resolvedSpec?.specs;

  if (!specs) {
    return "";
  }

  const labels = [
    specs.usbCPorts ? `${specs.usbCPorts}x USB-C` : "",
    specs.usbHostPorts ? `${specs.usbHostPorts} host` : "",
    specs.usbDevicePorts ? `${specs.usbDevicePorts} device` : "",
    specs.usbTotalPorts ? `${specs.usbTotalPorts} total USB` : "",
    specs.usbStandard || "",
  ].filter(Boolean);

  return labels.length ? `USB: ${labels.join(" | ")}` : "";
}

export function competitorHdbasetFacts(profile: CompetitorProfile): string {
  const specs = profile.resolvedSpec?.specs;
  const items = [
    specs?.hdbasetVersion,
    specs?.hdbasetClass,
    specs?.hdbasetDistance ? `${specs.hdbasetDistance}m reach` : "",
  ].filter(Boolean);
  return items.length ? `HDBaseT: ${items.join(" | ")}` : "";
}

function competitorDistanceQuestion(profile: CompetitorProfile): string {
  const specs = profile.resolvedSpec?.specs;
  const isHdBaseT = profile.requestedTags.includes("hdbaset") || Boolean(profile.resolvedSpec?.features?.hdbtOutput);

  if (!isHdBaseT) {
    return "";
  }

  if (specs?.hdbasetClass) {
    return "Discovery check: validate CAT cable run and whether the required distance must hold at 4K60 or only at 1080p for the stated HDBaseT class.";
  }

  return "Discovery check: validate CAT cable run, intended signal resolution, and whether the brief needs Class A or Class B HDBaseT before quoting.";
}

function competitorCommercialRiskNote(profile: CompetitorProfile): string {
  const isHdBaseT = profile.requestedTags.includes("hdbaset") || Boolean(profile.resolvedSpec?.features?.hdbtOutput);
  const isAvoip = profile.requestedTags.includes("avoip") || profile.resolvedSpec?.domain === "AVOIP";

  if (isHdBaseT) {
    return "Why this matters: HDBaseT class, cable run and transmitted resolution can move the quote up or down. If they are wrong, the signal may not transport reliably at all.";
  }

  if (isAvoip) {
    return "Why this matters: AVoIP removes most point-to-point distance and HDBaseT class decisions, but only if the network infrastructure, switching and bandwidth meet IT-grade requirements.";
  }

  return "";
}

function competitorEducationalNote(profile: CompetitorProfile): string {
  const isHdBaseT = profile.requestedTags.includes("hdbaset") || Boolean(profile.resolvedSpec?.features?.hdbtOutput);
  const isAvoip = profile.requestedTags.includes("avoip") || profile.resolvedSpec?.domain === "AVOIP";

  if (isHdBaseT) {
    return "Educational point: on HDBaseT, the practical question is not just distance. It is distance at the actual signal format being sent, especially 4K60 4:4:4 versus 1080p.";
  }

  if (isAvoip) {
    return "Educational point: AVoIP is often easier to position because the transport decision moves away from per-link HDBaseT limits and toward the wider AV network design.";
  }

  return "";
}

export function competitorControlFacts(profile: CompetitorProfile): string {
  const specs = profile.resolvedSpec?.specs;

  if (!specs) {
    return "";
  }

  const items = [
    specs.networkPorts ? `${specs.networkPorts}x LAN` : "",
    specs.rs232 ? "RS-232" : "",
    specs.ir ? "IR" : "",
    specs.relay ? (specs.relayPortCount ? `${specs.relayPortCount}x Relay` : "Relay") : "",
    specs.gpio ? (specs.gpioPortCount ? `${specs.gpioPortCount}x GPIO` : "GPIO") : "",
    specs.ethernetControl ? "IP / LAN control" : "",
  ].filter(Boolean);

  return items.length ? `Control: ${items.join(" | ")}` : "";
}

export function competitorAudioNetworkFacts(profile: CompetitorProfile): string {
  const specs = profile.resolvedSpec?.specs;

  if (!specs) {
    return "";
  }

  const items = [
    specs.dante ? (specs.dedicatedDantePort ? "Dedicated Dante port" : "Dante") : "",
    specs.aes67 ? "AES67" : "",
    specs.audioDeEmbed ? "Audio de-embed" : "",
    specs.audioEmbed ? "Audio embed" : "",
  ].filter(Boolean);

  return items.length ? `Audio / Network: ${items.join(" | ")}` : "";
}

function competitorWirelessFacts(profile: CompetitorProfile): string {
  const specs = profile.resolvedSpec?.specs;

  if (!specs) {
    return "";
  }

  const items = [
    specs.wirelessCasting ? "Wireless casting" : "",
    specs.wirelessStandard || "",
    specs.castingDongleSupport ? `Dongle support: ${specs.castingDongleSupport}` : "",
  ].filter(Boolean);

  return items.length ? `Wireless: ${items.join(" | ")}` : "";
}

function competitorCommercialIdentity(profile: CompetitorProfile): string[] {
  const specs = profile.resolvedSpec?.specs;
  const isAvoip = profile.resolvedSpec?.domain === "AVOIP" || profile.requestedTags.includes("avoip");
  const isHdBaseT = profile.resolvedSpec?.domain === "HDBASET" || profile.requestedTags.includes("hdbaset");
  const isNdiCamera = profile.productClass === "NDI camera";
  const isPtzCamera = profile.productClass === "PTZ camera";
  const role = (profile.role || "").toLowerCase();
  const identity: string[] = [];
  const ecosystem = compareCompetitorEcosystem(profile);
  const classLabel =
    profile.productClass.toLowerCase() === "av-over-ip"
      ? "an AV-over-IP product"
      : /^[aeiou]/i.test(profile.productClass)
        ? `an ${profile.productClass.toLowerCase()}`
        : `a ${profile.productClass.toLowerCase()}`;

  if (profile.productClass !== "Unknown") {
    identity.push(`This product is ${classLabel} in the ${ecosystem} family.`);
  }

  const sourceSideIo = joinCommercialFactParts([
    commercialPortLabel(specs?.hdmiInputs, "HDMI input")
      || commercialPortLabel(profile.resolvedSpec?.inputCount, "source/video input"),
    commercialPortLabel(specs?.networkPorts ?? (isAvoip ? 1 : undefined), "LAN/network port"),
  ]);

  const displaySideIo = joinCommercialFactParts([
    commercialPortLabel(specs?.networkPorts ?? (isAvoip ? 1 : undefined), "LAN/network port"),
    commercialPortLabel(specs?.hdmiOutputs, "HDMI output")
      || commercialPortLabel(profile.resolvedSpec?.outputCount, "display/video output"),
  ]);

  const routedIo = joinCommercialFactParts([
    commercialPortLabel(specs?.hdmiInputs ?? profile.resolvedSpec?.inputCount, "HDMI input"),
    commercialPortLabel(specs?.hdmiOutputs ?? profile.resolvedSpec?.outputCount, "HDMI output"),
    commercialPortLabel(specs?.usbCPorts, "USB-C port"),
    commercialPortLabel(specs?.networkPorts, "LAN/network port"),
  ]);

  if (isAvoip && /encoder|transmitter/.test(role) && sourceSideIo) {
    identity.push(`Headline I/O: ${sourceSideIo}.`);
  } else if (isAvoip && /decoder|receiver/.test(role) && displaySideIo) {
    identity.push(`Headline I/O: ${displaySideIo}.`);
  } else if (isNdiCamera) {
    identity.push("Headline I/O: NDI camera output path, plus local video/USB monitoring or handoff where fitted.");
  } else if (isPtzCamera) {
    identity.push("Headline I/O: camera video output path with separate PTZ/control workflow.");
  } else if (routedIo) {
    identity.push(`Headline I/O: ${routedIo}.`);
  }

  const extraVideoIo = joinCommercialFactParts([
    commercialPortLabel(specs?.displayPortInputs, "DisplayPort input"),
    commercialPortLabel(specs?.displayPortOutputs, "DisplayPort output"),
    commercialPortLabel(specs?.dviInputs, "DVI input"),
    commercialPortLabel(specs?.dviOutputs, "DVI output"),
    commercialPortLabel(specs?.vgaInputs, "VGA input"),
    commercialPortLabel(specs?.vgaOutputs, "VGA output"),
    commercialPortLabel(specs?.sdiInputs, "SDI input"),
    commercialPortLabel(specs?.sdiOutputs, "SDI output"),
    commercialPortLabel(specs?.compositeInputs, "composite input"),
    commercialPortLabel(specs?.componentInputs, "component input"),
  ]);

  if (extraVideoIo) {
    identity.push(`Other video I/O: ${extraVideoIo}.`);
  }

  const featureCallouts = joinCommercialFactParts([
    profile.resolvedSpec?.maxResolution ? `Resolution ${profile.resolvedSpec.maxResolution}` : "",
    specs?.hdmiVersion ? specs.hdmiVersion : "",
    specs?.hdcpVersion ? specs.hdcpVersion : "",
    specs?.usbStandard ? specs.usbStandard : "",
    isHdBaseT && specs?.hdbasetVersion ? specs.hdbasetVersion : "",
    isHdBaseT && specs?.hdbasetClass ? specs.hdbasetClass : "",
    specs?.dante ? "Dante" : "",
    specs?.wirelessCasting ? "Wireless casting" : "",
  ]);

  if (featureCallouts) {
    identity.push(`Key feature callouts: ${featureCallouts}.`);
  }

  return uniqueText(identity, 4);
}

export function buildCompetitorSummary(profile: CompetitorProfile, mustMatchFeatures: string): CompetitorSummary {
  const resolvedSpec = profile.resolvedSpec;
  const unsupportedPorts = unsupportedCompetitorVideoPorts(profile);
  const inferredTags = uniqueText(profile.requestedTags.map((tag) => {
    if (tag === "avoip") return "AV-over-IP";
    if (tag === "video wall") return "Video wall";
    if (tag === "multiview") return "Multiview";
    if (tag === "matrix") return "Matrix";
    if (tag === "usb") return "USB / UC";
    if (tag === "hdbaset") return "HDBaseT";
    if (tag === "4k60") return "4K60";
    if (tag === "444") return "4:4:4";
    if (tag === "hdr") return "HDR";
    if (tag === "10g") return "10G / SDVoE";
    if (tag === "encoder") return "Encoder / transmitter";
    if (tag === "decoder") return "Decoder / receiver";
    if (tag === "transceiver") return "Transceiver";
    return tag;
  }), 5);

  const facts = [
    { label: "Recognised class", value: profile.productClass !== "Unknown" ? profile.productClass : "Needs confirmation" },
    { label: "Role", value: profile.role !== "Unknown" ? profile.role : "Needs confirmation" },
    { label: "Signal direction", value: compareSignalDirection(profile) },
    { label: "Transport", value: profile.transport !== "Unknown" ? profile.transport : "Needs confirmation" },
    { label: "Resolution", value: resolvedSpec?.maxResolution || "Not verified locally" },
    { label: "Ecosystem / family", value: compareCompetitorEcosystem(profile) },
  ].filter((entry) => entry.value);

  const knownFeatures = uniqueText([
    competitorHeadlineIo(profile),
    competitorVideoProtectionFacts(profile),
    competitorUsbFacts(profile),
    competitorHdbasetFacts(profile),
    competitorControlFacts(profile),
    competitorAudioNetworkFacts(profile),
    competitorWirelessFacts(profile),
    unsupportedPorts.length ? `Other video I/O evidenced: ${unsupportedPorts.join(", ")}` : "",
    ...compareFeatureFlagSummary(profile),
    inferredTags.length ? `Detected traits: ${inferredTags.join(", ")}` : "",
    mustMatchFeatures.trim() ? `Must-match notes: ${mustMatchFeatures.trim()}` : "",
  ], 10);

  const unknownFeatures = uniqueText([
    ...compareUnknownFeatureSummary(profile),
    unsupportedPorts.length
      ? "WyreStorm does not natively match every additional competitor connector, so confirm whether signal conversion or a changed workflow is acceptable."
      : "",
  ], 8);

  const verifyItems = uniqueText([
    competitorDistanceQuestion(profile),
    competitorCommercialRiskNote(profile),
    competitorEducationalNote(profile),
    "Confirm exact video format, bandwidth and connector expectations before external quote use.",
    "Confirm control, audio and USB behaviour before treating this as a direct equivalent.",
    "Confirm whether the quote stays in the same architecture or moves to a different WyreStorm system.",
  ], 8);

  const warning = exactLimitedDataWarning(profile);
  const outcomeLabel = warning ? "Insufficient competitor data" : profile.productClass === "Unknown" ? "Feature check needed" : "Same product job";
  const identityItems = competitorCommercialIdentity(profile);

  if (isAtlonaOmeExKitProfile(profile)) {
    return {
      heading: "Atlona AT-OME-EX-KIT",
      detail: "HDBaseT TX/RX extender kit",
      recognisedClass: "HDBaseT extender",
      role: "TX/RX extender kit",
      signalDirection: "Point-to-point source-to-display extension",
      transport: "HDBaseT",
      resolution: resolvedSpec?.maxResolution || "Not verified locally",
      ecosystem: "Atlona OME",
      facts: [
        { label: "Recognised class", value: "HDBaseT extender" },
        { label: "Role", value: "TX/RX extender kit" },
        { label: "Signal direction", value: "Point-to-point source-to-display extension" },
        { label: "Transport", value: "HDBaseT" },
        { label: "Resolution", value: resolvedSpec?.maxResolution || "Not verified locally" },
        { label: "Ecosystem / family", value: "Atlona OME" },
      ],
      identityItems: uniqueText([
        "This product is an HDBaseT extender in the Atlona OME family.",
        "Headline I/O: 1x source/video input, 1x display/video output, USB/control extension over category cable.",
        resolvedSpec?.maxResolution ? `Key feature callouts: Resolution ${resolvedSpec.maxResolution}.` : "",
      ], 4),
      knownFeatures: uniqueText([
        "Point-to-point HDMI / USB / control extension over category cable.",
        "USB 2.0 plus control transport where supported.",
        "Typical application: meeting room, classroom, interactive display or UC extension.",
      ], 8),
      unknownFeatures: uniqueText([
        "Exact HDMI/HDCP version not verified locally.",
        "HDBaseT class and cable-distance behaviour not verified locally.",
        "Control and USB edge-case behaviour should be checked against the live datasheet.",
      ], 8),
      verifyItems: uniqueText([
        "Confirm required resolution, USB version, cable length and HDBaseT class before quoting.",
        "Confirm whether the customer really needs point-to-point extension or now needs switching/matrix architecture.",
        "Confirm control needs before positioning any alternative as direct replacement.",
      ], 8),
      outcomeLabel: exactLimitedDataWarning(profile) ? "Insufficient competitor data" : "Same product job",
      warning: exactLimitedDataWarning(profile),
      sourceUrl: resolvedSpec?.datasheetUrl,
    };
  }
  return {
    heading: [profile.brand, profile.sku].filter(Boolean).join(" ").trim() || "Competitor product",
    detail: resolvedSpec?.title?.trim()
      || (profile.knownProfile && typeof profile.knownProfile.title === "string" && profile.knownProfile.title.trim() ? profile.knownProfile.title.trim() : "")
      || (profile.knownProfile && typeof profile.knownProfile.name === "string" && profile.knownProfile.name.trim() ? profile.knownProfile.name.trim() : "")
      || "Wingman matched against this competitor product direction.",
    recognisedClass: profile.productClass !== "Unknown" ? profile.productClass : "Needs confirmation",
    role: profile.role !== "Unknown" ? profile.role : "Needs confirmation",
    signalDirection: compareSignalDirection(profile),
    transport: profile.transport !== "Unknown" ? profile.transport : "Needs confirmation",
    resolution: resolvedSpec?.maxResolution || "Not verified locally",
    ecosystem: compareCompetitorEcosystem(profile),
    facts,
    identityItems,
    knownFeatures,
    unknownFeatures,
    verifyItems,
    outcomeLabel,
    warning,
    sourceUrl: resolvedSpec?.datasheetUrl,
  };
}
