import { useEffect, useMemo, useState } from "react";

export type WingmanLanguageId =
  | "en-GB"
  | "fr-FR"
  | "es-ES"
  | "pt-PT"
  | "de-DE"
  | "it-IT"
  | "ru-RU"
  | "zh-CN"
  | "en-IN"
  | "hi-IN"
  | "en-SG"
  | "sv-SE"
  | "nb-NO"
  | "nl-NL";

export type WingmanLanguageConfig = {
  id: WingmanLanguageId;
  label: string;
  nativeLabel: string;
  marketLabel: string;
  flag: string;
  speechLang: string;
  htmlLang: string;
  direction: "ltr" | "rtl";
  uiSupported: boolean;
  captureSupported: boolean;
};

export type WingmanUiText = {
  goodMorning: string;
  newProject: string;
  overallLanguage: string;
  captureLanguage: string;
  languageSettings: string;
};

export const WINGMAN_LANGUAGE_STORAGE_KEY = "wingman-ui-language-v1";
export const WINGMAN_CAPTURE_LANGUAGE_STORAGE_KEY = "wingman-capture-language-v1";
const languageChangeEvent = "wingman:language-changed";

/*
  Important:
  Wingman is not yet a fully translated application.
  This model is currently used for:
  - region / market preference
  - browser speech-recognition capture language
  - future translation readiness

  Keep these labels ASCII-safe so Windows PowerShell copy/paste cannot corrupt them.
*/

export const SUPPORTED_WINGMAN_LANGUAGES: WingmanLanguageConfig[] = [
  {
    id: "en-GB",
    label: "English",
    nativeLabel: "English UK",
    marketLabel: "United Kingdom",
    flag: "GB",
    speechLang: "en-GB",
    htmlLang: "en-GB",
    direction: "ltr",
    uiSupported: false,
    captureSupported: true,
  },
  {
    id: "fr-FR",
    label: "French",
    nativeLabel: "French",
    marketLabel: "France",
    flag: "FR",
    speechLang: "fr-FR",
    htmlLang: "fr-FR",
    direction: "ltr",
    uiSupported: false,
    captureSupported: true,
  },
  {
    id: "es-ES",
    label: "Spanish",
    nativeLabel: "Spanish",
    marketLabel: "Spain",
    flag: "ES",
    speechLang: "es-ES",
    htmlLang: "es-ES",
    direction: "ltr",
    uiSupported: false,
    captureSupported: true,
  },
  {
    id: "pt-PT",
    label: "Portuguese",
    nativeLabel: "Portuguese",
    marketLabel: "Portugal",
    flag: "PT",
    speechLang: "pt-PT",
    htmlLang: "pt-PT",
    direction: "ltr",
    uiSupported: false,
    captureSupported: true,
  },
  {
    id: "de-DE",
    label: "German",
    nativeLabel: "German",
    marketLabel: "Germany",
    flag: "DE",
    speechLang: "de-DE",
    htmlLang: "de-DE",
    direction: "ltr",
    uiSupported: false,
    captureSupported: true,
  },
  {
    id: "it-IT",
    label: "Italian",
    nativeLabel: "Italian",
    marketLabel: "Italy",
    flag: "IT",
    speechLang: "it-IT",
    htmlLang: "it-IT",
    direction: "ltr",
    uiSupported: false,
    captureSupported: true,
  },
  {
    id: "ru-RU",
    label: "Russian",
    nativeLabel: "Russian",
    marketLabel: "Russia",
    flag: "RU",
    speechLang: "ru-RU",
    htmlLang: "ru-RU",
    direction: "ltr",
    uiSupported: false,
    captureSupported: true,
  },
  {
    id: "zh-CN",
    label: "Mandarin",
    nativeLabel: "Mandarin",
    marketLabel: "China",
    flag: "CN",
    speechLang: "zh-CN",
    htmlLang: "zh-CN",
    direction: "ltr",
    uiSupported: false,
    captureSupported: true,
  },
  {
    id: "en-IN",
    label: "India English",
    nativeLabel: "India English",
    marketLabel: "India",
    flag: "IN",
    speechLang: "en-IN",
    htmlLang: "en-IN",
    direction: "ltr",
    uiSupported: false,
    captureSupported: true,
  },
  {
    id: "hi-IN",
    label: "Hindi",
    nativeLabel: "Hindi",
    marketLabel: "India",
    flag: "IN",
    speechLang: "hi-IN",
    htmlLang: "hi-IN",
    direction: "ltr",
    uiSupported: false,
    captureSupported: true,
  },
  {
    id: "en-SG",
    label: "Singapore English",
    nativeLabel: "Singapore English",
    marketLabel: "Singapore",
    flag: "SG",
    speechLang: "en-SG",
    htmlLang: "en-SG",
    direction: "ltr",
    uiSupported: false,
    captureSupported: true,
  },
  {
    id: "sv-SE",
    label: "Swedish",
    nativeLabel: "Swedish",
    marketLabel: "Sweden",
    flag: "SE",
    speechLang: "sv-SE",
    htmlLang: "sv-SE",
    direction: "ltr",
    uiSupported: false,
    captureSupported: true,
  },
  {
    id: "nb-NO",
    label: "Norwegian",
    nativeLabel: "Norwegian",
    marketLabel: "Norway",
    flag: "NO",
    speechLang: "nb-NO",
    htmlLang: "nb-NO",
    direction: "ltr",
    uiSupported: false,
    captureSupported: true,
  },
  {
    id: "nl-NL",
    label: "Dutch",
    nativeLabel: "Dutch",
    marketLabel: "Netherlands",
    flag: "NL",
    speechLang: "nl-NL",
    htmlLang: "nl-NL",
    direction: "ltr",
    uiSupported: false,
    captureSupported: true,
  },
];

