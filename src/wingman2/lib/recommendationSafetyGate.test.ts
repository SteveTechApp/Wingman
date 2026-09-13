import { describe, expect, it } from "vitest";
import {
  filterSafeRecommendationCandidates,
  isRecommendationSkuRemoved,
  mergeRemovedRecommendationSkus,
  removeLineItemById,
} from "./recommendationSafetyGate";

const rx3 = {
  sku: "RX3-100",
  role: "receiver",
  pairedWith: ["SW-120-TX3"],
  compatibility: {
    hdBaseTGeneration: "HDBaseT-3.0",
    resolutionCompatible: true,
    usbCompatible: true,
    distanceCompatible: true,
  },
};

describe("recommendation safety", () => {
  it("blocks RX3-100 without a permitted pair", () => {
    expect(filterSafeRecommendationCandidates([{ ...rx3, pairedWith: [] }])).toEqual([]);
  });

  it("blocks RX3-100 without complete compatibility evidence", () => {
    expect(filterSafeRecommendationCandidates([{
      ...rx3,
      compatibility: { ...rx3.compatibility, usbCompatible: false },
    }])).toEqual([]);
  });

  it("allows RX3-100 with a permitted pair and complete evidence", () => {
    expect(filterSafeRecommendationCandidates([rx3])).toHaveLength(1);
  });

  it("does not expose dependency-only products in a generic pool", () => {
    expect(filterSafeRecommendationCandidates([{
      sku: "SUPPORT-ITEM",
      role: "dependency",
      dependencyOnly: true,
    }])).toEqual([]);
  });

  it("keeps an explicitly requested dependency available", () => {
    expect(filterSafeRecommendationCandidates([{
      sku: "SUPPORT-ITEM",
      role: "dependency",
      dependencyOnly: true,
    }], { explicitSkus: ["SUPPORT-ITEM"] })).toHaveLength(1);
  });

  it("enforces the requested role contract", () => {
    expect(filterSafeRecommendationCandidates([{
      sku: "TX-100",
      role: "transmitter",
    }], { requiredRole: "receiver" })).toEqual([]);
  });

  it("honours a user removal across recalculation", () => {
    const removed = mergeRemovedRecommendationSkus([], ["RX3-100"]);
    expect(isRecommendationSkuRemoved(removed, "rx3_100")).toBe(true);
    expect(filterSafeRecommendationCandidates([rx3], { removedSkus: removed })).toEqual([]);
  });

  it("removes a line item by stable id or SKU", () => {
    const items = [
      { id: "line-1", sku: "SW-120-TX3" },
      { id: "line-2", sku: "RX3-100" },
    ];
    expect(removeLineItemById(items, "line-2")).toEqual([items[0]]);
    expect(removeLineItemById(items, "RX3-100")).toEqual([items[0]]);
  });

  it("reads SKU and compatibility from a RecommendationDecision product", () => {
    const decision = {
      product: {
        sku: "RX3-100",
        role: "receiver",
        pairedWith: ["SW-120-TX3"],
        compatibility: {
          hdBaseTGeneration: "HDBaseT-3.0",
          resolutionCompatible: true,
          usbCompatible: true,
          distanceCompatible: true,
        },
      },
    };
    expect(filterSafeRecommendationCandidates([decision])).toHaveLength(1);
  });});