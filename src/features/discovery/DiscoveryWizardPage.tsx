import * as React from "react";
import { useNavigate } from "react-router-dom";
import SystemArchitecturePreview from "@/features/discovery/SystemArchitecturePreview";
import RecentTextInput from "@/components/RecentTextInput";
import { WM_ROUTES } from "@/core/wingman/routeMap";
import {
  buildRecommendationGovernanceSnapshot,
  getRecommendationGovernanceRulebook,
} from "@/features/governance/recommendationGovernance";
import {
  RECENT_TEXT_HISTORY_KEYS,
  RECENT_TEXT_HISTORY_SCOPES,
  rememberRecentTextEntry,
} from "@/features/inputs/recentTextEntries";
import {
  buildBranchHighlights,
  buildGuidedProjectAdvice,
  buildGuidedProjectLenses,
  buildGuidedProjectNotes,
  createEmptyGuidedProjectRecord,
  getGuidedProjectProgress,
  getNextToolLabel,
  getVisibleQuestionsForStep,
  GUIDED_PROJECT_STEPS,
  hasText,
  parseGuidedProjectSelections,
  toggleGuidedProjectSelection,
  type GuidedProjectQuestionState,
  type GuidedProjectRecord,
  type GuidedProjectStep,
} from "@/features/discovery/guidedProjectEngine";
import {
  getActiveProject,
  subscribeProjects,
  updateProject,
  updateProjectDiscovery,
} from "@/features/projects/projectStore";

const STORAGE_KEY = "wm_discovery_seed";
const SNAPSHOT_POSITION_KEY = "wm_discovery_snapshot_position_v1";
const SNAPSHOT_FLOAT_WIDTH = 300;
const SNAPSHOT_FLOAT_MARGIN = 8;
const SNAPSHOT_FLOAT_TOP_MIN = 66;
const SNAPSHOT_FLOAT_COMPACT_BREAKPOINT = 1100;

type SnapshotFloatPosition = {
  left: number;
  top: number;
};

function clampSnapshotPosition(position: SnapshotFloatPosition): SnapshotFloatPosition {
  if (typeof window === "undefined") return position;
  const maxLeft = Math.max(
    SNAPSHOT_FLOAT_MARGIN,
    window.innerWidth - SNAPSHOT_FLOAT_WIDTH - SNAPSHOT_FLOAT_MARGIN,
  );
  const maxTop = Math.max(SNAPSHOT_FLOAT_TOP_MIN, window.innerHeight - 120);
  return {
    left: Math.min(maxLeft, Math.max(SNAPSHOT_FLOAT_MARGIN, position.left)),
    top: Math.min(maxTop, Math.max(SNAPSHOT_FLOAT_TOP_MIN, position.top)),
  };
}

function defaultSnapshotPosition(): SnapshotFloatPosition {
  if (typeof window === "undefined") {
    return { left: 18, top: 126 };
  }

  return clampSnapshotPosition({
    left: window.innerWidth - SNAPSHOT_FLOAT_WIDTH - 18,
    top: 126,
  });
}

function readSnapshotPosition(): SnapshotFloatPosition {
  try {
    const fallback = defaultSnapshotPosition();
    const raw = localStorage.getItem(SNAPSHOT_POSITION_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<SnapshotFloatPosition>;
    const left = Number(parsed.left);
    const top = Number(parsed.top);
    return clampSnapshotPosition({
      left: Number.isFinite(left) ? left : fallback.left,
      top: Number.isFinite(top) ? top : fallback.top,
    });
  } catch {
    return defaultSnapshotPosition();
  }
}

function writeSnapshotPosition(position: SnapshotFloatPosition) {
  try {
    localStorage.setItem(SNAPSHOT_POSITION_KEY, JSON.stringify(position));
  } catch {}
}

function readRecord(): GuidedProjectRecord {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createEmptyGuidedProjectRecord();
    const parsed = JSON.parse(raw) as Partial<GuidedProjectRecord>;
    return {
      ...createEmptyGuidedProjectRecord(),
      ...parsed,
      projectScope: mergeFirst(parsed.projectScope, "Single device or signal path"),
    };
  } catch {
    return createEmptyGuidedProjectRecord();
  }
}

