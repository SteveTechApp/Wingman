#!/usr/bin/env node
// Apply wingman migrations (server/migrations/*.sql) to a Supabase project via
// the Management API, WITHOUT a database password or `supabase link`. The
// Management API's non-read-only endpoint executes SQL server-side as the
// project owner, so the only credential needed is a Supabase access token.
//
//   node tools/apply-wingman-migrations.mjs 007 008              # dry-run plan
//   node tools/apply-wingman-migrations.mjs 007 008 --apply      # execute
//   node tools/apply-wingman-migrations.mjs --list               # list files
//
// Splits each migration into individual statements (comment-, quote-, and
// dollar-quote-aware so plpgsql $$..$$ bodies in later migrations survive) and
// sends one POST per statement, stopping at the first failure so a migration
// never half-applies.
//
// Credentials/project resolution:
//   SUPABASE_ACCESS_TOKEN  (env) or ~/.supabase/access-token   (sbp_...)
//   --project-ref <ref>    or SUPABASE_URL env (protocol://<ref>.supabase.co)
//
// Safety: only files directly under server/migrations/ can be selected, the
// default is a dry-run that prints every statement, and --apply is required
// for any actual write.

import { readFileSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.resolve(__dirname, "..", "server", "migrations");

// ---------------------------------------------------------------------------
// Statement splitting (SQL-aware enough for these migrations)
// ---------------------------------------------------------------------------

export function splitStatements(sql) {
  const statements = [];
  let current = "";
  let inSingle = false;
  let inDouble = false;
  let inLineComment = false;
  let inBlockComment = false;
  let inDollar = null; // tag string, e.g. "$$" or "$func$"

  const dollarQuoteStart = (text, index) => {
    const match = /\$[A-Za-z0-9_]*\$/.exec(text.slice(index, index + 64));
    if (!match || match.index !== 0) return null;
    return match[0];
  };

  for (let i = 0; i < sql.length; i += 1) {
    const ch = sql[i];
    const next = sql[i + 1];

    // Comments are dropped entirely: they carry no execution semantics, and
    // keeping them out of statements keeps the dry-run preview and the posted
    // SQL pure.
    if (inLineComment) {
      if (ch === "\n") inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      if (ch === "*" && next === "/") {
        i += 1;
        inBlockComment = false;
      }
      continue;
    }
    if (inDollar) {
      if (sql.startsWith(inDollar, i)) {
        current += inDollar;
        i += inDollar.length - 1;
        inDollar = null;
      } else {
        current += ch;
      }
      continue;
    }
    if (inSingle) {
      current += ch;
      if (ch === "'") inSingle = false;
      continue;
    }
    if (inDouble) {
      current += ch;
      if (ch === '"') inDouble = false;
      continue;
    }

    // Not inside any quoted region: look for boundaries.
    if (ch === "-" && next === "-") {
      inLineComment = true;
      i += 1;
      continue;
    }
    if (ch === "/" && next === "*") {
      inBlockComment = true;
      i += 1;
      continue;
    }
    if (ch === "'") {
      inSingle = true;
      current += ch;
      continue;
    }
    if (ch === '"') {
      inDouble = true;
      current += ch;
      continue;
    }
    const dollarTag = dollarQuoteStart(sql, i);
    if (dollarTag) {
      inDollar = dollarTag;
      current += dollarTag;
      i += dollarTag.length - 1;
      continue;
    }
    if (ch === ";") {
      const trimmed = current.trim();
      if (trimmed) statements.push(`${trimmed};`);
      current = "";
      continue;
    }
    current += ch;
  }

  const trailing = current.trim();
  if (trailing) statements.push(trailing);
  return statements;
}

// ---------------------------------------------------------------------------
// Auth / project resolution
// ---------------------------------------------------------------------------

function resolveToken() {
  if (process.env.SUPABASE_ACCESS_TOKEN) return process.env.SUPABASE_ACCESS_TOKEN.trim();
  try {
    const file = path.join(homedir(), ".supabase", "access-token");
    const token = readFileSync(file, "utf8").trim();
    if (token) return token;
  } catch {
    // fall through
  }
  return "";
}

function resolveProjectRef(explicitRef) {
  if (explicitRef && /^[a-z0-9]{20,24}$/.test(explicitRef)) return explicitRef;
  const url = String(process.env.SUPABASE_URL || "").trim();
  const match = /^https?:\/\/([a-z0-9]{20,24})\.supabase\.co/.exec(url);
  if (match) return match[1];
  return "";
}

// ---------------------------------------------------------------------------
// API calls
// ---------------------------------------------------------------------------

async function apiPost(token, ref, endpoint, body) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let parsed = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = text;
  }
  return { status: response.status, parsed };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
