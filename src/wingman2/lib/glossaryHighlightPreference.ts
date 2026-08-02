import { useEffect, useState } from "react";

export const GLOSSARY_HIGHLIGHTS_STORAGE_KEY = "wingman.glossaryHighlights.enabled.v1";
export const GLOSSARY_HIGHLIGHTS_CHANGE_EVENT = "wingman:glossary-highlights-change";

export function readGlossaryHighlightsEnabled(): boolean {
  if (typeof window === "undefined" || !window.localStorage) {
    return true;
  }

  return window.localStorage.getItem(GLOSSARY_HIGHLIGHTS_STORAGE_KEY) !== "false";
}

export function writeGlossaryHighlightsEnabled(enabled: boolean): void {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }

  window.localStorage.setItem(GLOSSARY_HIGHLIGHTS_STORAGE_KEY, String(enabled));
  window.dispatchEvent(new CustomEvent<boolean>(GLOSSARY_HIGHLIGHTS_CHANGE_EVENT, { detail: enabled }));
}

export function useGlossaryHighlightsEnabled(): boolean {
  const [enabled, setEnabled] = useState(readGlossaryHighlightsEnabled);

  useEffect(() => {
    const handlePreferenceChange = (event: Event) => {
      const preferenceEvent = event as CustomEvent<boolean>;
      setEnabled(typeof preferenceEvent.detail === "boolean" ? preferenceEvent.detail : readGlossaryHighlightsEnabled());
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === GLOSSARY_HIGHLIGHTS_STORAGE_KEY) {
        setEnabled(readGlossaryHighlightsEnabled());
      }
    };

    window.addEventListener(GLOSSARY_HIGHLIGHTS_CHANGE_EVENT, handlePreferenceChange);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener(GLOSSARY_HIGHLIGHTS_CHANGE_EVENT, handlePreferenceChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  return enabled;
}
