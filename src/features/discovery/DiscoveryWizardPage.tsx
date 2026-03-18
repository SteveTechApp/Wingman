import * as React from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
  buildGuidedProjectLenses,
  buildGuidedProjectNotes,
  createEmptyGuidedProjectRecord,
  getCoreFieldsForStep,
  getGuidedProjectProgress,
  getGuidedProjectStepSubtitle,
  getHiddenQuestionIdsForTrack,
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
import { buildAvRecommendationFromDiscovery } from "@/services/av-recommendation/engine";

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
  const mergedWorkflowTrack = mergeFirst(record.workflowTrack, discovery?.workflowTrack);
  const fixedHdmiPath =
    mergedWorkflowTrack.toLowerCase().includes("extend") ||
    mergedWorkflowTrack.toLowerCase().includes("duplicate");
  return {
    ...record,
    workflowTrack: mergedWorkflowTrack,
    projectScope: mergeFirst(record.projectScope, discovery?.projectScope, "Single device or signal path"),
    customerOutcome: mergeFirst(record.customerOutcome, discovery?.customerOutcome),
    switchSolutionType: mergeFirst(record.switchSolutionType, discovery?.switchSolutionType),
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
    transportCableType: mergeFirst(record.transportCableType, discovery?.transportCableType),
    displayCount: mergeFirst(record.displayCount, discovery?.displayCount),
    sourceCount: mergeFirst(record.sourceCount, discovery?.sourceCount),
    outputBehaviour: mergeFirst(record.outputBehaviour, discovery?.outputBehaviour),
    sourceTypes: mergeFirst(record.sourceTypes, discovery?.sourceTypes),
    sourcePlacement: mergeFirst(record.sourcePlacement, discovery?.sourcePlacement),
    sourceConnectionPath: mergeFirst(record.sourceConnectionPath, discovery?.sourceConnectionPath),
    sourceConnectionType: mergeFirst(record.sourceConnectionType, discovery?.sourceConnectionType, fixedHdmiPath ? "HDMI" : undefined),
    signalFormats: mergeFirst(record.signalFormats, discovery?.signalFormats),
    signalHdr: mergeFirst(record.signalHdr, discovery?.signalHdr),
    sourceCableType: mergeFirst(record.sourceCableType, discovery?.sourceCableType),
    displayConnectionPath: mergeFirst(record.displayConnectionPath, discovery?.displayConnectionPath),
    displayConnectionType: mergeFirst(record.displayConnectionType, discovery?.displayConnectionType, fixedHdmiPath ? "HDMI" : undefined),
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
    const useCompactCards = question.id !== "workflowTrack";
    const details =
      question.optionDetails ??
      question.options?.map((option) => ({
        value: option,
        summary: option,
      })) ??
      [];

    return (
      <div
        className={`wm-gp__cardGrid${useCompactCards ? " wm-gp__cardGrid--compact" : ""}`}
        role="listbox"
        aria-label={question.label}
        data-question-id={question.id}
      >
        {details.map((detail) => {
          const selected = value === detail.value;
          return (
            <button
              key={detail.value}
              type="button"
              className={`wm-gp__cardOption${selected ? " is-selected" : ""}${useCompactCards ? " wm-gp__cardOption--compact" : ""}`}
              aria-pressed={selected}
              onClick={() => onChange(detail.value)}
              style={
                detail.accentRgb
                  ? ({ "--wm-gp-card-accent-rgb": detail.accentRgb } as React.CSSProperties)
                  : undefined
              }
            >
              <span className="wm-gp__cardEyebrow">{detail.eyebrow ?? "Direction"}</span>
              <span className="wm-gp__cardTitle">{detail.title ?? detail.value}</span>
              <span className="wm-gp__cardSummary">{detail.summary}</span>
              {detail.outcome ? (
                <span className="wm-gp__cardOutcome">Leads toward: {detail.outcome}</span>
              ) : null}
              {detail.tags?.length ? (
                <span className="wm-gp__cardTags">{detail.tags.join(" / ")}</span>
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

function splitQuestionsForLiveCall(
  record: GuidedProjectRecord,
  step: GuidedProjectStep,
  questions: GuidedProjectQuestionState[],
): { primaryQuestions: GuidedProjectQuestionState[]; followUpQuestions: GuidedProjectQuestionState[] } {
  const priority = new Set<keyof GuidedProjectRecord>(getCoreFieldsForStep(record, step));
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
  const location = useLocation();
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
  const [handoffFocusQuestionId, setHandoffFocusQuestionId] = React.useState<keyof GuidedProjectRecord | null>(null);
  const [isCompactSnapshotViewport, setIsCompactSnapshotViewport] = React.useState(() =>
    typeof window !== "undefined" ? window.innerWidth <= SNAPSHOT_FLOAT_COMPACT_BREAKPOINT : false,
  );
  const deferredRecord = React.useDeferredValue(record);
  const didMountRef = React.useRef(false);
  const stepTopRef = React.useRef<HTMLDivElement | null>(null);
  const questionRefs = React.useRef<Partial<Record<keyof GuidedProjectRecord, HTMLElement | null>>>({});
  const snapshotDragRef = React.useRef<null | {
    startX: number;
    startY: number;
    startLeft: number;
    startTop: number;
  }>(null);

  const recommendation = React.useMemo(
    () => buildAvRecommendationFromDiscovery(deferredRecord),
    [deferredRecord],
  );
  const advice = recommendation.advice;
  const progress = React.useMemo(() => getGuidedProjectProgress(record), [record]);
  const activeQuestions = React.useMemo(
    () => getVisibleQuestionsForStep(record, activeStep),
    [activeStep, record],
  );
  const { primaryQuestions, followUpQuestions } = React.useMemo(
    () => splitQuestionsForLiveCall(record, activeStep, activeQuestions),
    [activeQuestions, activeStep, record],
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
  const nextVisibleStep = getNearestVisibleStep(record, activeStep + 1, 1);
  const hasNextVisibleStep =
    nextVisibleStep > activeStep && nextVisibleStep < GUIDED_PROJECT_STEPS.length;
  const showSectionCta = activeStep > 0;
  const sectionCtaLabel = hasNextVisibleStep
    ? `Next: ${GUIDED_PROJECT_STEPS[nextVisibleStep][0]}`
    : `Open ${getNextToolLabel(advice.nextToolPath)}`;
  const saveStatus = projectSavedAt
    ? `Project saved ${projectSavedAt}`
    : draftSavedAt
      ? `Draft saved ${draftSavedAt}`
      : `Progress ${totalDone}/${totalFields}`;

  const syncProjectSnapshot = React.useCallback(
    (
      sourceRecord: GuidedProjectRecord,
      computedRecommendation = buildAvRecommendationFromDiscovery(sourceRecord),
    ) => {
      if (!activeProject?.id) return computedRecommendation.advice;

      updateProjectDiscovery(activeProject.id, {
        workflowTrack: sourceRecord.workflowTrack,
        projectScope: sourceRecord.projectScope,
        customerOutcome: sourceRecord.customerOutcome,
        switchSolutionType: sourceRecord.switchSolutionType,
        featureRequirements: sourceRecord.featureRequirements,
        customer: sourceRecord.customer || activeProject.customer,
        site: sourceRecord.site || activeProject.site,
        roomName: sourceRecord.roomName || activeProject.roomName || activeProject.name,
        applicationType: sourceRecord.applicationType,
        roomLengthM: sourceRecord.roomLengthM,
        roomWidthM: sourceRecord.roomWidthM,
        roomHeightM: sourceRecord.roomHeightM,
        installationPath: sourceRecord.installationPath,
        cableDistanceM: sourceRecord.cableDistanceM,
        transportDistanceBand: sourceRecord.transportDistanceBand,
        transportCableType: sourceRecord.transportCableType,
        displayCount: sourceRecord.displayCount,
        sourceCount: sourceRecord.sourceCount,
        outputBehaviour: sourceRecord.outputBehaviour,
        sourceTypes: sourceRecord.sourceTypes,
        sourcePlacement: sourceRecord.sourcePlacement,
        sourceConnectionPath: sourceRecord.sourceConnectionPath,
        sourceConnectionType: sourceRecord.sourceConnectionType,
        signalFormats: sourceRecord.signalFormats,
        signalHdr: sourceRecord.signalHdr,
        sourceCableType: sourceRecord.sourceCableType,
        displayConnectionPath: sourceRecord.displayConnectionPath,
        displayConnectionType: sourceRecord.displayConnectionType,
        displayCableType: sourceRecord.displayCableType,
        networkEnvironment: sourceRecord.networkEnvironment,
        usbNeeds: sourceRecord.usbNeeds,
        usbStandards: sourceRecord.usbStandards,
        audioNeeds: sourceRecord.audioNeeds,
        audioBreakout: sourceRecord.audioBreakout,
        controlNeeds: sourceRecord.controlNeeds,
        powerPreference: sourceRecord.powerPreference,
        passthroughNeeds: sourceRecord.passthroughNeeds,
        budgetBand: sourceRecord.budgetBand,
        urgency: sourceRecord.urgency,
        notes: buildGuidedProjectNotes(sourceRecord, computedRecommendation.advice),
        recommendedFamilies: computedRecommendation.advice.families,
        recommendedNextTool: computedRecommendation.advice.nextToolPath,
      });

      updateProject(activeProject.id, {
        recommendationGovernance: buildRecommendationGovernanceSnapshot({
          primaryRecommendation: computedRecommendation.advice.primary,
          recommendedFamilies: computedRecommendation.advice.families,
          reasoning: computedRecommendation.whyThisAnswer,
          nextActions: computedRecommendation.whatsMissing.length > 0
            ? computedRecommendation.whatsMissing
            : computedRecommendation.advice.nextActions,
        }),
      });

      return computedRecommendation.advice;
    },
    [activeProject],
  );

  React.useEffect(() => {
    if (!activeProject) return;
    setRecord((previous) => {
      const next = mergeProject(previous, activeProject);
      return JSON.stringify(previous) === JSON.stringify(next) ? previous : next;
    });
  }, [activeProject]);

  React.useEffect(() => {
    const focusState = location.state as
      | {
          focusStep?: GuidedProjectStep;
          focusQuestionId?: keyof GuidedProjectRecord;
        }
      | null;

    if (!focusState || typeof focusState.focusStep !== "number") return;

    const targetStep = focusState.focusStep as GuidedProjectStep;
    const targetQuestions = getVisibleQuestionsForStep(record, targetStep);
    const targetQuestion = focusState.focusQuestionId
      ? targetQuestions.find((question) => question.id === focusState.focusQuestionId)
      : null;

    setActiveStep(targetStep);

    if (targetQuestion) {
      const primaryIds = new Set(getCoreFieldsForStep(record, targetStep));
      if (!primaryIds.has(targetQuestion.id)) {
        setFollowUpVisibility((previous) => ({
          ...previous,
          [targetStep]: true,
        }));
      }
      setHandoffFocusQuestionId(targetQuestion.id);
    }

    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate, record]);

  React.useEffect(() => {
    if (!handoffFocusQuestionId) return;

    const timer = window.setTimeout(() => {
      const element = questionRefs.current[handoffFocusQuestionId];
      if (!element) return;

      element.scrollIntoView({ behavior: "smooth", block: "center" });

      const control = element.querySelector<HTMLElement>(
        "input, select, textarea, button, [tabindex]:not([tabindex='-1'])",
      );

      window.setTimeout(() => {
        control?.focus({ preventScroll: true });
      }, 120);
    }, 80);

    const clearTimer = window.setTimeout(() => {
      setHandoffFocusQuestionId(null);
    }, 2600);

    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(clearTimer);
    };
  }, [activeStep, handoffFocusQuestionId, showFollowUps]);

  React.useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }

    const timer = window.setTimeout(() => {
      writeRecord(record);
      const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setDraftSavedAt(timestamp);

      if (activeProject?.id) {
        syncProjectSnapshot(record);
        setProjectSavedAt(timestamp);
      } else {
        setProjectSavedAt("");
      }
    }, 220);

    return () => {
      window.clearTimeout(timer);
    };
  }, [activeProject?.id, record, syncProjectSnapshot]);

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
    hasText(value);

  setRecord((previous) => {
    let next: GuidedProjectRecord;

    if (field === "workflowTrack") {
      const shouldSeedOutcome =
        !hasText(previous.customerOutcome) || previous.customerOutcome === previous.workflowTrack;

      next = {
        ...previous,
        [field]: value,
        customerOutcome: shouldSeedOutcome ? value : previous.customerOutcome,
        switchSolutionType: normalizedTrack.includes("switch") ? previous.switchSolutionType : "",
      };

      if (normalizedTrack.includes("extend")) {
        next = {
          ...next,
          sourceCount: "1",
          displayCount: "1",
          outputBehaviour: "One destination only",
          sourceConnectionType: "HDMI",
          displayConnectionType: "HDMI",
        };
      }

      if (normalizedTrack.includes("duplicate")) {
        next = {
          ...next,
          sourceCount: "1",
          outputBehaviour: "Same content everywhere",
          sourceConnectionType: "HDMI",
          displayConnectionType: "HDMI",
        };
      }

      if (normalizedTrack.includes("video wall")) {
        next = {
          ...next,
          outputBehaviour: "video-wall",
        };
      }

      for (const questionId of getHiddenQuestionIdsForTrack(value)) {
        if (questionId === "sourceCount" && (normalizedTrack.includes("extend") || normalizedTrack.includes("duplicate"))) continue;
        if (questionId === "displayCount" && normalizedTrack.includes("extend")) continue;
        if (questionId === "outputBehaviour" && (normalizedTrack.includes("extend") || normalizedTrack.includes("duplicate") || normalizedTrack.includes("video wall"))) continue;
        if (questionId === "sourceConnectionType" && (normalizedTrack.includes("extend") || normalizedTrack.includes("duplicate"))) continue;
        if (questionId === "displayConnectionType" && (normalizedTrack.includes("extend") || normalizedTrack.includes("duplicate"))) continue;
        next = {
          ...next,
          [questionId]: "",
        };
      }
    } else {
      next = { ...previous, [field]: value };
      if (field === "switchSolutionType") {
        if (value.toLowerCase().includes("matrix")) {
          next = {
            ...next,
            sourceConnectionType: "HDMI",
            displayConnectionType:
              previous.displayConnectionType.toLowerCase().includes("class") || !hasText(previous.displayConnectionType)
                ? "HDMI"
                : previous.displayConnectionType,
          };
        }
        if (value.toLowerCase().includes("presentation")) {
          next = {
            ...next,
            displayConnectionType: previous.displayConnectionType.toLowerCase().includes("class")
              ? ""
              : previous.displayConnectionType,
          };
        }
      }
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
    const computedRecommendation = buildAvRecommendationFromDiscovery(record);
    const computedAdvice = computedRecommendation.advice;
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

    syncProjectSnapshot(payload, computedRecommendation);

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

        <section className="wm-section wm-guided-project-page__stageShell">
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
              <span className="wm-guided-project-page__quickMeta">{saveStatus}</span>
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
                    <p className="wm-ui__sectionText">{getGuidedProjectStepSubtitle(record, activeStep)}</p>
                  </div>
                  <div className="wm-guided-project-page__sectionMeta">
                    <div className="wm-guided-project-page__sectionBadge">
                      {primaryDone}/{primaryQuestions.length || progress[activeStep].total} core prompts
                    </div>
                    {showSectionCta ? (
                      <button
                        type="button"
                        className="wm-guided-project-page__sectionCta"
                        onClick={next}
                      >
                        {sectionCtaLabel}
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="wm-dw6__wizardShell wm-guided-project-page__wizardShell">
                <div className="wm-guided-project-page__questionStack">
                  {visiblePrimaryQuestions.map((question) => (
                    <section
                      key={question.id}
                      ref={(element) => {
                        questionRefs.current[question.id] = element;
                      }}
                      className={`wm-gp__questionCard${question.fullWidth ? " is-full" : ""}${nextQuestion?.id === question.id ? " is-focus is-active-flow" : ""}${nextQuestion && nextQuestion.id !== question.id ? " is-dimmed-flow" : ""}${handoffFocusQuestionId === question.id ? " is-handoff-focus" : ""}`}
                      data-question-id={question.id}
                      data-question-input={question.input}
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
                                ref={(element) => {
                                  questionRefs.current[question.id] = element;
                                }}
                                className={`wm-gp__questionCard${question.fullWidth ? " is-full" : ""}${nextQuestion?.id === question.id ? " is-focus is-active-flow" : ""}${nextQuestion && nextQuestion.id !== question.id ? " is-dimmed-flow" : ""}${handoffFocusQuestionId === question.id ? " is-handoff-focus" : ""}`}
                                data-question-id={question.id}
                                data-question-input={question.input}
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

                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
