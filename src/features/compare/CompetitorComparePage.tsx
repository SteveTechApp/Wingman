import * as React from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowRight, CheckCircle2, ChevronDown, Scale, Search, X } from "lucide-react";

import {
  areProductTypesCompatible,
  classifyCatalogProduct,
  findCatalogProductBySku,
  getCatalogProducts,
  type CatalogPortCount,
  type CatalogProduct,
} from "@/catalog";
import { getCompetitorProducts, type CompetitorProduct } from "@/competitor/repository";
import {
  applyCompareToProject,
  createProject,
  ensureActiveProject,
  getActiveProject,
  setActiveProjectId,
  type CompareConfidence,
} from "@/features/projects/projectStore";
import {
  type CompetitorComparisonRecord,
  findComparisonRecordById,
  getComparisonRecords,
  lookupAndCompare,
  mergeComparisonRecords,
  searchComparisonRecords,
  toProjectCompareRecord,
} from "@/services/competitorComparisonService";
import { buildAvSignalProfile, evaluateAvCompatibility } from "@/services/avLogicEngine";
import {
  buildProductEvidenceDigest,
  fetchLiveProductEvidence,
  getProductPageEvidenceEndpoint,
  type ProductEvidenceDigest,
} from "@/services/liveProductEvidenceService";
import CollapsibleCard from "@/ui2/components/CollapsibleCard";

type LookupUiState = {
  status: "idle" | "loading" | "ready" | "empty" | "failed";
  message: string;
  warnings: string[];
};

type SimpleComparisonSummary = {
  answer: string;
  matchPercent: number;
  positives: string[];
  negatives: string[];
};

type MatrixTone = "good" | "warn" | "neutral";

type FeatureMatrixRow = {
  label: string;
  competitor: string;
  wyrestorm: string;
  tone: MatrixTone;
};

type CloseWyrestormMatch = {
  sku: string;
  name: string;
  category: string;
  matchPercent: number;
  isPrimary: boolean;
};

type ComparisonEvidenceState = {
  competitor: ProductEvidenceDigest | null;
  wyrestorm: ProductEvidenceDigest | null;
  warnings: string[];
};

function normalizeId(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_\-/]+/g, "");
}

function normalizeSku(value: string): string {
  return value.trim().toUpperCase();
}

function toTokens(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .map((item) => item.trim())
    .filter((item) => item.length > 2);
}

function hasTokenOverlap(left: string, right: string): boolean {
  const leftTokens = new Set(toTokens(left));
  if (leftTokens.size === 0) return false;
  for (const token of toTokens(right)) {
    if (leftTokens.has(token)) return true;
  }
  return false;
}

function listOrDash(items?: string[]): string {
  const values = (items ?? []).map((item) => item.trim()).filter(Boolean);
  return values.length > 0 ? values.slice(0, 5).join(", ") : "-";
}

function formatPorts(ports?: CatalogPortCount[]): string {
  const values = (ports ?? [])
    .map((port) => {
      const type = String(port.type ?? "").trim();
      const count = Number(port.count ?? 0);
      if (!type) return "";
      return `${type}${count > 0 ? ` x${count}` : ""}`;
    })
    .filter(Boolean);

  return values.length > 0 ? values.join(", ") : "-";
}

function formatVideo(video?: CatalogProduct["video"]): string {
  if (!video) return "-";
  const parts = [
    video.maxResolution,
    video.hdmi ? `HDMI ${video.hdmi}` : "",
    typeof video.bandwidthGbps === "number" ? `${video.bandwidthGbps} Gbps` : "",
    video.hdr ? "HDR" : "",
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" • ") : "-";
}

function resolveMatrixTone(competitor: string, wyrestorm: string): MatrixTone {
  if (competitor === "-" || wyrestorm === "-") return "neutral";
  if (normalizeId(competitor) === normalizeId(wyrestorm)) return "good";
  if (hasTokenOverlap(competitor, wyrestorm)) return "good";
  return "warn";
}

function buildFeatureMatrixRows(
  selected: CompetitorComparisonRecord,
  competitor: CompetitorProduct | null,
  wyrestorm: CatalogProduct | undefined,
): FeatureMatrixRow[] {
  const competitorCategory = competitor
    ? [competitor.family, competitor.category, competitor.subcategory].filter(Boolean).join(" / ")
    : selected.category || "-";
  const wyrestormCategory = wyrestorm
    ? [wyrestorm.family, wyrestorm.category, wyrestorm.subcategory].filter(Boolean).join(" / ")
    : selected.wyrestormCategory || "-";

  const rows: FeatureMatrixRow[] = [
    {
      label: "Category",
      competitor: competitorCategory || "-",
      wyrestorm: wyrestormCategory || "-",
      tone: resolveMatrixTone(competitorCategory, wyrestormCategory),
    },
    {
      label: "Transport",
      competitor: competitor?.transport || "-",
      wyrestorm: wyrestorm?.transport || "-",
      tone: resolveMatrixTone(competitor?.transport || "-", wyrestorm?.transport || "-"),
    },
    {
      label: "Video capability",
      competitor: formatVideo(competitor?.video),
      wyrestorm: formatVideo(wyrestorm?.video),
      tone: resolveMatrixTone(formatVideo(competitor?.video), formatVideo(wyrestorm?.video)),
    },
    {
      label: "Inputs",
      competitor: formatPorts(competitor?.inputs),
      wyrestorm: formatPorts(wyrestorm?.inputs),
      tone: resolveMatrixTone(formatPorts(competitor?.inputs), formatPorts(wyrestorm?.inputs)),
    },
    {
      label: "Outputs",
      competitor: formatPorts(competitor?.outputs),
      wyrestorm: formatPorts(wyrestorm?.outputs),
      tone: resolveMatrixTone(formatPorts(competitor?.outputs), formatPorts(wyrestorm?.outputs)),
    },
    {
      label: "Control",
      competitor: listOrDash(competitor?.control),
      wyrestorm: listOrDash(wyrestorm?.control),
      tone: resolveMatrixTone(listOrDash(competitor?.control), listOrDash(wyrestorm?.control)),
    },
    {
      label: "Key features",
      competitor: listOrDash(competitor?.features?.length ? competitor.features : selected.features),
      wyrestorm: listOrDash(wyrestorm?.features),
      tone: resolveMatrixTone(
        listOrDash(competitor?.features?.length ? competitor.features : selected.features),
        listOrDash(wyrestorm?.features),
      ),
    },
  ];

  return rows;
}

