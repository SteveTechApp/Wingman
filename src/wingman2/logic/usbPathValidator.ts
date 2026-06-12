import {
  USB_GLOBAL_RULES,
  type UsbProductUsbRule,
  type UsbStandard,
  type UsbTierRule,
  findUsbProductRule,
  normaliseUsbSku,
} from "../data/usbTierRules";

export type UsbValidationStatus = "safe" | "test-required" | "invalid" | "technical-review";

export interface UsbPathComponentInput {
  sku: string;
  label?: string;
  path?: string;
  hostType?: string;
  outputPath?: string;
  usbStandard?: UsbStandard;
  hdbt?: boolean;
  downstreamHubCount?: number;
  builtInHubCount?: number;
}

export interface ValidateUsbPathInput {
  path: readonly UsbPathComponentInput[];
  requestedUsbStandard?: UsbStandard;
  includesHdBaseT?: boolean;
  downstreamHubCount?: number;
  strictWyreStormUsbSupport?: boolean;
  enhancedCascading?: boolean;
}

export interface UsbPathComponentResult {
  sku: string;
  label: string;
  matched: boolean;
  productRule?: UsbProductUsbRule;
  tierRule?: UsbTierRule;
  tiers: number;
  counted: boolean;
  notes: string[];
}

export interface UsbPathValidationResult {
  status: UsbValidationStatus;
  usbStandardUsed: UsbStandard;
  totalTiers: number;
  maxAllowedTiers: number;
  downstreamHubCount: number;
  downstreamHubLimit?: number;
  enhancedCascadingApplied: boolean;
  warnings: string[];
  blockers: string[];
  components: UsbPathComponentResult[];
  recommendationImpact: string;
}

const USB_RELEVANT_REQUIREMENT_TERMS = [
  "usb",
  "camera",
  "webcam",
  "ptz",
  "microphone",
  "speakerphone",
  "touch",
  "interactive",
  "ifpd",
  "kvm",
  "byod",
  "byom",
  "teams",
  "zoom",
  "conferencing",
  "capture",
  "room pc",
] as const;

export function usbValidationIsRequired(requirementText: string): boolean {
  const text = requirementText.toLowerCase();

  return USB_RELEVANT_REQUIREMENT_TERMS.some((term) => text.includes(term));
}

export function determineEffectiveUsbStandard(input: ValidateUsbPathInput): UsbStandard {
  if (input.requestedUsbStandard === "USB 1.1") {
    return "USB 1.1";
  }

  const hasUsb11Component = input.path.some((component) => component.usbStandard === "USB 1.1");
  if (hasUsb11Component) {
    return "USB 1.1";
  }

  if (input.includesHdBaseT) {
    return "USB 2.0";
  }

  const hasHdbtComponent = input.path.some((component) => {
    if (component.hdbt) {
      return true;
    }

    const text = `${component.path ?? ""} ${component.outputPath ?? ""}`.toLowerCase();
    return text.includes("hdbt") || text.includes("hdbaset");
  });

  if (hasHdbtComponent) {
    return "USB 2.0";
  }

  if (input.requestedUsbStandard === "USB 2.0") {
    return "USB 2.0";
  }

  const hasUsb2Component = input.path.some((component) => component.usbStandard === "USB 2.0");
  if (hasUsb2Component) {
    return "USB 2.0";
  }

  if (input.requestedUsbStandard === "USB 3.0") {
    return "USB 3.0";
  }

  return "USB 2.0";
}

function textScore(candidate: string | undefined, target: string | undefined): number {
  if (!candidate || !target) {
    return 0;
  }

  const cleanCandidate = candidate.toLowerCase();
  const cleanTarget = target.toLowerCase();

  if (cleanCandidate === cleanTarget) {
    return 10;
  }

  if (cleanCandidate.includes(cleanTarget)) {
    return 6;
  }

  if (cleanTarget.includes(cleanCandidate)) {
    return 4;
  }

  return 0;
}

function standardScore(rule: UsbTierRule, standard: UsbStandard): number {
  if (rule.usbStandard === standard) {
    return 20;
  }

  if (rule.usbStandard === "USB 3.0/2.0" && (standard === "USB 3.0" || standard === "USB 2.0")) {
    return 12;
  }

  return 0;
}

function scoreTierRule(rule: UsbTierRule, component: UsbPathComponentInput, standard: UsbStandard): number {
  const score = standardScore(rule, standard);

  if (score <= 0) {
    return 0;
  }

  return score
    + textScore(rule.path, component.path)
    + textScore(rule.hostType, component.hostType)
    + textScore(rule.outputPath, component.outputPath);
}

function selectTierRule(productRule: UsbProductUsbRule, component: UsbPathComponentInput, standard: UsbStandard): UsbTierRule | undefined {
  let bestRule: UsbTierRule | undefined;
  let bestScore = 0;

  for (const rule of productRule.tierRules) {
    const score = scoreTierRule(rule, component, standard);

    if (score > bestScore) {
      bestRule = rule;
      bestScore = score;
    }
  }

  return bestRule;
}

