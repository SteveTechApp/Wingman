export type UserProfile = {
  displayName: string;
  email?: string;
  phone?: string;

  company?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  region?: string;
  postcode?: string;
  country?: string;

  preferredLanguage?: string; // e.g. "en", "fr", "de"
};

const KEY = "wingman.userProfile.v1";

export function loadUserProfile(): UserProfile | null {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as UserProfile; } catch { return null; }
}

export function saveUserProfile(p: UserProfile) {
  localStorage.setItem(KEY, JSON.stringify(p));
}

export function hasUserIdentity(): boolean {
  const p = loadUserProfile();
  return !!(p && p.displayName && p.displayName.trim().length > 0);
}