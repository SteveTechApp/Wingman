import { getWingmanSession, openDevelopmentWorkspace, WingmanApiError } from "../api/wingmanApi";

/**
 * The local development workspace, held by the development API.
 *
 * `POST /api/wingman/auth/dev-session` creates (once) an ordinary workspace in
 * the server's own store and answers with a real `wingman_session` cookie, so
 * everything that reads a session - project sync included - reaches the API.
 * What that replaces is a fetch shim that answered the session endpoint inside
 * the browser: the UI looked signed in while the server had never heard of the
 * rep, so every sync was a no-op against a workspace that did not exist.
 *
 * Choosing it is a decision, not a side effect of loading the page. A rep picks
 * the local workspace in Settings, this module remembers that choice, and a
 * later load restores the session when the cookie has expired. An automated
 * browser - a Playwright spec, the e2e smoke check - never makes that choice, so
 * its runs keep the signed-out baseline they arrange.
 */
export const DEVELOPMENT_WORKSPACE_KEY = "wingman:development-workspace";

/** Remember that this browser's session is the local development workspace. */
export function rememberDevelopmentWorkspace() {
  try {
    window.localStorage.setItem(DEVELOPMENT_WORKSPACE_KEY, "1");
  } catch {
    // A browser that refuses storage simply has to sign in again next visit.
  }
}

/** Forget it, so a signed-out browser is not signed in again behind the rep. */
export function forgetDevelopmentWorkspace() {
  try {
    window.localStorage.removeItem(DEVELOPMENT_WORKSPACE_KEY);
  } catch {
    // Nothing was stored, so there is nothing to forget.
  }
}

/** Whether this browser chose the local development workspace before. */
export function choseDevelopmentWorkspace() {
  try {
    return window.localStorage.getItem(DEVELOPMENT_WORKSPACE_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Restore the development session on a load that has no live cookie, for a
 * browser that chose it before. Runs before the first project hydrate, so dev
 * sync starts from the server rather than switching to local mode for the visit.
 */
export async function restoreDevelopmentWorkspace(enabled = import.meta.env.DEV): Promise<boolean> {
  if (!enabled || !choseDevelopmentWorkspace()) return false;
  try {
    await getWingmanSession();
    return true;
  } catch (error) {
    // Only an expired session is worth replacing: a server that is down or a
    // session the server rejected for another reason is left alone, and the
    // app stays in local mode for this visit.
    if (!(error instanceof WingmanApiError) || error.status !== 401) return false;
  }
  try {
    await openDevelopmentWorkspace();
    return true;
  } catch {
    return false;
  }
}
