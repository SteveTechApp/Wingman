import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

type WizardStep = "type" | "context" | "capture" | "handoff";
type ConversationTypeId = "displayAttach" | "meetingRoom" | "productSku" | "competitor" | "supportRisk";
type AudienceId = "endUser" | "dealer" | "consultant" | "internal";
type CaptureStyle = "wholeConversation" | "questionLed";
type LanguageId = "en-GB" | "nl-NL" | "zh-CN";

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

type Language = {
  id: LanguageId;
  label: string;
  speechLang: string;
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
    shortTitle: "Display / wall add-on",
    description: "Use when the conversation starts from a display, LED wall, signage screen or video wall sale.",
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
      "Dedicated video wall processing if wall behaviour is fixed and defined.",
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
    description: "Use when WyreStorm is being compared with another manufacturer or legacy system.",
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
    description: "Use when the conversation is about warranty, support confidence, project risk or customer-safe wording.",
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
  { id: "endUser", label: "End user", helper: "Simple and outcome-led language." },
  { id: "dealer", label: "Dealer / reseller", helper: "Practical and commercial language." },
  { id: "consultant", label: "Consultant / designer", helper: "More technical and architecture-led." },
  { id: "internal", label: "Internal sales / pre-sales", helper: "Structured and qualification-led." }
];

const LANGUAGES: Language[] = [
  { id: "en-GB", label: "English UK", speechLang: "en-GB" },
  { id: "nl-NL", label: "Dutch", speechLang: "nl-NL" },
  { id: "zh-CN", label: "Mandarin", speechLang: "zh-CN" }
];

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

