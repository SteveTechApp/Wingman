import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  CompetitorLossChart,
  FeatureUsageChart,
  ProductQuoteChart,
  WinRateChart,
  WinRatePieChart,
  WinRateTrendChart,
} from "./AnalyticsCharts";

/**
 * The charts are drawn as SVG in this repo rather than by a charting library, so
 * these specs hold the geometry that says each shape is the one it claims: the
 * bar counts follow the categories and series, the stacked bars keep their parts,
 * the donut keeps one slice per outcome, and the rule that colours a product bar
 * by its win rate is read off the fill rather than assumed.
 *
 * They render at the fallback width because jsdom has no `ResizeObserver`; that
 * is the same path an old webview takes, so it is worth drawing in a test.
 */

const featureUsage = [
  { feature: "Compare Boardroom", opens: 9, exports: 2, searches: 1, lastUsed: "2026-10-28T09:00:00.000Z" },
  { feature: "Template Builder", opens: 4, exports: 0, searches: 3, lastUsed: "2026-10-28T09:00:00.000Z" },
];

const winRates = [
  { category: "Proposal", total: 4, won: 3, lost: 1, deferred: 0, winRate: 75 },
  { category: "Discovery", total: 3, won: 1, lost: 1, deferred: 1, winRate: 33 },
];

const productQuotes = [
  { sku: "SKU-100", name: "Display 1", quoteCount: 6, lastQuoted: "2026-10-28T09:00:00.000Z", winRate: 80 },
  { sku: "SKU-200", name: "Display 2", quoteCount: 4, lastQuoted: "2026-10-28T09:00:00.000Z", winRate: 50 },
  { sku: "SKU-300", name: "Display 3", quoteCount: 2, lastQuoted: "2026-10-28T09:00:00.000Z", winRate: 10 },
];

const competitorLosses = [
  { brand: "Crestron", lossCount: 3, winCount: 1, whySnippets: [] },
  { brand: "Extron", lossCount: 2, winCount: 2, whySnippets: [] },
];

/** Bars carry the 3px corner; the full-band hover targets are plain rects. */
function bars(container: HTMLElement) {
  return [...container.querySelectorAll('rect[rx="3"]')] as SVGRectElement[];
}

describe("AnalyticsCharts", () => {
  it("draws one bar per category and series in the feature usage chart", () => {
    const { container, getByText } = render(<FeatureUsageChart data={featureUsage} />);
    expect(bars(container)).toHaveLength(featureUsage.length * 3);
    expect(bars(container).map((bar) => bar.getAttribute("fill"))).toEqual([
      "#06b6d4", "#3b82f6", "#8b5cf6",
      "#06b6d4", "#3b82f6", "#8b5cf6",
    ]);
    for (const label of ["Opens", "Exports", "Searches"]) expect(getByText(label)).toBeTruthy();
    // The tick label is shortened; the accessible name keeps the whole feature.
    expect(container.querySelector("svg")?.getAttribute("aria-label")).toContain("Compare Boardroom");
    expect(container.querySelectorAll("svg text")).toContainEqual(
      expect.objectContaining({ textContent: "Compare Boardro…" }),
    );
  });

  it("names the category and every series in the tooltip a bar raises", () => {
    const { container } = render(<FeatureUsageChart data={featureUsage} />);
    const band = container.querySelector('rect[fill="transparent"]');
    expect(band).toBeTruthy();
    fireEvent.mouseEnter(band as SVGRectElement);
    // The custom tooltip markup the Recharts version rendered, unchanged.
    expect(container.querySelector(".wm-analytics-chart-tooltip__label")?.textContent).toBe("Compare Boardroom");
    const rows = [...container.querySelectorAll(".wm-analytics-chart-tooltip__row")];
    expect(rows.map((row) => [...row.querySelectorAll("span")].map((span) => span.textContent))).toEqual([
      ["", "Opens", "9"],
      ["", "Exports", "2"],
      ["", "Searches", "1"],
    ]);
    // Each reading is swatched by its series' tone, so the palette stays in CSS.
    expect(rows[0].querySelector(".wm-analytics-chart-legend__dot--aqua")).toBeTruthy();
  });

  it("writes no inline style, so a chart's colours and position come from the stylesheet", () => {
    const { container } = render(
      <>
        <FeatureUsageChart data={featureUsage} />
        <WinRateChart data={winRates} />
        <WinRatePieChart data={winRates} />
        <WinRateTrendChart data={winRates} />
        <ProductQuoteChart data={productQuotes} />
      </>
    );
    expect(container.querySelectorAll("[style]")).toHaveLength(0);
    const band = container.querySelector('rect[fill="transparent"]');
    fireEvent.mouseEnter(band as SVGRectElement);
    expect(container.querySelector(".wm-analytics-chart-tooltip")).toBeTruthy();
    expect(container.querySelectorAll("[style]")).toHaveLength(0);
  });

  it("stacks the win rate parts and leaves out the parts that are zero", () => {
    const { container } = render(<WinRateChart data={winRates} />);
    // Every segment of a stacked bar is a plain rect, so they are counted by their
    // palette fill rather than by the grouped bars' rounded corner.
    const segments = [...container.querySelectorAll("rect")]
      .filter((rect) => (rect.getAttribute("fill") ?? "").startsWith("#"));
    // Proposal has no deferred quotes, so its row is two segments; Discovery is three.
    expect(segments).toHaveLength(2 + 3);
    expect(segments.slice(0, 2).map((bar) => bar.getAttribute("fill"))).toEqual(["#22c55e", "#ef4444"]);
  });

  it("colours a product bar by the win rate behind it", () => {
    const { container } = render(<ProductQuoteChart data={productQuotes} />);
    expect(bars(container).map((bar) => bar.getAttribute("fill"))).toEqual(["#22c55e", "#f59e0b", "#ef4444"]);
  });

  it("draws both competitor series", () => {
    const { container } = render(<CompetitorLossChart data={competitorLosses} />);
    expect(bars(container)).toHaveLength(competitorLosses.length * 2);
  });

  it("keeps one donut slice per outcome and names the totals in the legend", () => {
    const { container, getByText } = render(<WinRatePieChart data={winRates} />);
    // One slice each for won, lost and deferred, and each is a filled arc path.
    expect(container.querySelectorAll('svg path[fill^="#"]')).toHaveLength(3);
    expect(getByText("Won (4)")).toBeTruthy();
    expect(getByText("Lost (2)")).toBeTruthy();
    expect(getByText("Deferred (1)")).toBeTruthy();
  });

  it("draws the trend through every category with a fixed 0-100 axis", () => {
    const { container } = render(<WinRateTrendChart data={winRates} />);
    const labels = [...container.querySelectorAll("svg text")].map((node) => node.textContent);
    expect(labels).toContain("100");
    expect(labels).toContain("0");
    expect(container.querySelector("polyline")?.getAttribute("points")?.split(" ")).toHaveLength(winRates.length);
  });

  it("keeps the empty state as a sentence rather than an empty axis", () => {
    const { container, getByText } = render(<FeatureUsageChart data={[]} />);
    expect(container.querySelector("svg")).toBeNull();
    expect(getByText("No feature usage data yet.")).toBeTruthy();
  });
});
