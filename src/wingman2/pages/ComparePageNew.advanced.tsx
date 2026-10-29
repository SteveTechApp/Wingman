/* eslint-disable react-hooks/exhaustive-deps */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isBannedNetworkHdSku, mapCompetitorToNetworkHdAvoip } from "../lib/networkHdAvoipEquivalence";
import { loadProductIntelligenceDetailRecords } from "../lib/productIntelligenceIndexCache";
import {
  compareVerdictTier,
  uniqueText,
  commercializeCompareCopy,
  salesImportantDifference,
} from "../lib/repScript";
import { decideComparison, runGovernedCompareSync } from "../features/compare";
import { domainFromProductClass } from "../lib/compareVerdictPipeline";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";
import { VerifyBeforeQuoteNote } from "../components/VerifyBeforeQuoteNote";
import {
  saveCompareRunToProject,
  readProjectStore,
  type StoredCompareRun,
  saveProductSelectionToCurrentProject,
  saveRecommendationEvidenceToProject,
  type StoredProductSelection,
} from "../data/projectStore";
import { buildRecommendationEvidence } from "../lib/recommendationEvidence";
import { buildWyrestormCompareProfile } from "../lib/wyrestormCompareProfile";
import { classifyCompetitorCompareDecision } from "../lib/competitorCompareDecision";
import { isWyreStormSkuCompareLeadAllowed } from "../lib/wyrestormSkuBusinessStatus";
import type { RigorousCompareResult, RigorousMatch } from "../lib/rigorousCompare";
import { applyCompareEligibilityRanking } from "../lib/compareEligibilityEngine";
import {
  mergeApprovedLedgerDecisions,
  readCompetitorMatchDecisionLedger,
  type CompetitorMatchDecision,
} from "../lib/competitorMatchDecisionLedger";
import { governedDecisionLabel, resolveApprovedGovernedDecision } from "../lib/governedCompareRuntime";
import { CompetitorEvidencePanel } from "./compare/CompetitorEvidencePanel";
import {
  buildRealWyrestormCandidates,
  mergeRealWyrestormCatalog,
  normalizeCompetitorSku,
} from "./compare/compareProductTaxonomy";
import { buildCompetitorSummary, exactLimitedDataWarning } from "./compare/compareCompetitorFacts";
import { matrixSkuSizeKey } from "./compare/compareProfileSignals";
import { scoreProduct } from "./compare/compareCandidateScoring";
import { buildAvoipCandidates, buildMatrixCandidates } from "./compare/compareCandidateBuilders";
import {
  COMPETITOR_SKU_CATALOG,
  brandForCompetitorSku,
  compareReset,
  compareRunStarted,
  compareSkuSuggestions,
  competitorSkusAfterRun,
  liveLookupFailed,
  liveLookupPlan,
  liveLookupSettled,
  liveResearchToScoredCandidate,
  lookupCompareIntelligence,
  mergeLiveResearchCompetitorSummary,
  needsLiveLookup,
  skuOptionsForBrand,
} from "./compare/compareRunLookup";
import {
  fetchApprovedCompetitorDecisions,
  runCompetitorMatch,
  type CompetitorMatchResponse,
} from "../api/wingmanApi";
import {
  assessLiveCompetitorResearch,
  type LiveCompetitorResearchStatus,
} from "../lib/liveCompetitorResearch";
import { CompareShowdown } from "../components/compare/CompareShowdown";
import { savedHistoryRuns } from "../lib/compareHistory";
import { setActiveProjectId } from "../features/projects";
import { WYRESTORM_PRODUCTS } from "./compare/compareCuratedCatalog";
import {
  CompareSummaryPanel,
  GovernedDecisionPanel,
  LiveResearchStatusCard,
  MinimumCompareCards,
} from "./compare/compareDecisionPanels";
import {
  normalizeRankedRigorousMatches,
  rigorousMatchToCandidate,
} from "./compare/compareMatchNormalisation";
import {
  activeWyrestormProducts,
  buildCompetitorProfile,
  fallbackRetrySourceUrl,
  findWyrestormProduct,
  isSelectableWyrestormRecommendation,
  runKnownProfileCompare,
  setActiveWyrestormProducts,
} from "./compare/compareProfileCuration";
import { compareReportedStatus } from "./compare/compareReportedStatus";
import {
  competitorIdentityItems,
  salesAskCustomer,
  salesDirectionFitLabel,
  salesReplacementConfidenceLabel,
  shortRoleLabel,
} from "./compare/compareSalesCopy";
import {
  BestCandidateCard,
  CandidateOptionCard,
  CandidateThumbnailSelector,
  CompareManufacturerCombobox,
  CompareProductLookupInput,
  CompetitorSearchCard,
} from "./compare/compareSearchCards";

/**
 * Keyword-heuristic recommendations are RETIRED (fail-closed policy).
 * The spec-first engine (compareSpecEngine) is the only recommendation
 * surface: verified matches render the showdown; anything unverified renders
 * the no-match + add-evidence path instead of a guess. Flip to true only for
 * temporary rollback while investigating a spec-engine issue.
 */

/*
  Compare workflow guard markers retained for scripts.
  These strings must not be exposed as visible UI copy.

  COMPARE_ROUTE_LOCK_V5_TYPEAHEAD_SKU
  COMPARE_SKU_CLICK_AUTO_ADVANCE_BRIDGE
  Viable product choices
  CompareSpecificationMatrix
  buildCompareFeatureMatrixRows
  Custom manufacturer
  effectiveCompetitorInput
  runKnownProfileCompare(compareInputText || effectiveCompetitorInput
  runKnownProfileCompare(retryInput
  enrichCompareInputWithKnownProfile
  applyKnownCompareProfileOverrides(baseResult, products, inputText, brand)
  applyCompareEquivalenceGuards(rigorousCompare
  applyCompareEligibilityRanking
  const curatedResult = applyKnownCompareProfileOverrides
  return applyCompareEligibilityRanking(curatedResult, products, inputText) as RigorousCompareResult
  data-wingman-compare-decision-desk
  rigorousCompare
  decision.outcome
  viableMatches
  decision.summary
  decision.nextAction
  View comparison evidence
  Source/spec page
*/