const args = process.argv.slice(2);
const wantsList = args.includes("--list");
const apply = args.includes("--apply");
const explicitRef = args.find((arg) => arg.startsWith("--project-ref="))?.split("=")[1] || "";

const migrations = readdirSync(MIGRATIONS_DIR)
  .filter((name) => /^\d{3}_[a-z0-9_]+\.sql$/.test(name))
  .sort();

if (wantsList) {
  console.log(migrations.map((name) => name.slice(0, 3)).join(" "));
  for (const name of migrations) console.log(`  ${name.slice(0, 3)}  ${name}`);
  process.exit(0);
}

const selected = args.filter((arg) => /^\d{3}$/.test(arg)).sort();
const picked = migrations.filter((name) => selected.includes(name.slice(0, 3)));
if (selected.length === 0) {
  console.error("Usage: node tools/apply-wingman-migrations.mjs <NNN> [<NNN>...] [--apply] [--project-ref=<ref>]");
  console.error("       node tools/apply-wingman-migrations.mjs --list");
  process.exit(2);
}
const missing = selected.filter((num) => !picked.some((name) => name.startsWith(num)));
if (missing.length) {
  console.error(`No migration file for: ${missing.join(", ")}`);
  process.exit(2);
}

console.log(`[apply-migrations] ${picked.length} migration(s)${apply ? "" : " (DRY-RUN - pass --apply to execute)"}\n`);

for (const name of picked) {
  const sql = readFileSync(path.join(MIGRATIONS_DIR, name), "utf8");
  const statements = splitStatements(sql);
  console.log(`== ${name} (${statements.length} statements)`);
  if (!apply) {
    for (const statement of statements) {
      console.log(`   ${statement.replace(/\s+/g, " ").slice(0, 140)}${statement.length > 140 ? "…" : ""}`);
    }
    continue;
  }
  const token = resolveToken();
  if (!token) {
    console.error(
      "[apply-migrations] No Supabase access token found.\n" +
        "  Run `supabase login` in your own terminal (writes ~/.supabase/access-token),\n" +
        "  or set SUPABASE_ACCESS_TOKEN to an sbp_... token from the Supabase dashboard.",
    );
    process.exit(3);
  }
  const ref = resolveProjectRef(explicitRef);
  if (!ref) {
    console.error("[apply-migrations] Cannot resolve project ref. Pass --project-ref=<ref> or set SUPABASE_URL.");
    process.exit(3);
  }
  console.log(`[apply-migrations] executing against project ${ref}\n`);
  // ONE request per migration: all statements go in a single query string, so
  // Postgres runs them inside one implicit transaction. If any statement
  // fails, the whole migration rolls back - a partial apply (function created
  // but its revoke/grant never ran, half the indexes dropped) is impossible.
  // Migrations here are all transactional DDL/DML; none use non-transactional
  // constructs (CREATE INDEX CONCURRENTLY, VACUUM).
  const combined = statements.join(";\n\n");
  const { status, parsed } = await apiPost(token, ref, "query", { query: combined });
  const okay = status >= 200 && status < 300;
  if (okay) {
    console.log(`   -> ${name} applied atomically (${statements.length} statements, one transaction)`);
  } else {
    console.error(
      `   [FAIL] ${name} - NOTHING APPLIED (transaction rolled back). ${status} ${String(parsed?.message ?? parsed ?? "").slice(0, 300)}`,
    );
    console.error("[apply-migrations] Migration aborted atomically - no partial state left behind.");
    process.exit(1);
  }
}

console.log("\n[apply-migrations] done. Verify with: node tools/check-migration-live-state.mjs");
}
