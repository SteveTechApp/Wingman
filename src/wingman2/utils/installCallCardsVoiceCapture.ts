const STYLE_ID = "wm-call-cards-voice-capture-style";
const INSTALL_FLAG = "wmCallCardsVoiceCaptureInstalled";

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((event: { resultIndex: number; results: { length: number; [index: number]: { isFinal: boolean; 0: { transcript: string } } } }) => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type WindowWithSpeechRecognition = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

let activeRecognition: SpeechRecognitionLike | null = null;
let activeButton: HTMLButtonElement | null = null;
let activeTextarea: HTMLTextAreaElement | null = null;
let initialValue = "";
let initialStart = 0;
let initialEnd = 0;
let finalTranscript = "";

function getSpeechRecognitionConstructor() {
  const speechWindow = window as WindowWithSpeechRecognition;
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

function clean(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function setNativeTextAreaValue(textarea: HTMLTextAreaElement, value: string) {
  const prototype = Object.getPrototypeOf(textarea) as HTMLTextAreaElement;
  const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");

  if (descriptor?.set) descriptor.set.call(textarea, value);
  else textarea.value = value;

  textarea.dispatchEvent(new Event("input", { bubbles: true }));
  textarea.dispatchEvent(new Event("change", { bubbles: true }));
}

function applyTranscript(textarea: HTMLTextAreaElement, transcript: string) {
  const cleaned = clean(transcript);
  if (!cleaned) return;

  const before = initialValue.slice(0, initialStart);
  const after = initialValue.slice(initialEnd);
  const prefix = before && !/\s$/.test(before) ? " " : "";
  const suffix = after && !/^\s/.test(after) ? " " : "";
  const nextValue = `${before}${prefix}${cleaned}${suffix}${after}`;
  const cursor = before.length + prefix.length + cleaned.length;

  setNativeTextAreaValue(textarea, nextValue);
  textarea.focus({ preventScroll: true });
  textarea.setSelectionRange(cursor, cursor);
}

function setButtonState(button: HTMLButtonElement, state: "idle" | "listening" | "unsupported" | "error") {
  button.dataset.wmVoiceState = state;

  if (state === "listening") {
    button.textContent = "Stop";
    button.title = "Listening. Click to stop.";
    button.setAttribute("aria-label", "Stop capturing customer answer");
    return;
  }

  if (state === "unsupported") {
    button.textContent = "Mic off";
    button.title = "Voice capture is not supported in this browser";
    button.setAttribute("aria-label", "Voice capture is not supported in this browser");
    return;
  }

  if (state === "error") {
    button.textContent = "Mic!";
    button.title = "Microphone permission is needed";
    button.setAttribute("aria-label", "Microphone permission is needed");
    return;
  }

  button.textContent = "Mic";
  button.title = "Capture customer answer by microphone";
  button.setAttribute("aria-label", "Capture customer answer by microphone");
}

function stopVoiceCapture() {
  activeRecognition?.stop();
}

function startVoiceCapture(textarea: HTMLTextAreaElement, button: HTMLButtonElement) {
  const SpeechRecognition = getSpeechRecognitionConstructor();

  if (!SpeechRecognition) {
    setButtonState(button, "unsupported");
    return;
  }

  activeRecognition?.abort();
  initialValue = textarea.value;
  initialStart = textarea.selectionStart ?? textarea.value.length;
  initialEnd = textarea.selectionEnd ?? initialStart;
  finalTranscript = "";
  activeTextarea = textarea;
  activeButton = button;

  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = navigator.language || "en-GB";

  recognition.onstart = () => {
    setButtonState(button, "listening");
    textarea.classList.add("wm-voice-capture-active");
  };

  recognition.onresult = (event) => {
    let interim = "";

    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const result = event.results[index];
      const transcript = result[0]?.transcript || "";

      if (result.isFinal) finalTranscript = `${finalTranscript} ${transcript}`.trim();
      else interim = `${interim} ${transcript}`.trim();
    }

    applyTranscript(textarea, `${finalTranscript} ${interim}`);
  };

  recognition.onerror = () => setButtonState(button, "error");
  recognition.onend = () => {
    activeRecognition = null;
    activeTextarea?.classList.remove("wm-voice-capture-active");
    if (activeButton) setButtonState(activeButton, "idle");
    activeTextarea = null;
    activeButton = null;
  };

  activeRecognition = recognition;

  try {
    recognition.start();
  } catch {
    activeRecognition = null;
    setButtonState(button, "error");
  }
}

function handleVoiceButtonClick(event: Event) {
  const button = event.currentTarget;
  if (!(button instanceof HTMLButtonElement)) return;

  const wrapper = button.closest<HTMLElement>("[data-wm-voice-capture-wrapper]");
  const textarea = wrapper?.querySelector("textarea");
  if (!(textarea instanceof HTMLTextAreaElement)) return;

  if (activeRecognition && activeTextarea === textarea) {
    stopVoiceCapture();
    return;
  }

  textarea.focus();
  startVoiceCapture(textarea, button);
}

function attachVoiceControls() {
  const textareas = Array.from(document.querySelectorAll<HTMLTextAreaElement>(".ccs-answerCapture textarea, textarea[placeholder*='customer' i], textarea[placeholder*='answer' i]"));

  textareas.forEach((textarea) => {
    if (textarea.dataset.wmVoiceCaptureAttached === "true") return;
    textarea.dataset.wmVoiceCaptureAttached = "true";

    const parent = textarea.parentElement;
    if (!parent) return;

    const wrapper = document.createElement("div");
    wrapper.className = "wm-voice-capture-wrapper";
    wrapper.dataset.wmVoiceCaptureWrapper = "true";

    parent.insertBefore(wrapper, textarea);
    wrapper.appendChild(textarea);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "wm-voice-capture-button";
    setButtonState(button, getSpeechRecognitionConstructor() ? "idle" : "unsupported");
    button.addEventListener("click", handleVoiceButtonClick);
    wrapper.appendChild(button);
  });
}

function installStyles() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .wm-voice-capture-wrapper { position: relative; display: grid; }
    .wm-voice-capture-wrapper textarea { padding-right: 4.8rem !important; }
    .wm-voice-capture-button {
      position: absolute; right: 8px; top: 8px; z-index: 2;
      min-width: 3.4rem !important; min-height: 1.8rem !important; height: 1.8rem !important;
      padding: 0 0.55rem !important; border-radius: 999px !important;
      border: 1px solid rgba(14, 165, 233, 0.42) !important;
      background: rgba(2, 132, 199, 0.94) !important; color: #fff !important;
      font-size: 0.66rem !important; font-weight: 800 !important; letter-spacing: 0 !important;
      text-transform: none !important; box-shadow: 0 8px 18px rgba(2, 132, 199, 0.25) !important;
    }
    .wm-voice-capture-button[data-wm-voice-state="listening"] { background: #dc2626 !important; }
    .wm-voice-capture-button[data-wm-voice-state="unsupported"] { background: rgba(71, 85, 105, 0.86) !important; opacity: 0.72; box-shadow: none !important; }
    .wm-voice-capture-active { outline: 2px solid rgba(14, 165, 233, 0.55) !important; outline-offset: 2px !important; }
  `;
  document.head.appendChild(style);
}

function refreshVoiceCapture() {
  if (!window.location.pathname.includes("/live-call-cards")) return;
  attachVoiceControls();
}

export function installCallCardsVoiceCapture(): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (document.body.dataset[INSTALL_FLAG] === "true") return;

  document.body.dataset[INSTALL_FLAG] = "true";
  installStyles();

  const observer = new MutationObserver(() => refreshVoiceCapture());
  observer.observe(document.body, { childList: true, subtree: true });

  document.addEventListener("click", () => window.setTimeout(refreshVoiceCapture, 120), true);
  window.addEventListener("popstate", () => window.setTimeout(refreshVoiceCapture, 120));

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", refreshVoiceCapture, { once: true });
    return;
  }

  refreshVoiceCapture();
  window.setTimeout(refreshVoiceCapture, 300);
}
