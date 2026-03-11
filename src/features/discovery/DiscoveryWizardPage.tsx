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

export default function DiscoveryWizardPage() {
  const navigate = useNavigate();
  const activeProject = React.useSyncExternalStore(
    subscribeProjects,
    () => getActiveProject() ?? null,
    () => null,
  );
  const [record, setRecord] = React.useState<GuidedProjectRecord>(() => readRecord());
  const [savedAt, setSavedAt] = React.useState("");
  const [activeStep, setActiveStep] = React.useState<GuidedProjectStep>(0);

  const advice = React.useMemo(() => buildGuidedProjectAdvice(record), [record]);
  const progress = React.useMemo(() => getGuidedProjectProgress(record), [record]);
  const activeQuestions = React.useMemo(
    () => getVisibleQuestionsForStep(record, activeStep),
    [activeStep, record],
  );
  const branchHighlights = React.useMemo(() => buildBranchHighlights(record), [record]);
  const lenses = React.useMemo(() => buildGuidedProjectLenses(record), [record]);
  const totalDone = progress.reduce((sum, item) => sum + item.complete, 0);
  const totalFields = progress.reduce((sum, item) => sum + item.total, 0);
  const governance = React.useMemo(() => getRecommendationGovernanceRulebook(), []);

  React.useEffect(() => {
    if (!activeProject) return;
    setRecord((previous) => {
      const next = mergeProject(previous, activeProject);
      return JSON.stringify(previous) === JSON.stringify(next) ? previous : next;
    });
  }, [activeProject]);

  function updateField(field: keyof GuidedProjectRecord, value: string) {
    setRecord((previous) => ({ ...previous, [field]: value }));
  }

  function save() {
    const payload: GuidedProjectRecord = {
      ...record,
      recommendedFamilies: advice.families,
      recommendedNextTool: advice.nextToolPath,
    };

    rememberRecentTextEntry(RECENT_TEXT_HISTORY_KEYS.customer, payload.customer);
    writeRecord(payload);

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
        notes: buildGuidedProjectNotes(payload, advice),
        recommendedFamilies: payload.recommendedFamilies,
        recommendedNextTool: payload.recommendedNextTool,
      });

      updateProject(activeProject.id, {
        recommendationGovernance: buildRecommendationGovernanceSnapshot({
          primaryRecommendation: advice.primary,
          recommendedFamilies: advice.families,
          reasoning: advice.reasons,
          nextActions: advice.nextActions,
        }),
      });
    }

    setSavedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
  }

  function reset() {
    const fresh = createEmptyGuidedProjectRecord();
    setRecord(fresh);
    writeRecord(fresh);
    setSavedAt("");
    setActiveStep(0);
  }

  function next() {
    if (activeStep < GUIDED_PROJECT_STEPS.length - 1) {
      setActiveStep((value) => (value + 1) as GuidedProjectStep);
      return;
    }
    save();
    navigate(advice.nextToolPath);
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
                Keep the questions simple, but make the physical dynamics explicit. Wingman should
                understand source origin, transport boundaries, installed routes, and endpoint
                delivery before it recommends technology.
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
          <div className="wm-wizard-progress">
            {GUIDED_PROJECT_STEPS.map(([title], index) => (
              <React.Fragment key={title}>
                <button
                  type="button"
                  className={`wm-wizard-step ${index === activeStep ? "active" : ""}`}
                  onClick={() => setActiveStep(index as GuidedProjectStep)}
                >
                  <span className="wm-wizard-index">{index + 1}</span>
                  <span>{title}</span>
                  <span className="wm-wizard-meta">
                    ({progress[index].complete}/{progress[index].total})
                  </span>
                </button>
                {index < GUIDED_PROJECT_STEPS.length - 1 ? <div className="wm-wizard-divider" /> : null}
              </React.Fragment>
            ))}
          </div>

          <div className="wm-gp__layout">
            <div className="wm-dw6__content">
              <div className="wm-dw6__sectionTop">
                <div>
                  <h2 className="wm-ui__sectionTitle">
                    Step {activeStep + 1} - {GUIDED_PROJECT_STEPS[activeStep][0]}
                  </h2>
                  <p className="wm-ui__sectionText">{GUIDED_PROJECT_STEPS[activeStep][1]}</p>
                </div>
                <div className="wm-dw6__stepBadge">
                  {progress[activeStep].complete}/{progress[activeStep].total} complete
                </div>
              </div>

              <div className="wm-dw6__wizardShell">
                <div className="wm-gp__engineBanner">
                  <div className="wm-gp__engineTitle">Rule-driven questioning</div>
                  <div className="wm-gp__engineCopy">
                    Wingman opens follow-up questions only when room shape, transport distance,
                    rack hops, or decoder-led paths make them important.
                  </div>
                </div>

                <div className="wm-gp__questionGrid">
                  {activeQuestions.map((question) => (
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

                <div className="wm-dw6__nav">
                  <div className="wm-dw6__navLeft">
                    <span className="wm-ui__helper wm-dw6__save-meta">
                      {savedAt ? `Last saved at ${savedAt}` : `Progress ${totalDone}/${totalFields}`}
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
                      Save Guided Project
                    </button>
                    <button className="wm-ui__btn wm-ui__btn--primary" onClick={next}>
                      {activeStep < GUIDED_PROJECT_STEPS.length - 1
                        ? "Next"
                        : `Save and Open ${getNextToolLabel(advice.nextToolPath)}`}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <aside className="wm-gp__sidebar">
              <section className="wm-gp__summaryCard">
                <div className="wm-gp__summaryEyebrow">Active project</div>
                <div className="wm-gp__summaryTitle">
                  {activeProject?.name || record.roomName || "Current guided project"}
                </div>
                <div className="wm-gp__summaryCopy">
                  {activeProject
                    ? `${activeProject.customer || "Customer not set"} · ${activeProject.stage || "Discovery"}`
                    : "Save this input into an active project as you go."}
                </div>
              </section>

              <section className="wm-gp__summaryCard">
                <div className="wm-gp__summaryEyebrow">Wingman is hearing</div>
                <div className="wm-gp__summaryTitle">{advice.primary} is the current lead fit</div>
                <div className="wm-gp__confidence">Confidence: {advice.confidence}</div>
                <p className="wm-gp__summaryCopy">{advice.summary}</p>
                <div className="wm-ui__chips">
                  {advice.families.map((family) => (
                    <span key={family} className="wm-ui__chip wm-ui__chip--active">
                      {family}
                    </span>
                  ))}
                </div>
                <ul className="wm-gp__list">
                  {advice.reasons.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>

              <section className="wm-gp__summaryCard">
                <div className="wm-gp__summaryEyebrow">Rule engine activations</div>
                <ul className="wm-gp__list">
                  {branchHighlights.length > 0 ? (
                    branchHighlights.map((item) => <li key={item}>{item}</li>)
                  ) : (
                    <li>Wingman is waiting for more physical cues before opening deeper follow-up questions.</li>
                  )}
                </ul>
              </section>

              <section className="wm-gp__summaryCard">
                <div className="wm-gp__summaryEyebrow">Physical dynamics</div>
                <ul className="wm-gp__list">
                  {advice.cues.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>

              <section className="wm-gp__summaryCard">
                <div className="wm-gp__summaryEyebrow">Next actions</div>
                <ul className="wm-gp__list">
                  {advice.nextActions.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>

              <section className="wm-gp__summaryCard">
                <div className="wm-gp__summaryEyebrow">Governance</div>
                <div className="wm-gp__summaryTitle">Rule set {governance.recommendationRules.version}</div>
                <div className="wm-gp__summaryCopy">
                  Catalog baseline: {governance.recommendationRules.catalogVersion}
                </div>
                <ul className="wm-gp__list">
                  {governance.recommendationRules.explainability.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
            </aside>
          </div>
        </section>

        <section className="wm-section">
          <div className="wm-section__head">
            <div className="wm-section__titles">
              <h2>Live reasoning engine</h2>
              <p>The decision cards are now driven by the current answers rather than static guidance.</p>
            </div>
          </div>

          <div className="wm-gp__decisionTree">
            {lenses.map((lens) => (
              <article key={lens.id} className="wm-gp__decisionCard">
                <div className="wm-gp__decisionTop">
                  <div className="wm-gp__summaryEyebrow">{lens.title}</div>
                  <span className={`wm-gp__state wm-gp__state--${lens.state}`}>
                    {stateLabel(lens.state)}
                  </span>
                </div>
                <div className="wm-gp__summaryCopy">{lens.summary}</div>
                <ul className="wm-gp__list">
                  {lens.prompts.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
