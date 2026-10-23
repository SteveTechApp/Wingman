import type { ScoredCandidate, Verdict, WyreStormProduct } from "../../features/compare";
import { uniqueSkuOptions } from "./textTokens";
import { compareSkuKey } from "./compareProductTaxonomy";
import {
  assessCompetitorConnectorCoverage,
  buildCompetitorIoSnapshot,
  buildWyrestormIoSnapshot,
  compareInputOutputFit,
  coversConnectorFamily,
} from "./compareComparisonFacts";
import {
  candidateRequiredDependencies,
  compareUnknownFeatureSummary,
  plainLanguageOutcome,
} from "./compareCompetitorFacts";
import {
  isAtlonaOmeExKitProfile,
  isContainedLocalMatrixRequirement,
  isSpecialistHybridRoomRequirement,
  isTrueVideoWallRequirement,
  isWirelessPresentationRequirement,
} from "./compareProfileSignals";
import type { CompetitorProfile } from "./compareTypes";

/**
 * How one WyreStorm candidate is scored against a competitor profile.
 *
 * This was the scoring half of `ComparePageNew.advanced.tsx`: the keyword-and-
 * evidence score, its verdict thresholds, and the equivalence guard that caps a
 * candidate which changes the room architecture instead of replacing the box.
 * It is pure — a profile and a product in, a `ScoredCandidate` out — so the page
 * only decides which products to hand it, and the same scoring can be exercised
 * by tests without mounting the page.
 *
 * The guard lives here because it is part of the same answer: a score is never
 * returned without it, and `rigorousMatchToCandidate` applies it to an engine
 * match for the same reason.
 */

export function applyCompareEquivalenceGuards(candidate: ScoredCandidate, profile?: CompetitorProfile): ScoredCandidate {
  if (!profile) return candidate;

  const isHdbasetExtenderProfile = /hdbaset extender/i.test(profile.productClass) || isAtlonaOmeExKitProfile(profile);
  const changesArchitecture = candidate.product.productClass === "Presentation switcher"
    || candidate.product.productClass === "Matrix"
    || /^MX|^SW/.test(candidate.product.sku);

  if (isHdbasetExtenderProfile && changesArchitecture) {
    return {
      ...candidate,
      score: Math.min(candidate.score, 54),
      verdict: "ARCHITECTURE ALTERNATIVE",
      matched: uniqueSkuOptions([
        ...candidate.matched,
        "ARCHITECTURE ALTERNATIVE: this WyreStorm option changes the room design rather than replacing the point-to-point HDBaseT extender path.",
      ]),
      checks: uniqueSkuOptions([
        ...candidate.checks,
        "Confirm whether the customer actually needs switching, multiple sources or multiple outputs before moving away from an extender-led design.",
      ]),
      gaps: uniqueSkuOptions([
        ...candidate.gaps,
        "The competitor product is a point-to-point HDBaseT extender kit. This WyreStorm product changes the system architecture because it adds presentation switching rather than simply replacing the extender path.",
      ]),
      partialMatches: uniqueSkuOptions([
        ...candidate.partialMatches,
        "Useful only if the customer has moved from point-to-point extension into a switching-led room design.",
      ]),
      mismatches: uniqueSkuOptions([
        ...candidate.mismatches,
        "This is not a point-to-point extender like-for-like replacement.",
      ]),
      blockers: uniqueSkuOptions([
        ...candidate.blockers,
        "Architecture changes must be agreed before this can be quoted as the preferred path.",
      ]),
    };
  }

  return candidate;
}

