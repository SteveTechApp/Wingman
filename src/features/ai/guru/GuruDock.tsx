import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ExternalLink, LoaderCircle, SendHorizonal, User2 } from "lucide-react";
import guruLogo from "@/assets/branding/guru.png";
import { askGuru, type GuruAnswer, type GuruContext } from "@/features/ai/guru/guruApi";

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
  confidence?: GuruAnswer["confidence"];
  sources?: NonNullable<GuruAnswer["sources"]>;
  suggestedSkus?: NonNullable<GuruAnswer["suggestedSkus"]>;
  explanation?: GuruAnswer["explanation"];
  isError?: boolean;
};

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function modeForPath(pathname: string): GuruContext["mode"] {
  if (
    pathname.startsWith("/app/tools/training") ||
    pathname.startsWith("/app/tools/compare") ||
    pathname.startsWith("/app/tools/product-intelligence")
  ) {
    return "resources";
  }

  if (
    pathname.startsWith("/app/tools/discovery") ||
    pathname.startsWith("/app/tools/video-wall") ||
    pathname.startsWith("/app/tools/proposal")
  ) {
    return "project-check";
  }

  return "ask";
}

function welcomeTextForPath(pathname: string): string {
  if (pathname.startsWith("/app/tools/discovery")) {
    return "Ask Guru about room discovery, transport choices, USB requirements, or how to move from qualification into product direction.";
  }

  if (pathname.startsWith("/app/tools/video-wall")) {
    return "Ask Guru about processor-led walls, AVoIP walls, multiview behaviour, or how to structure a video wall recommendation.";
  }

  if (pathname.startsWith("/app/tools/proposal")) {
    return "Ask Guru to help shape proposal wording, BOM logic, exclusions, assumptions, and architecture explanations.";
  }

  if (pathname.startsWith("/app/dashboard")) {
    return "Ask Guru anything about product selection, architecture direction, competitor matching, or proposal support.";
  }

  return "Ask Guru for WyreStorm product guidance, architecture advice, and commercial support.";
}

function promptSetForPath(pathname: string): string[] {
  if (pathname.startsWith("/app/tools/discovery")) {
    return [
      "What should I qualify before choosing between HDBaseT and AVoIP?",
      "Suggest a WyreStorm direction for a BYOD meeting room with USB camera.",
      "What are the most important missing questions for this project?",
    ];
  }

  if (pathname.startsWith("/app/tools/video-wall")) {
    return [
      "Recommend a simple 3x3 video wall approach.",
      "When should I use SW-0206-VW instead of AVoIP?",
      "What WyreStorm options suit flexible multiview on a wall?",
    ];
  }

  if (pathname.startsWith("/app/tools/proposal")) {
    return [
      "Write a short customer-facing architecture summary.",
      "What assumptions should I list before issuing a quote?",
      "Help me explain why this solution tier is correct.",
    ];
  }

  return [
    "Recommend a WyreStorm solution for a 4-display divisible meeting room.",
    "Compare HDBaseT vs AVoIP for a classroom building.",
    "Which WyreStorm presentation switchers support AirPlay or Miracast?",
    "Create a simple BOM direction for a 3x3 video wall.",
  ];
}

function buildInitialMessage(pathname: string): ChatMessage {
  return {
    id: createId("assistant"),
    role: "assistant",
    text: welcomeTextForPath(pathname),
    confidence: "high",
  };
}

function toChatMessage(answer: GuruAnswer): ChatMessage {
  return {
    id: createId("assistant"),
    role: "assistant",
    text: answer.text,
    confidence: answer.confidence,
    sources: answer.sources,
    suggestedSkus: answer.suggestedSkus,
    explanation: answer.explanation,
  };
}

function confidenceLabel(value: GuruAnswer["confidence"] | undefined): string | null {
  if (!value) return null;
  if (value === "high") return "High confidence";
  if (value === "medium") return "Medium confidence";
  return "Low confidence";
}

