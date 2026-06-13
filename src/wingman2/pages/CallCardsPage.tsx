import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SUPPORTED_WINGMAN_LANGUAGES, getStoredWingmanCaptureLanguage, setStoredWingmanCaptureLanguage, type WingmanLanguageId, useWingmanLanguage } from "../data/wingmanLanguage";

type ConversationTypeId = "displayAttach" | "meetingRoom" | "productSku" | "competitor" | "supportRisk";
type AudienceId = "endUser" | "dealer" | "consultant" | "internal";
type LanguageId = WingmanLanguageId;
type MicTarget = "wholeCall" | "currentQuestion";

type ConversationType = {
  id: ConversationTypeId;
  title: string;
  shortTitle: string;
  description: string;
  opener: string;
  firstQuestion: string;
  questions: string[];
  route: string;
  routeLabel: string;
  likelyDirection: string[];
};

type Audience = {
  id: AudienceId;
  label: string;
  helper: string;
};

type Interpretation = {
  summary: string;
  askNext: string;
  missing: string[];
  direction: string[];
  suggestedType: ConversationTypeId;
};

const CONVERSATION_TYPES: ConversationType[] = [
  {
    id: "displayAttach",
    title: "Display / LED / video wall add-on",
    shortTitle: "Display / wall",
    description: "Use when the customer conversation starts with a display, LED wall, signage screen or video wall.",
    opener: "The display is only one part of the job. Let us check what needs to feed it, control it and make it useful every day.",
    firstQuestion: "What display, LED wall or video wall is already being sold?",
    questions: [
      "What display, LED wall or video wall is already being sold?",
      "What sources need to feed it?",
      "Where are those sources located?",
      "Does it need switching, extension, processing, multiview or AV-over-IP?",
      "Who controls the content day to day?"
    ],
    route: "/wingman/videowall",
    routeLabel: "Open Video Wall",
    likelyDirection: [
      "Dedicated video wall processing if the wall behaviour is fixed and defined.",
      "NetworkHD if routing flexibility or future expansion matters.",
      "Seamless matrix if fixed switching plus processing is a better fit."
    ]
  },
  {
    id: "meetingRoom",
    title: "Meeting room / BYOD / UC",
    shortTitle: "Meeting room",
    description: "Use for meeting spaces, presentation rooms, UC rooms and USB-C / conferencing workflows.",
    opener: "Before we look at products, can I check how people actually use the room on a normal day?",
    firstQuestion: "Do users bring laptops, use a room PC, or need both?",
    questions: [
      "Do users bring laptops, use a room PC, or need both?",
      "Is the priority presentation, conferencing, or both?",
      "How many displays are in the room?",
      "Are USB cameras, touch displays or speakerphones involved?",
      "Where do the cables land: table, lectern, wall plate, floor box or rack?"
    ],
    route: "/wingman/discovery",
    routeLabel: "Open Discovery",
    likelyDirection: [
      "Presentation switcher or UC-focused workflow if the room is local and user-led.",
      "USB-aware switching if conferencing devices or touch devices must follow the source.",
      "NetworkHD or HDBaseT if distance and topology push beyond a simple local room solution."
    ]
  },
  {
    id: "productSku",
    title: "Product / SKU conversation",
    shortTitle: "Product / SKU",
    description: "Use when the customer starts by asking for a product, product family or exact SKU.",
    opener: "Let me check the application first so we do not force the wrong product into the wrong job.",
    firstQuestion: "Which product or SKU is the customer asking about?",
    questions: [
      "Which product or SKU is the customer asking about?",
      "What job do they expect that product to do?",
      "How many sources, displays or endpoints are involved?",
      "What resolution, USB, audio, control or network features are required?",
      "Is this like-for-like or should we recommend a better-fit option?"
    ],
    route: "/wingman/finder",
    routeLabel: "Open Finder",
    likelyDirection: [
      "Do not confirm a SKU until the application is clear.",
      "Move into Product Finder after confirming the real use case.",
      "Use Proposal only once dependencies are understood."
    ]
  },
  {
    id: "competitor",
    title: "Competitor / replacement",
    shortTitle: "Competitor",
    description: "Use when WyreStorm is being compared with another manufacturer or a legacy system.",
    opener: "Let us compare the requirement, not just the logo on the box.",
    firstQuestion: "What competitor product or existing system is involved?",
    questions: [
      "What competitor product or existing system is involved?",
      "Is the decision technical, commercial or familiarity-led?",
      "Which features are essential?",
      "What would make the customer confident enough to choose WyreStorm?",
      "Is stock, support, warranty or price driving the decision?"
    ],
    route: "/wingman/compare",
    routeLabel: "Open Compare",
    likelyDirection: [
      "Compare product purpose, not just port count.",
      "Look for signal-path, USB, control and support differences.",
      "Use Compare after the competitor SKU or family is clear."
    ]
  },
  {
    id: "supportRisk",
    title: "Support / risk / warranty",
    shortTitle: "Support / risk",
    description: "Use for warranty, support confidence, project risk or customer-safe wording.",
    opener: "Let us make sure the customer understands the support route and protection behind the system, not just the hardware price.",
    firstQuestion: "What concern needs to be dealt with?",
    questions: [
      "What concern needs to be dealt with?",
      "Who is asking and what stage is the project at?",
      "Which products and region are involved?",
      "Is this a pre-sale confidence issue or a post-sale support issue?",
      "Do they need formal customer-facing wording?"
    ],
    route: "/wingman/proposal",
    routeLabel: "Open Proposal",
    likelyDirection: [
      "Do not invent official warranty or SLA wording.",
      "Capture the concern cleanly and move into proposal-safe output.",
      "Use Support or Proposal once the exact concern is understood."
    ]
  }
];

const AUDIENCES: Audience[] = [
  { id: "endUser", label: "End user", helper: "Simple, outcome-led wording." },
  { id: "dealer", label: "Dealer / reseller", helper: "Practical installation and commercial wording." },
  { id: "consultant", label: "Consultant / designer", helper: "More technical and architecture-led wording." },
  { id: "internal", label: "Internal sales / pre-sales", helper: "Structured qualification and handoff wording." }
];

const LANGUAGES = SUPPORTED_WINGMAN_LANGUAGES;
const callNotesStorageKey = "wingman-guru-call-notes-transcript";

function getConversationType(id: ConversationTypeId) {
  return CONVERSATION_TYPES.find((item) => item.id === id) ?? CONVERSATION_TYPES[0];
}

function getAudience(id: AudienceId) {
  return AUDIENCES.find((item) => item.id === id) ?? AUDIENCES[1];
}

function getLanguage(id: LanguageId) {
  return LANGUAGES.find((item) => item.id === id) ?? LANGUAGES[0];
}

function includesAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

function answersToText(answers: Record<string, string>) {
  return Object.entries(answers)
    .filter(([, answer]) => answer.trim())
    .map(([question, answer]) => `Q: ${question}\nA: ${answer.trim()}`)
    .join("\n\n");
}

