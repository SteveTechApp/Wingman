import governedTechnicalProfiles from "../../../data/governance/wyrestorm-technical-profiles.json";
import type { StoredProductSelection, StoredRecommendationFeedback } from "../data/projectStore";
import { resolveProductLifecycle } from "./wyrestormProductLifecycle";
import { buildProductChainAssurance } from "./productChainValidation";
import { buildRegionalSkuAssurance } from "./regionalSkuGovernance";
import { buildPowerBudgetAssurance } from "./powerBudget";
import { buildFeedbackInformedGuidance } from "./feedbackInformedGuidance";
import { buildNetworkInfrastructureAssurance } from "./networkInfrastructureAssurance";

type UnknownRecord = Record<string, unknown>;

export type ProductAssuranceStatus =
  | "verified"
  | "verified-with-warning"
  | "review-required"
  | "missing";

export type ProductAssurance = {
  sku: string;
  known: boolean;
  active: boolean;
  specifiable: boolean;
  lifecycleStatus: string;
  catalogVisibility: string;
  technicalStatus: ProductAssuranceStatus;
  customerReady: boolean;
  warnings: string[];
};

export type DesignAssuranceSeverity = "blocker" | "warning" | "information";

export type DesignAssuranceItem = {
  id: string;
  severity: DesignAssuranceSeverity;
  domain:
    | "product"
    | "signal"
    | "usb"
    | "audio"
    | "control"
    | "network"
    | "power"
    | "physical"
    | "security"
    | "resilience"
    | "accessibility";
  message: string;
  sku?: string;
};

export type DesignAssuranceLedger = {
  products: ProductAssurance[];
  items: DesignAssuranceItem[];
  blockers: DesignAssuranceItem[];
  warnings: DesignAssuranceItem[];
  customerReady: boolean;
};

type AssuranceContext = {
  products: StoredProductSelection[];
  requirementText?: string;
  discoveryPercent?: number;
  /** The captured project topology (routes, distances, transports). */
  topology?: unknown;
  /** The rep's market/region from the Wingman profile. */
  region?: string;
  /** Feedback entries from other projects, used for the learning loop. */
  feedback?: StoredRecommendationFeedback[];
};

function record(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as UnknownRecord
    : {};
}

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function normaliseSku(value: unknown): string {
  return text(value).toUpperCase().replace(/[^A-Z0-9]+/g, "");
}

const technicalBySku = new Map(
  ((record(governedTechnicalProfiles).profiles as UnknownRecord[]) ?? [])
    .map((profile) => [normaliseSku(profile.sku), profile] as const)
    .filter(([sku]) => Boolean(sku)),
);

function lifecycleIsActive(value: string): boolean {
  const status = value.toLowerCase();
  return !status || ["active", "current", "new", "launch"].includes(status);
}

export function getProductAssurance(sku: string): ProductAssurance {
  const key = normaliseSku(sku);
  const profile = technicalBySku.get(key);
  const lifecycle = resolveProductLifecycle(sku);
  const lifecycleStatus = lifecycle.status;
  const known = lifecycleStatus !== "unlisted";
  const active = lifecycle.recommendable;
  const technicalStatus = (
    ["verified", "verified-with-warning", "review-required"].includes(text(profile?.status))
      ? text(profile?.status)
      : "missing"
  ) as ProductAssuranceStatus;
  const warnings = [
    ...(Array.isArray(profile?.warnings) ? profile.warnings.map(text).filter(Boolean) : []),
  ];

  if (!known) warnings.unshift("SKU is not present in the governed active business lists.");
  if (!active && known) warnings.unshift(lifecycle.note);
  if (technicalStatus === "review-required") warnings.unshift("Technical profile still requires human review.");
  if (technicalStatus === "missing") warnings.unshift("No governed technical profile is available.");

  return {
    sku: text(sku).toUpperCase(),
    known,
    active,
    specifiable: active,
    lifecycleStatus: lifecycleStatus || "unknown",
    catalogVisibility: lifecycle.adminOverride?.visibility || "governed-business-list",
    technicalStatus,
    customerReady: active && technicalStatus !== "missing" && technicalStatus !== "review-required",
    warnings: Array.from(new Set(warnings)),
  };
}

