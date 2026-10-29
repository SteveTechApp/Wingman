/**
 * AnalyticsCharts — the analytics dashboard's charts, drawn as plain SVG.
 *
 * These were Recharts, and one admin view was paying for a charting framework:
 * recharts plus the redux toolkit, immer, es-toolkit, decimal.js-light and d3
 * modules it drags in came to ~430 KB in the emitted bundle, for charts whose
 * whole vocabulary is bars, a stacked bar run, a donut and an area. Every shape
 * here is the same data the Recharts version took, at the same heights and in the
 * same palette, and the markup keeps the `wm-analytics-chart*` classes the
 * stylesheet has always styled — no page loads a chart library any more.
 *
 * The charts are measured rather than scaled: the drawing is laid out in CSS
 * pixels at its container's width, so tick labels stay 12px on a phone instead
 * of shrinking with the plot. Hovering a bar or a slice prints the same tooltip
 * markup (`wm-analytics-chart-tooltip`) the custom Recharts tooltip used.
 *
 * A series is named by its tone rather than its colour, so every chip of colour
 * the charts print — a legend dot, a tooltip swatch — is a class on the tone
 * (`wm-analytics-chart-legend__dot--aqua`) and the palette lives in the
 * stylesheet. The drawing itself still paints `fill`/`stroke` attributes, which
 * is how SVG takes colour.
 */
import { useEffect, useRef, useState } from "react";
import type {
  FeatureUsage,
  ProductQuoteFrequency,
  WinRateByCategory,
  CompetitorLossFrequency,
} from "../lib/analyticsDashboard";

// ─── Color Palette ────────────────────────────────────────────────────────────

const COLORS = {
  aqua: "#06b6d4",
  blue: "#3b82f6",
  green: "#22c55e",
  amber: "#f59e0b",
  red: "#ef4444",
  violet: "#8b5cf6",
};

type Tone = keyof typeof COLORS;

const AXIS_TEXT = "#9ca3af";
const GRID = "#374151";

// ─── Shared layout ────────────────────────────────────────────────────────────

type Series = { key: string; label: string; tone: Tone };

type Row = { label: string; values: Record<string, number> };

type TooltipRow = { label: string; value: number; tone: Tone };

type TooltipState = { label: string; rows: TooltipRow[] };

const GROUPED_PAD = { top: 12, right: 16, bottom: 42, left: 44 };
const STACKED_PAD = { top: 12, right: 24, bottom: 30, left: 116 };

/**
 * The chart's own width, so the drawing is laid out in CSS pixels.
 *
 * A fixed `viewBox` scaled to the container would shrink every tick label with
 * the plot — 12px becomes 6px in a phone's half-width card. A missing
 * `ResizeObserver` (a test environment, an old webview) falls back to a width
 * that draws the chart whole rather than nothing.
 */
function useChartWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const measure = () => setWidth(Math.max(260, Math.round(node.clientWidth)));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return [ref, width] as const;
}

/**
 * Four gridlines for a count axis, on whole-number steps.
 *
 * A count axis divided by four lands on 2.5 and 7.5 for the counts these charts
 * hold, and a tick that reads "2.5 opens" is not a number of opens. The step is
 * rounded up to a whole number that clears the tallest bar, so the top gridline
 * sits above every bar and every label counts something a rep could count.
 */
function countTicks(maxValue: number) {
  const target = Math.max(1, Math.ceil(maxValue));
  const rough = Math.ceil(target / 4);
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = Math.max(
    1,
    Math.ceil([1, 2, 3, 4, 5, 10].map((multiple) => multiple * magnitude).find((candidate) => candidate >= rough) ?? 10 * magnitude),
  );
  return [0, step, step * 2, step * 3, step * 4];
}

function useTooltip() {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  return { tooltip, setTooltip };
}

/**
 * The hovered category's readings, pinned to the plot's top-right corner.
 *
 * The corner rather than the cursor: a tooltip that follows the pointer sits
 * over the bars it describes and makes a rep move the mouse to read them, and
 * its position would have to be written into the markup. Here the numbers swap
 * where they always are, so the plot underneath stays readable while hovering.
 */
