import "./guru-tool-host.css";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  CheckCircle2,
  ClipboardList,
  PanelRightClose,
  PanelRightOpen,
  RefreshCcw,
  Send,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import guruIcon from "../../../assets/branding/guru.png";

type MessageRole = "assistant" | "user";
type ConfidenceTone = "High confidence" | "Needs detail";

type GuruSection = {
  label: string;
  value: string;
};

type ChatMessage = {
  id: string;
  role: MessageRole;
  title: string;
  text: string;
  confidence?: ConfidenceTone;
  sections: GuruSection[];
};

const MODE_CHIPS = [
  "Sales mode",
  "Product advice",
  "Proposal support"
] as const;

const CONTEXT_CHIPS = [
  "Use current project",
  "Use product context",
  "Use proposal framing"
] as const;

const STARTER_PROMPTS = [
  "Recommend a WyreStorm solution for a 4-display divisible meeting room.",
  "Compare HDBT vs AVoIP for a classroom building.",
  "Which WyreStorm presentation switchers support AirPlay or Miracast?",
  "Create a simple BOM direction for a 3x3 video wall."
] as const;

function createId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function hasAny(text: string, phrases: string[]): boolean {
  return phrases.some((phrase) => text.includes(phrase));
}

function buildGuruReply(question: string, activeContext: string[]): ChatMessage {
  const q = question.trim().toLowerCase();

  let detailScore = 0;

  if (
    hasAny(q, [
      "meeting room",
      "boardroom",
      "conference room",
      "classroom",
      "training room",
      "video wall",
      "multiview",
      "multi view",
      "mtr",
      "teams room",
      "byod"
    ])
  ) {
    detailScore += 1;
  }

  if (
    hasAny(q, [
      "hdmi",
      "usb-c",
      "usb c",
      "wireless",
      "miracast",
      "airplay",
      "ndi",
      "av over ip",
      "avoip",
      "hdbaset",
      "hdbt",
      "camera",
      "mic"
    ])
  ) {
    detailScore += 1;
  }

  if (
    hasAny(q, [
      "distance",
      "metre",
      "meter",
      "display",
      "projector",
      "source",
      "control",
      "audio",
      "touch panel",
      "usb",
      "speaker"
    ])
  ) {
    detailScore += 1;
  }

  if (question.trim().length > 90) {
    detailScore += 1;
  }

  if (activeContext.length > 0) {
    detailScore += 1;
  }

  let confidence: ConfidenceTone = "Needs detail";

  if (detailScore >= 3) {
    confidence = "High confidence";
  }

  let title = "Best starting direction";
  let text =
    "I can narrow this down quickly, but I still need a few technical basics to avoid a weak recommendation.";

  const sections: GuruSection[] = [];

  if (hasAny(q, ["video wall", "videowall", "2x2", "3x3", "4x4"])) {
    title = "Video wall direction";
    text = "This is the strongest starting direction from the detail provided.";

    sections.push({
      label: "Recommendation",
      value:
        "For a fixed non-AVoIP 4K60 video wall, start with SW-0206-VW when a single appliance and simpler control flow is the priority."
    });

    sections.push({
      label: "When to step up",
      value:
        "Move to an AVoIP design using NHD-100 or NHD-500 series when you need flexible routing, more distributed source locations, or easier future expansion."
    });

    sections.push({
      label: "Need to confirm",
      value:
        "Wall size, source count, native output resolution, bezel compensation needs, audio breakaway, control method, and real installed cable path lengths."
    });
  }

  if (sections.length === 0 && hasAny(q, ["multiview", "multi view", "multi-view", "quad view"])) {
    title = "Multiview direction";
    text = "This is the cleanest WyreStorm path for a multiview requirement.";

    sections.push({
      label: "Recommendation",
      value:
        "Start with NHD-0401-MV for a straightforward 4x1 multiview requirement."
    });

    sections.push({
      label: "AVoIP path",
      value:
        "If the design already uses NHD-100 series, consider NHD-150-RX when you want composited viewing inside the AVoIP system."
    });

    sections.push({
      label: "NDI workflow",
      value:
        "NDI cameras can be bridged into NHD-100 designs with NHD-128-NDI-BRG, then composed for local multiview use or returned as a single output."
    });

    sections.push({
      label: "Need to confirm",
      value:
        "Source count, preferred layout, audio follow requirements, and whether the composed output must stay on AVoIP or return to NDI."
    });
  }

  if (
    sections.length === 0 &&
    hasAny(q, ["meeting room", "boardroom", "conference room", "mtr", "teams room", "byod"])
  ) {
    title = "Meeting room direction";
    text = "This is the best starting commercial direction based on the current scope.";

    sections.push({
      label: "Recommendation",
      value:
        "For presentation switching in meeting spaces, start by checking whether MX-0402-MST or MX-0403-H3-MST fits the display count, source mix, and extension requirement."
    });

    sections.push({
      label: "UC camera bar option",
      value:
        "If the room also needs a front-end conferencing bar, review Apollo APO-VX20-UC v2 as part of the room package."
    });

    sections.push({
      label: "Need to confirm",
      value:
        "Single or dual display, local versus remote sources, USB host and device needs, wireless casting expectations, and whether the room is native MTR, BYOD, or mixed use."
    });
  }

  if (sections.length === 0 && hasAny(q, ["classroom", "training room", "lecture", "education"])) {
    title = "Education room direction";
    text = "This gives you a sensible first pass for an education or training space.";

    sections.push({
      label: "Recommendation",
      value:
        "Start with a presentation-switching design when the room is lecturer-led and source distances are manageable. Move to AVoIP when routing flexibility, multiple destination displays, or phased growth are important."
    });

    sections.push({
      label: "Why",
      value:
        "Education spaces often change source mix over time, so it is worth deciding early whether the room is a simple teaching space or part of a larger routed building strategy."
    });

    sections.push({
      label: "Need to confirm",
      value:
        "Interactive display or projector, instructor USB needs, student collaboration expectations, audio reinforcement, recording or streaming, and actual installed distances."
    });
  }

  if (sections.length === 0 && hasAny(q, ["ndi", "camera", "stream", "broadcast"])) {
    title = "Camera and NDI direction";
    text = "This is the strongest path when cameras and IP workflows are part of the scope.";

    sections.push({
      label: "Recommendation",
      value:
        "Where NDI camera feeds need to enter an NHD-100 design, review NHD-128-NDI-BRG as the bridge point into the wider system."
    });

    sections.push({
      label: "Compositing path",
      value:
        "Use NHD-150-RX when the goal is to compose feeds and present them as a multiview output within the design."
    });

    sections.push({
      label: "Need to confirm",
      value:
        "How many cameras, whether the destination is local multiview, room display, or network return, and what latency tolerance is acceptable."
    });
  }

  if (sections.length === 0) {
    title = "Scoping direction";

    sections.push({
      label: "Best next step",
      value:
        "Give me the room type, source devices, output count, installed distances, USB requirements, and control expectations. I can then narrow this to a few WyreStorm options instead of a generic answer."
    });

    sections.push({
      label: "Useful starting detail",
      value:
        "Room type, number of displays, HDMI versus USB-C, wireless casting needs, video transport method, audio needs, and whether this becomes part of a larger building system."
    });
  }

  if (confidence === "High confidence") {
    text = "This is the best starting direction based on the detail provided.";
  }

  if (activeContext.includes("Use current project")) {
    sections.push({
      label: "Project context",
      value:
        "Current project context is enabled, so the next question should be framed against the live job where possible."
    });
  }

  if (activeContext.includes("Use product context")) {
    sections.push({
      label: "Product context",
      value:
        "Product context is enabled, so the next answer should stay tighter to likely WyreStorm families and SKUs."
    });
  }

  if (activeContext.includes("Use proposal framing")) {
    sections.push({
      label: "Proposal framing",
      value:
        "Proposal framing is enabled, so the next answer should lean toward a recommendation plus assumptions and a commercial next step."
    });
  }

  return {
    id: createId("assistant"),
    role: "assistant",
    title,
    text,
    confidence,
    sections
  };
}

