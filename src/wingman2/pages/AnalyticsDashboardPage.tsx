/**
 * AnalyticsDashboardPage — Shows feature usage patterns, product quote
 * frequency, and win rates from local analytics data.
 */
import { useMemo, useState } from "react";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Target,
  Package,
  Clock,
  Trash2,
} from "lucide-react";
import {
  buildAnalyticsDashboard,
  formatAnalyticsDate,
  clearAnalyticsData,
  type FeatureUsage,
  type ProductQuoteFrequency,
  type WinRateByCategory,
  type CompetitorLossFrequency,
} from "../lib/analyticsDashboard";
import { PageHero } from "../components/PageHero";
import {
  FeatureUsageChart,
  WinRateChart,
  ProductQuoteChart,
  CompetitorLossChart,
  WinRatePieChart,
  WinRateTrendChart,
} from "../components/AnalyticsCharts";

// ─── Summary Card ─────────────────────────────────────────────────────────────

function SummaryCard({
  icon: Icon,
  label,
  value,
  accent = "aqua",
}: {
  icon: typeof Target;
  label: string;
  value: string | number;
  accent?: string;
}) {
  return (
    <div className={`wm-analytics-summary-card wm-analytics-summary-card--${accent}`}>
      <div className="wm-analytics-summary-card__icon">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <div className="wm-analytics-summary-card__content">
        <span className="wm-analytics-summary-card__label">{label}</span>
        <strong className="wm-analytics-summary-card__value">{value}</strong>
      </div>
    </div>
  );
}

// ─── Feature Usage Table ──────────────────────────────────────────────────────

