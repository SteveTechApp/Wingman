import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { StoredDiscoveryBrief, StoredProject } from "../projects";
import { clearProductIntelligenceIndexCache } from "../../lib/productIntelligenceIndexCache";
import { compileRecommendedDesignProject } from "./compileRecommendedDesignProject";

const catalog = JSON.parse(readFileSync("public/product-intelligence-index.json", "utf8"));
beforeAll(() => { vi.stubGlobal("fetch", vi.fn(async (request: string | URL | Request) => String(request).includes("/api/product-intelligence") ? new Response(JSON.stringify({ records: [] }), { status: 200 }) : new Response(JSON.stringify(catalog), { status: 200 }))); clearProductIntelligenceIndexCache(); });

describe("blind requirement to Design Project graph", () => {
  it("selects a system without receiving a preferred product", async () => {
    const brief: StoredDiscoveryBrief = { roomModel: { application: "single HDMI source to one remote display", applicationType: "single HDMI source to one remote display", customerWording: "Extend one 4K laptop to a display 55 metres away", sourceCount: 1, displayCount: 1, displayBehaviour: "same source", resolutionRequirement: "4K60", longestRun: "55m endpoint route", cableRun: "55m endpoint route", audioPath: "display audio", controlNeeds: "none" }, inference: {} };
    const now = "2026-09-14T12:00:00.000Z";
    const project: StoredProject = { id: "blind-extension", name: "Remote display", owner: "Sales", stage: "Discovery", status: "alternative", updated: now, createdAt: now, updatedAt: now, resumeTo: "/wingman/discovery" };
    const graph = await compileRecommendedDesignProject(project, brief, now);
    expect(graph.decision.architecture).toBe("extension");
    expect(graph.decision.productOverviews.map((item) => [item.sku, item.quantity])).toEqual([["EX-100-G2", 1]]);
    expect(graph.stages.find((stage) => stage.id === "recommendation")?.status).toBe("complete");
    expect(graph.publication.canIssue).toBe(false);
  });
});