// Product-class pairings that already receive bespoke, evidence-specific
// scoring elsewhere in scoreProduct() below (both bonuses for legitimate
// architecture alternatives and their own dedicated mismatch penalties).
// Anything NOT in this list falls through to the generic mismatch penalty,
// so a category this function's authors never anticipated (e.g. a splitter
// or video-wall competitor product) cannot slip past on transport/tag
// coincidence alone just because nobody wrote a bespoke rule for it.
function isProductClassMismatchAlreadyHandled(profile: CompetitorProfile, product: WyreStormProduct): boolean {
  const competitorClass = profile.productClass;
  const candidateClass = product.productClass;

  // Camera-family and wireless-casting requirements already have an
  // exhaustive "else" branch below that penalises every non-matching
  // candidate class, so every pairing under these requirements is covered.
  if (["NDI camera", "PTZ camera", "Wireless casting"].includes(competitorClass)) {
    return true;
  }

  if (competitorClass === "AV-over-IP" && candidateClass !== "AV-over-IP") return true;
  if (competitorClass === "USB conferencing" && candidateClass === "AV-over-IP") return true;
  if (competitorClass === "Network audio" && candidateClass === "AV-over-IP") return true;
  if (competitorClass === "Matrix" && candidateClass === "HDBaseT extender") return true;
  if (competitorClass === "HDBaseT extender" && candidateClass === "Matrix") return true;

  return false;
}