function ChartTooltip({ tooltip }: { tooltip: TooltipState | null }) {
  if (!tooltip) return null;
  return (
    <div className="wm-analytics-chart-tooltip" data-testid="wm-analytics-chart-tooltip">
      <p className="wm-analytics-chart-tooltip__label">{tooltip.label}</p>
      <ul className="wm-analytics-chart-tooltip__rows">
        {tooltip.rows.map((row) => (
          <li key={row.label} className="wm-analytics-chart-tooltip__row">
            <span
              className={`wm-analytics-chart-legend__dot wm-analytics-chart-legend__dot--${row.tone}`}
              aria-hidden="true"
            />
            <span>{row.label}</span>
            <span className="wm-analytics-chart-tooltip__value">{row.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ChartLegend({ series }: { series: Series[] }) {
  return (
    <div className="wm-analytics-chart-legend">
      {series.map((item) => (
        <span key={item.key} className="wm-analytics-chart-legend__item">
          <span
            className={`wm-analytics-chart-legend__dot wm-analytics-chart-legend__dot--${item.tone}`}
            aria-hidden="true"
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}

// ─── Grouped bar chart ────────────────────────────────────────────────────────

/**
 * Bars grouped by category, one per series, with a count axis.
 *
 * `toneFor` tones a bar by its own value instead of its series, which is the
 * product-quote chart's requirement: one series, and the win rate behind each
 * quote decides the bar.
 */
function GroupedBarChart({
  rows,
  series,
  height,
  toneFor,
  labelMax = 15,
}: {
  rows: Row[];
  series: Series[];
  height: number;
  toneFor?: (row: Row) => Tone;
  labelMax?: number;
}) {
  const [ref, width] = useChartWidth();
  const { tooltip, setTooltip } = useTooltip();

  const ticks = countTicks(Math.max(...rows.flatMap((row) => series.map((item) => row.values[item.key] ?? 0)), 1));
  const max = ticks[ticks.length - 1];
  const plotWidth = Math.max(60, width - GROUPED_PAD.left - GROUPED_PAD.right);
  const plotHeight = height - GROUPED_PAD.top - GROUPED_PAD.bottom;
  const band = plotWidth / rows.length;
  const barWidth = Math.max(3, (band * 0.72) / series.length);
  const rotateLabels = rows.length > 6;
  const y = (value: number) => GROUPED_PAD.top + plotHeight - (value / max) * plotHeight;

  return (
    <div className="wm-analytics-chart">
      {/* Measured here rather than on the card, so the drawing is as wide as the
          card's content box and not its padding too. */}
      <div ref={ref} className="wm-analytics-chart-plot">
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={rows.map((row) => row.label).join(", ")}
          onMouseLeave={() => setTooltip(null)}
        >
          {ticks.map((value) => (
            <g key={`tick-${value}`}>
              <line
                x1={GROUPED_PAD.left}
                x2={GROUPED_PAD.left + plotWidth}
                y1={y(value)}
                y2={y(value)}
                stroke={GRID}
                strokeDasharray="3 3"
              />
              <text x={GROUPED_PAD.left - 8} y={y(value) + 4} textAnchor="end" fill={AXIS_TEXT} fontSize={12}>
                {value}
              </text>
            </g>
          ))}
          {rows.map((row, rowIndex) => {
            const bandLeft = GROUPED_PAD.left + rowIndex * band + (band - barWidth * series.length) / 2;
            return (
              <g
                key={`row-${row.label}-${rowIndex}`}
                onMouseEnter={() => {
                  setTooltip({
                    label: row.label,
                    rows: series.map((item) => ({
                      label: item.label,
                      value: row.values[item.key] ?? 0,
                      tone: toneFor ? toneFor(row) : item.tone,
                    })),
                  });
                }}
              >
                <rect
                  x={GROUPED_PAD.left + rowIndex * band}
                  y={GROUPED_PAD.top}
                  width={band}
                  height={plotHeight}
                  fill="transparent"
                />
                {series.map((item, seriesIndex) => {
                  const value = row.values[item.key] ?? 0;
                  const barHeight = Math.max(0, GROUPED_PAD.top + plotHeight - y(value));
                  return (
                    <rect
                      key={`bar-${item.key}`}
                      x={bandLeft + seriesIndex * barWidth}
                      y={y(value)}
                      width={barWidth - 2}
                      height={barHeight}
                      rx={3}
                      fill={COLORS[toneFor ? toneFor(row) : item.tone]}
                    />
                  );
                })}
                <text
                  x={GROUPED_PAD.left + rowIndex * band + band / 2}
                  y={height - GROUPED_PAD.bottom + 16}
                  textAnchor={rotateLabels ? "end" : "middle"}
                  fill={AXIS_TEXT}
                  fontSize={12}
                  transform={
                    rotateLabels
                      ? `rotate(-25 ${GROUPED_PAD.left + rowIndex * band + band / 2} ${height - GROUPED_PAD.bottom + 16})`
                      : undefined
                  }
                >
                  {row.label.length > labelMax ? `${row.label.slice(0, labelMax)}…` : row.label}
                </text>
              </g>
            );
          })}
        </svg>
        <ChartTooltip tooltip={tooltip} />
      </div>
      <ChartLegend series={series} />
    </div>
  );
}

// ─── Stacked horizontal bars ──────────────────────────────────────────────────

/**
 * One bar per category, its parts stacked along the value axis.
 *
 * Win rates read best this way: the category is the long label on the left and
 * the bar shows how the decided quotes split between won, lost and deferred.
 */
function StackedBarChart({ rows, series, height }: { rows: Row[]; series: Series[]; height: number }) {
  const [ref, width] = useChartWidth();
  const { tooltip, setTooltip } = useTooltip();

  const ticks = countTicks(Math.max(...rows.map((row) => series.reduce((sum, item) => sum + (row.values[item.key] ?? 0), 0)), 1));
  const max = ticks[ticks.length - 1];
  const plotWidth = Math.max(60, width - STACKED_PAD.left - STACKED_PAD.right);
  const plotHeight = height - STACKED_PAD.top - STACKED_PAD.bottom;
  const rowHeight = plotHeight / Math.max(1, rows.length);
  const barHeight = Math.max(8, rowHeight * 0.6);
  const x = (value: number) => STACKED_PAD.left + (value / max) * plotWidth;

  return (
    <div className="wm-analytics-chart">
      <div ref={ref} className="wm-analytics-chart-plot">
        <svg width={width} height={height} role="img" aria-label={rows.map((row) => row.label).join(", ")} onMouseLeave={() => setTooltip(null)}>
          {ticks.map((value) => (
            <g key={`tick-${value}`}>
              <line
                x1={x(value)}
                x2={x(value)}
                y1={STACKED_PAD.top}
                y2={STACKED_PAD.top + plotHeight}
                stroke={GRID}
                strokeDasharray="3 3"
              />
              <text x={x(value)} y={height - 10} textAnchor="middle" fill={AXIS_TEXT} fontSize={12}>
                {value}
              </text>
            </g>
          ))}
          {rows.map((row, rowIndex) => {
            const top = STACKED_PAD.top + rowIndex * rowHeight + (rowHeight - barHeight) / 2;
            let offset = 0;
            return (
              <g
                key={`row-${row.label}-${rowIndex}`}
                onMouseEnter={() => {
                  setTooltip({
                    label: row.label,
                    rows: series.map((item) => ({
                      label: item.label,
                      value: row.values[item.key] ?? 0,
                      tone: item.tone,
                    })),
                  });
                }}
              >
                <text
                  x={STACKED_PAD.left - 10}
                  y={top + barHeight / 2 + 4}
                  textAnchor="end"
                  fill={AXIS_TEXT}
                  fontSize={12}
                >
                  {row.label.length > 18 ? `${row.label.slice(0, 18)}…` : row.label}
                </text>
                {series.map((item) => {
                  const value = row.values[item.key] ?? 0;
                  if (value <= 0) return null;
                  const segment = Math.max(0, (value / max) * plotWidth);
                  const segmentLeft = STACKED_PAD.left + offset;
                  offset += segment;
                  return (
                    <rect
                      key={`bar-${item.key}`}
                      x={segmentLeft}
                      y={top}
                      width={Math.max(1, segment - 1)}
                      height={barHeight}
                      fill={COLORS[item.tone]}
                    />
                  );
                })}
              </g>
            );
          })}
        </svg>
        <ChartTooltip tooltip={tooltip} />
      </div>
      <ChartLegend series={series} />
    </div>
  );
}

// ─── Donut ────────────────────────────────────────────────────────────────────

function donutSegment(
  centre: number,
  radius: number,
  innerRadius: number,
  start: number,
  end: number,
) {
  const point = (r: number, angle: number) => [centre + r * Math.cos(angle), centre + r * Math.sin(angle)];
  const large = end - start > Math.PI ? 1 : 0;
  const [outerStartX, outerStartY] = point(radius, start);
  const [outerEndX, outerEndY] = point(radius, end);
  const [innerEndX, innerEndY] = point(innerRadius, end);
  const [innerStartX, innerStartY] = point(innerRadius, start);
  return `M${outerStartX},${outerStartY} A${radius},${radius} 0 ${large} 1 ${outerEndX},${outerEndY} L${innerEndX},${innerEndY} A${innerRadius},${innerRadius} 0 ${large} 0 ${innerStartX},${innerStartY} Z`;
}

function DonutChart({ data, height }: { data: Array<{ name: string; value: number; tone: Tone }>; height: number }) {
  const { tooltip, setTooltip } = useTooltip();
  const total = data.reduce((sum, entry) => sum + entry.value, 0);
  const radius = Math.round(height / 2) - 4;
  const innerRadius = Math.round(radius * 0.66);
  const centre = height / 2;
  const paddingAngle = data.length > 1 ? 0.03 : 0;

  let angle = -Math.PI / 2;
  const segments = data.map((entry) => {
    const sweep = (entry.value / total) * Math.PI * 2;
    const start = angle + paddingAngle / 2;
    const end = angle + sweep - paddingAngle / 2;
    angle += sweep;
    return { ...entry, start, end };
  });

  return (
    <div className="wm-analytics-chart wm-analytics-chart--pie">
      <div className="wm-analytics-chart-plot">
        <svg width={height} height={height} role="img" aria-label={data.map((entry) => `${entry.name}: ${entry.value}`).join(", ")} onMouseLeave={() => setTooltip(null)}>
          {segments.map((segment) => (
            <path
              key={segment.name}
              d={donutSegment(centre, radius, innerRadius, segment.start, segment.end)}
              fill={COLORS[segment.tone]}
              onMouseEnter={() =>
                setTooltip({
                  label: segment.name,
                  rows: [{ label: segment.name, value: segment.value, tone: segment.tone }],
                })
              }
            />
          ))}
        </svg>
        <ChartTooltip tooltip={tooltip} />
      </div>
      <ChartLegend series={data.map((entry) => ({ key: entry.name, label: `${entry.name} (${entry.value})`, tone: entry.tone }))} />
    </div>
  );
}

// ─── Area trend ───────────────────────────────────────────────────────────────

/**
 * A win-rate line through the categories, filled under it.
 *
 * The value axis is fixed at 0–100 because a rate always is: an auto-scaled axis
 * would make 61% and 64% look like a different business.
 */
function AreaTrendChart({ rows, height }: { rows: Array<{ label: string; value: number }>; height: number }) {
  const [ref, width] = useChartWidth();
  const { tooltip, setTooltip } = useTooltip();

  // A rate axis is 0–100 by definition, so its ticks are fixed rather than fitted.
  const ticks = [0, 25, 50, 75, 100];
  const axisMax = 100;
  const plotWidth = Math.max(60, width - GROUPED_PAD.left - GROUPED_PAD.right);
  const plotHeight = height - GROUPED_PAD.top - GROUPED_PAD.bottom;
  const step = rows.length > 1 ? plotWidth / (rows.length - 1) : 0;
  const x = (index: number) => GROUPED_PAD.left + index * step;
  const y = (value: number) => GROUPED_PAD.top + plotHeight - (value / axisMax) * plotHeight;
  const points = rows.map((row, index) => `${x(index)},${y(row.value)}`).join(" ");
  const areaPath = rows.length
    ? `M${x(0)},${GROUPED_PAD.top + plotHeight} L${points.replace(/ /g, " L")} L${x(rows.length - 1)},${GROUPED_PAD.top + plotHeight} Z`
    : "";

  return (
    <div className="wm-analytics-chart">
      <div ref={ref} className="wm-analytics-chart-plot">
        <svg width={width} height={height} role="img" aria-label={rows.map((row) => `${row.label}: ${row.value}%`).join(", ")} onMouseLeave={() => setTooltip(null)}>
          {ticks.map((value) => (
            <g key={`tick-${value}`}>
              <line x1={GROUPED_PAD.left} x2={GROUPED_PAD.left + plotWidth} y1={y(value)} y2={y(value)} stroke={GRID} strokeDasharray="3 3" />
              <text x={GROUPED_PAD.left - 8} y={y(value) + 4} textAnchor="end" fill={AXIS_TEXT} fontSize={12}>
                {value}
              </text>
            </g>
          ))}
          <path d={areaPath} fill={COLORS.aqua} fillOpacity={0.3} />
          <polyline points={points} fill="none" stroke={COLORS.aqua} strokeWidth={2} />
          {rows.map((row, index) => (
            <g
              key={`point-${row.label}`}
              onMouseEnter={() =>
                setTooltip({
                  label: row.label,
                  rows: [{ label: "Win rate", value: row.value, tone: "aqua" }],
                })
              }
            >
              <rect x={x(index) - step / 2} y={GROUPED_PAD.top} width={Math.max(step, 12)} height={plotHeight} fill="transparent" />
              <circle cx={x(index)} cy={y(row.value)} r={3} fill={COLORS.aqua} />
              <text x={x(index)} y={height - 12} textAnchor="middle" fill={AXIS_TEXT} fontSize={12}>
                {row.label.length > 14 ? `${row.label.slice(0, 14)}…` : row.label}
              </text>
            </g>
          ))}
        </svg>
        <ChartTooltip tooltip={tooltip} />
      </div>
    </div>
  );
}

// ─── Feature Usage Chart ─────────────────────────────────────────────────────

export function FeatureUsageChart({ data }: { data: FeatureUsage[] }) {
  if (data.length === 0) {
    return (
      <div className="wm-analytics-chart-empty">
        <p>No feature usage data yet.</p>
      </div>
    );
  }

  // Take top 10 features; the chart shortens the tick label, and the tooltip and
  // accessible name keep the feature's whole name.
  const rows: Row[] = data.slice(0, 10).map((feature) => ({
    label: feature.feature,
    values: { opens: feature.opens, exports: feature.exports, searches: feature.searches },
  }));

  return (
    <GroupedBarChart
      rows={rows}
      height={300}
      series={[
        { key: "opens", label: "Opens", tone: "aqua" },
        { key: "exports", label: "Exports", tone: "blue" },
        { key: "searches", label: "Searches", tone: "violet" },
      ]}
    />
  );
}

// ─── Win Rate Chart ───────────────────────────────────────────────────────────

export function WinRateChart({ data }: { data: WinRateByCategory[] }) {
  if (data.length === 0) {
    return (
      <div className="wm-analytics-chart-empty">
        <p>No win rate data yet.</p>
      </div>
    );
  }

  return (
    <StackedBarChart
      height={300}
      rows={data.map((entry) => ({
        label: entry.category,
        values: { won: entry.won, lost: entry.lost, deferred: entry.deferred },
      }))}
      series={[
        { key: "won", label: "Won", tone: "green" },
        { key: "lost", label: "Lost", tone: "red" },
        { key: "deferred", label: "Deferred", tone: "amber" },
      ]}
    />
  );
}

// ─── Product Quote Frequency Chart ────────────────────────────────────────────

export function ProductQuoteChart({ data }: { data: ProductQuoteFrequency[] }) {
  if (data.length === 0) {
    return (
      <div className="wm-analytics-chart-empty">
        <p>No product quote data yet.</p>
      </div>
    );
  }

  // Take top 10 products, and tone each bar by the win rate behind it.
  const rows: Row[] = data.slice(0, 10).map((product) => ({
    label: product.sku,
    values: { quotes: product.quoteCount, winRate: product.winRate },
  }));
  const toneFor = (row: Row): Tone => {
    const winRate = row.values.winRate ?? 0;
    return winRate >= 70 ? "green" : winRate >= 40 ? "amber" : "red";
  };

  return (
    <div>
      <GroupedBarChart
        rows={rows}
        height={300}
        labelMax={12}
        series={[{ key: "quotes", label: "Quote count", tone: "blue" }]}
        toneFor={toneFor}
      />
      <div className="wm-analytics-chart-legend">
        <span className="wm-analytics-chart-legend__item">
          <span className="wm-analytics-chart-legend__dot wm-analytics-chart-legend__dot--green" />
          High win rate (≥70%)
        </span>
        <span className="wm-analytics-chart-legend__item">
          <span className="wm-analytics-chart-legend__dot wm-analytics-chart-legend__dot--amber" />
          Medium win rate (40-69%)
        </span>
        <span className="wm-analytics-chart-legend__item">
          <span className="wm-analytics-chart-legend__dot wm-analytics-chart-legend__dot--red" />
          Low win rate (&lt;40%)
        </span>
      </div>
    </div>
  );
}

// ─── Competitor Loss Chart ────────────────────────────────────────────────────

export function CompetitorLossChart({ data }: { data: CompetitorLossFrequency[] }) {
  if (data.length === 0) {
    return (
      <div className="wm-analytics-chart-empty">
        <p>No competitor data yet.</p>
      </div>
    );
  }

  // Take top 8 competitors
  const rows: Row[] = data.slice(0, 8).map((competitor) => ({
    label: competitor.brand,
    values: { losses: competitor.lossCount, wins: competitor.winCount },
  }));

  return (
    <GroupedBarChart
      rows={rows}
      height={300}
      series={[
        { key: "losses", label: "Losses", tone: "red" },
        { key: "wins", label: "Wins", tone: "green" },
      ]}
    />
  );
}

// ─── Win Rate Pie Chart ───────────────────────────────────────────────────────

export function WinRatePieChart({ data }: { data: WinRateByCategory[] }) {
  if (data.length === 0) {
    return (
      <div className="wm-analytics-chart-empty">
        <p>No win rate data yet.</p>
      </div>
    );
  }

  // Aggregate all categories
  const totalWon = data.reduce((sum, entry) => sum + entry.won, 0);
  const totalLost = data.reduce((sum, entry) => sum + entry.lost, 0);
  const totalDeferred = data.reduce((sum, entry) => sum + entry.deferred, 0);

  const slices = [
    { name: "Won", value: totalWon, tone: "green" as const },
    { name: "Lost", value: totalLost, tone: "red" as const },
    { name: "Deferred", value: totalDeferred, tone: "amber" as const },
  ].filter((slice) => slice.value > 0);

  return <DonutChart data={slices} height={250} />;
}

// ─── Win Rate Trend Chart ─────────────────────────────────────────────────────

export function WinRateTrendChart({ data }: { data: WinRateByCategory[] }) {
  if (data.length === 0) {
    return (
      <div className="wm-analytics-chart-empty">
        <p>No win rate trend data yet.</p>
      </div>
    );
  }

  // Create trend data from categories (sorted by total projects)
  const rows = data
    .slice(0, 6)
    .map((entry) => ({ label: entry.category, value: entry.winRate }));

  return <AreaTrendChart rows={rows} height={250} />;
}
