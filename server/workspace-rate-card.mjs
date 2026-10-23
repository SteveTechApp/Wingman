import fs from "node:fs/promises";
import path from "node:path";
import { RUNTIME_DATA_DIR } from "./catalog/files.mjs";
import { writeJsonFileAtomic } from "./atomic-json-file.mjs";
import { getWingmanRequestAuth } from "./wingman-app-store.mjs";

/**
 * A rep's installation rate card, kept on the signed-in user's workspace rather
 * than in one browser's storage, so the baseline they priced last week is the
 * one they start from on another machine.
 *
 * The card is a personal baseline, not workspace configuration: the key is
 * workspace *and* user, so two reps in one workspace never overwrite each
 * other's rates, and an invitation to a second workspace starts from an empty
 * card rather than another team's prices. Like the site survey sync it is a
 * small side-car store: rates are not project documents and do not belong in
 * the project snapshot.
 */

export const INSTALLATION_RATE_CARD_FILE = path.join(RUNTIME_DATA_DIR, "installation-rate-cards.json");

const CURRENCIES = ["GBP", "USD", "EUR"];
const MAX_RATES = 500;
const MAX_RATE_LENGTH = 24;

let lockTail = Promise.resolve();

function withLock(work) {
  const run = lockTail.then(work, work);
  lockTail = run.then(() => undefined, () => undefined);
  return run;
}

async function readStore() {
  try {
    const parsed = JSON.parse(await fs.readFile(INSTALLATION_RATE_CARD_FILE, "utf8"));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    if (error?.code === "ENOENT") return {};
    throw error;
  }
}

export const EMPTY_RATE_CARD = { updatedAt: "", currency: "GBP", rates: {} };

/** The card a rep starts from before they have saved one. */
export function emptyRateCard() {
  return { ...EMPTY_RATE_CARD, rates: {} };
}

/**
 * A rate has to be one the proposal could print: the same rule the pricing
 * panel and the export apply, so the stored card cannot hold a price they would
 * call TBC. A blank cell is not a rate and is dropped rather than stored as 0.
 */
function rateText(value) {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const text = String(value).trim();
  if (text === "" || text.length > MAX_RATE_LENGTH) return null;
  const number = Number(text);
  return Number.isFinite(number) && number >= 0 ? text : null;
}

/** The usable entries of a rate map, with every unprintable value dropped. */
export function usableRates(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const rates = {};
  for (const [rawId, rawRate] of Object.entries(value)) {
    const id = String(rawId).trim();
    if (!id || id.length > 120) continue;
    const text = rateText(rawRate);
    if (text === null) continue;
    rates[id] = text;
    if (Object.keys(rates).length >= MAX_RATES) break;
  }
  return rates;
}

/** Check a stored card before it is served or written again. */
export function normalizeRateCard(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return emptyRateCard();
  const currency = CURRENCIES.includes(value.currency) ? value.currency : EMPTY_RATE_CARD.currency;
  return {
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : "",
    currency,
    rates: usableRates(value.rates),
  };
}

/**
 * Merge what this proposal priced over the saved baseline. A blank cell leaves
 * the saved rate alone, so one proposal cannot erase a price another still
 * needs; a typed rate replaces it.
 */
export function mergeRateCard(current, incoming, now = new Date().toISOString()) {
  const saved = normalizeRateCard(current);
  const rates = { ...saved.rates, ...usableRates(incoming?.rates) };
  return normalizeRateCard({
    updatedAt: Object.keys(usableRates(incoming?.rates)).length ? now : saved.updatedAt,
    currency: CURRENCIES.includes(incoming?.currency) ? incoming.currency : saved.currency,
    rates,
  });
}

export function rateCardKey(auth) {
  return `${auth.workspace.id}:${auth.user.id}`;
}

async function requireUser(req, res, url, sendJson) {
  const auth = await getWingmanRequestAuth(req, url);
  if (!auth.ok) {
    sendJson(res, 401, { ok: false, error: auth.error });
    return null;
  }
  return auth;
}

export async function handleInstallationRateCardGet(req, res, url, { sendJson }) {
  const auth = await requireUser(req, res, url, sendJson);
  if (!auth) return;
  const store = await readStore();
  const card = normalizeRateCard(store[rateCardKey(auth)]);
  sendJson(res, 200, { ok: true, card });
}

export async function handleInstallationRateCardPut(req, res, url, { sendJson, parseJsonBody }) {
  const auth = await requireUser(req, res, url, sendJson);
  if (!auth) return;
  // Pricing a wall is project work, so a read-only role cannot change the
  // baseline every proposal in the workspace starts from.
  if (!auth.permissions.canEditProjects) {
    sendJson(res, 403, { ok: false, error: "This workspace role cannot save installation rates." });
    return;
  }

  let body = {};
  try {
    body = await parseJsonBody(req);
  } catch {
    sendJson(res, 400, { ok: false, error: "Invalid JSON body." });
    return;
  }
  const incoming = body?.rates;
  if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) {
    sendJson(res, 400, { ok: false, error: "Installation rates must be a map of line id to rate." });
    return;
  }
  if (body?.currency !== undefined && !CURRENCIES.includes(body.currency)) {
    sendJson(res, 400, { ok: false, error: "Unsupported rate card currency." });
    return;
  }

  const saved = await withLock(async () => {
    const store = await readStore();
    const key = rateCardKey(auth);
    const card = mergeRateCard(store[key], { rates: incoming, currency: body?.currency });
    store[key] = card;
    await writeJsonFileAtomic(INSTALLATION_RATE_CARD_FILE, store);
    return card;
  });

  sendJson(res, 200, { ok: true, card: saved });
}