function scoreCloseMatchCandidate(
  candidate: CatalogProduct,
  selected: CompetitorComparisonRecord,
  competitor: CompetitorProduct | null,
): number {
  const requestedType = classifyCatalogProduct(
    competitor ?? {
      sku: selected.competitorSku,
      name: selected.competitorName,
      category: selected.category,
      summary: selected.summary,
      transport: selected.category.toLowerCase().includes("avoip") ? "AVoIP" : undefined,
      features: selected.features,
    },
  );
  const candidateType = classifyCatalogProduct(candidate);
  if (!areProductTypesCompatible(requestedType, candidateType)) return 0;

  const avAssessment = evaluateAvCompatibility(
    buildAvSignalProfile(
      competitor ?? {
        sku: selected.competitorSku,
        name: selected.competitorName,
        category: selected.category,
        summary: selected.summary,
        transport: selected.category.toLowerCase().includes("avoip") ? "AVoIP" : undefined,
        features: selected.features,
      },
    ),
    buildAvSignalProfile(candidate),
  );

  if (!avAssessment.compatible) return 0;

  let score = 0;
  const candidateCategory = `${candidate.family} ${candidate.category} ${candidate.subcategory || ""}`;
  score += avAssessment.scoreDelta;

  if (normalizeSku(candidate.sku) === normalizeSku(selected.wyrestormSku)) score += 45;
  if (hasTokenOverlap(selected.category, candidateCategory)) score += 22;
  if (competitor && hasTokenOverlap(`${competitor.family} ${competitor.category}`, candidateCategory)) score += 18;
  if (competitor?.transport && candidate.transport && normalizeId(competitor.transport) === normalizeId(candidate.transport)) score += 10;

  const candidateTags = new Set([
    ...toTokens(candidateCategory),
    ...toTokens(candidate.summary || ""),
    ...toTokens((candidate.features ?? []).join(" ")),
    ...toTokens((candidate.control ?? []).join(" ")),
    ...toTokens((candidate.audio ?? []).join(" ")),
  ]);

  const competitorTerms = [
    ...toTokens(selected.summary),
    ...toTokens(selected.category),
    ...toTokens(selected.features.join(" ")),
    ...toTokens(competitor?.summary || ""),
  ];

  let overlap = 0;
  for (const token of competitorTerms) {
    if (candidateTags.has(token)) overlap += 1;
  }

  score += Math.min(28, overlap * 3);
  if (candidate.status === "active") score += 5;

  return Math.max(0, Math.min(100, score));
}

function buildCloseWyrestormMatches(
  selected: CompetitorComparisonRecord,
  competitor: CompetitorProduct | null,
  limit = 4,
): CloseWyrestormMatch[] {
  const catalog = getCatalogProducts();
  const ranked = catalog
    .map((product) => ({
      product,
      score: scoreCloseMatchCandidate(product, selected, competitor),
    }))
    .filter((item) => item.score > 18)
    .sort((a, b) => b.score - a.score || a.product.sku.localeCompare(b.product.sku))
    .slice(0, limit);

  if (ranked.length === 0) return [];

  return ranked.map(({ product, score }) => ({
    sku: product.sku,
    name: product.name,
    category: [product.family, product.category, product.subcategory].filter(Boolean).join(" / "),
    matchPercent:
      normalizeSku(product.sku) === normalizeSku(selected.wyrestormSku) && typeof selected.matchScore === "number"
        ? Math.max(0, Math.min(100, selected.matchScore))
        : Math.max(20, Math.min(96, score)),
    isPrimary: normalizeSku(product.sku) === normalizeSku(selected.wyrestormSku),
  }));
}

function buildCompetitorEvidenceFromSelection(
  selected: CompetitorComparisonRecord,
  competitor: CompetitorProduct | null,
): ProductEvidenceDigest {
  if (competitor) {
    return buildProductEvidenceDigest({
      vendorType: "competitor",
      brand: competitor.brand,
      sku: competitor.sku,
      name: competitor.name,
      summary: competitor.summary,
      sourceUrl: competitor.sourceUrl,
      inputs: competitor.inputs,
      outputs: competitor.outputs,
      control: competitor.control,
      features: competitor.features,
      transport: competitor.transport,
      audio: competitor.audio,
      video: competitor.video,
    });
  }

  return buildProductEvidenceDigest({
    vendorType: "competitor",
    brand: selected.brand,
    sku: selected.competitorSku,
    name: selected.competitorName || selected.competitorSku,
    summary: selected.summary,
    features: selected.features,
    sourceUrl: selected.provenance?.sourceUrl,
  });
}

function buildWyrestormEvidenceFromSelection(
  selected: CompetitorComparisonRecord,
  wyrestorm: CatalogProduct | undefined,
): ProductEvidenceDigest {
  if (wyrestorm) {
    return buildProductEvidenceDigest({
      vendorType: "wyrestorm",
      brand: "WyreStorm",
      sku: wyrestorm.sku,
      name: wyrestorm.name,
      summary: wyrestorm.summary,
      sourceUrl: wyrestorm.sourceUrl,
      inputs: wyrestorm.inputs,
      outputs: wyrestorm.outputs,
      control: wyrestorm.control,
      features: wyrestorm.features,
      transport: wyrestorm.transport,
      audio: wyrestorm.audio,
      video: wyrestorm.video,
    });
  }

  return buildProductEvidenceDigest({
    vendorType: "wyrestorm",
    brand: "WyreStorm",
    sku: selected.wyrestormSku,
    name: selected.wyrestormName || selected.wyrestormSku,
    summary: selected.rationale,
  });
}

