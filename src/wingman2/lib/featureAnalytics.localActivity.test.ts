import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildAnalyticsDashboard } from "./analyticsDashboard";
import { trackExport, trackFeatureEvent, trackJourneyEvent, trackSearch } from "./featureAnalytics";

describe("local activity from feature events", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("counts named route opens, exports and searches without creating empty journey rows", () => {
    trackFeatureEvent("feature_open", "dashboard");
    trackFeatureEvent("feature_open", "compare");
    trackFeatureEvent("feature_open", "compare");
    trackExport("responsePack", "pdf");
    trackSearch("products", 4);
    trackJourneyEvent("opportunity_started", { step: 1 });

    const usage = buildAnalyticsDashboard().featureUsage;
    expect(usage.find((item) => item.feature === "compare")).toMatchObject({ opens: 2, exports: 0, searches: 0 });
    expect(usage.find((item) => item.feature === "dashboard")).toMatchObject({ opens: 1 });
    expect(usage.find((item) => item.feature === "responsePack")).toMatchObject({ exports: 1 });
    expect(usage.find((item) => item.feature === "products")).toMatchObject({ searches: 1 });
    expect(usage.some((item) => item.feature === "opportunity_started")).toBe(false);
  });

  it("keeps browser-local counts after the telemetry session cap", () => {
    for (let index = 0; index < 55; index += 1) trackFeatureEvent("feature_open", "discovery");
    expect(buildAnalyticsDashboard().featureUsage.find((item) => item.feature === "discovery")?.opens).toBe(55);
  });
});
