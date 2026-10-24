// WyreStorm lifecycle status for a SKU, read from the committed CSV the same way
// the app resolves it.
//
// Several gates ask "may this SKU be quoted as current equipment?" about
// different surfaces: room template BOMs, successor references, and (since the
// fixture gate) sample BOMs and test fixtures. Each one carrying its own CSV
// reader would let them disagree about the same row — and the alias rule below
// is exactly the kind of detail a second copy gets wrong. Reading the CSV raw
// reports APO-VX20-UC and MX-0808-SCL as "review" placeholders when the app
// serves them as active through their canonical `-V2` forms, so a second
// implementation is a gate that blocks a SKU the app is happy to quote.

import { readFileSync } from "node:fs";
import path from "node:path";

/** Where the committed lifecycle table lives, relative to the repository root. */
export const LIFECYCLE_CSV_PATH = path.join("data-sources", "wyrestorm", "lifecycle.csv");

/**
 * Rows as written: one object per line, header names as keys, quotes stripped.
 * A leading byte-order mark is dropped so the first header name is usable.
 */
export function parseLifecycleCsv(text) {
  const lines = String(text ?? "").replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const header = lines[0].split(",").map((cell) => cell.trim().replace(/^"|"$/g, ""));
  const rows = [];
  for (const line of lines.slice(1)) {
    const values = [];
    let current = "";
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') inQuotes = !inQuotes;
      else if (char === "," && !inQuotes) {
        values.push(current);
        current = "";
      } else current += char;
    }
    values.push(current);
    const row = {};
    header.forEach((name, index) => {
      row[name] = (values[index] ?? "").replace(/^"|"$/g, "").trim();
    });
    rows.push(row);
  }
  return rows;
}

/**
 * The statuses that settle the question. A row marked anything else (the
 * "review" placeholders) is not evidence either way, so the alias rule below
 * gets to answer instead.
 */
export const DEFINITIVE_LIFECYCLE_STATUSES = new Set(["active", "discontinued", "do-not-spec", "cable"]);

/** The statuses that cannot be quoted as current equipment. */
export const RETIRED_LIFECYCLE_STATUSES = new Set(["discontinued", "do-not-spec"]);

/** Rows keyed by upper-case SKU, so a lookup cannot miss on case. */
export function lifecycleRowsBySku(rows) {
  const bySku = new Map();
  for (const row of rows) {
    const sku = String(row?.sku ?? "").trim().toUpperCase();
    if (sku) bySku.set(sku, row);
  }
  return bySku;
}

/**
 * The lifecycle status a SKU resolves to, alias-aware.
 *
 * A definitive row answers directly. A non-definitive one falls through to the
 * canonical `-V2` form (the same rule `wyrestormSkuBusinessStatus.ts` applies),
 * and only then does the placeholder itself stand. A SKU with no row at all is
 * "unlisted" — unproven rather than retired, which is why the gates treat it
 * separately from the statuses in `RETIRED_LIFECYCLE_STATUSES`.
 */
export function resolveSkuStatus(sku, rowsBySku) {
  const key = String(sku ?? "").trim().toUpperCase();
  if (!key) return "unlisted";
  const direct = rowsBySku.get(key);
  const directStatus = String(direct?.lifecycle_status ?? "").toLowerCase();
  if (DEFINITIVE_LIFECYCLE_STATUSES.has(directStatus)) return directStatus;
  const canonicalStatus = String(rowsBySku.get(`${key}-V2`)?.lifecycle_status ?? "").toLowerCase();
  if (DEFINITIVE_LIFECYCLE_STATUSES.has(canonicalStatus)) return canonicalStatus;
  return directStatus || "unlisted";
}

/** The committed lifecycle table, keyed by SKU, loaded from `root`. */
export function loadLifecycleRows(root = process.cwd()) {
  return lifecycleRowsBySku(parseLifecycleCsv(readFileSync(path.join(root, LIFECYCLE_CSV_PATH), "utf8")));
}
