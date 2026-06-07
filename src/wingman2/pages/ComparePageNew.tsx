import { useState, useEffect, useCallback } from "react";
import {
  analyzeCompetitor,
  type CompetitorProfile,
  type WyrestormProduct,
} from "../lib/competitorMatchEngine";
import {
  rigorousCompare,
  type RigorousCompareResult,
  type RigorousMatch,
} from "../lib/rigorousCompare";
import type { CompareDecisionOutcome } from "../lib/competitorCompareDecision";

const KNOWN_BRANDS = [
  "Crestron",
  "Extron",
  "Atlona",
  "Kramer",
  "Lightware",
  "Blustream",
  "Barco",
  "ZeeVee",
  "AMX",
  "AVPro Edge",
  "Binary",
  "ATEN",
  "Logitech",
  "Poly",
  "Biamp",
  "Shure",
  "QSC",
  "Other",
];

type PageState = "input" | "analyzing" | "results" | "error";

const OUTCOME_STYLES: Record<CompareDecisionOutcome, string> = {
  "GOOD MATCH": "bg-green-100 text-green-800 border-green-200",
  "PARTIAL MATCH": "bg-amber-100 text-amber-800 border-amber-200",
  VERIFY: "bg-yellow-100 text-yellow-800 border-yellow-200",
  "NO MATCH": "bg-red-100 text-red-800 border-red-200",
};

function readIndexedProducts(data: unknown): WyrestormProduct[] {
  if (Array.isArray(data)) {
    return data as WyrestormProduct[];
  }

  if (data && typeof data === "object" && Array.isArray((data as { products?: unknown }).products)) {
    return (data as { products: WyrestormProduct[] }).products;
  }

  return [];
}

