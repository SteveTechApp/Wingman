/**
 * Deterministic artifact writes for generated audit/report files.
 *
 * Regression class: a chain step stamps `new Date().toISOString()` into a
 * TRACKED generated artifact on every run, so an unchanged-data rerun still
 * dirties git (timestamp-only churn). That noise broke clean-checkout
 * discipline twice during launch prep - engineers reverted, stashed or
 * doubted real changes because a governance rerun had touched nothing but a
 * `Generated:` line.
 *
 * Contract implemented here:
 *   - Serialize the payload WITHOUT wall-clock time. `generatedAt` is
 *     derived deterministically from the inputs' content: if a
 *     `inputsHash` is supplied (sha256 of the raw input bytes the report
 *     summarizes), the timestamp becomes `input-<hash12>` instead of an ISO
 *     stamp - identical inputs produce byte-identical artifacts on every
 *     machine.
 *   - Write only when the rendered content differs from what is on disk.
 *     An unchanged rerun leaves mtime AND git untouched.
 *   - The JSON artifact is the source of truth for the pair; the markdown
 *     report renders from the same payload, so both artifacts move or stay
 *     together.
 */

import { createHash } from "node:crypto";
import fsSync from "node:fs";
import path from "node:path";
import { serializeJson, atomicWriteJsonSync } from "./atomic-json-writer.mjs";

/**
 * Deterministic timestamp for a report: derived from the inputs, not the
 * wall clock. Pass `inputsHash` (hex sha256 of the raw input bytes) when you
 * have it; fall back to a caller-supplied `measuredAt` (e.g. the newest
 * evidence date inside the data) rather than `new Date()`.
 */
export function deterministicGeneratedAt({ inputsHash, measuredAt } = {}) {
  if (inputsHash) return `input-${String(inputsHash).slice(0, 12)}`;
  if (measuredAt) return String(measuredAt);
  throw new Error(
    "[deterministic-artifact] deterministicGeneratedAt requires inputsHash or measuredAt - wall-clock stamps are what made these artifacts churn.",
  );
}

/** sha256 of the exact bytes fed into the report. */
export function inputsHashOf(...rawInputs) {
  const hash = createHash("sha256");
  for (const input of rawInputs) hash.update(input);
  return hash.digest("hex");
}

/**
 * Write the JSON + markdown artifact pair deterministically.
 *
 * Returns `{ changed: boolean, wroteJson: boolean, wroteMarkdown: boolean }`.
 * `changed` is false when both rendered artifacts already sat on disk
 * byte-identical - the caller's rerun then leaves no git churn.
 */
export function writeDeterministicArtifactPair({ jsonPath, markdownPath, payload, markdown }) {
  const jsonText = serializeJson(payload);
  const markdownText = markdown.endsWith("\n") ? markdown : `${markdown}\n`;

  const existingJson = fsSync.existsSync(jsonPath) ? fsSync.readFileSync(jsonPath, "utf8") : null;
  const existingMarkdown = fsSync.existsSync(markdownPath) ? fsSync.readFileSync(markdownPath, "utf8") : null;

  const wroteJson = existingJson !== jsonText;
  const wroteMarkdown = existingMarkdown !== markdownText;

  if (wroteJson) {
    fsSync.mkdirSync(path.dirname(jsonPath), { recursive: true });
    atomicWriteJsonSync(jsonPath, payload);
  }
  if (wroteMarkdown) {
    fsSync.mkdirSync(path.dirname(markdownPath), { recursive: true });
    fsSync.writeFileSync(markdownPath, markdownText, "utf8");
  }

  const changed = wroteJson || wroteMarkdown;
  return { changed, wroteJson, wroteMarkdown };
}