function interpretConversation(
  transcript: string,
  clue: string,
  selectedType: ConversationTypeId,
  answers: Record<string, string>
): Interpretation {
  const text = `${clue}\n${transcript}\n${answersToText(answers)}`.toLowerCase();

  let suggestedType: ConversationTypeId = selectedType;
  let summary = "Wingman is waiting for a clearer requirement before it narrows the opportunity.";
  let askNext = getConversationType(selectedType).firstQuestion;
  let missing = ["source count", "source locations", "signal path", "control method"];
  let direction = getConversationType(selectedType).likelyDirection;

  const wallDetected = includesAny(text, ["led wall", "video wall", "videowall", "lcd wall", "3x3", "2x2", "menu board", "signage"]);
  const meetingDetected = includesAny(text, ["meeting room", "boardroom", "teams", "zoom", "byod", "byom", "usb-c", "camera", "speakerphone", "touch display"]);
  const productDetected = includesAny(text, ["sku", "nhd", "networkhd", "hdbaset", "apollo", "matrix", "switcher", "receiver", "transmitter"]);
  const competitorDetected = includesAny(text, ["hdanywhere", "just add power", "jap", "kramer", "blustream", "competitor", "replacement"]);
  const supportDetected = includesAny(text, ["warranty", "support", "sla", "fault", "failure", "risk", "tender"]);

  if (wallDetected) {
    suggestedType = "displayAttach";
    summary = "This sounds like a display-led opportunity where WyreStorm can attach signal management, wall processing or routing.";
    askNext = "What sources need to feed the wall, and where are they located?";
    missing = ["source count", "source locations", "wall size / layout", "control method", "cable distance"];
    direction = getConversationType("displayAttach").likelyDirection;
  }

  if (meetingDetected) {
    suggestedType = "meetingRoom";
    summary = "This sounds like a meeting-room workflow with presentation, USB and conferencing decisions.";
    askNext = "Do users bring laptops, use a room PC, or need both?";
    missing = ["display count", "USB requirement", "camera / audio requirement", "cable landing point"];
    direction = getConversationType("meetingRoom").likelyDirection;
  }

  if (productDetected && !wallDetected && !meetingDetected) {
    suggestedType = "productSku";
    summary = "The customer is asking about a product, but the application still needs qualifying.";
    askNext = "What job does the customer expect that product to do?";
    missing = ["application", "source / display count", "USB / audio / control requirement"];
    direction = getConversationType("productSku").likelyDirection;
  }

  if (competitorDetected) {
    suggestedType = "competitor";
    summary = "This sounds like a competitor or legacy-system comparison and needs purpose-based matching.";
    askNext = "What competitor product or existing system is involved?";
    missing = ["competitor model", "must-have features", "decision driver"];
    direction = getConversationType("competitor").likelyDirection;
  }

  if (supportDetected) {
    suggestedType = "supportRisk";
    summary = "This sounds like a support, warranty or risk-confidence conversation.";
    askNext = "What is the exact concern and who is asking it?";
    missing = ["exact concern", "product / region", "customer-safe wording needed?"];
    direction = getConversationType("supportRisk").likelyDirection;
  }

  return {
    summary,
    askNext,
    missing,
    direction,
    suggestedType
  };
}

