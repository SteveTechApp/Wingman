type SpeechRecognitionAlternativeLike = { transcript: string };

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0: SpeechRecognitionAlternativeLike;
};

type SpeechRecognitionResultListLike = {
  length: number;
  [index: number]: SpeechRecognitionResultLike;
};

export type DiscoverySpeechRecognitionEventLike = {
  resultIndex?: number;
  results: SpeechRecognitionResultListLike;
};

export type DiscoverySpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: DiscoverySpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type DiscoverySpeechRecognitionConstructor = new () => DiscoverySpeechRecognitionLike;

type DiscoverySpeechWindow = Window & typeof globalThis & {
  SpeechRecognition?: DiscoverySpeechRecognitionConstructor;
  webkitSpeechRecognition?: DiscoverySpeechRecognitionConstructor;
};

export function getDiscoverySpeechRecognition(): DiscoverySpeechRecognitionConstructor | undefined {
  const speechWindow = window as DiscoverySpeechWindow;
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
}
