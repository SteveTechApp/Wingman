import { useEffect, useRef, useSyncExternalStore } from "react";
import {
  getWorkspaceInstallationRateCard,
  putWorkspaceInstallationRateCard,
  WingmanApiError,
} from "../api/wingmanApi";
import {
  EMPTY_INSTALLATION_RATE_CARD,
  normalizeInstallationRateCard,
  type InstallationRateCard,
  type InstallationRateCardCurrency,
} from "../lib/installationRateCard";
import type { InstallationUnitPrices } from "../lib/installationSchedule";

/**
 * The signed-in rep's installation rate card, read from their workspace and
 * written back there, so the baseline they priced on one machine is the one
 * every proposal on the next machine starts from.
 *
 * One cached snapshot serves both pricing surfaces (the proposal wizard and the
 * template review page), because both are pricing the same rep's card. A failed
 * read or write leaves the last card in place and keeps the reason, so the
 * panel can say the rates did not reach the workspace instead of silently
 * pretending they were saved.
 */

export type InstallationRateCardStatus = "loading" | "ready" | "error";

export type InstallationRateCardState = {
  card: InstallationRateCard;
  status: InstallationRateCardStatus;
  /** Why the card could not be read or written; empty when it is in sync. */
  error: string;
};

const INITIAL_STATE: InstallationRateCardState = {
  card: EMPTY_INSTALLATION_RATE_CARD,
  status: "loading",
  error: "",
};

let state: InstallationRateCardState = INITIAL_STATE;
let request: Promise<InstallationRateCardState> | null = null;
const listeners = new Set<() => void>();

function publish(next: InstallationRateCardState) {
  state = next;
  listeners.forEach((listener) => listener());
  return next;
}

/** The shape `useSyncExternalStore` expects: one stable object between writes. */
export function installationRateCardSnapshot(): InstallationRateCardState {
  return state;
}

export function subscribeInstallationRateCard(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Drop the cache so the next read comes from the workspace (and tests are clean). */
export function resetInstallationRateCardStore() {
  request = null;
  publish(INITIAL_STATE);
}

function errorText(error: unknown): string {
  if (error instanceof WingmanApiError && error.status === 401) {
    return "Sign in to your Wingman workspace to use your saved installation rates.";
  }
  return error instanceof Error && error.message
    ? error.message
    : "The installation rate card could not be reached.";
}

/**
 * The key the card used before it moved to the workspace. A rep who priced a
 * card in this browser keeps those rates: the first workspace read uploads
 * them, then forgets the browser copy. The workspace card wins when it already
 * has rates, so a second device cannot roll the baseline back.
 */
export const LEGACY_RATE_CARD_KEY = "wingman-installation-rate-card-v1";

async function adoptLegacyCard(card: InstallationRateCard): Promise<InstallationRateCard> {
  if (typeof window === "undefined") return card;
  const drop = () => window.localStorage.removeItem(LEGACY_RATE_CARD_KEY);
  const raw = window.localStorage.getItem(LEGACY_RATE_CARD_KEY);
  if (!raw) return card;
  let legacy: InstallationRateCard;
  try {
    legacy = normalizeInstallationRateCard(JSON.parse(raw));
  } catch {
    drop();
    return card;
  }
  if (!legacy.updatedAt || !Object.keys(legacy.rates).length || card.updatedAt) {
    drop();
    return card;
  }
  try {
    const response = await putWorkspaceInstallationRateCard({ rates: legacy.rates, currency: legacy.currency });
    drop();
    return normalizeInstallationRateCard(response.card);
  } catch {
    // Keep the browser copy so the next visit can try again instead of losing it.
    return card;
  }
}

/** Read the workspace card once; callers may await it to seed a draft. */
export function loadInstallationRateCard(): Promise<InstallationRateCardState> {
  if (request) return request;
  if (state.status === "ready") return Promise.resolve(state);
  request = getWorkspaceInstallationRateCard()
    .then(async (response) => {
      const card = await adoptLegacyCard(normalizeInstallationRateCard(response.card));
      return publish({ card, status: "ready", error: "" });
    })
    .catch((error: unknown) => publish({ card: state.card, status: "error", error: errorText(error) }))
    .finally(() => {
      request = null;
    });
  return request;
}

/**
 * Write what this proposal priced over the saved card. The server merges, so a
 * blank cell cannot erase a baseline another proposal still needs; the returned
 * card is what the next proposal starts from.
 */
export function saveInstallationRateCard(
  rates: InstallationUnitPrices,
  currency: InstallationRateCardCurrency,
): Promise<InstallationRateCardState> {
  return putWorkspaceInstallationRateCard({ rates, currency })
    .then((response) => publish({ card: normalizeInstallationRateCard(response.card), status: "ready", error: "" }))
    .catch((error: unknown) => publish({ ...state, status: "error", error: errorText(error) }));
}

/**
 * Seed a draft from the card once per card revision.
 *
 * The card arrives after the draft has loaded, so a page cannot seed at first
 * render; and a save made from the same page re-publishes the card, which must
 * not re-apply lines the rep has since cleared. Keying on `updatedAt` gives
 * both: the first card seeds, a later card revision seeds again, repeats of the
 * same revision do not.
 */
export function useInstallationRateCardSeed(apply: (card: InstallationRateCard) => void): void {
  const { card } = useInstallationRateCard();
  const applied = useRef("");
  useEffect(() => {
    if (!card.updatedAt || applied.current === card.updatedAt) return;
    applied.current = card.updatedAt;
    apply(card);
  }, [card, apply]);
}

/** The card, and a first read kicked off on mount. */
export function useInstallationRateCard(): InstallationRateCardState {
  const snapshot = useSyncExternalStore(
    subscribeInstallationRateCard,
    installationRateCardSnapshot,
    installationRateCardSnapshot,
  );
  useEffect(() => {
    void loadInstallationRateCard();
  }, []);
  return snapshot;
}