export function CallCardsPage() {
  const navigate = useNavigate();
  const recognitionRef = useRef<any>(null);
  const { language: uiLanguage } = useWingmanLanguage();

  const [conversationTypeId, setConversationTypeId] = useState<ConversationTypeId>("displayAttach");
  const [audienceId, setAudienceId] = useState<AudienceId>("dealer");
  const [languageId, setLanguageId] = useState<LanguageId>(() => getStoredWingmanCaptureLanguage().id);
  const [clue, setClue] = useState("");
  const [transcript, setTranscript] = useState("");
  const [transcriptDrawerOpen, setTranscriptDrawerOpen] = useState(() => Boolean(transcript.trim()));
  const [notes, setNotes] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [questionIndex, setQuestionIndex] = useState(0);
  const [listening, setListening] = useState(false);
  const [micTarget, setMicTarget] = useState<MicTarget | null>(null);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [copied, setCopied] = useState(false);

  const conversationType = getConversationType(conversationTypeId);
  const audience = getAudience(audienceId);
  const language = getLanguage(languageId);
  const currentQuestion = conversationType.questions[questionIndex] ?? conversationType.firstQuestion;

  const interpretation = useMemo(() => {
    return interpretConversation(transcript, clue, conversationTypeId, answers);
  }, [transcript, clue, conversationTypeId, answers]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  useEffect(() => {
    setQuestionIndex(0);
  }, [conversationTypeId]);

  const appendTranscript = (text: string) => {
    const cleanText = text.trim();

    if (!cleanText) {
      return;
    }

    setTranscript((current) => {
      const prefix = current.trim() ? `${current.trim()}\n` : "";
      return `${prefix}${cleanText}`;
    });
  };

  const appendAnswer = (question: string, text: string) => {
    const cleanText = text.trim();

    if (!cleanText) {
      return;
    }

    setAnswers((current) => {
      const existing = current[question]?.trim();
      return {
        ...current,
        [question]: existing ? `${existing}\n${cleanText}` : cleanText
      };
    });
  };

  const setAnswer = (question: string, value: string) => {
    setAnswers((current) => ({
      ...current,
      [question]: value
    }));
  };

  const stopMic = (message = "Microphone stopped.") => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    setListening(false);
    setMicTarget(null);
    setLiveTranscript("");
    setStatusMessage(message);
  };

  const startMic = (target: MicTarget) => {
    setStatusMessage("");

    if (typeof window === "undefined") {
      return;
    }

    if (listening && micTarget === target) {
      stopMic();
      return;
    }

    if (listening && micTarget !== target) {
      stopMic("Microphone mode changed.");
    }

    const SpeechRecognitionConstructor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionConstructor) {
      setStatusMessage("Voice capture is not available in this browser. Use Chrome or Edge.");
      return;
    }

    const recognition = new SpeechRecognitionConstructor();
    recognition.lang = language.speechLang;
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onstart = () => {
      setListening(true);
      setMicTarget(target);
      setLiveTranscript("");
      setStatusMessage(target === "wholeCall" ? `Whole-call mic open in ${language.label}.` : `Capturing answer in ${language.label}.`);
    };

    recognition.onresult = (event: any) => {
      let interimText = "";
      let finalText = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const transcriptChunk = event.results[index][0]?.transcript ?? "";

        if (event.results[index].isFinal) {
          finalText += transcriptChunk;
        }

        if (!event.results[index].isFinal) {
          interimText += transcriptChunk;
        }
      }

      setLiveTranscript(interimText.trim());

      if (finalText.trim()) {
        if (target === "wholeCall") {
          appendTranscript(finalText.trim());
        }

        if (target === "currentQuestion") {
          appendAnswer(currentQuestion, finalText.trim());
        }

        setLiveTranscript("");
      }
    };

    recognition.onerror = () => {
      setListening(false);
      setMicTarget(null);
      setStatusMessage("Voice capture stopped or microphone permission was blocked.");
    };

    recognition.onend = () => {
      setListening(false);
      setMicTarget(null);
      setLiveTranscript("");
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const saveSession = () => {
    try {
      window.localStorage.setItem(
        "wingman.liveCallAssistant.latest",
        JSON.stringify({
          createdAt: new Date().toISOString(),
          conversationTypeId,
          audienceId,
          uiLanguageId: uiLanguage.id,
          languageId,
          clue,
          transcript,
          answers,
          notes,
          interpretation
        })
      );
    } catch {
      setStatusMessage("Could not save locally, but you can still continue.");
    }
  };

  const goToRoute = (path: string) => {
    const handoffSummary = [
      "Live Call Cards handoff",
      "",
      `Conversation type: ${conversationType.title}`,
      `Audience: ${audience.label}`,
      `Capture language: ${language.label}`,
      clue.trim() ? `Opening clue: ${clue.trim()}` : "",
      "",
      `Wingman summary: ${interpretation.summary}`,
      `Ask next: ${interpretation.askNext}`,
      interpretation.missing.length ? `Missing: ${interpretation.missing.join(", ")}` : "",
      "",
      "Captured conversation:",
      transcript.trim() || "(none)",
      "",
      "Question answers:",
      answersToText(answers) || "(none)",
      "",
      "Extra notes:",
      notes.trim() || "(none)",
      "",
      "Quote safety:",
      "- Treat this as live-call discovery input, not a final design.",
      "- Validate exact WyreStorm SKUs, dependencies and official datasheets before quoting."
    ]
      .filter(Boolean)
      .join("\n");

    if (path === "/wingman/discovery" && typeof window !== "undefined") {
      window.sessionStorage.setItem(callNotesStorageKey, handoffSummary);
    }

    saveSession();
    navigate(path);
  };

  const copySummary = () => {
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      setStatusMessage("Copy is not available in this browser.");
      return;
    }

    const summary = [
      `Conversation type: ${conversationType.title}`,
      `Audience: ${audience.label}`,
      `UI language: ${uiLanguage.label}`,
      `Capture language: ${language.label}`,
      clue.trim() ? `Opening clue: ${clue.trim()}` : "",
      "",
      `Wingman summary: ${interpretation.summary}`,
      `Ask next: ${interpretation.askNext}`,
      interpretation.missing.length ? `Missing: ${interpretation.missing.join(", ")}` : "",
      "",
      "Captured conversation:",
      transcript.trim() || "(none)",
      "",
      "Question answers:",
      answersToText(answers) || "(none)",
      "",
      "Notes:",
      notes.trim() || "(none)"
    ]
      .filter(Boolean)
      .join("\n");

    void navigator.clipboard.writeText(summary).then(() => {
      setCopied(true);
      setStatusMessage("Call summary copied.");
      window.setTimeout(() => setCopied(false), 1400);
    });
  };

  const startNewCall = () => {
    stopMic("Ready for a new call.");
    setConversationTypeId("displayAttach");
    setAudienceId("dealer");
    setLanguageId("en-GB");
    setClue("");
    setTranscript("");
    setTranscriptDrawerOpen(false);
    setNotes("");
    setAnswers({});
    setQuestionIndex(0);
    setStatusMessage("");
    setLiveTranscript("");
  };

  const applySuggestedShift = () => {
    setConversationTypeId(interpretation.suggestedType);
    setQuestionIndex(0);
    setStatusMessage(`Conversation shifted to ${getConversationType(interpretation.suggestedType).shortTitle}.`);
  };

  return (
    <main className="cca-page">
      <style>{pageStyles}</style>

      <section className="cca-shell">
        <header className="cca-header">
          <div>
            <h1>Live Call Cards</h1>
            <span>Capture the call, ask the next question, hand off fast.</span>
          </div>

          <div className="cca-headerActions">
            <button type="button" onClick={copySummary}>{copied ? "Copied" : "Copy summary"}</button>
            <button type="button" onClick={startNewCall}>New call</button>
          </div>
        </header>

        <section className="cca-commandBar">
          <div className="cca-typeStrip" aria-label="Conversation type">
            {CONVERSATION_TYPES.map((item) => (
              <button
                key={item.id}
                type="button"
                className={conversationTypeId === item.id ? "is-selected" : ""}
                onClick={() => setConversationTypeId(item.id)}
                title={item.description}
              >
                <strong>{item.shortTitle}</strong>
              </button>
            ))}
          </div>

          <div className="cca-compactSettings">
            <label>
              Audience
              <select value={audienceId} onChange={(event) => setAudienceId(event.target.value as AudienceId)}>
                {AUDIENCES.map((item) => (
                  <option key={item.id} value={item.id}>{item.label}</option>
                ))}
              </select>
            </label>

            <label>
              Language
              <select value={languageId} onChange={(event) => {
                  const nextLanguage = event.target.value as LanguageId;
                  setLanguageId(nextLanguage);
                  setStoredWingmanCaptureLanguage(nextLanguage);
                }}>
                {LANGUAGES.map((item) => (
                  <option key={item.id} value={item.id}>{item.label}</option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="cca-liveWorkspace">
          <section className="cca-mainCapture">
            <article className="cca-openerCard">
              <span>{conversationType.title}</span>
              <strong>{conversationType.opener}</strong>
              <small>{audience.helper}</small>
            </article>

            <div className="cca-micBar">
              <button
                type="button"
                className={listening && micTarget === "wholeCall" ? "cca-openMic is-listening" : "cca-openMic"}
                onClick={() => startMic("wholeCall")}
              >
                {listening && micTarget === "wholeCall" ? "Stop whole-call mic" : "Open whole-call mic"}
              </button>

              <button
                type="button"
                className={listening && micTarget === "currentQuestion" ? "cca-captureMic is-listening" : "cca-captureMic"}
                onClick={() => startMic("currentQuestion")}
              >
                {listening && micTarget === "currentQuestion" ? "Stop answer capture" : "Capture this answer"}
              </button>
            </div>

            <label className="cca-field">
              <span>Opening clue / customer wording</span>
              <input
                value={clue}
                onChange={(event) => setClue(event.target.value)}
                placeholder={conversationType.firstQuestion}
              />
            </label>

            <details
              className="cca-transcriptDrawer"
              open={transcriptDrawerOpen}
              onToggle={(event) => setTranscriptDrawerOpen(event.currentTarget.open)}
            >
              <summary>
                <span>Whole-call transcript</span>
                <small>{transcript.trim() ? "Transcript captured" : "Collapsed until needed"}</small>
              </summary>

              <label className="cca-field cca-grow">
                <span>Editable transcript</span>
                <textarea
                  value={transcript}
                  onChange={(event) => setTranscript(event.target.value)}
                  placeholder="Open the whole-call mic, paste a transcript, or type the call summary here. This field is fully editable."
                />
              </label>
            </details>

            <label className="cca-field cca-notesField">
              <span>Editable extra notes</span>
              <textarea
                className="cca-notesArea"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Add customer wording, price pressure, competitor names, product hints, or follow-up notes."
              />
            </label>

            {liveTranscript ? <p className="cca-statusLive">Listening: {liveTranscript}</p> : null}
            {statusMessage ? <p className="cca-statusText">{statusMessage}</p> : null}
          </section>

          <aside className="cca-sideCoach">
            <article className="cca-nextQuestion">
              <span>Ask this now</span>
              <strong>{currentQuestion}</strong>

              <div className="cca-questionActions">
                <button
                  type="button"
                  onClick={() => setQuestionIndex((current) => Math.max(0, current - 1))}
                  disabled={questionIndex === 0}
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setQuestionIndex((current) => Math.min(conversationType.questions.length - 1, current + 1))}
                  disabled={questionIndex === conversationType.questions.length - 1}
                >
                  Next question
                </button>
              </div>

              <textarea
                value={answers[currentQuestion] ?? ""}
                onChange={(event) => setAnswer(currentQuestion, event.target.value)}
                placeholder="Type or capture the customer's answer here. This answer is editable."
              />
            </article>

            <details className="cca-supportDetails">
              <summary>
                <span>Need more support?</span>
                <strong>Show Wingman interpretation</strong>
                <small>{interpretation.summary}</small>
              </summary>

              <div className="cca-supportDetailsBody">
                <article className="cca-insightCard">
                  <span>Ask next</span>
                  <strong>{interpretation.askNext}</strong>
                </article>

                <article className="cca-insightCard">
                  <span>Missing detail</span>
                  <div className="cca-chipCloud">
                    {interpretation.missing.map((item) => (
                      <em key={item}>{item}</em>
                    ))}
                  </div>
                </article>

                <article className="cca-insightCard">
                  <span>Likely direction</span>
                  <ul>
                    {interpretation.direction.slice(0, 3).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </article>

                <article className="cca-insightCard cca-suggestionCard">
                  <span>Workflow</span>
                  <strong>{conversationType.routeLabel}</strong>
                  <button type="button" onClick={() => goToRoute(conversationType.route)}>Open best workflow</button>
                  {interpretation.suggestedType !== conversationTypeId ? (
                    <button type="button" onClick={applySuggestedShift}>Switch to {getConversationType(interpretation.suggestedType).shortTitle}</button>
                  ) : null}
                </article>
              </div>
            </details>
          </aside>
        </section>

        <section className="cca-handoffRail">
          <button type="button" className={conversationType.route === "/wingman/videowall" ? "is-primary" : ""} onClick={() => goToRoute("/wingman/videowall")}>
            <strong>Open Video Wall</strong>
            <span>Wall or display path</span>
          </button>

          <button type="button" className={conversationType.route === "/wingman/discovery" ? "is-primary" : ""} onClick={() => goToRoute("/wingman/discovery")}>
            <strong>Open Discovery</strong>
            <span>Qualify the room</span>
          </button>

          <button type="button" className={conversationType.route === "/wingman/finder" ? "is-primary" : ""} onClick={() => goToRoute("/wingman/finder")}>
            <strong>Open Finder</strong>
            <span>Check product fit</span>
          </button>

          <button type="button" className={conversationType.route === "/wingman/proposal" ? "is-primary" : ""} onClick={() => goToRoute("/wingman/proposal")}>
            <strong>Open Proposal</strong>
            <span>Customer-safe output</span>
          </button>
        </section>
      </section>
    </main>
  );
}

export default CallCardsPage;

const pageStyles = `
.cca-page {
  min-height: 100%;
  padding: 10px 14px;
  color: var(--wm-sweep-text) !important;
  background:
    radial-gradient(circle at top right, rgba(245, 158, 11, 0.1), transparent 34%),
    linear-gradient(180deg, #06111d 0%, #eef3f8 100%);
}

.cca-page * {
  box-sizing: border-box;
}

.cca-shell {
  width: min(1260px, 100%);
  min-height: calc(100vh - 104px);
  margin: 0 auto;
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr) auto;
  gap: 10px;
}

.cca-header,
.cca-commandBar,
.cca-mainCapture,
.cca-sideCoach,
.cca-handoffRail {
  border: 1px solid rgba(148, 163, 184, 0.26);
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.07);
}

.cca-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  border-radius: 22px;
  padding: 12px 16px;
}

.cca-header p {
  margin: 0;
  color: #b45309;
  font-size: 0.66rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.cca-header h1 {
  margin: 4px 0 0;
  color: var(--wm-sweep-text) !important;
  font-size: clamp(1.35rem, 2.2vw, 1.9rem);
  line-height: 1;
  letter-spacing: -0.04em;
}

.cca-header span {
  display: block;
  margin-top: 5px;
  color: #64748b;
  font-size: 0.82rem;
  line-height: 1.32;
}

.cca-headerActions,
.cca-questionActions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.cca-headerActions button,
.cca-questionActions button,
.cca-insightCard button {
  min-height: 32px;
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 999px;
  padding: 0 12px;
  color: #334155;
  background: var(--wm-sweep-card) !important;
  font-size: 0.76rem;
  font-weight: 760;
  cursor: pointer;
}

.cca-commandBar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 12px;
  border-radius: 20px;
  padding: 12px;
}

.cca-typeStrip {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
}

.cca-typeStrip button {
  min-height: 76px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  border-radius: 16px;
  padding: 10px;
  color: var(--wm-sweep-text) !important;
  background: var(--wm-sweep-card) !important;
  text-align: left;
  cursor: pointer;
}

.cca-typeStrip button.is-selected {
  border-color: rgba(245, 158, 11, 0.9);
  background: rgba(4, 17, 30, 0.82);
  box-shadow: inset 4px 0 0 #4af5e6;
}

.cca-typeStrip strong {
  display: block;
  font-size: 0.82rem;
  line-height: 1.12;
}

.cca-typeStrip span {
  display: block;
  margin-top: 5px;
  color: #64748b;
  font-size: 0.68rem;
  line-height: 1.25;
}

.cca-compactSettings {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  align-items: end;
}

.cca-compactSettings label,
.cca-field {
  display: grid;
  gap: 6px;
  color: #92400e;
  font-size: 0.66rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.cca-compactSettings select,
.cca-field input,
.cca-field textarea,
.cca-nextQuestion textarea {
  width: 100%;
  border: 1px solid rgba(148, 163, 184, 0.34);
  border-radius: 14px;
  color: var(--wm-sweep-text) !important;
  background: var(--wm-sweep-card) !important;
  font: inherit;
  outline: none;
  text-transform: none;
  letter-spacing: normal;
  font-weight: 450;
}

.cca-compactSettings select,
.cca-field input {
  height: 38px;
  padding: 0 11px;
  font-size: 0.84rem;
}

.cca-field textarea,
.cca-nextQuestion textarea {
  resize: vertical;
  padding: 11px;
  font-size: 0.86rem;
  line-height: 1.36;
}

.cca-liveWorkspace {
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(340px, 0.85fr);
  gap: 12px;
}

.cca-mainCapture,
.cca-sideCoach {
  min-height: 0;
  border-radius: 22px;
  padding: 14px;
  overflow: hidden;
}

.cca-mainCapture {
  display: grid;
  grid-template-rows: auto auto auto minmax(0, 1fr) auto auto;
  gap: 11px;
}

.cca-openerCard,
.cca-nextQuestion,
.cca-insightCard {
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 18px;
  background: var(--wm-sweep-card) !important;
  padding: 12px;
}

.cca-openerCard {
  border-color: rgba(245, 158, 11, 0.32);
  background: rgba(4, 17, 30, 0.82);
}

.cca-openerCard span,
.cca-nextQuestion span,
.cca-insightCard span {
  display: block;
  color: #92400e;
  font-size: 0.66rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.cca-openerCard strong,
.cca-nextQuestion strong,
.cca-insightCard strong {
  display: block;
  margin-top: 6px;
  color: var(--wm-sweep-text) !important;
  font-size: 0.96rem;
  line-height: 1.28;
}

.cca-openerCard small {
  display: block;
  margin-top: 6px;
  color: #64748b;
  font-size: 0.78rem;
  line-height: 1.3;
}

.cca-micBar {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.cca-openMic,
.cca-captureMic {
  min-height: 54px;
  border: 0;
  border-radius: 18px;
  color: #071827;
  background: #f7fbff;
  font-size: 0.94rem;
  font-weight: 850;
  cursor: pointer;
  box-shadow: 0 14px 24px rgba(15, 23, 42, 0.16);
}

.cca-captureMic {
  background: #1d4ed8;
}

.cca-openMic.is-listening,
.cca-captureMic.is-listening {
  background: #dc2626;
}

.cca-grow textarea {
  min-height: 260px;
}

.cca-notesArea {
  min-height: 92px;
}

.cca-sideCoach {
  display: grid;
  grid-template-rows: auto auto auto auto auto auto;
  gap: 10px;
  overflow-y: auto;
}

.cca-nextQuestion {
  border-color: rgba(245, 158, 11, 0.34);
  background: rgba(4, 17, 30, 0.82);
}

.cca-nextQuestion textarea {
  min-height: 120px;
  margin-top: 10px;
}

.cca-questionActions {
  margin-top: 10px;
}

.cca-actionCard {
  border-color: rgba(245, 158, 11, 0.34);
  background: rgba(4, 17, 30, 0.82);
}

.cca-chipCloud {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.cca-chipCloud em {
  border-radius: 999px;
  padding: 5px 8px;
  color: #334155;
  background: #e2e8f0;
  font-size: 0.72rem;
  font-style: normal;
}

.cca-insightCard ul {
  margin: 8px 0 0;
  padding-left: 18px;
}

.cca-insightCard li {
  color: #334155;
  font-size: 0.82rem;
  line-height: 1.34;
}

.cca-suggestionCard {
  display: grid;
  gap: 8px;
}

.cca-handoffRail {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  border-radius: 20px;
  padding: 12px;
}

.cca-handoffRail button {
  min-height: 64px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  border-radius: 16px;
  padding: 10px 12px;
  color: var(--wm-sweep-text) !important;
  background: var(--wm-sweep-card) !important;
  text-align: left;
  cursor: pointer;
}

.cca-handoffRail button.is-primary {
  border-color: rgba(245, 158, 11, 0.92);
  background: rgba(4, 17, 30, 0.82);
  box-shadow: inset 4px 0 0 #4af5e6;
}

.cca-handoffRail strong {
  display: block;
  font-size: 0.86rem;
}

.cca-handoffRail span {
  display: block;
  margin-top: 4px;
  color: #64748b;
  font-size: 0.72rem;
  line-height: 1.25;
}

.cca-statusLive,
.cca-statusText {
  margin: 0;
  color: #0f766e;
  font-size: 0.78rem;
  line-height: 1.28;
}

.cca-statusText {
  color: #475569;
}

button:disabled {
  opacity: 0.42;
  cursor: not-allowed;
}

@media (max-width: 1180px) {
  .cca-shell {
    min-height: 0;
  }

  .cca-commandBar,
  .cca-liveWorkspace,
  .cca-handoffRail {
    grid-template-columns: 1fr;
  }

  .cca-typeStrip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .cca-mainCapture,
  .cca-sideCoach {
    overflow: visible;
  }

  .cca-grow textarea {
    min-height: 220px;
  }
}

@media (max-width: 720px) {
  .cca-page {
    padding: 10px;
  }

  .cca-header,
  .cca-compactSettings,
  .cca-micBar,
  .cca-typeStrip {
    grid-template-columns: 1fr;
  }

  .cca-header {
    display: grid;
  }

  .cca-headerActions {
    justify-content: flex-start;
  }
}


/* WINGMAN LIVE CALL BUTTON OVERRIDE START */

.cca-page .cca-mainCapture .cca-micBar {
  display: grid !important;
  grid-template-columns: minmax(0, 1.18fr) minmax(0, 0.82fr) !important;
  gap: 14px !important;
  margin: 8px 0 4px !important;
  min-height: 66px !important;
  align-items: stretch !important;
}

.cca-page .cca-mainCapture .cca-micBar .cca-openMic,
.cca-page .cca-mainCapture .cca-micBar .cca-captureMic {
  position: relative !important;
  width: 100% !important;
  min-height: 66px !important;
  height: 66px !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  padding: 0 22px !important;
  border-radius: 22px !important;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  color: #071827 !important;
  font-size: 1.05rem !important;
  font-weight: 850 !important;
  line-height: 1 !important;
  letter-spacing: -0.015em !important;
  text-align: center !important;
  text-transform: none !important;
  cursor: pointer !important;
  overflow: hidden !important;
  transform: translateZ(0) !important;
  transition:
    transform 160ms ease,
    box-shadow 160ms ease,
    filter 160ms ease,
    border-color 160ms ease !important;
}

.cca-page .cca-mainCapture .cca-micBar .cca-openMic::before,
.cca-page .cca-mainCapture .cca-micBar .cca-captureMic::before {
  content: "" !important;
  position: absolute !important;
  inset: 0 !important;
  pointer-events: none !important;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.02)),
    radial-gradient(circle at 20% 0%, rgba(255, 255, 255, 0.18), transparent 9rem) !important;
}

.cca-page .cca-mainCapture .cca-micBar .cca-openMic:hover,
.cca-page .cca-mainCapture .cca-micBar .cca-captureMic:hover {
  transform: translateY(-2px) !important;
  filter: brightness(1.04) !important;
}

.cca-page .cca-mainCapture .cca-micBar .cca-openMic:active,
.cca-page .cca-mainCapture .cca-micBar .cca-captureMic:active {
  transform: translateY(0) scale(0.99) !important;
}

.cca-page .cca-mainCapture .cca-micBar .cca-openMic {
  border-color: rgba(8, 47, 73, 0.85) !important;
  background:
    radial-gradient(circle at 16% 0%, rgba(96, 165, 250, 0.22), transparent 10rem),
    linear-gradient(135deg, #06101d 0%, #0f2941 54%, #155e75 100%) !important;
  box-shadow:
    0 20px 36px rgba(8, 17, 31, 0.28),
    0 0 0 1px rgba(14, 165, 233, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.16) !important;
}

.cca-page .cca-mainCapture .cca-micBar .cca-openMic:hover {
  box-shadow:
    0 24px 46px rgba(8, 17, 31, 0.34),
    0 0 0 5px rgba(14, 165, 233, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.18) !important;
}

.cca-page .cca-mainCapture .cca-micBar .cca-captureMic {
  border-color: rgba(29, 78, 216, 0.85) !important;
  background:
    radial-gradient(circle at 16% 0%, rgba(255, 255, 255, 0.2), transparent 9rem),
    linear-gradient(135deg, #1d4ed8 0%, #2563eb 46%, #0284c7 100%) !important;
  box-shadow:
    0 20px 36px rgba(29, 78, 216, 0.28),
    0 0 0 1px rgba(59, 130, 246, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.2) !important;
}

.cca-page .cca-mainCapture .cca-micBar .cca-captureMic:hover {
  box-shadow:
    0 24px 46px rgba(29, 78, 216, 0.34),
    0 0 0 5px rgba(59, 130, 246, 0.13),
    inset 0 1px 0 rgba(255, 255, 255, 0.22) !important;
}

.cca-page .cca-mainCapture .cca-micBar .cca-openMic.is-listening,
.cca-page .cca-mainCapture .cca-micBar .cca-captureMic.is-listening {
  border-color: rgba(153, 27, 27, 0.9) !important;
  background:
    radial-gradient(circle at 18% 0%, rgba(255, 255, 255, 0.16), transparent 9rem),
    linear-gradient(135deg, #dc2626 0%, #b91c1c 52%, #7f1d1d 100%) !important;
  box-shadow:
    0 22px 44px rgba(127, 29, 29, 0.36),
    0 0 0 6px rgba(220, 38, 38, 0.13),
    inset 0 1px 0 rgba(255, 255, 255, 0.18) !important;
}

.cca-page .cca-mainCapture .cca-micBar .cca-openMic.is-listening::after,
.cca-page .cca-mainCapture .cca-micBar .cca-captureMic.is-listening::after {
  content: "" !important;
  position: absolute !important;
  right: 18px !important;
  top: 50% !important;
  width: 11px !important;
  height: 11px !important;
  border-radius: 999px !important;
  background: #071827 !important;
  transform: translateY(-50%) !important;
  animation: ccaMicPulse 1.4s infinite !important;
}

.cca-page .cca-mainCapture .cca-openerCard {
  padding: 15px 142px 15px 16px !important;
  border-radius: 22px !important;
  border: 1px solid rgba(246, 163, 64, 0.38) !important;
  background:
    radial-gradient(circle at 0% 0%, rgba(246, 163, 64, 0.18), transparent 14rem),
    linear-gradient(180deg, #f7fbffaf0, #f7fbffdf7) !important;
  box-shadow: 0 12px 28px rgba(146, 64, 14, 0.1) !important;
}

.cca-page .cca-mainCapture .cca-openerCard strong {
  margin-top: 6px !important;
  font-size: 1rem !important;
  line-height: 1.25 !important;
}

.cca-page .cca-mainCapture .cca-openerCard small {
  margin-top: 5px !important;
  font-size: 0.76rem !important;
  color: #64748b !important;
}

@keyframes ccaMicPulse {
  0% {
    box-shadow: 0 0 0 0 rgba(255,255,255,0.65);
  }

  70% {
    box-shadow: 0 0 0 10px rgba(255,255,255,0);
  }

  100% {
    box-shadow: 0 0 0 0 rgba(255,255,255,0);
  }
}

/* WINGMAN LIVE CALL BUTTON OVERRIDE END */



/* WINGMAN LIVE TRANSCRIPT CANVAS OVERRIDE START */

.cca-page .cca-mainCapture {
  grid-template-rows: auto auto auto minmax(520px, 1fr) auto auto !important;
}

.cca-page .cca-mainCapture .cca-field.cca-grow {
  position: relative !important;
  min-height: 520px !important;
  display: grid !important;
  grid-template-rows: auto minmax(0, 1fr) !important;
  gap: 10px !important;
  padding: 0 !important;
  border-radius: 26px !important;
}

.cca-page .cca-mainCapture .cca-field.cca-grow > span {
  min-height: 38px !important;
  display: flex !important;
  align-items: center !important;
  width: fit-content !important;
  border-radius: 999px !important;
  padding: 0 14px !important;
  color: #075985 !important;
  background:
    linear-gradient(135deg, rgba(14, 165, 233, 0.14), rgba(255, 255, 255, 0.82)) !important;
  border: 1px solid rgba(14, 165, 233, 0.2) !important;
  font-size: 0.68rem !important;
  font-weight: 900 !important;
  letter-spacing: 0.15em !important;
  text-transform: uppercase !important;
  box-shadow: 0 10px 22px rgba(14, 165, 233, 0.08) !important;
}

.cca-page .cca-mainCapture .cca-field.cca-grow::before {
  content: "Type or paste the whole customer conversation here. Guru reads this as the live context.";
  position: absolute !important;
  right: 16px !important;
  top: 6px !important;
  max-width: 460px !important;
  color: #64748b !important;
  font-size: 0.78rem !important;
  font-weight: 650 !important;
  letter-spacing: normal !important;
  text-transform: none !important;
  text-align: right !important;
  pointer-events: none !important;
}

.cca-page .cca-mainCapture .cca-grow textarea {
  min-height: 0 !important;
  height: 100% !important;
  resize: vertical !important;
  align-self: stretch !important;
  border-radius: 28px !important;
  border: 1px solid rgba(14, 165, 233, 0.24) !important;
  padding: 24px 26px !important;
  color: #f7fbff !important;
  background:
    linear-gradient(90deg, rgba(14, 165, 233, 0.055) 0 1px, transparent 1px 100%),
    linear-gradient(rgba(14, 165, 233, 0.045) 1px, transparent 1px),
    radial-gradient(circle at 0% 0%, rgba(14, 165, 233, 0.07), transparent 18rem),
    linear-gradient(180deg, rgba(255,255,255,0.99), rgba(248,250,252,0.98)) !important;
  background-size:
    32px 32px,
    100% 34px,
    auto,
    auto !important;
  font-size: 1rem !important;
  line-height: 1.55 !important;
  font-weight: 450 !important;
  box-shadow:
    inset 0 1px 0 rgba(15, 23, 42, 0.04),
    0 18px 44px rgba(15, 23, 42, 0.08) !important;
}

.cca-page .cca-mainCapture .cca-grow textarea::placeholder {
  color: #94a3b8 !important;
  font-size: 1rem !important;
  line-height: 1.5 !important;
}

.cca-page .cca-mainCapture .cca-grow textarea:focus {
  border-color: rgba(14, 165, 233, 0.62) !important;
  background:
    linear-gradient(90deg, rgba(14, 165, 233, 0.07) 0 1px, transparent 1px 100%),
    linear-gradient(rgba(14, 165, 233, 0.06) 1px, transparent 1px),
    radial-gradient(circle at 0% 0%, rgba(14, 165, 233, 0.1), transparent 18rem),
    linear-gradient(180deg, rgba(255,255,255,1), rgba(248,250,252,0.99)) !important;
  background-size:
    32px 32px,
    100% 34px,
    auto,
    auto !important;
  box-shadow:
    0 0 0 5px rgba(14, 165, 233, 0.1),
    0 22px 52px rgba(14, 165, 233, 0.12),
    inset 0 1px 0 rgba(15, 23, 42, 0.04) !important;
}

.cca-page .cca-mainCapture .cca-field:not(.cca-grow) > span {
  font-size: 0.66rem !important;
  letter-spacing: 0.14em !important;
}

.cca-page .cca-mainCapture .cca-field input {
  min-height: 46px !important;
  border-radius: 999px !important;
  padding: 0 18px !important;
  border: 1px solid rgba(148, 163, 184, 0.28) !important;
  background: rgba(255,255,255,0.96) !important;
  font-size: 0.9rem !important;
  box-shadow: 0 10px 22px rgba(15, 23, 42, 0.05) !important;
}

.cca-page .cca-mainCapture .cca-field input:focus {
  border-color: rgba(14, 165, 233, 0.55) !important;
  box-shadow:
    0 0 0 4px rgba(14, 165, 233, 0.1),
    0 12px 26px rgba(15, 23, 42, 0.06) !important;
}

.cca-page .cca-mainCapture .cca-notesArea {
  min-height: 96px !important;
  border-radius: 22px !important;
  padding: 16px !important;
  background:
    radial-gradient(circle at 0% 0%, rgba(246, 163, 64, 0.08), transparent 14rem),
    rgba(255,255,255,0.96) !important;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.06) !important;
}

.cca-page .cca-mainCapture .cca-statusLive {
  min-height: 34px !important;
  display: flex !important;
  align-items: center !important;
  border-radius: 999px !important;
  padding: 0 14px !important;
  color: #075985 !important;
  background: rgba(14, 165, 233, 0.1) !important;
  border: 1px solid rgba(14, 165, 233, 0.18) !important;
  font-size: 0.78rem !important;
  font-weight: 750 !important;
}

.cca-page .cca-mainCapture .cca-statusText {
  min-height: 30px !important;
  display: flex !important;
  align-items: center !important;
  border-radius: 999px !important;
  padding: 0 12px !important;
  color: #475569 !important;
  background: rgba(226, 232, 240, 0.48) !important;
  font-size: 0.74rem !important;
  font-weight: 700 !important;
}

@media (max-width: 1280px) {
  .cca-page .cca-mainCapture {
    grid-template-rows: auto auto auto minmax(420px, 1fr) auto auto !important;
  }

  .cca-page .cca-mainCapture .cca-field.cca-grow {
    min-height: 420px !important;
  }

  .cca-page .cca-mainCapture .cca-field.cca-grow::before {
    position: static !important;
    max-width: none !important;
    text-align: left !important;
    margin-top: -4px !important;
  }
}

@media (max-width: 720px) {
  .cca-page .cca-mainCapture .cca-grow textarea {
    padding: 18px !important;
    font-size: 0.92rem !important;
  }

  .cca-page .cca-mainCapture .cca-field.cca-grow::before {
    display: none !important;
  }
}

/* WINGMAN LIVE TRANSCRIPT CANVAS OVERRIDE END */

/* WINGMAN LIVE CALL COMPACT CONSOLE START */

html[data-wingman-route="callCards"][data-wingman-canvas-scaling="true"] .wingman-page-host,
html[data-wingman-route="callCards"][data-wingman-dpr-aware-scaling="true"] .wingman-page-host,
.wm-route-call-cards .wingman-page-host,
.wm-route-callCards .wingman-page-host {
  position: static !important;
  inset: auto !important;
  width: 100% !important;
  min-width: 0 !important;
  max-width: 100% !important;
  height: 100% !important;
  min-height: 0 !important;
  max-height: 100% !important;
  transform: none !important;
  transform-origin: initial !important;
  padding: 0 !important;
  overflow: hidden !important;
}

.cca-page {
  width: 100% !important;
  height: 100% !important;
  min-height: 0 !important;
  display: block !important;
  overflow: hidden !important;
  padding: 8px 10px !important;
  color: #f7fbff !important;
  background:
    radial-gradient(circle at 82% 0%, rgba(74, 245, 230, 0.12), transparent 28%),
    linear-gradient(180deg, #06111d 0%, #081724 100%) !important;
}

.cca-shell {
  width: 100% !important;
  max-width: 100% !important;
  height: calc(100vh - 86px) !important;
  min-height: 0 !important;
  display: grid !important;
  grid-template-rows: 54px 40px minmax(0, 1fr) 52px !important;
  gap: 8px !important;
}

.cca-header,
.cca-commandBar,
.cca-mainCapture,
.cca-sideCoach,
.cca-handoffRail {
  border: 1px solid rgba(74, 245, 230, 0.22) !important;
  background: rgba(5, 19, 32, 0.94) !important;
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.22) !important;
}

.cca-header {
  min-height: 0 !important;
  max-height: 54px !important;
  border-radius: 14px !important;
  padding: 7px 10px 7px 14px !important;
  overflow: hidden !important;
}

.cca-header h1 {
  margin: 0 !important;
  color: #4af5e6 !important;
  font-size: 1.08rem !important;
  line-height: 1.05 !important;
  letter-spacing: 0 !important;
}

.cca-header span {
  margin-top: 2px !important;
  color: rgba(237, 246, 255, 0.72) !important;
  font-size: 0.66rem !important;
  line-height: 1.12 !important;
}

.cca-headerActions {
  align-items: center !important;
  flex-wrap: nowrap !important;
}

.cca-headerActions button,
.cca-questionActions button,
.cca-insightCard button {
  min-height: 28px !important;
  height: 28px !important;
  border-color: rgba(74, 245, 230, 0.34) !important;
  background: rgba(8, 31, 54, 0.86) !important;
  color: #f7fbff !important;
  padding: 0 10px !important;
  font-size: 0.7rem !important;
  font-weight: 800 !important;
}

.cca-commandBar {
  min-height: 0 !important;
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) 330px !important;
  align-items: center !important;
  gap: 8px !important;
  border-radius: 12px !important;
  padding: 5px !important;
  overflow: hidden !important;
}

.cca-typeStrip {
  display: flex !important;
  align-items: center !important;
  gap: 5px !important;
  min-width: 0 !important;
}

.cca-typeStrip button {
  min-height: 28px !important;
  height: 28px !important;
  flex: 1 1 0 !important;
  border-radius: 999px !important;
  padding: 0 9px !important;
  background: rgba(8, 31, 54, 0.72) !important;
  color: rgba(237, 246, 255, 0.78) !important;
  text-align: center !important;
  white-space: nowrap !important;
  box-shadow: none !important;
}

.cca-typeStrip button.is-selected {
  border-color: rgba(74, 245, 230, 0.9) !important;
  background: rgba(19, 76, 91, 0.92) !important;
  color: #f7fbff !important;
  box-shadow: inset 0 -2px 0 #4af5e6 !important;
}

.cca-typeStrip strong {
  font-size: 0.68rem !important;
  line-height: 1 !important;
  font-weight: 850 !important;
}

.cca-typeStrip span {
  display: none !important;
}

.cca-compactSettings {
  grid-template-columns: 1fr 1fr !important;
  gap: 6px !important;
  align-items: center !important;
}

.cca-compactSettings label {
  gap: 2px !important;
  color: rgba(74, 245, 230, 0.82) !important;
  font-size: 0.56rem !important;
  letter-spacing: 0.08em !important;
}

.cca-compactSettings select {
  height: 24px !important;
  min-height: 24px !important;
  border-radius: 999px !important;
  padding: 0 8px !important;
  background: rgba(3, 14, 25, 0.98) !important;
  color: #f7fbff !important;
  font-size: 0.68rem !important;
}

.cca-liveWorkspace {
  min-height: 0 !important;
  height: 100% !important;
  grid-template-columns: minmax(0, 0.95fr) minmax(360px, 1.05fr) !important;
  gap: 8px !important;
}

.cca-page .cca-liveWorkspace article,
.cca-page .cca-liveWorkspace aside,
.cca-page .cca-liveWorkspace > div {
  max-height: none !important;
  overflow-y: visible !important;
}

.cca-mainCapture,
.cca-sideCoach {
  min-height: 0 !important;
  height: 100% !important;
  border-radius: 14px !important;
  padding: 9px !important;
  overflow: hidden !important;
}

.cca-mainCapture {
  display: grid !important;
  grid-template-rows: auto auto auto auto minmax(72px, 0.58fr) auto !important;
  gap: 7px !important;
}

.cca-sideCoach {
  display: grid !important;
  grid-template-rows: minmax(0, 1fr) auto !important;
  gap: 8px !important;
}

.cca-openerCard,
.cca-nextQuestion,
.cca-insightCard,
.cca-transcriptDrawer,
.cca-supportDetails {
  border: 1px solid rgba(74, 245, 230, 0.2) !important;
  border-radius: 12px !important;
  background: rgba(8, 31, 54, 0.72) !important;
  padding: 9px !important;
}

.cca-openerCard {
  min-height: 52px !important;
  padding: 8px 10px !important;
  overflow: hidden !important;
}

.cca-openerCard span,
.cca-nextQuestion span,
.cca-insightCard span,
.cca-field span,
.cca-transcriptDrawer summary span,
.cca-supportDetails summary span {
  color: #4af5e6 !important;
  font-size: 0.58rem !important;
  line-height: 1 !important;
  font-weight: 850 !important;
  letter-spacing: 0.08em !important;
}

.cca-openerCard strong,
.cca-nextQuestion strong,
.cca-insightCard strong,
.cca-supportDetails summary strong {
  margin-top: 4px !important;
  color: #f7fbff !important;
  font-size: 0.82rem !important;
  line-height: 1.18 !important;
  font-weight: 800 !important;
}

.cca-openerCard strong {
  display: -webkit-box !important;
  overflow: hidden !important;
  -webkit-line-clamp: 2 !important;
  -webkit-box-orient: vertical !important;
}

.cca-openerCard small,
.cca-transcriptDrawer summary small,
.cca-supportDetails summary small {
  margin-top: 4px !important;
  color: rgba(237, 246, 255, 0.62) !important;
  font-size: 0.68rem !important;
  line-height: 1.2 !important;
}

.cca-micBar {
  grid-template-columns: 1fr 1fr !important;
  gap: 7px !important;
  min-height: 0 !important;
  margin: 0 !important;
}

.cca-page .cca-mainCapture .cca-micBar .cca-openMic,
.cca-page .cca-mainCapture .cca-micBar .cca-captureMic {
  min-height: 34px !important;
  height: 34px !important;
  border-radius: 12px !important;
  padding: 0 10px !important;
  color: #f7fbff !important;
  font-size: 0.78rem !important;
  box-shadow: none !important;
}

.cca-field {
  gap: 4px !important;
}

.cca-field input,
.cca-field textarea,
.cca-nextQuestion textarea {
  border-color: rgba(74, 245, 230, 0.24) !important;
  background: rgba(3, 14, 25, 0.98) !important;
  color: #f7fbff !important;
  font-size: 0.78rem !important;
  line-height: 1.24 !important;
  box-shadow: none !important;
}

.cca-page .cca-mainCapture .cca-field input {
  height: 30px !important;
  min-height: 30px !important;
  border-radius: 10px !important;
  padding: 0 10px !important;
}

.cca-field textarea {
  padding: 8px !important;
  resize: none !important;
}

.cca-notesArea {
  min-height: 66px !important;
  height: 100% !important;
  border-radius: 10px !important;
  padding: 8px !important;
  background: rgba(3, 14, 25, 0.98) !important;
}

.cca-transcriptDrawer {
  padding: 0 !important;
  overflow: hidden !important;
}

.cca-transcriptDrawer:not([open]) > .cca-grow,
.cca-supportDetails:not([open]) > .cca-supportDetailsBody {
  display: none !important;
}

.cca-transcriptDrawer > summary,
.cca-supportDetails > summary {
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) auto !important;
  gap: 2px 10px !important;
  align-items: center !important;
  cursor: pointer !important;
  list-style: none !important;
  padding: 8px 10px !important;
}

.cca-transcriptDrawer > summary::-webkit-details-marker,
.cca-supportDetails > summary::-webkit-details-marker {
  display: none !important;
}

.cca-transcriptDrawer > summary::after,
.cca-supportDetails > summary::after {
  content: "Open" !important;
  grid-row: 1 / span 2 !important;
  grid-column: 2 !important;
  align-self: center !important;
  border: 1px solid rgba(74, 245, 230, 0.28) !important;
  border-radius: 999px !important;
  padding: 4px 8px !important;
  color: #4af5e6 !important;
  font-size: 0.62rem !important;
  font-weight: 850 !important;
}

.cca-transcriptDrawer[open] > summary::after,
.cca-supportDetails[open] > summary::after {
  content: "Close" !important;
}

.cca-transcriptDrawer .cca-grow {
  min-height: 0 !important;
  padding: 0 10px 10px !important;
}

.cca-page .cca-mainCapture .cca-field.cca-grow {
  min-height: 0 !important;
  grid-template-rows: auto 130px !important;
  border-radius: 0 !important;
}

.cca-page .cca-mainCapture .cca-field.cca-grow::before {
  display: none !important;
}

.cca-page .cca-mainCapture .cca-grow textarea {
  min-height: 130px !important;
  height: 130px !important;
  overflow-y: auto !important;
  resize: vertical !important;
  border-radius: 10px !important;
  padding: 8px !important;
  color: #f7fbff !important;
  background: rgba(3, 14, 25, 0.98) !important;
  font-size: 0.78rem !important;
  line-height: 1.3 !important;
}

.cca-nextQuestion {
  display: grid !important;
  grid-template-rows: auto auto auto minmax(118px, 1fr) !important;
  gap: 7px !important;
  min-height: 0 !important;
  overflow: hidden !important;
}

.cca-nextQuestion textarea {
  min-height: 118px !important;
  height: 100% !important;
  margin-top: 0 !important;
  border-radius: 10px !important;
  resize: none !important;
}

.cca-questionActions {
  margin-top: 0 !important;
  flex-wrap: nowrap !important;
}

.cca-supportDetails {
  padding: 0 !important;
}

.cca-supportDetailsBody {
  display: grid !important;
  grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  gap: 7px !important;
  padding: 0 9px 9px !important;
}

.cca-insightCard {
  padding: 8px !important;
}

.cca-insightCard ul {
  margin: 6px 0 0 !important;
  padding-left: 14px !important;
}

.cca-insightCard li {
  color: rgba(237, 246, 255, 0.78) !important;
  font-size: 0.7rem !important;
  line-height: 1.25 !important;
}

.cca-chipCloud {
  margin-top: 6px !important;
  gap: 5px !important;
}

.cca-chipCloud em {
  background: rgba(74, 245, 230, 0.1) !important;
  color: rgba(237, 246, 255, 0.86) !important;
  padding: 4px 7px !important;
  font-size: 0.64rem !important;
}

.cca-suggestionCard {
  align-content: start !important;
}

.cca-statusLive,
.cca-statusText {
  min-height: 22px !important;
  display: flex !important;
  align-items: center !important;
  border-radius: 999px !important;
  padding: 0 9px !important;
  color: rgba(237, 246, 255, 0.78) !important;
  background: rgba(74, 245, 230, 0.09) !important;
  border: 1px solid rgba(74, 245, 230, 0.16) !important;
  font-size: 0.68rem !important;
  line-height: 1.1 !important;
}

.cca-handoffRail {
  min-height: 0 !important;
  height: 52px !important;
  grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
  gap: 7px !important;
  border-radius: 14px !important;
  padding: 7px !important;
}

.cca-handoffRail button {
  min-height: 0 !important;
  height: 38px !important;
  border-radius: 11px !important;
  padding: 5px 9px !important;
  background: rgba(8, 31, 54, 0.72) !important;
  color: #f7fbff !important;
  box-shadow: none !important;
}

.cca-handoffRail button.is-primary {
  border-color: rgba(74, 245, 230, 0.9) !important;
  background: rgba(19, 76, 91, 0.92) !important;
  box-shadow: inset 2px 0 0 #4af5e6 !important;
}

.cca-handoffRail strong {
  font-size: 0.72rem !important;
  line-height: 1 !important;
}

.cca-handoffRail span {
  margin-top: 2px !important;
  color: rgba(237, 246, 255, 0.58) !important;
  font-size: 0.62rem !important;
  line-height: 1.05 !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}

@media (max-width: 1180px) {
  .cca-page {
    height: auto !important;
    min-height: 100% !important;
    overflow: auto !important;
  }

  .cca-shell {
    height: auto !important;
    min-height: 0 !important;
    grid-template-rows: auto auto auto auto !important;
  }

  .cca-commandBar,
  .cca-liveWorkspace {
    grid-template-columns: 1fr !important;
  }

  .cca-typeStrip {
    flex-wrap: wrap !important;
  }

  .cca-typeStrip button {
    flex: 1 1 150px !important;
  }

  .cca-mainCapture,
  .cca-sideCoach {
    overflow: visible !important;
  }
}

@media (max-width: 720px) {
  .cca-header,
  .cca-handoffRail,
  .cca-supportDetailsBody {
    grid-template-columns: 1fr !important;
  }

  .cca-handoffRail {
    height: auto !important;
  }

  .cca-handoffRail button {
    height: auto !important;
    min-height: 42px !important;
  }
}

.cca-page .cca-mainCapture .cca-openerCard {
  min-height: 52px !important;
  height: auto !important;
  max-height: 62px !important;
  overflow: hidden !important;
  padding: 8px 10px !important;
}

.cca-page .cca-mainCapture .cca-transcriptDrawer:not([open]) {
  min-height: 44px !important;
  height: 44px !important;
  max-height: 44px !important;
}

.cca-page .cca-mainCapture .cca-transcriptDrawer:not([open]) > .cca-field.cca-grow {
  display: none !important;
  min-height: 0 !important;
  height: 0 !important;
  max-height: 0 !important;
  overflow: hidden !important;
}

.cca-page .cca-mainCapture .cca-transcriptDrawer[open] {
  height: auto !important;
  max-height: 210px !important;
}

.cca-page .cca-mainCapture .cca-transcriptDrawer[open] > .cca-field.cca-grow {
  display: grid !important;
}

html[data-wingman-route="callCards"] .wingman-page-host .cca-page .cca-header {
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) auto !important;
  align-items: center !important;
  gap: 10px !important;
  height: 54px !important;
  min-height: 0 !important;
  max-height: 54px !important;
  margin: 0 !important;
  padding: 7px 10px 7px 14px !important;
  border-radius: 14px !important;
  background: rgba(5, 19, 32, 0.94) !important;
}

html[data-wingman-route="callCards"] .wingman-page-host .cca-page .cca-header h1 {
  margin: 0 !important;
  max-width: none !important;
  color: #4af5e6 !important;
  font-size: 1.08rem !important;
  line-height: 1.05 !important;
  letter-spacing: 0 !important;
}

html[data-wingman-route="callCards"] .wingman-page-host .cca-page .cca-header span {
  margin-top: 2px !important;
  max-width: none !important;
  color: rgba(237, 246, 255, 0.72) !important;
  font-size: 0.66rem !important;
  line-height: 1.12 !important;
}

html[data-wingman-route="callCards"] .wingman-page-host .cca-page .cca-commandBar {
  height: 40px !important;
  min-height: 0 !important;
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) 330px !important;
  align-items: center !important;
  gap: 8px !important;
  padding: 5px !important;
  border-radius: 12px !important;
  background: rgba(5, 19, 32, 0.94) !important;
}

html[data-wingman-route="callCards"] .wingman-page-host .cca-page .cca-typeStrip {
  display: flex !important;
  gap: 5px !important;
  align-items: center !important;
  min-width: 0 !important;
}

html[data-wingman-route="callCards"] .wingman-page-host .cca-page .cca-typeStrip button {
  height: 28px !important;
  min-height: 28px !important;
  flex: 1 1 0 !important;
  padding: 0 8px !important;
  border-radius: 999px !important;
  text-align: center !important;
}

html[data-wingman-route="callCards"] .wingman-page-host .cca-page .cca-typeStrip strong {
  color: inherit !important;
  font-size: 0.68rem !important;
  line-height: 1 !important;
  font-weight: 850 !important;
}

html[data-wingman-route="callCards"] .wingman-page-host .cca-page .cca-compactSettings {
  display: grid !important;
  grid-template-columns: 1fr 1fr !important;
  gap: 6px !important;
  align-items: center !important;
}

html[data-wingman-route="callCards"] .wingman-page-host .cca-page .cca-compactSettings label {
  display: grid !important;
  gap: 2px !important;
  color: rgba(74, 245, 230, 0.82) !important;
  font-size: 0.56rem !important;
  line-height: 1 !important;
  letter-spacing: 0.08em !important;
}

html[data-wingman-route="callCards"] .wingman-page-host .cca-page .cca-compactSettings select {
  height: 24px !important;
  min-height: 24px !important;
  padding: 0 8px !important;
  font-size: 0.68rem !important;
}

html[data-wingman-route="callCards"] .wingman-page-host .cca-page .cca-mainCapture {
  padding: 9px !important;
  grid-template-rows: 62px 34px 45px 44px minmax(0, 1fr) auto !important;
  align-content: stretch !important;
  overflow: hidden !important;
}

html[data-wingman-route="callCards"] .wingman-page-host .cca-page .cca-micBar {
  height: 34px !important;
  min-height: 34px !important;
  grid-template-columns: 1fr 1fr !important;
  grid-template-rows: 34px !important;
  gap: 7px !important;
  overflow: hidden !important;
}

html[data-wingman-route="callCards"] .wingman-page-host .cca-page .cca-notesField {
  min-height: 0 !important;
  height: 100% !important;
  display: grid !important;
  grid-template-rows: auto minmax(0, 1fr) !important;
  overflow: hidden !important;
}

html[data-wingman-route="callCards"] .wingman-page-host .cca-page .cca-notesArea {
  min-height: 0 !important;
  height: 100% !important;
  max-height: none !important;
  resize: none !important;
}

html[data-wingman-route="callCards"] body #root .wingman-page-host .cca-page .cca-openerCard {
  height: 62px !important;
  min-height: 62px !important;
  max-height: 62px !important;
  padding: 8px 10px !important;
}

html[data-wingman-route="callCards"] body #root .wingman-page-host .cca-page .cca-openerCard strong {
  margin-top: 4px !important;
  font-size: 0.78rem !important;
  line-height: 1.12 !important;
  -webkit-line-clamp: 2 !important;
}

html[data-wingman-route="callCards"] body #root .wingman-page-host .cca-page .cca-openerCard small {
  display: none !important;
}

html[data-wingman-route="callCards"] body #root .wingman-page-host .cca-page .cca-shell {
  padding: 8px !important;
}

html[data-wingman-route="callCards"] body #root .wingman-page-host .cca-page .cca-header h1 {
  color: #4af5e6 !important;
  font-size: 1.15rem !important;
  line-height: 1.05 !important;
  letter-spacing: 0 !important;
}

html[data-wingman-route="callCards"] body #root .wingman-page-host .cca-page .cca-header span {
  color: rgba(237, 246, 255, 0.72) !important;
  font-size: 0.66rem !important;
  line-height: 1.12 !important;
}

html[data-wingman-route="callCards"] body #root .wingman-page-host .cca-page .cca-commandBar {
  padding: 5px !important;
}

/* WINGMAN LIVE CALL COMPACT CONSOLE END */

`;