function writeRecord(record: GuidedProjectRecord) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {}
}

function getNearestVisibleStep(
  record: GuidedProjectRecord,
  start: number,
  direction: 1 | -1,
) {
  let index = start;
  while (index >= 0 && index < GUIDED_PROJECT_STEPS.length) {
    if (getVisibleQuestionsForStep(record, index as GuidedProjectStep).length > 0) {
      return index as GuidedProjectStep;
    }
    index += direction;
  }
  return Math.max(0, Math.min(GUIDED_PROJECT_STEPS.length - 1, start)) as GuidedProjectStep;
}
function mergeFirst(...values: Array<string | undefined>) {
  return values.find((value) => hasText(value)) ?? "";
}

function mergeProject(
  record: GuidedProjectRecord,
  project: ReturnType<typeof getActiveProject>,
): GuidedProjectRecord {
  if (!project) return record;
  const discovery = project.discovery;
  return {
    ...record,
    workflowTrack: mergeFirst(record.workflowTrack, discovery?.workflowTrack),
    projectScope: mergeFirst(record.projectScope, discovery?.projectScope, "Single device or signal path"),
    customerOutcome: mergeFirst(record.customerOutcome, discovery?.customerOutcome),
    featureRequirements: mergeFirst(record.featureRequirements, discovery?.featureRequirements),
    customer: mergeFirst(record.customer, discovery?.customer, project.customer),
    site: mergeFirst(record.site, discovery?.site, project.site),
    roomName: mergeFirst(record.roomName, discovery?.roomName, project.roomName, project.name),
    applicationType: mergeFirst(record.applicationType, discovery?.applicationType),
    roomLengthM: mergeFirst(record.roomLengthM, discovery?.roomLengthM),
    roomWidthM: mergeFirst(record.roomWidthM, discovery?.roomWidthM),
    roomHeightM: mergeFirst(record.roomHeightM, discovery?.roomHeightM),
    installationPath: mergeFirst(record.installationPath, discovery?.installationPath),
    cableDistanceM: mergeFirst(record.cableDistanceM, discovery?.cableDistanceM),
    transportDistanceBand: mergeFirst(record.transportDistanceBand, discovery?.transportDistanceBand),
    displayCount: mergeFirst(record.displayCount, discovery?.displayCount),
    sourceCount: mergeFirst(record.sourceCount, discovery?.sourceCount),
    outputBehaviour: mergeFirst(record.outputBehaviour, discovery?.outputBehaviour),
    sourceTypes: mergeFirst(record.sourceTypes, discovery?.sourceTypes),
    sourcePlacement: mergeFirst(record.sourcePlacement, discovery?.sourcePlacement),
    sourceConnectionPath: mergeFirst(record.sourceConnectionPath, discovery?.sourceConnectionPath),
    sourceConnectionType: mergeFirst(record.sourceConnectionType, discovery?.sourceConnectionType),
    signalFormats: mergeFirst(record.signalFormats, discovery?.signalFormats),
    signalHdr: mergeFirst(record.signalHdr, discovery?.signalHdr),
    sourceCableType: mergeFirst(record.sourceCableType, discovery?.sourceCableType),
    displayConnectionPath: mergeFirst(record.displayConnectionPath, discovery?.displayConnectionPath),
    displayConnectionType: mergeFirst(record.displayConnectionType, discovery?.displayConnectionType),
    displayCableType: mergeFirst(record.displayCableType, discovery?.displayCableType),
    networkEnvironment: mergeFirst(record.networkEnvironment, discovery?.networkEnvironment),
    usbNeeds: mergeFirst(record.usbNeeds, discovery?.usbNeeds),
    usbStandards: mergeFirst(record.usbStandards, discovery?.usbStandards),
    audioNeeds: mergeFirst(record.audioNeeds, discovery?.audioNeeds),
    audioBreakout: mergeFirst(record.audioBreakout, discovery?.audioBreakout),
    controlNeeds: mergeFirst(record.controlNeeds, discovery?.controlNeeds),
    powerPreference: mergeFirst(record.powerPreference, discovery?.powerPreference),
    passthroughNeeds: mergeFirst(record.passthroughNeeds, discovery?.passthroughNeeds),
    budgetBand: mergeFirst(record.budgetBand, discovery?.budgetBand),
    urgency: mergeFirst(record.urgency, discovery?.urgency),
    notes: mergeFirst(record.notes, discovery?.notes),
  };
}