function interpretConversation(
  transcript: string,
  clue: string,
  selectedType: ConversationTypeId
): Interpretation {
  const text = `${clue}\n${transcript}`.toLowerCase();

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

  const [step, setStep] = useState<WizardStep>("type");
  const [conversationTypeId, setConversationTypeId] = useState<ConversationTypeId>("displayAttach");
  const [audienceId, setAudienceId] = useState<AudienceId>("dealer");
  const [languageId, setLanguageId] = useState<LanguageId>("en-GB");
  const [captureStyle, setCaptureStyle] = useState<CaptureStyle>("wholeConversation");
  const [clue, setClue] = useState("");
  const [transcript, setTranscript] = useState("");
  const [notes, setNotes] = useState("");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [listening, setListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [copied, setCopied] = useState(false);

  const conversationType = getConversationType(conversationTypeId);
  const audience = getAudience(audienceId);
  const language = getLanguage(languageId);

  const interpretation = useMemo(() => {
    return interpretConversation(transcript, clue, conversationTypeId);
  }, [transcript, clue, conversationTypeId]);

  const currentQuestion = conversationType.questions[questionIndex] ?? conversationType.firstQuestion;

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  useEffect(() => {
    setQuestionIndex(0);
  }, [conversationTypeId, captureStyle]);

  const appendText = (text: string) => {
    const cleanText = text.trim();

    if (!cleanText) {
      return;
    }

    setTranscript((current) => {
      const prefix = current.trim() ? `${current.trim()}\n` : "";
      return `${prefix}${cleanText}`;
    });
  };

  const saveSession = () => {
    try {
      window.localStorage.setItem(
        "wingman.liveCallAssistant.latest",
        JSON.stringify({
          createdAt: new Date().toISOString(),
          step,
          conversationTypeId,
          audienceId,
          languageId,
          captureStyle,
          clue,
          transcript,
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
      `Language: ${language.label}`,
      `Capture style: ${captureStyle === "wholeConversation" ? "Whole conversation" : "Question-led"}`,
      clue.trim() ? `Clue: ${clue.trim()}` : "",
      "",
      `Wingman summary: ${interpretation.summary}`,
      `Ask next: ${interpretation.askNext}`,
      interpretation.missing.length ? `Missing: ${interpretation.missing.join(", ")}` : "",
      "",
      "Transcript / captured detail:",
      transcript.trim() || "(none)",
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

  const toggleMic = () => {
    setStatusMessage("");

    if (typeof window === "undefined") {
      return;
    }

    if (listening && recognitionRef.current) {
      recognitionRef.current.stop();
      setListening(false);
      setStatusMessage("Microphone stopped.");
      return;
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
      setLiveTranscript("");
      setStatusMessage(`Listening in ${language.label}.`);
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
        if (captureStyle === "questionLed") {
          const prefixed = `Q${questionIndex + 1}: ${currentQuestion}\nA: ${finalText.trim()}`;
          appendText(prefixed);
        }

        if (captureStyle === "wholeConversation") {
          appendText(finalText.trim());
        }

        setLiveTranscript("");
      }
    };

    recognition.onerror = () => {
      setListening(false);
      setStatusMessage("Voice capture stopped or microphone permission was blocked.");
    };

    recognition.onend = () => {
      setListening(false);
      setLiveTranscript("");
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const shiftConversation = (targetId: ConversationTypeId) => {
    setConversationTypeId(targetId);
    setQuestionIndex(0);
    setStatusMessage(`Conversation shifted to ${getConversationType(targetId).shortTitle}.`);
  };

  const startNewCall = () => {
    setStep("type");
    setConversationTypeId("displayAttach");
    setAudienceId("dealer");
    setLanguageId("en-GB");
    setCaptureStyle("wholeConversation");
    setClue("");
    setTranscript("");
    setNotes("");
    setQuestionIndex(0);
    setStatusMessage("");
    setLiveTranscript("");
  };

  return (
    <main className="cca-page">
      <style>{pageStyles}</style>

      <section className="cca-shell">
        <header className="cca-header">
          <div>
            <p>Wingman workspace</p>
            <h1>Live Call Wizard</h1>
            <span>Pick the conversation type, capture the call, then move the opportunity into the right workflow.</span>
          </div>
        </header>

        <nav className="cca-stepper" aria-label="Live call wizard steps">
          <button type="button" className={step === "type" ? "is-active" : ""} onClick={() => setStep("type")}>
            <strong>1</strong>
            <span>Choose type</span>
          </button>
          <button type="button" className={step === "context" ? "is-active" : ""} onClick={() => setStep("context")}>
            <strong>2</strong>
            <span>Set context</span>
          </button>
          <button type="button" className={step === "capture" ? "is-active" : ""} onClick={() => setStep("capture")}>
            <strong>3</strong>
            <span>Capture</span>
          </button>
          <button type="button" className={step === "handoff" ? "is-active" : ""} onClick={() => setStep("handoff")}>
            <strong>4</strong>
            <span>Hand off</span>
          </button>
        </nav>

        {step === "type" ? (
          <section className="cca-card">
            <p className="cca-kicker">Step 1 of 4</p>
            <h2>What is this call mainly about?</h2>
            <p className="cca-lead">Choose the conversation type first. This lets Wingman switch quickly to the right question style and next-step route.</p>

            <div className="cca-typeGrid">
              {CONVERSATION_TYPES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={conversationTypeId === item.id ? "is-selected" : ""}
                  onClick={() => setConversationTypeId(item.id)}
                >
                  <strong>{item.title}</strong>
                  <span>{item.description}</span>
                </button>
              ))}
            </div>

            <footer className="cca-footer">
              <span>Selected: {conversationType.title}</span>
              <button type="button" className="cca-primary" onClick={() => setStep("context")}>Continue</button>
            </footer>
          </section>
        ) : null}

        {step === "context" ? (
          <section className="cca-card">
            <p className="cca-kicker">Step 2 of 4</p>
            <h2>Set the call context</h2>
            <p className="cca-lead">Choose who you are talking to and how you want to capture the conversation.</p>

            <div className="cca-section">
              <h3>Who are you talking to?</h3>
              <div className="cca-chipRow">
                {AUDIENCES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={audienceId === item.id ? "is-selected" : ""}
                    onClick={() => setAudienceId(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <p className="cca-helper">{audience.helper}</p>
            </div>

            <div className="cca-twoCols">
              <label className="cca-field">
                <span>Language</span>
                <select value={languageId} onChange={(event) => setLanguageId(event.target.value as LanguageId)}>
                  {LANGUAGES.map((item) => (
                    <option key={item.id} value={item.id}>{item.label}</option>
                  ))}
                </select>
              </label>

              <div className="cca-field">
                <span>Capture style</span>
                <div className="cca-chipRow">
                  <button
                    type="button"
                    className={captureStyle === "wholeConversation" ? "is-selected" : ""}
                    onClick={() => setCaptureStyle("wholeConversation")}
                  >
                    Whole conversation
                  </button>
                  <button
                    type="button"
                    className={captureStyle === "questionLed" ? "is-selected" : ""}
                    onClick={() => setCaptureStyle("questionLed")}
                  >
                    Question-led
                  </button>
                </div>
              </div>
            </div>

            <label className="cca-field">
              <span>Starting clue</span>
              <input
                value={clue}
                onChange={(event) => setClue(event.target.value)}
                placeholder={conversationType.firstQuestion}
              />
            </label>

            <footer className="cca-footer">
              <button type="button" onClick={() => setStep("type")}>Back</button>
              <span>Next: start capturing the conversation.</span>
              <button type="button" className="cca-primary" onClick={() => setStep("capture")}>Start capture</button>
            </footer>
          </section>
        ) : null}

        {step === "capture" ? (
          <section className="cca-liveCard">
            <div className="cca-liveHeader">
              <div>
                <p className="cca-kicker">Step 3 of 4</p>
                <h2>Capture the conversation</h2>
                <p className="cca-lead">
                  {captureStyle === "wholeConversation"
                    ? "Open mic and capture the whole discussion. Wingman will suggest the next question and likely direction."
                    : "Use the current prompt, capture the response, then move to the next question."}
                </p>
              </div>

              <div className="cca-quickShift">
                <span>Shift conversation to</span>
                <div className="cca-chipRow">
                  {CONVERSATION_TYPES.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={conversationTypeId === item.id ? "is-selected" : ""}
                      onClick={() => shiftConversation(item.id)}
                    >
                      {item.shortTitle}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="cca-liveLayout">
              <section className="cca-capturePanel">
                {captureStyle === "questionLed" ? (
                  <article className="cca-questionCard">
                    <span>Ask this now</span>
                    <h3>{currentQuestion}</h3>
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
                  </article>
                ) : null}

                <button type="button" className={listening ? "cca-openMic is-listening" : "cca-openMic"} onClick={toggleMic}>
                  {listening ? "Stop mic" : "Open mic"}
                </button>

                <label className="cca-field cca-grow">
                  <span>Captured conversation</span>
                  <textarea
                    value={transcript}
                    onChange={(event) => setTranscript(event.target.value)}
                    placeholder={
                      captureStyle === "wholeConversation"
                        ? "Transcript appears here. You can also paste a meeting transcript or type a summary."
                        : "Captured answers appear here. You can also type notes manually."
                    }
                  />
                </label>

                <label className="cca-field">
                  <span>Extra notes</span>
                  <textarea
                    className="cca-notesArea"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Add any extra notes or customer wording here..."
                  />
                </label>

                {liveTranscript ? <p className="cca-statusLive">Listening: {liveTranscript}</p> : null}
                {statusMessage ? <p className="cca-statusText">{statusMessage}</p> : null}
              </section>

              <aside className="cca-helperPanel">
                <article className="cca-helperHero">
                  <span>Wingman thinks</span>
                  <h3>{interpretation.summary}</h3>
                </article>

                <article className="cca-helperCard cca-actionCard">
                  <span>Ask this next</span>
                  <strong>{interpretation.askNext}</strong>
                </article>

                <article className="cca-helperCard">
                  <span>Missing detail</span>
                  <div className="cca-chipCloud">
                    {interpretation.missing.map((item) => (
                      <em key={item}>{item}</em>
                    ))}
                  </div>
                </article>

                <article className="cca-helperCard">
                  <span>Likely WyreStorm direction</span>
                  <ul>
                    {interpretation.direction.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </article>

                {interpretation.suggestedType !== conversationTypeId ? (
                  <article className="cca-helperCard cca-suggestionCard">
                    <span>Suggested shift</span>
                    <strong>{getConversationType(interpretation.suggestedType).title}</strong>
                    <button type="button" className="cca-primary" onClick={() => shiftConversation(interpretation.suggestedType)}>
                      Switch now
                    </button>
                  </article>
                ) : null}
              </aside>
            </div>

            <footer className="cca-footer">
              <button type="button" onClick={() => setStep("context")}>Back</button>
              <span>{captureStyle === "wholeConversation" ? "Capture the call, then hand it off." : `Current path: ${conversationType.shortTitle}`}</span>
              <button type="button" className="cca-primary" onClick={() => setStep("handoff")}>Continue to handoff</button>
            </footer>
          </section>
        ) : null}

        {step === "handoff" ? (
          <section className="cca-card">
            <p className="cca-kicker">Step 4 of 4</p>
            <h2>Hand off the opportunity</h2>
            <p className="cca-lead">Move the captured conversation into the most useful Wingman workflow.</p>

            <div className="cca-handoffGrid">
              <button type="button" className="is-primary" onClick={() => goToRoute(conversationType.route)}>
                <strong>{conversationType.routeLabel}</strong>
                <span>Best next route for this conversation type.</span>
              </button>

              <button type="button" onClick={() => goToRoute("/wingman/discovery")}>
                <strong>Open Discovery</strong>
                <span>Use when the requirement still needs structured qualification.</span>
              </button>

              <button type="button" onClick={() => goToRoute("/wingman/proposal")}>
                <strong>Open Proposal</strong>
                <span>Use when the call needs customer-safe wording or output.</span>
              </button>

              <button type="button" onClick={copySummary}>
                <strong>{copied ? "Copied" : "Copy summary"}</strong>
                <span>Copy the captured conversation and Wingman interpretation.</span>
              </button>
            </div>

            <div className="cca-summaryBox">
              <article>
                <span>Conversation type</span>
                <strong>{conversationType.title}</strong>
              </article>
              <article>
                <span>Audience</span>
                <strong>{audience.label}</strong>
              </article>
              <article>
                <span>Ask next</span>
                <strong>{interpretation.askNext}</strong>
              </article>
            </div>

            <label className="cca-field">
              <span>Captured conversation / notes</span>
              <textarea
                className="cca-summaryArea"
                value={transcript + (notes.trim() ? `\n\nNotes:\n${notes}` : "")}
                onChange={() => {}}
                readOnly
              />
            </label>

            {statusMessage ? <p className="cca-statusText">{statusMessage}</p> : null}

            <footer className="cca-footer">
              <button type="button" onClick={() => setStep("capture")}>Back</button>
              <span>Ready to start another call?</span>
              <button type="button" className="cca-primary" onClick={startNewCall}>Start new call</button>
            </footer>
          </section>
        ) : null}
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
    radial-gradient(circle at top right, rgba(245, 158, 11, 0.12), transparent 34%),
    linear-gradient(180deg, #f8fafc 0%, #eef3f8 100%);
}

.cca-page * {
  box-sizing: border-box;
}

.cca-shell {
  width: min(1220px, 100%);
  min-height: calc(100vh - 104px);
  margin: 0 auto;
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  gap: 10px;
}

.cca-header,
.cca-stepper,
.cca-card,
.cca-liveCard {
  border: 1px solid rgba(148, 163, 184, 0.26);
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.07);
}

.cca-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  border-radius: 22px;
  padding: 12px 16px;
}

.cca-header p,
.cca-kicker {
  margin: 0;
  color: #b45309;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.cca-header h1 {
  margin: 4px 0 0;
  color: #0f172a;
  font-size: clamp(1.45rem, 2.4vw, 1.95rem);
  line-height: 1;
  letter-spacing: -0.04em;
}

.cca-header span {
  display: block;
  margin-top: 6px;
  color: #64748b;
  font-size: 0.88rem;
  line-height: 1.35;
}

.cca-stepper {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  border-radius: 18px;
  padding: 10px;
}

.cca-stepper button {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 14px;
  padding: 8px 10px;
  color: #64748b;
  background: #f8fafc;
  text-align: left;
  cursor: pointer;
}

.cca-stepper button strong {
  display: grid;
  width: 26px;
  height: 26px;
  place-items: center;
  border-radius: 999px;
  color: #64748b;
  background: #e2e8f0;
  font-size: 0.78rem;
}

.cca-stepper button span {
  font-size: 0.8rem;
  font-weight: 620;
}

.cca-stepper button.is-active {
  color: #111827;
  border-color: rgba(245, 158, 11, 0.85);
  background: #fffbeb;
}

.cca-stepper button.is-active strong {
  color: #111827;
  background: #fbbf24;
}

.cca-card,
.cca-liveCard {
  border-radius: 24px;
  padding: 20px;
  overflow: hidden;
}

.cca-card h2,
.cca-liveCard h2 {
  margin: 8px 0 0;
  color: #0f172a;
  font-size: clamp(1.5rem, 2.5vw, 2.2rem);
  line-height: 1.06;
  letter-spacing: -0.05em;
}

.cca-lead {
  max-width: 820px;
  margin: 10px 0 20px;
  color: #64748b;
  font-size: 0.96rem;
  line-height: 1.38;
}

.cca-section {
  margin-top: 20px;
}

.cca-section h3 {
  margin: 0 0 10px;
  color: #0f172a;
  font-size: 1rem;
}

.cca-typeGrid,
.cca-handoffGrid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.cca-typeGrid button,
.cca-handoffGrid button {
  min-height: 110px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  border-radius: 20px;
  padding: 14px;
  color: #0f172a;
  background: #ffffff;
  text-align: left;
  cursor: pointer;
}

.cca-typeGrid button.is-selected,
.cca-handoffGrid button.is-primary {
  border-color: rgba(245, 158, 11, 0.92);
  background: #fffbeb;
  box-shadow: inset 5px 0 0 #f59e0b, 0 12px 24px rgba(245, 158, 11, 0.12);
}

.cca-typeGrid strong,
.cca-handoffGrid strong {
  display: block;
  font-size: 1rem;
}

.cca-typeGrid span,
.cca-handoffGrid span {
  display: block;
  margin-top: 6px;
  color: #64748b;
  font-size: 0.86rem;
  line-height: 1.32;
}

.cca-twoCols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-top: 16px;
}

.cca-field {
  display: grid;
  gap: 7px;
  color: #92400e;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.cca-field input,
.cca-field select,
.cca-field textarea {
  width: 100%;
  border: 1px solid rgba(148, 163, 184, 0.34);
  border-radius: 16px;
  padding: 0 12px;
  color: #0f172a;
  background: #ffffff;
  font: inherit;
  outline: none;
  text-transform: none;
  letter-spacing: normal;
  font-weight: 400;
}

.cca-field input,
.cca-field select {
  height: 42px;
  font-size: 0.86rem;
}

.cca-field textarea {
  resize: none;
  padding: 12px;
  font-size: 0.88rem;
  line-height: 1.36;
}

.cca-grow textarea {
  min-height: 260px;
}

.cca-notesArea {
  min-height: 120px;
}

.cca-summaryArea {
  min-height: 180px;
}

.cca-chipRow,
.cca-questionActions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.cca-chipRow button,
.cca-questionActions button,
.cca-footer button,
.cca-helperCard button {
  min-height: 32px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  border-radius: 999px;
  padding: 0 12px;
  color: #334155;
  background: #f8fafc;
  font-size: 0.76rem;
  cursor: pointer;
}

.cca-chipRow button.is-selected,
.cca-primary,
.cca-footer .cca-primary,
.cca-helperCard .cca-primary {
  color: #ffffff;
  border-color: #0f172a;
  background: #0f172a;
}

.cca-helper {
  margin: 8px 0 0;
  color: #64748b;
  font-size: 0.82rem;
}

.cca-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-top: 22px;
  padding-top: 16px;
  border-top: 1px solid rgba(148, 163, 184, 0.2);
}

.cca-footer span {
  color: #64748b;
  font-size: 0.84rem;
}

.cca-liveCard {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  gap: 14px;
}

.cca-liveHeader {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 380px;
  gap: 12px;
  align-items: start;
}

.cca-quickShift {
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 18px;
  padding: 12px;
  background: #f8fafc;
}

.cca-quickShift span {
  display: block;
  margin-bottom: 8px;
  color: #92400e;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.cca-liveLayout {
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.9fr);
  gap: 12px;
}

.cca-capturePanel,
.cca-helperPanel {
  min-height: 0;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 20px;
  padding: 14px;
  background: #ffffff;
}

.cca-capturePanel {
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr) auto auto auto;
  gap: 12px;
}

.cca-questionCard {
  border: 1px solid rgba(245, 158, 11, 0.36);
  border-radius: 20px;
  padding: 16px;
  background: #fffbeb;
}

.cca-questionCard span,
.cca-helperHero span,
.cca-helperCard span,
.cca-summaryBox span {
  color: #92400e;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.cca-questionCard h3 {
  margin: 10px 0 0;
  color: #111827;
  font-size: clamp(1.25rem, 2vw, 1.8rem);
  line-height: 1.18;
  letter-spacing: -0.03em;
}

.cca-openMic {
  min-height: 60px;
  border: 0;
  border-radius: 18px;
  color: #ffffff;
  background: #0f172a;
  font-size: 1rem;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 14px 24px rgba(15, 23, 42, 0.18);
}

.cca-openMic.is-listening {
  background: #dc2626;
}

.cca-helperPanel {
  display: grid;
  grid-template-rows: auto auto auto auto auto;
  gap: 10px;
}

.cca-helperHero,
.cca-helperCard {
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 18px;
  padding: 12px;
  background: #f8fafc;
}

.cca-helperHero h3 {
  margin: 8px 0 0;
  color: #111827;
  font-size: 1rem;
  line-height: 1.28;
}

.cca-actionCard {
  border-color: rgba(245, 158, 11, 0.34);
  background: #fffbeb;
}

.cca-actionCard strong,
.cca-suggestionCard strong,
.cca-summaryBox strong {
  display: block;
  margin-top: 6px;
  color: #0f172a;
  font-size: 0.96rem;
  line-height: 1.26;
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

.cca-helperCard ul {
  margin: 8px 0 0;
  padding-left: 18px;
}

.cca-helperCard li {
  color: #334155;
  font-size: 0.82rem;
  line-height: 1.32;
}

.cca-suggestionCard {
  display: grid;
  gap: 8px;
}

.cca-summaryBox {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin: 18px 0;
}

.cca-summaryBox article {
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 18px;
  padding: 12px;
  background: #f8fafc;
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

@media (max-width: 1120px) {
  .cca-shell {
    min-height: 0;
  }

  .cca-stepper,
  .cca-typeGrid,
  .cca-handoffGrid,
  .cca-twoCols,
  .cca-liveHeader,
  .cca-liveLayout,
  .cca-summaryBox {
    grid-template-columns: 1fr;
  }

  .cca-card,
  .cca-liveCard {
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

  .cca-stepper {
    grid-template-columns: repeat(2, 1fr);
  }

  .cca-footer {
    display: grid;
  }
}
`;