function recordId(item: CompetitorComparisonRecord): string {
  return `${item.brand}::${item.competitorSku}`.toLowerCase();
}

function lookupStateClass(status: LookupUiState["status"]): string {
  return `wm-compare-lookup-state is-${status}`;
}

function createIdleLookupState(message = "Enter a competitor SKU or model, then compare it to the closest WyreStorm fit."): LookupUiState {
  return {
    status: "idle",
    message,
    warnings: [],
  };
}

function fallbackMatchFromConfidence(confidence: CompareConfidence): number {
  if (confidence === "High") return 82;
  if (confidence === "Medium") return 62;
  return 38;
}

function confidenceFromMatchScore(score: number): CompareConfidence {
  if (score >= 70) return "High";
  if (score >= 45) return "Medium";
  return "Low";
}

function formatWyrestormCategory(product?: CatalogProduct): string {
  if (!product) return "-";
  return [product.family, product.category, product.subcategory]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean)
    .join(" / ");
}

function buildSimpleComparisonSummary(record: CompetitorComparisonRecord): SimpleComparisonSummary {
  const matchPercent = Math.max(
    0,
    Math.min(
      100,
      typeof record.matchScore === "number"
        ? record.matchScore
        : typeof record.intelligence?.score === "number"
          ? record.intelligence.score
          : fallbackMatchFromConfidence(record.confidence),
    ),
  );

  const positives = Array.from(
    new Set(
      [
        record.wyrestormVerified === false
          ? ""
          : `Verified WyreStorm SKU: ${record.wyrestormSku}${record.wyrestormName ? ` (${record.wyrestormName})` : ""}.`,
        record.ioComparison ? `I/O comparison: ${record.ioComparison}.` : "",
        record.rationale,
        record.features.length > 0 ? `Relevant capabilities: ${record.features.slice(0, 3).join(", ")}.` : "",
      ].filter(Boolean),
    ),
  ).slice(0, 5);

  const negatives = Array.from(
    new Set(
      [
        ...(record.wyrestormVerified === false
          ? ["No verified WyreStorm catalog SKU is confirmed yet. Manual review is required before customer-facing use."]
          : []),
        ...record.notes,
        ...(record.intelligence?.warnings ?? []),
        ...(record.intelligence?.escalationReasons ?? []),
      ].filter(Boolean),
    ),
  ).slice(0, 6);

  if (negatives.length === 0) {
    negatives.push("No major gaps were flagged in the available comparison data. Confirm against current datasheets before quoting.");
  }

  return {
    answer: `${record.wyrestormSku} (${record.wyrestormCategory})`,
    matchPercent,
    positives,
    negatives,
  };
}

function confidenceTone(confidence: CompareConfidence) {
  if (confidence === "High") {
    return {
      borderColor: "rgba(92, 214, 148, 0.38)",
      background: "rgba(38, 142, 89, 0.18)",
      color: "rgba(226, 255, 238, 0.96)",
    };
  }

  if (confidence === "Medium") {
    return {
      borderColor: "rgba(94, 190, 255, 0.34)",
      background: "rgba(52, 112, 190, 0.16)",
      color: "rgba(229, 242, 255, 0.96)",
    };
  }

  return {
    borderColor: "rgba(255, 184, 107, 0.38)",
    background: "rgba(185, 110, 41, 0.18)",
    color: "rgba(255, 235, 208, 0.96)",
  };
}

function matchTone(score: number) {
  const fillGradient =
    "linear-gradient(90deg, rgba(141,149,163,0.96) 0%, rgba(96,162,255,0.98) 22%, rgba(61,210,145,0.98) 44%, rgba(245,223,92,0.98) 66%, rgba(255,156,67,0.98) 84%, rgba(255,92,76,1) 100%)";

  if (score >= 90) {
    return {
      borderColor: "rgba(255, 92, 76, 0.48)",
      glow: "radial-gradient(circle at top, rgba(255, 92, 76, 0.28), rgba(10, 18, 30, 0.9) 70%)",
      text: "rgba(255, 238, 234, 0.99)",
      accent: "rgba(255, 117, 92, 0.98)",
      fillGradient,
      label: "Red hot",
      labelBorder: "rgba(255, 92, 76, 0.42)",
      labelBackground: "rgba(182, 57, 42, 0.18)",
      shadow: "rgba(255, 92, 76, 0.3)",
    };
  }

  if (score >= 75) {
    return {
      borderColor: "rgba(255, 156, 67, 0.44)",
      glow: "radial-gradient(circle at top, rgba(255, 156, 67, 0.26), rgba(10, 18, 30, 0.9) 70%)",
      text: "rgba(255, 244, 231, 0.98)",
      accent: "rgba(255, 173, 84, 0.98)",
      fillGradient,
      label: "Hot",
      labelBorder: "rgba(255, 156, 67, 0.36)",
      labelBackground: "rgba(168, 100, 36, 0.18)",
      shadow: "rgba(255, 156, 67, 0.28)",
    };
  }

  if (score >= 60) {
    return {
      borderColor: "rgba(245, 223, 92, 0.42)",
      glow: "radial-gradient(circle at top, rgba(245, 223, 92, 0.24), rgba(10, 18, 30, 0.9) 70%)",
      text: "rgba(255, 251, 226, 0.98)",
      accent: "rgba(245, 223, 92, 0.98)",
      fillGradient,
      label: "Warm",
      labelBorder: "rgba(245, 223, 92, 0.34)",
      labelBackground: "rgba(159, 141, 35, 0.18)",
      shadow: "rgba(245, 223, 92, 0.26)",
    };
  }

  if (score >= 45) {
    return {
      borderColor: "rgba(61, 210, 145, 0.42)",
      glow: "radial-gradient(circle at top, rgba(61, 210, 145, 0.24), rgba(10, 18, 30, 0.9) 70%)",
      text: "rgba(231, 255, 241, 0.98)",
      accent: "rgba(61, 210, 145, 0.98)",
      fillGradient,
      label: "Balanced",
      labelBorder: "rgba(61, 210, 145, 0.34)",
      labelBackground: "rgba(38, 142, 89, 0.18)",
      shadow: "rgba(61, 210, 145, 0.26)",
    };
  }

  if (score >= 20) {
    return {
      borderColor: "rgba(96, 162, 255, 0.42)",
      glow: "radial-gradient(circle at top, rgba(96, 162, 255, 0.24), rgba(10, 18, 30, 0.9) 70%)",
      text: "rgba(232, 243, 255, 0.98)",
      accent: "rgba(96, 162, 255, 0.98)",
      fillGradient,
      label: "Cool",
      labelBorder: "rgba(96, 162, 255, 0.34)",
      labelBackground: "rgba(44, 97, 178, 0.18)",
      shadow: "rgba(96, 162, 255, 0.26)",
    };
  }

  return {
    borderColor: "rgba(141, 149, 163, 0.42)",
    glow: "radial-gradient(circle at top, rgba(141, 149, 163, 0.22), rgba(10, 18, 30, 0.9) 70%)",
    text: "rgba(237, 240, 246, 0.96)",
    accent: "rgba(176, 183, 194, 0.96)",
    fillGradient,
    label: "Cold",
    labelBorder: "rgba(141, 149, 163, 0.34)",
    labelBackground: "rgba(78, 85, 96, 0.2)",
    shadow: "rgba(141, 149, 163, 0.2)",
  };
}

