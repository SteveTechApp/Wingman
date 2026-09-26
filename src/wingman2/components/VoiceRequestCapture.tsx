import { useEffect, useRef, useState } from "react";
import { Mic, Square, Upload, Users } from "lucide-react";
import "../styles/wingman-voice-capture.css";

type SpeechResult = { isFinal: boolean; 0: { transcript: string } };
type Recognition = {
  continuous: boolean; interimResults: boolean; lang: string;
  onstart: (() => void) | null;
  onresult: ((event: { resultIndex?: number; results: { length: number; [index: number]: SpeechResult } }) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start(): void; stop(): void; abort(): void;
};
type SpeechWindow = { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
const audioExtensions = /\.(mp3|mp4|mpeg|mpga|m4a|wav|webm|ogg|flac)$/i;
const maxBytes = 25 * 1024 * 1024;

export function VoiceRequestCapture({ onTranscript, onBusyChange, disabled = false }: { onTranscript: (text: string) => void; onBusyChange?: (busy: boolean) => void; disabled?: boolean }) {
  const speechWindow = window as unknown as SpeechWindow;
  const Constructor = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
  const recognition = useRef<Recognition | null>(null);
  const append = useRef(onTranscript);
  append.current = onTranscript;
  const request = useRef<AbortController | null>(null);
  const [listening, setListening] = useState(false);
  const [starting, setStarting] = useState(false);
  const [interim, setInterim] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [language, setLanguage] = useState("en-GB");
  const [file, setFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const active = listening || starting;
  useEffect(() => { onBusyChange?.(active || busy); return () => onBusyChange?.(false); }, [active, busy, onBusyChange]);
  useEffect(() => {
    if (!starting) return;
    const timer = window.setTimeout(() => {
      const current = recognition.current;
      recognition.current = null;
      try { current?.abort(); } catch { /* Already stopped. */ }
      setStarting(false); setListening(false); setStatus("");
      setError("The microphone did not start. Check browser permissions and try again.");
    }, 15_000);
    return () => window.clearTimeout(timer);
  }, [starting]);

  useEffect(() => {
    if (!file) { setAudioUrl(""); return; }
    const url = URL.createObjectURL(file);
    setAudioUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    const stopHidden = () => {
      if (document.hidden) { try { recognition.current?.stop(); } catch { /* Already stopped. */ } }
    };
    document.addEventListener("visibilitychange", stopHidden);
    return () => {
      document.removeEventListener("visibilitychange", stopHidden);
      const current = recognition.current;
      recognition.current = null;
      if (current) {
        current.onresult = current.onend = current.onerror = current.onstart = null;
        try { current.abort(); } catch { /* Already stopped. */ }
      }
      const pending = request.current;
      request.current = null;
      pending?.abort();
    };
  }, []);

  function start(mode: "dictation" | "customer") {
    if (!Constructor || recognition.current || active || disabled || busy) return;
    setError(""); setInterim(""); setStarting(true);
    setStatus("Waiting for microphone permission…");
    const current = new Constructor();
    recognition.current = current;
    current.continuous = true;
    current.interimResults = true;
    current.lang = language;
    const received = new Set<number>();
    current.onstart = () => {
      if (recognition.current !== current) return;
      setStarting(false); setListening(true);
      setStatus(mode === "customer" ? "Listening to the customer. Stop when the request is complete." : "Listening. Speak your request, then press Stop.");
    };
    current.onresult = (event) => {
      if (recognition.current !== current) return;
      const pending: string[] = [];
      const final: string[] = [];
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal && !received.has(i)) { received.add(i); final.push(result[0].transcript); }
        else if (!result.isFinal) pending.push(result[0].transcript);
      }
      if (final.length) append.current(final.join(" ").trim());
      setInterim(pending.join(" "));
    };
    current.onerror = (event) => {
      setError(event.error === "not-allowed" || event.error === "service-not-allowed"
        ? "Microphone access was denied. Allow microphone access in your browser, then try again."
        : event.error === "no-speech" ? "No speech was detected. Try again nearer the microphone."
          : "Speech capture stopped. Check your microphone and connection, or upload a voice note.");
      setListening(false); setStarting(false);
    };
    current.onend = () => {
      if (recognition.current !== current) return;
      recognition.current = null;
      setListening(false); setStarting(false); setInterim("");
      setStatus("Microphone off. Review the captured wording below. You can start again to add more.");
    };
    try { current.start(); } catch { recognition.current = null; setStarting(false); setError("The microphone could not start. Check browser permissions and try again."); }
  }

  function chooseFile(next: File | undefined) {
    setError(""); setStatus("");
    if (!next) return;
    if (!audioExtensions.test(next.name) || !next.size || next.size > maxBytes) {
      setFile(null);
      setError("Choose a non-empty MP3, MP4, M4A, WAV, WebM, OGG, FLAC or MPEG file, up to 25 MB.");
      return;
    }
    setFile(next);
  }

  async function transcribe() {
    if (!file || busy || active) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true); setError(""); setStatus("Transcribing your recording…");
    const timeout = window.setTimeout(() => controller.abort(), 125_000);
    try {
      const extension = file.name.match(audioExtensions)![1].toLowerCase();
      const response = await fetch(`/api/wingman/audio/transcribe?format=${extension}`, {
        method: "POST", credentials: "include", body: file,
        headers: { "Content-Type": file.type || "application/octet-stream" }, signal: controller.signal,
      });
      const result = await response.json().catch(() => null) as { ok?: boolean; text?: string; error?: string } | null;
      if (!response.ok || !result?.ok || !result.text?.trim()) throw new Error(result?.error || "Transcription is unavailable. Check your workspace connection and try again.");
      if (controller.signal.aborted) return;
      append.current(result.text.trim());
      setStatus("Voice note added. Review the wording below before decoding.");
      setFile(null);
    } catch (cause) {
      if (request.current === controller) {
        setStatus("");
        setError(controller.signal.aborted ? "Transcription cancelled or timed out. Your existing text has been kept." : cause instanceof Error ? cause.message : "Transcription failed. Try again.");
      }
    } finally {
      window.clearTimeout(timeout);
      if (request.current === controller) { request.current = null; setBusy(false); }
    }
  }

  return <section className="wm-voice-capture" aria-label="Voice capture">
    <div className="wm-voice-heading"><Mic aria-hidden="true" /><div><h3>Say it to Wingman</h3><p>Speak your request or bring in a customer’s voice note. Review the text before decoding.</p></div></div>
    <div className="wm-voice-actions">
      <button type="button" className="wm-ui-button wm-ui-button-secondary" disabled={!Constructor || active || busy || disabled} onClick={() => start("dictation")}><Mic size={16} aria-hidden="true" />Dictate my request</button>
      <button type="button" className="wm-ui-button wm-ui-button-secondary" disabled={!Constructor || active || busy || disabled} onClick={() => start("customer")}><Users size={16} aria-hidden="true" />Capture customer live</button>
      {active && <button type="button" className="wm-ui-button wm-ui-button-primary" onClick={() => recognition.current?.stop()}><Square size={14} aria-hidden="true" />Stop microphone</button>}
      <label className="wm-voice-language">Spoken language<select value={language} disabled={active || busy} onChange={e => setLanguage(e.target.value)}><option value="en-GB">English (UK)</option><option value="en-US">English (US)</option><option value="fr-FR">French</option><option value="de-DE">German</option><option value="es-ES">Spanish</option><option value="it-IT">Italian</option></select></label>
    </div>
    {!Constructor && <p>Live speech is unavailable in this browser. Use a browser with speech recognition, or upload a recording below.</p>}
    <p className="wm-voice-note">Let the customer know before capturing their voice. Live speech uses your browser’s speech service; uploaded audio is sent to Wingman’s transcription service when you select Transcribe.</p>
    <div className="wm-voice-file">
      <label><Upload size={16} aria-hidden="true" />Upload a voice note<input type="file" accept=".mp3,.mp4,.mpeg,.mpga,.m4a,.wav,.webm,.ogg,.flac" disabled={active || busy || disabled} onChange={e => { chooseFile(e.target.files?.[0]); e.target.value = ""; }} /></label>
      <small>Up to 25 MB · Audio language detected automatically</small>
      {file && <><strong>{file.name}</strong>{audioUrl && <audio controls src={audioUrl} preload="metadata" aria-label="Voice note playback" />}<button type="button" className="wm-ui-button wm-ui-button-primary" disabled={busy || active || disabled} onClick={() => void transcribe()}>Transcribe voice note</button></>}
      {busy && <button type="button" className="wm-ui-button wm-ui-button-secondary" onClick={() => request.current?.abort()}>Cancel transcription</button>}
    </div>
    {status && <p role="status">{active && <span className="wm-voice-live-dot" aria-hidden="true" />}{status}</p>}
    {interim && <p className="wm-voice-interim" aria-label="Live transcript">{interim}</p>}
    {error && <p role="alert">{error}</p>}
  </section>;
}
