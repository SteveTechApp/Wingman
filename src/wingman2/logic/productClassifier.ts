export type CommercialPackageType =
  | "standalone"
  | "kit"
  | "bundle"
  | "chassis"
  | "card"
  | "accessory"
  | "cable"
  | "licence"
  | "unknown";

export type EndpointRole =
  | "tx"
  | "rx"
  | "trx"
  | "tx_rx_kit"
  | "matrix_with_rx_kit"
  | "matrix_switcher"
  | "distribution_amplifier"
  | "controller"
  | "processor"
  | "accessory"
  | "cable"
  | "unknown";

export type ProductClass =
  | "hdbaset_extender"
  | "hdbaset_extender_kit"
  | "hdmi_extender"
  | "hdmi_extender_kit"
  | "hdmi_matrix"
  | "hdmi_distribution_amplifier"
  | "hdbaset_matrix"
  | "hdbaset_matrix_kit"
  | "av_over_ip_endpoint"
  | "av_over_ip_controller"
  | "presentation_switcher"
  | "uc_switcher"
  | "multiview_processor"
  | "video_wall_processor"
  | "camera_bridge"
  | "usb_extender"
  | "cable"
  | "accessory"
  | "unknown";

export type LeadEligibility = "default" | "conditional" | "request_only" | "accessory_only" | "never_lead";

export type DirectEquivalenceVerdict = "GOOD_MATCH" | "PARTIAL_MATCH" | "NO_MATCH" | "NO_MATCH_RELATED";

export interface ProductClassificationInput {
  sku: string;
  title?: string;
  description?: string;
  family?: string;
  category?: string;
}

export interface ProductClassification {
  sku: string;
  commercialPackageType: CommercialPackageType;
  endpointRole: EndpointRole;
  productClass: ProductClass;
  technologyFamily: string;
  topology: string;
  leadEligibility: LeadEligibility;
  comparableClasses: readonly ProductClass[];
  notComparableWith: readonly EndpointRole[];
  warnings: readonly string[];
  hardBlockerTags: readonly string[];
}

export interface EquivalenceGateResult {
  verdict: DirectEquivalenceVerdict;
  directEquivalentAllowed: boolean;
  relatedOnly: boolean;
  blockers: readonly string[];
  warnings: readonly string[];
}

const TRANSMITTER_SUFFIX_PATTERN = /-(TX|TX\d+)(-[A-Z0-9]+)?$/i;
const RECEIVER_SUFFIX_PATTERN = /-(RX|RX\d+)(-[A-Z0-9]+)?$/i;

function normaliseSku(value: string): string {
  return value.trim().replace(/\s+/g, "").replace(/_/g, "-").toUpperCase();
}

