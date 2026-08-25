import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import type { StoredProductFamilyScore, StoredProductSelection, StoredRecommendationEvidence } from "../../data/projectStore";

export function RecommendationEvidencePanel({ evidence, productFamilyScores, selectedProducts }: {
  evidence: StoredRecommendationEvidence | null;
  productFamilyScores: StoredProductFamilyScore[];
  selectedProducts: StoredProductSelection[];
}) {
  const [activeTab, setActiveTab] = useState<"overview" | "families" | "dependencies" | "evidence">("overview");
  if (!evidence) return <div className="rounded-2xl border p-6 text-sm wm-ui-card wm-ui-copy">No recommendation evidence captured yet. Run Discovery or Finder to generate evidence.</div>;
  const tabs = [
    { key: "overview" as const, label: "Overview" },
    { key: "families" as const, label: `Families (${productFamilyScores.length})` },
    { key: "dependencies" as const, label: `Dependencies (${evidence.requiredDependencies.length})` },
    { key: "evidence" as const, label: `Evidence (${evidence.evidenceUsed.length})` },
  ];
  return <div>
    <div className="mb-4 flex flex-wrap items-center gap-3"><span className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-black ${evidence.quoteSafetyStatus === "quote-ready" ? "bg-emerald-900/60 text-emerald-300" : evidence.quoteSafetyStatus === "validate-before-quote" ? "bg-amber-900/60 text-amber-300" : "bg-rose-900/60 text-rose-300"}`}>{evidence.quoteSafetyStatus === "quote-ready" ? "Quote-ready" : evidence.quoteSafetyStatus === "validate-before-quote" ? "Validate before quote" : "Do not quote yet"}</span>{evidence.productDirection ? <span className="text-sm text-[#8fb8d0] wm-ui-copy">{evidence.productDirection}</span> : null}</div>
    <div className="mb-4 flex gap-1 rounded-xl border border-white/[0.06] bg-white/[0.02] p-1">{tabs.map((tab) => <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)} className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold transition ${activeTab === tab.key ? "bg-[#0d2133] text-[#edf6ff]" : "text-[#8fb8d0] hover:text-[#cfe6f7]"}`}>{tab.label}</button>)}</div>
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
      {activeTab === "overview" ? <div className="grid gap-4 lg:grid-cols-2"><div><p className="text-xs font-black uppercase tracking-[0.14em] wm-ui-copy wm-ui-kicker">Quote safety</p><p className="mt-2 text-sm leading-6 text-[#cfe6f7] wm-ui-copy">{evidence.quoteSafetyMessage}</p><p className="mt-2 text-xs text-[#8fb8d0] wm-ui-copy">{evidence.nextBestQuestion}</p></div><div><p className="text-xs font-black uppercase tracking-[0.14em] wm-ui-copy wm-ui-kicker">Selected products</p><div className="mt-2 flex flex-wrap gap-2">{selectedProducts.length ? selectedProducts.map((product) => <span key={product.sku} className="inline-flex items-center gap-1 rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1 text-xs font-bold text-[#edf6ff]">{product.sku}</span>) : <span className="text-xs text-[#6a97b0] wm-ui-copy">No products selected</span>}</div></div></div>
      : activeTab === "families" ? <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{productFamilyScores.length ? productFamilyScores.map((score) => <div key={score.family} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"><div className="flex items-center justify-between"><span className="text-sm font-black text-[#edf6ff]">{score.family}</span><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${score.score >= 70 ? "bg-emerald-900/60 text-emerald-300" : score.score >= 40 ? "bg-amber-900/60 text-amber-300" : "bg-rose-900/60 text-rose-300"}`}>{score.score}/100</span></div>{score.reasons[0] ? <p className="mt-1 text-[11px] leading-4 text-[#8fb8d0] wm-ui-copy line-clamp-2">{score.reasons[0]}</p> : null}</div>) : <p className="col-span-full text-xs text-[#6a97b0] wm-ui-copy">No family scores captured</p>}</div>
      : activeTab === "dependencies" ? <div className="grid gap-2">{evidence.requiredDependencies.length ? evidence.requiredDependencies.slice(0, 6).map((dependency) => <div key={dependency} className="flex items-start gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-400"/><span className="text-xs leading-5 text-[#cfe6f7] wm-ui-copy">{dependency}</span></div>) : <p className="text-xs text-[#6a97b0] wm-ui-copy">No governed dependencies captured</p>}</div>
      : <div className="grid gap-1">{evidence.evidenceUsed.length ? evidence.evidenceUsed.slice(0, 6).map((item) => <p key={item} className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-[11px] leading-4 text-[#cfe6f7] wm-ui-copy">{item}</p>) : <p className="text-xs text-[#6a97b0] wm-ui-copy">No evidence captured</p>}</div>}
    </div>
  </div>;
}
