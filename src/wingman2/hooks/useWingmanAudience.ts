import { useEffect, useState } from "react";
import {
  defaultAudienceMode,
  isWingmanAudienceMode,
  type WingmanAudienceMode
} from "../lib/audienceProfiles";

const storageKey = "wingman.audienceMode";

function readInitialAudienceMode(): WingmanAudienceMode {
  if (typeof window === "undefined") {
    return defaultAudienceMode;
  }

  const stored = window.localStorage.getItem(storageKey);

  if (isWingmanAudienceMode(stored)) {
    return stored;
  }

  return defaultAudienceMode;
}

export function useWingmanAudience() {
  const [audienceMode, setAudienceMode] = useState<WingmanAudienceMode>(readInitialAudienceMode);

  useEffect(() => {
    window.localStorage.setItem(storageKey, audienceMode);
  }, [audienceMode]);

  return {
    audienceMode,
    setAudienceMode
  };
}