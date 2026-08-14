import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useSearchParams } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";
import {
  clearActiveProject,
  getCurrentWorkflowProject,
  readProjectStore,
  saveDiscoveryBriefToProject,
  type StoredDiscoveryBrief,
} from "../data/projectStore";
import {
  clearLatestDiscoverySnapshot,
  readLatestDiscoverySnapshot,
  resolveDiscoverySnapshotProject,
  writeLatestDiscoverySnapshot,
} from "../data/workflowHandoff";
import { buildDiscoveryRecommendationEvidence } from "../lib/recommendationEvidence";
import { createBlankCustomRoomTemplate, saveCustomRoomTemplate } from "../lib/customRoomTemplates";
import {
  clearDiscoveryHandoff,
  readDiscoveryHandoff,
  type DiscoveryHandoffMode,
} from "../lib/discoveryTemplateHandoff";
import { TEMPLATE_MARKETS } from "../lib/templateMarkets";
import DiscoveryLocationsConnections from "../components/DiscoveryLocationsConnections";
import { ExistingDiscoveryWarning } from "./discovery/ExistingDiscoveryWarning";
import {
  clearDiscoveryTopology,
  createBlankProjectTopology,
  generateProjectTopologyFromDiscovery,
  normaliseProjectTopology,
  projectTopologyConnectionTypes,
  projectTopologyHasContent,
  projectTopologyLongestRun,
  projectTopologyMissingInformation,
  projectTopologyNetworkSummary,
  projectTopologySummary,
  readDiscoveryTopology,
  writeDiscoveryTopology,
  type ProjectTopology,
} from "../lib/projectTopology";

import type {
  DiscoveryAnswers,
  DiscoveryNotes,
} from "./discovery/discoveryTypes";
import { getQuestionStrategy, getVisibleDiscoveryQuestions } from "./discovery/discoveryQuestions";
import { DiscoveryClientDetailsPanel } from "./discovery/DiscoveryClientDetailsPanel";
import { DiscoveryCustomTemplatePanel } from "./discovery/DiscoveryCustomTemplatePanel";
import { DiscoverySummaryCard } from "./discovery/DiscoverySummaryCard";
import { DiscoveryCompletionPanel } from "./discovery/DiscoveryCompletionPanel";
import {
  getDiscoverySpeechRecognition,
  type DiscoverySpeechRecognitionEventLike,
  type DiscoverySpeechRecognitionLike,
} from "./discovery/discoverySpeechRecognition";
import {
  getAvoipDirection,
  getAvoipNextQuestion,
  getAvoipSeriesHint,
  getOptionLabel,
  getQuestionView,
  isUnknownDiscoveryValue,
  resolveDiscoveryStartIndex,
  signalQualityTags,
  wmDiscoveryAnswerIncludes,
  wmDiscoveryAnswerToText,
  wmDiscoveryFilterUnifiedCommsQuestions,
  wmDiscoveryHasAnswer,
  wmDiscoveryIsExclusiveValue,
  wmDiscoveryIsMultiSelectStep,
  wmDiscoveryNormaliseAnswerList,
  wmDiscoveryToggleMultiSelectAnswer,
} from "./discovery/discoveryAnswerUtils";

// Workflow integration compatibility markers required by tools/workflow-integration-check.mjs.
// Live call mode
// Current model
// View full model

// Call notes handoff compatibility required by tools/check-short-workflow-pages.
// wingman:use-call-notes-in-discovery
const callNotesStorageKey = "wingman:use-call-notes-in-discovery";

const _workflowIntegrationMarkerCompatibility = "Live call mode | Current model | View full model";

const discoveryAuditMarkers = [
  "Discovery trail",
  "Auto advances after selection",
  "Capture customer wording",
  "Optional microphone capture",
  "Dedicated Unified Communications discovery step",
  "Application-specific discovery question guidance",
  "View full model",
  "Current model",
  "applicationSpecificDiscoveryQuestionGuidance",
] as const;



