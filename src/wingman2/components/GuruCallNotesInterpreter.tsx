import { useEffect, useMemo, useRef, useState } from "react";
import { Mic, MicOff, SendHorizonal, Sparkles } from "lucide-react";

const callNotesStorageKey = "wingman-guru-call-notes-transcript";

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0: {
    transcript: string;
  };
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function getSpeechRecognitionConstructor() {
  if (typeof window === "undefined") return null;

  const speechWindow = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };

  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

function hasAny(text: string, terms: string[]) {
  const lower = text.toLowerCase();
  return terms.some((term) => lower.includes(term));
}

function countFrom(text: string, terms: string[]) {
  const joined = terms.join("|");
  const regex = new RegExp(`\\b(\\d+)\\s*(${joined})\\b`, "i");
  const match = text.match(regex);
  return match?.[1] || "Not confirmed";
}

function interpretCallNotes(notes: string) {
  const text = notes.trim();

  const roomType = hasAny(text, ["meeting", "boardroom", "conference", "teams", "zoom", "huddle", "byod", "byom"])
    ? "Meeting / UC room"
    : hasAny(text, ["pub", "bar", "hospitality", "venue", "sky", "restaurant", "casino", "bingo"])
      ? "Hospitality / venue AV"
      : hasAny(text, ["teaching", "classroom", "lecture", "university", "education"])
        ? "Education / teaching space"
        : hasAny(text, ["video wall", "led wall", "lcd wall", "wall processor"])
          ? "Video wall / display wall"
          : "General AV opportunity";

  const architecture = hasAny(text, ["networkhd", "av over ip", "av-over-ip", "avoip", "vlan", "igmp", "multicast"])
    ? "Networked AV / AV-over-IP"
    : hasAny(text, ["matrix", "8x8", "4x4", "hdmi matrix", "hdbaset matrix"])
      ? "Matrix / fixed routing"
      : hasAny(text, ["usb", "camera", "microphone", "speakerphone", "touch", "kvm"])
        ? "Presentation and USB workflow"
        : hasAny(text, ["wireless", "airplay", "miracast", "casting"])
          ? "Wireless presentation workflow"
          : hasAny(text, ["video wall", "led wall", "lcd wall"])
            ? "Video wall processing"
            : "Signal path qualification required";

  const displayCount = countFrom(text, ["screens?", "displays?", "monitors?", "projectors?"]);
  const sourceCount = countFrom(text, ["sources?", "inputs?", "laptops?", "players?", "sky boxes?"]);

  const missing = [
    displayCount === "Not confirmed" ? "Confirm display count and display behaviour." : "",
    sourceCount === "Not confirmed" ? "Confirm source count and source locations." : "",
    !hasAny(text, ["metre", "meter", "m away", "distance", "rack"]) ? "Confirm cable distances and rack/display locations." : "",
    !hasAny(text, ["usb", "camera", "microphone", "speakerphone", "touch"]) ? "Confirm USB, camera, microphone and conferencing requirements." : "",
    !hasAny(text, ["audio", "speaker", "amplifier", "dsp", "mic"]) ? "Confirm audio requirements." : "",
    !hasAny(text, ["control", "touch panel", "app", "staff", "remote"]) ? "Confirm control expectations." : "",
    !hasAny(text, ["budget", "cost", "price", "value", "premium"]) ? "Confirm budget level and project stage." : "",
  ].filter(Boolean);

  const productDirection = architecture.includes("AV-over-IP")
    ? "Review NetworkHD family fit. Confirm endpoint count, network ownership, USB and latency before quoting."
    : architecture.includes("Matrix")
      ? "Review HDBaseT / HDMI matrix path. Confirm source/display count, resolution, distance and control."
      : architecture.includes("USB")
        ? "Review presentation switcher, UC or USB extension path. Confirm host/peripheral ownership."
        : architecture.includes("Wireless")
          ? "Review wireless presentation or UC path. Confirm casting/conferencing difference."
          : architecture.includes("Video wall")
            ? "Review dedicated video wall processor or NetworkHD wall path. Confirm wall behaviour."
            : "Continue Discovery before product selection.";

  return {
    roomType,
    architecture,
    displayCount,
    sourceCount,
    missing,
    productDirection,
  };
}

