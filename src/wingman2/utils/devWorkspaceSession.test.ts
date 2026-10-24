import { beforeEach, describe, expect, it, vi } from "vitest";
import { WingmanApiError } from "../api/wingmanApi";

const api = vi.hoisted(() => ({
  getWingmanSession: vi.fn(),
  openDevelopmentWorkspace: vi.fn(),
}));

vi.mock("../api/wingmanApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/wingmanApi")>();
  return {
    ...actual,
    getWingmanSession: api.getWingmanSession,
    openDevelopmentWorkspace: api.openDevelopmentWorkspace,
  };
});

import {
  choseDevelopmentWorkspace,
  forgetDevelopmentWorkspace,
  rememberDevelopmentWorkspace,
  restoreDevelopmentWorkspace,
} from "./devWorkspaceSession";

const SESSION = { ok: true, session: { user: { id: "dev-user", email: "dev@wingman.local" } } };

describe("local development workspace session", () => {
  beforeEach(() => {
    window.localStorage.clear();
    api.getWingmanSession.mockReset();
    api.openDevelopmentWorkspace.mockReset();
  });

  it("leaves a browser that never chose the local workspace alone", async () => {
    expect(await restoreDevelopmentWorkspace()).toBe(false);

    expect(api.getWingmanSession).not.toHaveBeenCalled();
    expect(api.openDevelopmentWorkspace).not.toHaveBeenCalled();
  });

  it("keeps a live session instead of signing in again", async () => {
    rememberDevelopmentWorkspace();
    api.getWingmanSession.mockResolvedValue(SESSION);

    expect(await restoreDevelopmentWorkspace()).toBe(true);
    expect(api.openDevelopmentWorkspace).not.toHaveBeenCalled();
  });

  it("restores the session a browser chose after the cookie expired", async () => {
    rememberDevelopmentWorkspace();
    api.getWingmanSession.mockRejectedValue(new WingmanApiError("Authentication required.", 401));
    api.openDevelopmentWorkspace.mockResolvedValue(SESSION);

    expect(await restoreDevelopmentWorkspace()).toBe(true);
    expect(api.openDevelopmentWorkspace).toHaveBeenCalledTimes(1);
  });

  it("does not sign in over a server that is down or refusing for another reason", async () => {
    rememberDevelopmentWorkspace();
    api.getWingmanSession.mockRejectedValue(new WingmanApiError("Agents service unavailable.", 503));

    expect(await restoreDevelopmentWorkspace()).toBe(false);
    expect(api.openDevelopmentWorkspace).not.toHaveBeenCalled();
  });

  it("stays inert in a production build", async () => {
    rememberDevelopmentWorkspace();
    api.getWingmanSession.mockRejectedValue(new WingmanApiError("Authentication required.", 401));

    expect(await restoreDevelopmentWorkspace(false)).toBe(false);
    expect(api.getWingmanSession).not.toHaveBeenCalled();
  });

  it("stays signed out after a sign-out", async () => {
    rememberDevelopmentWorkspace();
    forgetDevelopmentWorkspace();

    expect(choseDevelopmentWorkspace()).toBe(false);
    expect(await restoreDevelopmentWorkspace()).toBe(false);
    expect(api.getWingmanSession).not.toHaveBeenCalled();
  });
});
