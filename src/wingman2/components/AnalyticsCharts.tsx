/**
 * AnalyticsCharts — Recharts-based chart components for the analytics dashboard.
 *
 * Charts visualize:
 * - Feature usage (bar chart)
 * - Win rates by category (horizontal bar chart)
 * - Product quote frequency (bar chart)
 * - Competitor losses (bar chart)
 * - Win rate trend (area chart)
 */
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  AreaChart,
  Area,
} from "recharts";
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
  pink: "#ec4899",
  indigo: "#6366f1",
  teal: "#14b8a6",
  orange: "#f97316",
};

const WIN_RATE_COLORS = {
  positive: "#22c55e",
  neutral: "#f59e0b",
  negative: "#ef4444",
};

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="wm-analytics-chart-tooltip">
      <p className="wm-analytics-chart-tooltip__label">{label}</p>
      {payload.map((entry, index) => (
        <p key={index} className="wm-analytics-chart-tooltip__value" style={{ color: entry.color }}>
          {entry.name}: {entry.value}
        </p>
      ))}
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

  // Take top 10 features and transform for chart
  const chartData = data.slice(0, 10).map((f) => ({
    name: f.feature.length > 15 ? f.feature.slice(0, 15) + "…" : f.feature,
    opens: f.opens,
    exports: f.exports,
    searches: f.searches,
  }));

  return (
    <div className="wm-analytics-chart">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 12 }} />
          <YAxis tick={{ fill: "#9ca3af", fontSize: 12 }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ color: "#9ca3af" }} />
          <Bar dataKey="opens" name="Opens" fill={COLORS.aqua} radius={[4, 4, 0, 0]} />
          <Bar dataKey="exports" name="Exports" fill={COLORS.blue} radius={[4, 4, 0, 0]} />
          <Bar dataKey="searches" name="Searches" fill={COLORS.violet} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
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

  const chartData = data.map((w) => ({
    name: w.category,
    won: w.won,
    lost: w.lost,
    deferred: w.deferred,
    winRate: w.winRate,
  }));

  return (
    <div className="wm-analytics-chart">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis type="number" tick={{ fill: "#9ca3af", fontSize: 12 }} />
          <YAxis type="category" dataKey="name" tick={{ fill: "#9ca3af", fontSize: 12 }} width={80} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ color: "#9ca3af" }} />
          <Bar dataKey="won" name="Won" fill={COLORS.green} stackId="a" />
          <Bar dataKey="lost" name="Lost" fill={COLORS.red} stackId="a" />
          <Bar dataKey="deferred" name="Deferred" fill={COLORS.amber} stackId="a" />
        </BarChart>
      </ResponsiveContainer>
    </div>
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

  // Take top 10 products
  const chartData = data.slice(0, 10).map((p) => ({
    name: p.sku.length > 12 ? p.sku.slice(0, 12) + "…" : p.sku,
    quotes: p.quoteCount,
    winRate: p.winRate,
  }));

  return (
    <div className="wm-analytics-chart">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 12 }} />
          <YAxis tick={{ fill: "#9ca3af", fontSize: 12 }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ color: "#9ca3af" }} />
          <Bar dataKey="quotes" name="Quote count" fill={COLORS.blue} radius={[4, 4, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={
                  entry.winRate >= 70
                    ? COLORS.green
                    : entry.winRate >= 40
                      ? COLORS.amber
                      : COLORS.red
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
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
  const chartData = data.slice(0, 8).map((c) => ({
    name: c.brand,
    losses: c.lossCount,
    wins: c.winCount,
  }));

  return (
    <div className="wm-analytics-chart">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 12 }} />
          <YAxis tick={{ fill: "#9ca3af", fontSize: 12 }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ color: "#9ca3af" }} />
          <Bar dataKey="losses" name="Losses" fill={COLORS.red} radius={[4, 4, 0, 0]} />
          <Bar dataKey="wins" name="Wins" fill={COLORS.green} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
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
  const totalWon = data.reduce((sum, d) => sum + d.won, 0);
  const totalLost = data.reduce((sum, d) => sum + d.lost, 0);
  const totalDeferred = data.reduce((sum, d) => sum + d.deferred, 0);

  const pieData = [
    { name: "Won", value: totalWon, color: COLORS.green },
    { name: "Lost", value: totalLost, color: COLORS.red },
    { name: "Deferred", value: totalDeferred, color: COLORS.amber },
  ].filter((d) => d.value > 0);

  return (
    <div className="wm-analytics-chart wm-analytics-chart--pie">
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={3}
            dataKey="value"
          >
            {pieData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
          <Legend wrapperStyle={{ color: "#9ca3af" }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Win Rate Trend Chart ────────────────────────────────────────────────────

export function WinRateTrendChart({ data }: { data: WinRateByCategory[] }) {
  if (data.length === 0) {
    return (
      <div className="wm-analytics-chart-empty">
        <p>No win rate trend data yet.</p>
      </div>
    );
  }

  // Create trend data from categories (sorted by total projects)
  const trendData = data
    .slice(0, 6)
    .map((w) => ({
      name: w.category,
      winRate: w.winRate,
      total: w.total,
    }));

  return (
    <div className="wm-analytics-chart">
      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={trendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 12 }} />
          <YAxis tick={{ fill: "#9ca3af", fontSize: 12 }} domain={[0, 100]} />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="winRate"
            name="Win Rate %"
            stroke={COLORS.aqua}
            fill={COLORS.aqua}
            fillOpacity={0.3}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
