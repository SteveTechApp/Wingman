import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// product-intelligence-store.mjs is FILE-DB-ONLY by design: it reads the
// gitignored PRODUCT_INTELLIGENCE_DB_FILE through node:fs and writes it via
// the shared crash-atomic helper (server/atomic-json-file.mjs, temp+rename),
// and has no Supabase client. This pin keeps it that way. If a Supabase
// client, a table-mode read, or an RPC call is ever introduced here, the ONLY
// sanctioned path is the paging helper readAllSupabaseRows
// (server/supabase-pagination.mjs) - PostgREST caps responses at 1000 rows,
// and an unpaged full-table read silently truncates. This test fails on that
// introduction so the change has to be a deliberate, paginated one.

const storeDir = path.dirname(fileURLToPath(import.meta.url));
const STORE_PATH = path.join(storeDir, "product-intelligence-store.mjs");
const APP_STORE_PATH = path.join(storeDir, "wingman-app-store.mjs");

const storeSource = () => readFileSync(STORE_PATH, "utf8");

// Supabase access vectors: a client instance (getSupabaseClient / supabase-js
// import), any PostgREST REST-URL fetch, and the write-side RPC helpers.
function findSupabaseVector(source) {
  const patterns = [
    /getSupabaseClient\s*\(/,
    /createClient\s*\(/,
    /@supabase\//,
    /rest\/v1\//,
    /client\s*\.\s*rpc\s*\(/,
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(source);
    if (match) return { pattern: String(pattern), index: match.index };
  }
  return null;
}

// Table-mode reads/writes: `client.from("...")`/`client.from(TABLE)` chains.
// A .from( introduced WITHOUT a range/limit bound on its statement is the
// truncation hazard this pin exists to prevent (a head-only count or a filter
// is fine - it cannot truncate silently).
function findUnpagedTableRead(source) {
  const fromPattern = /client\s*\.\s*from\s*\(/g;
  let match;
  while ((match = fromPattern.exec(source)) !== null) {
    const rest = source.slice(match.index, match.index + 1200);
    const statement = rest.split(";")[0];
    const line = source.slice(0, match.index).split("\n").length;
    const bounded =
      /\.range\s*\(/.test(statement) ||
      /\.limit\s*\(/.test(statement) ||
      /head\s*:\s*true/.test(statement) ||
      /\.(eq|neq|in|lt|lte|gt|gte|maybeSingle|single)\s*\(/.test(statement);
    if (!bounded) return { line, statement: statement.trim().slice(0, 160) };
  }
  return null;
}

describe("product-intelligence-store stays file-db-only", () => {
  it("imports no Supabase client and no table-mode helpers", () => {
    const vector = findSupabaseVector(storeSource());
    expect(
      vector,
      vector
        ? `product-intelligence-store.mjs must stay file-db-only, but Supabase access appeared (pattern ${vector.pattern} at char ${vector.index}). ` +
            "If a Supabase-backed read is genuinely needed, use the paging helper readAllSupabaseRows from server/supabase-pagination.mjs - " +
            "PostgREST caps responses at 1000 rows and an unpaged full-table read silently truncates - and update this pin deliberately."
        : undefined,
    ).toBeNull();
  });

  it("reads and writes the file DB rather than any remote store", () => {
    const source = storeSource();
    expect(source).toContain("PRODUCT_INTELLIGENCE_DB_FILE");
    // The read stays on node:fs and the write goes through the shared
    // crash-atomic helper (temp+rename) - both file-local, never remote.
    expect(source).toMatch(/fs\.(readFile|writeFile)\(/);
    expect(source).toContain('import { writeJsonFileAtomic } from "./atomic-json-file.mjs"');
    expect(source).toContain("writeJsonFileAtomic(filePath, payload)");
  });

  it("would catch a table-mode read introduced without pagination (self-test)", () => {
    const offender = `export async function bad(client) {
  return client.from("wingman_users").select("*");
}`;
    const hit = findUnpagedTableRead(offender);
    expect(hit).not.toBeNull();
    expect(hit.statement).toContain('from("wingman_users")');
    // The same table read, paginated, must NOT trip the matcher.
    const compliant = `export async function good(client) {
  return client.from("wingman_users").select("*").range(0, 999);
}`;
    expect(findUnpagedTableRead(compliant)).toBeNull();
  });

  it("detects a table-mode read actually added to the store source (not just fixtures)", () => {
    const hit = findUnpagedTableRead(storeSource());
    expect(
      hit,
      hit
        ? `product-intelligence-store.mjs line ${hit.line} reads a table without a bound (${hit.statement}). ` +
            "Use readAllSupabaseRows (server/supabase-pagination.mjs) - PostgREST caps responses at 1000 rows - or add a range/limit/filter, " +
            "then update this pin deliberately."
        : undefined,
    ).toBeNull();
  });
});

describe("the sanctioned pagination helper stays the paged one", () => {
  it("wingman-app-store keeps using readAllSupabaseRows for its table reads", () => {
    const appStoreSource = readFileSync(APP_STORE_PATH, "utf8");
    expect(appStoreSource).toContain('from "./supabase-pagination.mjs"');
  });
});
