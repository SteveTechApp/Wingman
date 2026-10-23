import { beforeEach, describe, expect, it, vi } from "vitest";
import { WingmanApiError } from "../api/wingmanApi";

const api = vi.hoisted(() => ({
  getWorkspaceInstallationRateCard: vi.fn(),
  putWorkspaceInstallationRateCard: vi.fn(),
}));

vi.mock("../api/wingmanApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/wingmanApi")>();
  return {
    ...actual,
    getWorkspaceInstallationRateCard: api.getWorkspaceInstallationRateCard,
    putWorkspaceInstallationRateCard: api.putWorkspaceInstallationRateCard,
  };
});

import {
  LEGACY_RATE_CARD_KEY,
  installationRateCardSnapshot,
  loadInstallationRateCard,
  resetInstallationRateCardStore,
  saveInstallationRateCard,
  subscribeInstallationRateCard,
} from "./installationRateCard";

const BACK_BOX = "install-enclosure-back-box";

describe("workspace installation rate card store", () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetInstallationRateCardStore();
    api.getWorkspaceInstallationRateCard.mockReset();
    api.putWorkspaceInstallationRateCard.mockReset();
  });

  it("moves a card this browser saved before the workspace had one", async () => {
    api.getWorkspaceInstallationRateCard.mockResolvedValue({ ok: true, card: { updatedAt: "", currency: "GBP", rates: {} } });
    api.putWorkspaceInstallationRateCard.mockResolvedValue({
      ok: true,
      card: { updatedAt: "2026-10-22T09:00:00.000Z", currency: "GBP", rates: { [BACK_BOX]: "120" } },
    });
    window.localStorage.setItem(LEGACY_RATE_CARD_KEY, JSON.stringify({
      updatedAt: "2026-10-20T09:00:00.000Z",
      currency: "GBP",
      rates: { [BACK_BOX]: "120" },
    }));

    const state = await loadInstallationRateCard();

    expect(api.putWorkspaceInstallationRateCard).toHaveBeenCalledWith({ rates: { [BACK_BOX]: "120" }, currency: "GBP" });
    expect(window.localStorage.getItem(LEGACY_RATE_CARD_KEY)).toBeNull();
    expect(state.card.rates[BACK_BOX]).toBe("120");
  });

  it("drops the browser copy when the workspace already holds a card", async () => {
    api.getWorkspaceInstallationRateCard.mockResolvedValue({
      ok: true,
      card: { updatedAt: "2026-10-22T09:00:00.000Z", currency: "GBP", rates: { [BACK_BOX]: "150" } },
    });
    window.localStorage.setItem(LEGACY_RATE_CARD_KEY, JSON.stringify({
      updatedAt: "2026-10-20T09:00:00.000Z",
      currency: "GBP",
      rates: { [BACK_BOX]: "120" },
    }));

    const state = await loadInstallationRateCard();

    // The workspace is the baseline: a second device cannot roll it back.
    expect(api.putWorkspaceInstallationRateCard).not.toHaveBeenCalled();
    expect(window.localStorage.getItem(LEGACY_RATE_CARD_KEY)).toBeNull();
    expect(state.card.rates[BACK_BOX]).toBe("150");
  });

  it("reads the card from the workspace rather than this browser", async () => {
    api.getWorkspaceInstallationRateCard.mockResolvedValue({
      ok: true,
      card: { updatedAt: "2026-10-22T09:00:00.000Z", currency: "GBP", rates: { [BACK_BOX]: "120" } },
    });

    const state = await loadInstallationRateCard();

    expect(api.getWorkspaceInstallationRateCard).toHaveBeenCalledTimes(1);
    expect(state.status).toBe("ready");
    expect(state.card).toMatchObject({ currency: "GBP", rates: { [BACK_BOX]: "120" } });
    expect(window.localStorage.length).toBe(0);
  });

  it("drops a stored rate the document could not print", async () => {
    api.getWorkspaceInstallationRateCard.mockResolvedValue({
      ok: true,
      card: { updatedAt: "2026-10-22T09:00:00.000Z", currency: "JPY", rates: { [BACK_BOX]: "quote" } },
    });

    const state = await loadInstallationRateCard();

    expect(state.card).toEqual({ updatedAt: "2026-10-22T09:00:00.000Z", currency: "GBP", rates: {} });
  });

  it("reports a signed-out read instead of pretending the card is empty", async () => {
    api.getWorkspaceInstallationRateCard.mockRejectedValue(new WingmanApiError("Sign in required.", 401));

    const state = await loadInstallationRateCard();

    expect(state.status).toBe("error");
    expect(state.error).toContain("Sign in to your Wingman workspace");
  });

  it("takes the merged card the workspace returns after a save", async () => {
    api.getWorkspaceInstallationRateCard.mockResolvedValue({
      ok: true,
      card: { updatedAt: "2026-10-21T10:00:00.000Z", currency: "GBP", rates: { [BACK_BOX]: "120" } },
    });
    await loadInstallationRateCard();
    api.putWorkspaceInstallationRateCard.mockResolvedValue({
      ok: true,
      card: { updatedAt: "2026-10-22T09:00:00.000Z", currency: "USD", rates: { [BACK_BOX]: "120", outlet: "35" } },
    });

    const state = await saveInstallationRateCard({ [BACK_BOX]: "150", outlet: "35" }, "USD");

    expect(api.putWorkspaceInstallationRateCard).toHaveBeenCalledWith({
      rates: { [BACK_BOX]: "150", outlet: "35" },
      currency: "USD",
    });
    expect(state).toMatchObject({ status: "ready", error: "", card: { currency: "USD", rates: { outlet: "35" } } });
    // The previous card is replaced, not merged again in the browser: the
    // workspace is the one place the baseline is decided.
    expect(installationRateCardSnapshot().card.rates[BACK_BOX]).toBe("120");
  });

  it("keeps the card and says so when a save does not reach the workspace", async () => {
    api.getWorkspaceInstallationRateCard.mockResolvedValue({
      ok: true,
      card: { updatedAt: "2026-10-21T10:00:00.000Z", currency: "GBP", rates: { [BACK_BOX]: "120" } },
    });
    await loadInstallationRateCard();
    api.putWorkspaceInstallationRateCard.mockRejectedValue(new WingmanApiError("Save failed.", 500));

    const state = await saveInstallationRateCard({ [BACK_BOX]: "150" }, "GBP");

    expect(state.status).toBe("error");
    expect(state.error).toBe("Save failed.");
    expect(state.card.rates[BACK_BOX]).toBe("120");

    // A failed save is not a saved card: the next read asks the workspace again.
    api.getWorkspaceInstallationRateCard.mockResolvedValue({ ok: true, card: { updatedAt: "", currency: "GBP", rates: {} } });
    await loadInstallationRateCard();
    expect(api.getWorkspaceInstallationRateCard).toHaveBeenCalledTimes(2);
  });

  it("shares one snapshot between the pricing surfaces", async () => {
    api.getWorkspaceInstallationRateCard.mockResolvedValue({
      ok: true,
      card: { updatedAt: "2026-10-22T09:00:00.000Z", currency: "GBP", rates: { [BACK_BOX]: "120" } },
    });
    const listener = vi.fn();
    const unsubscribe = subscribeInstallationRateCard(listener);

    await loadInstallationRateCard();
    await loadInstallationRateCard();

    // The second read is served from the cache, so both panels quote one card.
    expect(api.getWorkspaceInstallationRateCard).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalled();
    unsubscribe();
  });
});
