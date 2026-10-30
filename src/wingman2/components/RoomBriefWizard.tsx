import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Check, RotateCcw } from "lucide-react";
import { routeCatalogByKey } from "../app/routeCatalog";
import { writeDiscoveryHandoff } from "../lib/discoveryTemplateHandoff";
import { TEMPLATE_MARKETS, type TemplateMarket } from "../lib/templateMarkets";
import {
  ROOM_BRIEF_OCCUPANCIES,
  ROOM_BRIEF_PURPOSES,
  nextRoomBriefQuestion,
  questionsAsked,
  resolveRoomBrief,
  roomBriefDiscoveryAnswers,
  type RoomBriefAnswers,
} from "../lib/roomBrief";

/**
 * The room, decided before a design is chosen.
 *
 * Three steps and no catalogue: what the room is, the questions that actually
 * separate one room type from another, and the decision. The library is one
 * link away for the rep who already knows what they want.
 *
 * The questions come from `roomBrief.ts` in the order that splits the remaining
 * rooms, so this surface holds no logic of its own beyond which step is on
 * screen — a page that chose its own questions would be a second implementation
 * of the method, and the two would drift.
 */
export function RoomBriefWizard() {
  const navigate = useNavigate();
  const [answers, setAnswers] = useState<RoomBriefAnswers>({});
  const [started, setStarted] = useState(false);
  /** A rep who has heard enough can stop the ladder; the decision says what is unresolved. */
  const [forced, setForced] = useState(false);

  const setupComplete = Boolean(answers.purpose && answers.occupancy);
  const question = started && setupComplete ? nextRoomBriefQuestion(answers) : null;
  const decided = started && setupComplete && (question === null || forced);
  const decision = decided ? resolveRoomBrief(answers, (answers.market as TemplateMarket) || "") : null;

  const answer = (id: string, value: string) =>
    setAnswers((current) => ({ ...current, [id]: value }));

  // The library answers "which design", so it opens on the market the rep named:
  // the decision has already read the vertical context, and a rep who then
  // browses should not have to say it twice.
  const libraryPath = answers.market
    ? `${routeCatalogByKey.templates.path}?market=${encodeURIComponent(answers.market)}`
    : routeCatalogByKey.templates.path;

  const restart = () => {
    setAnswers({});
    setStarted(false);
    setForced(false);
  };

  const openBrief = () => {
    if (!decision) return;
    // The decision is a starting point, not a substitute for the brief: the
    // capture steps still ask what only the customer knows, and they now start
    // from the room rather than from a blank form.
    writeDiscoveryHandoff({
      mode: "standard",
      answers: roomBriefDiscoveryAnswers(decision),
      notes: { "room-brief": `${decision.roomType}: ${decision.summary}` },
    });
    navigate(`${routeCatalogByKey.discovery.path}?interview=1`);
  };

  const stage = !started ? 0 : decided ? 2 : 1;

  return (
    <section className="wm-section-card" aria-labelledby="room-brief-title" data-testid="room-brief">
      <nav className="wm-template-stages" aria-label="Room brief stages">
        {["The room", "What it is for", "The decision"].map((label, index) => (
          <span key={label} className={index === stage ? "is-active" : index < stage ? "is-complete" : ""}>
            <i>{index < stage ? <Check /> : index + 1}</i>
            {label}
          </span>
        ))}
      </nav>

      {!started || !setupComplete ? (
        <div data-testid="room-brief-setup">
          <p className="wm-ui-kicker">Start with the room, not the catalogue</p>
          <h1 id="room-brief-title" className="wm-page-title">What has the customer asked for?</h1>
          <p className="wm-ui-copy">
            Three facts the customer can answer without knowing anything about AV. Everything after
            this is asked because it separates one kind of room from another.
          </p>

          <label className="wm-ui-copy">
            Market
            <select
              aria-label="Market"
              value={answers.market ?? ""}
              onChange={(event) => answer("market", event.target.value)}
            >
              <option value="">Not sure yet</option>
              {TEMPLATE_MARKETS.map((market) => <option key={market} value={market}>{market}</option>)}
            </select>
          </label>

          <fieldset className="wm-ui-card">
            <legend className="wm-section-title">What does the room have to do?</legend>
            {ROOM_BRIEF_PURPOSES.map((purpose) => (
              <label key={purpose.value} className="wm-ui-copy">
                <input
                  type="radio"
                  name="room-brief-purpose"
                  value={purpose.value}
                  checked={answers.purpose === purpose.value}
                  onChange={() => answer("purpose", purpose.value)}
                />
                {purpose.label}
              </label>
            ))}
          </fieldset>

          <fieldset className="wm-ui-card">
            <legend className="wm-section-title">How many people are in it?</legend>
            {ROOM_BRIEF_OCCUPANCIES.map((band) => (
              <label key={band.value} className="wm-ui-copy">
                <input
                  type="radio"
                  name="room-brief-occupancy"
                  value={band.value}
                  checked={answers.occupancy === band.value}
                  onChange={() => answer("occupancy", band.value)}
                />
                {band.label}
              </label>
            ))}
          </fieldset>

          <div className="wm-solution-header-actions">
            <button
              className="wm-button wm-button-primary"
              type="button"
              disabled={!setupComplete}
              onClick={() => setStarted(true)}
            >
              Work out the room <ArrowRight size={16} aria-hidden="true" />
            </button>
            <button
              className="wm-button wm-button-secondary"
              type="button"
              onClick={() => navigate(libraryPath)}
            >
              Browse the design library instead
            </button>
          </div>
        </div>
      ) : null}

      {started && setupComplete && !forced && question ? (
        <div data-testid="room-brief-question">
          <p className="wm-ui-kicker">
            Question {questionsAsked(answers) + 1} · {question.question}
          </p>
          <h1 id="room-brief-title" className="wm-page-title">{question.question}</h1>
          {/* The reason travels with the question, because a rep who cannot say
              why a question was asked answers it for the room they expected. */}
          <p className="wm-ui-copy">{question.why}</p>
          <div className="wm-form-grid">
            {question.options.map((option) => (
              <button
                key={option.value}
                className="wm-button wm-button-secondary"
                type="button"
                onClick={() => answer(question.id, option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="wm-solution-header-actions">
            <button className="wm-button wm-button-secondary" type="button" onClick={restart}>
              <RotateCcw size={16} aria-hidden="true" /> Start again
            </button>
            <button className="wm-button wm-button-secondary" type="button" onClick={() => setForced(true)}>
              Decide with what I have
            </button>
          </div>
        </div>
      ) : null}

      {decision ? (
        <div data-testid="room-brief-decision">
          <p className="wm-ui-kicker">
            Decided in {decision.questionsAsked} question{decision.questionsAsked === 1 ? "" : "s"}
            {decision.market ? ` · ${decision.market}` : ""}
          </p>
          <h1 id="room-brief-title" className="wm-page-title">{decision.roomType}</h1>
          <p className="wm-ui-copy">{decision.summary}</p>

          <div className="wm-section-card">
            <h3 className="wm-section-title">What this room needs</h3>
            <ul>
              {decision.requirements.map((requirement) => (
                <li key={requirement.key}>
                  <strong>{requirement.label}</strong> — {requirement.quantity}
                  <p className="wm-ui-copy">{requirement.because}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="wm-template-preview-split">
            <section>
              <h3>Check on site</h3>
              <ul>{decision.verifyOnSite.map((item) => <li key={item}>{item}</li>)}</ul>
            </section>
            <section>
              <h3>Assumed</h3>
              <ul>{decision.assumptions.map((item) => <li key={item}>{item}</li>)}</ul>
            </section>
          </div>

          <div className="wm-section-card">
            <h3 className="wm-section-title">This changes if</h3>
            <ul>{decision.changesIf.map((item) => <li key={item}>{item}</li>)}</ul>
            {decision.unresolved.length ? (
              <p className="wm-ui-copy">
                The answers still fit {decision.unresolved.length} other room type
                {decision.unresolved.length === 1 ? "" : "s"}. Ask what would tell them apart before
                this is priced.
              </p>
            ) : null}
          </div>

          <div className="wm-solution-header-actions">
            <button className="wm-button wm-button-primary" type="button" onClick={openBrief}>
              Take this into the discovery brief <ArrowRight size={16} aria-hidden="true" />
            </button>
            <button
              className="wm-button wm-button-secondary"
              type="button"
              onClick={() => navigate(libraryPath)}
            >
              Browse designs for this room
            </button>
            <button className="wm-button wm-button-secondary" type="button" onClick={restart}>
              <RotateCcw size={16} aria-hidden="true" /> Start again
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
