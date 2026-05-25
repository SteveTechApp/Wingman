import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  answerLabel,
  conversationModes,
  deriveArchitecture,
  findQuestion,
  getAnsweredQuestionIds,
  getNextQuestion,
  getTotalQuestionCount,
  startingPoints,
  type AnswerMap,
  type ConversationModeId,
  type StartingPointId,
} from "../components/guided/guidedWorkflowModel";

function labelForAnswer(questionId: string, value: string) {
  return answerLabel(questionId, value);
}

export function GuidedWorkflowPage() {
  const [mode, setMode] = useState<ConversationModeId | null>(null);
  const [startingPoint, setStartingPoint] = useState<StartingPointId | null>(null);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [draft, setDraft] = useState("");

  const activeQuestion = useMemo(() => getNextQuestion(startingPoint, answers), [startingPoint, answers]);
  const guidance = useMemo(() => deriveArchitecture(startingPoint, answers), [startingPoint, answers]);
  const answeredIds = useMemo(() => getAnsweredQuestionIds(startingPoint, answers), [startingPoint, answers]);
  const totalQuestions = getTotalQuestionCount(startingPoint);
  const complete = Boolean(startingPoint && totalQuestions > 0 && answeredIds.length >= totalQuestions);
  const selectedMode = conversationModes.find((item) => item.id === mode);
  const selectedStart = startingPoints.find((item) => item.id === startingPoint);

  function reset() {
    setMode(null);
    setStartingPoint(null);
    setAnswers({});
    setDraft("");
  }

  function chooseMode(nextMode: ConversationModeId) {
    setMode(nextMode);
    setDraft("");
  }

  function chooseStartingPoint(nextPoint: StartingPointId) {
    setStartingPoint(nextPoint);
    setAnswers({});
    setDraft("");
  }

  function saveAnswer() {
    if (!activeQuestion || !draft.trim()) return;

    setAnswers((current) => ({
      ...current,
      [activeQuestion.id]: draft.trim(),
    }));
    setDraft("");
  }

  function skipAnswer() {
    if (!activeQuestion) return;

    setAnswers((current) => ({
      ...current,
      [activeQuestion.id]: "Not confirmed",
    }));
    setDraft("");
  }

  function removeAnswer(id: string) {
    setAnswers((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    setDraft("");
  }

  return (
    <main className="wm-calm-page wm-calm-stack">
      <section className="wm-calm-hero">
        <div>
          <p className="wm-calm-kicker">Guided Discovery</p>
          <h1>One useful question at a time.</h1>
          <p>
            Choose the conversation type, then Wingman will ask only the next question needed to identify the likely AV route.
          </p>
        </div>

        <div className="wm-calm-actions">
          <button className="wm-calm-button" type="button" onClick={reset}>
            Clear
          </button>
          <Link className="wm-calm-link-button" to="/wingman/discovery">
            Full Discovery
          </Link>
        </div>
      </section>

      {!mode && (
        <section className="wm-calm-task-card wm-calm-question">
          <p className="wm-calm-kicker">First choice</p>
          <h2>Who are you speaking to?</h2>
          <p className="wm-calm-muted">This changes the wording, not the design logic.</p>

          <div className="wm-calm-choice-grid">
            {conversationModes.map((item) => (
              <button key={item.id} className="wm-calm-choice-card" type="button" onClick={() => chooseMode(item.id)}>
                <strong>{item.title}</strong>
                <span>{item.description}</span>
                <small>{item.example}</small>
              </button>
            ))}
          </div>
        </section>
      )}

      {mode && !startingPoint && (
        <section className="wm-calm-task-card wm-calm-question">
          <p className="wm-calm-kicker">Current task</p>
          <h2>What are you trying to work out?</h2>
          <p className="wm-calm-muted">Start from the customer problem. Do not start from a product family yet.</p>

          <div className="wm-calm-choice-grid">
            {startingPoints.map((item) => (
              <button
                key={item.id}
                className="wm-calm-choice-card"
                type="button"
                onClick={() => chooseStartingPoint(item.id)}
              >
                <strong>{item.title}</strong>
                <span>{item.description}</span>
                <small>Likely route: {item.likelyRoute}</small>
              </button>
            ))}
          </div>
        </section>
      )}

      {mode && startingPoint && activeQuestion && !complete && (
        <section className="wm-calm-task-card wm-calm-question">
          <p className="wm-calm-kicker">Ask this next</p>
          <h2>{activeQuestion.title}</h2>
          <blockquote>{activeQuestion.prompt[mode]}</blockquote>

          {activeQuestion.options ? (
            <div className="wm-calm-choice-grid">
              {activeQuestion.options.map((option) => (
                <button
                  key={option.value}
                  className={draft === option.value ? "wm-calm-choice-card is-selected" : "wm-calm-choice-card"}
                  type="button"
                  onClick={() => setDraft(option.value)}
                >
                  <strong>{option.label}</strong>
                  {option.hint ? <span>{option.hint}</span> : null}
                </button>
              ))}
            </div>
          ) : (
            <textarea
              className="wm-calm-textarea"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={activeQuestion.placeholder ?? "Type the answer or paste customer information here."}
            />
          )}

          <div className="wm-calm-actions">
            <button className="wm-calm-button" type="button" onClick={skipAnswer}>
              Not confirmed
            </button>
            <button className="wm-calm-button primary" type="button" disabled={!draft.trim()} onClick={saveAnswer}>
              Save and continue
            </button>
          </div>
        </section>
      )}

      {complete && (
        <section className="wm-calm-result-card">
          <p className="wm-calm-kicker">Architecture checkpoint</p>
          <h2>{guidance.route}</h2>
          <p>{guidance.confidence} confidence based on the answers captured so far.</p>

          <div className="wm-calm-pill-row" style={{ marginTop: "1rem" }}>
            {guidance.likelyTechnology.map((item) => (
              <span key={item} className="wm-calm-pill">{item}</span>
            ))}
          </div>

          <div className="wm-calm-actions" style={{ marginTop: "1rem" }}>
            <Link className="wm-calm-link-button" to="/wingman/finder">
              Continue to Product Finder
            </Link>
            <Link className="wm-calm-link-button primary" to="/wingman/proposal">
              Start Proposal
            </Link>
          </div>
        </section>
      )}

      {mode || startingPoint || answeredIds.length ? (
        <details className="wm-calm-drawer">
          <summary>Show captured answers</summary>
          <div className="wm-calm-drawer-body">
            <ul className="wm-calm-captured-list">
              {selectedMode ? <li>Conversation: {selectedMode.title}</li> : null}
              {selectedStart ? <li>Task: {selectedStart.title}</li> : null}
              {answeredIds.map((id) => {
                const question = findQuestion(id);
                if (!question) return null;

                return (
                  <li key={id}>
                    <button className="wm-calm-button" type="button" onClick={() => removeAnswer(id)}>
                      Change
                    </button>{" "}
                    {question.title}: {labelForAnswer(id, answers[id])}
                  </li>
                );
              })}
            </ul>
          </div>
        </details>
      ) : null}

      {activeQuestion ? (
        <details className="wm-calm-drawer">
          <summary>Why am I asking this?</summary>
          <div className="wm-calm-drawer-body">
            <p>{activeQuestion.why}</p>
          </div>
        </details>
      ) : null}
    </main>
  );
}