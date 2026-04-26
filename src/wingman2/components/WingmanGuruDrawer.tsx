import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, X } from "lucide-react";
import GuruAssistantAvatar from "./branding/GuruAssistantAvatar";

type WingmanGuruDrawerProps = {
  open: boolean;
  onClose: () => void;
};

type GuruMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  time: string;
};

const quickPrompts = [
  "Suggest a solution for a medium meeting room.",
  "What should I ask to qualify an LED wall opportunity?",
  "Which WyreStorm products fit a BYOD presentation space?",
  "Help me turn a discovery brief into a proposal summary.",
];

function createMessage(role: "assistant" | "user", content: string): GuruMessage {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    role,
    content,
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  };
}

const openingMessage = createMessage(
  "assistant",
  "Hi, I’m Guru. Ask one question at a time and I’ll help you shape the right WyreStorm answer, product path, or proposal response."
);

function buildAssistantReply(prompt: string) {
  return [
    "Got it. I’m treating this as your current working question:",
    `"${prompt}"`,
    "I can now help you with the next best step, the qualifying questions to ask, the likely WyreStorm product path, or wording for a customer-facing answer.",
  ].join(" ");
}

export function WingmanGuruDrawer({ open, onClose }: WingmanGuruDrawerProps) {
  const [messages, setMessages] = useState<GuruMessage[]>([openingMessage]);
  const [draft, setDraft] = useState("");
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
      messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: "smooth" });
    }, 60);

    return () => window.clearTimeout(timer);
  }, [open, messages]);

  function sendMessage(raw: string) {
    const prompt = raw.trim();
    if (!prompt) {
      return;
    }

    const userMessage = createMessage("user", prompt);
    const assistantMessage = createMessage("assistant", buildAssistantReply(prompt));

    setMessages((current) => [...current, userMessage, assistantMessage]);
    setDraft("");
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    sendMessage(draft);
  }

  function handleQuickPrompt(prompt: string) {
    sendMessage(prompt);
  }

  return (
    <>
      <div
        className="wingman-guru-backdrop"
        data-open={open ? "true" : "false"}
        onClick={onClose}
        aria-hidden={open ? "false" : "true"}
      />

      <aside
        className="wingman-guru-drawer"
        data-open={open ? "true" : "false"}
        aria-hidden={open ? "false" : "true"}
      >
        <header className="wingman-guru-drawer-header">
          <div className="wingman-guru-drawer-heading">
            <GuruAssistantAvatar size={42} />
            <div>
              <h2>Guru</h2>
              <p>Simple Q&A assistant for sales guidance, product direction, and proposal support.</p>
            </div>
          </div>

          <button
            type="button"
            className="wingman-guru-close"
            onClick={onClose}
            aria-label="Close Guru assistant"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="wingman-guru-quick-prompts">
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              className="wingman-guru-quick-prompt"
              onClick={() => handleQuickPrompt(prompt)}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>{prompt}</span>
            </button>
          ))}
        </div>

        <div className="wingman-guru-messages" ref={messagesRef}>
          {messages.map((message) => (
            <div
              key={message.id}
              className={[
                "wingman-guru-message",
                message.role === "assistant" ? "wingman-guru-message-assistant" : "wingman-guru-message-user",
              ].join(" ")}
            >
              <div className="wingman-guru-message-meta">
                <span>{message.role === "assistant" ? "Guru" : "You"}</span>
                <small>{message.time}</small>
              </div>
              <div className="wingman-guru-message-bubble">{message.content}</div>
            </div>
          ))}
        </div>

        <form className="wingman-guru-composer" onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className="wingman-guru-input"
            placeholder="Ask Guru a question..."
          />
          <button type="submit" className="wingman-guru-send" aria-label="Send question">
            <Send className="h-4 w-4" />
            <span>Send</span>
          </button>
        </form>
      </aside>
    </>
  );
}

export default WingmanGuruDrawer;