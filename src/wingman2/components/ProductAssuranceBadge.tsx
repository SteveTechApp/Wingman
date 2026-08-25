/**
 * ProductAssuranceBadge — Shows per-SKU assurance status on product cards.
 *
 * Displays blockers and warnings directly on each product card so reps can
 * see issues at a glance without expanding details.
 */
import { AlertTriangle, CheckCircle2, ShieldAlert, ShieldCheck, XCircle } from "lucide-react";
import type { DesignAssuranceItem, ProductAssurance } from "../lib/productAssurance";

// ─── Types ────────────────────────────────────────────────────────────────────

type ProductAssuranceBadgeProps = {
  /** The SKU to show assurance for */
  sku: string;
  /** Per-product assurance data */
  productAssurance?: ProductAssurance;
  /** All assurance items (will be filtered by SKU) */
  assuranceItems?: DesignAssuranceItem[];
  /** Whether to show detailed messages or just badges */
  compact?: boolean;
  /** Maximum number of warnings to show */
  maxWarnings?: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getAssuranceStatus(
  productAssurance?: ProductAssurance,
  skuItems: DesignAssuranceItem[] = [],
): "ready" | "warning" | "blocker" | "unknown" {
  const blockers = skuItems.filter((item) => item.severity === "blocker");
  const warnings = skuItems.filter((item) => item.severity === "warning");

  if (blockers.length > 0) return "blocker";
  if (warnings.length > 0) return "warning";
  if (productAssurance?.customerReady) return "ready";
  if (productAssurance?.technicalStatus === "missing") return "blocker";
  if (productAssurance?.technicalStatus === "review-required") return "warning";
  if (!productAssurance?.known) return "blocker";
  return "ready";
}

function getStatusIcon(status: "ready" | "warning" | "blocker" | "unknown") {
  switch (status) {
    case "ready":
      return <CheckCircle2 className="h-4 w-4" aria-hidden="true" />;
    case "warning":
      return <ShieldAlert className="h-4 w-4" aria-hidden="true" />;
    case "blocker":
      return <XCircle className="h-4 w-4" aria-hidden="true" />;
    case "unknown":
      return <ShieldCheck className="h-4 w-4" aria-hidden="true" />;
  }
}

function getStatusLabel(status: "ready" | "warning" | "blocker" | "unknown"): string {
  switch (status) {
    case "ready":
      return "Ready to quote";
    case "warning":
      return "Review required";
    case "blocker":
      return "Blocker";
    case "unknown":
      return "Unknown status";
  }
}

function getStatusColor(status: "ready" | "warning" | "blocker" | "unknown"): string {
  switch (status) {
    case "ready":
      return "wm-assurance-badge--ready";
    case "warning":
      return "wm-assurance-badge--warning";
    case "blocker":
      return "wm-assurance-badge--blocker";
    case "unknown":
      return "wm-assurance-badge--unknown";
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProductAssuranceBadge({
  sku,
  productAssurance,
  assuranceItems = [],
  compact = false,
  maxWarnings = 2,
}: ProductAssuranceBadgeProps) {
  // Filter assurance items for this SKU
  const skuItems = assuranceItems.filter(
    (item) => item.sku?.toUpperCase() === sku.toUpperCase(),
  );

  const blockers = skuItems.filter((item) => item.severity === "blocker");
  const warnings = skuItems.filter((item) => item.severity === "warning");
  const status = getAssuranceStatus(productAssurance, skuItems);

  // Don't render if no assurance data and status is ready
  if (status === "ready" && blockers.length === 0 && warnings.length === 0) {
    return null;
  }

  return (
    <div className={`wm-assurance-badge ${getStatusColor(status)}`} data-assurance-status={status}>
      {/* Status indicator */}
      <div className="wm-assurance-badge__status">
        {getStatusIcon(status)}
        <span className="wm-assurance-badge__label">{getStatusLabel(status)}</span>
      </div>

      {/* Blockers */}
      {blockers.length > 0 && (
        <div className="wm-assurance-badge__blockers">
          <AlertTriangle className="h-3 w-3" aria-hidden="true" />
          <span className="wm-assurance-badge__count">
            {blockers.length} blocker{blockers.length === 1 ? "" : "s"}
          </span>
          {!compact && (
            <ul className="wm-assurance-badge__list">
              {blockers.slice(0, 2).map((item) => (
                <li key={item.id} className="wm-assurance-badge__item">
                  {item.message}
                </li>
              ))}
              {blockers.length > 2 && (
                <li className="wm-assurance-badge__more">
                  +{blockers.length - 2} more
                </li>
              )}
            </ul>
          )}
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="wm-assurance-badge__warnings">
          <AlertTriangle className="h-3 w-3" aria-hidden="true" />
          <span className="wm-assurance-badge__count">
            {warnings.length} warning{warnings.length === 1 ? "" : "s"}
          </span>
          {!compact && (
            <ul className="wm-assurance-badge__list">
              {warnings.slice(0, maxWarnings).map((item) => (
                <li key={item.id} className="wm-assurance-badge__item">
                  {item.message}
                </li>
              ))}
              {warnings.length > maxWarnings && (
                <li className="wm-assurance-badge__more">
                  +{warnings.length - maxWarnings} more
                </li>
              )}
            </ul>
          )}
        </div>
      )}

      {/* Technical status */}
      {productAssurance && productAssurance.technicalStatus !== "verified" && (
        <div className="wm-assurance-badge__technical">
          <span className="wm-assurance-badge__technical-status">
            {productAssurance.technicalStatus === "verified-with-warning"
              ? "Verified with warnings"
              : productAssurance.technicalStatus === "review-required"
                ? "Awaiting human review"
                : "No governed profile"}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Inline Badge (smaller version for tight spaces) ─────────────────────────

export function ProductAssuranceInlineBadge({
  sku,
  productAssurance,
  assuranceItems = [],
}: {
  sku: string;
  productAssurance?: ProductAssurance;
  assuranceItems?: DesignAssuranceItem[];
}) {
  const skuItems = assuranceItems.filter(
    (item) => item.sku?.toUpperCase() === sku.toUpperCase(),
  );

  const blockers = skuItems.filter((item) => item.severity === "blocker");
  const warnings = skuItems.filter((item) => item.severity === "warning");
  const status = getAssuranceStatus(productAssurance, skuItems);

  if (status === "ready" && blockers.length === 0 && warnings.length === 0) {
    return null;
  }

  return (
    <span className={`wm-assurance-inline-badge wm-assurance-inline-badge--${status}`}>
      {getStatusIcon(status)}
      {blockers.length > 0 && (
        <span className="wm-assurance-inline-badge__count wm-assurance-inline-badge__count--blocker">
          {blockers.length}
        </span>
      )}
      {warnings.length > 0 && (
        <span className="wm-assurance-inline-badge__count wm-assurance-inline-badge__count--warning">
          {warnings.length}
        </span>
      )}
    </span>
  );
}

export default ProductAssuranceBadge;
