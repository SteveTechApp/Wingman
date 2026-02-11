
export type WingmanUser = {
  id: string;
  name: string;
  email?: string;
};

const KEY = "wingman.auth.user.v1";

export function getUser(): WingmanUser | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const u = JSON.parse(raw);
    if (!u || typeof u.id !== "string" || typeof u.name !== "string") return null;
    return u as WingmanUser;
  } catch {
    return null;
  }
}

export function isAuthed(): boolean {
  return !!getUser();
}

export function signIn(): WingmanUser {
  const u: WingmanUser = {
    id: crypto?.randomUUID?.() ?? String(Date.now()),
    name: "Steve",
    email: "@wingman.local",
  };
  try { localStorage.setItem(KEY, JSON.stringify(u)); } catch {}
  return u;
}

export function signOut(): void {
  try { localStorage.removeItem(KEY); } catch {}
}



