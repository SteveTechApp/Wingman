type WingmanSpeechRecognitionCallback = (event?: any) => void;

type WingmanSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: WingmanSpeechRecognitionCallback | null;
  onresult: WingmanSpeechRecognitionCallback | null;
  onerror: WingmanSpeechRecognitionCallback | null;
  onend: WingmanSpeechRecognitionCallback | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
  addEventListener?: (type: string, listener: EventListenerOrEventListenerObject) => void;
};

type WingmanSpeechRecognitionConstructor = new () => WingmanSpeechRecognition;

declare global {
  interface Window {
    SpeechRecognition?: WingmanSpeechRecognitionConstructor;
    webkitSpeechRecognition?: WingmanSpeechRecognitionConstructor;
    wingmanStopMicrophone?: () => void;
    __wingmanMicrophoneSafetyInstalled?: boolean;
  }
}

const speechRecognitions = new Set<WingmanSpeechRecognition>();
const mediaStreams = new Set<MediaStream>();

let microphoneBlockedUntil = 0;

function stopAllMicrophoneCapture(): void {
  microphoneBlockedUntil = Date.now() + 3000;

  for (const recognition of Array.from(speechRecognitions)) {
    try {
      recognition.stop();
    } catch {
      // Ignore browser recognition stop errors.
    }

    try {
      recognition.abort();
    } catch {
      // Ignore browser recognition abort errors.
    }
  }

  for (const stream of Array.from(mediaStreams)) {
    try {
      for (const track of stream.getTracks()) {
        track.stop();
      }
    } catch {
      // Ignore stream stop errors.
    }
  }
}

function wrapSpeechRecognitionConstructor(key: "SpeechRecognition" | "webkitSpeechRecognition"): void {
  const speechWindow = window as unknown as Window & Record<string, unknown>;
  const OriginalConstructor = speechWindow[key] as WingmanSpeechRecognitionConstructor | undefined;

  if (!OriginalConstructor) {
    return;
  }

  if ((OriginalConstructor as unknown as { __wingmanWrapped?: boolean }).__wingmanWrapped) {
    return;
  }

  const WrappedConstructor = function wingmanTrackedSpeechRecognition() {
    const recognition = new OriginalConstructor();
    speechRecognitions.add(recognition);

    const originalStart = recognition.start.bind(recognition);
    const originalStop = recognition.stop.bind(recognition);
    const originalAbort = recognition.abort.bind(recognition);

    recognition.start = () => {
      if (Date.now() < microphoneBlockedUntil) {
        return;
      }

      speechRecognitions.add(recognition);
      originalStart();
    };

    recognition.stop = () => {
      microphoneBlockedUntil = Date.now() + 1500;
      originalStop();
    };

    recognition.abort = () => {
      microphoneBlockedUntil = Date.now() + 1500;
      originalAbort();
    };

    try {
      recognition.addEventListener?.("end", () => {
        if (Date.now() < microphoneBlockedUntil) {
          try {
            originalAbort();
          } catch {
            // Ignore browser abort errors.
          }
        }
      });
    } catch {
      // Some browser implementations do not expose EventTarget methods consistently.
    }

    return recognition;
  } as unknown as WingmanSpeechRecognitionConstructor & { __wingmanWrapped?: boolean };

  try {
    Object.setPrototypeOf(WrappedConstructor, OriginalConstructor);
    WrappedConstructor.prototype = OriginalConstructor.prototype;
  } catch {
    // Ignore prototype assignment issues.
  }

  WrappedConstructor.__wingmanWrapped = true;
  speechWindow[key] = WrappedConstructor;
}

function wrapGetUserMedia(): void {
  const mediaDevices = navigator.mediaDevices as
    | (MediaDevices & { __wingmanGetUserMediaWrapped?: boolean })
    | undefined;

  if (!mediaDevices?.getUserMedia) {
    return;
  }

  if (mediaDevices.__wingmanGetUserMediaWrapped) {
    return;
  }

  const originalGetUserMedia = mediaDevices.getUserMedia.bind(mediaDevices);

  try {
    mediaDevices.getUserMedia = async (constraints: MediaStreamConstraints) => {
      const stream = await originalGetUserMedia(constraints);
      mediaStreams.add(stream);

      for (const track of stream.getTracks()) {
        track.addEventListener("ended", () => {
          const activeTracks = stream.getTracks().filter((candidate) => candidate.readyState === "live");

          if (activeTracks.length === 0) {
            mediaStreams.delete(stream);
          }
        });
      }

      return stream;
    };

    mediaDevices.__wingmanGetUserMediaWrapped = true;
  } catch {
    // Ignore read-only browser API assignment issues.
  }
}

function textSuggestsMicrophoneStop(text: string): boolean {
  const normalised = text.toLowerCase();

  if (normalised.includes("stop") && normalised.includes("mic")) {
    return true;
  }

  if (normalised.includes("stop") && normalised.includes("microphone")) {
    return true;
  }

  if (normalised.includes("microphone stopped")) {
    return true;
  }

  if (normalised.includes("new call")) {
    return true;
  }

  if (normalised.includes("end call")) {
    return true;
  }

  return false;
}

function installMicrophoneSafety(): void {
  if (typeof window === "undefined") {
    return;
  }

  if (window.__wingmanMicrophoneSafetyInstalled) {
    return;
  }

  window.__wingmanMicrophoneSafetyInstalled = true;
  window.wingmanStopMicrophone = stopAllMicrophoneCapture;

  wrapSpeechRecognitionConstructor("SpeechRecognition");
  wrapSpeechRecognitionConstructor("webkitSpeechRecognition");
  wrapGetUserMedia();

  document.addEventListener(
    "click",
    (event) => {
      const target = event.target;

      if (!(target instanceof HTMLElement)) {
        return;
      }

      const button = target.closest("button");

      if (!button) {
        return;
      }

      const buttonText = button.textContent ?? "";

      if (!textSuggestsMicrophoneStop(buttonText)) {
        return;
      }

      window.setTimeout(stopAllMicrophoneCapture, 50);
      window.setTimeout(stopAllMicrophoneCapture, 500);
      window.setTimeout(stopAllMicrophoneCapture, 1500);
    },
    true
  );

  window.addEventListener("wingman:stop-microphone", stopAllMicrophoneCapture);
  window.addEventListener("pagehide", stopAllMicrophoneCapture);
  window.addEventListener("beforeunload", stopAllMicrophoneCapture);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      stopAllMicrophoneCapture();
    }
  });

  window.setInterval(() => {
    const bodyText = document.body?.textContent ?? "";

    if (!bodyText.toLowerCase().includes("microphone stopped")) {
      return;
    }

    stopAllMicrophoneCapture();
  }, 1000);
}

installMicrophoneSafety();

export {};