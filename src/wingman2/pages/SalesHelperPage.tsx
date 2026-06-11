import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

type SalesHelperStep = "type" | "question" | "capture" | "next";

type ConversationKey =
  | "room"
  | "display"
  | "signal"
  | "usb"
  | "competitor"
  | "channel"
  | "proposal";

type CaptureAnswers = Record<string, string>;

type SalesHelperSession = {
  conversationKey: ConversationKey | "";
  quickAnswer: string;
  note: string;
  answers: CaptureAnswers;
};

type ConversationOption = {
  key: ConversationKey;
  eyebrow: string;
  title: string;
  summary: string;
  bestQuestion: string;
  whyItMatters: string;
  quickAnswers: string[];
  fields: Array<{
    key: string;
    label: string;
    placeholder: string;
  }>;
  recommendedAction: {
    label: string;
    route: string;
    reason: string;
  };
};

const STORAGE_KEY = "wingman.salesHelper.workflow.v1";

const stepOrder: SalesHelperStep[] = ["type", "question", "capture", "next"];

const conversationOptions: ConversationOption[] = [
  {
    key: "room",
    eyebrow: "Meeting rooms, classrooms, training rooms or general AV enquiry",
    title: "Room requirement",
    summary: "Use when the customer needs AV for a room but the system shape is not clear yet.",
    bestQuestion: "What is the customer trying to make happen in the room, and who will use it day to day?",
    whyItMatters:
      "The application defines the likely architecture before any product is discussed. A boardroom, classroom and training room may all need displays, but the USB, audio, control and source behaviour can be very different.",
    quickAnswers: ["Meeting room", "Classroom", "Training room", "Boardroom", "Not sure yet"],
    fields: [
      { key: "roomType", label: "Room type", placeholder: "Example: boardroom, classroom, training room" },
      { key: "sources", label: "Sources", placeholder: "Example: 2x HDMI laptops, 1x room PC, 1x USB-C" },
      { key: "displays", label: "Displays", placeholder: "Example: 1x main display, 1x confidence monitor" },
      { key: "usb", label: "USB / conferencing", placeholder: "Example: camera, soundbar, Teams, Zoom, BYOD" },
      { key: "distance", label: "Approximate cable distance", placeholder: "Example: table to display 12 m, rack to screen 35 m" }
    ],
    recommendedAction: {
      label: "Open Discovery",
      route: "/wingman/discovery",
      reason: "Use Discovery to structure the room, signal flow, USB, audio, control and missing information."
    }
  },
  {
    key: "display",
    eyebrow: "Display, signage, LED, LFD or refresh opportunity",
    title: "Display / signage attach",
    summary: "Use when the opportunity starts from screens, signage, LED or a video wall.",
    bestQuestion: "What content needs to appear on each screen, and does each display show the same content or different content?",
    whyItMatters:
      "Display opportunities often look simple but quickly become matrix, AV-over-IP, signage, multiview or video-wall opportunities depending on content behaviour.",
    quickAnswers: ["Same content everywhere", "Different content per display", "Video wall", "Signage playlist", "Not sure yet"],
    fields: [
      { key: "displayCount", label: "Number of displays", placeholder: "Example: 6 screens across a bar" },
      { key: "contentBehaviour", label: "Content behaviour", placeholder: "Example: same source, independent sources, wall canvas" },
      { key: "sourceLocation", label: "Source location", placeholder: "Example: local behind screen, comms room, rack" },
      { key: "wallNeed", label: "Video wall / signage need", placeholder: "Example: 2x2 LCD wall, LED processor feed, menu boards" },
      { key: "control", label: "Control expectation", placeholder: "Example: staff tablet, control system, scheduled signage" }
    ],
    recommendedAction: {
      label: "Open Discovery",
      route: "/wingman/discovery",
      reason: "Use Discovery to decide whether this should be matrix, AV-over-IP, signage, or a dedicated wall processor."
    }
  },
  {
    key: "signal",
    eyebrow: "HDMI extender, switcher, splitter, matrix or signal product enquiry",
    title: "HDMI / extender / matrix enquiry",
    summary: "Use when the customer asks for a signal product but has not given enough design information.",
    bestQuestion: "How many sources need to go to how many displays, and what is the longest cable path?",
    whyItMatters:
      "The answer separates simple extension from local switching, fixed matrix routing or AV-over-IP. It also prevents quoting an HDMI-only product where USB, control or audio is actually needed.",
    quickAnswers: ["1 source to 1 display", "Many sources to 1 display", "Many sources to many displays", "Long HDMI run", "Unknown"],
    fields: [
      { key: "sourceCount", label: "Source count", placeholder: "Example: 4 HDMI sources" },
      { key: "displayCount", label: "Display count", placeholder: "Example: 8 displays" },
      { key: "distance", label: "Longest distance", placeholder: "Example: 45 m, 90 m, same rack" },
      { key: "resolution", label: "Resolution / refresh", placeholder: "Example: 4K60, 1080p, mixed resolutions" },
      { key: "extras", label: "Extra paths", placeholder: "Example: IR, RS-232, audio de-embed, Ethernet, USB" }
    ],
    recommendedAction: {
      label: "Open Finder",
      route: "/wingman/finder",
      reason: "Use Finder once the source, display, distance and transport requirements are clear enough."
    }
  },
  {
    key: "usb",
    eyebrow: "UC, BYOD, BYOM, camera, microphone or USB device enquiry",
    title: "BYOD / conferencing / USB",
    summary: "Use when Teams, Zoom, cameras, microphones, PTZ, touch or USB transport is involved.",
    bestQuestion: "Where is the meeting host device, and which USB devices must it connect to?",
    whyItMatters:
      "USB ownership is often the design driver in conferencing rooms. The correct product direction depends on whether the host is a laptop, room PC, UC appliance or shared BYOD workflow.",
    quickAnswers: ["Laptop host", "Room PC", "Teams/Zoom appliance", "BYOD/BYOM", "Not sure yet"],
    fields: [
      { key: "platform", label: "Platform / workflow", placeholder: "Example: Teams, Zoom, BYOD laptop, MTR" },
      { key: "hostLocation", label: "Host location", placeholder: "Example: table, lectern, rack, display wall" },
      { key: "camera", label: "Camera", placeholder: "Example: USB camera, PTZ, NDI camera" },
      { key: "audio", label: "Audio / microphone", placeholder: "Example: USB speakerphone, ceiling mics, DSP" },
      { key: "usbDistance", label: "USB distance", placeholder: "Example: 5 m, 15 m, room PC in rack" }
    ],
    recommendedAction: {
      label: "Open Discovery",
      route: "/wingman/discovery",
      reason: "Use Discovery to capture USB ownership, conferencing devices, audio and transport requirements."
    }
  },
  {
    key: "competitor",
    eyebrow: "Competitor replacement, tender equivalence or channel product match",
    title: "Competitor SKU",
    summary: "Use when the customer asks for a match to Extron, Kramer, AVPro Edge, Blustream, HDA, J+P or another brand.",
    bestQuestion: "What is the competitor SKU, and which features must match for the customer to accept the alternative?",
    whyItMatters:
      "Competitor comparison must confirm product class, I/O, transport, USB, audio, control, power and special features. It should not be treated as a simple SKU swap.",
    quickAnswers: ["Need direct equivalent", "Partial match acceptable", "Tender comparison", "Feature gap check", "Unknown"],
    fields: [
      { key: "brand", label: "Competitor brand", placeholder: "Example: Extron, Kramer, Blustream, AVPro Edge" },
      { key: "sku", label: "Competitor SKU", placeholder: "Example: model number from tender or customer email" },
      { key: "application", label: "Application", placeholder: "Example: boardroom matrix, extender set, AVoIP endpoint" },
      { key: "mustMatch", label: "Must-match features", placeholder: "Example: USB, Dante, RS-232, PoE, scaling, HDCP version" },
      { key: "commercialContext", label: "Commercial context", placeholder: "Example: tender, dealer request, stock substitution, value option" }
    ],
    recommendedAction: {
      label: "Open Compare",
      route: "/wingman/compare",
      reason: "Use Compare to produce a clear no-match, partial-match or good-match view with evidence."
    }
  },
  {
    key: "channel",
    eyebrow: "Account development, attach opportunity or sales enablement conversation",
    title: "Channel and customer growth conversation",
    summary: "Use for account development, distributor enablement and opportunity-shaping conversations.",
    bestQuestion: "What does this customer already sell or install, and where could WyreStorm naturally attach?",
    whyItMatters:
      "Channel conversations often start from displays, UC, networking, frameworks or stock habits. The aim is to find practical attachment points without forcing product-led selling.",
    quickAnswers: ["Display attach", "UC attach", "Hospitality", "Education", "Stock profile"],
    fields: [
      { key: "accountType", label: "Account type", placeholder: "Example: distributor, dealer, SI, consultant, end user" },
      { key: "currentFocus", label: "Current sales focus", placeholder: "Example: displays, Teams rooms, hospitality, HE, networking" },
      { key: "confidenceGap", label: "Confidence gap", placeholder: "Example: AVoIP, USB, matrix, audio, control" },
      { key: "attachOpportunity", label: "Attach opportunity", placeholder: "Example: display refresh, UC rollout, sports bar screens" },
      { key: "nextMeeting", label: "Next meeting / action", placeholder: "Example: training call, product shortlist, joint customer visit" }
    ],
    recommendedAction: {
      label: "Open Projects",
      route: "/wingman/projects",
      reason: "Save the conversation as an opportunity so the next action and account context are not lost."
    }
  },
  {
    key: "proposal",
    eyebrow: "After discovery, after a product shortlist, after a proposal draft or before escalation",
    title: "Proposal / closing follow-up",
    summary: "Use when the call needs to end with clear actions, assumptions and next steps.",
    bestQuestion: "What decision or next action does the customer need from us now?",
    whyItMatters:
      "Closing follow-up should separate confirmed requirements, assumptions, missing information and review risks so Wingman does not make weak requirements look quote-ready.",
    quickAnswers: ["Need proposal wording", "Need missing info list", "Need internal summary", "Need pre-sales escalation", "Need close plan"],
    fields: [
      { key: "chosenDirection", label: "Chosen direction", placeholder: "Example: NetworkHD 100, HDBaseT matrix, presentation switcher" },
      { key: "confirmed", label: "Confirmed requirements", placeholder: "Example: 4 sources, 6 displays, 4K, staff control" },
      { key: "missing", label: "Missing information", placeholder: "Example: cable distance, USB needs, display model, network ownership" },
      { key: "risks", label: "Risks / blockers", placeholder: "Example: no network confirmation, uncertain USB path, mixed resolutions" },
      { key: "requiredOutput", label: "Required output", placeholder: "Example: customer email, proposal wording, internal handover" }
    ],
    recommendedAction: {
      label: "Open Proposal",
      route: "/wingman/proposal",
      reason: "Use Proposal to turn the captured facts into customer-safe wording with assumptions and risks."
    }
  }
];