export default function ComparePageNew() {
  const [state, setState] = useState<PageState>("input");
  const [competitorInput, setCompetitorInput] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [productUrl, setProductUrl] = useState("");
  const [applicationContext, setApplicationContext] = useState("");
  const [products, setProducts] = useState<WyrestormProduct[]>([]);
  const [result, setResult] = useState<RigorousCompareResult | null>(null);
  const [error, setError] = useState("");
  const [liveProfile, setLiveProfile] = useState<CompetitorProfile | null>(null);

  // Load WyreStorm products on mount
  useEffect(() => {
    async function loadProducts() {
      try {
        const res = await fetch("/product-intelligence-index.json");
        if (!res.ok) throw new Error("Failed to load product data");
        const data = await res.json();
        setProducts(readIndexedProducts(data));
      } catch (err) {
        console.error("Failed to load products:", err);
      }
    }
    loadProducts();
  }, []);

  // Live analysis as user types
  useEffect(() => {
    if (competitorInput.trim().length >= 3) {
      const profile = analyzeCompetitor(competitorInput, selectedBrand || undefined);
      setLiveProfile(profile);
    } else {
      setLiveProfile(null);
    }
  }, [competitorInput, selectedBrand]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!competitorInput.trim()) {
        setError("Please enter a competitor product SKU or name");
        setState("error");
        return;
      }

      if (products.length === 0) {
        setError("Product data not loaded. Please refresh the page.");
        setState("error");
        return;
      }

      setState("analyzing");
      await new Promise((r) => setTimeout(r, 300));

      try {
        const fullInput = applicationContext
          ? `${competitorInput} ${applicationContext}`
          : competitorInput;

        const compareResult = rigorousCompare(
          fullInput,
          products,
          selectedBrand || undefined,
          8,
        );

        setResult(compareResult);
        setState("results");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Comparison failed");
        setState("error");
      }
    },
    [competitorInput, selectedBrand, applicationContext, products],
  );

  const handleReset = () => {
    setCompetitorInput("");
    setSelectedBrand("");
    setProductUrl("");
    setApplicationContext("");
    setResult(null);
    setError("");
    setLiveProfile(null);
    setState("input");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Competitor Compare</h1>
          <p className="mt-2 text-gray-600">
            Enter a competitor product to find the best WyreStorm alternatives, checked against real product specifications
          </p>
        </div>

        {/* Input Form */}
        {(state === "input" || state === "error") && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="border border-gray-200 rounded-lg p-4">
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
                  Competitor Product Details
                </h2>

                <div className="mb-4">
                  <label htmlFor="competitor-sku" className="block text-sm font-medium text-gray-700 mb-1">
                    Competitor SKU or Product Name *
                  </label>
                  <input
                    id="competitor-sku"
                    type="text"
                    value={competitorInput}
                    onChange={(e) => setCompetitorInput(e.target.value)}
                    placeholder="e.g., DM-NVX-350, NAV E 501, VS-88H2A"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    autoFocus
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Enter any competitor SKU - we&apos;ll resolve it to known specifications where available
                  </p>
                </div>

                <div className="mb-4">
                  <label htmlFor="brand-select" className="block text-sm font-medium text-gray-700 mb-1">
                    Manufacturer (optional)
                  </label>
                  <select
                    id="brand-select"
                    value={selectedBrand}
                    onChange={(e) => setSelectedBrand(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  >
                    <option value="">Auto-detect from SKU</option>
                    {KNOWN_BRANDS.map((brand) => (
                      <option key={brand} value={brand}>
                        {brand}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-4">
                  <label htmlFor="product-url" className="block text-sm font-medium text-gray-700 mb-1">
                    Product URL (optional)
                  </label>
                  <input
                    id="product-url"
                    type="url"
                    value={productUrl}
                    onChange={(e) => setProductUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="app-context" className="block text-sm font-medium text-gray-700 mb-1">
                    Application Context (optional)
                  </label>
                  <input
                    id="app-context"
                    type="text"
                    value={applicationContext}
                    onChange={(e) => setApplicationContext(e.target.value)}
                    placeholder="e.g., conference room, lecture hall, 4K video wall"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="mt-1 text-sm text-gray-500">Adding context helps find more relevant matches</p>
                </div>
              </div>

              {/* Live Analysis Preview */}
              {liveProfile && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-blue-800 mb-2">Product Analysis</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-blue-600">Brand:</span>{" "}
                      <span className="font-medium">{liveProfile.brand}</span>
                    </div>
                    <div>
                      <span className="text-blue-600">Confidence:</span>{" "}
                      <span
                        className={`font-medium ${
                          liveProfile.confidence === "high"
                            ? "text-green-600"
                            : liveProfile.confidence === "medium"
                            ? "text-yellow-600"
                            : "text-gray-600"
                        }`}
                      >
                        {liveProfile.confidence}
                      </span>
                    </div>
                    <div>
                      <span className="text-blue-600">Technology:</span>{" "}
                      <span className="font-medium">{liveProfile.technologyClass.replace(/_/g, " ")}</span>
                    </div>
                    <div>
                      <span className="text-blue-600">Role:</span>{" "}
                      <span className="font-medium">{liveProfile.role}</span>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{error}</div>
              )}

              <button
                type="submit"
                disabled={!competitorInput.trim()}
                className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Find WyreStorm Alternatives
              </button>
            </form>
          </div>
        )}

        {/* Analyzing State */}
        {state === "analyzing" && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-600">Checking specifications...</p>
          </div>
        )}

        {/* Results */}
        {state === "results" && result && (
          <div className="space-y-6">
            {/* Competitor Analysis Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {result.competitor.brand} {result.competitor.sku}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {(result.competitor.domain || "type unverified").toString().replace(/_/g, " ")} •{" "}
                    {result.competitor.role || "role unverified"}
                    {result.competitor.maxResolution ? ` • ${result.competitor.maxResolution}` : ""}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium border ${
                    result.competitor.specTier === "verified-profile"
                      ? "bg-green-100 text-green-800 border-green-200"
                      : result.competitor.specTier === "family-rule"
                      ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                      : "bg-gray-100 text-gray-700 border-gray-200"
                  }`}
                >
                  {result.competitor.specTier === "verified-profile"
                    ? "Specs from datasheet"
                    : result.competitor.specTier === "family-rule"
                    ? "Family-rule estimate"
                    : "SKU only"}
                </span>
              </div>

              {/* Relevance Notice */}
              <div
                className={`p-3 rounded-lg mb-4 ${
                  result.isRelevant ? "bg-green-50 border border-green-200" : "bg-yellow-50 border border-yellow-200"
                }`}
              >
                <p className={`text-sm ${result.isRelevant ? "text-green-700" : "text-yellow-700"}`}>
                  {result.relevanceReason}
                </p>
              </div>

              {/* Recommendation */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-blue-900">Recommendation</h3>
                  {result.topOutcome !== "NONE" && (
                    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${OUTCOME_STYLES[result.topOutcome]}`}>
                      {result.topOutcome}
                    </span>
                  )}
                </div>
                <p className="text-blue-800">{result.recommendation}</p>
              </div>
            </div>

            {/* Match Results */}
            {result.matches.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">WyreStorm Alternatives</h2>
                <div className="space-y-4">
                  {result.matches.map((match, index) => (
                    <MatchCard key={match.sku} match={match} rank={index + 1} />
                  ))}
                </div>
              </div>
            )}

            {/* Rejected (NO MATCH) candidates */}
            {result.rejected.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Not equivalent</h2>
                <p className="text-sm text-gray-500 mb-4">
                  These were considered but ruled out by a blocking class, role, transport, capacity or feature difference.
                </p>
                <div className="space-y-3">
                  {result.rejected.map((match) => (
                    <div key={match.sku} className="border border-red-100 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900">{match.sku}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${OUTCOME_STYLES["NO MATCH"]}`}>
                          NO MATCH
                        </span>
                      </div>
                      {match.decision.blockers.length > 0 && (
                        <p className="text-sm text-red-700 mt-1">{match.decision.blockers[0]}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Next Steps */}
            {result.nextSteps.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Next Steps</h2>
                <ul className="space-y-2">
                  {result.nextSteps.map((step, i) => (
                    <li key={i} className="flex items-start">
                      <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium mr-3 flex-shrink-0">
                        {i + 1}
                      </span>
                      <span className="text-gray-700">{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-4">
              <button
                onClick={handleReset}
                className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 font-medium rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              >
                Compare Another Product
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ListBlock({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "good" | "gap" | "blocker" | "verify";
}) {
  if (items.length === 0) return null;

  const toneClass =
    tone === "good"
      ? "text-green-700"
      : tone === "blocker"
      ? "text-red-700"
      : tone === "gap"
      ? "text-amber-700"
      : "text-yellow-700";

  return (
    <div>
      <h4 className="text-sm font-medium text-gray-700 mb-1">{title}</h4>
      <ul className={`text-sm space-y-1 ${toneClass}`}>
        {items.map((item, i) => (
          <li key={i} className="flex items-start">
            <span className="mr-2">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MatchCard({ match, rank }: { match: RigorousMatch; rank: number }) {
  const [expanded, setExpanded] = useState(rank === 1);
  const { decision } = match;

  return (
    <div className={`border rounded-lg overflow-hidden ${rank === 1 ? "border-blue-300 bg-blue-50/30" : "border-gray-200"}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center space-x-4">
          <span
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              rank === 1 ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"
            }`}
          >
            {rank}
          </span>
          <div>
            <h3 className="font-semibold text-gray-900">{match.sku}</h3>
            <p className="text-sm text-gray-500">{match.family}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <span className="text-xs text-gray-400">{decision.confidence}%</span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium border ${OUTCOME_STYLES[decision.outcome]}`}>
            {decision.outcome}
          </span>
          <svg
            className={`w-5 h-5 text-gray-400 transform transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100">
          <div className="pt-4 space-y-3">
            <p className="text-gray-700">{match.name}</p>
            <p className="text-sm text-gray-600">{decision.summary}</p>
            <ListBlock title="Confirmed matches" items={decision.matches} tone="good" />
            <ListBlock title="Blocking differences" items={decision.blockers} tone="blocker" />
            <ListBlock title="Gaps to explain" items={decision.gaps} tone="gap" />
            <ListBlock title="Verify before quoting" items={decision.verify} tone="verify" />
            <div className="text-sm text-gray-700 bg-gray-50 rounded-md p-3">
              <span className="font-medium">Next action: </span>
              {decision.nextAction}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
