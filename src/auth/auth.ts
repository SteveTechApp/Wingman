import { getAnyAuth, loginLocal, logout } from "./authStore";

export type WingmanUser = {
  id: string;
  name: string;
  email?: string;
};

export function getUser(): WingmanUser | null {
  const a = getAnyAuth();
  if (!a?.user?.email) return null;
  return {
    id: a.user.email,
    name: a.user.name || a.user.email,
    email: a.user.email,
  };
}

export function isAuthed(): boolean {
  return !!getAnyAuth();
}

// Legacy helper: creates a session using the authStore mechanism
export function signIn(): WingmanUser {
  const user = { email: "user@wingman.local", name: "User" };
  loginLocal(user, true);
  return { id: user.email, name: user.name, email: user.email };
}

export function signOut(): void {
  logout();
}