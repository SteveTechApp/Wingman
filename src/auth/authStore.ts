export type StoredAuth = {
  user: {
    email: string;
    name?: string;
  };
};

const AUTH_KEY = "wingman.auth";

function read(): StoredAuth | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredAuth;
  } catch {
    return null;
  }
}

function write(value: StoredAuth | null) {
  if (typeof window === "undefined") return;
  if (!value) {
    window.localStorage.removeItem(AUTH_KEY);
    return;
  }
  window.localStorage.setItem(AUTH_KEY, JSON.stringify(value));
}

export function getAnyAuth(): StoredAuth | null {
  return read();
}

export function loginLocal(user: { email: string; name?: string }, persist = true): StoredAuth {
  const auth = { user };
  if (persist) write(auth);
  return auth;
}

export function logout(): void {
  write(null);
}