function createWelcomeMessage(): ChatMessage {
  return {
    id: createId("assistant"),
    role: "assistant",
    title: "Ask Guru anything",
    text:
      "Describe the room, source devices, outputs, distances, USB needs, and control requirements. Guru should then drive the next technical questions and narrow to a few WyreStorm directions.",
    confidence: "High confidence",
    sections: [
      {
        label: "Best use",
        value:
          "Product advice, architecture direction, proposal support, and quick qualification before you move deeper into Discovery, Catalogue, or Proposal."
      }
    ]
  };
}

export default function GuruToolHostPage() {
  const [activeMode, setActiveMode] = useState<(typeof MODE_CHIPS)[number]>("Sales mode");
  const [activeContext, setActiveContext] = useState<string[]>([
    "Use product context",
    "Use proposal framing"
  ]);
  const [composer, setComposer] = useState("");
  const [railOpen, setRailOpen] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([createWelcomeMessage()]);

  const threadEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const lastUserQuestion = useMemo(() => {
    const reversed = [...messages].reverse();
    const lastUser = reversed.find((message) => message.role === "user");
    return lastUser?.text ?? "No question asked yet.";
  }, [messages]);

  const assistantReplyCount = useMemo(() => {
    return messages.filter((message) => message.role === "assistant").length;
  }, [messages]);

  const submitQuestion = (rawValue?: string) => {
    const nextQuestion = (rawValue ?? composer).trim();
    if (nextQuestion.length === 0) {
      return;
    }

    const userMessage: ChatMessage = {
      id: createId("user"),
      role: "user",
      title: "Question",
      text: nextQuestion,
      sections: []
    };

    const assistantMessage = buildGuruReply(nextQuestion, activeContext);

    setMessages((current) => [...current, userMessage, assistantMessage]);
    setComposer("");
  };

  const clearConversation = () => {
    setMessages([createWelcomeMessage()]);
    setComposer("");
  };

  const toggleContext = (value: string) => {
    setActiveContext((current) => {
      if (current.includes(value)) {
        return current.filter((item) => item !== value);
      }

      return [...current, value];
    });
  };

  return (
    <div className="wm-guru-host">
      <header className="wm-guru-header">
        <div className="wm-guru-header__intro">
          <div className="wm-guru-header__avatar" aria-hidden="true">
            <img src={guruIcon} alt="" className="wm-guru-header__avatar-image" />
          </div>

          <div className="wm-guru-header__copy">
            <div className="wm-guru-header__eyebrow">Quick reference</div>
            <h1 className="wm-guru-header__title">Guru</h1>
            <p className="wm-guru-header__subtitle">
              Product advice, system guidance, and proposal support without the wasted landing-page filler.
            </p>
          </div>
        </div>

        <div className="wm-guru-header__actions">
          <div className="wm-guru-chip-row">
            {MODE_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                className={`wm-guru-chip ${chip === activeMode ? "is-active" : ""}`}
                onClick={() => setActiveMode(chip)}
              >
                {chip}
              </button>
            ))}
          </div>

          <div className="wm-guru-toolbar">
            <button
              type="button"
              className="wm-guru-toolbar__button"
              onClick={() => setRailOpen((current) => !current)}
              aria-pressed={railOpen}
            >
              {railOpen ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
              {railOpen ? "Hide context" : "Show context"}
            </button>

            <button
              type="button"
              className="wm-guru-toolbar__button"
              onClick={clearConversation}
            >
              <RefreshCcw size={16} />
              Clear conversation
            </button>
          </div>
        </div>
      </header>

      <section className={`wm-guru-body ${railOpen ? "" : "wm-guru-body--collapsed"}`}>
        <main className="wm-guru-thread-panel">
          <div className="wm-guru-thread">
            {messages.length === 1 ? (
              <div className="wm-guru-starter-panel">
                <div className="wm-guru-starter-panel__title">Start with a real working prompt</div>
                <div className="wm-guru-starter-list">
                  {STARTER_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      className="wm-guru-starter"
                      onClick={() => submitQuestion(prompt)}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {messages.map((message) => (
              <article
                key={message.id}
                className={`wm-guru-message wm-guru-message--${message.role}`}
              >
                <div className="wm-guru-message__meta">
                  <span className="wm-guru-role-pill">
                    {message.role === "assistant" ? <Bot size={14} /> : <Sparkles size={14} />}
                    {message.role === "assistant" ? "Guru" : "You"}
                  </span>

                  {message.confidence ? (
                    <span className="wm-guru-confidence-pill">
                      {message.confidence === "High confidence" ? (
                        <CheckCircle2 size={14} />
                      ) : (
                        <ShieldCheck size={14} />
                      )}
                      {message.confidence}
                    </span>
                  ) : null}
                </div>

                <h2 className="wm-guru-message__title">{message.title}</h2>
                <p className="wm-guru-message__text">{message.text}</p>

                {message.sections.length > 0 ? (
                  <div className="wm-guru-section-grid">
                    {message.sections.map((section) => (
                      <section key={`${message.id}-${section.label}`} className="wm-guru-section-card">
                        <div className="wm-guru-section-card__label">{section.label}</div>
                        <p className="wm-guru-section-card__value">{section.value}</p>
                      </section>
                    ))}
                  </div>
                ) : null}
              </article>
            ))}

            <div ref={threadEndRef} />
          </div>

          <form
            className="wm-guru-composer"
            onSubmit={(event) => {
              event.preventDefault();
              submitQuestion();
            }}
          >
            <label htmlFor="guru-composer" className="wm-guru-composer__label">
              Ask Guru
            </label>

            <textarea
              id="guru-composer"
              className="wm-guru-composer__input"
              rows={3}
              value={composer}
              onChange={(event) => setComposer(event.target.value)}
              placeholder="Describe the room, sources, outputs, distances, USB needs, control requirements, and what the user is trying to achieve."
            />

            <div className="wm-guru-composer__footer">
              <div className="wm-guru-chip-row">
                {CONTEXT_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    className={`wm-guru-chip ${activeContext.includes(chip) ? "is-active" : ""}`}
                    onClick={() => toggleContext(chip)}
                  >
                    {chip}
                  </button>
                ))}
              </div>

              <button type="submit" className="wm-guru-send-button">
                <Send size={16} />
                Send
              </button>
            </div>
          </form>
        </main>

        {railOpen ? (
          <aside className="wm-guru-rail">
            <section className="wm-guru-rail-card">
              <div className="wm-guru-rail-card__eyebrow">Context</div>
              <h2 className="wm-guru-rail-card__title">Current handoff</h2>
              <p className="wm-guru-rail-card__text">
                No handoff loaded. Open Guru from Product Finder, Discovery, or Proposal when you want the page to inherit tighter working context.
              </p>
            </section>

            <section className="wm-guru-rail-card">
              <div className="wm-guru-rail-card__eyebrow">Conversation snapshot</div>
              <h2 className="wm-guru-rail-card__title">Working state</h2>

              <div className="wm-guru-rail-stat">
                <ClipboardList size={16} />
                <span>{messages.length} messages in thread</span>
              </div>

              <div className="wm-guru-rail-stat">
                <Bot size={16} />
                <span>{assistantReplyCount} Guru responses</span>
              </div>

              <div className="wm-guru-rail-stat">
                <Sparkles size={16} />
                <span>Mode: {activeMode}</span>
              </div>

              <div className="wm-guru-rail-card__caption">Last question</div>
              <p className="wm-guru-rail-card__text">{lastUserQuestion}</p>
            </section>

            <section className="wm-guru-rail-card">
              <div className="wm-guru-rail-card__eyebrow">Best use</div>
              <h2 className="wm-guru-rail-card__title">Keep Guru conversational</h2>
              <p className="wm-guru-rail-card__text">
                Ask for a recommendation, then let Guru tighten the requirement with a few targeted technical questions instead of showing a passive information page.
              </p>

              <div className="wm-guru-mini-list">
                <div className="wm-guru-mini-list__item">
                  <CheckCircle2 size={16} />
                  Recommendation plus why
                </div>
                <div className="wm-guru-mini-list__item">
                  <CheckCircle2 size={16} />
                  Key assumptions called out clearly
                </div>
                <div className="wm-guru-mini-list__item">
                  <CheckCircle2 size={16} />
                  Next question to tighten the design
                </div>
              </div>
            </section>
          </aside>
        ) : null}
      </section>
    </div>
  );
}