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
    controlNeeds: mergeFirst(record.controlNeeds, discovery?.controlNeeds),
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
  0: "Brief",
  1: "Space",
  2: "Signal",
  3: "Use",
};

const CORE_FIELDS_BY_STEP: Record<GuidedProjectStep, ReadonlyArray<keyof GuidedProjectRecord>> = {
  0: ["customer", "site", "roomName", "applicationType"],
  1: ["roomLengthM", "roomWidthM", "displayCount", "cableDistanceM"],
  2: ["sourceCount", "sourceTypes", "sourcePlacement", "sourceConnectionType", "displayConnectionType"],
  3: ["usbNeeds", "audioNeeds", "controlNeeds", "budgetBand", "urgency"],
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
  const primaryDone = countAnsweredFields(record, primaryQuestions);
  const followUpDone = countAnsweredFields(record, followUpQuestions);
  const stepHasAnsweredFollowUps = followUpQuestions.some((question) =>
    hasText(String(record[question.id] ?? "")),
  );
  const showFollowUps = followUpVisibility[activeStep] ?? stepHasAnsweredFollowUps;
  const nextPrimaryQuestion = findNextQuestion(record, primaryQuestions);
  const nextFollowUpQuestion = findNextQuestion(record, followUpQuestions);
  const nextQuestion = nextPrimaryQuestion ?? nextFollowUpQuestion;
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
        controlNeeds: payload.controlNeeds,
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
        <section className="wm-hero">
          <div className="wm-page-hero-row wm-dw6__hero">
            <div>
              <p className="wm-ui__eyebrow">GUIDED PROJECT</p>
              <h1 className="wm-ui__title">Guided Project</h1>
              <p className="wm-ui__subtitle">
                Capture just enough detail to steer the design while you are still live with the customer.
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

          <div className="wm-guided-project-page__quickbar">
            <span className="wm-guided-project-page__quickPill">Live call mode</span>
            <span className="wm-guided-project-page__quickMeta">
              Step {activeStep + 1} of {GUIDED_PROJECT_STEPS.length}
            </span>
            <span className="wm-guided-project-page__quickMeta">
              Ask now: {primaryQuestions.length}
            </span>
            {followUpQuestions.length > 0 ? (
              <span className="wm-guided-project-page__quickMeta">
                Follow-up: {followUpQuestions.length}
              </span>
            ) : null}
          </div>

          <div className="wm-guided-project-page__canvas">
            <div className="wm-dw6__content">
              <div className="wm-dw6__sectionTop wm-guided-project-page__sectionTop">
                <div>
                  <h2 className="wm-ui__sectionTitle">Step {activeStep + 1}: {GUIDED_PROJECT_STEPS[activeStep][0]}</h2>
                  <p className="wm-ui__sectionText">{GUIDED_PROJECT_STEPS[activeStep][1]}</p>
                </div>
                <div className="wm-dw6__stepBadge">
                  {primaryDone}/{primaryQuestions.length || progress[activeStep].total} live prompts captured
                </div>
              </div>

              <section className="wm-guided-project-page__readout wm-guided-project-page__readout--compact">
                <div className="wm-guided-project-page__readout-top">
                  <div>
                    <div className="wm-gp__summaryEyebrow">Live recommendation</div>
                    <div className="wm-gp__summaryTitle">{advice.primary} is the lead fit right now</div>
                  </div>
                  <div className="wm-guided-project-page__readoutAside">
                    <div className="wm-gp__confidence">{advice.confidence} confidence</div>
                    <div className="wm-guided-project-page__nextTool">
                      Next: {getNextToolLabel(advice.nextToolPath)}
                    </div>
                  </div>
                </div>

                <p className="wm-gp__summaryCopy">{advice.summary}</p>

                <div className="wm-guided-project-page__readout-meta">
                  <span>{activeProject?.name || record.roomName || "Current guided project"}</span>
                  <span>{saveStatus}</span>
                  <span>
                    {nextQuestion ? `Ask next: ${nextQuestion.label}` : "Core step capture is complete"}
                  </span>
                </div>

                <div className="wm-ui__chips">
                  {advice.families.slice(0, 3).map((family) => (
                    <span key={family} className="wm-ui__chip wm-ui__chip--active">
                      {family}
                    </span>
                  ))}
                  {advice.families.length > 3 ? (
                    <span className="wm-ui__chip">+{advice.families.length - 3} more</span>
                  ) : null}
                </div>
              </section>

              <div className="wm-dw6__wizardShell wm-guided-project-page__wizardShell">
                <div className="wm-guided-project-page__callout">
                  <div className="wm-guided-project-page__calloutTitle">Ask the essentials first</div>
                  <div className="wm-guided-project-page__calloutCopy">
                    Wingman keeps the core prompts on screen and tucks extra technical detail away until you need it.
                  </div>
                </div>

                <div className="wm-guided-project-page__questionStack">
                  {primaryQuestions.map((question) => (
                    <section
                      key={question.id}
                      className={`wm-gp__questionCard${question.fullWidth ? " is-full" : ""}${nextPrimaryQuestion?.id === question.id ? " is-focus" : ""}`}
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
                  <section className="wm-guided-project-page__followupShell">
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
                          Use these only when the customer can go deeper or the design still carries risk.
                        </div>
                        <div className="wm-guided-project-page__questionStack wm-guided-project-page__questionStack--secondary">
                          {followUpQuestions.map((question) => (
                            <section
                              key={question.id}
                              className={`wm-gp__questionCard${question.fullWidth ? " is-full" : ""}`}
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

                <div className="wm-dw6__nav wm-guided-project-page__nav">
                  <div className="wm-dw6__navLeft">
                    <span className="wm-ui__helper wm-dw6__save-meta">
                      {saveStatus}
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

              <div className="wm-guided-project-page__drawers">
                <details className="wm-guided-project-page__drawer wm-guided-project-page__drawer--coach">
                  <summary>Coach notes and recommendation logic</summary>
                  <div className="wm-guided-project-page__drawer-body">
                    <div className="wm-guided-project-page__drawer-grid wm-guided-project-page__drawer-grid--coach">
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
                          {(activeLenses.length > 0 ? activeLenses : lenses).slice(0, 3).map((lens) => (
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
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