function FeatureUsageTable({ data }: { data: FeatureUsage[] }) {
  if (data.length === 0) {
    return (
      <div className="wm-analytics-empty">
        <p>No feature usage data yet. Start using Wingman to see patterns here.</p>
      </div>
    );
  }

  return (
    <div className="wm-analytics-table-wrapper">
      <table className="wm-analytics-table">
        <thead>
          <tr>
            <th>Feature</th>
            <th className="wm-analytics-table__num">Opens</th>
            <th className="wm-analytics-table__num">Exports</th>
            <th className="wm-analytics-table__num">Searches</th>
            <th>Last used</th>
          </tr>
        </thead>
        <tbody>
          {data.slice(0, 15).map((feature) => (
            <tr key={feature.feature}>
              <td className="wm-analytics-table__feature">{feature.feature}</td>
              <td className="wm-analytics-table__num">{feature.opens}</td>
              <td className="wm-analytics-table__num">{feature.exports}</td>
              <td className="wm-analytics-table__num">{feature.searches}</td>
              <td>{formatAnalyticsDate(feature.lastUsed)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Product Quote Table ──────────────────────────────────────────────────────

function ProductQuoteTable({ data }: { data: ProductQuoteFrequency[] }) {
  if (data.length === 0) {
    return (
      <div className="wm-analytics-empty">
        <p>No product quotes yet. Add products to projects to see frequency data.</p>
      </div>
    );
  }

  return (
    <div className="wm-analytics-table-wrapper">
      <table className="wm-analytics-table">
        <thead>
          <tr>
            <th>SKU</th>
            <th>Name</th>
            <th className="wm-analytics-table__num">Quotes</th>
            <th className="wm-analytics-table__num">Win rate</th>
            <th>Last quoted</th>
          </tr>
        </thead>
        <tbody>
          {data.slice(0, 20).map((product) => (
            <tr key={product.sku}>
              <td className="wm-analytics-table__sku">{product.sku}</td>
              <td>{product.name}</td>
              <td className="wm-analytics-table__num">{product.quoteCount}</td>
              <td className="wm-analytics-table__num">
                <span className={`wm-analytics-win-rate ${product.winRate >= 50 ? "wm-analytics-win-rate--positive" : "wm-analytics-win-rate--negative"}`}>
                  {product.winRate}%
                </span>
              </td>
              <td>{formatAnalyticsDate(product.lastQuoted)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Win Rate Cards ───────────────────────────────────────────────────────────

function WinRateCards({ data }: { data: WinRateByCategory[] }) {
  if (data.length === 0) {
    return (
      <div className="wm-analytics-empty">
        <p>No deal outcomes recorded yet. Mark projects as won/lost to see win rates.</p>
      </div>
    );
  }

  return (
    <div className="wm-analytics-win-rate-grid">
      {data.map((category) => (
        <div key={category.category} className="wm-analytics-win-rate-card">
          <div className="wm-analytics-win-rate-card__header">
            <h4>{category.category}</h4>
            <span className={`wm-analytics-win-rate-badge ${category.winRate >= 50 ? "wm-analytics-win-rate-badge--positive" : "wm-analytics-win-rate-badge--negative"}`}>
              {category.winRate}%
            </span>
          </div>
          <div className="wm-analytics-win-rate-card__stats">
            <span className="wm-analytics-win-rate-card__stat wm-analytics-win-rate-card__stat--won">
              {category.won} won
            </span>
            <span className="wm-analytics-win-rate-card__stat wm-analytics-win-rate-card__stat--lost">
              {category.lost} lost
            </span>
            <span className="wm-analytics-win-rate-card__stat wm-analytics-win-rate-card__stat--deferred">
              {category.deferred} deferred
            </span>
          </div>
          <div className="wm-analytics-win-rate-card__bar">
            <div
              className="wm-analytics-win-rate-card__bar-fill"
              style={{ width: `${category.winRate}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Competitor Loss Table ────────────────────────────────────────────────────

function CompetitorLossTable({ data }: { data: CompetitorLossFrequency[] }) {
  if (data.length === 0) {
    return (
      <div className="wm-analytics-empty">
        <p>No competitor data yet. Record deal outcomes with "why" text to see patterns.</p>
      </div>
    );
  }

  return (
    <div className="wm-analytics-table-wrapper">
      <table className="wm-analytics-table">
        <thead>
          <tr>
            <th>Brand</th>
            <th className="wm-analytics-table__num">Losses</th>
            <th className="wm-analytics-table__num">Wins</th>
            <th>Common reasons</th>
          </tr>
        </thead>
        <tbody>
          {data.slice(0, 10).map((brand) => (
            <tr key={brand.brand}>
              <td className="wm-analytics-table__brand">{brand.brand}</td>
              <td className="wm-analytics-table__num wm-analytics-table__num--loss">{brand.lossCount}</td>
              <td className="wm-analytics-table__num wm-analytics-table__num--win">{brand.winCount}</td>
              <td className="wm-analytics-table__reasons">
                {brand.whySnippets.slice(0, 2).map((snippet, i) => (
                  <span key={i} className="wm-analytics-table__snippet">"{snippet}"</span>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AnalyticsDashboardPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const data = useMemo(() => buildAnalyticsDashboard(), [refreshKey]);

  function handleClearData() {
    if (window.confirm("Clear all analytics data? This cannot be undone.")) {
      clearAnalyticsData();
      setRefreshKey((k) => k + 1);
    }
  }

  return (
    <main className="wm-analytics-page wm-page" data-wingman-page="analytics">
      <PageHero
        eyebrow="Wingman / Analytics"
        title="Analytics Dashboard"
        purpose="Feature usage patterns, product quote frequency, and win rates from your projects."
        nextMove="Review the data below to understand how Wingman is being used."
      />

      <div className="wm-analytics-content">
        {/* Summary Cards */}
        <section className="wm-analytics-summary" aria-label="Analytics summary">
          <SummaryCard icon={Target} label="Total projects" value={data.summary.totalProjects} accent="aqua" />
          <SummaryCard icon={Package} label="Products quoted" value={data.summary.totalProducts} accent="blue" />
          <SummaryCard icon={TrendingUp} label="Overall win rate" value={`${data.summary.overallWinRate}%`} accent="green" />
          <SummaryCard icon={BarChart3} label="Most used feature" value={data.summary.mostUsedFeature} accent="violet" />
          <SummaryCard icon={Package} label="Most quoted product" value={data.summary.mostQuotedProduct} accent="amber" />
          <SummaryCard icon={TrendingDown} label="Top competitor threat" value={data.summary.topCompetitorThreat} accent="red" />
        </section>

        {/* Feature Usage */}
        <section className="wm-analytics-section" aria-label="Feature usage">
          <div className="wm-analytics-section__header">
            <div>
              <h2 className="wm-analytics-section__title">
                <BarChart3 className="h-5 w-5" aria-hidden="true" />
                Feature Usage Patterns
              </h2>
              <p className="wm-analytics-section__subtitle">
                Which Wingman features are used most often.
              </p>
            </div>
          </div>
          <div className="wm-analytics-charts-row">
            <div className="wm-analytics-chart-container">
              <h3 className="wm-analytics-chart-title">Usage Overview</h3>
              <FeatureUsageChart data={data.featureUsage} />
            </div>
            <div className="wm-analytics-table-container">
              <h3 className="wm-analytics-chart-title">Detailed Breakdown</h3>
              <FeatureUsageTable data={data.featureUsage} />
            </div>
          </div>
        </section>

        {/* Product Quote Frequency */}
        <section className="wm-analytics-section" aria-label="Product quote frequency">
          <div className="wm-analytics-section__header">
            <div>
              <h2 className="wm-analytics-section__title">
                <Package className="h-5 w-5" aria-hidden="true" />
                Product Quote Frequency
              </h2>
              <p className="wm-analytics-section__subtitle">
                Which WyreStorm products are quoted most often and their win rates.
              </p>
            </div>
          </div>
          <div className="wm-analytics-charts-row">
            <div className="wm-analytics-chart-container">
              <h3 className="wm-analytics-chart-title">Top Products by Quote Count</h3>
              <ProductQuoteChart data={data.productQuotes} />
            </div>
            <div className="wm-analytics-table-container">
              <h3 className="wm-analytics-chart-title">Full Product List</h3>
              <ProductQuoteTable data={data.productQuotes} />
            </div>
          </div>
        </section>

        {/* Win Rates */}
        <section className="wm-analytics-section" aria-label="Win rates">
          <div className="wm-analytics-section__header">
            <div>
              <h2 className="wm-analytics-section__title">
                <TrendingUp className="h-5 w-5" aria-hidden="true" />
                Win Rates by Category
              </h2>
              <p className="wm-analytics-section__subtitle">
                Deal outcomes across project stages.
              </p>
            </div>
          </div>
          <div className="wm-analytics-charts-row">
            <div className="wm-analytics-chart-container wm-analytics-chart-container--half">
              <h3 className="wm-analytics-chart-title">Win Rate Distribution</h3>
              <WinRatePieChart data={data.winRates} />
            </div>
            <div className="wm-analytics-chart-container wm-analytics-chart-container--half">
              <h3 className="wm-analytics-chart-title">Win Rate by Category</h3>
              <WinRateTrendChart data={data.winRates} />
            </div>
          </div>
          <div className="wm-analytics-charts-row">
            <div className="wm-analytics-chart-container">
              <h3 className="wm-analytics-chart-title">Detailed Breakdown</h3>
              <WinRateChart data={data.winRates} />
            </div>
            <div className="wm-analytics-table-container">
              <h3 className="wm-analytics-chart-title">Category Cards</h3>
              <WinRateCards data={data.winRates} />
            </div>
          </div>
        </section>

        {/* Competitor Losses */}
        <section className="wm-analytics-section" aria-label="Competitor losses">
          <div className="wm-analytics-section__header">
            <div>
              <h2 className="wm-analytics-section__title">
                <TrendingDown className="h-5 w-5" aria-hidden="true" />
                Competitor Loss Patterns
              </h2>
              <p className="wm-analytics-section__subtitle">
                Which competitors appear most in lost deals and why.
              </p>
            </div>
          </div>
          <div className="wm-analytics-charts-row">
            <div className="wm-analytics-chart-container">
              <h3 className="wm-analytics-chart-title">Competitor Comparison</h3>
              <CompetitorLossChart data={data.competitorLosses} />
            </div>
            <div className="wm-analytics-table-container">
              <h3 className="wm-analytics-chart-title">Detailed Breakdown</h3>
              <CompetitorLossTable data={data.competitorLosses} />
            </div>
          </div>
        </section>

        {/* Actions */}
        <section className="wm-analytics-actions" aria-label="Analytics actions">
          <button
            type="button"
            className="wm-ui-button wm-ui-button-secondary"
            onClick={() => setRefreshKey((k) => k + 1)}
          >
            <Clock className="mr-2 inline h-4 w-4" aria-hidden="true" />
            Refresh data
          </button>
          <button
            type="button"
            className="wm-ui-button wm-ui-button-secondary wm-analytics-actions__clear"
            onClick={handleClearData}
          >
            <Trash2 className="mr-2 inline h-4 w-4" aria-hidden="true" />
            Clear analytics data
          </button>
        </section>
      </div>
    </main>
  );
}