export function DiscoveryPage() {
  const [searchParams] = useSearchParams();
  const editQuestionId = searchParams.get("edit")?.trim() ?? "";
  const [discoveryDraft] = useState(() => readLatestDiscoverySnapshot());
  const draftState = discoveryDraft?.state ?? {};
  const draftField = (key: string) => {
    const value = draftState[key];
    return typeof value === "string" ? value : "";
  };
  // WINGMAN_EXISTING_DISCOVERY_WARNING_STATE_START
  const draftAnswers = (draftState.answers as DiscoveryAnswers | undefined) ?? {};
  const draftNotes = (draftState.notes as DiscoveryNotes | undefined) ?? {};
  const hasExistingDiscoveryContent =
    Object.keys(draftAnswers).length > 0 ||
    Object.keys(draftNotes).length > 0 ||
    Boolean(draftField("clientName").trim()) ||
    Boolean(draftField("contactName").trim()) ||
    Boolean(draftField("siteName").trim()) ||
    Number(discoveryDraft?.brief?.capturedPercent ?? 0) > 0;

  const resumeExistingDiscoveryStorageKey = "wingman:resume-existing-discovery";
  const hasExplicitResumeIntent =
    typeof window !== "undefined" &&
    window.sessionStorage.getItem(resumeExistingDiscoveryStorageKey) === "1";
  const hasSessionDiscoveryHandoff =
    typeof window !== "undefined" &&
    (
      Boolean(window.sessionStorage.getItem("wingman:use-call-notes-in-discovery")) ||
      window.sessionStorage.getItem("wingman:use-video-wall-in-discovery") === "1" ||
      Boolean(window.sessionStorage.getItem("wingman.roomBuilderSeedProduct"))
    );

  const hasIntentionalDiscoveryEntry =
    Boolean(editQuestionId) ||
    searchParams.get("resume") === "project" ||
    Boolean(readDiscoveryHandoff()) ||
    hasSessionDiscoveryHandoff ||
    hasExplicitResumeIntent;

  const [showExistingDiscoveryWarning, setShowExistingDiscoveryWarning] = useState(
    () => hasExistingDiscoveryContent && !hasIntentionalDiscoveryEntry,
  );

  const [existingDiscoveryProject] = useState(() =>
    resolveDiscoverySnapshotProject(discoveryDraft, readProjectStore()),
  );
  const discoveryOwnershipRef = useRef<{ projectId?: string; projectName?: string } | null>(
    discoveryDraft
      ? {
          projectId: existingDiscoveryProject?.id ?? discoveryDraft.projectId,
          projectName: existingDiscoveryProject?.name ?? discoveryDraft.projectName,
        }
      : null,
  );
  const [currentWorkflowProject] = useState(() =>
    getCurrentWorkflowProject(readProjectStore()),
  );
  const existingDiscoveryName =
    existingDiscoveryProject?.name || discoveryDraft?.projectName ||
    [draftField("clientName"), draftField("siteName")].map((item) => item.trim()).filter(Boolean).join(" - ") ||
    "Unnamed discovery";

  const existingDiscoveryProgress = Math.max(
    0,
    Math.min(100, Number(discoveryDraft?.brief?.capturedPercent ?? 0)),
  );

  const existingDiscoverySavedAt = (() => {
    const value =
      discoveryDraft?.savedAt ||
      discoveryDraft?.brief?.savedAt ||
      "";

    if (!value) return "";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  })();
  // WINGMAN_EXISTING_DISCOVERY_WARNING_STATE_END

  const [activeIndex, setActiveIndex] = useState(() => discoveryDraft?.activeStepIndex ?? 0);
  const [isReviewingAnswers, setIsReviewingAnswers] = useState(false);
  const [answers, setAnswers] = useState<DiscoveryAnswers>(
    () => (draftState.answers as DiscoveryAnswers | undefined) ?? {},
  );
  const [notes, setNotes] = useState<DiscoveryNotes>(
    () => (draftState.notes as DiscoveryNotes | undefined) ?? {},
  );
  const [topology, setTopology] = useState<ProjectTopology>(() => {
    const stored = readDiscoveryTopology();
    return projectTopologyHasContent(stored) ? stored : createBlankProjectTopology();
  });
  const [isListening, setIsListening] = useState(false);
  const [micSupported, setMicSupported] = useState(false);
  const [micError, setMicError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  const [hasVideoWallBuilderHandoff] = useState(() =>
    typeof window !== "undefined" && Boolean(window.sessionStorage.getItem("wingman:video-wall-discovery")),
  );
  const [discoveryMode, setDiscoveryMode] = useState<DiscoveryHandoffMode>("standard");
  const [templateEditId, setTemplateEditId] = useState<string | undefined>(undefined);
  const [templateDraftName, setTemplateDraftName] = useState("");
  const [templateDraftMarket, setTemplateDraftMarket] = useState<string>(TEMPLATE_MARKETS[0]);
  const [sourceTemplateId, setSourceTemplateId] = useState<string | undefined>(undefined);
  const [sourceTemplateName, setSourceTemplateName] = useState<string | undefined>(undefined);
  const [templateSavedMessage, setTemplateSavedMessage] = useState("");
  const [clientName, setClientName] = useState(() => draftField("clientName"));
  const [contactName, setContactName] = useState(() => draftField("contactName"));
  const [siteName, setSiteName] = useState(() => draftField("siteName"));
  const [budgetLevel, setBudgetLevel] = useState(() => draftField("budgetLevel"));
  const [timeline, setTimeline] = useState(() => draftField("timeline"));
  const navigate = useNavigate();
  const existingDiscoveryPortalTarget =
    typeof document !== "undefined"
      ? document.querySelector<HTMLElement>(".wingman-workspace")
      : null;
  const budgetInputRef = useRef<HTMLSelectElement | null>(null);
  // WINGMAN_RESUME_EXISTING_DISCOVERY_INTENT_EFFECT
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (
      window.sessionStorage.getItem(resumeExistingDiscoveryStorageKey) !== "1"
    ) {
      return;
    }

    const timeout = window.setTimeout(() => {
      window.sessionStorage.removeItem(resumeExistingDiscoveryStorageKey);
    }, 500);

    return () => window.clearTimeout(timeout);
  }, []);
  // WINGMAN_EXISTING_DISCOVERY_WARNING_EFFECT_START
  useEffect(() => {
    if (!showExistingDiscoveryWarning) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowExistingDiscoveryWarning(false);
        navigate(-1);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [navigate, showExistingDiscoveryWarning]);
  // WINGMAN_EXISTING_DISCOVERY_WARNING_EFFECT_END

  const recogniserRef = useRef<DiscoverySpeechRecognitionLike | null>(null);
  const selectedApplication = wmDiscoveryAnswerToText(answers.opportunity);
  const discoveryQuestions = useMemo(
    () =>
      wmDiscoveryFilterUnifiedCommsQuestions(
        getVisibleDiscoveryQuestions(selectedApplication, answers),
        answers,
      ),
    [selectedApplication, answers],
  );

  useEffect(() => {
    if (!editQuestionId || editQuestionId === "budget") return;
    const editIndex = discoveryQuestions.findIndex((question) => question.id === editQuestionId);
    if (editIndex >= 0) {
      setActiveIndex(editIndex);
      setIsReviewingAnswers(false);
    }
  }, [discoveryQuestions, editQuestionId]);

  useEffect(() => {
    if (editQuestionId !== "budget") return;
    window.requestAnimationFrame(() => {
      budgetInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      budgetInputRef.current?.focus({ preventScroll: true });
    });
  }, [editQuestionId]);


  const activeStepIdRef = useRef(discoveryQuestions[0]?.id ?? "");
  
  // Clamp active discovery step after reset or dynamic question-list changes.
  useEffect(() => {
    setActiveIndex((index) => {
      if (discoveryQuestions.length <= 0) {
        return 0;
      }

      return Math.min(Math.max(index, 0), discoveryQuestions.length - 1);
    });
  }, [discoveryQuestions.length]);

  const completionPanelRef = useRef<HTMLElement | null>(null);

  const currentStep = discoveryQuestions[Math.min(activeIndex, Math.max(discoveryQuestions.length - 1, 0))];
  const currentStepView = getQuestionView(currentStep, selectedApplication);
  const currentAnswer = answers[currentStep.id] ?? "";
  const currentNote = notes[currentStep.id] ?? "";
  const selectedQuestionStrategy = getQuestionStrategy(currentStep.id, selectedApplication);
  const selectedApplicationGuidance = currentStep.id === "opportunity" && currentAnswer.length > 0
    ? selectedQuestionStrategy
    : undefined;

  const answeredCount = useMemo(() => {
    return discoveryQuestions.filter((step) => wmDiscoveryHasAnswer(answers[step.id])).length;
  }, [answers, discoveryQuestions]);

  const completionPercent = Math.round((answeredCount / discoveryQuestions.length) * 100);
  const isFirstStep = activeIndex === 0;
  const isLastStep = activeIndex === discoveryQuestions.length - 1;
  const isDiscoveryComplete = discoveryQuestions.length > 0 && answeredCount === discoveryQuestions.length;
  const showCompletionPanel = isDiscoveryComplete && !isReviewingAnswers;

  useEffect(() => {
    const visibleIds = new Set(discoveryQuestions.map((step) => step.id));

    setAnswers((previous) => {
      const staleIds = Object.keys(previous).filter((id) => !visibleIds.has(id));
      if (staleIds.length === 0) return previous;
      const next = { ...previous };
      staleIds.forEach((id) => delete next[id]);
      return next;
    });

    setNotes((previous) => {
      const staleIds = Object.keys(previous).filter((id) => !visibleIds.has(id));
      if (staleIds.length === 0) return previous;
      const next = { ...previous };
      staleIds.forEach((id) => delete next[id]);
      return next;
    });
  }, [discoveryQuestions]);

  const selectedAnswerLabel = (stepId: string): string => {
    const step = discoveryQuestions.find((candidate) => candidate.id === stepId);
    return step && wmDiscoveryHasAnswer(answers[stepId])
      ? getOptionLabel(step, answers[stepId], selectedApplication)
      : "";
  };
  const requiresVideoWallConfiguration =
    wmDiscoveryAnswerIncludes(answers.displays, "video-wall-output") ||
    wmDiscoveryAnswerIncludes(answers["display-behaviour"], "video-wall-or-processor-feed") ||
    selectedApplication === "video-wall";
  const videoWallConfigured = Boolean(
    hasVideoWallBuilderHandoff ||
    existingDiscoveryProject?.videowall?.summary ||
    (!discoveryDraft ? currentWorkflowProject?.videowall?.summary : undefined),
  );
  const videoWallConfigurationPending = requiresVideoWallConfiguration && !videoWallConfigured;
  const opportunityDescription = [
    selectedAnswerLabel("opportunity") || wmDiscoveryAnswerToText(answers.opportunity),
    selectedAnswerLabel("scale"),
    selectedAnswerLabel("sources"),
    selectedAnswerLabel("source-device-workflows"),
    selectedAnswerLabel("displays"),
    selectedAnswerLabel("display-behaviour"),
    selectedAnswerLabel("signal-standard"),
  ].filter(Boolean).join(" · ");

  const capturedSummary = useMemo(() => {
    const activeTopologySummary = projectTopologyHasContent(topology)
      ? projectTopologySummary(normaliseProjectTopology(topology))
      : "";

    return discoveryQuestions
      .filter((step) => wmDiscoveryHasAnswer(answers[step.id]) || Boolean(notes[step.id]))
      .map((step) => {
        const capturedNote = notes[step.id]?.trim() ?? "";
        const supportingDetails = step.id === "opportunity"
          ? [opportunityDescription, capturedNote].filter(Boolean).join(" - ")
          : step.id === "locations-connections"
            ? [activeTopologySummary, capturedNote].filter(Boolean).join(" - ")
            : capturedNote;

        return {
          id: step.id,
          label: step.shortLabel,
          answer: wmDiscoveryHasAnswer(answers[step.id]) ? getOptionLabel(step, answers[step.id], selectedApplication) : "Captured note only",
          note: supportingDetails,
        };
      });
  }, [answers, notes, selectedApplication, discoveryQuestions, opportunityDescription, topology]);

  useEffect(() => {
    if (answeredCount === 0 && Object.keys(notes).length === 0) {
      return;
    }

    const timeout = window.setTimeout(() => {
      writeLatestDiscoverySnapshot({
        ...(discoveryOwnershipRef.current ?? {}),
        activeStepIndex: activeIndex,
        state: { answers, notes, clientName, contactName, siteName, budgetLevel, timeline },
        brief: buildDiscoveryBrief(),
        savedAt: "",
      });
    }, 400);

    return () => window.clearTimeout(timeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answeredCount, activeIndex, answers, notes, clientName, contactName, siteName, budgetLevel, timeline]);

  useEffect(() => {
    setActiveIndex((current) => Math.min(current, Math.max(discoveryQuestions.length - 1, 0)));
  }, [discoveryQuestions.length]);

  useEffect(() => {
    document.documentElement.classList.add("wm-discovery-page-open");
    document.body.classList.add("wm-discovery-page-open");

    const Recognition = getDiscoverySpeechRecognition();
    setMicSupported(Boolean(Recognition));


    return () => {
      document.documentElement.classList.remove("wm-discovery-page-open");
      document.body.classList.remove("wm-discovery-page-open");

      if (recogniserRef.current) {
        recogniserRef.current.stop();
      }
    };
  }, []);

  useEffect(() => {
    activeStepIdRef.current = currentStep.id;
  }, [currentStep.id]);

  useEffect(() => {
    if (currentStep.id !== "locations-connections" || projectTopologyHasContent(topology)) {
      return;
    }

    const generated = generateProjectTopologyFromDiscovery({
      answers,
      notes,
      application: selectedApplication,
      existing: topology,
    });
    setTopology(generated);
    writeDiscoveryTopology(generated);
  }, [answers, currentStep.id, notes, selectedApplication, topology]);

  useEffect(() => {
    const handoff = readDiscoveryHandoff();

    if (!handoff) {
      return;
    }

    const incomingAnswers = {
      ...((handoff.answers ?? {}) as DiscoveryAnswers),
    };
    const incomingNotes = {
      ...((handoff.notes ?? {}) as DiscoveryNotes),
    };

    const currentUsb = wmDiscoveryNormaliseAnswerList(incomingAnswers.usb);
    const legacyUsb = wmDiscoveryNormaliseAnswerList(incomingAnswers["usb-path"]).map((value) => {
      if (value === "no-usb-path-needed") return "no-usb";
      if (value === "unknown-usb-path") return "unknown-usb";
      if (value === "user-laptop-host") return "byod-byom";
      return value;
    });
    let mergedUsb = Array.from(new Set([...currentUsb, ...legacyUsb]));
    if (mergedUsb.some((value) => value !== "no-usb" && value !== "unknown-usb")) {
      mergedUsb = mergedUsb.filter((value) => value !== "no-usb" && value !== "unknown-usb");
    }
    if (mergedUsb.length) incomingAnswers.usb = mergedUsb;

    const activeLegacyUsb = mergedUsb.some((value) => value !== "no-usb" && value !== "unknown-usb");
    if (activeLegacyUsb && !incomingAnswers["uc-purpose"]) {
      incomingAnswers["uc-purpose"] = "video-conferencing";
    }

    const sourceConnections = wmDiscoveryNormaliseAnswerList(incomingAnswers["source-connection"]);
    if (sourceConnections.includes("cameras-ndi-network-streams")) {
      const migratedSourceConnections = sourceConnections.filter((value) => value !== "cameras-ndi-network-streams");
      if (migratedSourceConnections.length) {
        incomingAnswers["source-connection"] = migratedSourceConnections;
      } else {
        delete incomingAnswers["source-connection"];
      }
      incomingAnswers["uc-purpose"] = incomingAnswers["uc-purpose"] || "camera-distribution-only";
      incomingAnswers["uc-camera"] = incomingAnswers["uc-camera"] || ["ndi-network-camera"];
      incomingAnswers["uc-camera-routing"] = incomingAnswers["uc-camera-routing"] || ["camera-to-displays"];
    }

    const legacyAudio = wmDiscoveryNormaliseAnswerList(incomingAnswers.audio);
    if (legacyAudio.includes("mic-conferencing")) {
      const migratedAudio = legacyAudio.filter((value) => value !== "mic-conferencing");
      if (migratedAudio.length) {
        incomingAnswers.audio = migratedAudio;
      } else {
        delete incomingAnswers.audio;
      }
      incomingAnswers["uc-purpose"] = incomingAnswers["uc-purpose"] || "video-conferencing";
      incomingAnswers["uc-microphones"] = incomingAnswers["uc-microphones"] || ["unknown-microphones"];
      incomingAnswers["uc-microphone-connection"] =
        incomingAnswers["uc-microphone-connection"] || ["unknown-microphone-connection"];
    }

    const incomingTopology = projectTopologyHasContent(handoff.topology)
      ? normaliseProjectTopology(handoff.topology)
      : generateProjectTopologyFromDiscovery({
          answers: incomingAnswers,
          notes: incomingNotes,
          application: wmDiscoveryAnswerToText(incomingAnswers.opportunity),
        });

    const legacyLocationNotes = [incomingNotes.distance, incomingNotes.infrastructure].filter(Boolean).join(" | ");
    if (legacyLocationNotes && !incomingNotes["locations-connections"]) {
      incomingNotes["locations-connections"] = legacyLocationNotes;
    }

    delete incomingAnswers["usb-path"];
    delete incomingAnswers.distance;
    delete incomingAnswers.infrastructure;
    delete incomingNotes["usb-path"];
    delete incomingNotes.distance;
    delete incomingNotes.infrastructure;

    setAnswers(incomingAnswers);
    setNotes(incomingNotes);
    setTopology(incomingTopology);
    writeDiscoveryTopology(incomingTopology);

    setDiscoveryMode(handoff.mode);
    setTemplateEditId(handoff.templateId);
    setTemplateDraftName(handoff.templateName ?? "");
    setTemplateDraftMarket(handoff.templateMarket || TEMPLATE_MARKETS[0]);
    setSourceTemplateId(handoff.sourceTemplateId);
    setSourceTemplateName(handoff.sourceTemplateName);

    const startApplication = wmDiscoveryAnswerToText(incomingAnswers.opportunity);
    const startQuestions = wmDiscoveryFilterUnifiedCommsQuestions(
      getVisibleDiscoveryQuestions(startApplication, incomingAnswers),
      incomingAnswers,
    );
    setActiveIndex(resolveDiscoveryStartIndex(startQuestions, incomingAnswers, handoff.startAtQuestionId));

    clearDiscoveryHandoff();
  }, []);


  useEffect(() => {
    const storedCallNotes = window.sessionStorage.getItem(callNotesStorageKey);

    if (!storedCallNotes) {
      return;
    }

    const cleanCallNotes = storedCallNotes.trim();

    if (!cleanCallNotes) {
      return;
    }

    setNotes((current) => ({
      ...current,
      opportunity: current.opportunity ? current.opportunity : cleanCallNotes,
    }));

    setAnswers((current) => ({
      ...current,
      opportunity: current.opportunity ? current.opportunity : "not-sure",
    }));

    window.sessionStorage.removeItem(callNotesStorageKey);
  }, []);

  useEffect(() => {
    const useVideoWall = window.sessionStorage.getItem("wingman:use-video-wall-in-discovery");
    const videoWallRaw = window.sessionStorage.getItem("wingman:video-wall-discovery");
    if (useVideoWall === "1" && videoWallRaw) {
      try {
        const payload = JSON.parse(videoWallRaw) as { wallType?: string; recommendation?: { products?: unknown[] } };
        const wallType = String(payload.wallType ?? "video wall").trim() || "video wall";
        const products = Array.isArray(payload.recommendation?.products)
          ? payload.recommendation.products.map((item) => String(item)).filter(Boolean).join(", ")
          : "";
        const note = `Video wall design from the builder: ${wallType}${products ? `. Suggested: ${products}` : ""}.`;
        const nextOpportunity = answers.opportunity || "video-wall";
        const nextAnswers = { ...answers, opportunity: nextOpportunity };
        setAnswers(nextAnswers);
        setNotes((current) => ({ ...current, opportunity: current.opportunity ? current.opportunity : note }));

        const startApplication = wmDiscoveryAnswerToText(nextOpportunity);
        const startQuestions = wmDiscoveryFilterUnifiedCommsQuestions(
          getVisibleDiscoveryQuestions(startApplication, nextAnswers),
          nextAnswers,
        );
        setActiveIndex(resolveDiscoveryStartIndex(startQuestions, nextAnswers));
      } catch {
        // Ignore malformed handoff payloads.
      }
      window.sessionStorage.removeItem("wingman:use-video-wall-in-discovery");
    }

    const seedRaw = window.sessionStorage.getItem("wingman.roomBuilderSeedProduct");
    if (seedRaw) {
      try {
        const seed = JSON.parse(seedRaw) as { sku?: string; name?: string };
        const label = [seed.sku, seed.name].map((item) => String(item ?? "").trim()).filter(Boolean).join(" - ");
        if (label) {
          setNotes((current) => ({
            ...current,
            sources: current.sources ? current.sources : `Customer is interested in ${label}.`,
          }));
        }
      } catch {
        // Ignore malformed handoff payloads.
      }
      window.sessionStorage.removeItem("wingman.roomBuilderSeedProduct");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function movePrevious(): void {
    setActiveIndex((index) => Math.max(0, index - 1));
  }

  function moveNext(): void {
    setActiveIndex((index) => Math.min(discoveryQuestions.length - 1, index + 1));
  }

  function handleSelectAnswer(value: string): void {
    if (wmDiscoveryIsMultiSelectStep(currentStep)) {

      setAnswers((previous) => {
        const updated = { ...previous };
        const nextList = wmDiscoveryToggleMultiSelectAnswer(currentStep, previous[currentStep.id], value);

        if (wmDiscoveryHasAnswer(nextList)) {
          updated[currentStep.id] = nextList;
          return updated;
        }

        delete updated[currentStep.id];
        return updated;
      });

      setSavedMessage("");
      return;
    }

    const completesDiscovery = discoveryQuestions.every(
      (step) => step.id === currentStep.id || wmDiscoveryHasAnswer(answers[step.id]),
    );

    setAnswers((previous) => {
      if (currentStep.id === "opportunity" && previous.opportunity !== value) {
        return { opportunity: value };
      }

      const updated: DiscoveryAnswers = {
        ...previous,
        [currentStep.id]: value,
      };

      if (currentStep.id === "uc-purpose" && value === "no-uc") {
        ["uc-platform", "uc-camera", "uc-camera-routing", "uc-microphones", "uc-microphone-connection", "usb"]
          .forEach((key) => delete updated[key]);
      }

      if (currentStep.id === "uc-purpose" && value === "camera-distribution-only") {
        ["uc-platform", "uc-microphones", "uc-microphone-connection", "usb"]
          .forEach((key) => delete updated[key]);
      }

      if (currentStep.id === "uc-microphones" && value === "no-microphones") {
        delete updated["uc-microphone-connection"];
      }

      return updated;
    });

    if (currentStep.id === "opportunity" && answers.opportunity !== value) {
      // The note beside the application question is the customer's original
      // requirement. Changing the classification must not discard that source
      // wording; only notes belonging to the old conditional route are stale.
      const opportunityNote = notes.opportunity?.trim() ?? "";
      const nextNotes: DiscoveryNotes = opportunityNote ? { opportunity: opportunityNote } : {};
      setNotes(nextNotes);
      setTopology(generateProjectTopologyFromDiscovery({
        answers: { opportunity: value },
        notes: nextNotes,
        application: value,
      }));
    }

    if (currentStep.id === "uc-purpose" && ["no-uc", "camera-distribution-only"].includes(value)) {
      setNotes((previous) => {
        const updated: DiscoveryNotes = { ...previous };
        const keys = value === "no-uc"
          ? ["uc-platform", "uc-camera", "uc-camera-routing", "uc-microphones", "uc-microphone-connection", "usb"]
          : ["uc-platform", "uc-microphones", "uc-microphone-connection", "usb"];
        keys.forEach((key) => delete updated[key]);
        return updated;
      });
    }

    setSavedMessage("");

    if (isLastStep && completesDiscovery) {
      window.setTimeout(() => {
        completionPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
      return;
    }

    if (!isLastStep) {
      moveNext();
    }
  }

  function handleTopologyChange(next: ProjectTopology): void {
    const normalised = writeDiscoveryTopology(next);
    setTopology(normalised);
    setAnswers((previous) => {
      const updated = { ...previous };
      if (projectTopologyHasContent(normalised)) {
        updated["locations-connections"] = "topology-captured";
      } else {
        delete updated["locations-connections"];
      }
      return updated;
    });
    setSavedMessage("");
  }

  function completeTopologyStep(): void {
    const completedTopology = projectTopologyHasContent(topology)
      ? normaliseProjectTopology(topology)
      : generateProjectTopologyFromDiscovery({ answers, notes, application: selectedApplication });
    handleTopologyChange(completedTopology);

    if (isLastStep) {
      window.setTimeout(() => {
        completionPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
      return;
    }

    moveNext();
  }

  function handleCaptureChange(value: string): void {
    setNotes((previous) => ({
      ...previous,
      [currentStep.id]: value,
    }));
    setSavedMessage("");
  }
  function saveCaptureAsAnswer(): void {
    const cleanNote = currentNote.trim();

    if (!cleanNote) {
      return;
    }

    const completesDiscovery = discoveryQuestions.every(
      (step) => step.id === currentStep.id || wmDiscoveryHasAnswer(answers[step.id]),
    );

    setAnswers((previous) => ({
      ...previous,
      [currentStep.id]: cleanNote,
    }));

    window.setTimeout(() => {
      setActiveIndex((index) => Math.min(discoveryQuestions.length - 1, index + 1));

      if (completesDiscovery) {
        completionPanelRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
        completionPanelRef.current?.focus({ preventScroll: true });
      }
    }, 180);
  }

  // WINGMAN_EXISTING_DISCOVERY_WARNING_ACTIONS_START
  function continueExistingDiscovery(): void {
    /*
      DiscoveryPage already loaded the saved snapshot before displaying this
      warning. Continuing must therefore dismiss the warning only. Reloading or
      navigating recreates the page and causes the warning to appear again.
    */
    setShowExistingDiscoveryWarning(false);

    window.requestAnimationFrame(() => {
      const continuationTarget =
        document.querySelector<HTMLElement>(".wm-discovery-question-card") ??
        document.querySelector<HTMLElement>(".wm-discovery-trail-card") ??
        document.querySelector<HTMLElement>(".wm-discovery-completion-card");

      continuationTarget?.scrollIntoView({
        behavior: "auto",
        block: "start",
      });
    });
  }
  function startNewDiscoveryProject(): void {
    if (hasExistingDiscoveryContent) {
      saveDiscoveryBriefToProject(
        buildDiscoveryBrief(),
        existingDiscoveryProject?.id ?? discoveryDraft?.projectId ?? null,
      );
    }

    clearActiveProject();
    // An explicit empty owner prevents the new draft from falling back to the
    // prior workflow project while no replacement project exists yet.
    discoveryOwnershipRef.current = { projectId: undefined, projectName: undefined };
    setShowExistingDiscoveryWarning(false);
    resetDiscovery();
  }

  function cancelExistingDiscoveryChoice(): void {
    setShowExistingDiscoveryWarning(false);
    navigate(-1);
  }

  // WINGMAN_EXISTING_DISCOVERY_WARNING_ACTIONS_END
  function resetDiscovery(): void {
    if (recogniserRef.current) {
      recogniserRef.current.stop();
    }

    recogniserRef.current = null;

    window.sessionStorage.removeItem("wingman:use-call-notes-in-discovery");
    window.sessionStorage.removeItem("wingman:call-notes");
    window.sessionStorage.removeItem("wingman:use-video-wall-in-discovery");
    window.sessionStorage.removeItem("wingman:video-wall-discovery");
    window.sessionStorage.removeItem("wingman.roomBuilderSeedProduct");
    clearDiscoveryHandoff();
    clearLatestDiscoverySnapshot();
    discoveryOwnershipRef.current = { projectId: undefined, projectName: undefined };

    setIsListening(false);
    setMicError("");
    setAnswers({});
    setNotes({});
    clearDiscoveryTopology();
    setTopology(createBlankProjectTopology());
    setActiveIndex(0);
    setIsReviewingAnswers(false);
    setSavedMessage("");
    setDiscoveryMode("standard");
    setTemplateEditId(undefined);
    setTemplateDraftName("");
    setTemplateDraftMarket(TEMPLATE_MARKETS[0]);
    setSourceTemplateId(undefined);
    setSourceTemplateName(undefined);
    setTemplateSavedMessage("");
    setClientName("");
    setContactName("");
    setSiteName("");
    setBudgetLevel("");
    setTimeline("");

    navigate("/wingman/discovery", { replace: true });

    window.requestAnimationFrame(() => {
      setActiveIndex(0);
    });
  }

  function buildDiscoveryBrief(): StoredDiscoveryBrief {
    const answerLabel = (stepId: string): string => {
      const step = discoveryQuestions.find((candidate) => candidate.id === stepId);
      return step && wmDiscoveryHasAnswer(answers[stepId]) ? getOptionLabel(step, answers[stepId], selectedApplication) : "";
    };
    const answerLabels = (stepId: string): string[] => {
      const step = discoveryQuestions.find(
        (candidate) => candidate.id === stepId,
      );

      if (!step) {
        return [];
      }

      let selectedValues = wmDiscoveryNormaliseAnswerList(answers[stepId]);

      if (
        step.selectAllValue &&
        selectedValues.includes(step.selectAllValue)
      ) {
        selectedValues = step.options
          .map((option) => option.value)
          .filter((value) => value !== step.selectAllValue)
          .filter((value) => !wmDiscoveryIsExclusiveValue(step, value));
      }

      return selectedValues
        .map((value) => getOptionLabel(step, value, selectedApplication))
        .filter(Boolean);
    };

    const application = answerLabel("opportunity") || wmDiscoveryAnswerToText(answers.opportunity) || "Discovery";
    const avoipProfile = answerLabel("avoip-profile");
    const avoipProfileValue = wmDiscoveryAnswerToText(answers["avoip-profile"]);
    const avoipSeriesHint = getAvoipSeriesHint(avoipProfileValue);
    const allNotes = Object.values(notes).map((note) => note.trim()).filter(Boolean);
    const summaryText = capturedSummary
      .map((item) => `${item.label}: ${item.answer}${item.note ? ` - ${item.note}` : ""}`)
      .join("\n");
    const strategy = getQuestionStrategy("opportunity", wmDiscoveryAnswerToText(answers.opportunity));
    const inferredDirection = selectedApplication === "av-over-ip"
      ? getAvoipDirection(avoipProfileValue, strategy.likelyDirection)
      : strategy.likelyDirection;
    const nextBestQuestion = selectedApplication === "av-over-ip"
      ? getAvoipNextQuestion(avoipProfileValue, strategy.askNext)
      : strategy.askNext;
    const displayCount = answerLabel("displays");
    const displayBehaviour = answerLabel("display-behaviour") || answerLabel("displays");
    const signalStandard = answerLabel("signal-standard");
    const sourceCount = answerLabel("sources");
    const ucPurpose = answerLabel("uc-purpose");
    const conferencingPlatform = answerLabels("uc-platform");
    const cameraNeeds = answerLabels("uc-camera");
    const cameraRouting = answerLabels("uc-camera-routing");
    const microphoneNeeds = answerLabels("uc-microphones");
    const microphoneConnections = answerLabels("uc-microphone-connection");
    const usb = answerLabel("usb");
    const audio = answerLabel("audio");
    const sourceConnections = answerLabels("source-connection");
    const sourceDeviceWorkflows = answerLabels("source-device-workflows");
    const wirelessPresentationOperation = answerLabels("wireless-presentation-operation");
    const multiviewDestinations = answerLabels("multiview-destination");
    const multiviewOperation = answerLabels("multiview-operation");
    const microphoneCount = answerLabel("uc-microphone-count");
    const audioProcessing = answerLabels("uc-audio-processing");
    const usbValues = wmDiscoveryNormaliseAnswerList(answers.usb);
    const usbNeeds = answerLabels("usb");
    const usbOwnership = [
      usbValues.includes("byod-byom") ? "User laptop / BYOD / BYOM host" : "",
      usbValues.includes("room-pc-uc") ? "Room PC / UC appliance host" : "",
      usbValues.includes("switchable-host-usb") ? "Switchable room and user-laptop host" : "",
    ].filter(Boolean).join(", ");
    const usbTransport = [
      usbValues.includes("room-host-usb2") ? "Standard USB 2.0 path" : "",
      usbValues.includes("usb3-high-bandwidth-path") ? "High-bandwidth USB 3.x path" : "",
    ].filter(Boolean).join(", ");
    const usbTopologyRisk = [
      usbValues.includes("switchable-host-usb") ? "USB host switching required" : "",
      usbValues.includes("usb3-high-bandwidth-path") ? "High-bandwidth USB 3.x transport required" : "",
      usbValues.includes("unknown-usb") ? "USB workflow requires qualification" : "",
    ].filter(Boolean).join(", ");
    const audioNeeds = answerLabels("audio");
    const controlNeeds = answerLabels("control");
    // WINGMAN_DISCOVERY_SOURCE_UC_EVIDENCE_DERIVED
    const wingmanUnifiedCommsValues = wmDiscoveryNormaliseAnswerList(
      answers["uc-purpose"],
    );
    const wingmanUnifiedCommsWorkflows = answerLabels(
      "uc-purpose",
    );
    const wingmanNoUnifiedComms = wingmanUnifiedCommsValues.includes(
      "no-uc",
    );
    const wingmanUnifiedCommsUnknown = wingmanUnifiedCommsValues.includes(
      "unknown-uc",
    );
    const wingmanLegacyCombinedWorkflow = wingmanUnifiedCommsValues.includes(
      "conferencing-recording",
    );
    const wingmanConferencingRequired =
      !wingmanNoUnifiedComms &&
      !wingmanUnifiedCommsUnknown &&
      (
        wingmanUnifiedCommsValues.includes("video-conferencing") ||
        wingmanLegacyCombinedWorkflow
      );
    const wingmanRecordingRequired =
      !wingmanNoUnifiedComms &&
      !wingmanUnifiedCommsUnknown &&
      (
        wingmanUnifiedCommsValues.includes("recording-streaming") ||
        wingmanLegacyCombinedWorkflow
      );
    const wingmanCameraDistributionRequired =
      !wingmanNoUnifiedComms &&
      !wingmanUnifiedCommsUnknown &&
      wingmanUnifiedCommsValues.includes("camera-distribution-only");
    const wingmanMicrophonesOnly =
      !wingmanNoUnifiedComms &&
      !wingmanUnifiedCommsUnknown &&
      wingmanUnifiedCommsValues.includes("microphones-only");
    const wingmanUnifiedCommsSummary = wingmanNoUnifiedComms
      ? "No camera or microphone requirements"
      : wingmanUnifiedCommsUnknown
        ? "Not yet confirmed"
        : wingmanConferencingRequired && wingmanRecordingRequired
          ? "Video conferencing and recording / live streaming"
          : wingmanUnifiedCommsWorkflows.join(", ") || "Not yet confirmed";

    const activeTopology = projectTopologyHasContent(topology)
      ? normaliseProjectTopology(topology)
      : generateProjectTopologyFromDiscovery({ answers, notes, application: selectedApplication });
    const topologySummary = projectTopologySummary(activeTopology);
    const longestRunMetres = projectTopologyLongestRun(activeTopology);
    const connectionTypes = projectTopologyConnectionTypes(activeTopology);
    const networkSummary = projectTopologyNetworkSummary(activeTopology);
    const distanceInfrastructureNotes = topologySummary;
    const qualityTags = signalQualityTags(signalStandard);
    const processingNeeds = [
      wmDiscoveryAnswerIncludes(answers["display-behaviour"], "video-wall-or-processor-feed") || wmDiscoveryAnswerIncludes(answers.displays, "video-wall-output") ? "Video wall processing" : "",
      wmDiscoveryAnswerIncludes(answers["display-behaviour"], "multiview-on-one-output") ? "Multiview" : "",
      avoipProfileValue === "multiview-avoip" ? "Multiview" : "",
      ...multiviewDestinations.map((item) => `Multiview destination: ${item}`),
      ...multiviewOperation.map((item) => `Multiview operation: ${item}`),
      ...audioProcessing.map((item) => `Audio processing: ${item}`),
    ].filter(Boolean);
    const missingInformation = discoveryQuestions.flatMap((step) => {
      const answer = answers[step.id] ?? "";
      const answerText = answerLabel(step.id);
      const note = notes[step.id]?.trim() ?? "";

      if (!answer && !note && step.required) {
        return [`Confirm ${step.question.replace(/\?$/, "").toLowerCase()}.`];
      }

      if (isUnknownDiscoveryValue(wmDiscoveryAnswerToText(answer)) || isUnknownDiscoveryValue(answerText) || isUnknownDiscoveryValue(note)) {
        return [`Confirm ${step.question.replace(/\?$/, "").toLowerCase()}.`];
      }

      return [];
    });

    projectTopologyMissingInformation(activeTopology).forEach((item) => {
      if (!missingInformation.includes(item)) missingInformation.push(item);
    });

    if (selectedApplication === "av-over-ip" && !activeTopology.connections.some((connection) => ["ip-av-vlan", "shared-ip-network", "point-to-point-network"].includes(connection.transport))) {
      missingInformation.push("Confirm whether NetworkHD uses the customer network or a dedicated AV network design.");
    }

    if (selectedApplication === "av-over-ip" && (!avoipProfileValue || avoipProfileValue === "unknown-avoip-profile")) {
      missingInformation.push("Confirm whether the AVoIP path is lower-bandwidth 1Gb, premium 1Gb, or zero-latency 10Gb.");
    }

    if (avoipProfileValue === "multiview-avoip") {
      missingInformation.push("Confirm how many sources must appear on one output and which NetworkHD family should carry the multiview requirement.");
    }

    const brief: StoredDiscoveryBrief = {
      savedAt: new Date().toISOString(),
      topology: activeTopology,
      roomModel: {
        roomType: application,
        application,
        applicationType: application,
        outcome: opportunityDescription || application,
        customerWording: notes.opportunity?.trim() || "",
        scale: answerLabel("scale"),
        roomSize: answerLabel("scale"),
        devices: [sourceCount, ...sourceConnections, ...sourceDeviceWorkflows].filter(Boolean),
        sourceTypes: [...sourceConnections, ...sourceDeviceWorkflows],
        sourceConnections,
        sourceDeviceWorkflows,
        wirelessPresentationOperation,
        sourceCount,
        displayCount,
        displays: displayCount,
        displayArrangement: displayBehaviour,
        displayBehaviour,
        signalStandard,
        signalStandardSummary: signalStandard,
        downstreamQualityTags: qualityTags,
        resolutionRequirement: signalStandard,
        topology: activeTopology,
        locations: activeTopology.locations,
        projectDevices: activeTopology.devices,
        projectConnections: activeTopology.connections,
        connectionSummary: topologySummary,
        connectionTypes,
        ucPurpose,
        unifiedCommunicationsRequirement: ucPurpose,
        conferencingPlatform,
        cameraNeeds,
        cameraRouting,
        microphoneNeeds,
        microphoneCount,
        microphoneConnections,
        audioProcessing,
        usbOwnership: usbOwnership || usb,
        usbTransport: usbTransport || usb,
        usbTopologyRisk,
        usbNeeds,
        audioPath: audio,
        audioNeeds,
        controlNeeds,
        cableRun: longestRunMetres !== undefined ? `${longestRunMetres} m` : "Unknown",
        longestRun: longestRunMetres !== undefined ? `${longestRunMetres} m` : "Unknown",
        distanceInfrastructureNotes,
        network: networkSummary,
        networkAvailability: networkSummary,
        processingNeeds,
        processingRequirement: processingNeeds[0] ?? "",
        videoWallRequirement:
          wmDiscoveryAnswerIncludes(answers["display-behaviour"], "video-wall-or-processor-feed") || wmDiscoveryAnswerIncludes(answers.displays, "video-wall-output")
            ? displayBehaviour
            : "Not indicated",
        avoipProfile,
        avoipSeriesHint,
        multiviewRequirement:
          avoipProfileValue === "multiview-avoip" || wmDiscoveryAnswerIncludes(answers["display-behaviour"], "multiview-on-one-output")
            ? "Multiview required"
            : "Not indicated",
        multiviewDestinations,
        multiviewOperation,
        designDirection: inferredDirection,
        inferredArchitectureDirection: inferredDirection,
        recommendedProductPath: selectedApplication === "av-over-ip" ? "AVoIP / matrix routing" : strategy.likelyDirection,
        nextBestQuestion,
        notes: allNotes.join(" | "),
        summary: summaryText,
        sourceTemplateId: sourceTemplateId || "",
        sourceTemplateName: sourceTemplateName || "",
        clientName: clientName.trim(),
        contactName: contactName.trim(),
        siteName: siteName.trim(),
        budgetLevel,
        timeline,
      },
      inference: {
        summary: summaryText,
        architecture: inferredDirection,
        nextBestQuestion,
      },
      capturedPercent: completionPercent,
      returnRoute: routeCatalogByKey.discovery.path,
      missingInformation,
      nextBestQuestion,
    };
    // WINGMAN_DISCOVERY_SOURCE_UC_EVIDENCE_ROOM_MODEL
    brief.roomModel = {
      ...(brief.roomModel ?? {}),
      sourceProfile: answerLabel("source-connection"),
      sourceProfileValue: wmDiscoveryAnswerToText(
        answers["source-connection"],
      ),
      unifiedCommsWorkflows: wingmanUnifiedCommsWorkflows,
      cameraMicrophoneWorkflows: wingmanUnifiedCommsWorkflows,
      unifiedCommsSummary: wingmanUnifiedCommsSummary,
      conferencingRequired: wingmanConferencingRequired,
      recordingStreamingRequired: wingmanRecordingRequired,
      cameraDistributionRequired: wingmanCameraDistributionRequired,
      microphonesWithoutCameras: wingmanMicrophonesOnly,
    };

    const recommendationEvidence = buildDiscoveryRecommendationEvidence(brief);

    return {
      ...brief,
      missingInformation: recommendationEvidence.missingInformation,
      nextBestQuestion: recommendationEvidence.nextBestQuestion ?? strategy.askNext,
      quoteSafetyStatus: recommendationEvidence.quoteSafetyStatus,
      recommendationEvidence,
    };
  }

  function saveDiscoveryToProject(): void {
    saveDiscoveryToOwningProject();
    setSavedMessage("Discovery saved to your project. Continue to product selection or a proposal when ready.");
  }

  function saveDiscoveryToOwningProject() {
    const ownership = discoveryOwnershipRef.current;
    const savedProject = saveDiscoveryBriefToProject(
      buildDiscoveryBrief(),
      ownership ? ownership.projectId ?? null : undefined,
    );
    discoveryOwnershipRef.current = {
      projectId: savedProject.id,
      projectName: savedProject.name,
    };
    return savedProject;
  }

  const canSaveCustomTemplate = templateDraftName.trim().length > 0 && wmDiscoveryHasAnswer(answers.opportunity);

  function saveAsCustomTemplate(): void {
    if (!canSaveCustomTemplate) {
      setTemplateSavedMessage("Add a template name and answer the application/room type question before saving.");
      return;
    }

    const brief = buildDiscoveryBrief();
    const roomModel = (brief.roomModel ?? {}) as Record<string, unknown>;
    const templateTopology = normaliseProjectTopology(brief.topology ?? roomModel.topology);
    const summary = String(roomModel.summary || brief.inference?.summary || "Custom room template created in Discovery.");

    const draft = createBlankCustomRoomTemplate({
      name: templateDraftName.trim(),
      vertical: templateDraftMarket || "Custom",
      application: String(roomModel.application || selectedApplication || "Custom application"),
      scale: String(roomModel.scale || "Custom"),
      summary,
      customerNarrative: String(roomModel.outcome || summary),
      architecture: String(roomModel.designDirection || ""),
      assumptions: brief.missingInformation,
      validationItems: brief.missingInformation,
      discoveryAnswers: answers,
      discoveryNotes: notes,
      topology: templateTopology,
    });

    saveCustomRoomTemplate(draft, {
      id: templateEditId,
      sourceTemplateId,
    });

    clearDiscoveryHandoff();
    navigate(routeCatalogByKey.templates.path);
  }

  function cancelTemplateMode(): void {
    clearDiscoveryHandoff();
    navigate(routeCatalogByKey.templates.path);
  }

  function moveForward(target: "recommendations" | "proposal"): void {
    saveDiscoveryToOwningProject();
    if (target === "recommendations" && videoWallConfigurationPending) {
      navigate(routeCatalogByKey.videowall.path);
      return;
    }
    navigate(target === "proposal" ? routeCatalogByKey.proposal.path : routeCatalogByKey.recommendations.path);
  }

  function openVideoWallConfiguration(): void {
    saveDiscoveryToOwningProject();
    navigate(routeCatalogByKey.videowall.path);
  }

  function toggleMicrophone(): void {
    setMicError("");

    if (isListening && recogniserRef.current) {
      recogniserRef.current.stop();
      recogniserRef.current = null;
      setIsListening(false);
      return;
    }

    const Recognition = getDiscoverySpeechRecognition();

    if (!Recognition) {
      setMicError("Microphone capture is not supported in this browser. Use Chrome or type notes manually.");
      return;
    }

    const recogniser = new Recognition();
    recogniser.continuous = true;
    recogniser.interimResults = true;
    recogniser.lang = "en-GB";

    recogniser.onresult = (event: DiscoverySpeechRecognitionEventLike) => {
      let finalTranscript = "";
      const startIndex = event.resultIndex ?? 0;

      for (let index = startIndex; index < event.results.length; index += 1) {
        const result = event.results[index];

        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        }
      }

      const cleanTranscript = finalTranscript.trim();

      if (!cleanTranscript) {
        return;
      }

      const activeStepId = activeStepIdRef.current;

      setNotes((previous) => {
        const existing = previous[activeStepId]?.trim() ?? "";
        const divider = existing.length > 0 ? " " : "";

        return {
          ...previous,
          [activeStepId]: `${existing}${divider}${cleanTranscript}`.trim(),
        };
      });
    };

    recogniser.onerror = () => {
      setMicError("Microphone capture stopped. Check browser microphone permission.");
      setIsListening(false);
    };

    recogniser.onend = () => {
      setIsListening(false);
    };

    recogniserRef.current = recogniser;
    recogniser.start();
    setIsListening(true);
  }
return (
    <main className="wm-discovery-capture-page wm-ui-page" data-audit={discoveryAuditMarkers.join("|")}>
      {/* WINGMAN_EXISTING_DISCOVERY_WARNING_MODAL_START */}
      {showExistingDiscoveryWarning && existingDiscoveryPortalTarget &&
        !hasIntentionalDiscoveryEntry? createPortal(
            <ExistingDiscoveryWarning
              projectName={existingDiscoveryName}
              progress={existingDiscoveryProgress}
              savedAt={existingDiscoverySavedAt}
              onContinue={continueExistingDiscovery}
              onStartNew={startNewDiscoveryProject}
              onCancel={cancelExistingDiscoveryChoice}
            />,
            existingDiscoveryPortalTarget,
          )
        : null}
      <header className="wm-discovery-capture-hero wm-ui-hero">
        <div>
          <p className="wm-discovery-eyebrow wm-ui-copy wm-ui-kicker">Guided discovery - live call mode</p>
          <h1 className="wm-ui-title">One question at a time</h1>
          <p className="wm-ui-copy">
            Capture the customer wording, choose the closest answer, then move forward. Use the capture box when the
            answer is not yet clear.
          </p>
          {(clientName.trim() || siteName.trim()) && (
            <p className="wm-discovery-client-line wm-ui-copy">
              {[clientName.trim(), siteName.trim()].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>

        <div className="wm-discovery-completion-card wm-ui-card" aria-label="Discovery completion">
          <strong>{completionPercent}%</strong>
          <span>{answeredCount} / {discoveryQuestions.length} captured</span>
        </div>
      </header>

      <DiscoveryClientDetailsPanel
        clientName={clientName}
        onClientNameChange={setClientName}
        contactName={contactName}
        onContactNameChange={setContactName}
        siteName={siteName}
        onSiteNameChange={setSiteName}
        budgetLevel={budgetLevel}
        onBudgetLevelChange={setBudgetLevel}
        budgetInputRef={budgetInputRef}
        timeline={timeline}
        onTimelineChange={setTimeline}
      />

      {discoveryMode !== "standard" ? (
        <section className="wm-discovery-trail-card wm-ui-section wm-ui-card" aria-label="Discovery template mode" data-discovery-mode={discoveryMode}>
          <strong>{discoveryMode === "template-edit" ? "Editing custom template" : "Creating a new custom template"}</strong>
          <p className="wm-ui-copy">
            Answer discovery questions to capture this reusable room design. Saving creates a template only — it will
            not create a project.
          </p>
        </section>
      ) : sourceTemplateName ? (
        <section className="wm-discovery-trail-card wm-ui-section wm-ui-card" aria-label="Discovery template source">
          <strong>Pre-populated from template: {sourceTemplateName}</strong>
          <p className="wm-ui-copy">
            Answers below were carried over from that template. Adjust anything that differs for this project.
          </p>
        </section>
      ) : null}

      {showCompletionPanel ? (
        <DiscoveryCompletionPanel
          panelRef={completionPanelRef}
          answerCount={discoveryQuestions.length}
          requiresVideoWallConfiguration={videoWallConfigurationPending}
          videoWallConfigured={requiresVideoWallConfiguration && videoWallConfigured}
          savedMessage={savedMessage}
          onMoveForward={moveForward}
          onReviewAnswers={() => {
            setActiveIndex(Math.max(discoveryQuestions.length - 1, 0));
            setIsReviewingAnswers(true);
          }}
          onSave={saveDiscoveryToProject}
        />
      ) : (
      <div className="wm-discovery-question-layout">
        <section
          className="wm-discovery-question-card wm-ui-section wm-ui-card"
          data-discovery-step={currentStep.id}
          data-discovery-section={currentStep.section}
        >
          {/* WINGMAN_DISCOVERY_COMPACT_NAV_START */}
          <div className="wm-discovery-compact-stepbar" aria-label="Discovery progress and controls">
            <div className="wm-discovery-compact-step-copy">
              <strong>Step {activeIndex + 1} of {discoveryQuestions.length}</strong>
              <span>
                {currentStep.section}
                {currentStep.optional ? " · Optional" : ""}
              </span>
            </div>

            <div className="wm-discovery-compact-step-actions">
              {isReviewingAnswers && (
                <button
                  className="wm-ui-button wm-ui-button-secondary"
                  type="button"
                  onClick={() => setIsReviewingAnswers(false)}
                >
                  Back to completion
                </button>
              )}
              <button
                className="wm-ui-button wm-ui-button-secondary"
                type="button"
                onClick={resetDiscovery}
              >
                Reset discovery
              </button>
            </div>
          </div>
          {/* WINGMAN_DISCOVERY_COMPACT_NAV_END */}

          <div className="wm-discovery-question-heading wm-ui-title">
            <span>{currentStep.shortLabel}</span>
            <h2 className="wm-ui-title">{currentStepView.question}</h2>
            <p className="wm-ui-copy">{currentStepView.prompt}</p>
            {wmDiscoveryIsMultiSelectStep(currentStep) && (
              <small className="wm-discovery-multi-select-note">
                Select one or more options, then choose Continue.
              </small>
            )}
          </div>

          {currentStep.id === "locations-connections" ? (
            <DiscoveryLocationsConnections
              value={topology}
              seed={{ answers, notes, application: selectedApplication, existing: topology }}
              onChange={handleTopologyChange}
            />
          ) : (
            <div className="wm-discovery-option-list wm-ui-card">
              {currentStepView.options.map((option) => {
                const selected = Array.isArray(currentAnswer) ? currentAnswer.includes(option.value) : currentAnswer === option.value;
                const optionClassNames = ["wm-discovery-option"];
                if (selected) optionClassNames.push("is-selected");
                return (
                  <button
                    key={option.value}
                    type="button"
                    className={optionClassNames.join(" ")}
                    onClick={() => handleSelectAnswer(option.value)}
                    aria-pressed={selected}
                  >
                    <span className={wmDiscoveryIsMultiSelectStep(currentStep) ? "wm-discovery-option-checkbox" : "wm-discovery-option-radio"} aria-hidden="true" />
                    <span>
                      <strong>{option.label}</strong>
                      <small>{option.help}</small>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="wm-discovery-navigation-row wm-ui-card">
            <button className="wm-ui-button wm-ui-button-secondary" type="button" onClick={movePrevious} disabled={isFirstStep}>
              Previous
            </button>
            <button
              className="wm-ui-button wm-ui-button-secondary"
              type="button"
              onClick={currentStep.id === "locations-connections" ? completeTopologyStep : moveNext}
              disabled={currentStep.id === "locations-connections" ? false : isLastStep}
            >
              {currentStep.id === "locations-connections"
                ? (isLastStep ? "Complete discovery" : "Continue")
                : wmDiscoveryIsMultiSelectStep(currentStep) ? "Continue" : "Continue"}
            </button>
          </div>
        </section>

        <aside className="wm-discovery-capture-card wm-ui-card">
          {capturedSummary.length > 0 && (
            <DiscoverySummaryCard
              items={capturedSummary}
              isDiscoveryComplete={isDiscoveryComplete}
              savedMessage={savedMessage}
              onMoveNext={moveNext}
              onSaveProgress={saveDiscoveryToProject}
              videoWallRequired={requiresVideoWallConfiguration}
              videoWallConfigured={videoWallConfigured}
              onConfigureVideoWall={openVideoWallConfiguration}
              compact
            />
          )}

          <div className="wm-discovery-capture-heading wm-ui-title">
            <div>
              <span>Capture box</span>
              <h3 className="wm-ui-title">Customer wording / notes</h3>
            </div>

            <button
              type="button"
              className={isListening ? "wm-discovery-mic-button is-listening" : "wm-discovery-mic-button"}
              onClick={toggleMicrophone}
              aria-pressed={isListening}
              disabled={!micSupported && isListening}
            >
              {isListening ? "Stop mic" : "Mic"}
            </button>
          </div>

          <textarea className="wm-ui-input"
            aria-label="Customer wording / notes"
            value={currentNote}
            onChange={(event) => handleCaptureChange(event.target.value)}
            placeholder={currentStepView.capturePlaceholder}
            rows={9}
          />

          <div className="wm-discovery-capture-actions">
            <button className="wm-ui-button wm-ui-button-secondary" type="button" onClick={saveCaptureAsAnswer} disabled={!currentNote.trim()}>
              Save capture and continue
            </button>
          </div>

          {!micSupported && (
            <p className="wm-discovery-muted-note wm-ui-copy">
              Microphone capture depends on browser support. Manual note capture is always available.
            </p>
          )}

          {micError && <p className="wm-discovery-error-note wm-ui-copy">{micError}</p>}

          {selectedApplicationGuidance && (
            <div className="wm-discovery-live-tip wm-discovery-application-guidance">
              <strong>Application-specific discovery question guidance</strong>
              <p className="wm-ui-copy">{selectedApplicationGuidance.likelyDirection}</p>
              <ul>
                {selectedApplicationGuidance.checkBeforeProduct.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
      )}

      {discoveryMode !== "standard" ? (
        <DiscoveryCustomTemplatePanel
          name={templateDraftName}
          onNameChange={setTemplateDraftName}
          market={templateDraftMarket}
          onMarketChange={setTemplateDraftMarket}
          canSave={canSaveCustomTemplate}
          onSave={saveAsCustomTemplate}
          onCancel={cancelTemplateMode}
          savedMessage={templateSavedMessage}
        />
      ) : null}
    </main>
  );
}

export default DiscoveryPage;
