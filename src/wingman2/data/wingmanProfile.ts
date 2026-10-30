import { useEffect, useState } from "react";
export type WingmanProfile = {
  companyName: string;
  userName: string;
  email: string;
  phone: string;
  region: string;
  defaultAudience: "endUser" | "dealer" | "consultant" | "internal";
  companyLogoDataUrl: string;
  proposalFooter: string;
  reportPreparedBy: string;
  updatedAt: string;
};

const storageKey = "wingman.local-profile.v1";
const profileChangedEvent = "wingman:profile-changed";

const defaultProfile: WingmanProfile = {
  companyName: "WyreStorm",
  userName: "",
  email: "",
  phone: "",
  region: "United Kingdom",
  defaultAudience: "dealer",
  companyLogoDataUrl: "",
  proposalFooter: "Prepared using WyreStorm Wingman.",
  reportPreparedBy: "",
  updatedAt: new Date().toISOString(),
};

function safeParseProfile(raw: string | null): WingmanProfile {
  if (!raw) {
    return defaultProfile;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<WingmanProfile>;

    return {
      ...defaultProfile,
      ...parsed,
      updatedAt: parsed.updatedAt || defaultProfile.updatedAt,
    };
  } catch {
    return defaultProfile;
  }
}

export function getStoredWingmanProfile() {
  if (typeof window === "undefined") {
    return defaultProfile;
  }

  return safeParseProfile(window.localStorage.getItem(storageKey));
}

export function saveStoredWingmanProfile(profile: WingmanProfile) {
  const nextProfile = {
    ...profile,
    updatedAt: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    window.localStorage.setItem(storageKey, JSON.stringify(nextProfile));
    window.dispatchEvent(new CustomEvent(profileChangedEvent, { detail: nextProfile }));
  }

  return nextProfile;
}

export function clearStoredWingmanProfile() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(storageKey);
    window.dispatchEvent(new CustomEvent(profileChangedEvent, { detail: defaultProfile }));
  }
}

export function useWingmanProfile() {
  const [profile, setProfile] = useState<WingmanProfile>(() => getStoredWingmanProfile());

  useEffect(() => {
    function handleProfileChange() {
      setProfile(getStoredWingmanProfile());
    }

    window.addEventListener(profileChangedEvent, handleProfileChange);
    window.addEventListener("storage", handleProfileChange);

    return () => {
      window.removeEventListener(profileChangedEvent, handleProfileChange);
      window.removeEventListener("storage", handleProfileChange);
    };
  }, []);

  function updateProfile(patch: Partial<WingmanProfile>) {
    setProfile((current) => saveStoredWingmanProfile({ ...current, ...patch }));
  }

  function resetProfile() {
    clearStoredWingmanProfile();
    setProfile(defaultProfile);
  }

  return {
    profile,
    updateProfile,
    resetProfile,
  };
}