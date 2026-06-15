import { useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0: { transcript: string };
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
};

type SpeechRecognitionErrorEventLike = {
  error?: string;
  message?: string;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type WindowWithSpeechRecognition = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

type VoiceTarget = HTMLInputElement | HTMLTextAreaElement;

type OverlayPosition = {
  top: number;
  left: number;
  width: number;
};

const speechTargetTypes = new Set(["", "text", "search", "email", "tel", "url"]);

function getSpeechRecognitionConstructor() {
  if (typeof window === "undefined") return null;
  const speechWindow = window as WindowWithSpeechRecognition;
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

function isVoiceTarget(element: EventTarget | null): element is VoiceTarget {
  if (element instanceof HTMLTextAreaElement) {
    return !element.disabled && !element.readOnly;
  }

  if (!(element instanceof HTMLInputElement)) {
    return false;
  }

  return !element.disabled && !element.readOnly && speechTargetTypes.has(element.type || "text");
}

function getTargetLabel(target: VoiceTarget) {
  const explicitLabel = target.getAttribute("aria-label") || target.getAttribute("placeholder") || target.name;

  if (explicitLabel) {
    return explicitLabel;
  }

  if (target.id) {
    const label = document.querySelector<HTMLLabelElement>(`label[for="${target.id.replace(/"/g, "\\\"")}"]`);
    if (label?.textContent?.trim()) {
      return label.textContent.trim();
    }
  }

  const wrapperLabel = target.closest("label");
  if (wrapperLabel?.textContent?.trim()) {
    return wrapperLabel.textContent.trim();
  }

  return "active answer field";
}

function getPositionForTarget(target: VoiceTarget): OverlayPosition | null {
  const rect = target.getBoundingClientRect();

  if (rect.width <= 0 || rect.height <= 0) {
    return null;
  }

  const buttonWidth = 40;
  const gap = 8;
  const left = Math.max(12, Math.min(window.innerWidth - buttonWidth - 12, rect.right - buttonWidth - gap));
  const top = Math.max(12, Math.min(window.innerHeight - buttonWidth - 12, rect.top + gap));

  return {
    top,
    left,
    width: buttonWidth,
  };
}

function cleanTranscript(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function setNativeValue(target: VoiceTarget, value: string) {
  const prototype = Object.getPrototypeOf(target) as HTMLInputElement | HTMLTextAreaElement;
  const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");

  if (descriptor?.set) {
    descriptor.set.call(target, value);
  } else {
    target.value = value;
  }

  target.dispatchEvent(new Event("input", { bubbles: true }));
  target.dispatchEvent(new Event("change", { bubbles: true }));
}

export function VoiceAnswerCaptureOverlay() {
  const [supported, setSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [position, setPosition] = useState<OverlayPosition | null>(null);
  const [fieldLabel, setFieldLabel] = useState("active answer field");
  const [message, setMessage] = useState("Click to dictate the customer answer");

  const targetRef = useRef<VoiceTarget | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const initialValueRef = useRef("");
  const selectionStartRef = useRef(0);
  const selectionEndRef = useRef(0);
  const finalTranscriptRef = useRef("");

  useEffect(() => {
    setSupported(Boolean(getSpeechRecognitionConstructor()));

    function updateTargetPosition() {
      const target = targetRef.current;

      if (!target || !document.body.contains(target)) {
        setPosition(null);
        targetRef.current = null;
        return;
      }

      setPosition(getPositionForTarget(target));
    }

    function handleFocusIn(event: FocusEvent) {
      if (!isVoiceTarget(event.target)) {
        return;
      }

      targetRef.current = event.target;
      setFieldLabel(getTargetLabel(event.target));
      setMessage("Click to dictate the customer answer");
      setPosition(getPositionForTarget(event.target));
    }

    function handleFocusOut(event: FocusEvent) {
      const nextTarget = event.relatedTarget;

      if (nextTarget instanceof HTMLElement && nextTarget.closest("[data-wingman-voice-capture]")) {
        return;
      }

      window.setTimeout(() => {
        if (recognitionRef.current) return;

        if (!isVoiceTarget(document.activeElement)) {
          targetRef.current = null;
          setPosition(null);
        }
      }, 80);
    }

    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("focusout", handleFocusOut);
    window.addEventListener("resize", updateTargetPosition);
    window.addEventListener("scroll", updateTargetPosition, true);

    return () => {
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("focusout", handleFocusOut);
      window.removeEventListener("resize", updateTargetPosition);
      window.removeEventListener("scroll", updateTargetPosition, true);
      recognitionRef.current?.abort();
    };
  }, []);

  function applyTranscript(transcript: string) {
    const target = targetRef.current;
    const cleaned = cleanTranscript(transcript);

    if (!target || !cleaned) {
      return;
    }

    const initialValue = initialValueRef.current;
    const start = selectionStartRef.current;
    const end = selectionEndRef.current;
    const before = initialValue.slice(0, start);
    const after = initialValue.slice(end);
    const prefix = before && !/\s$/.test(before) ? " " : "";
    const suffix = after && !/^\s/.test(after) ? " " : "";
    const nextValue = `${before}${prefix}${cleaned}${suffix}${after}`;
    const cursorPosition = before.length + prefix.length + cleaned.length;

    setNativeValue(target, nextValue);
    target.focus({ preventScroll: true });

    try {
      target.setSelectionRange(cursorPosition, cursorPosition);
    } catch {
      // Some input types do not support setSelectionRange. Those are filtered out, but keep this defensive.
    }
  }

  function stopListening() {
    recognitionRef.current?.stop();
  }

  function startListening() {
    const target = targetRef.current;
    const SpeechRecognition = getSpeechRecognitionConstructor();

    if (!target || !SpeechRecognition) {
      setMessage("Speech capture is not supported in this browser");
      return;
    }

    recognitionRef.current?.abort();

    initialValueRef.current = target.value;
    selectionStartRef.current = typeof target.selectionStart === "number" ? target.selectionStart : target.value.length;
    selectionEndRef.current = typeof target.selectionEnd === "number" ? target.selectionEnd : selectionStartRef.current;
    finalTranscriptRef.current = "";

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = navigator.language || "en-GB";

    recognition.onstart = () => {
      setIsListening(true);
      setMessage(`Listening for ${fieldLabel}`);
    };

    recognition.onresult = (event) => {
      let interimTranscript = "";

      const startIndex = event.resultIndex ?? 0;

      for (let index = startIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result[0]?.transcript || "";

        if (result.isFinal) {
          finalTranscriptRef.current = `${finalTranscriptRef.current} ${transcript}`.trim();
        } else {
          interimTranscript = `${interimTranscript} ${transcript}`.trim();
        }
      }

      const combinedTranscript = cleanTranscript(`${finalTranscriptRef.current} ${interimTranscript}`);
      applyTranscript(combinedTranscript);
    };

    recognition.onerror = (event) => {
      const error = event.error || event.message || "speech capture stopped";
      setMessage(`Voice capture issue: ${error}`);
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      setIsListening(false);
      setMessage(finalTranscriptRef.current ? "Voice answer captured" : "Voice capture stopped");
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setIsListening(false);
      setMessage("Voice capture could not start");
    }
  }

  if (!supported || !position) {
    return null;
  }

  return (
    <div
      data-wingman-voice-capture="true"
      style={{
        position: "fixed",
        top: position.top,
        left: position.left,
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        gap: 8,
        pointerEvents: "none",
      }}
    >
      <button
        type="button"
        aria-label={isListening ? "Stop voice capture" : `Dictate answer for ${fieldLabel}`}
        title={message}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => (isListening ? stopListening() : startListening())}
        style={{
          width: position.width,
          height: position.width,
          borderRadius: 999,
          border: isListening ? "1px solid rgba(220, 38, 38, 0.55)" : "1px solid rgba(15, 23, 42, 0.18)",
          background: isListening ? "#dc2626" : "#ffffff",
          color: isListening ? "#ffffff" : "#0f172a",
          boxShadow: "0 12px 30px rgba(15, 23, 42, 0.2)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          pointerEvents: "auto",
        }}
      >
        {isListening ? <MicOff size={18} aria-hidden="true" /> : <Mic size={18} aria-hidden="true" />}
      </button>
      {isListening ? (
        <span
          aria-live="polite"
          style={{
            borderRadius: 999,
            background: "rgba(15, 23, 42, 0.9)",
            color: "#ffffff",
            fontSize: 12,
            lineHeight: "18px",
            padding: "4px 8px",
            boxShadow: "0 12px 30px rgba(15, 23, 42, 0.18)",
            pointerEvents: "none",
            whiteSpace: "nowrap",
          }}
        >
          Listening…
        </span>
      ) : null}
    </div>
  );
}