const defaultSession: SalesHelperSession = {
  conversationKey: "",
  quickAnswer: "",
  note: "",
  answers: {}
};

function isSalesHelperStep(value: string | null): value is SalesHelperStep {
  return value === "type" || value === "question" || value === "capture" || value === "next";
}

function loadSession(): SalesHelperSession {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaultSession;
    }

    const parsed = JSON.parse(raw) as Partial<SalesHelperSession>;

    return {
      conversationKey: parsed.conversationKey ?? "",
      quickAnswer: parsed.quickAnswer ?? "",
      note: parsed.note ?? "",
      answers: parsed.answers ?? {}
    };
  } catch {
    return defaultSession;
  }
}

function saveSession(session: SalesHelperSession): void {
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

function getStepLabel(step: SalesHelperStep): string {
  const labels: Record<SalesHelperStep, string> = {
    type: "Conversation type",
    question: "Ask this next",
    capture: "Capture detail",
    next: "Next action"
  };

  return labels[step];
}

function getStepIndex(step: SalesHelperStep): number {
  return stepOrder.indexOf(step) + 1;
}

export function SalesHelperPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeStep = useMemo<SalesHelperStep>(() => {
    const requested = searchParams.get("step");
    if (isSalesHelperStep(requested)) {
      return requested;
    }

    return "type";
  }, [searchParams]);

  const [session, setSession] = useState<SalesHelperSession>(() => loadSession());

  const selectedConversation = useMemo(() => {
    return conversationOptions.find((item) => item.key === session.conversationKey) ?? null;
  }, [session.conversationKey]);

  useEffect(() => {
    if (activeStep !== "type" && !selectedConversation) {
      setSearchParams({ step: "type" }, { replace: true });
    }
  }, [activeStep, selectedConversation, setSearchParams]);

  function updateSession(nextSession: SalesHelperSession): void {
    setSession(nextSession);
    saveSession(nextSession);
  }

  function goToStep(step: SalesHelperStep): void {
    setSearchParams({ step });
  }

  function selectConversation(key: ConversationKey): void {
    const nextSession: SalesHelperSession = {
      conversationKey: key,
      quickAnswer: "",
      note: "",
      answers: {}
    };

    updateSession(nextSession);
    goToStep("question");
  }

  function setQuickAnswer(answer: string): void {
    updateSession({
      ...session,
      quickAnswer: answer
    });
  }

  function setNote(note: string): void {
    updateSession({
      ...session,
      note
    });
  }

  function setAnswer(key: string, value: string): void {
    updateSession({
      ...session,
      answers: {
        ...session.answers,
        [key]: value
      }
    });
  }

  function resetWorkflow(): void {
    updateSession(defaultSession);
    goToStep("type");
  }

  function openRecommendedRoute(route: string): void {
    navigate(route);
  }

  function renderStepper() {
    return (
      <div className="wm-sh-stepper" aria-label="Sales Helper workflow progress">
        {stepOrder.map((step) => {
          const isActive = step === activeStep;
          const isComplete = getStepIndex(step) < getStepIndex(activeStep);

          return (
            <button
              className={isActive ? "wm-sh-step is-active" : isComplete ? "wm-sh-step is-complete" : "wm-sh-step"}
              key={step}
              onClick={() => {
                if (step === "type") {
                  goToStep(step);
                  return;
                }

                if (selectedConversation) {
                  goToStep(step);
                }
              }}
              type="button"
            >
              <span>{getStepIndex(step)}</span>
              {getStepLabel(step)}
            </button>
          );
        })}
      </div>
    );
  }

  function renderTypePage() {
    return (
      <section className="wm-sh-panel">
        <div className="wm-sh-panel-head">
          <div>
            <p className="wm-sh-kicker">Step 1 / 4</p>
            <h2>Choose the conversation type</h2>
          </div>
          <p>Pick the closest starting point. Wingman will narrow the next question and capture fields.</p>
        </div>

        <div className="wm-sh-type-grid">
          {conversationOptions.map((option) => (
            <button
              className="wm-sh-type-card"
              key={option.key}
              onClick={() => selectConversation(option.key)}
              type="button"
            >
              <span className="wm-sh-card-eyebrow">{option.eyebrow}</span>
              <strong>{option.title}</strong>
              <span>{option.summary}</span>
            </button>
          ))}
        </div>
      </section>
    );
  }

  function renderQuestionPage() {
    if (!selectedConversation) {
      return null;
    }

    return (
      <section className="wm-sh-panel wm-sh-two-column">
        <div className="wm-sh-main-card">
          <p className="wm-sh-kicker">Step 2 / 4</p>
          <h2>Ask this next</h2>
          <p className="wm-sh-selected">Selected: {selectedConversation.title}</p>

          <div className="wm-sh-question-card">
            <span>Recommended question</span>
            <strong>{selectedConversation.bestQuestion}</strong>
          </div>

          <div className="wm-sh-explain-card">
            <span>Why it matters</span>
            <p>{selectedConversation.whyItMatters}</p>
          </div>
        </div>

        <aside className="wm-sh-side-card">
          <h3>Capture the answer quickly</h3>
          <div className="wm-sh-chip-list">
            {selectedConversation.quickAnswers.map((answer) => (
              <button
                className={session.quickAnswer === answer ? "wm-sh-chip is-selected" : "wm-sh-chip"}
                key={answer}
                onClick={() => setQuickAnswer(answer)}
                type="button"
              >
                {answer}
              </button>
            ))}
          </div>

          <label className="wm-sh-field">
            <span>Call note</span>
            <textarea
              onChange={(event) => setNote(event.target.value)}
              placeholder="Type the customer's wording or any useful context here."
              rows={5}
              value={session.note}
            />
          </label>

          <div className="wm-sh-actions">
            <button className="wm-sh-secondary" onClick={() => goToStep("type")} type="button">
              Back
            </button>
            <button className="wm-sh-primary" onClick={() => goToStep("capture")} type="button">
              Continue
            </button>
          </div>
        </aside>
      </section>
    );
  }

  function renderCapturePage() {
    if (!selectedConversation) {
      return null;
    }

    return (
      <section className="wm-sh-panel">
        <div className="wm-sh-panel-head">
          <div>
            <p className="wm-sh-kicker">Step 3 / 4</p>
            <h2>Capture only the useful detail</h2>
          </div>
          <p>{selectedConversation.title}: capture enough to guide the next Wingman tool.</p>
        </div>

        <div className="wm-sh-form-grid">
          {selectedConversation.fields.map((field) => (
            <label className="wm-sh-field" key={field.key}>
              <span>{field.label}</span>
              <input
                onChange={(event) => setAnswer(field.key, event.target.value)}
                placeholder={field.placeholder}
                type="text"
                value={session.answers[field.key] ?? ""}
              />
            </label>
          ))}
        </div>

        <div className="wm-sh-actions">
          <button className="wm-sh-secondary" onClick={() => goToStep("question")} type="button">
            Back
          </button>
          <button className="wm-sh-primary" onClick={() => goToStep("next")} type="button">
            Review next action
          </button>
        </div>
      </section>
    );
  }

  function renderNextActionPage() {
    if (!selectedConversation) {
      return null;
    }

    const answeredFields = selectedConversation.fields.filter((field) => {
      const value = session.answers[field.key];
      return Boolean(value && value.trim().length > 0);
    });

    const missingFields = selectedConversation.fields.filter((field) => {
      const value = session.answers[field.key];
      return !value || value.trim().length < 1;
    });

    return (
      <section className="wm-sh-panel wm-sh-two-column">
        <div className="wm-sh-main-card">
          <p className="wm-sh-kicker">Step 4 / 4</p>
          <h2>Recommended next action</h2>

          <div className="wm-sh-next-action">
            <span>Suggested Wingman tool</span>
            <strong>{selectedConversation.recommendedAction.label}</strong>
            <p>{selectedConversation.recommendedAction.reason}</p>
            <button
              className="wm-sh-primary"
              onClick={() => openRecommendedRoute(selectedConversation.recommendedAction.route)}
              type="button"
            >
              {selectedConversation.recommendedAction.label}
            </button>
          </div>

          <div className="wm-sh-actions wm-sh-action-wrap">
            <button className="wm-sh-secondary" onClick={() => navigate("/wingman/discovery")} type="button">
              Open Discovery
            </button>
            <button className="wm-sh-secondary" onClick={() => navigate("/wingman/finder")} type="button">
              Open Finder
            </button>
            <button className="wm-sh-secondary" onClick={() => navigate("/wingman/compare")} type="button">
              Open Compare
            </button>
            <button className="wm-sh-secondary" onClick={() => navigate("/wingman/product-pitch")} type="button">
              Open Product Pitch
            </button>
            <button className="wm-sh-secondary" onClick={() => navigate("/wingman/proposal")} type="button">
              Open Proposal
            </button>
            <button className="wm-sh-secondary" onClick={() => navigate("/wingman/projects")} type="button">
              Save to Project
            </button>
          </div>
        </div>

        <aside className="wm-sh-side-card">
          <h3>Captured summary</h3>
          <dl className="wm-sh-summary-list">
            <div>
              <dt>Conversation</dt>
              <dd>{selectedConversation.title}</dd>
            </div>
            <div>
              <dt>Quick answer</dt>
              <dd>{session.quickAnswer || "Not captured"}</dd>
            </div>
            <div>
              <dt>Call note</dt>
              <dd>{session.note || "No note captured"}</dd>
            </div>
          </dl>

          <h3>Captured detail</h3>
          <div className="wm-sh-mini-list">
            {answeredFields.length > 0 ? (
              answeredFields.map((field) => (
                <p key={field.key}>
                  <strong>{field.label}:</strong> {session.answers[field.key]}
                </p>
              ))
            ) : (
              <p>No detailed fields captured yet.</p>
            )}
          </div>

          <h3>Missing information</h3>
          <div className="wm-sh-missing-list">
            {missingFields.length > 0 ? (
              missingFields.map((field) => <span key={field.key}>{field.label}</span>)
            ) : (
              <span>Nothing obvious missing from this quick capture.</span>
            )}
          </div>

          <div className="wm-sh-actions">
            <button className="wm-sh-secondary" onClick={() => goToStep("capture")} type="button">
              Back
            </button>
            <button className="wm-sh-danger" onClick={resetWorkflow} type="button">
              Clear
            </button>
          </div>
        </aside>
      </section>
    );
  }

  return (
    <div className="wm-sh-flow">
      <section className="wm-sh-hero">
        <div>
          <p className="wm-sh-kicker">Sales Helper</p>
          <h1>Guide the sales conversation one step at a time.</h1>
          <p>
            Choose the conversation type, ask the next useful question, capture only what matters, then move to the
            right Wingman tool.
          </p>
        </div>
      </section>

      {renderStepper()}

      {activeStep === "type" && renderTypePage()}
      {activeStep === "question" && renderQuestionPage()}
      {activeStep === "capture" && renderCapturePage()}
      {activeStep === "next" && renderNextActionPage()}
    </div>
  );
}

export default SalesHelperPage;