import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, RefreshCw, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

import { routeCatalogByKey } from "../app/routeCatalog";
import { PageHero } from "../components/PageHero";
import { SectionCard } from "../components/SectionCard";
import {
  saveProductSelectionToCurrentProject,
  useProjectStore,
  type StoredDiscoveryBrief,
  type StoredProductSelection,
} from "../data/projectStore";
import {
  discoveryBriefToFinderNeed,
  readLatestDiscoveryBrief,
  type FinderNeedDraft,
} from "../data/workflowHandoff";
import {
  loadWingmanProductSelectorDecisions,
  type ProductSelectorRequest,
} from "../lib/productSelectorEngine";

type RecommendationDecision = Awaited<
  ReturnType<typeof loadWingmanProductSelectorDecisions>
>[number];

type LoadState = "loading" | "ready" | "missing" | "error";

function text(value: unknown, fallback = "") {
  const output = String(value ?? "").trim();
  return output || fallback;
}

function list(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => text(item)).filter(Boolean)
    : [];
}

function productField(decision: RecommendationDecision, key: string) {
  return text((decision.product as Record<string, unknown>)[key]);
}

function productTitle(decision: RecommendationDecision) {
  return (
    productField(decision, "title") ||
    productField(decision, "name") ||
    decision.sku
  );
}

function productDescription(decision: RecommendationDecision) {
  return (
    productField(decision, "description") ||
    "Open the product call card to review the governed product detail."
  );
}

function buildRequest(need: Partial<FinderNeedDraft>): ProductSelectorRequest {
  return {
    mode: "recommendations",
    query: need.query ?? "",
    technicalRequirement: need.technicalRequirement ?? "",
    productPath: need.productPath ?? "",
    technologyType: need.technologyType ?? "",
    signalType: need.signalType ?? "",
    sourceConnector: need.sourceConnector ?? "",
    displayConnector: need.displayConnector ?? "",
    inputs: need.inputs ?? "",
    outputs: need.outputs ?? "",
    distance: need.distance ?? "",
    resolution: need.resolution ?? "",
    usb: need.usb ?? "",
    audio: need.audio ?? "",
    network: need.network ?? "",
    processing: need.processing ?? "",
    control: need.control ?? "",
    includeArchitectureAlternatives: true,
    limit: 30,
  };
}

function selectionFromDecision(
  decision: RecommendationDecision,
): StoredProductSelection {
  const status =
    decision.status === "compatible"
      ? "recommended"
      : decision.status === "blocked"
        ? "caution"
        : "alternative";

  return {
    sku: decision.sku,
    title: productTitle(decision),
    family: productField(decision, "family"),
    category:
      productField(decision, "category") ||
      decision.profile.productClass.replace(/-/g, " "),
    status,
    tags: list((decision.product as Record<string, unknown>).tags),
    addedAt: new Date().toISOString(),
    source: "Discovery Recommendations",
    evidence: decision.reasons,
    cautions: decision.warningReasons,
  };
}

function quoteStatusLabel(brief: StoredDiscoveryBrief | null) {
  if (brief?.quoteSafetyStatus === "quote-ready") return "Quote-ready draft";
  if (brief?.quoteSafetyStatus === "validate-before-quote") {
    return "Validate before quote";
  }
  return "Do not quote yet";
}