function pickQuickExamples(records: CompetitorComparisonRecord[]): CompetitorComparisonRecord[] {
  const picks: CompetitorComparisonRecord[] = [];
  const seenBrands = new Set<string>();

  for (const record of records) {
    if (seenBrands.has(record.brand.toLowerCase())) continue;
    picks.push(record);
    seenBrands.add(record.brand.toLowerCase());
    if (picks.length === 4) break;
  }

  return picks;
}

function QuickChoiceButton({
  item,
  detail,
  active,
  onSelect,
}: {
  item: CompetitorComparisonRecord;
  detail?: string;
  active: boolean;
  onSelect: (item: CompetitorComparisonRecord) => void;
}) {
  return (
    <button
      type="button"
      className={`wm-compare-simple__choice-button${active ? " is-active" : ""}`}
      onClick={() => onSelect(item)}
    >
      {item.brand} {item.competitorSku}
      {detail ? <span className="wm-compare-simple__choice-detail">{detail}</span> : null}
    </button>
  );
}

function InsightList({
  items,
  tone,
}: {
  items: string[];
  tone: "good" | "warn";
}) {
  const isGood = tone === "good";
  const Icon = isGood ? CheckCircle2 : AlertTriangle;

  return (
    <div className="wm-compare-simple__insight-list">
      {items.map((item) => (
        <div
          key={item}
          className={`wm-compare-simple__insight-item wm-compare-simple__insight-item--${tone}`}
        >
          <span className="wm-compare-simple__insight-icon">
            <Icon size={15} />
          </span>
          <span>{item}</span>
        </div>
      ))}
    </div>
  );
}