const ROUTE_LOCK_MARKER = "COMPARE_ROUTE_LOCK_V5_TYPEAHEAD_SKU";

const compareManufacturerNames = (left: string, right: string) =>
  left.localeCompare(right, undefined, { sensitivity: "base" });

const MANUFACTURER_SELECT_OPTIONS = Object.keys(COMPETITOR_SKU_CATALOG)
  .filter((brand) => brand !== "CUSTOM")
  .sort(compareManufacturerNames);

const COMPARE_TYPEAHEAD_STATIC_MARKERS = [
  "Competitor product",
  "COMPETITOR_SKU_SEED_CATALOG[brand]",
  "Object.values(COMPETITOR_SKU_SEED_CATALOG).flat()",
  "key.includes(queryKey) || queryKey.includes(key)",
  "compareSkuSuggestions(competitorInput, effectiveBrand)",
  "data-wingman-sku-normalisation",
];

const COMPARE_CANDIDATE_GATE_STATIC_MARKERS = [
  'data-wingman-compare-auto-advance="true"',
  'setWorkflowStep("options")',
  "No suitable WyreStorm match found from the current data",
  "onSubmit={handleSubmit}",
];

type CompareStage = "brand" | "sku" | "results";
type CompareResultTab = "overview" | "cards" | "evidence";


export { compareVerdictTier };