export function RecommendationsPage() {
  const { activeProject } = useProjectStore();
  const [brief, setBrief] = useState<StoredDiscoveryBrief | null>(null);
  const [need, setNeed] = useState<Partial<FinderNeedDraft>>({});
  const [decisions, setDecisions] = useState<RecommendationDecision[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    const latestBrief = readLatestDiscoveryBrief();

    if (!latestBrief) {
      setLoadState("missing");
      return () => {
        cancelled = true;
      };
    }

    const nextNeed = discoveryBriefToFinderNeed(latestBrief);

    if (!nextNeed) {
      setBrief(latestBrief);
      setLoadState("missing");
      return () => {
        cancelled = true;
      };
    }

    setBrief(latestBrief);
    setNeed(nextNeed);
    setLoadState("loading");

    loadWingmanProductSelectorDecisions(buildRequest(nextNeed))
      .then((nextDecisions) => {
        if (cancelled) return;
        setDecisions(nextDecisions);
        setLoadState("ready");
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("[wingman] Recommendations: product selector load failed", error);
        setLoadState("error");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const matches = useMemo(
    () =>
      decisions
        .filter((decision) => decision.eligible)
        .filter((decision) => decision.status !== "dependency")
        .slice(0, 12),
    [decisions],
  );

  const roomModel = brief?.roomModel ?? {};
  const missingInformation = brief?.missingInformation ?? [];
  const requirementSummary = [
    need.technicalRequirement,
    need.productPath,
    need.distance,
    need.resolution,
    need.usb,
  ].filter(Boolean);

  function addToProject(decision: RecommendationDecision) {
    const savedProject = saveProductSelectionToCurrentProject(
      selectionFromDecision(decision),
    );

    setMessage(
      savedProject
        ? `${decision.sku} added to ${savedProject.name}.`
        : `${decision.sku} could not be added to a project.`,
    );
  }

  function reloadRecommendations() {
    const latestBrief = readLatestDiscoveryBrief();
    const nextNeed = discoveryBriefToFinderNeed(latestBrief);

    if (!latestBrief || !nextNeed) {
      setLoadState("missing");
      return;
    }

    setBrief(latestBrief);
    setNeed(nextNeed);
    setLoadState("loading");
    setMessage("");

    loadWingmanProductSelectorDecisions(buildRequest(nextNeed))
      .then((nextDecisions) => {
        setDecisions(nextDecisions);
        setLoadState("ready");
      })
      .catch((error) => {
        console.error("[wingman] Recommendations: product selector reload failed", error);
        setLoadState("error");
      });
  }

  return (
    <main
      className="wm-page wm-recommendations-page"
      data-wingman-page="true"
      data-wingman-page-key="recommendations"
    >
      <PageHero
        eyebrow="Discovery recommendations"
        title="Products matched to the completed requirement."
        purpose="Wingman uses the saved Discovery brief and the shared governed selector. No second discovery questionnaire is required."
        nextMove="Review the shortlist, validate cautions and add suitable products to the active project."
      />

      {loadState === "missing" ? (
        <SectionCard
          title="Complete Discovery first"
          subtitle="Recommendations require a saved Discovery brief so the selector has a room, application and technical requirement to evaluate."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Link
              className="wm-ui-button wm-ui-button-primary rounded-xl px-4 py-3 text-center font-black"
              to={routeCatalogByKey.discovery.path}
            >
              Open Discovery
            </Link>
            <Link
              className="wm-ui-button wm-ui-button-secondary rounded-xl px-4 py-3 text-center font-black"
              to={routeCatalogByKey.catalogBrowser.path}
            >
              Browse the catalogue instead
            </Link>
          </div>
        </SectionCard>
      ) : null}

      {loadState === "loading" ? (
        <SectionCard
          title="Calculating recommendations"
          subtitle="Wingman is applying product-class, lifecycle, role and compatibility gates."
        >
          <div className="flex items-center gap-3 p-4">
            <RefreshCw className="h-5 w-5 animate-spin" aria-hidden="true" />
            <span>Loading the governed product index and matching the Discovery brief.</span>
          </div>
        </SectionCard>
      ) : null}

      {loadState === "error" ? (
        <SectionCard
          title="Recommendations could not be calculated"
          subtitle="The saved Discovery brief remains available. Retry the product selector or review the brief."
        >
          <div className="flex flex-wrap gap-3">
            <button
              className="wm-ui-button wm-ui-button-primary rounded-xl px-4 py-3 font-black"
              type="button"
              onClick={reloadRecommendations}
            >
              Retry recommendations
            </button>
            <Link
              className="wm-ui-button wm-ui-button-secondary rounded-xl px-4 py-3 font-black"
              to={routeCatalogByKey.discovery.path}
            >
              Review Discovery
            </Link>
          </div>
        </SectionCard>
      ) : null}

      {brief && loadState === "ready" ? (
        <>
          <SectionCard
            title="Requirement used for matching"
            subtitle={text(
              roomModel.summary,
              text(
                roomModel.outcome,
                "The current saved Discovery brief was converted into governed selector requirements.",
              ),
            )}
          >
            <div className="grid gap-3 md:grid-cols-3">
              <article className="wm-ui-card rounded-2xl border p-4">
                <span className="wm-ui-kicker">Application</span>
                <strong className="mt-2 block">
                  {text(roomModel.application, text(roomModel.roomType, "Not confirmed"))}
                </strong>
              </article>
              <article className="wm-ui-card rounded-2xl border p-4">
                <span className="wm-ui-kicker">Matching basis</span>
                <strong className="mt-2 block">
                  {requirementSummary.join(" · ") || "General product direction"}
                </strong>
              </article>
              <article className="wm-ui-card rounded-2xl border p-4">
                <span className="wm-ui-kicker">Quote status</span>
                <strong className="mt-2 block">{quoteStatusLabel(brief)}</strong>
              </article>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                className="wm-ui-button wm-ui-button-secondary rounded-xl px-4 py-3 font-black"
                to={routeCatalogByKey.discovery.path}
              >
                Review Discovery
              </Link>
              <button
                className="wm-ui-button wm-ui-button-secondary rounded-xl px-4 py-3 font-black"
                type="button"
                onClick={reloadRecommendations}
              >
                Recalculate
              </button>
              <Link
                className="wm-ui-button wm-ui-button-secondary rounded-xl px-4 py-3 font-black"
                to={routeCatalogByKey.catalogBrowser.path}
              >
                Browse full catalogue
              </Link>
            </div>
          </SectionCard>

          {missingInformation.length ? (
            <SectionCard
              title="Checks still required"
              subtitle="These points remain visible because an estimated recommendation must not be presented as a confirmed design."
            >
              <ul className="grid gap-2">
                {missingInformation.map((item) => (
                  <li className="flex items-start gap-2" key={item}>
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </SectionCard>
          ) : null}

          <SectionCard
            title="Recommended WyreStorm products"
            subtitle={
              matches.length
                ? `${matches.length} governed lead candidate${matches.length === 1 ? "" : "s"} matched the saved requirement.`
                : "No eligible product passed the current compatibility gates."
            }
          >
            {matches.length ? (
              <div className="grid gap-4 xl:grid-cols-2">
                {matches.map((decision, index) => (
                  <article
                    className="wm-ui-card rounded-2xl border p-5"
                    key={decision.sku}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <span className="wm-ui-kicker">
                          {index === 0 ? "Primary direction" : "Alternative"}
                        </span>
                        <h2 className="wm-ui-title mt-1 text-2xl font-black">{decision.sku}</h2>
                        <p className="mt-1 font-bold">{productTitle(decision)}</p>
                      </div>
                      {decision.status === "compatible" ? (
                        <CheckCircle2 className="h-6 w-6 shrink-0" aria-label="Compatible" />
                      ) : (
                        <ShieldCheck className="h-6 w-6 shrink-0" aria-label="Review required" />
                      )}
                    </div>

                    <p className="wm-ui-copy mt-4 text-sm leading-6">
                      {productDescription(decision)}
                    </p>

                    <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="font-black">Product class</dt>
                        <dd>{decision.profile.productClass.replace(/-/g, " ")}</dd>
                      </div>
                      <div>
                        <dt className="font-black">Lifecycle</dt>
                        <dd>{decision.lifecycleLabel}</dd>
                      </div>
                    </dl>

                    {decision.reasons.length ? (
                      <ul className="mt-4 grid gap-1 text-sm">
                        {decision.reasons.slice(0, 3).map((reason) => (
                          <li key={reason}>• {reason}</li>
                        ))}
                      </ul>
                    ) : null}

                    {decision.warningReasons.length ? (
                      <div className="mt-4 rounded-xl border p-3 text-sm">
                        <strong>Validate before selection</strong>
                        <ul className="mt-2 grid gap-1">
                          {decision.warningReasons.slice(0, 3).map((warning) => (
                            <li key={warning}>• {warning}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    <div className="mt-5 flex flex-wrap gap-3">
                      <button
                        className="wm-ui-button wm-ui-button-primary rounded-xl px-4 py-3 font-black"
                        type="button"
                        onClick={() => addToProject(decision)}
                      >
                        Add to project
                      </button>
                      <Link
                        className="wm-ui-button wm-ui-button-secondary rounded-xl px-4 py-3 font-black"
                        to={`${routeCatalogByKey.productCallCards.path}/${encodeURIComponent(decision.sku)}`}
                      >
                        Open product card
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border p-5">
                <strong className="wm-ui-title">No safe product direction yet.</strong>
                <p className="wm-ui-copy mt-2">
                  Review the missing information or broaden the architecture in Discovery before selecting a SKU.
                </p>
              </div>
            )}
          </SectionCard>

          {message ? (
            <div className="wm-ui-card mt-4 rounded-xl border p-4 font-bold">
              {message}
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              className="wm-ui-button wm-ui-button-secondary rounded-xl px-4 py-3 font-black"
              to={
                activeProject
                  ? `${routeCatalogByKey.projects.path}/${activeProject.id}`
                  : routeCatalogByKey.projects.path
              }
            >
              Open project
            </Link>
            <Link
              className="wm-ui-button wm-ui-button-primary rounded-xl px-4 py-3 font-black"
              to={routeCatalogByKey.proposal.path}
            >
              Continue to response pack
            </Link>
          </div>
        </>
      ) : null}
    </main>
  );
}

export default RecommendationsPage;