function CollapsibleSection({
  title,
  subtitle,
  meta,
  defaultOpen = false,
  children,
}: {
  title: string;
  subtitle: string;
  meta?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  const panelId = React.useId();

  return (
    <article className="wm-card wm-compare-simple__fold-card">
      <button
        type="button"
        className="wm-compare-simple__fold-toggle"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls={panelId}
      >
        <span className="wm-compare-simple__fold-copy">
          <span className="wm-card__title">{title}</span>
          <span className="wm-card__subtitle">{subtitle}</span>
        </span>

        <span className="wm-compare-simple__fold-actions">
          {meta ? <span className="wm-chip">{meta}</span> : null}
          <span className={`wm-compare-simple__fold-chevron${open ? " is-open" : ""}`}>
            <ChevronDown size={16} />
          </span>
        </span>
      </button>

      {open ? (
        <div id={panelId} className="wm-compare-simple__fold-body">
          {children}
        </div>
      ) : null}
    </article>
  );
}

export default function CompetitorComparePage() {
  const nav = useNavigate();
  const activeProject = getActiveProject();

  const curatedRecords = React.useMemo(() => getComparisonRecords(), []);
  const quickExamples = React.useMemo(() => pickQuickExamples(curatedRecords), [curatedRecords]);

  const [records, setRecords] = React.useState<CompetitorComparisonRecord[]>(curatedRecords);
  const [query, setQuery] = React.useState("");
  const [selectedId, setSelectedId] = React.useState("");
  const [selectedWyrestormSku, setSelectedWyrestormSku] = React.useState("");
  const [lookupState, setLookupState] = React.useState<LookupUiState>(() => createIdleLookupState());
  const [liveEvidence, setLiveEvidence] = React.useState<ComparisonEvidenceState>({
    competitor: null,
    wyrestorm: null,
    warnings: [],
  });
  const [liveEvidenceBusy, setLiveEvidenceBusy] = React.useState(false);
  const [liveEvidenceError, setLiveEvidenceError] = React.useState("");
  const liveEvidenceEndpoint = React.useMemo(() => getProductPageEvidenceEndpoint(), []);

  const hasQuery = query.trim().length > 0;
  const savedMatches = React.useMemo(
    () => (hasQuery ? searchComparisonRecords(records, query).slice(0, 4) : []),
    [hasQuery, query, records],
  );

  const selected = React.useMemo(
    () => (selectedId ? findComparisonRecordById(records, selectedId) : null),
    [records, selectedId],
  );
  const baseSummary = React.useMemo(
    () => (selected ? buildSimpleComparisonSummary(selected) : null),
    [selected],
  );
  const competitorReference = React.useMemo(() => {
    if (!selected) return null;
    const selectedBrand = normalizeId(selected.brand);
    const selectedSku = normalizeSku(selected.competitorSku);
    return (
      getCompetitorProducts().find(
        (item) =>
          normalizeSku(item.sku) === selectedSku &&
          (!selectedBrand || normalizeId(String(item.brand || "")) === selectedBrand),
      ) ?? null
    );
  }, [selected]);
  const closeWyrestormMatches = React.useMemo(
    () => (selected ? buildCloseWyrestormMatches(selected, competitorReference) : []),
    [competitorReference, selected],
  );

  React.useEffect(() => {
    if (!selected) {
      setSelectedWyrestormSku("");
      return;
    }

    if (closeWyrestormMatches.length > 0) {
      setSelectedWyrestormSku((current) => {
        const normalizedCurrent = normalizeSku(current);
        const existing = closeWyrestormMatches.find((item) => normalizeSku(item.sku) === normalizedCurrent);
        return existing ? existing.sku : closeWyrestormMatches[0].sku;
      });
      return;
    }

    setSelectedWyrestormSku(selected.wyrestormSku);
  }, [closeWyrestormMatches, selected]);

  const activeWyrestormMatch = React.useMemo(() => {
    if (!selected) return null;

    if (closeWyrestormMatches.length > 0) {
      const normalizedSelectedSku = normalizeSku(selectedWyrestormSku);
      return (
        closeWyrestormMatches.find((item) => normalizeSku(item.sku) === normalizedSelectedSku) ??
        closeWyrestormMatches[0]
      );
    }

    return {
      sku: selected.wyrestormSku,
      name: selected.wyrestormName || selected.wyrestormSku,
      category: selected.wyrestormCategory,
      matchPercent:
        baseSummary?.matchPercent ??
        fallbackMatchFromConfidence(selected.confidence),
      isPrimary: true,
    } satisfies CloseWyrestormMatch;
  }, [baseSummary?.matchPercent, closeWyrestormMatches, selected, selectedWyrestormSku]);

  const activeWyrestormProduct = React.useMemo(() => {
    if (!activeWyrestormMatch) return undefined;
    return findCatalogProductBySku(activeWyrestormMatch.sku);
  }, [activeWyrestormMatch]);

  const activeComparisonRecord = React.useMemo(() => {
    if (!selected || !activeWyrestormMatch) return null;

    const isSameSku =
      normalizeSku(activeWyrestormMatch.sku) === normalizeSku(selected.wyrestormSku);
    if (isSameSku) {
      return {
        ...selected,
        matchScore: activeWyrestormMatch.matchPercent,
      };
    }

    const product = activeWyrestormProduct;
    if (!product) {
      return {
        ...selected,
        wyrestormSku: activeWyrestormMatch.sku,
        wyrestormName: activeWyrestormMatch.name || selected.wyrestormName,
        wyrestormCategory: activeWyrestormMatch.category || selected.wyrestormCategory,
        wyrestormVerified: false,
        matchScore: activeWyrestormMatch.matchPercent,
        confidence: confidenceFromMatchScore(activeWyrestormMatch.matchPercent),
        rationale: `Alternative match selected: ${activeWyrestormMatch.sku}.`,
      };
    }

    return {
      ...selected,
      wyrestormSku: product.sku,
      wyrestormName: product.name,
      wyrestormCategory: formatWyrestormCategory(product),
      wyrestormVerified: true,
      matchScore: activeWyrestormMatch.matchPercent,
      confidence: confidenceFromMatchScore(activeWyrestormMatch.matchPercent),
      rationale: `Alternative match selected: ${product.sku} (${activeWyrestormMatch.matchPercent}% fit).`,
      notes: Array.from(
        new Set([
          ...selected.notes,
          `Alternative match selected: ${product.sku} (${activeWyrestormMatch.matchPercent}% fit).`,
        ]),
      ).slice(0, 10),
    };
  }, [activeWyrestormMatch, activeWyrestormProduct, selected]);

  const simpleSummary = React.useMemo(
    () => (activeComparisonRecord ? buildSimpleComparisonSummary(activeComparisonRecord) : null),
    [activeComparisonRecord],
  );

  const featureMatrixRows = React.useMemo(
    () => (activeComparisonRecord ? buildFeatureMatrixRows(activeComparisonRecord, competitorReference, activeWyrestormProduct) : []),
    [activeComparisonRecord, activeWyrestormProduct, competitorReference],
  );

  const compareFactors = React.useMemo(() => {
    if (!activeComparisonRecord) return [];

    return [
      `Category mapped as ${activeComparisonRecord.category}.`,
      activeComparisonRecord.ioComparison || "I/O alignment scored from published inputs and outputs.",
      activeComparisonRecord.features.length > 0
        ? `Feature overlap based on ${activeComparisonRecord.features.slice(0, 4).join(", ")}.`
        : "Feature overlap based on the available catalog record.",
      activeComparisonRecord.provenance
        ? `Source: ${activeComparisonRecord.provenance.label}${activeComparisonRecord.provenance.cacheHit ? " (cached)" : ""}.`
        : "Source: curated comparison catalog.",
    ];
  }, [activeComparisonRecord]);

  React.useEffect(() => {
    if (!selected) {
      setLiveEvidence({ competitor: null, wyrestorm: null, warnings: [] });
      setLiveEvidenceError("");
      return;
    }

    const competitorDigest = buildCompetitorEvidenceFromSelection(selected, competitorReference);
    const wyrestormDigest = buildWyrestormEvidenceFromSelection(
      activeComparisonRecord ?? selected,
      activeWyrestormProduct,
    );

    setLiveEvidence({
      competitor: competitorDigest,
      wyrestorm: wyrestormDigest,
      warnings: [...competitorDigest.warnings, ...wyrestormDigest.warnings].filter(Boolean),
    });
    setLiveEvidenceError("");
  }, [activeComparisonRecord, activeWyrestormProduct, competitorReference, selected]);

  const resetSelection = (value: string) => {
    setQuery(value);
    setSelectedId("");
    setSelectedWyrestormSku("");
    setLookupState(
      value.trim()
        ? createIdleLookupState("Press Compare to run a fresh lookup, or choose a saved match below.")
        : createIdleLookupState(),
    );
  };

  const clearLookup = () => {
    resetSelection("");
  };

  const selectRecord = (item: CompetitorComparisonRecord, message = "Showing saved comparison record.") => {
    setQuery(`${item.brand} ${item.competitorSku}`);
    setSelectedId(recordId(item));
    setSelectedWyrestormSku("");
    setLookupState({
      status: "ready",
      message,
      warnings: [],
    });
  };

  const applyToActiveProject = () => {
    if (!activeComparisonRecord) return;

    const active = ensureActiveProject({
      customer: activeProject?.customer || "Sample customer",
      site: activeProject?.site || "",
      roomName: activeProject?.roomName || "Replacement Opportunity",
      stage: "Specify",
      status: activeProject?.status || "Draft",
    });

    applyCompareToProject(active.id, toProjectCompareRecord(activeComparisonRecord));
    setActiveProjectId(active.id);
    nav(`/app/projects/${encodeURIComponent(active.id)}`);
  };

  const createReplacementProject = () => {
    if (!activeComparisonRecord) return;

    const payload = toProjectCompareRecord(activeComparisonRecord);
    const created = createProject({
      name: `${activeComparisonRecord.brand} ${activeComparisonRecord.competitorSku} replacement`,
      customer: activeProject?.customer || "Sample customer",
      site: activeProject?.site || "",
      roomName: "Replacement Opportunity",
      stage: "Specify",
      status: "Draft",
      notes: `${activeComparisonRecord.summary}\n\nRationale: ${activeComparisonRecord.rationale}`,
      compare: payload,
      discovery: {
        customer: activeProject?.customer || "Sample customer",
        site: activeProject?.site || "",
        roomName: "Replacement Opportunity",
        applicationType: activeComparisonRecord.category,
        notes: `${activeComparisonRecord.summary}\n\nRationale: ${activeComparisonRecord.rationale}`,
        recommendedFamilies: activeComparisonRecord.recommendedFamilies,
        createdAt: new Date().toISOString(),
      },
    });

    setActiveProjectId(created.id);
    nav(`/app/projects/${encodeURIComponent(created.id)}`);
  };

  const refreshLiveEvidence = async () => {
    if (!selected) return;

    const competitorBase = buildCompetitorEvidenceFromSelection(selected, competitorReference);
    const wyrestormBase = buildWyrestormEvidenceFromSelection(
      activeComparisonRecord ?? selected,
      activeWyrestormProduct,
    );

    setLiveEvidenceBusy(true);
    setLiveEvidenceError("");
    try {
      const [competitorLive, wyrestormLive] = await Promise.all([
        fetchLiveProductEvidence({
          vendorType: "competitor",
          brand: competitorBase.brand,
          sku: competitorBase.sku,
          name: competitorBase.name,
          summary: competitorBase.summary,
          sourceUrl: competitorBase.sourceUrl,
          inputs: competitorReference?.inputs,
          outputs: competitorReference?.outputs,
          control: competitorReference?.control,
          features: competitorReference?.features ?? selected.features,
          transport: competitorReference?.transport,
          audio: competitorReference?.audio,
          video: competitorReference?.video,
        }),
        fetchLiveProductEvidence({
          vendorType: "wyrestorm",
          brand: "WyreStorm",
          sku: wyrestormBase.sku,
          name: wyrestormBase.name,
          summary: wyrestormBase.summary,
          sourceUrl: wyrestormBase.sourceUrl,
          inputs: activeWyrestormProduct?.inputs,
          outputs: activeWyrestormProduct?.outputs,
          control: activeWyrestormProduct?.control,
          features: activeWyrestormProduct?.features,
          transport: activeWyrestormProduct?.transport,
          audio: activeWyrestormProduct?.audio,
          video: activeWyrestormProduct?.video,
        }),
      ]);

      setLiveEvidence({
        competitor: competitorLive,
        wyrestorm: wyrestormLive,
        warnings: [...competitorLive.warnings, ...wyrestormLive.warnings].filter(Boolean),
      });
    } catch {
      setLiveEvidenceError("Unable to refresh live evidence right now.");
    } finally {
      setLiveEvidenceBusy(false);
    }
  };

  const runLookup = async () => {
    const lookupQuery = query.trim();
    if (!lookupQuery) {
      setLookupState({
        status: "empty",
        message: "Enter a competitor brand, model number, or SKU first.",
        warnings: [],
      });
      return;
    }

    setLookupState({
      status: "loading",
      message: `Comparing ${lookupQuery}...`,
      warnings: [],
    });

    try {
      const result = await lookupAndCompare(lookupQuery);
      if (result.records.length === 0) {
        setSelectedId("");
        setLookupState({
          status: "empty",
          message:
            savedMatches.length > 0
              ? `No live lookup result returned for ${lookupQuery}. A few saved comparison records are listed below.`
              : `No match returned for ${lookupQuery}.`,
          warnings: result.lookup.warnings,
        });
        return;
      }

      setRecords((current) => mergeComparisonRecords(result.records, current));
      setSelectedId(recordId(result.records[0]));

      const cacheSuffix = result.lookup.provenance.cacheHit ? " (cached)" : "";
      setLookupState({
        status: "ready",
        message: `Comparison complete via ${result.lookup.provenance.label}${cacheSuffix}.`,
        warnings: result.lookup.warnings,
      });
    } catch {
      setSelectedId("");
      setLookupState({
        status: "failed",
        message: "Lookup failed unexpectedly. You can still use saved comparison records.",
        warnings: [],
      });
    }
  };

  const matchScore = simpleSummary?.matchPercent ?? 0;
  const matchVisual = matchTone(matchScore);

  return (
    <div className="wm-page wm-compare-simple">
      <section className="wm-section wm-section--tone-cyan">
        <div className="wm-section__head">
          <div className="wm-section__titles">
            <h2>Compare a competitor SKU</h2>
            <p>
              Enter a competitor model and get the closest WyreStorm fit plus the main trade-offs.
            </p>
          </div>
        </div>

        <div className="wm-compare-simple__lookup-panel">
          <div className="wm-compare-simple__lookup-grid">
            <label className="wm-field-wrap">
              <span className="wm-label wm-compare-simple__input-label">Competitor SKU or brand / model</span>
              <div className="wm-compare-simple__search-shell">
                <Search size={20} />
                <input
                  className="wm-field wm-compare-simple__search-input"
                  value={query}
                  onChange={(e) => resetSelection(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape" && query.trim()) {
                      e.preventDefault();
                      clearLookup();
                      return;
                    }
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void runLookup();
                    }
                  }}
                  placeholder="e.g. AT-OME-MS42, DM-NVX-360, Extron DTP"
                />
                {hasQuery ? (
                  <button
                    type="button"
                    className="wm-compare-simple__clear-button"
                    onClick={clearLookup}
                    aria-label="Clear text"
                  >
                    <X size={14} />
                    <span>Clear text</span>
                  </button>
                ) : null}
              </div>
            </label>

            <button
              type="button"
              className="wm-btn wm-btn--primary wm-compare-simple__compare-button"
              onClick={() => {
                void runLookup();
              }}
              disabled={lookupState.status === "loading"}
            >
              <Scale size={16} />
              {lookupState.status === "loading" ? "Comparing..." : "Compare SKU"}
            </button>
          </div>
        </div>

        <div className={lookupStateClass(lookupState.status)}>{lookupState.message}</div>
        {lookupState.warnings.length > 0 ? (
          <div className="wm-compare-warning-list">
            {lookupState.warnings.map((warning) => (
              <div key={warning} className="wm-compare-warning-item">
                {warning}
              </div>
            ))}
          </div>
        ) : null}

        {!selected ? (
          <CollapsibleCard
            id="competitor-compare-assist"
            title="Lookup helpers"
            subtitle="Saved examples and close matches to speed up comparison."
            defaultCollapsed
          >
            <div className="wm-compare-simple__assist-row">
              <div className="wm-compare-simple__assist-group">
                <span className="wm-compare-simple__assist-label">Try</span>
                {quickExamples.map((item) => (
                  <QuickChoiceButton
                    key={recordId(item)}
                    item={item}
                    active={selected ? recordId(selected) === recordId(item) : false}
                    onSelect={(choice) => selectRecord(choice, "Showing a saved comparison example.")}
                  />
                ))}
              </div>

              {hasQuery && savedMatches.length > 0 ? (
                <div className="wm-compare-simple__assist-group">
                  <span className="wm-compare-simple__assist-label">Similar</span>
                  {savedMatches.map((item) => (
                    <QuickChoiceButton
                      key={recordId(item)}
                      item={item}
                      detail={`${buildSimpleComparisonSummary(item).matchPercent}%`}
                      active={false}
                      onSelect={(choice) => selectRecord(choice)}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </CollapsibleCard>
        ) : null}
      </section>

      {selected && simpleSummary ? (
        <section className="wm-section wm-section--tone-indigo">
          <div className="wm-section__head">
            <div className="wm-section__titles">
              <h2>Result</h2>
              <p>
                SKU fit, competitor context, and close WyreStorm alternatives based on available product data.
              </p>
            </div>
          </div>

          <article className="wm-card wm-compare-simple__result-card">
            <div className="wm-compare-simple__result-main">
              <div className="wm-compare-simple__result-pair">
                <div className="wm-compare-simple__result-endpoint">
                  <div className="wm-card__title">Competitor</div>
                  <div className="wm-title-lg">
                    {selected.brand} {selected.competitorSku}
                  </div>
                  <div className="wm-card__subtitle">
                    {selected.competitorName || selected.category}
                  </div>
                </div>

                <div className="wm-compare-simple__result-arrow" aria-hidden="true">
                  <ArrowRight size={18} />
                </div>

                <div className="wm-compare-simple__result-endpoint">
                  <div className="wm-card__title">WyreStorm</div>
                  <div className="wm-title-lg">{activeComparisonRecord?.wyrestormSku || selected.wyrestormSku}</div>
                  <div className="wm-card__subtitle">
                    {(activeComparisonRecord?.wyrestormVerified ?? selected.wyrestormVerified) === false
                      ? "Manual review required"
                      : [
                        activeComparisonRecord?.wyrestormName || selected.wyrestormName,
                        activeComparisonRecord?.wyrestormCategory || selected.wyrestormCategory,
                      ].filter(Boolean).join(" • ")}
                  </div>
                </div>
              </div>

              <div className="wm-compare-simple__result-score">
                <div
                  className="wm-compare-simple__score-ring"
                  style={{
                    borderColor: matchVisual.borderColor,
                    background: matchVisual.glow,
                    color: matchVisual.text,
                  }}
                >
                  <div className="wm-compare-simple__score-value">{matchScore}%</div>
                  <div className="wm-compare-simple__score-copy">Fit</div>
                </div>

                <span
                  className="wm-compare-simple__heat-label"
                  style={{
                    borderColor: matchVisual.labelBorder,
                    background: matchVisual.labelBackground,
                    color: matchVisual.accent,
                  }}
                >
                  {matchVisual.label}
                </span>

                <div className="wm-compare-simple__heat-track" aria-hidden="true">
                  <div
                    className="wm-compare-simple__heat-fill"
                    style={{
                      width: `${Math.max(8, matchScore)}%`,
                      background: matchVisual.fillGradient,
                      boxShadow: `0 0 22px ${matchVisual.shadow}`,
                    }}
                  />
                </div>

                <div className="wm-compare-simple__score-tags">
                  <span className={(activeComparisonRecord?.wyrestormVerified ?? selected.wyrestormVerified) === false ? "wm-chip wm-chip--warn" : "wm-chip"}>
                    {(activeComparisonRecord?.wyrestormVerified ?? selected.wyrestormVerified) === false
                      ? "Catalog SKU not verified"
                      : "Verified catalog SKU"}
                  </span>
                  <span className="wm-compare-confidence" style={confidenceTone(activeComparisonRecord?.confidence || selected.confidence)}>
                    Confidence: {activeComparisonRecord?.confidence || selected.confidence}
                  </span>
                  {activeComparisonRecord?.ioComparison ? <span className="wm-chip">{activeComparisonRecord.ioComparison}</span> : null}
                </div>
              </div>
            </div>

            <div className="wm-compare-simple__result-summary">
              <div className="wm-body-sm">{activeComparisonRecord?.rationale || selected.rationale}</div>
            </div>
          </article>

          <div className="wm-compare-simple__detail-stack">
            <CollapsibleSection
              title="Feature matrix"
              subtitle="Competitor capability summary and closest WyreStorm options."
              meta={`${featureMatrixRows.length} rows`}
              defaultOpen
            >
              <div className="wm-compare-simple__matrix-layout">
                <div className="wm-compare-simple__matrix-panel">
                  <table className="wm-compare-simple__matrix-table">
                    <thead>
                      <tr>
                        <th>Feature</th>
                        <th>Competitor</th>
                        <th>WyreStorm</th>
                      </tr>
                    </thead>
                    <tbody>
                      {featureMatrixRows.map((row) => (
                        <tr key={row.label} className={`wm-compare-simple__matrix-row is-${row.tone}`}>
                          <td>{row.label}</td>
                          <td>{row.competitor}</td>
                          <td>{row.wyrestorm}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="wm-compare-simple__matrix-panel">
                  <div className="wm-compare-simple__subhead">Close WyreStorm matches</div>
                  {closeWyrestormMatches.length > 1 ? (
                    <label className="wm-compare-simple__match-select-wrap">
                      <span className="wm-label">Active match</span>
                      <select
                        className="wm-field wm-compare-simple__match-select"
                        value={activeWyrestormMatch?.sku || ""}
                        onChange={(event) => setSelectedWyrestormSku(event.target.value)}
                      >
                        {closeWyrestormMatches.map((match) => (
                          <option key={match.sku} value={match.sku}>
                            {`${match.sku} (${match.matchPercent}%)`}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                  <div className="wm-compare-simple__match-list">
                    {closeWyrestormMatches.length > 0 ? (
                      closeWyrestormMatches.map((match) => {
                        const tone = matchTone(match.matchPercent);
                        const isActive = normalizeSku(match.sku) === normalizeSku(activeWyrestormMatch?.sku || "");
                        return (
                          <button
                            type="button"
                            key={match.sku}
                            className={`wm-compare-simple__match-item${match.isPrimary ? " is-primary" : ""}${isActive ? " is-active" : ""}`}
                            onClick={() => setSelectedWyrestormSku(match.sku)}
                            aria-pressed={isActive}
                          >
                            <div className="wm-compare-simple__match-head">
                              <div className="wm-card__title">{match.sku}</div>
                              <span
                                className="wm-compare-simple__match-percent"
                                style={{
                                  borderColor: tone.labelBorder,
                                  background: tone.labelBackground,
                                  color: tone.accent,
                                }}
                              >
                                {match.matchPercent}%
                              </span>
                            </div>
                            <div className="wm-card__subtitle">{match.name}</div>
                            <div className="wm-compare-simple__result-caption">{match.category || "-"}</div>
                          </button>
                        );
                      })
                    ) : (
                      <div className="wm-compare-simple__result-caption">
                        No close catalog matches were detected from the current lookup record.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="wm-compare-simple__result-caption">
                {competitorReference?.summary || activeComparisonRecord?.summary || selected.summary}
              </div>
            </CollapsibleSection>

            <CollapsibleSection
              title="Comparison notes"
              subtitle="Key fit signals and trade-offs."
              meta={`${simpleSummary.positives.length + simpleSummary.negatives.length} items`}
            >
              <div className="wm-compare-simple__signal-groups">
                <div className="wm-compare-simple__signal-group">
                  <div className="wm-compare-simple__subhead">Fit signals</div>
                  <InsightList items={simpleSummary.positives} tone="good" />
                </div>

                <div className="wm-compare-simple__signal-group">
                  <div className="wm-compare-simple__subhead">Trade-offs</div>
                  <InsightList items={simpleSummary.negatives} tone="warn" />
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection
              title="More detail"
              subtitle="Scoring inputs and project actions."
              meta={`${compareFactors.length} inputs`}
            >
              <div className="wm-compare-simple__detail-grid">
                <div className="wm-compare-simple__signal-group">
                  <div className="wm-compare-simple__subhead">Scoring inputs</div>
                  <div className="wm-compare-simple__result-caption">{activeComparisonRecord?.summary || selected.summary}</div>
                  <div className="wm-compare-simple__factor-list">
                    {compareFactors.map((item) => (
                      <div key={item} className="wm-compare-simple__factor-row">
                        <ArrowRight size={14} />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>

                  <div className="wm-inline-actions">
                    {(activeComparisonRecord?.recommendedFamilies || selected.recommendedFamilies).map((family) => (
                      <span key={family} className="wm-chip">
                        {family}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="wm-compare-simple__signal-group">
                  <div className="wm-compare-simple__subhead">Use in project</div>
                  <div className="wm-card__subtitle">
                    {activeProject
                      ? `Apply this comparison to ${activeProject.name}.`
                      : "No active project yet. You can create one from this comparison."}
                  </div>

                  <div className="wm-compare-simple__project-actions">
                    <button type="button" className="wm-btn wm-btn--primary" onClick={applyToActiveProject}>
                      Apply to active project
                    </button>
                    <button type="button" className="wm-btn wm-btn--ghost" onClick={createReplacementProject}>
                      Create replacement project
                    </button>
                  </div>
                </div>
              </div>
            </CollapsibleSection>
          </div>
        </section>
      ) : null}
    </div>
  );
}