/*
  Keep UI text in English for now.
  Full app translation requires a proper i18n layer covering menus, route labels,
  pages, product knowledge, proposals and call-card content.
*/
const uiText: WingmanUiText = {
  goodMorning: "Good morning, Wingman",
  newProject: "New Project",
  overallLanguage: "Wingman region",
  captureLanguage: "Capture language",
  languageSettings: "Region and capture settings",
};

export function isWingmanLanguageId(value: string): value is WingmanLanguageId {
  return SUPPORTED_WINGMAN_LANGUAGES.some((language) => language.id === value);
}

export function getWingmanLanguage(id?: string | null) {
  if (id && isWingmanLanguageId(id)) {
    return SUPPORTED_WINGMAN_LANGUAGES.find((language) => language.id === id) ?? SUPPORTED_WINGMAN_LANGUAGES[0];
  }

  return SUPPORTED_WINGMAN_LANGUAGES[0];
}

export function getWingmanUiText() {
  return uiText;
}

export function getStoredWingmanLanguage() {
  if (typeof window === "undefined") {
    return SUPPORTED_WINGMAN_LANGUAGES[0];
  }

  return getWingmanLanguage(window.localStorage.getItem(WINGMAN_LANGUAGE_STORAGE_KEY));
}

export function getStoredWingmanCaptureLanguage() {
  if (typeof window === "undefined") {
    return SUPPORTED_WINGMAN_LANGUAGES[0];
  }

  return getWingmanLanguage(
    window.localStorage.getItem(WINGMAN_CAPTURE_LANGUAGE_STORAGE_KEY) ||
      window.localStorage.getItem(WINGMAN_LANGUAGE_STORAGE_KEY)
  );
}

export function setStoredWingmanLanguage(id: WingmanLanguageId) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(WINGMAN_LANGUAGE_STORAGE_KEY, id);
  window.dispatchEvent(new CustomEvent(languageChangeEvent, { detail: { id } }));
}

export function setStoredWingmanCaptureLanguage(id: WingmanLanguageId) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(WINGMAN_CAPTURE_LANGUAGE_STORAGE_KEY, id);
  window.dispatchEvent(new CustomEvent(languageChangeEvent, { detail: { captureId: id } }));
}

export function useWingmanLanguage() {
  const [languageId, setLanguageId] = useState<WingmanLanguageId>(() => getStoredWingmanLanguage().id);

  useEffect(() => {
    function handleLanguageChange() {
      setLanguageId(getStoredWingmanLanguage().id);
    }

    window.addEventListener(languageChangeEvent, handleLanguageChange);
    window.addEventListener("storage", handleLanguageChange);

    return () => {
      window.removeEventListener(languageChangeEvent, handleLanguageChange);
      window.removeEventListener("storage", handleLanguageChange);
    };
  }, []);

  const language = useMemo(() => getWingmanLanguage(languageId), [languageId]);
  const currentUiText = useMemo(() => getWingmanUiText(), []);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    document.documentElement.lang = language.htmlLang;
    document.documentElement.dir = language.direction;
    document.documentElement.dataset.wingmanLanguage = language.id;
  }, [language.direction, language.htmlLang, language.id]);

  return {
    language,
    uiText: currentUiText,
    setLanguage: setStoredWingmanLanguage,
  };
}