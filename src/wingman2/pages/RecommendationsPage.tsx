import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, Boxes, Check, CheckCircle2, Link2, PackageCheck, PencilLine, RefreshCw, Route, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

import { routeCatalogByKey } from "../app/routeCatalog";
import { PageHero } from "../components/PageHero";
import { SectionCard } from "../components/SectionCard";
import {
  saveProductSelectionToCurrentProject,
  saveDiscoveryBriefToProject,
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
import {
  buildSystemDesign,
  productMatchesSlot,
  ucAllInOneCoverage,
  type SystemSlot,
} from "../lib/discoverySystemDesign";
import { readClassificationFacts } from "../lib/productStoryEngine";
import { resolveProductTechnicalData } from "../lib/governedProductTechnicalData";
import { normaliseSkuKey } from "../lib/skuAliasResolver";
import { GovernedDataBadge } from "../components/GovernedDataBadge";
import { GovernedSpecEvidence } from "../components/GovernedSpecEvidence";
import { VerifyBeforeQuoteNote } from "../components/VerifyBeforeQuoteNote";
import { useWingmanProfile } from "../data/wingmanProfile";
import { buildDesignAssuranceLedger } from "../lib/productAssurance";

type RecommendationDecision = Awaited<
  ReturnType<typeof loadWingmanProductSelectorDecisions>
>[number];

type LoadState = "loading" | "ready" | "missing" | "error";

type MissingDetailDefinition = {
  group: string;
  fields: string[];
  prompt: string;
  placeholder: string;
  options?: string[];
};

function missingDetailDefinition(item: string): MissingDetailDefinition {
  const value = item.toLowerCase();
  if (value.includes("scale")) return {
    group: "scale",
    fields: ["scale", "roomScale"],
    prompt: "Select the approximate system scale",
    placeholder: "Choose a scale",
    options: ["Small room / local system", "Medium room / departmental system", "Large room / multi-zone system", "Enterprise / site-wide system"],
  };
  if (value.includes("source profile")) return {
    group: "source-profile",
    fields: ["sourceProfile"],
    prompt: "Select the closest source profile",
    placeholder: "Choose a source profile",
    options: ["Fixed sources in one rack", "Local room sources", "Distributed or remote-room sources", "Mixed local and distributed sources"],
  };
  if (value.includes("cable length")) return {
    group: "cable-validation",
    fields: ["cableRunValidation"],
    prompt: "Record the cable-route validation status",
    placeholder: "Choose a validation status",
    options: ["Measured and confirmed on site", "Confirmed from approved drawings", "Estimated — site survey still required"],
  };
  if (value.includes("network ownership")) return {
    group: "network",
    fields: ["networkAvailability", "network"],
    prompt: "Confirm the network position",
    placeholder: "Choose the network position",
    options: ["Dedicated AV network approved", "Existing managed LAN approved by IT", "WyreStorm network switch to be supplied", "IT review still required"],
  };
  if (value.includes("usb host ownership")) return {
    group: "usb",
    fields: ["usbTransport", "usbNeeds"],
    prompt: "Describe the USB host, peripheral location and required USB version",
    placeholder: "Example: Room PC in rack to USB 3.0 camera at front wall, bidirectional control required",
  };
  if (value.includes("display/output count")) return {
    group: "display",
    fields: ["displayCount", "displayBehaviour"],
    prompt: "Enter the display count and required behaviour",
    placeholder: "Example: 4 outputs; one canvas with optional independent source routing",
  };
  if (value.includes("video wall layout")) return {
    group: "video-wall-design",
    fields: ["videoWallDesignValidation", "videoWallRequirement"],
    prompt: "Confirm the wall layout, source count, presets and control behaviour",
    placeholder: "Example: 3 × 3 LCD, 6 sources, full-wall plus four presets, app control",
  };
  if (value.includes("wall layout")) return {
    group: "wall-path",
    fields: ["videoWallRequirement", "processingRequirement"],
    prompt: "Confirm the canvas, source behaviour and processor path",
    placeholder: "Example: Direct-view LED, six floating windows, NHD-150-RX feeding the LED processor",
  };
  return {
    group: item.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    fields: ["recommendationValidationNotes"],
    prompt: "Add the missing design detail",
    placeholder: "Enter the confirmed requirement",
  };
}

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
    // An AV-over-IP controller is filed as a dependency and is still a required
    // line on the quote, so dependencies must be selectable. Discontinued and
    // do-not-spec products stay excluded - `includeDiscontinued` is left off
    // deliberately, and slot candidates are filtered on eligibility below.
    includeDependencies: true,
    // Unlimited. The flat shortlist still shows 12, but the system design has
    // to bucket candidates into slots (encoder, decoder, controller, extender,
    // camera, microphone), and a decoder will never appear inside the top 30
    // ranked against a whole-room requirement.
  };
}