function getRecommendationImpact(status: UsbValidationStatus): string {
  const messages: Record<UsbValidationStatus, string> = {
    safe: "USB path appears valid against the stored WyreStorm USB tier and hub rules.",
    "test-required": "USB path reaches the supported tier limit. Compatibility testing is strongly recommended before quoting or installation.",
    invalid: "USB path exceeds a supported tier or hub rule. Redesign the USB transport path before recommending this solution.",
    "technical-review": "USB path needs technical review because one or more products or path choices have special handling rules.",
  };

  return messages[status];
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

export function validateUsbPath(input: ValidateUsbPathInput): UsbPathValidationResult {
  const usbStandardUsed = determineEffectiveUsbStandard(input);
  const warnings: string[] = [];
  const blockers: string[] = [];
  const components: UsbPathComponentResult[] = [];

  if (input.includesHdBaseT || input.path.some((component) => component.hdbt || `${component.path ?? ""} ${component.outputPath ?? ""}`.toLowerCase().includes("hdbt"))) {
    warnings.push("HDBaseT path detected. USB calculation has been forced to USB 2.0.");
  }

  let totalTiers = 0;
  let downstreamHubLimit: number | undefined;
  let enhancedCascadingApplied = false;
  let skipDownstreamTierCounting = false;
  let technicalReviewRequired = false;

  for (const component of input.path) {
    const productRule = findUsbProductRule(component.sku);
    const label = component.label ?? component.sku;
    const componentNotes: string[] = [];

    if (!productRule) {
      const unknownMessage = `${component.sku} is not in the USB rules table. Confirm whether this product supports USB transport.`;

      if (input.strictWyreStormUsbSupport) {
        blockers.push(unknownMessage);
      }

      if (!input.strictWyreStormUsbSupport) {
        warnings.push(unknownMessage);
      }

      components.push({
        sku: normaliseUsbSku(component.sku),
        label,
        matched: false,
        tiers: 0,
        counted: false,
        notes: [unknownMessage],
      });

      continue;
    }

    if (!productRule.supportsUsb) {
      blockers.push(`${component.sku} is marked as not supporting USB transport.`);
    }

    const tierRule = selectTierRule(productRule, component, usbStandardUsed);

    if (!tierRule) {
      const noPathMessage = `${component.sku} supports USB, but no tier rule matched ${usbStandardUsed} for this path.`;
      warnings.push(noPathMessage);

      components.push({
        sku: normaliseUsbSku(component.sku),
        label,
        matched: true,
        productRule,
        tiers: 0,
        counted: false,
        notes: [noPathMessage],
      });

      continue;
    }

    if (productRule.technicalReviewRequired) {
      technicalReviewRequired = true;
      warnings.push(`${component.sku} has complex USB handling. Confirm the final USB path with WyreStorm technical support.`);
    }

    if (productRule.noAdditionalHubsRecommended) {
      warnings.push(`${component.sku} has a high built-in tier count. Additional hubs or extenders are not recommended.`);
    }

    if (tierRule.maxDownstreamHubs !== undefined) {
      downstreamHubLimit = downstreamHubLimit === undefined
        ? tierRule.maxDownstreamHubs
        : Math.min(downstreamHubLimit, tierRule.maxDownstreamHubs);
    }

    let counted = true;
    let tiers = tierRule.tiers;

    if (skipDownstreamTierCounting) {
      counted = false;
      tiers = 0;
      componentNotes.push("Not counted because enhanced cascading is already active upstream.");
    }

    if (counted) {
      totalTiers += tiers;
    }

    if (input.enhancedCascading && (productRule.enhancedCascading || tierRule.enhancedCascading)) {
      enhancedCascadingApplied = true;
      skipDownstreamTierCounting = true;
      componentNotes.push("Enhanced cascading active from this point; downstream tiers are not counted.");
    }

    components.push({
      sku: normaliseUsbSku(component.sku),
      label,
      matched: true,
      productRule,
      tierRule,
      tiers,
      counted,
      notes: unique([
        ...componentNotes,
        ...(productRule.notes ?? []),
        ...(tierRule.notes ?? []),
      ]),
    });
  }

  const downstreamHubCount = input.downstreamHubCount
    ?? input.path.reduce((total, component) => total + (component.downstreamHubCount ?? 0) + (component.builtInHubCount ?? 0), 0);

  if (totalTiers > USB_GLOBAL_RULES.maxStandardUsbTiers) {
    blockers.push(`USB tier count is ${totalTiers}. Maximum supported tier count is ${USB_GLOBAL_RULES.maxStandardUsbTiers}.`);
  }

  if (downstreamHubLimit !== undefined && downstreamHubCount > downstreamHubLimit) {
    blockers.push(`Downstream hub count is ${downstreamHubCount}. This path allows a maximum of ${downstreamHubLimit}.`);
  }

  let status: UsbValidationStatus = "safe";

  if (technicalReviewRequired) {
    status = "technical-review";
  }

  if (totalTiers === USB_GLOBAL_RULES.testRecommendedAtTierCount && blockers.length === 0) {
    status = "test-required";
  }

  if (blockers.length > 0) {
    status = "invalid";
  }

  return {
    status,
    usbStandardUsed,
    totalTiers,
    maxAllowedTiers: USB_GLOBAL_RULES.maxStandardUsbTiers,
    downstreamHubCount,
    downstreamHubLimit,
    enhancedCascadingApplied,
    warnings: unique(warnings),
    blockers: unique(blockers),
    components,
    recommendationImpact: getRecommendationImpact(status),
  };
}