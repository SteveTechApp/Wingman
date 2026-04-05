import "./guru-helper-window.css";
import * as React from "react";
import { createPortal } from "react-dom";
import { Minus, Send, X } from "lucide-react";
import wingmanBot from "../../../assets/branding/wingman-bot.png";

type GuruHelperWindowProps = {
  open: boolean;
  minimized: boolean;
  onClose: () => void;
  onMinimize: () => void;
};

export default function GuruHelperWindow({
  open,
  minimized,
  onClose,
  onMinimize,
}: GuruHelperWindowProps) {
  const [mounted, setMounted] = React.useState(false);
  const [input, setInput] = React.useState("");
  const [messages, setMessages] = React.useState([
    "Guru is ready. Ask about split, extend, switch, matrix, AVoIP, USB, RS232, IR, or Ethernet pass-through."
  ]);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !open || minimized || typeof document === "undefined") return null;

  return createPortal(
    <section className="wm-guru-helper-window" aria-label="Guru helper window">
      <header className="wm-guru-helper-window__header">
        <div className="wm-guru-helper-window__brand">
          <img src={wingmanBot} alt="" className="wm-guru-helper-window__avatar" draggable={false} />
          <div>
            <strong>Guru</strong>
            <div>Floating AV helper</div>
          </div>
        </div>

        <div className="wm-guru-helper-window__actions">
          <button type="button" className="wm-guru-helper-window__icon-btn" onClick={onMinimize} aria-label="Minimize Guru">
            <Minus size={16} />
          </button>
          <button type="button" className="wm-guru-helper-window__icon-btn" onClick={onClose} aria-label="Close Guru">
            <X size={16} />
          </button>
        </div>
      </header>

      <div className="wm-guru-helper-window__body">
        <div className="wm-guru-helper-window__messages">
          {messages.map((message, index) => (
            <div key={index} className="wm-guru-helper-window__message">
              {message}
            </div>
          ))}
        </div>
      </div>

      <footer className="wm-guru-helper-window__footer">
        <input
          className="wm-guru-helper-window__input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && input.trim()) {
              setMessages((current) => [...current, input.trim()]);
              setInput("");
            }
          }}
          placeholder="Ask Guru something..."
        />
        <button
          type="button"
          className="wm-guru-helper-window__send"
          onClick={() => {
            if (!input.trim()) return;
            setMessages((current) => [...current, input.trim()]);
            setInput("");
          }}
          aria-label="Send to Guru"
        >
          <Send size={16} />
        </button>
      </footer>
    </section>,
    document.body
  );
}