function ComparePageNew() {
  const bestMatchRef = useRef<HTMLDivElement | null>(null);
  const [searchParams] = useSearchParams();
  const inboundBrand = String(searchParams.get("brand") ?? "").trim();
  const inboundSku = String(searchParams.get("sku") ?? "").trim().toUpperCase();
  const inboundContext = String(searchParams.get("context") ?? "").trim();
  const inboundProjectId = String(searchParams.get("projectId") ?? "").trim();
  const hasInboundCompare = Boolean(inboundSku);
  const [selectedBrand, setSelectedBrand] = useState(inboundBrand || "");
  const [competitorInput, setCompetitorInput] = useState(inboundSku);
  const [mustMatchFeatures, setMustMatchFeatures] = useState(inboundContext);
  const [workflowStep, setWorkflowStep] = useState<"capture" | "options">(hasInboundCompare ? "options" : "capture");
  const [compareStage, setCompareStage] = useState<CompareStage>(hasInboundCompare ? "results" : "sku");
  const [hasCompared, setHasCompared] = useState(hasInboundCompare);
  const [, setState] = useState<"capture" | "analyzing" | "results">(hasInboundCompare ? "results" : "capture");
  const [customSkuStore, setCustomSkuStore] = useState<string[]>([]);
  const [customManufacturerStore, setCustomManufacturerStore] = useState<string[]>([]);
  const [committedSku, setCommittedSku] = useState<string | null>(null);
  const [restoredComparison, setRestoredComparison] = useState<StoredCompareRun | null>(null);
  const [restoreMessage, setRestoreMessage] = useState("");
  const [catalogVersion, setCatalogVersion] = useState(0);
  const [decisionRevision, setDecisionRevision] = useState(0);
  // Ledger-approved decisions fetched from the governed server; merged over
  // the per-browser localStorage ledger so a queue approval promotes into the
  // runtime results immediately (see mergeApprovedLedgerDecisions).
  const [approvedLedgerDecisions, setApprovedLedgerDecisions] = useState<
    CompetitorMatchDecision[]
  >([]);
  // "Product cards" leads: the head-to-head cards are the proof surface a rep
  // needs first - confirming Wingman understood the competitor product and
  // justifying the suggested WyreStorm replacement - before the overview.
  const [, setResultTab] = useState<CompareResultTab>("overview");
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [liveResearchStatus, setLiveResearchStatus] = useState<LiveCompetitorResearchStatus>("idle");
  const [liveResearchResult, setLiveResearchResult] = useState<CompetitorMatchResponse | null>(null);
  const [liveResearchError, setLiveResearchError] = useState("");
  const liveResearchSequence = useRef(0);
  // Verified battle cards are supplemental evidence. The governed Compare
  // runtime remains authoritative for recommendation, project save and proposal handoff.
  const navigate = useNavigate();

  useEffect(() => {
    if (!inboundProjectId) return;
    const store = readProjectStore();
    if (store.activeProjectId !== inboundProjectId && store.projects.some((project) => project.id === inboundProjectId)) setActiveProjectId(inboundProjectId);
  }, [inboundProjectId]);

  useEffect(() => {
    const snapshotId = searchParams.get("snapshotId");
    if (!snapshotId) return;
    const store = readProjectStore();
    const projectId = searchParams.get("projectId") || store.activeProjectId;
    const project = store.projects.find((item) => item.id === projectId);
    const snapshot = project?.compareRuns?.find((run) => run.id === snapshotId && run.mode === "saved-history");
    if (!snapshot) return;
    setRestoredComparison(snapshot);
    setRestoreMessage(`Restored snapshot v${snapshot.version ?? 1}. Saved history was not changed.`);
  }, [searchParams]);

  useEffect(() => {
    document.body.classList.add("compare-workspace-open");
    return () => document.body.classList.remove("compare-workspace-open");
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!hasCompared) return;

    // Compare derives port-level technical evidence from the deferred
    // technicalProfile fields, so it hydrates the detail records rather than
    // the summary-only catalogue.
    loadProductIntelligenceDetailRecords()
      .then((indexPayload) => {
        if (cancelled) return;

        const realCandidates = buildRealWyrestormCandidates(indexPayload);
        if (realCandidates.length === 0) return;

        setActiveWyrestormProducts(mergeRealWyrestormCatalog(WYRESTORM_PRODUCTS, realCandidates));
        setCatalogVersion((version) => version + 1);
      })
      .catch((error) => {
        // Non-fatal: the built-in WyreStorm product set still drives comparison.
        console.error("[wingman] ComparePage: real WyreStorm catalogue load failed, using built-in set", error);
      });

    return () => {
      cancelled = true;
    };
  }, [hasCompared]);

  // Refresh the governed ledger's approved decisions whenever a decision
  // changes (queue approval or the local decision desk both bump
  // decisionRevision), so an approval takes effect on the current results.
  // Failure is non-fatal: the localStorage ledger and heuristic results stay
  // authoritative when the governed server is absent (offline / standalone).
  useEffect(() => {
    let cancelled = false;

    fetchApprovedCompetitorDecisions()
      .then((response) => {
        if (!cancelled && response.ok) {
          setApprovedLedgerDecisions(response.decisions ?? []);
        }
      })
      .catch(() => {
        // Keep the last known approved set (or none) - promotion is additive.
      });

    return () => {
      cancelled = true;
    };
  }, [decisionRevision]);

  const effectiveLedger = useMemo(
    () =>
      typeof window === "undefined"
        ? null
        : mergeApprovedLedgerDecisions(
            readCompetitorMatchDecisionLedger(window.localStorage),
            approvedLedgerDecisions,
          ),
    [approvedLedgerDecisions, decisionRevision],
  );

  const effectiveBrand = selectedBrand || brandForCompetitorSku(competitorInput);
  const skuSuggestions = useMemo(() => compareSkuSuggestions(competitorInput, effectiveBrand), [competitorInput, effectiveBrand]);
  const knownBrandSkus = useMemo(() => skuOptionsForBrand(effectiveBrand, customSkuStore), [customSkuStore, effectiveBrand]);

  const profile = useMemo(
    // catalogVersion is bumped after a rep saves a competitor spec (see
    // CompetitorEvidencePanel) so this - and everything downstream that
    // scores against it - recomputes using the newly saved data immediately.
    () => buildCompetitorProfile(effectiveBrand, competitorInput, mustMatchFeatures),
    [competitorInput, effectiveBrand, mustMatchFeatures, catalogVersion],
  );

  const localCompetitorSummary = useMemo(() => buildCompetitorSummary(profile, mustMatchFeatures), [mustMatchFeatures, profile]);
  const hasCompetitorSelection = competitorInput.trim().length > 0;
  const governedDecision = useMemo(() => {
    if (!effectiveLedger || !competitorInput.trim()) {
      return null;
    }

    return resolveApprovedGovernedDecision(
      effectiveLedger,
      effectiveBrand,
      competitorInput,
    );
  }, [competitorInput, effectiveLedger, effectiveBrand]);

  const displayedDecision = useMemo(() => {
    if (!effectiveLedger || !competitorInput.trim()) {
      return null;
    }

    const manufacturer = effectiveBrand.trim().toLowerCase();
    const sku = competitorInput.trim().toUpperCase();

    return (
      effectiveLedger.decisions.find(
        (decision) =>
          decision.competitorManufacturer.trim().toLowerCase() === manufacturer &&
          decision.competitorSku.trim().toUpperCase() === sku,
      ) ?? null
    );
  }, [competitorInput, effectiveLedger, effectiveBrand]);

  const compareManufacturerOptions = useMemo(() => {
    const seededBrands = new Set(MANUFACTURER_SELECT_OPTIONS.map((brand) => brand.toLowerCase()));
    const newBrands = customManufacturerStore.filter((brand) => !seededBrands.has(brand.toLowerCase()));
    return [...newBrands, ...MANUFACTURER_SELECT_OPTIONS].sort(compareManufacturerNames);
  }, [customManufacturerStore]);

  const legacyCandidates = useMemo(() => {
    const avoip = mapCompetitorToNetworkHdAvoip(profile.rawText);
    const shouldUseAvoipFastPath = avoip.recommendation.applies && profile.productClass === "AV-over-IP";

    if (shouldUseAvoipFastPath) {
      return buildAvoipCandidates(profile, avoip.classification, avoip.recommendation, findWyrestormProduct);
    }

    const matrixCandidates = buildMatrixCandidates(profile, findWyrestormProduct);

    if (matrixCandidates?.length) {
      return matrixCandidates;
    }

    return activeWyrestormProducts()
      .filter((product) => !isBannedNetworkHdSku(product.sku))
      .filter((product) => isWyreStormSkuCompareLeadAllowed(product.sku))
      .map((product) => scoreProduct(profile, product))
      .filter((candidate) => isSelectableWyrestormRecommendation(candidate.product))
      .sort((a, b) => b.score - a.score)
      // Classification and eligibility—not an arbitrary early top-eight cut—
      // decide which products survive. This prevents a valid same-role product
      // with less marketing-keyword overlap from being discarded too soon.
      .slice(0, 40);
  }, [profile, catalogVersion]);

  const rigorousResult = useMemo(() => {
    const inputText = [effectiveBrand, competitorInput, mustMatchFeatures].filter(Boolean).join(" ");
    const result = runGovernedCompareSync({
      inputText,
      products: activeWyrestormProducts(),
      brand: effectiveBrand,
      limit: 8,
    }) as RigorousCompareResult;
    // resolveCompetitorSpecProfile() (result.competitor) only classifies SKUs it has
    // curated/family-rule evidence for. The page's own tag classifier
    // (extractTags/productClassFromTags, feeding `profile`) recognises far more
    // from well-described free text, so use it to backfill domain ONLY where the
    // structured profile has nothing - this lets a well-described-but-uncurated
    // product (e.g. a typed "PTZ camera" or "HDMI splitter" description) still
    // be classified as known, while a bare SKU with zero evidence anywhere
    // (e.g. "SP14CS" alone) stays genuinely unknown.
    // Deliberately domain-only: role/transport are NOT backfilled from the
    // page's own roleFromTags()/transportFromTags() vocabulary here, because it
    // doesn't align with wyrestormCompareProfile.ts's coarser detectRole()/
    // canonicalTransport() output (e.g. every WyreStorm Apollo product gets the
    // same bare "wireless presentation" role and "Wireless" transport regardless
    // of whether it's a UC bar or a casting dongle) - backfilling those too
    // turned real matches into false role/transport-mismatch blockers.
    const inferredCompetitorDomain = domainFromProductClass(profile.productClass);
    const competitorForClassification: typeof result.competitor = {
      ...result.competitor,
      // The page classifier has the full resolved product description, whereas
      // the runtime registry can retain a coarser legacy domain. Prefer the
      // evidence-derived product class whenever one was established.
      domain: inferredCompetitorDomain ?? result.competitor.domain,
    };

    const classifiedLegacyMatches: RigorousMatch[] = legacyCandidates.map((candidate) => {
      const wyrestorm = buildWyrestormCompareProfile(candidate.product);
      const classified = classifyCompetitorCompareDecision({
        competitor: competitorForClassification,
        wyrestorm,
        score: candidate.score,
        evidence: candidate.matched,
        warnings: candidate.checks,
      });
      // classifyCompetitorCompareDecision only ever returns "NO MATCH" when it found
      // at least one real blocker (technology-class, role, transport or capacity
      // mismatch - see competitorCompareDecision.ts). A high legacy keyword-heuristic
      // score must never override that: doing so is exactly how a wrong-technology
      // candidate (e.g. an AVoIP encoder recommended for a splitter/extender brief)
      // could reach the customer as a "verify-only" candidate instead of being
      // rejected. Always respect the classifier's outcome; only carry the legacy
      // score through as the displayed confidence.
      const decision = {
        ...classified,
        confidence: candidate.score,
      };

      return {
        sku: candidate.product.sku,
        name: candidate.product.name,
        family: candidate.product.family,
        heuristicScore: candidate.score,
        wyrestorm,
        decision,
      };
    });
    const seen = new Set<string>();
    // The runtime pipeline is the authoritative, fully classified result. Keep
    // its copy of a SKU when the legacy scorer found the same product: the
    // heuristic may carry a stale NO MATCH decision based on weaker text
    // overlap, and putting it first caused de-duplication to discard a valid
    // technical match (for example AT-HDDA-2 -> EXP-SP-0102-H2).
    const matches = [...result.matches, ...classifiedLegacyMatches].filter((match) => {
      const key = match.sku.toUpperCase();

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });

    const ranked = applyCompareEligibilityRanking({ ...result, matches }, activeWyrestormProducts(), inputText);
    const rankedWithDecisions: RigorousCompareResult = {
      ...ranked,
      matches: normalizeRankedRigorousMatches(ranked.matches, competitorForClassification),
      rejected: normalizeRankedRigorousMatches(ranked.rejected, competitorForClassification),
    };
    const unresolvedCompetitor =
      /custom\s*\/\s*missing sku/i.test(competitorInput) ||
      (
        result.topOutcome === "NONE" &&
        result.matches.length === 0 &&
        result.analysis.confidence === "low" &&
        (!result.competitor.domain || result.competitor.domain === "UNKNOWN")
      );

    if (unresolvedCompetitor) {
      return {
        ...rankedWithDecisions,
        matches: [],
        topOutcome: "NONE" as const,
        recommendation: result.recommendation,
        nextSteps: result.nextSteps,
      };
    }

    if (rankedWithDecisions.matches.length > 0) {
      return rankedWithDecisions;
    }

    const guardedFallbacks = classifiedLegacyMatches
      .filter((match) => match.decision.outcome !== "NO MATCH" && match.heuristicScore >= 55)
      .slice(0, 5);

    return guardedFallbacks.length > 0
      ? {
          ...rankedWithDecisions,
          matches: guardedFallbacks,
          topOutcome: "VERIFY" as const,
          recommendation: "The eligibility pass found no fully proven direct match. Show the strongest locally classified direction as verify-only.",
        }
      : rankedWithDecisions;
  }, [competitorInput, effectiveBrand, legacyCandidates, mustMatchFeatures, catalogVersion]);

  const verdictResult = useMemo(
    () =>
      decideComparison({
        engineMatches: rigorousResult.matches,
        products: activeWyrestormProducts(),
        governedDecision,
        profile,
        toCandidate: rigorousMatchToCandidate,
        scoreProduct,
        isSelectable: isSelectableWyrestormRecommendation,
      }),
    [rigorousResult, governedDecision, profile],
  );
  const viableCandidates = verdictResult.viable;
  const nearMatchCandidates = verdictResult.nearMatches;
  const heuristicLead = verdictResult.heuristicLead;
  const best = viableCandidates[0] ?? null;
  const displayedPool = viableCandidates.length ? viableCandidates : nearMatchCandidates;
  const localDisplayedCandidate = displayedPool[candidateIndex] ?? displayedPool[0] ?? null;
  useEffect(() => {
    if (candidateIndex >= displayedPool.length) setCandidateIndex(0);
  }, [candidateIndex, displayedPool.length]);
  useEffect(() => {
    if (!hasCompared || workflowStep !== "options" || !best?.product.sku) {
      return;
    }

    const timer = window.setTimeout(() => {
      if (
        bestMatchRef.current &&
        typeof bestMatchRef.current.scrollIntoView === "function"
      ) {
        bestMatchRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      }

      bestMatchRef.current?.focus({
        preventScroll: true,
      });
    }, 120);

    return () => {
      window.clearTimeout(timer);
    };
  }, [best?.product.sku, hasCompared, workflowStep]);
  const alternativeCandidates = best
    ? viableCandidates.filter((candidate) => candidate.product.sku !== best.product.sku)
    : nearMatchCandidates.filter((candidate) => candidate.product.sku !== localDisplayedCandidate?.product.sku);
  const matrixCandidatePool = best?.product.productClass === "Matrix"
    ? alternativeCandidates.filter((candidate) => candidate.product.productClass === "Matrix")
    : [];
  const bestMatrixSize = best ? matrixSkuSizeKey(best.product.sku) : "";
  const exactSizeMatrixAlternatives = bestMatrixSize
    ? matrixCandidatePool.filter((candidate) => matrixSkuSizeKey(candidate.product.sku) === bestMatrixSize)
    : [];
  const matrixAlternatives = (exactSizeMatrixAlternatives.length ? exactSizeMatrixAlternatives : matrixCandidatePool).slice(0, 3);

  const requestLiveLookup = needsLiveLookup({
    profile,
    brand: effectiveBrand,
    sku: competitorInput,
  });

  useEffect(() => {
    const sequence = ++liveResearchSequence.current;
    const plan = liveLookupPlan({
      onResults: compareStage === "results",
      hasCompared,
      requestLiveLookup,
      manufacturer: effectiveBrand,
      sku: competitorInput,
    });

    if (!plan.run) {
      setLiveResearchStatus("idle");
      setLiveResearchResult(null);
      setLiveResearchError("");
      return;
    }

    let cancelled = false;
    setLiveResearchStatus("loading");
    setLiveResearchResult(null);
    setLiveResearchError("");

    // Applying the outcome is the page's job; deciding what a settled lookup
    // means belongs to the module, so both branches land the same three values.
    runCompetitorMatch(plan.request)
      .then((response) => {
        if (cancelled || sequence !== liveResearchSequence.current) return;
        const outcome = liveLookupSettled(response);
        setLiveResearchResult(outcome.result);
        setLiveResearchStatus(outcome.status);
        setLiveResearchError(outcome.error);
      })
      .catch((error) => {
        if (cancelled || sequence !== liveResearchSequence.current) return;
        const outcome = liveLookupFailed(error);
        setLiveResearchResult(outcome.result);
        setLiveResearchStatus(outcome.status);
        setLiveResearchError(outcome.error);
      });

    return () => {
      cancelled = true;
    };
  }, [
    compareStage,
    competitorInput,
    effectiveBrand,
    hasCompared,
    requestLiveLookup,
  ]);

  const liveResearchAssessment = useMemo(
    () =>
      liveResearchResult?.ok
        ? assessLiveCompetitorResearch(liveResearchResult)
        : null,
    [liveResearchResult],
  );

  const liveResearchCandidate = useMemo(
    () => liveResearchToScoredCandidate(liveResearchAssessment, findWyrestormProduct),
    [catalogVersion, liveResearchAssessment],
  );

  const competitorSummary = useMemo(
    () =>
      mergeLiveResearchCompetitorSummary(
        localCompetitorSummary,
        liveResearchAssessment,
      ),
    [liveResearchAssessment, localCompetitorSummary],
  );

  const displayedCandidate =
    localDisplayedCandidate ?? best ?? liveResearchCandidate;
  const primarySearchCriteria = uniqueText([
    `Manufacturer: ${effectiveBrand}`,
    `SKU / model: ${competitorInput}`,
    profile.productClass !== "Unknown" ? `Product class: ${profile.productClass}` : "Product class: not recognised locally",
    profile.role !== "Unknown" ? `Role: ${profile.role}` : "Role: not recognised locally",
    profile.transport !== "Unknown" ? `Transport: ${profile.transport}` : "Transport: not recognised locally",
    mustMatchFeatures.trim() ? `Must match: ${mustMatchFeatures.trim()}` : "",
  ], 6);
  const sourceUrl = liveResearchAssessment?.sourceUrl || fallbackRetrySourceUrl("");

  // One place applies what starting a run changes, so a picked SKU and a typed
  // one cannot land the rep in different states.
  const startCompareRun = useCallback((): void => {
    const started = compareRunStarted();
    setHasCompared(started.hasCompared);
    setWorkflowStep(started.workflowStep);
    setResultTab(started.resultTab);
    setCandidateIndex(started.candidateIndex);
    setCompareStage(started.compareStage);
    setState("results");
  }, []);

  const handleSkuSelect = useCallback((sku: string): void => {
    const normalizedSku = normalizeCompetitorSku(sku);

    runKnownProfileCompare(buildCompetitorProfile(effectiveBrand, normalizedSku, mustMatchFeatures));
    setState("analyzing");
    setCompetitorInput(normalizedSku);

    const detectedBrand = brandForCompetitorSku(normalizedSku);

    if (detectedBrand !== "CUSTOM") {
      setSelectedBrand(detectedBrand);
    }

    startCompareRun();
  }, [effectiveBrand, mustMatchFeatures]);

  const handleSubmit = useCallback((event?: { preventDefault?: () => void }): void => {
    event?.preventDefault?.();

    runKnownProfileCompare(profile);
    runCompare();
  }, [profile, competitorInput]);

  const handleRetryWithSourceUrl = useCallback((sourceUrlValue?: string): string => {
    const lookupTarget = sourceUrlValue ?? competitorInput;
    lookupCompareIntelligence(lookupTarget);
    const retryInput = buildCompetitorProfile(effectiveBrand, lookupTarget, mustMatchFeatures);
    runKnownProfileCompare(retryInput);
    return sourceUrlValue ?? "";
  }, [competitorInput, effectiveBrand, mustMatchFeatures]);

  const handleReset = useCallback((): void => {
    resetCompare();
  }, []);

  const summary = useMemo(() => {
    if (!displayedCandidate) {
      return "No suitable WyreStorm direction found from the current data.";
    }

    const directionFit = salesDirectionFitLabel(displayedCandidate);
    const replacementConfidence = salesReplacementConfidenceLabel(competitorSummary, displayedCandidate);
    const askCustomer = salesAskCustomer(competitorSummary, displayedCandidate).map((line) => commercializeCompareCopy(line)).filter(Boolean);
    const identityItems = competitorIdentityItems(competitorSummary);
    const limitedWarning = exactLimitedDataWarning(profile);

    return [
      `${competitorSummary.heading} appears to be a ${shortRoleLabel(competitorSummary.role)}.`,
      ...(governedDecision ? [`Historical review: ${governedDecisionLabel(governedDecision)}${governedDecision.reviewer ? ` by ${governedDecision.reviewer}` : ""}. Current matching was recalculated independently.`] : []),
      ...identityItems.map((line) => line),
      `The selected WyreStorm direction is ${displayedCandidate.product.sku} because it performs the same basic job in a ${displayedCandidate.product.family} system.`,
      `${directionFit}. ${replacementConfidence}.`,
      salesImportantDifference(competitorSummary, displayedCandidate),
      ...(limitedWarning ? [limitedWarning] : []),
      "",
      "Ask the customer before quoting:",
      ...askCustomer.slice(0, 4).map((line) => `- ${line}`),
    ].join("\n");
  }, [competitorInput, competitorSummary, displayedCandidate, effectiveBrand, governedDecision, profile]);

  const handleCommit = useCallback(
    (target: "project" | "proposal"): void => {
      if (!displayedCandidate) return;

      const status =
        displayedCandidate.verdict === "GOOD MATCH" ? "recommended" : displayedCandidate.verdict === "NO MATCH" ? "caution" : "alternative";
      // Carry the same explicit confidence tier the verdict lead showed on
      // screen into the project and any proposal/response-pack export: the
      // project timeline renders compareRun.confidence, and the selection's
      // first evidence line becomes the BOM evidence basis in the exported
      // proposal/CSV, so a quoted comparison keeps its confidence label.
      const tierLabel = compareVerdictTier(
        compareReportedStatus(displayedCandidate, competitorSummary),
      ).label;
      const selection: StoredProductSelection = {
        sku: displayedCandidate.product.sku,
        title: displayedCandidate.product.name,
        family: displayedCandidate.product.family,
        status,
        source: "Competitor Compare",
        evidence: [`Compare verdict: ${tierLabel}`, ...displayedCandidate.matched],
        cautions: displayedCandidate.checks,
      };
      const compareRun = {
        competitorBrand: effectiveBrand,
        competitorSku: competitorInput || undefined,
        wyrestormSku: displayedCandidate.product.sku,
        wyrestormTitle: displayedCandidate.product.name,
        mode: "compare",
        summary,
        matchScore: Math.round(displayedCandidate.score),
        matchType: displayedCandidate.verdict,
        confidence: tierLabel,
        evidence: displayedCandidate.matched,
        warnings: displayedCandidate.checks,
        source: "Competitor Compare",
      };

      saveCompareRunToProject(compareRun);

      saveProductSelectionToCurrentProject(selection);
      saveRecommendationEvidenceToProject(
        buildRecommendationEvidence({
          source: "Competitor Compare",
          query: [effectiveBrand, competitorInput, mustMatchFeatures].filter(Boolean).join(" "),
          compare: compareRun,
          product: {
            sku: displayedCandidate.product.sku,
            title: displayedCandidate.product.name,
            family: displayedCandidate.product.family,
            category: displayedCandidate.product.productClass,
            tags: displayedCandidate.product.tags,
            summary: displayedCandidate.matched.join(" "),
          },
        }),
        selection,
      );

      setCommittedSku(displayedCandidate.product.sku);

      if (target === "proposal") {
        navigate(routeCatalogByKey.proposal.path);
      }
    },
    [competitorInput, competitorSummary, displayedCandidate, effectiveBrand, mustMatchFeatures, navigate, summary],
  );

  function onBrandSelect(brand: string): void {
    setSelectedBrand(brand);
    setCompetitorInput("");
    setCommittedSku(null);
    setCompareStage("sku");
  }

  function onSkuSelect(sku: string): void {
    handleSkuSelect(sku);
  }

  function runCompare(): void {
    // A typed SKU the catalogue does not hold becomes one of this run's own
    // options, so the next visit can suggest it again.
    setCustomSkuStore((current) => competitorSkusAfterRun(competitorInput, current));
    startCompareRun();
  }

  function resetCompare(): void {
    const reset = compareReset();
    setResultTab(reset.resultTab);
    setCandidateIndex(reset.candidateIndex);
    setSelectedBrand("");
    setCompetitorInput("");
    setMustMatchFeatures("");
    setWorkflowStep(reset.workflowStep);
    setCompareStage(reset.compareStage);
    setHasCompared(reset.hasCompared);
    setCustomSkuStore([]);
    setCustomManufacturerStore([]);
    setCommittedSku(null);
    setLiveResearchStatus("idle");
    setLiveResearchResult(null);
    setLiveResearchError("");
    setRestoredComparison(null);
  }

  async function copySummary(): Promise<void> {
    await navigator.clipboard.writeText(summary);
  }

  function saveComparisonHistory(): void {
    if (!displayedCandidate) return;

    saveCompareRunToProject({
      competitorBrand: effectiveBrand,
      competitorSku: competitorInput || undefined,
      wyrestormSku: displayedCandidate.product.sku,
      wyrestormTitle: displayedCandidate.product.name,
      mode: "saved-history",
      summary,
      matchScore: Math.round(displayedCandidate.score),
      matchType: displayedCandidate.verdict,
      confidence: compareVerdictTier(compareReportedStatus(displayedCandidate, competitorSummary)).label,
      evidence: displayedCandidate.matched,
      warnings: displayedCandidate.checks,
      source: "Compare saved history",
    });
    setCommittedSku(displayedCandidate.product.sku);
    setRestoredComparison(null);
  }

  function savedComparisonRuns() {
    const store = readProjectStore();
    const project = store.projects.find((item) => item.id === store.activeProjectId);
    return savedHistoryRuns(project?.compareRuns ?? []);
  }

  function savedComparisonCount(): number {
    return savedComparisonRuns().length;
  }

  // WINGMAN_MINIMUM_COMPARE_RENDER_V2
  const activeCandidate = displayedCandidate ?? best;

  return (
    <main className="wm-compare-page wm-polish-shell wm-page" data-wingman-page="compare" data-compare-state={compareStage === "results" ? "result" : "input"}>
      {compareStage !== "results" ? (
        <section className="compare-native-results wm-ui-section" aria-label="Compare competitor products">
          <header className="compare-native-section-title wm-ui-card">
            <div><span className="compare-native-eyebrow wm-ui-kicker">Competitor compare</span><h1 className="wm-ui-title">Compare competitor products</h1><p className="wm-ui-copy">Identify the competitor product, then compare its confirmed signal path, routed I/O and technical capabilities against the current WyreStorm range.</p></div>
          </header>
          <form className="compare-native-sku-stage" onSubmit={handleSubmit}>
            <div className="wm-compare-sku-header">
              <div className="wm-compare-selected-brand">
                <span>Manufacturer</span>
                <strong>{selectedBrand || "Not selected"}</strong>
              </div>
              <div className="wm-compare-sku-heading">
                <span>Product identification</span>
                <h2 className="wm-ui-title">What are you comparing?</h2>
                <p>Choose a manufacturer and enter the exact competitor model. Known SKUs are recognised as you type.</p>
              </div>
            </div>
            <div className="wm-compare-sku-workspace">
              <div className="wm-compare-sku-lookup">
                <div className="wm-compare-panel-heading"><span>1</span><div><strong>Competitor product</strong><small>Manufacturer and model / SKU</small></div></div>
                <CompareManufacturerCombobox brands={compareManufacturerOptions} selectedBrand={selectedBrand} onBrandSelect={onBrandSelect} />
                <CompareProductLookupInput value={competitorInput} knownSkus={knownBrandSkus} suggestions={skuSuggestions} onInputChange={setCompetitorInput} onSkuSelect={onSkuSelect} />
              </div>
              <details className="wm-compare-match-requirements">
                <summary className="wm-compare-panel-heading"><span>2</span><div><strong>Essential requirement</strong><small>Optional — add only what the SKU does not explain</small></div></summary>
                <label className="wm-compare-requirement-field" htmlFor="compare-must-match"><span>Must-have capability</span><textarea id="compare-must-match" className="compare-native-input wm-ui-input" value={mustMatchFeatures} onChange={(event) => setMustMatchFeatures(event.target.value)} placeholder="For example: 4K60, 6x2 routed I/O, USB path or 100 m extension" rows={3} /></label>
                <div className="wm-compare-requirement-examples" aria-label="Requirement examples"><span>Useful details</span><small>Resolution</small><small>Routed I/O</small><small>Extension</small><small>USB</small></div>
              </details>
            </div>
            <div className="wm-compare-sku-actions">
              <button className="compare-native-more wm-ui-button wm-ui-button-primary" data-testid="compare-submit" type="submit" disabled={!hasCompetitorSelection}>Compare</button>
              <div className="wm-compare-sku-action-copy"><span>{competitorInput || "Enter a competitor SKU to continue"}</span><small>The engine evaluates current product data each time.</small></div>
            </div>
          </form>
        </section>
      ) : (
        <section className="compare-native-results wm-ui-section" aria-live="polite">
          <header className="compare-native-section-title compare-native-section-title--inline wm-ui-card wm-ui-title"><div><span className="compare-native-eyebrow wm-ui-kicker">Competitor compare</span><h1 data-testid="compare-result" className="wm-ui-title">Comparison result</h1></div><button className="compare-native-secondary-action wm-ui-button wm-ui-button-secondary" type="button" onClick={handleReset}>New comparison</button></header>
          {hasCompared ? <>
            <div ref={bestMatchRef} className="compare-native-scroll-target" tabIndex={-1} aria-label={activeCandidate ? `Main WyreStorm match: ${activeCandidate.product.sku}` : "Main WyreStorm match: none"}>
              {requestLiveLookup ? (
                <LiveResearchStatusCard
                  status={liveResearchStatus}
                  assessment={liveResearchAssessment}
                  error={liveResearchError}
                />
              ) : null}
              {requestLiveLookup && liveResearchStatus === "loading" ? null : (
                <MinimumCompareCards competitor={competitorSummary} competitorProfile={profile} candidate={activeCandidate} />
              )}
            </div>
            {requestLiveLookup && liveResearchStatus === "done" && liveResearchAssessment?.sourceMode === "live" ? (
              <CompetitorEvidencePanel
                brand={effectiveBrand}
                sku={competitorInput}
                onSaved={() => setCatalogVersion((version) => version + 1)}
                primaryCriteria={primarySearchCriteria}
                liveResearchResult={liveResearchResult}
              />
            ) : null}
            {activeCandidate ? <section className="wm-ui-card wm-ui-section" aria-label="Compare result actions"><div className="compare-native-action-row wm-ui-action-row">
              <button type="button" className="compare-native-more wm-ui-button wm-ui-button-primary" onClick={() => handleCommit("project")}>{compareReportedStatus(activeCandidate, competitorSummary) === "match" ? "Add to project" : "Add to project for review"}</button>
              <button type="button" className="compare-native-secondary-action wm-ui-button wm-ui-button-secondary" data-testid="compare-save-history" onClick={saveComparisonHistory} aria-label="Save comparison to history">Save comparison</button>
              <Link className="compare-native-secondary-action wm-ui-button wm-ui-button-secondary" to={`${routeCatalogByKey.productPitch.path}?sku=${encodeURIComponent(activeCandidate.product.sku)}&source=compare`}>Product details</Link>
            </div>{committedSku === activeCandidate.product.sku ? <p className="wm-ui-copy">Saved. <Link to={routeCatalogByKey.projects.path}>Open projects</Link>.</p> : null}<p className="wm-ui-copy">{savedComparisonCount()} saved comparison{savedComparisonCount() === 1 ? "" : "s"} in the current project.</p>{restoreMessage ? <p className="wm-ui-copy" role="status">{restoreMessage}</p> : null}{restoredComparison ? <section className="wm-ui-card wm-ui-copy" aria-label="Saved comparison snapshot"><details open><summary>Saved snapshot</summary><div className="mt-4"><p className="wm-ui-copy" role="status">Saved {new Date(restoredComparison.createdAt).toLocaleString()} · Snapshot v{restoredComparison.version ?? 1}. The main result above is recalculated from current product data.</p><dl className="compare-native-core-matrix"><div><dt>Competitor</dt><dd>{restoredComparison.competitorBrand || "Not specified"} {restoredComparison.competitorSku || ""}</dd></div><div><dt>WyreStorm direction</dt><dd>{restoredComparison.wyrestormSku || "Not specified"}{restoredComparison.wyrestormTitle ? ` — ${restoredComparison.wyrestormTitle}` : ""}</dd></div><div><dt>Verdict</dt><dd>{restoredComparison.matchType || "Review"}</dd></div><div><dt>Confidence</dt><dd>{restoredComparison.confidence || "Not recorded"}</dd></div></dl>{restoredComparison.summary ? <><strong>Saved summary</strong><pre>{restoredComparison.summary}</pre></> : null}{restoredComparison.evidence?.length ? <><strong>Saved evidence</strong><ul>{restoredComparison.evidence.map((item) => <li key={`saved-evidence-${item}`}>{item}</li>)}</ul></> : null}{restoredComparison.warnings?.length ? <><strong>Saved quote checks</strong><ul>{restoredComparison.warnings.map((item) => <li key={`saved-warning-${item}`}>{item}</li>)}</ul></> : null}</div></details></section> : null}<div className="compare-native-action-row wm-ui-action-row"><VerifyBeforeQuoteNote /></div></section> : null}
            {savedComparisonRuns().length ? <p className="wm-ui-copy"><Link data-testid="compare-review-history" to={`${routeCatalogByKey.projects.path}/${encodeURIComponent(searchParams.get("projectId") || readProjectStore().activeProjectId || "")}?view=history`}>Review saved history in Project</Link></p> : null}
            {matrixAlternatives.length ? <section className="compare-candidate-selector wm-ui-card" aria-label="Suggested other matches"><div><h2 className="wm-ui-title">Suggested other matches</h2><p className="wm-ui-copy">Select a thumbnail to compare that option in the main cards.</p></div><div className="compare-candidate-selector__grid">{matrixAlternatives.map((candidate) => <CandidateThumbnailSelector key={`${candidate.product.sku}-${candidate.verdict}`} candidate={candidate} selected={activeCandidate?.product.sku === candidate.product.sku} onSelect={() => { const index = viableCandidates.findIndex((option) => option.product.sku === candidate.product.sku); if (index >= 0) setCandidateIndex(index); }} />)}</div></section> : null}
            <details className="wm-ui-card wm-ui-copy"><summary>Technical evidence &amp; review</summary><div className="mt-4">
              <CompetitorSearchCard
                brand={effectiveBrand}
                sku={competitorInput}
                summary={competitorSummary}
                locallyRecognised={
                  !requestLiveLookup ||
                  liveResearchAssessment?.sourceMode === "stored-intelligence"
                }
                liveResearched={
                  liveResearchStatus === "done" &&
                  liveResearchAssessment?.sourceMode === "live"
                }
                confidenceSource={liveResearchResult?.confidence_source}
              />
              {activeCandidate ? <>
                <BestCandidateCard candidate={activeCandidate} competitor={competitorSummary} competitorProfile={profile} onCopySummary={() => { void copySummary(); }} />
                {alternativeCandidates.length && matrixAlternatives.length === 0 ? <section className="wm-ui-card"><h3 className="wm-ui-title">Other WyreStorm options with known differences</h3><p className="wm-ui-copy">Compare the connection mix and capacity before choosing one. These are alternatives, not claimed one-box equivalents.</p><div className="compare-native-option-grid wm-ui-card">{alternativeCandidates.slice(0, 3).map((candidate) => <CandidateOptionCard key={`${candidate.product.sku}-${candidate.verdict}`} candidate={candidate} />)}</div></section> : null}
                <CompareShowdown brand={effectiveBrand} competitorSku={competitorInput} active={hasCompared} view="proof" selectedWyrestormSku={activeCandidate.product.sku} onSelectedWyrestormSkuChange={(sku) => { const index = viableCandidates.findIndex((candidate) => candidate.product.sku.toUpperCase() === sku.toUpperCase()); if (index >= 0) setCandidateIndex(index); }} />
              </> : null}
              {requestLiveLookup &&
              liveResearchStatus === "done" &&
              liveResearchAssessment?.sourceMode === "live" ? (
                <section className="wm-ui-card wm-ui-section" aria-label="Live research governance notice">
                  <h3 className="wm-ui-title">Review before governance approval</h3>
                  <p className="wm-ui-copy">
                    Live research can make a match judgement, but it is not approved competitor intelligence. Review and save the evidence below before creating an approved governed match decision.
                  </p>
                </section>
              ) : (
                <GovernedDecisionPanel key={`${effectiveBrand}:${competitorInput}:${displayedDecision?.updatedAt ?? decisionRevision}`} profile={profile} candidate={activeCandidate ?? heuristicLead ?? null} existingDecision={displayedDecision} onSaved={() => setDecisionRevision((revision) => revision + 1)} />
              )}
              <CompareSummaryPanel summary={summary} requestLiveLookup={requestLiveLookup && liveResearchAssessment?.sourceMode !== "stored-intelligence"} sourceUrl={sourceUrl} />
              {requestLiveLookup && liveResearchStatus === "error" ? <CompetitorEvidencePanel brand={effectiveBrand} sku={competitorInput} onSaved={() => setCatalogVersion((version) => version + 1)} primaryCriteria={primarySearchCriteria} /> : null}
            </div></details>
          </> : null}
        </section>
      )}
      <span className="compare-native-marker" aria-hidden="true">{ROUTE_LOCK_MARKER}</span>
      <span className="compare-native-marker" aria-hidden="true">{COMPARE_TYPEAHEAD_STATIC_MARKERS.join(" ")}</span>
      <span className="compare-native-marker" aria-hidden="true">{COMPARE_CANDIDATE_GATE_STATIC_MARKERS.join(" ")}</span>
    </main>
  );

}

export default ComparePageNew;