function normaliseText(value: ProductClassificationInput): string {
  return [value.sku, value.title, value.description, value.family, value.category]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function unique<T>(items: readonly T[]): readonly T[] {
  return Array.from(new Set(items));
}

export function classifySkuPackage(input: ProductClassificationInput | string): ProductClassification {
  const source: ProductClassificationInput = typeof input === "string" ? { sku: input } : input;
  const sku = normaliseSku(source.sku);
  const text = normaliseText(source);
  const warnings: string[] = [];
  const hardBlockerTags: string[] = [];

  let commercialPackageType: CommercialPackageType = "standalone";
  let endpointRole: EndpointRole = "unknown";
  let productClass: ProductClass = "unknown";
  let technologyFamily = "Unknown";
  let topology = "unknown";
  let leadEligibility: LeadEligibility = "conditional";
  let comparableClasses: ProductClass[] = [];
  let notComparableWith: EndpointRole[] = [];

  /*
    Critical rule:
    KIT is a package classification and must be resolved before TX/RX suffix parsing.
    Do not classify a -KIT SKU as TX-only or RX-only.
  */
  if (sku.endsWith("-KIT")) {
    commercialPackageType = "kit";
    warnings.push("KIT SKU detected. Do not classify as TX-only or RX-only.");

    if (sku.startsWith("MX-") || text.includes("matrix")) {
      const includesMatrixReceivers = text.includes("hdbaset") ||
        text.includes("hdbase t") ||
        /\breceivers?\b/i.test(text) ||
        /\brx\b/i.test(text);

      endpointRole = includesMatrixReceivers ? "matrix_with_rx_kit" : "matrix_switcher";
      productClass = includesMatrixReceivers ? "hdbaset_matrix_kit" : "hdmi_matrix";
      technologyFamily = includesMatrixReceivers ? "HDBaseT Matrix" : "Matrix";
      topology = "many_sources_to_many_displays";
      comparableClasses = ["hdbaset_matrix_kit", "hdbaset_matrix", "hdmi_matrix"];
      notComparableWith = ["tx", "rx", "trx", "accessory", "cable"];
      leadEligibility = "default";
      hardBlockerTags.push("kit_not_endpoint", includesMatrixReceivers ? "matrix_package" : "matrix_switching_package");
    }

    if (endpointRole === "unknown") {
      endpointRole = "tx_rx_kit";
      productClass = text.includes("hdbaset") || text.includes("hdbase t") ? "hdbaset_extender_kit" : "hdmi_extender_kit";
      technologyFamily = text.includes("hdbaset") || text.includes("hdbase t") ? "HDBaseT" : "HDMI Extension";
      topology = "one_source_to_one_display";
      comparableClasses = ["hdbaset_extender_kit", "hdmi_extender_kit", "hdbaset_extender", "hdmi_extender"];
      notComparableWith = ["tx", "rx", "matrix_switcher", "controller", "processor", "accessory", "cable"];
      leadEligibility = "default";
      hardBlockerTags.push("kit_not_endpoint", "tx_rx_package");
    }

    return {
      sku,
      commercialPackageType,
      endpointRole,
      productClass,
      technologyFamily,
      topology,
      leadEligibility,
      comparableClasses: unique(comparableClasses),
      notComparableWith: unique(notComparableWith),
      warnings: unique(warnings),
      hardBlockerTags: unique(hardBlockerTags),
    };
  }

  if (sku.endsWith("-TRX") || sku.endsWith("-TRXF")) {
    commercialPackageType = "standalone";
    endpointRole = "trx";
    productClass = "av_over_ip_endpoint";
    technologyFamily = sku.startsWith("NHD-600") || sku.startsWith("NHD-610") ? "NetworkHD 600" : "AV-over-IP";
    topology = "encoder_decoder_transceiver";
    comparableClasses = ["av_over_ip_endpoint"];
    notComparableWith = ["tx_rx_kit", "matrix_with_rx_kit", "controller", "accessory", "cable"];
    leadEligibility = "conditional";
    hardBlockerTags.push("transceiver_not_tx_only_or_rx_only");
  }

  if (endpointRole === "unknown" && TRANSMITTER_SUFFIX_PATTERN.test(sku)) {
    commercialPackageType = "standalone";
    endpointRole = "tx";
    productClass = sku.startsWith("NHD-") ? "av_over_ip_endpoint" : "hdbaset_extender";
    technologyFamily = sku.startsWith("NHD-") ? "NetworkHD" : "HDBaseT";
    topology = "source_side_endpoint";
    comparableClasses = [productClass];
    notComparableWith = ["rx", "tx_rx_kit", "matrix_with_rx_kit", "controller", "accessory", "cable"];
    leadEligibility = "conditional";
    hardBlockerTags.push("tx_endpoint_only");
  }

  if (endpointRole === "unknown" && RECEIVER_SUFFIX_PATTERN.test(sku)) {
    commercialPackageType = "standalone";
    endpointRole = "rx";
    productClass = sku.startsWith("NHD-") ? "av_over_ip_endpoint" : "hdbaset_extender";
    technologyFamily = sku.startsWith("NHD-") ? "NetworkHD" : "HDBaseT";
    topology = "display_side_endpoint";
    comparableClasses = [productClass];
    notComparableWith = ["tx", "tx_rx_kit", "matrix_with_rx_kit", "controller", "accessory", "cable"];
    leadEligibility = "conditional";
    hardBlockerTags.push("rx_endpoint_only");
  }

  if (sku.startsWith("NHD-CTL")) {
    commercialPackageType = "standalone";
    endpointRole = "controller";
    productClass = "av_over_ip_controller";
    technologyFamily = "NetworkHD";
    topology = "system_control_dependency";
    comparableClasses = ["av_over_ip_controller"];
    notComparableWith = ["tx", "rx", "trx", "tx_rx_kit", "matrix_with_rx_kit"];
    leadEligibility = "never_lead";
    hardBlockerTags.push("controller_dependency_not_av_equivalent");
  }

  if (sku.startsWith("CAB-")) {
    commercialPackageType = "cable";
    endpointRole = "cable";
    productClass = "cable";
    technologyFamily = "Cable";
    topology = "supporting_item";
    comparableClasses = ["cable"];
    notComparableWith = ["tx", "rx", "trx", "tx_rx_kit", "matrix_with_rx_kit", "matrix_switcher", "controller", "processor"];
    leadEligibility = "request_only";
    hardBlockerTags.push("cable_not_lead_recommendation");
  }

  if (
    endpointRole === "unknown" &&
    (/^SP-/.test(sku) || /^EXP-SP-/.test(sku) || text.includes("splitter") || text.includes("distribution amplifier"))
  ) {
    commercialPackageType = "standalone";
    endpointRole = "distribution_amplifier";
    productClass = "hdmi_distribution_amplifier";
    technologyFamily = "HDMI Distribution";
    topology = "one_source_to_many_mirrored_displays";
    comparableClasses = ["hdmi_distribution_amplifier"];
    notComparableWith = ["tx", "rx", "trx", "tx_rx_kit", "matrix_with_rx_kit", "matrix_switcher", "controller", "accessory", "cable"];
    leadEligibility = "default";
  }

  if (endpointRole === "unknown" && sku.startsWith("MX-")) {
    commercialPackageType = "standalone";
    endpointRole = "matrix_switcher";
    productClass = text.includes("hdbaset") || text.includes("hdbase t") ? "hdbaset_matrix" : "hdmi_matrix";
    technologyFamily = text.includes("hdbaset") || text.includes("hdbase t") ? "HDBaseT Matrix" : "Matrix";
    topology = "many_sources_to_many_displays";
    comparableClasses = ["hdbaset_matrix", "hdmi_matrix", "hdbaset_matrix_kit"];
    notComparableWith = ["tx", "rx", "trx", "tx_rx_kit", "controller", "accessory", "cable"];
    leadEligibility = "default";
  }

  if (endpointRole === "unknown" && (sku.includes("-MV") || text.includes("multiview"))) {
    commercialPackageType = "standalone";
    endpointRole = "processor";
    productClass = "multiview_processor";
    technologyFamily = "Multiview";
    topology = "many_sources_to_one_canvas";
    comparableClasses = ["multiview_processor"];
    notComparableWith = ["tx", "rx", "tx_rx_kit", "matrix_with_rx_kit", "controller", "accessory", "cable"];
    leadEligibility = "default";
  }

  if (endpointRole === "unknown" && (sku.includes("-VW") || text.includes("video wall"))) {
    commercialPackageType = "standalone";
    endpointRole = "processor";
    productClass = "video_wall_processor";
    technologyFamily = "Video Wall";
    topology = "wall_processing";
    comparableClasses = ["video_wall_processor"];
    notComparableWith = ["tx", "rx", "tx_rx_kit", "matrix_with_rx_kit", "controller", "accessory", "cable"];
    leadEligibility = "default";
  }

  if (endpointRole === "unknown" && sku.startsWith("EX-")) {
    commercialPackageType = "standalone";
    endpointRole = "unknown";
    productClass = text.includes("usb") || text.includes("kvm") ? "usb_extender" : "hdbaset_extender";
    technologyFamily = text.includes("usb") || text.includes("kvm") ? "USB/KVM" : "HDBaseT";
    topology = "extension";
    comparableClasses = [productClass];
    notComparableWith = ["matrix_switcher", "matrix_with_rx_kit", "controller", "accessory", "cable"];
    leadEligibility = "conditional";
  }

  if (endpointRole === "unknown" && sku.startsWith("SW-")) {
    commercialPackageType = "standalone";
    endpointRole = "processor";
    productClass = text.includes("uc") || text.includes("conference") ? "uc_switcher" : "presentation_switcher";
    technologyFamily = "Presentation / UC";
    topology = "source_switching";
    comparableClasses = ["presentation_switcher", "uc_switcher"];
    notComparableWith = ["tx_rx_kit", "matrix_with_rx_kit", "controller", "accessory", "cable"];
    leadEligibility = "default";
  }

  if (endpointRole === "unknown" && sku.startsWith("CAM-")) {
    commercialPackageType = "standalone";
    endpointRole = "processor";
    productClass = "camera_bridge";
    technologyFamily = "Camera / NDI / USB bridge";
    topology = "camera_bridge";
    comparableClasses = ["camera_bridge"];
    notComparableWith = ["tx", "rx", "tx_rx_kit", "matrix_with_rx_kit", "controller", "accessory", "cable"];
    leadEligibility = "conditional";
  }

  if (endpointRole === "unknown") {
    warnings.push("Product classification incomplete. Reduce match confidence until product data is enriched.");
    hardBlockerTags.push("unknown_product_role");
  }

  return {
    sku,
    commercialPackageType,
    endpointRole,
    productClass,
    technologyFamily,
    topology,
    leadEligibility,
    comparableClasses: unique(comparableClasses),
    notComparableWith: unique(notComparableWith),
    warnings: unique(warnings),
    hardBlockerTags: unique(hardBlockerTags),
  };
}

export function gateDirectEquivalence(
  requested: ProductClassification,
  candidate: ProductClassification,
): EquivalenceGateResult {
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (candidate.leadEligibility === "never_lead" || candidate.leadEligibility === "accessory_only" || candidate.leadEligibility === "request_only") {
    blockers.push(`${candidate.sku} is ${candidate.leadEligibility} and cannot be a lead direct equivalent.`);
  }

  if (requested.endpointRole === "tx_rx_kit" && candidate.endpointRole !== "tx_rx_kit") {
    blockers.push("Requested product is a complete TX/RX kit; candidate is not a complete TX/RX kit.");
  }

  if (requested.endpointRole === "matrix_with_rx_kit" && candidate.endpointRole !== "matrix_with_rx_kit") {
    blockers.push("Requested product is a matrix kit with receivers; candidate is not a matrix kit with included receivers.");
  }

  if (requested.endpointRole === "tx" && candidate.endpointRole === "rx") {
    blockers.push("Requested product is TX/source-side; candidate is RX/display-side.");
  }

  if (requested.endpointRole === "rx" && candidate.endpointRole === "tx") {
    blockers.push("Requested product is RX/display-side; candidate is TX/source-side.");
  }

  if (!candidate.comparableClasses.includes(requested.productClass) && candidate.productClass !== requested.productClass) {
    blockers.push(`Product class mismatch: requested ${requested.productClass}, candidate ${candidate.productClass}.`);
  }

  const sameTechnologyFamily = requested.technologyFamily === candidate.technologyFamily;
  const hasBlockers = blockers.length > 0;

  if (hasBlockers && sameTechnologyFamily) {
    return {
      verdict: "NO_MATCH_RELATED",
      directEquivalentAllowed: false,
      relatedOnly: true,
      blockers: unique(blockers),
      warnings: unique([...warnings, "Same technology family, but hard blockers prevent direct-equivalent positioning."]),
    };
  }

  if (hasBlockers) {
    return {
      verdict: "NO_MATCH",
      directEquivalentAllowed: false,
      relatedOnly: false,
      blockers: unique(blockers),
      warnings: unique(warnings),
    };
  }

  if (requested.productClass === candidate.productClass && requested.endpointRole === candidate.endpointRole) {
    return {
      verdict: "GOOD_MATCH",
      directEquivalentAllowed: true,
      relatedOnly: false,
      blockers: [],
      warnings: unique(warnings),
    };
  }

  return {
    verdict: "PARTIAL_MATCH",
    directEquivalentAllowed: true,
    relatedOnly: false,
    blockers: [],
    warnings: unique([...warnings, "Product class is acceptable but not identical. Check detailed specification matrix before positioning."]),
  };
}