function verticalAssuranceItems(requirementText: string): DesignAssuranceItem[] {
  const lower = requirementText.toLowerCase();
  const items: DesignAssuranceItem[] = [];
  const add = (id: string, domain: DesignAssuranceItem["domain"], message: string) => {
    items.push({ id, severity: "warning", domain, message });
  };

  if (/government|public sector|secure|security|blue[- ]light|police|fire|ambulance|command|control room/.test(lower)) {
    add("vertical-secure-network", "security", "Confirm network isolation, account permissions, logging, remote-access policy and product security approval.");
    add("vertical-operational-resilience", "resilience", "Confirm failover behaviour, spare strategy, recovery time and the effect of each single point of failure.");
  }
  if (/school|college|university|education|teaching|lecture/.test(lower)) {
    add("vertical-education-accessibility", "accessibility", "Confirm assistive-listening, captioning, accessible controls and safeguarding/privacy requirements.");
  }
  if (/hospitality|hotel|casino|gaming|sports bar|stadium|stadia|venue|entertainment/.test(lower)) {
    add("vertical-venue-continuity", "resilience", "Confirm operating hours, rapid recovery, content-protection, control simplicity and critical-screen fallback.");
  }

  return items;
}

export function buildDesignAssuranceLedger(context: AssuranceContext): DesignAssuranceLedger {
  const products = context.products.map((product) => getProductAssurance(product.sku));
  const items: DesignAssuranceItem[] = [];

  products.forEach((product) => {
    if (!product.known || !product.specifiable) {
      items.push({
        id: `product-lifecycle-${normaliseSku(product.sku)}`,
        severity: "blocker",
        domain: "product",
        sku: product.sku,
        message: `${product.sku} is not an active, specifiable canonical product.`,
      });
    }
    if (product.technicalStatus === "missing" || product.technicalStatus === "review-required") {
      items.push({
        id: `product-technical-${normaliseSku(product.sku)}`,
        severity: "blocker",
        domain: "product",
        sku: product.sku,
        message: `${product.sku} does not have a verified governed technical profile.`,
      });
    }
    product.warnings.forEach((message, index) => {
      if (product.customerReady) {
        items.push({
          id: `product-warning-${normaliseSku(product.sku)}-${index}`,
          severity: "warning",
          domain: "product",
          sku: product.sku,
          message: `${product.sku}: ${message}`,
        });
      }
    });
  });

  if (!products.length) {
    items.push({
      id: "product-none-selected",
      severity: "blocker",
      domain: "product",
      message: "No core WyreStorm product is selected.",
    });
  }
  if ((context.discoveryPercent ?? 0) < 100) {
    items.push({
      id: "discovery-incomplete",
      severity: "blocker",
      domain: "signal",
      message: "Discovery is incomplete; unresolved requirements can change the architecture or product selection.",
    });
  }

  const requirementText = context.requirementText ?? "";
  const lower = requirementText.toLowerCase();
  const selectedSkus = context.products.map((product) => product.sku.toUpperCase());
  const selectedProfiles = selectedSkus
    .map((sku) => technicalBySku.get(normaliseSku(sku)))
    .filter((profile): profile is UnknownRecord => Boolean(profile));
  const transportText = selectedProfiles
    .flatMap((profile) => Array.isArray(profile.transport) ? profile.transport : [])
    .map(text)
    .join(" ")
    .toLowerCase();
  const dependencyText = selectedProfiles
    .flatMap((profile) => Array.isArray(profile.dependencies) ? profile.dependencies : [])
    .map(text)
    .join(" ")
    .toLowerCase();
  const networkHdSeries = new Set(
    selectedSkus
      .map((sku) => sku.match(/^NHD-(1(?:20|24|28|50)|5(?:00|10)|6(?:00|10))/)?.[1]?.[0])
      .filter(Boolean),
  );

  if (networkHdSeries.size > 1) {
    items.push({
      id: "networkhd-mixed-series",
      severity: "blocker",
      domain: "network",
      message: "NetworkHD series are mixed. Do not assume cross-series interoperability; validate the architecture explicitly.",
    });
  }
  if (selectedSkus.some((sku) => sku.startsWith("NHD-")) && !selectedSkus.some((sku) => sku.includes("NHD-CTL"))) {
    items.push({
      id: "networkhd-controller",
      severity: "blocker",
      domain: "control",
      message: "A NetworkHD endpoint is selected without a governed NetworkHD controller in the BOM.",
    });
  }
  if (/\busb\b|camera|touch|kvm|byom/.test(lower) && !/usb/.test(transportText + " " + dependencyText)) {
    items.push({
      id: "usb-path-unproven",
      severity: "blocker",
      domain: "usb",
      message: "The requirement includes USB, but the selected governed profiles do not prove a complete USB path and host/device ownership.",
    });
  }
  if (/speaker|amplif|room audio|reinforcement|dante|aes67/.test(lower) && !/audio|dante|aes67/.test(transportText)) {
    items.push({
      id: "audio-path-unproven",
      severity: "blocker",
      domain: "audio",
      message: "The room requires an audio path that is not proven by the selected governed profiles.",
    });
  }
  if (/hdbaset|hdbt|extender|long run/.test(lower) && !/hdbaset|hdbt/.test(transportText)) {
    items.push({
      id: "hdbaset-path-unproven",
      severity: "blocker",
      domain: "signal",
      message: "An HDBaseT extension requirement is present, but the governed product transport does not prove the path.",
    });
  }
  if (/poh|poe|remote power|power over/.test(lower) && !/poh|poe|power/.test(transportText + " " + dependencyText)) {
    items.push({
      id: "remote-power-unproven",
      severity: "blocker",
      domain: "power",
      message: "Remote power is required, but its standard, direction and budget are not proven by the selected profiles.",
    });
  }

  // Cross-product chain validation: TX/RX pairing, NetworkHD generation
  // mixing, USB generation mismatch, signal-capability and distance-vs-reach
  // checks. This is the "what do the selected products do to each other"
  // layer that single-product profiles cannot see.
  items.push(...buildProductChainAssurance({
    products: context.products,
    topology: context.topology,
    requirementText: context.requirementText,
  }));

  // Regional SKU gating: family/range base SKUs must become real regional
  // variants, and the variant must match the rep's market.
  items.push(...buildRegionalSkuAssurance({
    products: context.products,
    region: context.region,
  }));

  // Power budget: proven consumption figures, silent profiles, and remote
  // power (PoE/PoH) proof.
  items.push(...buildPowerBudgetAssurance({
    products: context.products,
    requirementText: context.requirementText,
  }));

  // Feedback loop: surface what the field previously said about each SKU.
  items.push(...buildFeedbackInformedGuidance({
    products: context.products,
    feedback: context.feedback,
  }));

  // Network infrastructure: AV-over-IP endpoints make the customer's network
  // part of the signal path (IGMP, VLAN, bandwidth, 10GbE for NetworkHD 600).
  items.push(...buildNetworkInfrastructureAssurance({
    products: context.products,
    topology: context.topology,
    requirementText: context.requirementText,
  }));

  items.push(...verticalAssuranceItems(context.requirementText ?? ""));
  const deduped = Array.from(new Map(items.map((item) => [item.id, item])).values());
  const blockers = deduped.filter((item) => item.severity === "blocker");
  const warnings = deduped.filter((item) => item.severity === "warning");

  return {
    products,
    items: deduped,
    blockers,
    warnings,
    customerReady: blockers.length === 0,
  };
}

export function productCanAppearInRecommendation(value: {
  sku?: unknown;
  lifecycleStatus?: unknown;
  doNotSpec?: unknown;
  catalogVisibility?: unknown;
}): boolean {
  const lifecycleStatus = text(value.lifecycleStatus);
  const visibility = text(value.catalogVisibility).toLowerCase();
  return Boolean(value.sku) &&
    lifecycleIsActive(lifecycleStatus) &&
    value.doNotSpec !== true &&
    !["hidden", "request-only"].includes(visibility);
}
