import {
  wyrestormCapabilityFallbackTerms,
  wyrestormCapabilityVerdict,
  type WyrestormDecisionCapability,
} from "./wyrestormCapabilityProfiles";

export type AvDecisionSeverity = "blocker" | "warning" | "info";
export type AvDecisionConfidence = "high" | "medium" | "low";

export type AvDecisionIssue = {
  id: string;
  severity: AvDecisionSeverity;
  title: string;
  detail: string;
  evidence: string;
  question: string;
};

export type AvDecisionEvidenceInput = {
  source?: string;
  requirementText?: string;
  productText?: string;
  productSku?: string;
  productFamily?: string;
  productCategory?: string;
  missingInformation?: string[];
  dependencies?: string[];
};

export type AvDecisionEvidenceResult = {
  score: number;
  confidence: AvDecisionConfidence;
  blockerCount: number;
  warningCount: number;
  evidence: string[];
  quoteChecks: string[];
  missingInformation: string[];
  requiredDependencies: string[];
  alternatives: string[];
  repGuidance: string[];
  nextBestQuestion: string;
  issues: AvDecisionIssue[];
};

function clean(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function lower(value: unknown) {
  return clean(value).toLowerCase();
}

function unique(items: string[]) {
  return Array.from(new Set(items.map((item) => clean(item)).filter(Boolean)));
}

function hasAny(text: string, terms: string[]) {
  const value = lower(text);
  return terms.some((term) => value.includes(term.toLowerCase()));
}

function hasPattern(text: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(text));
}

function addIssue(issues: AvDecisionIssue[], issue: AvDecisionIssue) {
  if (issues.some((existing) => existing.id === issue.id)) return;
  issues.push(issue);
}

function networkHdSeries(text: string) {
  const value = lower(text);
  const series = new Set<string>();

  if (/\bnetworkhd\s*100\b|\bnhd[-_\s]?(?:110|120|124|140|150)\b|\bnhd[-_\s]?150[-_\s]?rx\b/.test(value)) {
    series.add("NetworkHD 100");
  }

  if (/\bnetworkhd\s*500\b|\bnhd[-_\s]?500\b|\bnhd[-_\s]?0401[-_\s]?mv\b/.test(value)) {
    series.add("NetworkHD 500");
  }

  if (/\bnetworkhd\s*600\b|\bnhd[-_\s]?600\b/.test(value)) {
    series.add("NetworkHD 600");
  }

  return Array.from(series);
}

function numberNear(text: string, words: string[]) {
  const value = lower(text);

  for (const word of words) {
    const expression = new RegExp(word + "[^0-9]{0,30}(\\d{1,3})", "i");
    const match = value.match(expression);

    if (match) {
      const parsed = Number(match[1]);
      if (Number.isFinite(parsed)) return parsed;
    }
  }

  return null;
}

function countHints(text: string) {
  return {
    sources: numberNear(text, ["source", "sources", "input", "inputs"]),
    displays: numberNear(text, ["display", "displays", "screen", "screens", "output", "outputs", "zone", "zones"]),
  };
}


function productIsControllerOnly(text: string) {
  return hasAny(text, ["nhd-ctl", "ctl-pro", "controller", "control processor"]) && !hasAny(text, ["encoder", "decoder", "receiver", "transmitter", "transceiver", "matrix", "switcher"]);
}

function productLooksEncoderOnly(text: string) {
  return hasAny(text, ["encoder", "-tx", " tx", "transmitter"]) && !hasAny(text, ["decoder", "-rx", " rx", "receiver", "transceiver", "trx"]);
}

function productLooksDecoderOnly(text: string) {
  return hasAny(text, ["decoder", "-rx", " rx", "receiver"]) && !hasAny(text, ["encoder", "-tx", " tx", "transmitter", "transceiver", "trx"]);
}

function productLooksTransceiver(text: string) {
  return hasAny(text, ["transceiver", "-trx", " trx", "nhd-600-trx"]);
}