// Slot candidates come from a SECOND, deliberately unconstrained selector pass.
//
// The whole-room need ("distributed 4K60 AV-over-IP over a 70m run") is the
// right filter for the lead-product shortlist, and the wrong one for a slot:
// its compatibility gate rejects a ceiling microphone and a PTZ camera for not
// being distribution products, so the microphone and camera slots silently
// emptied - a bill of materials quietly missing the parts the room needs.
//
// This pass applies no requirement filtering, so lifecycle governance and the
// governed taxonomy decide slot membership. Discontinued, do-not-spec,
// superseded and admin-blocked SKUs are still excluded, because
// `includeDiscontinued` stays off and candidates are filtered on eligibility.
function buildSlotRequest(): ProductSelectorRequest {
  return {
    mode: "recommendations",
    includeDependencies: true,
    includeAccessories: true,
    includeArchitectureAlternatives: true,
  };
}

type SystemSlotResult = {
  slot: SystemSlot;
  candidates: RecommendationDecision[];
  ucCovered?: boolean;
};

function decisionClassification(decision: RecommendationDecision) {
  return readClassificationFacts(decision.product as unknown as Record<string, unknown>);
}

function selectionFromDecision(
  decision: RecommendationDecision,
  quantity?: number,
): StoredProductSelection {
  const status =
    decision.status === "compatible"
      ? "recommended"
      : decision.status === "blocked"
        ? "caution"
        : "alternative";

  return {
    sku: decision.sku,
    quantity,
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
  const { profile } = useWingmanProfile();
  const [brief, setBrief] = useState<StoredDiscoveryBrief | null>(null);
  const [need, setNeed] = useState<Partial<FinderNeedDraft>>({});
  const [decisions, setDecisions] = useState<RecommendationDecision[]>([]);
  const [slotPool, setSlotPool] = useState<RecommendationDecision[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [message, setMessage] = useState("");
  const [editingCheck, setEditingCheck] = useState("");
  const [detailAnswers, setDetailAnswers] = useState<Record<string, string>>({});

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

    Promise.all([
      loadWingmanProductSelectorDecisions(buildRequest(nextNeed)),
      loadWingmanProductSelectorDecisions(buildSlotRequest()),
    ])
      .then(([nextDecisions, nextSlotPool]) => {
        if (cancelled) return;
        setDecisions(nextDecisions);
        setSlotPool(nextSlotPool);
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

  // Data tier behind each match card, resolved from the same governed engine
  // the Compare, Pitch and Catalog surfaces use, so the badge on every
  // recommendation tells the same story (verified vs official vs inferred).
  const governedTiers = useMemo(() => {
    const tiers = new Map<string, string>();
    for (const decision of decisions) {
      tiers.set(normaliseSkuKey(decision.sku), resolveProductTechnicalData(decision.product).sourceTier);
    }
    return tiers;
  }, [decisions]);

  // A room brief describes a system, not a product. Decompose it into the slots
  // the system needs and resolve each one, so a Discovery that captured four
  // sources and six displays produces encoders, decoders and a controller
  // rather than twelve alternatives for a single unnamed box.
  const systemBrief = useMemo<StoredDiscoveryBrief | null>(() => {
    const videoWallBelongsToBrief =
      brief?.savedAt && activeProject?.discoveryBrief?.savedAt === brief.savedAt;
    if (!brief || !activeProject?.videowall || !videoWallBelongsToBrief) return brief;
    return {
      ...brief,
      roomModel: {
        ...(brief.roomModel ?? {}),
        wallType: activeProject.videowall.wallType,
        configuredVideowall: activeProject.videowall.summary,
      },
    };
  }, [activeProject?.discoveryBrief?.savedAt, activeProject?.videowall, brief]);
  const design = useMemo(() => buildSystemDesign(systemBrief), [systemBrief]);

  const systemSlots = useMemo<SystemSlotResult[]>(
    () => {
      // Step 1: build raw slots with candidates.
      const raw = design.slots.map((slot) => ({
        slot,
        candidates: slot.supply === "external" ? [] : slotPool
          .filter((decision) => decision.eligible)
          .filter((decision) => productMatchesSlot(decisionClassification(decision), slot))
          .slice(0, 4),
      }));

      // Step 2: detect UC all-in-ones among each slot's lead candidate.  When
      // a video bar (camera + video-bar) or speakerphone is selected for one
      // slot, it already covers camera/microphone/speaker roles.  Suppress the
      // redundant slots so the system does not recommend three separate
      // products for what one UC device handles.
      const coveredByUc = new Set<string>();
      for (const entry of raw) {
        const lead = entry.candidates[0];
        if (!lead) continue;
        const coverage = ucAllInOneCoverage(decisionClassification(lead));
        if (coverage) {
          for (const slotKind of coverage) coveredByUc.add(slotKind);
        }
      }

      if (coveredByUc.size === 0) return raw;

      return raw.map((entry) => {
        if (coveredByUc.has(entry.slot.kind)) {
          return { ...entry, candidates: [], ucCovered: true };
        }
        return entry;
      });
    },
    [design, slotPool],
  );

  const unfilledSlots = useMemo(
    () => systemSlots.filter((entry) => entry.slot.supply === "wyrestorm" && !entry.candidates.length),
    [systemSlots],
  );

  function addSlotToProject(slot: SystemSlot, decision: RecommendationDecision) {
    const selection = selectionFromDecision(decision, slot.quantity);
    const savedProject = saveProductSelectionToCurrentProject({
      ...selection,
      source: `Discovery system design - ${slot.label}`,
      evidence: [
        `Fills the ${slot.label} slot (qty ${slot.quantity}): ${slot.purpose}`,
        ...(selection.evidence ?? []),
      ],
    });

    setMessage(
      savedProject
        ? `${decision.sku} added to ${savedProject.name} as ${slot.label} (qty ${slot.quantity}).`
        : `${decision.sku} could not be added to a project.`,
    );
  }

  function addWholeSystemToProject() {
    const filled = systemSlots.filter((entry) => entry.candidates.length);

    if (!filled.length) {
      setMessage("No system slots could be filled from the catalogue yet.");
      return;
    }

    const selectionsBySku = new Map<string, {
      decision: RecommendationDecision;
      quantity: number;
      slotEvidence: string[];
    }>();

    for (const entry of filled) {
      const decision = entry.candidates[0];
      const existing = selectionsBySku.get(decision.sku);
      const slotEvidence = `Fills the ${entry.slot.label} slot (qty ${entry.slot.quantity}): ${entry.slot.purpose}`;

      if (existing) {
        existing.quantity += entry.slot.quantity;
        existing.slotEvidence.push(slotEvidence);
      } else {
        selectionsBySku.set(decision.sku, {
          decision,
          quantity: entry.slot.quantity,
          slotEvidence: [slotEvidence],
        });
      }
    }

    let saved = 0;
    let projectName = "";

    for (const entry of selectionsBySku.values()) {
      const selection = selectionFromDecision(entry.decision, entry.quantity);
      const savedProject = saveProductSelectionToCurrentProject({
        ...selection,
        source: "Discovery system design - whole system",
        evidence: [
          ...entry.slotEvidence,
          ...(selection.evidence ?? []),
        ],
      });

      if (savedProject) {
        saved += 1;
        projectName = savedProject.name;
      }
    }

    const skipped = unfilledSlots.length;
    setMessage(
      saved
        ? `${saved} product${saved === 1 ? "" : "s"} added to ${projectName}.${
            skipped ? ` ${skipped} slot${skipped === 1 ? "" : "s"} still need a product.` : ""
          }`
        : "The system could not be added to a project.",
    );
  }

  const roomModel = useMemo(() => brief?.roomModel ?? {}, [brief]);

  // Run the full assurance ledger against the active project's product
  // selections so chain, regional, power, network and feedback checks surface
  // at selection time — not only at proposal export.
  const assurance = useMemo(() => {
    const products = activeProject?.productSelections ?? [];
    if (!products.length) return null;
    const requirementText = [
      need.technicalRequirement,
      need.productPath,
      need.distance,
      need.resolution,
      need.usb,
      roomModel.outcome,
      roomModel.application,
      roomModel.summary,
    ].filter(Boolean).join(" ");
    return buildDesignAssuranceLedger({
      products,
      requirementText,
      discoveryPercent: brief?.capturedPercent ?? (brief ? 100 : 0),
      topology: activeProject?.discoveryBrief?.topology,
      region: profile.region,
      feedback: activeProject?.feedback,
    });
  }, [activeProject, brief, need, roomModel, profile.region]);

  const missingInformation = brief?.missingInformation ?? [];
  const requirementSummary = [
    need.technicalRequirement,
    need.productPath,
    need.distance,
    need.resolution,
    need.usb,
  ].filter(Boolean);
  const requiredSystemSlots = systemSlots.filter(({ slot }) => slot.required);
  const resolvedSystemSlots = requiredSystemSlots.filter(
    ({ slot, candidates }) => slot.supply === "external" || candidates.length > 0,
  );
  const systemUnitCount = systemSlots.reduce((total, { slot }) => total + slot.quantity, 0);

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

    Promise.all([
      loadWingmanProductSelectorDecisions(buildRequest(nextNeed)),
      loadWingmanProductSelectorDecisions(buildSlotRequest()),
    ])
      .then(([nextDecisions, nextSlotPool]) => {
        setDecisions(nextDecisions);
        setSlotPool(nextSlotPool);
        setLoadState("ready");
      })
      .catch((error) => {
        console.error("[wingman] Recommendations: product selector reload failed", error);
        setLoadState("error");
      });
  }

  function saveMissingDetail(item: string) {
    if (!brief) return;
    const definition = missingDetailDefinition(item);
    const answer = text(detailAnswers[definition.group]);
    if (!answer) {
      setMessage("Enter or select the missing detail before saving it.");
      return;
    }

    const remainingMissing = missingInformation.filter(
      (candidate) => missingDetailDefinition(candidate).group !== definition.group,
    );
    const nextRoomModel = { ...(brief.roomModel ?? {}) };
    definition.fields.forEach((field) => {
      nextRoomModel[field] = field === "usbNeeds" ? [answer] : answer;
    });

    const nextBrief: StoredDiscoveryBrief = {
      ...brief,
      roomModel: nextRoomModel,
      missingInformation: remainingMissing,
      nextBestQuestion: remainingMissing[0] ?? "",
      quoteSafetyStatus: remainingMissing.length ? "do-not-quote-yet" : "validate-before-quote",
      inference: {
        ...(brief.inference ?? {}),
        missing: remainingMissing,
        risks: remainingMissing,
        quoteSafetyStatus: remainingMissing.length ? "do-not-quote-yet" : "validate-before-quote",
      },
    };
    const nextNeed = discoveryBriefToFinderNeed(nextBrief);
    saveDiscoveryBriefToProject(nextBrief, activeProject?.id);
    setBrief(nextBrief);
    setEditingCheck("");
    setMessage(`Saved: ${definition.prompt}. Recommendations are being recalculated.`);

    if (!nextNeed) return;
    setNeed(nextNeed);
    setLoadState("loading");
    Promise.all([
      loadWingmanProductSelectorDecisions(buildRequest(nextNeed)),
      loadWingmanProductSelectorDecisions(buildSlotRequest()),
    ])
      .then(([nextDecisions, nextSlotPool]) => {
        setDecisions(nextDecisions);
        setSlotPool(nextSlotPool);
        setLoadState("ready");
        setMessage("Detail saved and the system recommendation has been updated.");
      })
      .catch((error) => {
        console.error("[wingman] Recommendations: inline detail recalculation failed", error);
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
        title="Build the complete system."
        purpose="Wingman has translated the Discovery brief into the product roles, quantities and dependencies needed to make the design work as one system."
        nextMove="Review the proposed architecture, confirm unresolved checks, then add the complete system to the active project."
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
          <div className="wm-rec-context-card">
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
            <div className="wm-rec-requirement-grid">
              <article className="wm-rec-requirement">
                <span className="wm-ui-kicker">Application</span>
                <strong className="mt-2 block">
                  {text(roomModel.application, text(roomModel.roomType, "Not confirmed"))}
                </strong>
              </article>
              <article className="wm-rec-requirement">
                <span className="wm-ui-kicker">Matching basis</span>
                <strong className="mt-2 block">
                  {requirementSummary.join(" · ") || "General product direction"}
                </strong>
              </article>
              <article className="wm-rec-requirement">
                <span className="wm-ui-kicker">Quote status</span>
                <strong className="mt-2 block">{quoteStatusLabel(brief)}</strong>
              </article>
            </div>

            <div className="wm-rec-context-actions">
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
          </div>

          {missingInformation.length ? (
            <div className="wm-rec-checks-card">
            <SectionCard
              title="Checks still required"
              subtitle="These points remain visible because an estimated recommendation must not be presented as a confirmed design."
            >
              <ul className="wm-rec-check-list">
                {missingInformation.map((item) => {
                  const definition = missingDetailDefinition(item);
                  const isEditing = editingCheck === definition.group;
                  return (
                    <li className={isEditing ? "is-editing" : ""} key={item}>
                      <div className="wm-rec-check-summary">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                        <span>{item}</span>
                        <button
                          type="button"
                          aria-expanded={isEditing}
                          onClick={() => setEditingCheck(isEditing ? "" : definition.group)}
                        >
                          <PencilLine size={14} aria-hidden="true" />
                          {isEditing ? "Cancel" : "Complete"}
                        </button>
                      </div>
                      {isEditing ? (
                        <div className="wm-rec-check-editor">
                          <label htmlFor={`missing-${definition.group}`}>{definition.prompt}</label>
                          {definition.options ? (
                            <select
                              id={`missing-${definition.group}`}
                              value={detailAnswers[definition.group] ?? ""}
                              onChange={(event) => setDetailAnswers((current) => ({ ...current, [definition.group]: event.target.value }))}
                            >
                              <option value="">{definition.placeholder}</option>
                              {definition.options.map((option) => <option key={option} value={option}>{option}</option>)}
                            </select>
                          ) : (
                            <input
                              id={`missing-${definition.group}`}
                              value={detailAnswers[definition.group] ?? ""}
                              onChange={(event) => setDetailAnswers((current) => ({ ...current, [definition.group]: event.target.value }))}
                              placeholder={definition.placeholder}
                            />
                          )}
                          <button type="button" onClick={() => saveMissingDetail(item)}>
                            <Check size={15} aria-hidden="true" /> Save detail
                          </button>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </SectionCard>
            </div>
          ) : null}

          {design.slots.length ? (
            <section className="wm-rec-system wm-ui-card" aria-labelledby="wm-rec-system-title">
              <header className="wm-rec-system-header">
                <div className="wm-rec-system-heading">
                  <span className="wm-rec-system-icon"><Boxes size={25} aria-hidden="true" /></span>
                  <div>
                    <p className="wm-ui-kicker">Proposed system architecture</p>
                    <h2 id="wm-rec-system-title">What the complete solution needs</h2>
                    <p>{design.architectureReason} Each card below is a different job in the system—not an alternative to the whole design.</p>
                  </div>
                </div>
                <div className="wm-rec-system-stats" aria-label="System design status">
                  <span><strong>{resolvedSystemSlots.length}/{requiredSystemSlots.length}</strong> required roles resolved</span>
                  <span><strong>{systemUnitCount}</strong> total units</span>
                  <span className={unfilledSlots.length ? "is-warning" : "is-ready"}>
                    {unfilledSlots.length ? `${unfilledSlots.length} role${unfilledSlots.length === 1 ? "" : "s"} need review` : "System roles covered"}
                  </span>
                </div>
              </header>

              <div className="wm-rec-system-flow" aria-label="System signal path">
                {systemSlots.map(({ slot }, index) => (
                  <div className="wm-rec-flow-step" key={`flow-${slot.kind}`}>
                    <span>{index + 1}</span>
                    <strong>{slot.label}</strong>
                    {index < systemSlots.length - 1 ? <ArrowRight size={16} aria-hidden="true" /> : null}
                  </div>
                ))}
              </div>

              <div className="wm-rec-slot-list">
                {systemSlots.map(({ slot, candidates, ucCovered }, index) => {
                  const lead = candidates[0];
                  const alternatives = candidates.slice(1);
                  return (
                    <article className={`wm-rec-slot${slot.supply === "external" ? " is-external" : ""}${!lead && slot.supply === "wyrestorm" && !ucCovered ? " is-unresolved" : ""}${ucCovered ? " is-uc-covered" : ""}`} key={slot.kind}>
                      <div className="wm-rec-slot-index">{index + 1}</div>
                      <div className="wm-rec-slot-copy">
                        <div className="wm-rec-slot-title-row">
                          <div>
                            <span className="wm-rec-slot-role">System role</span>
                            <h3>{slot.label}</h3>
                          </div>
                          <div className="wm-rec-slot-badges">
                            <span className={slot.required ? "is-required" : "is-optional"}>{slot.required ? "Required" : "Optional"}</span>
                            <span>Qty {slot.quantity}</span>
                          </div>
                        </div>
                        <p className="wm-rec-slot-purpose">{slot.purpose}</p>

                        {slot.supply === "external" ? (
                          <div className="wm-rec-external-dependency">
                            <Link2 size={20} aria-hidden="true" />
                            <div>
                              <strong>Mandatory external dependency</strong>
                              <span>Specify the LED manufacturer’s processor/controller separately. It is required, but it is not a WyreStorm product.</span>
                            </div>
                          </div>
                        ) : lead ? (
                          <div className="wm-rec-lead-product">
                            <div className="wm-rec-product-check"><Check size={18} aria-hidden="true" /></div>
                            <div>
                              <span>Best fit for this role</span>
                              <strong>{lead.sku}</strong>
                              <p>{productTitle(lead)}</p>
                            </div>
                            <button type="button" className="wm-ui-button wm-ui-button-secondary" onClick={() => addSlotToProject(slot, lead)}>
                              Add role
                            </button>
                          </div>
                        ) : ucCovered ? (
                          <div className="wm-rec-uc-covered">
                            <Check size={20} aria-hidden="true" />
                            <div><strong>Covered by UC all-in-one</strong><span>This role is built into the selected UC video bar or speakerphone. No separate product is needed.</span></div>
                          </div>
                        ) : (
                          <div className="wm-rec-unresolved">
                            <AlertTriangle size={20} aria-hidden="true" />
                            <div><strong>Product not resolved</strong><span>This role still belongs on the quote. Validate it with pre-sales before sending.</span></div>
                          </div>
                        )}

                        <div className="wm-rec-slot-evidence"><Route size={15} aria-hidden="true" /><span>Included because {slot.derivedFrom.join(" · ")}</span></div>

                        {alternatives.length ? (
                          <details className="wm-rec-alternatives">
                            <summary>Compare {alternatives.length} alternative{alternatives.length === 1 ? "" : "s"} for this role</summary>
                            <div>
                              {alternatives.map((decision) => (
                                <div className="wm-rec-alternative" key={decision.sku}>
                                  <span><strong>{decision.sku}</strong>{productTitle(decision)}</span>
                                  <button type="button" onClick={() => addSlotToProject(slot, decision)}>Use this instead</button>
                                </div>
                              ))}
                            </div>
                          </details>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>

              {design.openQuestions.length ? (
                <aside className="wm-rec-open-questions">
                  <div><AlertTriangle size={20} aria-hidden="true" /><strong>Confirm before final quote</strong></div>
                  <ul>{design.openQuestions.map((question) => <li key={question}>{question}</li>)}</ul>
                </aside>
              ) : null}

              <footer className="wm-rec-system-footer">
                <div><PackageCheck size={22} aria-hidden="true" /><span><strong>Add the proposed WyreStorm system</strong><small>Adds the best-fit product and correct quantity for every resolved role.</small></span></div>
                <button className="wm-ui-button wm-ui-button-primary" type="button" onClick={addWholeSystemToProject}>Add complete system to project</button>
              </footer>
            </section>
          ) : null}

          <details className="wm-rec-advanced-matches">
            <summary>Advanced: explore all matching products</summary>
          <SectionCard
            title="Additional governed product matches"
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

                    {decision.profile.specEvidence.io ||
                    decision.profile.specEvidence.usb ||
                    decision.profile.specEvidence.reach ? (
                      <div className="mt-4 rounded-xl border border-slate-700/60 bg-slate-900/40 p-3">
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                          <strong className="text-xs font-black uppercase tracking-wide text-slate-400">
                            Why it passed the gates
                          </strong>
                          <GovernedDataBadge tier={governedTiers.get(normaliseSkuKey(decision.sku))} />
                        </div>
                        <GovernedSpecEvidence evidence={decision.profile.specEvidence} />
                      </div>
                    ) : null}

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
          </details>

          {assurance && (assurance.blockers.length || assurance.warnings.length) ? (
            <section className="wm-rec-assurance wm-ui-card rounded-2xl border p-5">
              <header className="mb-4">
                <p className="wm-ui-kicker">System assurance checks</p>
                <h2 className="wm-ui-title text-xl font-black">Technical release gates</h2>
                <p className="wm-ui-copy text-sm">These checks run against the products already in the active project and surface issues the selector alone cannot see.</p>
              </header>
              {assurance.blockers.length ? (
                <div className="mb-4 rounded-xl border border-red-500/40 bg-red-950/40 p-4">
                  <strong className="text-sm font-black text-red-400">Must resolve before quoting</strong>
                  <ul className="mt-2 grid gap-2 text-sm">
                    {assurance.blockers.map((item) => (
                      <li key={item.id} className="flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" aria-hidden="true" />
                        <span>
                          {item.sku ? <strong>{item.sku}: </strong> : null}
                          {item.message}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {assurance.warnings.length ? (
                <div className="rounded-xl border border-amber-500/40 bg-amber-950/40 p-4">
                  <strong className="text-sm font-black text-amber-400">Validate before quoting</strong>
                  <ul className="mt-2 grid gap-2 text-sm">
                    {assurance.warnings.map((item) => (
                      <li key={item.id} className="flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
                        <span>
                          {item.sku ? <strong>{item.sku}: </strong> : null}
                          {item.message}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>
          ) : null}

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

          <VerifyBeforeQuoteNote className="mt-4" />
        </>
      ) : null}
    </main>
  );
}

export default RecommendationsPage;