export default function GuruDock() {
  const location = useLocation();
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    buildInitialMessage(location.pathname),
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const prompts = useMemo(() => promptSetForPath(location.pathname), [location.pathname]);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  function buildContext(): GuruContext {
    return {
      mode: modeForPath(location.pathname),
      notes: `Route: ${location.pathname}`,
      discovery: null,
    };
  }

  async function submitPrompt(prefilled?: string) {
    const prompt = String(prefilled ?? input).trim();
    if (!prompt || sending) return;

    const userMessage: ChatMessage = {
      id: createId("user"),
      role: "user",
      text: prompt,
    };

    setMessages((current) => [...current, userMessage]);
    setInput("");
    setSending(true);

    try {
      const answer = await askGuru(prompt, buildContext());
      setMessages((current) => [...current, toChatMessage(answer)]);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Guru could not answer that question right now.";

      setMessages((current) => [
        ...current,
        {
          id: createId("assistant"),
          role: "assistant",
          text: message,
          confidence: "low",
          isError: true,
        },
      ]);
    } finally {
      setSending(false);
      window.setTimeout(() => textareaRef.current?.focus(), 20);
    }
  }

  function onComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submitPrompt();
    }
  }

  function openSource(source: NonNullable<ChatMessage["sources"]>[number]) {
    if (source.to) {
      navigate(source.to);
      return;
    }

    if (source.url) {
      window.open(source.url, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <div style={dockRootStyle}>
      <div ref={scrollRef} style={messagesViewportStyle}>
        <div style={messagesStackStyle}>
          {messages.map((message) => {
            const isAssistant = message.role === "assistant";
            const label = confidenceLabel(message.confidence);

            return (
              <div
                key={message.id}
                style={{
                  ...messageRowStyle,
                  justifyContent: isAssistant ? "flex-start" : "flex-end",
                }}
              >
                <div
                  style={{
                    ...bubbleWrapStyle,
                    ...(isAssistant ? assistantWrapStyle : userWrapStyle),
                  }}
                >
                  {isAssistant ? (
                    <div style={assistantMetaStyle}>
                      <img src={guruLogo} alt="Guru" style={assistantAvatarStyle} />
                      <div style={assistantNameStyle}>Guru</div>
                      {label ? <div style={confidencePillStyle}>{label}</div> : null}
                    </div>
                  ) : (
                    <div style={userMetaStyle}>
                      <div style={userNameStyle}>You</div>
                      <div style={userAvatarStyle}>
                        <User2 size={14} />
                      </div>
                    </div>
                  )}

                  <div
                    style={{
                      ...bubbleStyle,
                      ...(isAssistant ? assistantBubbleStyle : userBubbleStyle),
                      ...(message.isError ? errorBubbleStyle : null),
                    }}
                  >
                    <div style={messageTextStyle}>{message.text}</div>

                    {message.explanation?.headline ? (
                      <div style={explanationCardStyle}>
                        <div style={explanationHeadlineStyle}>{message.explanation.headline}</div>

                        {message.explanation.why?.length ? (
                          <div style={explanationBlockStyle}>
                            <div style={explanationLabelStyle}>Why</div>
                            <ul style={listStyle}>
                              {message.explanation.why.map((item) => (
                                <li key={item}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}

                        {message.explanation.whatsMissing?.length ? (
                          <div style={explanationBlockStyle}>
                            <div style={explanationLabelStyle}>Still missing</div>
                            <ul style={listStyle}>
                              {message.explanation.whatsMissing.map((item) => (
                                <li key={item}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    {message.suggestedSkus?.length ? (
                      <div style={sectionStyle}>
                        <div style={sectionLabelStyle}>Suggested SKUs</div>
                        <div style={chipWrapStyle}>
                          {message.suggestedSkus.map((item) => (
                            <div key={item.sku} style={skuChipStyle}>
                              <div style={skuTextStyle}>{item.sku}</div>
                              {item.reason ? (
                                <div style={skuReasonStyle}>{item.reason}</div>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {message.sources?.length ? (
                      <div style={sectionStyle}>
                        <div style={sectionLabelStyle}>Sources</div>
                        <div style={chipWrapStyle}>
                          {message.sources.map((source, index) => (
                            <button
                              key={`${source.title}-${index}`}
                              type="button"
                              onClick={() => openSource(source)}
                              style={sourceChipStyle}
                            >
                              <span>{source.title}</span>
                              {source.url ? <ExternalLink size={12} /> : null}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}

          {!sending ? (
            <div style={promptSectionStyle}>
              <div style={sectionLabelStyle}>Try asking</div>
              <div style={promptGridStyle}>
                {prompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => void submitPrompt(prompt)}
                    style={promptButtonStyle}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div style={typingRowStyle}>
              <div style={typingBubbleStyle}>
                <LoaderCircle size={14} className="animate-spin" />
                <span>Guru is thinking…</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={composerWrapStyle}>
        <div style={composerInnerStyle}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={onComposerKeyDown}
            placeholder="Ask Guru about products, architecture, proposals, or competitor alternatives..."
            rows={1}
            style={composerInputStyle}
            disabled={sending}
          />

          <button
            type="button"
            onClick={() => void submitPrompt()}
            disabled={sending || input.trim().length === 0}
            style={{
              ...sendButtonStyle,
              ...(sending || input.trim().length === 0 ? sendButtonDisabledStyle : null),
            }}
            aria-label="Send message"
            title="Send message"
          >
            <SendHorizonal size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

const dockRootStyle: CSSProperties = {
  minHeight: 0,
  height: "100%",
  display: "grid",
  gridTemplateRows: "minmax(0, 1fr) auto",
  background: "linear-gradient(180deg, rgba(5,10,18,0.58), rgba(5,10,18,0.34))",
};

const messagesViewportStyle: CSSProperties = {
  minHeight: 0,
  overflowY: "auto",
  padding: "12px 12px 10px",
};

const messagesStackStyle: CSSProperties = {
  display: "grid",
  gap: 12,
  alignContent: "start",
};

const messageRowStyle: CSSProperties = {
  display: "flex",
  width: "100%",
};

const bubbleWrapStyle: CSSProperties = {
  maxWidth: "100%",
  display: "grid",
  gap: 6,
};

const assistantWrapStyle: CSSProperties = {
  width: "100%",
};

const userWrapStyle: CSSProperties = {
  width: "min(86%, 520px)",
};

const assistantMetaStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  paddingLeft: 2,
};

const assistantAvatarStyle: CSSProperties = {
  width: 22,
  height: 22,
  borderRadius: 999,
  objectFit: "cover",
  boxShadow: "0 0 0 1px rgba(255,255,255,0.08)",
};

const assistantNameStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 800,
  color: "rgba(241,245,249,0.92)",
  letterSpacing: 0.2,
};

const confidencePillStyle: CSSProperties = {
  fontSize: 10,
  lineHeight: 1,
  padding: "4px 7px",
  borderRadius: 999,
  border: "1px solid rgba(96,165,250,0.18)",
  background: "rgba(96,165,250,0.08)",
  color: "rgba(219,234,254,0.9)",
  fontWeight: 700,
};

const userMetaStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: 8,
  paddingRight: 2,
};

const userNameStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 800,
  color: "rgba(241,245,249,0.88)",
};

const userAvatarStyle: CSSProperties = {
  width: 22,
  height: 22,
  borderRadius: 999,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(255,255,255,0.06)",
  color: "rgba(241,245,249,0.88)",
};

const bubbleStyle: CSSProperties = {
  borderRadius: 16,
  padding: "12px 13px",
  boxShadow: "0 8px 24px rgba(2,8,23,0.18)",
};

const assistantBubbleStyle: CSSProperties = {
  border: "1px solid rgba(148,163,184,0.12)",
  background: "linear-gradient(180deg, rgba(15,23,42,0.86), rgba(9,14,24,0.94))",
};

const userBubbleStyle: CSSProperties = {
  border: "1px solid rgba(249,115,22,0.16)",
  background: "linear-gradient(180deg, rgba(249,115,22,0.11), rgba(30,41,59,0.88))",
};

const errorBubbleStyle: CSSProperties = {
  border: "1px solid rgba(239,68,68,0.22)",
  background: "linear-gradient(180deg, rgba(127,29,29,0.22), rgba(30,41,59,0.92))",
};

const messageTextStyle: CSSProperties = {
  whiteSpace: "pre-wrap",
  fontSize: 13,
  lineHeight: 1.55,
  color: "rgba(241,245,249,0.94)",
};

const explanationCardStyle: CSSProperties = {
  marginTop: 12,
  borderRadius: 14,
  padding: 12,
  border: "1px solid rgba(96,165,250,0.14)",
  background: "rgba(59,130,246,0.05)",
  display: "grid",
  gap: 10,
};

const explanationHeadlineStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 800,
  color: "rgba(219,234,254,0.94)",
};

const explanationBlockStyle: CSSProperties = {
  display: "grid",
  gap: 5,
};

const explanationLabelStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 800,
  color: "rgba(191,219,254,0.88)",
  textTransform: "uppercase",
  letterSpacing: 0.5,
};

const listStyle: CSSProperties = {
  margin: 0,
  paddingLeft: 18,
  fontSize: 12,
  lineHeight: 1.5,
  color: "rgba(226,232,240,0.82)",
};

const sectionStyle: CSSProperties = {
  marginTop: 12,
  display: "grid",
  gap: 8,
};

const sectionLabelStyle: CSSProperties = {
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: 0.8,
  textTransform: "uppercase",
  color: "rgba(203,213,225,0.62)",
};

const chipWrapStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
};

const skuChipStyle: CSSProperties = {
  display: "grid",
  gap: 3,
  padding: "8px 10px",
  borderRadius: 12,
  border: "1px solid rgba(34,197,94,0.16)",
  background: "rgba(34,197,94,0.06)",
};

const skuTextStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 800,
  color: "rgba(220,252,231,0.96)",
};

const skuReasonStyle: CSSProperties = {
  fontSize: 11,
  lineHeight: 1.35,
  color: "rgba(220,252,231,0.72)",
  maxWidth: 280,
};

const sourceChipStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "8px 10px",
  borderRadius: 12,
  border: "1px solid rgba(148,163,184,0.16)",
  background: "rgba(255,255,255,0.04)",
  color: "rgba(226,232,240,0.92)",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 700,
};

const promptSectionStyle: CSSProperties = {
  display: "grid",
  gap: 8,
  paddingTop: 4,
};

const promptGridStyle: CSSProperties = {
  display: "grid",
  gap: 8,
};

const promptButtonStyle: CSSProperties = {
  textAlign: "left",
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(148,163,184,0.12)",
  background: "rgba(255,255,255,0.025)",
  color: "rgba(241,245,249,0.92)",
  cursor: "pointer",
  fontSize: 12,
  lineHeight: 1.45,
};

const typingRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "flex-start",
  paddingTop: 4,
};

const typingBubbleStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(148,163,184,0.12)",
  background: "rgba(255,255,255,0.035)",
  color: "rgba(226,232,240,0.82)",
  fontSize: 12,
  fontWeight: 700,
};

const composerWrapStyle: CSSProperties = {
  borderTop: "1px solid rgba(255,255,255,0.06)",
  background: "linear-gradient(180deg, rgba(8,13,22,0.82), rgba(5,9,16,0.96))",
  padding: 12,
};

const composerInnerStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  gap: 10,
  alignItems: "end",
};

const composerInputStyle: CSSProperties = {
  minHeight: 46,
  maxHeight: 120,
  resize: "vertical",
  width: "100%",
  borderRadius: 14,
  border: "1px solid rgba(148,163,184,0.14)",
  background: "rgba(15,23,42,0.88)",
  color: "#f8fafc",
  padding: "12px 13px",
  fontSize: 13,
  lineHeight: 1.45,
  outline: "none",
};

const sendButtonStyle: CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 14,
  border: "1px solid rgba(249,115,22,0.22)",
  background: "linear-gradient(180deg, rgba(249,115,22,0.18), rgba(15,23,42,0.92))",
  color: "#fff",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  boxShadow: "0 10px 24px rgba(2,8,23,0.22)",
};

const sendButtonDisabledStyle: CSSProperties = {
  opacity: 0.48,
  cursor: "not-allowed",
};