function renderField(
  question: GuidedProjectQuestionState,
  value: string,
  onChange: (value: string) => void,
) {
  if (question.input === "cards") {
    const details =
      question.optionDetails ??
      question.options?.map((option) => ({
        value: option,
        summary: option,
      })) ??
      [];

    return (
      <div className="wm-gp__cardGrid" role="listbox" aria-label={question.label}>
        {details.map((detail) => {
          const selected = value === detail.value;
          return (
            <button
              key={detail.value}
              type="button"
              className={`wm-gp__cardOption${selected ? " is-selected" : ""}`}
              aria-pressed={selected}
              onClick={() => onChange(detail.value)}
            >
              <span className="wm-gp__cardEyebrow">{detail.eyebrow ?? "Direction"}</span>
              <span className="wm-gp__cardTitle">{detail.title ?? detail.value}</span>
              <span className="wm-gp__cardSummary">{detail.summary}</span>
              {detail.outcome ? (
                <span className="wm-gp__cardOutcome">Leads toward: {detail.outcome}</span>
              ) : null}
              {detail.tags?.length ? (
                <span className="wm-gp__cardTags">{detail.tags.join("")}</span>
              ) : null}
            </button>
          );
        })}
      </div>
    );
  }

  if (question.input === "multiSelect") {
    const selected = parseGuidedProjectSelections(value);
    return (
      <div className="wm-gp__checkboxGroup" role="group" aria-label={question.label}>
        {question.options?.map((option) => {
          const checked = selected.includes(option);
          return (
            <label
              key={option}
              className={`wm-gp__checkboxItem${checked ? " is-selected" : ""}`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onChange(toggleGuidedProjectSelection(value, option))}
              />
              <span>{option}</span>
            </label>
          );
        })}
      </div>
    );
  }
if (question.input === "select") {
    return (
      <select
        className="wm-ui__select"
        aria-label={question.label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Select an option</option>
        {question.options?.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  if (question.input === "textarea") {
    return (
      <textarea
        className="wm-ui__textarea wm-ui__textarea--sm"
        aria-label={question.label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={question.placeholder}
      />
    );
  }

  if (
    question.id === "customer" ||
    question.id === "site" ||
    question.id === "roomName"
  ) {
    const historyKey =
      question.id === "customer"
        ? RECENT_TEXT_HISTORY_KEYS.customer
        : question.id === "site"
          ? RECENT_TEXT_HISTORY_KEYS.site
          : RECENT_TEXT_HISTORY_KEYS.roomName;

    return (
      <RecentTextInput
        className="wm-ui__input"
        aria-label={question.label}
        historyKey={historyKey}
        historyScope={RECENT_TEXT_HISTORY_SCOPES.discoveryWizard}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={question.placeholder}
      />
    );
  }

  return (
    <input
      className="wm-ui__input"
      aria-label={question.label}
      type={question.input === "number" ? "number" : "text"}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={question.placeholder}
    />
  );
}

function stateLabel(state: "watch" | "active" | "resolved") {
  if (state === "resolved") return "Resolved";
  if (state === "active") return "Active";
  return "Watching";
}

const STEP_SHORT_LABELS: Record<GuidedProjectStep, string> = {
  0: "Start",
  1: "Fit",
  2: "Path",
  3: "Checks",
};

const STEP_COMPACT_SUBTITLES: Record<GuidedProjectStep, string> = {
  0: "Choose the outcome type.",
  1: "Confirm counts and distance.",
  2: "Lock transport and signal path.",
  3: "Final checks before shortlist.",
};

const CORE_FIELDS_BY_STEP: Record<GuidedProjectStep, ReadonlyArray<keyof GuidedProjectRecord>> = {
  0: ["workflowTrack"],
  1: ["sourceCount", "displayCount", "outputBehaviour", "featureRequirements", "cableDistanceM", "transportDistanceBand"],
  2: ["sourcePlacement", "sourceConnectionType", "signalFormats", "displayConnectionType", "networkEnvironment"],
  3: ["usbNeeds", "usbStandards", "audioNeeds", "powerPreference", "passthroughNeeds"],
};

function splitQuestionsForLiveCall(
  step: GuidedProjectStep,
  questions: GuidedProjectQuestionState[],
): { primaryQuestions: GuidedProjectQuestionState[]; followUpQuestions: GuidedProjectQuestionState[] } {
  const priority = new Set<keyof GuidedProjectRecord>(CORE_FIELDS_BY_STEP[step]);
  const primaryQuestions = questions.filter((question) => priority.has(question.id));
  const followUpQuestions = questions.filter((question) => !priority.has(question.id));

  if (primaryQuestions.length > 0) {
    return { primaryQuestions, followUpQuestions };
  }

  return {
    primaryQuestions: questions.slice(0, 4),
    followUpQuestions: questions.slice(4),
  };
}

function countAnsweredFields(
  record: GuidedProjectRecord,
  questions: GuidedProjectQuestionState[],
): number {
  return questions.filter((question) => hasText(String(record[question.id] ?? ""))).length;
}

function findNextQuestion(
  record: GuidedProjectRecord,
  questions: GuidedProjectQuestionState[],
): GuidedProjectQuestionState | null {
  return questions.find((question) => !hasText(String(record[question.id] ?? ""))) ?? null;
}

export default function DiscoveryWizardPage() {
const [sources,setSources] = React.useState<number>(1)
  const [displays,setDisplays] = React.useState<number>(1)
  const [resolution,setResolution] = React.useState<string>("4K")
  const navigate = useNavigate();
  const activeProject = React.useSyncExternalStore(
    subscribeProjects,
    () => getActiveProject() ?? null,
    () => null,
  );
  const [record, setRecord] = React.useState<GuidedProjectRecord>(() => readRecord());
  const [draftSavedAt, setDraftSavedAt] = React.useState("");
  const [projectSavedAt, setProjectSavedAt] = React.useState("");
  const [activeStep, setActiveStep] = React.useState<GuidedProjectStep>(0);
  const [followUpVisibility, setFollowUpVisibility] = React.useState<Partial<Record<GuidedProjectStep, boolean>>>({});
  const [snapshotCollapsed, setSnapshotCollapsed] = React.useState(false);
  const [snapshotPosition, setSnapshotPosition] = React.useState<SnapshotFloatPosition>(() =>
    readSnapshotPosition(),
  );
  const [isCompactSnapshotViewport, setIsCompactSnapshotViewport] = React.useState(() =>
    typeof window !== "undefined" ? window.innerWidth <= SNAPSHOT_FLOAT_COMPACT_BREAKPOINT : false,
  );
  const deferredRecord = React.useDeferredValue(record);
  const didMountRef = React.useRef(false);
  const stepTopRef = React.useRef<HTMLDivElement | null>(null);
  const snapshotDragRef = React.useRef<null | {
    startX: number;
    startY: number;
    startLeft: number;
    startTop: number;
  }>(null);

  const advice = React.useMemo(() => buildGuidedProjectAdvice(deferredRecord), [deferredRecord]);
  const progress = React.useMemo(() => getGuidedProjectProgress(record), [record]);
  const activeQuestions = React.useMemo(
    () => getVisibleQuestionsForStep(record, activeStep),
    [activeStep, record],
  );
  const { primaryQuestions, followUpQuestions } = React.useMemo(
    () => splitQuestionsForLiveCall(activeStep, activeQuestions),
    [activeQuestions, activeStep],
  );
  const branchHighlights = React.useMemo(() => buildBranchHighlights(deferredRecord), [deferredRecord]);
  const lenses = React.useMemo(() => buildGuidedProjectLenses(deferredRecord), [deferredRecord]);
  const totalDone = progress.reduce((sum, item) => sum + item.complete, 0);
  const totalFields = progress.reduce((sum, item) => sum + item.total, 0);
  const governance = React.useMemo(() => getRecommendationGovernanceRulebook(), []);
  const leadReasons = advice.reasons.slice(0, 2);
  const priorityNextActions = advice.nextActions.slice(0, 3);
  const activeLenses = lenses.filter((lens) => lens.state !== "watch");
  const displayedLenses = (activeLenses.length > 0 ? activeLenses : lenses).slice(0, 3);
  const primaryDone = countAnsweredFields(record, primaryQuestions);
  const followUpDone = countAnsweredFields(record, followUpQuestions);
  const showFollowUps = followUpVisibility[activeStep] ?? false;
  const nextPrimaryQuestion = findNextQuestion(record, primaryQuestions);
  const nextFollowUpQuestion = findNextQuestion(record, followUpQuestions);
  const nextQuestion = nextPrimaryQuestion ?? (showFollowUps ? nextFollowUpQuestion : null);
  const nextQueuedQuestion = nextPrimaryQuestion ?? nextFollowUpQuestion;
  const firstPendingPrimaryIndex = primaryQuestions.findIndex(
    (question) => !hasText(String(record[question.id] ?? "")),
  );
  const visiblePrimaryQuestions = primaryQuestions.filter((_, index) =>
    firstPendingPrimaryIndex === -1 ? true : index <= firstPendingPrimaryIndex,
  );
  const firstPendingFollowUpIndex = followUpQuestions.findIndex(
    (question) => !hasText(String(record[question.id] ?? "")),
  );
  const visibleFollowUpQuestions = showFollowUps
    ? followUpQuestions.filter((_, index) =>
        firstPendingFollowUpIndex === -1 ? true : index <= firstPendingFollowUpIndex,
      )
    : [];
  const saveStatus = projectSavedAt
    ? `Project saved ${projectSavedAt}`
    : draftSavedAt
      ? `Draft saved ${draftSavedAt}`
      : `Progress ${totalDone}/${totalFields}`;

  React.useEffect(() => {
    if (!activeProject) return;
    setRecord((previous) => {
      const next = mergeProject(previous, activeProject);
      return JSON.stringify(previous) === JSON.stringify(next) ? previous : next;
    });
  }, [activeProject]);

  React.useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }

    const timer = window.setTimeout(() => {
      writeRecord(record);
      setDraftSavedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    }, 220);

    return () => {
      window.clearTimeout(timer);
    };
  }, [record]);

  React.useEffect(() => {
    if (activeStep === 0 || typeof window === "undefined") return;
    if (!stepTopRef.current) return;

    const rect = stepTopRef.current.getBoundingClientRect();
    const topPadding = 92;
    const bottomPadding = 20;
    const fullyVisible = rect.top >= topPadding && rect.bottom <= window.innerHeight - bottomPadding;
    if (fullyVisible) return;

    stepTopRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [activeStep]);

  React.useEffect(() => {
    writeSnapshotPosition(snapshotPosition);
  }, [snapshotPosition]);

  React.useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const handleResize = () => {
      setIsCompactSnapshotViewport(window.innerWidth <= SNAPSHOT_FLOAT_COMPACT_BREAKPOINT);
      setSnapshotPosition((current) => clampSnapshotPosition(current));
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const onPointerMove = (event: PointerEvent) => {
      if (!snapshotDragRef.current || isCompactSnapshotViewport) return;
      const dx = event.clientX - snapshotDragRef.current.startX;
      const dy = event.clientY - snapshotDragRef.current.startY;
      const next = clampSnapshotPosition({
        left: snapshotDragRef.current.startLeft + dx,
        top: snapshotDragRef.current.startTop + dy,
      });
      setSnapshotPosition((current) =>
        current.left === next.left && current.top === next.top ? current : next,
      );
    };
    const stopDragging = () => {
      snapshotDragRef.current = null;
    };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", stopDragging);
    window.addEventListener("pointercancel", stopDragging);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", stopDragging);
      window.removeEventListener("pointercancel", stopDragging);
    };
  }, [isCompactSnapshotViewport]);

  const startSnapshotDrag = React.useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (isCompactSnapshotViewport || event.button !== 0) return;
      if (
        event.target instanceof Element &&
        event.target.closest(".wm-guided-project-page__snapshotToggle")
      ) {
        return;
      }
      event.preventDefault();
      snapshotDragRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        startLeft: snapshotPosition.left,
        startTop: snapshotPosition.top,
      };
    },
    [isCompactSnapshotViewport, snapshotPosition.left, snapshotPosition.top],
  );

  function updateField(field: keyof GuidedProjectRecord, value: string) {
  const normalizedTrack = field === "workflowTrack" ? value.trim().toLowerCase() : "";

  const shouldAdvanceFromOutcome =
    field === "workflowTrack" &&
    activeStep === 0 &&
    !hasText(record.workflowTrack) &&
    hasText(value);

  setRecord((previous) => {
    let next: GuidedProjectRecord;

    if (field === "workflowTrack") {
      const shouldSeedOutcome =
        !hasText(previous.customerOutcome) || previous.customerOutcome === previous.workflowTrack;

      next = {
        ...previous,
        [field]: value,
        
      };

      if (normalizedTrack.includes("duplicate")) {
        next = {
          ...next,
          sourceCount: "1",
        };
      }

      if (normalizedTrack.includes("video wall")) {
        next = {
          ...next,
          outputBehaviour: "video-wall",
        };
      }
    } else {
      next = { ...previous, [field]: value };
    }

    return next;
  });

  if (shouldAdvanceFromOutcome) {
    const firstStep = getNearestVisibleStep(
      { ...record, workflowTrack: value },
      1,
      1
    );
    setActiveStep(firstStep);
  }
}

  function save() {
    const computedAdvice = buildGuidedProjectAdvice(record);
    const payload: GuidedProjectRecord = {
      ...record,
      recommendedFamilies: computedAdvice.families,
      recommendedNextTool: computedAdvice.nextToolPath,
    };

    rememberRecentTextEntry(RECENT_TEXT_HISTORY_KEYS.customer, payload.customer, {
      scope: RECENT_TEXT_HISTORY_SCOPES.discoveryWizard,
    });
    rememberRecentTextEntry(RECENT_TEXT_HISTORY_KEYS.site, payload.site, {
      scope: RECENT_TEXT_HISTORY_SCOPES.discoveryWizard,
    });
    rememberRecentTextEntry(RECENT_TEXT_HISTORY_KEYS.roomName, payload.roomName, {
      scope: RECENT_TEXT_HISTORY_SCOPES.discoveryWizard,
    });
    writeRecord(payload);
    setRecord(payload);

    if (activeProject?.id) {
      updateProjectDiscovery(activeProject.id, {
        workflowTrack: payload.workflowTrack,
        projectScope: payload.projectScope,
        customerOutcome: payload.customerOutcome,
        featureRequirements: payload.featureRequirements,
        customer: payload.customer || activeProject.customer,
        site: payload.site || activeProject.site,
        roomName: payload.roomName || activeProject.roomName || activeProject.name,
        applicationType: payload.applicationType,
        roomLengthM: payload.roomLengthM,
        roomWidthM: payload.roomWidthM,
        roomHeightM: payload.roomHeightM,
        installationPath: payload.installationPath,
        cableDistanceM: payload.cableDistanceM,
        transportDistanceBand: payload.transportDistanceBand,
        displayCount: payload.displayCount,
        sourceCount: payload.sourceCount,
        outputBehaviour: payload.outputBehaviour,
        sourceTypes: payload.sourceTypes,
        sourcePlacement: payload.sourcePlacement,
        sourceConnectionPath: payload.sourceConnectionPath,
        sourceConnectionType: payload.sourceConnectionType,
        signalFormats: payload.signalFormats,
        signalHdr: payload.signalHdr,
        sourceCableType: payload.sourceCableType,
        displayConnectionPath: payload.displayConnectionPath,
        displayConnectionType: payload.displayConnectionType,
        displayCableType: payload.displayCableType,
        networkEnvironment: payload.networkEnvironment,
        usbNeeds: payload.usbNeeds,
        usbStandards: payload.usbStandards,
        audioNeeds: payload.audioNeeds,
        audioBreakout: payload.audioBreakout,
        controlNeeds: payload.controlNeeds,
        powerPreference: payload.powerPreference,
        passthroughNeeds: payload.passthroughNeeds,
        budgetBand: payload.budgetBand,
        urgency: payload.urgency,
        notes: buildGuidedProjectNotes(payload, computedAdvice),
        recommendedFamilies: payload.recommendedFamilies,
        recommendedNextTool: payload.recommendedNextTool,
      });

      updateProject(activeProject.id, {
        recommendationGovernance: buildRecommendationGovernanceSnapshot({
          primaryRecommendation: computedAdvice.primary,
          recommendedFamilies: computedAdvice.families,
          reasoning: computedAdvice.reasons,
          nextActions: computedAdvice.nextActions,
        }),
      });
    }

    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setDraftSavedAt(timestamp);
    setProjectSavedAt(timestamp);
    return computedAdvice;
  }

  function reset() {
    const fresh = createEmptyGuidedProjectRecord();
    setRecord(fresh);
    writeRecord(fresh);
    setDraftSavedAt("");
    setProjectSavedAt("");
    setActiveStep(0);
    setFollowUpVisibility({});
  }

  function next() {
  const nextIndex = getNearestVisibleStep(record, activeStep + 1, 1);
  if (nextIndex > activeStep && nextIndex < GUIDED_PROJECT_STEPS.length) {
    setActiveStep(nextIndex);
    return;
  }

  const computedAdvice = save();
  navigate(computedAdvice.nextToolPath || WM_ROUTES.tools);
}

  return (
    <div className="wm-page wm-dw6 wm-ui wm-guided-project-page" data-active-step={activeStep}>
      <div className="wm-ui__stack">
        <section className="wm-hero wm-guided-project-page__heroBar">
          <div className="wm-page-hero-row wm-dw6__hero wm-guided-project-page__heroCompact">
            <div className="wm-guided-project-page__heroCopy">
              <p className="wm-ui__eyebrow">GUIDED PROJECT</p>
              <div className="wm-guided-project-page__heroTitleRow">
                <h1 className="wm-ui__title">Guided Project</h1>
                <span className="wm-guided-project-page__heroPill">Outcome-first</span>
              </div>
              <p className="wm-ui__subtitle">
                Short, guided SKU narrowing.
              </p>
            </div>
            <div className="wm-actions-row wm-dw6__heroActions">
              <button className="wm-ui__btn wm-ui__btn--ghost" onClick={reset}>
                Start blank
              </button>
              <button className="wm-ui__btn" onClick={() => navigate(WM_ROUTES.newProject)}>
                Project launcher
              </button>
            </div>
          </div>
        </section>

        <section className="wm-section">
          <div className="wm-guided-project-page__workflowBar">
            <div className="wm-guided-project-page__stepRail">
              {GUIDED_PROJECT_STEPS.map(([title], index) => (
                <button
                  key={title}
                  type="button"
                  aria-current={index === activeStep ? "step" : undefined}
                  className={`wm-guided-project-page__stepChip${index === activeStep ? " is-active" : ""}`}
                  onClick={() => setActiveStep(index as GuidedProjectStep)}
                >
                  <span className="wm-guided-project-page__stepChipIndex">{index + 1}</span>
                  <span className="wm-guided-project-page__stepChipLabel">
                    {STEP_SHORT_LABELS[index as GuidedProjectStep]}
                  </span>
                  <span className="wm-guided-project-page__stepChipMeta">
                    {progress[index].complete}/{progress[index].total}
                  </span>
                </button>
              ))}
            </div>
            <div className="wm-guided-project-page__workflowMeta">
              <span className="wm-guided-project-page__quickPill">Step {activeStep + 1} of {GUIDED_PROJECT_STEPS.length}</span>
            </div>
          </div>

          <div className="wm-guided-project-page__canvas">
            <div className="wm-dw6__content wm-guided-project-page__layout wm-guided-project-page__layout--full">
              <div className="wm-guided-project-page__main">
                <div
                  ref={stepTopRef}
                  className="wm-dw6__sectionTop wm-guided-project-page__sectionTop wm-guided-project-page__sectionTop--compact"
                >
                  <div>
                    <h2 className="wm-ui__sectionTitle">Step {activeStep + 1}: {GUIDED_PROJECT_STEPS[activeStep][0]}</h2>
                    <p className="wm-ui__sectionText">{STEP_COMPACT_SUBTITLES[activeStep]}</p>
                  </div>
                  <div className="wm-guided-project-page__sectionBadge">
                    {primaryDone}/{primaryQuestions.length || progress[activeStep].total} core prompts
                  </div>
                </div>

                <div className="wm-dw6__wizardShell wm-guided-project-page__wizardShell">
                <div className="wm-guided-project-page__questionStack">
                  {visiblePrimaryQuestions.map((question) => (
                    <section
                      key={question.id}
                      className={`wm-gp__questionCard${question.fullWidth ? " is-full" : ""}${nextQuestion?.id === question.id ? " is-focus is-active-flow" : ""}${nextQuestion && nextQuestion.id !== question.id ? " is-dimmed-flow" : ""}`}
                    >
                        <div className="wm-ui__field">
                          <span className="wm-ui__label">{question.label}</span>
                          {renderField(
                            question,
                            String(record[question.id] ?? ""),
                            (value) => updateField(question.id, value),
                          )}
                          {nextQuestion?.id === question.id ? (
                            <span className="wm-gp__field-help">{question.helper}</span>
                          ) : null}
                        </div>
                      </section>
                    ))}
                  </div>

                  {followUpQuestions.length > 0 ? (
                    <section className={`wm-guided-project-page__followupShell${nextPrimaryQuestion ? " is-dimmed-flow" : ""}`}>
                      <button
                        type="button"
                        className="wm-guided-project-page__followupToggle"
                        onClick={() =>
                          setFollowUpVisibility((previous) => ({
                            ...previous,
                            [activeStep]: !showFollowUps,
                          }))
                        }
                      >
                        {showFollowUps
                          ? "Hide follow-up detail"
                          : `Show ${followUpQuestions.length} follow-up prompt${followUpQuestions.length === 1 ? "" : "s"}${followUpDone > 0 ? ` (${followUpDone} answered)` : ""}`}
                      </button>

                      {showFollowUps ? (
                        <>
                          <div className="wm-guided-project-page__followupIntro">
                            Use these only when the customer can go deeper or when you need the last details to separate similar SKUs.
                          </div>
                          <div className="wm-guided-project-page__questionStack wm-guided-project-page__questionStack--secondary">
                            {visibleFollowUpQuestions.map((question) => (
                              <section
                                key={question.id}
                                className={`wm-gp__questionCard${question.fullWidth ? " is-full" : ""}${nextQuestion?.id === question.id ? " is-focus is-active-flow" : ""}${nextQuestion && nextQuestion.id !== question.id ? " is-dimmed-flow" : ""}`}
                              >
                                <div className="wm-ui__field">
                                  <span className="wm-ui__label">{question.label}</span>
                                  {renderField(
                                    question,
                                    String(record[question.id] ?? ""),
                                    (value) => updateField(question.id, value),
                                  )}
                                  {nextQuestion?.id === question.id ? (
                                    <span className="wm-gp__field-help">{question.helper}</span>
                                  ) : null}
                                </div>
                              </section>
                            ))}
                          </div>
                        </>
                      ) : null}
                    </section>
                  ) : null}

                  <div className={`wm-dw6__nav wm-guided-project-page__nav$`}>
                    <div className="wm-dw6__navLeft">
                      <span className="wm-ui__helper wm-dw6__save-meta">
                        {record.workflowTrack || "Choose a direction to begin"}
                      </span>
                    </div>
                    <div className="wm-dw6__navRight">
                      <button
                        className="wm-ui__btn wm-ui__btn--ghost"
                        onClick={() => setActiveStep((value) => getNearestVisibleStep(record, value - 1, -1))}
                        disabled={activeStep === 0}
                      >
                        Previous
                      </button>
                      <button className="wm-ui__btn" onClick={save}>
                        Save to project
                      </button>
                      <button className="wm-ui__btn wm-ui__btn--primary" onClick={next}>
                        {activeStep < GUIDED_PROJECT_STEPS.length - 1
                          ? "Next step"
                          : `Save and Open ${getNextToolLabel(advice.nextToolPath)}`}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