export function scoreProduct(profile: CompetitorProfile, product: WyreStormProduct): ScoredCandidate {
  let score = 12;
  const matched: string[] = [];
  const checks: string[] = [];
  const gaps: string[] = [];
  const partialMatches: string[] = [];
  const mismatches: string[] = [];
  const unknowns: string[] = [];
  const blockers: string[] = [];
  const trueVideoWallRequirement = isTrueVideoWallRequirement(profile);
  const wirelessPresentationRequirement = isWirelessPresentationRequirement(profile);
  const containedLocalMatrixRequirement = isContainedLocalMatrixRequirement(profile);
  const ndiCameraRequirement = profile.productClass === "NDI camera";
  const ptzCameraRequirement = profile.productClass === "PTZ camera";
  const usbConferencingRequirement = profile.productClass === "USB conferencing";
  const networkAudioRequirement = profile.productClass === "Network audio";
  const wirelessCastingRequirement = profile.productClass === "Wireless casting";
  const competitorIo = buildCompetitorIoSnapshot(profile);
  const candidateIo = buildWyrestormIoSnapshot(product);
  const connectorCoverage = assessCompetitorConnectorCoverage(competitorIo);
  const unresolvedAdditionalVideoFamilies = competitorIo.additionalVideoFamilies.filter(
    (family) => !competitorIo.waivedAdditionalVideoFamilies.includes(family),
  );

  if (profile.productClass !== "Unknown" && product.productClass === profile.productClass) {
    score += 28;
    matched.push(`Same product class: ${product.productClass}`);
  } else if (
    profile.productClass !== "Unknown" &&
    product.productClass !== "Unknown" &&
    !isProductClassMismatchAlreadyHandled(profile, product)
  ) {
    // Default guard: a different product class is not automatically a valid
    // comparison just because it happens to share a transport keyword or two.
    // Without this, an uncovered pairing (e.g. splitter vs AVoIP, video wall
    // vs presentation switcher) could still cross the match thresholds on
    // transport/tag/IO coincidence alone.
    score -= 60;
    mismatches.push(`Competitor product class is ${profile.productClass}, but this WyreStorm candidate is ${product.productClass}.`);
    blockers.push("Do not present this as an equivalent without confirming the customer's actual requirement changed.");
  }

  if (profile.role !== "Unknown" && product.role === profile.role) {
    score += 18;
    matched.push(`Same endpoint role: ${product.role}`);
  }

  if (profile.transport !== "Unknown" && product.transport.toUpperCase().includes(profile.transport.split(" ")[0].toUpperCase())) {
    score += 14;
    matched.push(`Similar transport direction: ${product.transport}`);
  } else if (profile.transport !== "Unknown") {
    partialMatches.push(`Transport differs: competitor points to ${profile.transport}, WyreStorm candidate is ${product.transport}.`);
  }

  profile.requestedTags.forEach((tag) => {
    if (product.tags.includes(tag)) {
      score += tag === "compact room" || tag === "medium room" ? 20 : 7;
      matched.push(`Matches requested feature: ${tag}`);
    }
  });

  const requestedRoomFit = profile.requestedTags.find((tag) => tag === "compact room" || tag === "medium room");
  const candidateRoomFit = product.tags.find((tag) => tag === "compact room" || tag === "medium room");
  if (requestedRoomFit && candidateRoomFit && requestedRoomFit !== candidateRoomFit) {
    score -= 12;
    partialMatches.push(`Room positioning differs: competitor is ${requestedRoomFit}, candidate is ${candidateRoomFit}.`);
  }

  if (competitorIo.waivedAdditionalVideoFamilies.length > 0) {
    matched.push(`Additional competitor connectors excluded from this comparison: ${competitorIo.waivedAdditionalVideoFamilies.join(", ")}.`);
  }

  if (unresolvedAdditionalVideoFamilies.length > 0) {
    mismatches.push(`Missing native connector support: the competitor includes ${unresolvedAdditionalVideoFamilies.join(", ")}, which this WyreStorm candidate does not provide.`);

    if (connectorCoverage.predominantlyUnsupported) {
      score -= 84;
      blockers.push("The competitor's evidenced video I/O is predominantly outside WyreStorm's native HDMI, HDBaseT, IP and USB-C input / HDMI, HDBaseT and IP output coverage.");
      unknowns.push("Confirm an acceptable conversion or architecture change before treating this as a viable replacement.");
    } else {
      score -= 18;
      gaps.push(`The supported ${connectorCoverage.supportedFamilies.join(", ")} path remains comparable, but ${unresolvedAdditionalVideoFamilies.join(", ")} would require conversion or a changed workflow if used.`);
      checks.push(`Confirm whether the competitor's ${unresolvedAdditionalVideoFamilies.join(", ")} connections are required in the proposed system.`);
    }
  }

  score += compareInputOutputFit(
    "input",
    competitorIo.inputCount,
    candidateIo.inputCount,
    matched,
    partialMatches,
    mismatches,
    blockers,
  );

  score += compareInputOutputFit(
    "output",
    competitorIo.outputCount,
    candidateIo.outputCount,
    matched,
    partialMatches,
    mismatches,
    blockers,
  );

  const missingInputFamilies = competitorIo.inputFamilies.filter((family) => !coversConnectorFamily(candidateIo.inputFamilies, family));
  const missingOutputFamilies = competitorIo.outputFamilies.filter((family) => !coversConnectorFamily(candidateIo.outputFamilies, family));

  if (missingInputFamilies.length > 0) {
    score -= 46;
    mismatches.push(`${product.sku} does not cover the competitor input connection type${missingInputFamilies.length === 1 ? "" : "s"}: ${missingInputFamilies.join(", ")}.`);
    blockers.push(`Do not recommend a product that drops required competitor input connection types.`);
  } else if (competitorIo.inputFamilies.length > 0) {
    score += 12;
    matched.push(`Required input connection types covered: ${competitorIo.inputFamilies.join(", ")}.`);
  }

  if (missingOutputFamilies.length > 0) {
    score -= 46;
    mismatches.push(`${product.sku} does not cover the competitor output connection type${missingOutputFamilies.length === 1 ? "" : "s"}: ${missingOutputFamilies.join(", ")}.`);
    blockers.push(`Do not recommend a product that drops required competitor output connection types.`);
  } else if (competitorIo.outputFamilies.length > 0) {
    score += 12;
    matched.push(`Required output connection types covered: ${competitorIo.outputFamilies.join(", ")}.`);
  }

  profile.videoTags.forEach((tag) => {
    if (!product.tags.includes(tag)) {
      gaps.push(`Confirm video bandwidth requirement: ${tag}`);
      unknowns.push(`Verify whether the competitor really requires ${tag} before treating this as like-for-like.`);
    }
  });

  if (profile.productClass === "AV-over-IP" && product.productClass !== "AV-over-IP") {
    score -= 24;
    gaps.push("Competitor appears to be AVoIP but candidate is not an AVoIP endpoint.");
    mismatches.push("Competitor architecture is AV-over-IP, but this WyreStorm product is not an AVoIP endpoint.");
    blockers.push("Do not quote this as a direct AVoIP replacement.");
  }

  if (usbConferencingRequirement && /Presentation switcher|PTZ camera/.test(product.productClass)) {
    score += product.productClass === "PTZ camera" ? 36 : 28;
    partialMatches.push(
      product.productClass === "PTZ camera"
        ? "This stays in the room-camera lane, but confirm whether the customer also needs the wider USB conferencing appliance."
        : "This supports meeting-room collaboration, but confirm whether the customer needs a conferencing bar/camera rather than source switching.",
    );
  } else if (usbConferencingRequirement && product.productClass === "AV-over-IP") {
    score -= 72;
    mismatches.push("This is AV-over-IP transport hardware, not a USB conferencing device.");
    blockers.push("Wrong product class for a conferencing-bar or USB-camera comparison.");
  }

  if (networkAudioRequirement && product.productClass === "AV-over-IP") {
    score -= 88;
    mismatches.push("This is network audio, not network video.");
    blockers.push("Wrong product class for an audio DSP / Dante comparison.");
  }

  if (ndiCameraRequirement && product.productClass === "NDI camera") {
    score += 82;
    matched.push("Same product class: NDI camera.");
    matched.push("Keeps the comparison in the real camera category instead of drifting into transport hardware.");
  }

  if (ptzCameraRequirement && product.productClass === "PTZ camera") {
    score += 78;
    matched.push("Same product class: PTZ camera.");
    matched.push("Keeps the comparison focused on the actual room-camera job.");
  }

  if (ndiCameraRequirement && product.productClass === "PTZ camera") {
    score += 22;
    partialMatches.push("This stays in camera territory, but it does not preserve the competitor's NDI-led workflow.");
    unknowns.push("Confirm whether the customer specifically needs NDI output or only a controllable PTZ camera.");
  }

  if (ptzCameraRequirement && product.productClass === "NDI camera") {
    score += 20;
    partialMatches.push("This stays in camera territory and adds NDI workflow value, but confirm whether NDI is actually required.");
  }

  if ((ndiCameraRequirement || ptzCameraRequirement) && product.productClass === "Camera bridge") {
    score -= 42;
    mismatches.push("This is a camera bridge / mixer path, not the camera itself.");
    blockers.push("Do not lead with a bridge when the competitor product is an actual camera.");
  }

  if (ndiCameraRequirement && !["NDI camera", "PTZ camera", "Camera bridge"].includes(product.productClass)) {
    score -= 88;
    mismatches.push("Competitor is an NDI camera, but this WyreStorm product is not a camera product.");
    blockers.push("Wrong product class for an NDI camera comparison.");
  }

  if (ptzCameraRequirement && !["PTZ camera", "NDI camera", "Camera bridge"].includes(product.productClass)) {
    score -= 84;
    mismatches.push("Competitor is a PTZ camera, but this WyreStorm product is not a camera product.");
    blockers.push("Wrong product class for a PTZ camera comparison.");
  }

  if (wirelessCastingRequirement && /wireless/i.test(product.transport)) {
    score += 34;
    matched.push("Wireless presentation / casting direction preserved.");
  } else if (wirelessCastingRequirement && product.productClass === "Presentation switcher") {
    score += 12;
    partialMatches.push("Presentation switching may help, but the competitor brief is specifically wireless-casting led.");
  } else if (wirelessCastingRequirement) {
    score -= 48;
    mismatches.push("Competitor is a wireless-casting product, but this WyreStorm candidate is not a wireless-casting path.");
  }

  if (profile.role.includes("Encoder") && product.role.includes("Decoder")) {
    score -= 26;
    gaps.push("Competitor appears to be a transmitter/encoder but candidate is a receiver/decoder.");
    mismatches.push("Competitor is source-side / encoder-led, but this candidate sits at the display-side / decoder end.");
    blockers.push("Wrong endpoint direction for a direct replacement.");
  }

  if (profile.role.includes("Decoder") && product.role.includes("Encoder")) {
    score -= 26;
    gaps.push("Competitor appears to be a receiver/decoder but candidate is a transmitter/encoder.");
    mismatches.push("Competitor is display-side / decoder-led, but this candidate sits at the source-side / encoder end.");
    blockers.push("Wrong endpoint direction for a direct replacement.");
  }

  if (profile.productClass === "Matrix" && product.productClass === "HDBaseT extender") {
    score -= 42;
    mismatches.push("This is a matrix-style routing product, not a point-to-point extender.");
    blockers.push("Do not replace a routed matrix requirement with an extender-led answer.");
  }

  if (profile.productClass === "HDBaseT extender" && product.productClass === "Matrix") {
    score -= 42;
    mismatches.push("This is a point-to-point extender requirement, not a matrix-style routing product.");
    blockers.push("Do not replace a point-to-point extender requirement with a matrix-led answer.");
  }

  if (product.sku.endsWith("-VW") && !trueVideoWallRequirement) {
    score -= 52;
    gaps.push("Products ending in -VW should only lead when the brief is a true LCD video wall requirement.");
    mismatches.push("This is a dedicated video-wall processor path, but the current brief does not prove a true LCD video-wall requirement.");
    blockers.push("Do not lead with a -VW product unless the job is genuinely a video wall.");
  }

  if (trueVideoWallRequirement && (product.sku === "SW-0206-VW" || product.sku === "SW-0204-VW")) {
    score += product.sku === "SW-0206-VW" ? 18 : 14;
    matched.push("Dedicated non-AVoIP video wall processor considered.");
  }

  if (profile.productClass === "Multiview" && product.sku === "NHD-0401-MV") {
    score += 18;
    matched.push("Dedicated multiview processor considered.");
  }

  if (product.compareSuitability === "specialist" && !isSpecialistHybridRoomRequirement(profile)) {
    score -= 42;
    gaps.push("This WyreStorm product is a specialist room core and should not be used as a default compare match for ordinary presentation switcher briefs.");
    mismatches.push("This is a specialist large-room / dual-room core, not a normal default compare answer.");
  }

  if (profile.productClass === "Presentation switcher" && (product.sku === "MX-0402-MST" || product.sku === "MX-0403-H3-MST")) {
    score += 22;
    matched.push("Compact presentation-switcher path considered ahead of larger specialist or matrix-led products.");
  }

  const wirelessSwitcherSkuKey = compareSkuKey(product.sku);

  if (profile.productClass === "Presentation switcher" && wirelessPresentationRequirement && ["SW620LTXW", "SW620TXW", "SW640TXW", "SW640LTXW"].includes(wirelessSwitcherSkuKey)) {
    score += ["SW640TXW", "SW640LTXW"].includes(wirelessSwitcherSkuKey) ? 22 : 18;
    matched.push("Wireless presentation requirement detected, so the SW-600 room-switcher path was prioritised.");
  }

  if (profile.productClass === "Presentation switcher" && !wirelessPresentationRequirement && ["SW620LTXW", "SW620TXW", "SW640TXW", "SW640LTXW"].includes(wirelessSwitcherSkuKey)) {
    score -= 10;
    gaps.push("Wireless presentation has not been established yet, so confirm whether the room really needs an SW-600 wireless workflow.");
    unknowns.push("Wireless presentation benefit is not yet evidenced from the competitor brief.");
  }

  if (profile.productClass === "Presentation switcher" && product.sku === "MX-0403-H3-MST" && /mtr|teams room|capture|hdbaset 3|hdbaset3/i.test(profile.rawText)) {
    score += 16;
    matched.push("HDBaseT 3.0 / MTR capture style output requirement detected.");
  }

  if (profile.productClass === "Presentation switcher" && product.sku === "MX-1007-HYB" && !isSpecialistHybridRoomRequirement(profile)) {
    score -= 18;
    gaps.push("Brief does not look like the kind of large-room or dual-room hybrid-core job that would justify MX-1007-HYB.");
  }

  if (containedLocalMatrixRequirement && product.sku === "MX-0404-SCL") {
    score += 24;
    matched.push("Contained local matrix requirement detected, so the SCL matrix path was prioritised.");
  }

  if (profile.productClass === "Matrix" && !trueVideoWallRequirement && product.sku.endsWith("-VW")) {
    score -= 18;
    gaps.push("This looks like a matrix discussion, not a dedicated LCD video wall processor requirement.");
  }

  if (profile.productClass === "Matrix" && product.productClass === "Presentation switcher") {
    score -= 8;
    gaps.push("Confirm whether the customer really needs matrix-style source-to-display routing rather than a presentation-room switcher.");
    partialMatches.push("This could help functionally if the room is really presentation-led, but it is not the same matrix architecture by default.");
  }

  if (matched.length === 0) {
    gaps.push("No strong feature match from the entered data.");
    unknowns.push("The current competitor evidence does not yet prove a strong like-for-like fit.");
  }

  const hdbasetExtenderProfile = /hdbaset extender/i.test(profile.productClass) || isAtlonaOmeExKitProfile(profile);

  if (hdbasetExtenderProfile && product.productClass === "HDBaseT extender") {
    score += 70;
    matched.push("Same product class: point-to-point HDBaseT extender path.");
    matched.push("Preserves point-to-point extension architecture instead of forcing switching or matrix logic.");
  }

  if (hdbasetExtenderProfile && (product.productClass === "Presentation switcher" || product.productClass === "Matrix")) {
    score -= 55;
    gaps.push("Competitor is an HDBaseT extender kit, not a switching or matrix product.");
    mismatches.push("This changes the architecture from point-to-point extension into switching/routing.");
    blockers.push("Only discuss this as an architecture alternative, not a direct replacement.");
  }

  if (hdbasetExtenderProfile && product.sku === "MX-0403-H3-MST") {
    score -= 50;
    gaps.push("MX-0403-H3-MST should only be considered as an architecture alternative when the brief adds switching, multiple sources or multiple outputs.");
    blockers.push("Do not lead with MX-0403-H3-MST unless the customer has moved beyond a simple extender brief.");
  }
  checks.push(product.caveat);
  checks.push("Confirm mandatory features against current datasheets before quoting.");
  checks.push("Do not place competitor products in a WyreStorm BOM.");
  unknowns.push(...compareUnknownFeatureSummary(profile).slice(0, 4));

  // When Wingman could not classify the competitor product's own technology
  // type at all (no resolved spec domain and no keyword/tag match), there is
  // no basis to gate this candidate against a wrong-category recommendation -
  // the class-match bonus and the generic mismatch penalty above both require
  // a known productClass to run. Rather than let a specific WyreStorm SKU win
  // on transport/tag/IO coincidence alone, cap this below the match thresholds
  // so an unclassified competitor product surfaces as "no confident match"
  // (prompting manual classification or live lookup) instead of a wrong-tech
  // recommendation reaching a customer quote.
  const competitorClassUnknown = profile.productClass === "Unknown";

  if (competitorClassUnknown) {
    unknowns.push("Wingman could not determine the competitor product's technology class, so no specific WyreStorm SKU can be confidently recommended yet.");
    blockers.push("Classify the competitor product (or run a live lookup) before treating any WyreStorm SKU as an equivalent.");
  }

  const boundedScore = competitorClassUnknown ? Math.min(38, Math.max(0, score)) : Math.max(0, Math.min(100, score));
  const verdict: Verdict = boundedScore >= 72 ? "GOOD MATCH" : boundedScore >= 42 ? "PARTIAL MATCH" : "NO MATCH";
  const requiredDependencies = candidateRequiredDependencies(product, profile);

  const candidate = applyCompareEquivalenceGuards({
    product,
    score: boundedScore,
    verdict,
    matched: uniqueSkuOptions(matched),
    checks: uniqueSkuOptions(checks),
    gaps: uniqueSkuOptions(gaps),
    partialMatches: uniqueSkuOptions(partialMatches),
    mismatches: uniqueSkuOptions(mismatches),
    unknowns: uniqueSkuOptions(unknowns),
    blockers: uniqueSkuOptions(blockers),
    dependencies: uniqueSkuOptions(requiredDependencies),
    outcomeLabel: "Feature check needed",
  }, profile);

  return {
    ...candidate,
    outcomeLabel: plainLanguageOutcome(profile, candidate),
  };
}