function matrixCapacityFrom(text: string) {
  const value = lower(text);
  const explicit = value.match(/\b(\d{1,2})\s*[xX]\s*(\d{1,2})\b/);

  if (explicit) {
    return {
      inputs: Number(explicit[1]),
      outputs: Number(explicit[2]),
      source: "explicit matrix size",
    };
  }

  const skuMatch = value.match(/\b(?:mx|mxv|sw)[-_]?(\d{2})(\d{2})\b/i);

  if (skuMatch) {
    return {
      inputs: Number(skuMatch[1]),
      outputs: Number(skuMatch[2]),
      source: "SKU matrix size",
    };
  }

  const kitMatch = value.match(/\b(?:mx|mxv)[-_]?(\d{4})[-_a-z0-9]*kit\b/i);

  if (kitMatch) {
    return {
      inputs: Number(kitMatch[1].slice(0, 2)),
      outputs: Number(kitMatch[1].slice(2, 4)),
      source: "matrix kit SKU size",
    };
  }

  return null;
}

function needsUsb3(text: string) {
  return hasAny(text, ["usb 3", "usb3", "usb 3.0", "usb 3.1", "usb 3.2", "usb-c camera", "high bandwidth usb", "usb 5gbps", "5gbps"]);
}

function productOnlyShowsUsb2(text: string) {
  return hasAny(text, ["usb 2", "usb2", "usb 2.0"]) && !needsUsb3(text);
}

function requirementSuggestsEndpointSystem(text: string) {
  return hasAny(text, ["source encoder", "display decoder", "endpoint", "endpoints", "many to many", "any source to any display", "source to display"]);
}

function requirementSuggestsSwitcherOnly(text: string) {
  return hasAny(text, ["single room", "one room", "local switching", "presentation switcher", "lectern", "table input", "front of room"]);
}

function isHighPerformanceAvoip(text: string) {
  return hasAny(text, ["nhd-600", "networkhd 600", "10g", "10gbe", "sdvoe", "lossless", "zero latency"]);
}

function has10gNetworkDetail(text: string) {
  return hasAny(text, ["10g", "10gbe", "10 gb", "10-gig", "10 gig", "sfp+", "10g switch", "10gbe switch"]);
}

function inputOutputText(counts: { sources: number | null; displays: number | null }) {
  const sourceText = counts.sources === null ? "unknown source count" : String(counts.sources) + " sources";
  const displayText = counts.displays === null ? "unknown display count" : String(counts.displays) + " displays";
  return sourceText + " / " + displayText;
}

function productIsAvoip(text: string) {
  return hasAny(text, ["networkhd", "avoip", "av over ip", "nhd-", "encoder", "decoder", "transceiver"]);
}

function _productIsMatrix(text: string) {
  return hasAny(text, ["matrix", "mx-", "mxv-", "8x8", "4x4", "16x16"]);
}

function productIsHdbaset(text: string) {
  return hasAny(text, ["hdbaset", "hdbt", "rx-", "tx-", "sw-120", "sw-130", "ex-"]);
}

function productHasUsb(text: string) {
  return hasAny(text, ["usb", "kvm", "uc", "byod", "byom", "camera", "microphone", "webcam"]);
}

function productHasDecisionCapability(
  sku: string,
  text: string,
  capability: WyrestormDecisionCapability,
) {
  const knownVerdict = wyrestormCapabilityVerdict(sku, capability);
  if (knownVerdict !== null) return knownVerdict;
  return hasAny(text, wyrestormCapabilityFallbackTerms(capability));
}

function productHasMultiview(sku: string, text: string) {
  return productHasDecisionCapability(sku, text, "multiview");
}

function requirementNeedsNetwork(text: string) {
  return hasAny(text, [
    "networkhd",
    "av over ip",
    "avoip",
    "multi-room",
    "campus",
    "many to many",
    "any source to any display",
    "distributed",
    "remote source",
  ]);
}

function requirementNeedsMatrix(text: string) {
  return hasAny(text, [
    "matrix",
    "sports bar",
    "hospitality",
    "pub",
    "bar",
    "multi-zone",
    "contained routing",
    "fixed io",
    "fixed i/o",
  ]);
}

function requirementNeedsUsb(text: string) {
  return hasAny(text, ["usb", "teams", "zoom", "meeting", "conference", "uc", "byod", "byom", "camera", "microphone"]);
}

function requirementNeedsVideoWall(text: string) {
  return hasAny(text, ["video wall", "videowall", "lcd wall", "led wall", "2x2", "3x3", "wall processor"]);
}

function requirementNeedsMultiview(text: string) {
  return hasAny(text, [
    "multiview",
    "multi-view",
    "quad view",
    "pip",
    "pbp",
    "picture in picture",
    "picture-by-picture",
    "multiple sources on one screen",
    "multiple sources on a single output",
  ]);
}