function buildDiscoveryHandoff(notes: string) {
  const result = interpretCallNotes(notes);

  return [
    "Guru call notes interpretation",
    "",
    "Original notes / transcript:",
    notes.trim(),
    "",
    "Interpreted AV starting point:",
    `- Room/application: ${result.roomType}`,
    `- Likely architecture: ${result.architecture}`,
    `- Display count: ${result.displayCount}`,
    `- Source count: ${result.sourceCount}`,
    `- Product direction: ${result.productDirection}`,
    "",
    "Ask next:",
    ...result.missing.map((item) => `- ${item}`),
    "",
    "Quote safety:",
    "- Treat this as discovery input, not a final design.",
    "- Validate exact WyreStorm SKUs, dependencies and datasheets before quoting.",
  ].join("\n");
}

export function GuruCallNotesInterpreter() {
  const [notes, setNotes] = useState("");
  const [listening, setListening] = useState(false);
  const [status, setStatus] = useState("Paste call notes, or use browser speech capture where supported.");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const SpeechRecognition = getSpeechRecognitionConstructor();

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
    };
  }, []);

  const interpretation = useMemo(() => {
    if (!notes.trim()) return null;
    return interpretCallNotes(notes);
  }, [notes]);

  function startListening() {
    if (!SpeechRecognition) {
      setStatus("Speech capture is not available in this browser. Paste the call notes or transcript instead.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-GB";

    recognition.onresult = (event) => {
      let transcript = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        transcript += event.results[index][0].transcript;
      }

      setNotes((current) => `${current}${current ? " " : ""}${transcript}`.replace(/\s+/g, " ").trim());
    };

    recognition.onerror = () => {
      setStatus("Speech capture stopped. Check microphone permission, or paste the transcript manually.");
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
    setStatus("Listening. Confirm you have permission to capture this conversation.");
  }

  function stopListening() {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
    setStatus("Listening stopped. Review the transcript before using it in Discovery.");
  }

  function useInDiscovery() {
    const handoff = buildDiscoveryHandoff(notes);
    window.sessionStorage.setItem(callNotesStorageKey, handoff);
    window.dispatchEvent(new CustomEvent("wingman:use-call-notes-in-discovery", { detail: handoff }));
    window.location.href = "/wingman/discovery";
  }

  return (
    <section className="wingman-guru-call-interpreter" data-wingman-call-notes-interpreter="true">
      <div className="wingman-guru-call-heading">
        <Sparkles className="h-4 w-4" />
        <div>
          <strong>Call notes interpreter</strong>
          <span>Listen to my call, paste notes, then turn the conversation into AV discovery.</span>
        </div>
      </div>

      <div className="wingman-guru-call-actions">
        <button type="button" onClick={listening ? stopListening : startListening}>
          {listening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
          {listening ? "Stop listening" : "Listen to my call"}
        </button>

        <button type="button" onClick={useInDiscovery} disabled={!notes.trim()}>
          <SendHorizonal className="h-3.5 w-3.5" />
          Use this in Discovery
        </button>
      </div>

      <p className="wingman-guru-call-status">{status}</p>

      <textarea
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        placeholder="Paste transcript or call notes here. Example: Customer has a sports bar with 10 screens, 4 Sky boxes, rack 30m away, wants simple staff control and is cost-sensitive."
        rows={5}
      />

      {interpretation ? (
        <div className="wingman-guru-call-summary">
          <strong>{interpretation.architecture}</strong>
          <span>{interpretation.roomType}</span>
          <small>Next question: {interpretation.missing[0] || "Confirm final workflow, dependencies and quote readiness."}</small>
        </div>
      ) : null}
    </section>
  );
}

export default GuruCallNotesInterpreter;