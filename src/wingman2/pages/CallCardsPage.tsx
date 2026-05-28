import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { WingmanLanguageSelector } from "../components/WingmanLanguageSelector";
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
    title: "Meeting room / BYOD / BYOM",
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
            <p>Wingman workspace</p>
            <h1>Live Call Cards</h1>
            <span>One page for call capture, editable notes, live prompts and handoff.</span>
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
              >
                <strong>{item.shortTitle}</strong>
                <span>{item.description}</span>
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

            <label className="cca-field cca-grow">
              <span>Editable whole-call transcript</span>
              <textarea
                value={transcript}
                onChange={(event) => setTranscript(event.target.value)}
                placeholder="Open the whole-call mic, paste a transcript, or type the call summary here. This field is fully editable."
              />
            </label>

            <label className="cca-field">
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

            <article className="cca-insightCard">
              <span>Wingman thinks</span>
              <strong>{interpretation.summary}</strong>
            </article>

            <article className="cca-insightCard cca-actionCard">
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
              <span>Likely WyreStorm direction</span>
              <ul>
                {interpretation.direction.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>

            {interpretation.suggestedType !== conversationTypeId ? (
              <article className="cca-insightCard cca-suggestionCard">
                <span>Suggested shift</span>
                <strong>{getConversationType(interpretation.suggestedType).title}</strong>
                <button type="button" onClick={applySuggestedShift}>Switch now</button>
              </article>
            ) : null}
          </aside>
        </section>

        <section className="cca-handoffRail">
          <button type="button" className="is-primary" onClick={() => goToRoute(conversationType.route)}>
            <strong>{conversationType.routeLabel}</strong>
            <span>Best route for this call type</span>
          </button>

          <button type="button" onClick={() => goToRoute("/wingman/discovery")}>
            <strong>Open Discovery</strong>
            <span>Use when the requirement still needs qualification</span>
          </button>

          <button type="button" onClick={() => goToRoute("/wingman/finder")}>
            <strong>Open Finder</strong>
            <span>Use when a product path or SKU needs checking</span>
          </button>

          <button type="button" onClick={() => goToRoute("/wingman/proposal")}>
            <strong>Open Proposal</strong>
            <span>Use when customer-safe wording is needed</span>
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
  color: #111827;
  background:
    radial-gradient(circle at top right, rgba(245, 158, 11, 0.1), transparent 34%),
    linear-gradient(180deg, #f8fafc 0%, #eef3f8 100%);
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
  color: #0f172a;
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
  background: #f8fafc;
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
  color: #0f172a;
  background: #ffffff;
  text-align: left;
  cursor: pointer;
}

.cca-typeStrip button.is-selected {
  border-color: rgba(245, 158, 11, 0.9);
  background: #fffbeb;
  box-shadow: inset 4px 0 0 #f59e0b;
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
  color: #0f172a;
  background: #ffffff;
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
  background: #f8fafc;
  padding: 12px;
}

.cca-openerCard {
  border-color: rgba(245, 158, 11, 0.32);
  background: #fffbeb;
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
  color: #0f172a;
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
  color: #ffffff;
  background: #0f172a;
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
  background: #fffbeb;
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
  background: #fffbeb;
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
  color: #0f172a;
  background: #ffffff;
  text-align: left;
  cursor: pointer;
}

.cca-handoffRail button.is-primary {
  border-color: rgba(245, 158, 11, 0.92);
  background: #fffbeb;
  box-shadow: inset 4px 0 0 #f59e0b;
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
`;