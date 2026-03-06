import * as React from "react";

export type LocalAuthUser = { email: string; name?: string };
export type AuthState = { user: LocalAuthUser; remember?: boolean };

const KEY = "wingman.auth";

export function getAnyAuth(): AuthState | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AuthState) : null;
  } catch {
    return null;
  }
}

export function loginLocal(user: LocalAuthUser, remember = true): AuthState {
  const state: AuthState = { user, remember };
  localStorage.setItem(KEY, JSON.stringify(state, null, 2));
  return state;
}

export function logout(): void {
  localStorage.removeItem(KEY);
}