function requirementNeedsMst(text: string) {
  return hasAny(text, [
    "mst",
    "multi-stream transport",
    "multistream transport",
    "extended desktop",
    "independent desktop",
    "independent displays",
    "extend desktop",
  ]);
}

function requirementNeedsWirelessCasting(text: string) {
  return hasAny(text, [
    "wireless presentation",
    "wireless casting",
    "wireless screen share",
    "wireless screenshare",
    "airplay",
    "miracast",
    "chromecast",
  ]);
}

function requirementNeedsMosaicWall(text: string) {
  return hasAny(text, [
    "mosaic",
    "rotated wall",
    "rotation",
    "portrait wall",
    "irregular wall",
  ]);
}

function hasNetworkDetail(text: string) {
  return hasAny(text, [
    "managed switch",
    "igmp",
    "multicast",
    "vlan",
    "av vlan",
    "10gbe",
    "10gb",
    "1gbe",
    "network confirmed",
    "existing network",
    "new network",
    "separate vlan",
  ]);
}

function hasDistanceDetail(text: string) {
  return /\b\d+\s*(m|metre|meter|ft|feet)\b/i.test(text) || hasAny(text, ["short run", "long run", "same rack", "local", "remote display"]);
}

function hasResolutionDetail(text: string) {
  return hasAny(text, ["4k", "1080p", "60hz", "4:4:4", "4:2:0", "hdr", "hdcp", "edid", "hdmi 2.0", "hdmi 2.1"]);
}

function buildScore(issues: AvDecisionIssue[], missing: string[]) {
  const blockerPenalty = issues.filter((issue) => issue.severity === "blocker").length * 30;
  const warningPenalty = issues.filter((issue) => issue.severity === "warning").length * 12;
  const missingPenalty = missing.length * 5;
  return Math.max(10, Math.min(96, 88 - blockerPenalty - warningPenalty - missingPenalty));
}

function confidenceFromScore(score: number, blockerCount: number): AvDecisionConfidence {
  if (blockerCount > 0 || score < 55) return "low";
  if (score < 78) return "medium";
  return "high";
}

