import * as React from "react";
import { useNavigate } from "react-router-dom";

import RecentTextInput from "@/components/RecentTextInput";
import { WM_ROUTES } from "@/core/wingman/routeMap";
import {
  buildRecommendationGovernanceSnapshot,
  getRecommendationGovernanceRulebook,
} from "@/features/governance/recommendationGovernance";
import {
  RECENT_TEXT_HISTORY_KEYS,
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

function readRecord(): GuidedProjectRecord {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw
      ? { ...createEmptyGuidedProjectRecord(), ...(JSON.parse(raw) as Partial<GuidedProjectRecord>) }
      : createEmptyGuidedProjectRecord();
  } catch {
    return createEmptyGuidedProjectRecord();
  }
}

function writeRecord(record: GuidedProjectRecord) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {}
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
    projectScope: mergeFirst(record.projectScope, discovery?.projectScope),
    customerOutcome: mergeFirst(record.customerOutcome, discovery?.customerOutcome),
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
                <span className="wm-gp__cardTags">{detail.tags.join(" • ")}</span>
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
  1: "Scope",
  2: "Path",
  3: "Checks",
};

const CORE_FIELDS_BY_STEP: Record<GuidedProjectStep, ReadonlyArray<keyof GuidedProjectRecord>> = {
  0: ["workflowTrack", "projectScope", "customerOutcome", "applicationType"],
  1: ["sourceCount", "displayCount", "outputBehaviour", "cableDistanceM", "transportDistanceBand"],
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
  const deferredRecord = React.useDeferredValue(record);
  const didMountRef = React.useRef(false);
  const stepTopRef = React.useRef<HTMLDivElement | null>(null);

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
  const nextQuestion = nextPrimaryQuestion ?? nextFollowUpQuestion;
  const secondaryFamilies = advice.families.filter((family) => family !== advice.primary).slice(0, 2);
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

  function updateField(field: keyof GuidedProjectRecord, value: string) {
    setRecord((previous) => ({ ...previous, [field]: value }));
  }

  function save() {
    const computedAdvice = buildGuidedProjectAdvice(record);
    const payload: GuidedProjectRecord = {
      ...record,
      recommendedFamilies: computedAdvice.families,
      recommendedNextTool: computedAdvice.nextToolPath,
    };

    rememberRecentTextEntry(RECENT_TEXT_HISTORY_KEYS.customer, payload.customer);
    writeRecord(payload);
    setRecord(payload);

    if (activeProject?.id) {
      updateProjectDiscovery(activeProject.id, {
        workflowTrack: payload.workflowTrack,
        projectScope: payload.projectScope,
        customerOutcome: payload.customerOutcome,
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
    if (activeStep < GUIDED_PROJECT_STEPS.length - 1) {
      setActiveStep((value) => (value + 1) as GuidedProjectStep);
      return;
    }
    const computedAdvice = save();
    navigate(computedAdvice.nextToolPath);
  }

  return (
    <div className="wm-page wm-dw6 wm-ui wm-guided-project-page">
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
                Capture the brief, then progress step-by-step.
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
              <span className="wm-guided-project-page__quickMeta">Ask now: {primaryQuestions.length}</span>
              {followUpQuestions.length > 0 ? (
                <span className="wm-guided-project-page__quickMeta">
                  Follow-up: {followUpQuestions.length}
                </span>
              ) : null}
            </div>
          </div>

          <div className="wm-guided-project-page__canvas">
            <div className="wm-dw6__content wm-guided-project-page__layout">
              <div className="wm-guided-project-page__main">
                <div
                  ref={stepTopRef}
                  className="wm-dw6__sectionTop wm-guided-project-page__sectionTop wm-guided-project-page__sectionTop--compact"
                >
                  <div>
                    <h2 className="wm-ui__sectionTitle">Step {activeStep + 1}: {GUIDED_PROJECT_STEPS[activeStep][0]}</h2>
                    <p className="wm-ui__sectionText">{GUIDED_PROJECT_STEPS[activeStep][1]}</p>
                  </div>
                  <div className="wm-guided-project-page__sectionBadge">
                    {primaryDone}/{primaryQuestions.length || progress[activeStep].total} core prompts
                  </div>
                </div>

                <div className="wm-guided-project-page__sessionStrip">
                  <span className="wm-guided-project-page__quickMeta">{saveStatus}</span>
                  <span className="wm-guided-project-page__quickMeta">
                    {nextQuestion ? `Ask next: ${nextQuestion.label}` : "Core step capture is complete"}
                  </span>
                </div>

                <div className="wm-dw6__wizardShell wm-guided-project-page__wizardShell">
                  <div className="wm-guided-project-page__callout">
                    <div className="wm-guided-project-page__calloutTitle">Start narrow, then qualify</div>
                    <div className="wm-guided-project-page__calloutCopy">
                      Each path asks only the details that reduce the WyreStorm shortlist.
                    </div>
                  </div>
                <div className="wm-guided-project-page__questionStack">
                  {primaryQuestions.map((question) => (
                    <section
                      key={question.id}
                      className={`wm-gp__questionCard${question.fullWidth ? " is-full" : ""}${nextQuestion?.id === question.id ? " is-focus is-active-flow" : ""}${nextQuestion && nextQuestion.id !== question.id ? " is-dimmed-flow" : ""}`}
                    >
                        {question.branchReasonText ? (
                          <div className="wm-gp__questionReason">{question.branchReasonText}</div>
                        ) : null}
                        <div className="wm-ui__field">
                          <span className="wm-ui__label">{question.label}</span>
                          {renderField(
                            question,
                            String(record[question.id] ?? ""),
                            (value) => updateField(question.id, value),
                          )}
                          <span className="wm-gp__field-help">{question.helper}</span>
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
                            {followUpQuestions.map((question) => (
                              <section
                                key={question.id}
                                className={`wm-gp__questionCard${question.fullWidth ? " is-full" : ""}${nextQuestion?.id === question.id ? " is-focus is-active-flow" : ""}${nextQuestion && nextQuestion.id !== question.id ? " is-dimmed-flow" : ""}`}
                              >
                                {question.branchReasonText ? (
                                  <div className="wm-gp__questionReason">{question.branchReasonText}</div>
                                ) : null}
                                <div className="wm-ui__field">
                                  <span className="wm-ui__label">{question.label}</span>
                                  {renderField(
                                    question,
                                    String(record[question.id] ?? ""),
                                    (value) => updateField(question.id, value),
                                  )}
                                  <span className="wm-gp__field-help">{question.helper}</span>
                                </div>
                              </section>
                            ))}
                          </div>
                        </>
                      ) : null}
                    </section>
                  ) : null}

                  <div className={`wm-dw6__nav wm-guided-project-page__nav${nextQuestion ? " is-dimmed-flow" : " is-active-flow"}`}>
                    <div className="wm-dw6__navLeft">
                      <span className="wm-ui__helper wm-dw6__save-meta">
                        {record.workflowTrack || "Choose a direction to begin"}
                      </span>
                    </div>
                    <div className="wm-dw6__navRight">
                      <button
                        className="wm-ui__btn wm-ui__btn--ghost"
                        onClick={() => setActiveStep((value) => Math.max(0, value - 1) as GuidedProjectStep)}
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

              <aside className="wm-guided-project-page__sidebar">
                <section className={`wm-guided-project-page__readout wm-guided-project-page__readout--compact${nextQuestion ? " is-dimmed-flow" : " is-active-flow"}`}>
                  <div className="wm-guided-project-page__readout-top">
                    <div>
                      <div className="wm-gp__summaryEyebrow">Likely category</div>
                      <div className="wm-gp__summaryTitle">{advice.focusCategory}</div>
                    </div>
                    <div className="wm-guided-project-page__readoutAside">
                      <div className="wm-gp__confidence">{advice.confidence} confidence</div>
                      <div className="wm-guided-project-page__nextTool">
                        Next: {getNextToolLabel(advice.nextToolPath)}
                      </div>
                    </div>
                  </div>

                  <p className="wm-gp__summaryCopy">{advice.workflowSummary}</p>

                  <div className="wm-ui__chips">
                    <span className="wm-ui__chip wm-ui__chip--active">
                      {advice.primary} family
                    </span>
                    {secondaryFamilies.map((family) => (
                      <span key={family} className="wm-ui__chip">
                        {family}
                      </span>
                    ))}
                  </div>
                </section>

                <section className={`wm-guided-project-page__summaryPanel${nextQuestion ? " is-dimmed-flow" : " is-active-flow"}`}>
                  <div className="wm-guided-project-page__summaryLabel">Live snapshot</div>
                  <div className="wm-guided-project-page__summaryList">
                    <div className="wm-guided-project-page__summaryItem">
                      <span>Direction</span>
                      <strong>{record.workflowTrack || "Not confirmed yet"}</strong>
                    </div>
                    <div className="wm-guided-project-page__summaryItem">
                      <span>Project</span>
                      <strong>{activeProject?.name || record.roomName || "Current guided project"}</strong>
                    </div>
                    <div className="wm-guided-project-page__summaryItem">
                      <span>Save state</span>
                      <strong>{saveStatus}</strong>
                    </div>
                    <div className="wm-guided-project-page__summaryItem">
                      <span>Ask next</span>
                      <strong>{nextQuestion?.label || "Core step capture is complete"}</strong>
                    </div>
                  </div>
                </section>

                <div className={`wm-guided-project-page__drawers${nextQuestion ? " is-dimmed-flow" : ""}`}>
                  <details className="wm-guided-project-page__drawer wm-guided-project-page__drawer--coach">
                    <summary>Coach notes and recommendation logic</summary>
                    <div className="wm-guided-project-page__drawer-body">
                      <div className="wm-guided-project-page__drawer-grid">
                        <article className="wm-gp__summaryCard">
                          <div className="wm-gp__summaryEyebrow">Why this fit is leading</div>
                          <ul className="wm-gp__list">
                            {leadReasons.map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                        </article>

                        <article className="wm-gp__summaryCard">
                          <div className="wm-gp__summaryEyebrow">Still worth clarifying</div>
                          <ul className="wm-gp__list">
                            {branchHighlights.length > 0
                              ? branchHighlights.slice(0, 3).map((item) => <li key={item}>{item}</li>)
                              : priorityNextActions.map((item) => <li key={item}>{item}</li>)}
                          </ul>
                        </article>

                        <article className="wm-gp__summaryCard">
                          <div className="wm-gp__summaryEyebrow">Recommendation state</div>
                          <div className="wm-guided-project-page__lens-stack">
                            {displayedLenses.map((lens) => (
                              <article key={lens.id} className="wm-gp__decisionCard">
                                <div className="wm-gp__decisionTop">
                                  <div className="wm-gp__summaryEyebrow">{lens.title}</div>
                                  <span className={`wm-gp__state wm-gp__state--${lens.state}`}>
                                    {stateLabel(lens.state)}
                                  </span>
                                </div>
                                <div className="wm-gp__summaryCopy">{lens.summary}</div>
                              </article>
                            ))}
                          </div>
                          <div className="wm-guided-project-page__governanceNote">
                            Rule set {governance.recommendationRules.version} using catalog {governance.recommendationRules.catalogVersion}
                          </div>
                        </article>
                      </div>
                    </div>
                  </details>
                </div>
              </aside>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