export function buildAvDecisionEvidence(input: AvDecisionEvidenceInput): AvDecisionEvidenceResult {
  const productSku = clean(input.productSku).toUpperCase();
  const requirementText = lower(input.requirementText);
  const productText = lower([
    input.productSku,
    input.productFamily,
    input.productCategory,
    input.productText,
  ].join(" "));

  const combined = lower([requirementText, productText].join(" "));
  const issues: AvDecisionIssue[] = [];
  const missing: string[] = [];
  const dependencies: string[] = [];
  const alternatives: string[] = [];
  const evidence: string[] = [];
  const quoteChecks: string[] = [];
  const repGuidance: string[] = [];

  const counts = countHints(combined);
  const series = networkHdSeries(combined);



  const matrixCapacity = matrixCapacityFrom(productText);

  if (requirementNeedsMst(requirementText)) {
    evidence.push("MST requirement detected: Wingman treats this as independent extended desktops over USB-C, not multiview or ordinary dual-output routing.");
    missing.push("Laptop USB-C DisplayPort Alt Mode and MST support, display EDID behaviour, and the required independent desktop layout");
    dependencies.push("Validate the laptop operating system/GPU supports USB-C Multi-Stream Transport for the required display arrangement.");

    if (!productHasDecisionCapability(productSku, productText, "mst")) {
      addIssue(issues, {
        id: "mst-capability-not-evidenced",
        severity: "warning",
        title: "MST extended-desktop capability not evidenced",
        detail: "Dual outputs, matrix routing and multiview do not prove that a USB-C laptop can extend its desktop independently across displays.",
        evidence: "The brief asks for MST/independent desktops, but the selected product is not source-profiled for MST support.",
        question: "Does the user need independent extended desktops, or several sources composed on one screen?",
      });
      alternatives.push("For true wired USB-C MST, validate MX-0402-MST, MX-0403-H3-MST, SW-640L-TX-W or SW-620-TX-W against the room workflow.");
    }
  }

  if (requirementNeedsWirelessCasting(requirementText)) {
    evidence.push("Wireless presentation requirement detected; Wingman will validate the named casting protocol rather than treating a USB-C input as wireless sharing.");
    missing.push("Required wireless casting protocols, corporate Wi-Fi/network policy, guest access model and simultaneous presenter behaviour");

    if (!productHasDecisionCapability(productSku, productText, "wirelessCasting")) {
      addIssue(issues, {
        id: "wireless-casting-not-evidenced",
        severity: "warning",
        title: "Wireless casting capability not evidenced",
        detail: "A wired BYOD/USB-C product is not automatically a wireless presentation endpoint.",
        evidence: "Wireless casting language is present, but the selected product is not source-profiled for wireless casting.",
        question: "Which casting protocols and guest-network policy must the room support?",
      });
    }

    const namedProtocol: Array<{ capability: WyrestormDecisionCapability; label: string }> = [
      { capability: "airplay", label: "AirPlay" },
      { capability: "miracast", label: "Miracast" },
      { capability: "chromecast", label: "Chromecast" },
    ];

    for (const protocol of namedProtocol) {
      if (!requirementText.includes(protocol.label.toLowerCase())) continue;
      if (productHasDecisionCapability(productSku, productText, protocol.capability)) continue;

      addIssue(issues, {
        id: `wireless-protocol-${protocol.capability}-not-evidenced`,
        severity: "warning",
        title: `${protocol.label} support not evidenced`,
        detail: `The selected product should not be positioned as supporting ${protocol.label} until its protocol support is proven for the deployed firmware and network policy.`,
        evidence: `${protocol.label} is explicitly required, but the selected SKU is not source-profiled for it.`,
        question: `Is ${protocol.label} mandatory, and is the guest/corporate wireless network approved for that workflow?`,
      });
    }
  }

  if (matrixCapacity && counts.sources !== null && counts.sources > matrixCapacity.inputs) {
    addIssue(issues, {
      id: "matrix-input-capacity-exceeded",
      severity: "blocker",
      title: "Selected matrix does not have enough inputs",
      detail: "The selected matrix/switcher capacity appears lower than the captured source count.",
      evidence: "Requirement basis is " + inputOutputText(counts) + "; product capacity is " + matrixCapacity.inputs + "x" + matrixCapacity.outputs + " from " + matrixCapacity.source + ".",
      question: "Should the design move to a larger matrix, a modular system, or AV-over-IP?",
    });
  }

  if (matrixCapacity && counts.displays !== null && counts.displays > matrixCapacity.outputs) {
    addIssue(issues, {
      id: "matrix-output-capacity-exceeded",
      severity: "blocker",
      title: "Selected matrix does not have enough outputs",
      detail: "The selected matrix/switcher capacity appears lower than the captured display or zone count.",
      evidence: "Requirement basis is " + inputOutputText(counts) + "; product capacity is " + matrixCapacity.inputs + "x" + matrixCapacity.outputs + " from " + matrixCapacity.source + ".",
      question: "Should the design move to a larger matrix, add distribution, or use AV-over-IP?",
    });
  }

  if (productIsControllerOnly(productText)) {
    addIssue(issues, {
      id: "controller-only-selected-as-core-product",
      severity: "blocker",
      title: "Controller-only product selected as core AV path",
      detail: "A controller can support a system, but it is not a video transport endpoint or switching path on its own.",
      evidence: "Controller/control-only wording detected without encoder, decoder, transceiver, switcher or matrix evidence.",
      question: "Which encoder, decoder, matrix, switcher or extender is carrying the actual AV signal?",
    });
  }

  if (requirementSuggestsEndpointSystem(requirementText) && productLooksEncoderOnly(productText) && counts.displays !== null && counts.displays > 0) {
    missing.push("Matching decoder/display endpoint count for the selected encoder path");
    dependencies.push("Validate decoder quantity and display-side endpoint model for every display or zone.");

    addIssue(issues, {
      id: "encoder-without-decoder-topology",
      severity: "warning",
      title: "Encoder path needs display-side endpoint validation",
      detail: "An encoder-only product cannot complete an AVoIP path without matching decoder/display endpoints.",
      evidence: "Encoder-only product language detected with display count or endpoint system language.",
      question: "How many decoders are required, and which display-side endpoint model is being paired?",
    });
  }

  if (requirementSuggestsEndpointSystem(requirementText) && productLooksDecoderOnly(productText) && counts.sources !== null && counts.sources > 0) {
    missing.push("Matching encoder/source endpoint count for the selected decoder path");
    dependencies.push("Validate encoder quantity and source-side endpoint model for every HDMI/source feed.");

    addIssue(issues, {
      id: "decoder-without-encoder-topology",
      severity: "warning",
      title: "Decoder path needs source-side endpoint validation",
      detail: "A decoder-only product cannot complete an AVoIP path without matching source encoders or a network-native source.",
      evidence: "Decoder-only product language detected with source count or endpoint system language.",
      question: "How many encoders are required, and are any sources already available as network streams?",
    });
  }

  if (requirementNeedsUsb(requirementText) && needsUsb3(requirementText) && productOnlyShowsUsb2(productText)) {
    addIssue(issues, {
      id: "usb3-required-but-usb2-evidenced",
      severity: "blocker",
      title: "USB 3.x requirement conflicts with USB 2.0 product evidence",
      detail: "High-bandwidth cameras, capture devices and some UC peripherals require USB 3.x validation. USB 2.0 evidence is not enough.",
      evidence: "Requirement indicates USB 3.x/high-bandwidth USB, while product evidence only shows USB 2.0.",
      question: "Is the USB peripheral path USB 2.0 or USB 3.x, and which WyreStorm product supports that bandwidth?",
    });
  }

  if (isHighPerformanceAvoip(productText) && !has10gNetworkDetail(combined)) {
    missing.push("10GbE switch path, ports, cabling and VLAN design for NetworkHD 600-class systems");

    addIssue(issues, {
      id: "networkhd-600-without-10g-network",
      severity: "warning",
      title: "NetworkHD 600-class design needs 10GbE validation",
      detail: "NetworkHD 600/SDVoE/lossless-class recommendations require a validated 10GbE network path.",
      evidence: "High-performance AVoIP product detected without explicit 10GbE network detail.",
      question: "Which 10GbE switch, cabling and VLAN path will carry the NetworkHD 600 traffic?",
    });
  }

  if (requirementSuggestsSwitcherOnly(requirementText) && productIsAvoip(productText) && !requirementNeedsNetwork(requirementText)) {
    addIssue(issues, {
      id: "local-switcher-brief-given-avoip",
      severity: "info",
      title: "Local presentation switcher may be more appropriate",
      detail: "A local single-room switching brief does not automatically need AV-over-IP.",
      evidence: "Single-room/presentation switching language detected with AVoIP product direction and no distributed network requirement.",
      question: "Is this a local room switcher requirement, or does the customer need distributed routing and expansion?",
    });
    alternatives.push("Keep SW/MX presentation switcher or matrix options in play for local single-room briefs.");
  }

  if (productLooksTransceiver(productText) && counts.sources !== null && counts.displays !== null) {
    dependencies.push("Validate transceiver role allocation: quantity required as encoders versus decoders for the confirmed source/display count.");
    quoteChecks.push("For transceiver products, do not assume one unit covers both ends of the same signal path at the same time.");
  }

  if (productIsAvoip(productText) || requirementNeedsNetwork(requirementText)) {
    evidence.push("AV-over-IP direction detected; Wingman must validate endpoints, control layer and network suitability before treating the design as credible.");
    dependencies.push("NHD-CTL-PRO control layer for any NetworkHD system unless the project already has a compatible controller.");
    dependencies.push("Managed network design with multicast/IGMP, AV VLAN and switch capacity validated before customer issue.");

    if (!hasNetworkDetail(combined)) {
      missing.push("Network switch model/capacity, IGMP/multicast support and AV VLAN approach");
      addIssue(issues, {
        id: "avoip-network-not-confirmed",
        severity: "warning",
        title: "AV-over-IP network not confirmed",
        detail: "NetworkHD recommendations are not credible until the managed network design is confirmed.",
        evidence: "AV-over-IP wording or NetworkHD product detected without network detail.",
        question: "What managed switch, VLAN, multicast/IGMP and bandwidth path will carry the AV traffic?",
      });
    }
  }

  if (series.length > 1 && !hasAny(combined, ["separate vlan", "separate vlans", "isolated vlan", "different vlan", "segregated network"])) {
    addIssue(issues, {
      id: "networkhd-series-mix",
      severity: "blocker",
      title: "NetworkHD families must not be mixed in one flat system",
      detail: "NetworkHD 100, 500 and 600 should be treated as separate system families unless the design explicitly isolates them.",
      evidence: "More than one NetworkHD family appears in the same recommendation context.",
      question: "Are these NetworkHD families separate VLAN/system designs, or should the product family be unified?",
    });
  }

  if (hasAny(combined, ["sw-510-tx"]) && hasPattern(combined, [/\bnhd[-_\s]?\d+[-_\s]?rx\b/i, /networkhd.*receiver/i])) {
    addIssue(issues, {
      id: "sw510-to-networkhd-rx",
      severity: "blocker",
      title: "SW-510-TX cannot feed NetworkHD receivers",
      detail: "SW-510-TX is an HDBaseT transmitter path and must not be recommended as if it connects to NetworkHD AVoIP RX hardware.",
      evidence: "SW-510-TX and NetworkHD receiver language appear in the same recommendation context.",
      question: "Is the receiving endpoint HDBaseT or NetworkHD? Select one signal family before quoting.",
    });
  }

  if (requirementNeedsVideoWall(requirementText)) {
    evidence.push("Video wall requirement detected; Wingman must validate wall geometry, source behaviour and processor path before recommending product.");
    missing.push("Video wall layout, display count, bezel/orientation, source count, layout presets and control behaviour");

    if (!requirementNeedsNetwork(requirementText)) {
      alternatives.push("Evaluate SW-0204-VW for simple preset LCD wall layouts before escalating to AV-over-IP.");
      alternatives.push("Evaluate SW-0206-VW for flexible dedicated non-AV-over-IP video wall processing.");
      quoteChecks.push("Do not default a video wall to AV-over-IP until the wall behaviour proves routing flexibility or distributed endpoint value.");
    }

    if (productIsAvoip(productText) && hasAny(requirementText, ["simple", "preset", "basic", "2x2", "fixed"])) {
      addIssue(issues, {
        id: "simple-wall-avoip-overreach",
        severity: "warning",
        title: "Simple wall may not need AV-over-IP",
        detail: "A contained simple video wall may be better served by a dedicated wall processor than a full AVoIP system.",
        evidence: "Simple wall language detected alongside an AVoIP product direction.",
        question: "Does the wall need flexible routing/multi-room expansion, or only a fixed wall processor?",
      });
    }

    if (requirementNeedsMosaicWall(requirementText) && !productHasDecisionCapability(productSku, productText, "mosaicVideoWall")) {
      addIssue(issues, {
        id: "mosaic-wall-capability-not-evidenced",
        severity: "warning",
        title: "Mosaic or rotated-wall capability not evidenced",
        detail: "A conventional video wall, native multiview and a mosaic/rotated wall are different processing requirements.",
        evidence: "The brief asks for mosaic/rotation behaviour, but the selected product is not source-profiled for mosaic video-wall processing.",
        question: "Does the wall need mosaic/rotation, standard bezel-compensated canvas, or a live multiview composition?",
      });
      alternatives.push("For mosaic or rotated NetworkHD walls, validate the NetworkHD 100 or 500 wall-processing path rather than assuming NetworkHD 600 is equivalent.");
    }
  }

  if (requirementNeedsMultiview(requirementText)) {
    evidence.push("Multiview requirement detected; Wingman treats multiview as multiple visible source windows on a single output canvas.");

    if (!productHasMultiview(productSku, productText)) {
      addIssue(issues, {
        id: "multiview-capability-not-evidenced",
        severity: "warning",
        title: "Multiview capability not evidenced",
        detail: "Multiple HDMI outputs or matrix outputs do not prove multiview capability.",
        evidence: "Multiview language detected but the product evidence does not show explicit multiview support.",
        question: "Does the selected product show multiple sources at the same time on one output, or only switch/route outputs?",
      });
    }
  }

  if (!requirementNeedsMultiview(requirementText) && hasAny(combined, ["multiple outputs", "dual output", "2 outputs", "matrix output", "hdmi outputs"])) {
    quoteChecks.push("Do not label multiple outputs as multiview unless the product explicitly displays multiple sources on one output canvas.");
  }

  if (requirementNeedsUsb(requirementText)) {
    missing.push("USB host ownership, peripheral location, USB version, bandwidth and direction of travel");

    if (!productHasUsb(productText)) {
      addIssue(issues, {
        id: "usb-required-but-product-not-usb",
        severity: "warning",
        title: "USB requirement not proven by selected product",
        detail: "Meeting-room, BYOD, BYOM or camera workflows require explicit USB topology validation.",
        evidence: "USB/UC requirement detected without product USB evidence.",
        question: "Which device is the USB host, where are the peripherals, and is USB 2.0 or USB 3.x required?",
      });
    }
  }

  if (productIsHdbaset(productText) || hasAny(requirementText, ["hdbaset", "hdbt", "cat6", "cat 6", "extension", "extender"])) {
    evidence.push("HDBaseT/extension direction detected; distance, cable grade, receiver pairing and USB/control support must be validated.");

    if (!hasDistanceDetail(combined)) {
      missing.push("Cable distance, cable grade, receiver/transmitter pairing and installed pathway");
      addIssue(issues, {
        id: "hdbaset-distance-not-confirmed",
        severity: "warning",
        title: "Extension distance not confirmed",
        detail: "HDBaseT and extension recommendations are weak without cable distance and receiver pairing.",
        evidence: "HDBaseT/extension wording detected without distance evidence.",
        question: "What is the longest cable run, cable category, and receiver/transmitter pairing?",
      });
    }
  }

  if (!hasResolutionDetail(combined)) {
    missing.push("Resolution, refresh rate, chroma, HDR, HDCP and EDID requirement");
  }

  if (requirementNeedsMatrix(requirementText) && productIsAvoip(productText) && counts.sources !== null && counts.displays !== null && counts.sources <= 8 && counts.displays <= 8) {
    addIssue(issues, {
      id: "small-contained-system-avoip-overreach",
      severity: "info",
      title: "Matrix may be simpler for a small contained system",
      detail: "For fixed I/O systems below roughly 8-10 outputs, matrix/switcher architecture may be cleaner than AVoIP.",
      evidence: "Small source/display count and contained routing language detected.",
      question: "Is this a fixed local system, or does the customer need distributed routing and expansion?",
    });
    alternatives.push("Keep a matrix/switcher path in consideration for small fixed-I/O systems.");
  }

  if (hasAny(requirementText, ["ndi", "ndi camera", "ptz", "camera"]) && productIsAvoip(productText)) {
    dependencies.push("Validate NDI ingest path using NHD-128-NDI-TRX or NHD-128-NDI-BRG where the design needs camera/data composition into NetworkHD.");
    evidence.push("Camera/NDI workflow detected; Wingman should consider NetworkHD NDI ingest/bridge options.");
  }

  if (productSku.startsWith("NHD-600") && !hasAny(combined, ["10g", "10gbe", "10 gb", "sdvoe", "lossless", "zero latency"])) {
    quoteChecks.push("Validate that the project genuinely needs NetworkHD 600-class 10G/lossless/zero-latency performance before positioning it.");
  }

  if (productSku.startsWith("NHD-120") && hasAny(combined, ["4k60 4:4:4", "premium", "dante", "usb routing", "usb 3"])) {
    alternatives.push("Consider NetworkHD 500 or 600 where premium 4K60 4:4:4, stronger USB, Dante-ready or lossless requirements are confirmed.");
  }

  const normalisedMissing = unique([...(input.missingInformation ?? []), ...missing]);
  const blockerCount = issues.filter((issue) => issue.severity === "blocker").length;
  const warningCount = issues.filter((issue) => issue.severity === "warning").length;
  const score = buildScore(issues, normalisedMissing);
  const confidence = confidenceFromScore(score, blockerCount);

  quoteChecks.push(
    ...issues.map((issue) => {
      const prefix = issue.severity === "blocker" ? "Blocking design check" : issue.severity === "warning" ? "Validation check" : "Design note";
      return prefix + ": " + issue.title + " - " + issue.question;
    }),
  );

  repGuidance.push(
    "Use the AV decision evidence as a pre-sales validation layer, not as a replacement for datasheet and project review.",
    "Do not force an equivalent product when the correct answer is a system-shape alternative or no direct match.",
  );

  if (blockerCount > 0) {
    repGuidance.unshift("Do not present this as quote-ready until the blocking AV design issue is resolved.");
  }

  const nextBestQuestion = issues[0]?.question || (normalisedMissing[0] ? "Can we confirm " + normalisedMissing[0].toLowerCase() + "?" : "");

  return {
    score,
    confidence,
    blockerCount,
    warningCount,
    evidence: unique([
      ...evidence,
      ...issues.map((issue) => issue.evidence),
      "AV decision score: " + score + "/100.",
      "AV decision confidence: " + confidence + ".",
    ]),
    quoteChecks: unique(quoteChecks),
    missingInformation: normalisedMissing,
    requiredDependencies: unique([...(input.dependencies ?? []), ...dependencies]),
    alternatives: unique(alternatives),
    repGuidance: unique(repGuidance),
    nextBestQuestion,
    issues,
  };
}
