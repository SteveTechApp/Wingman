#!/usr/bin/env node
// Guards the two Wingman migration sets against divergence.
//
// server/migrations/ and supabase/migrations/ both create the same nine
// application tables. They are applied by different routes: the documented
// operator runbook (LAUNCH_CHECKLIST.md section 4) applies server/migrations,
// while the Supabase GitHub integration applies supabase/migrations. Until
// 20260724 the supabase set enabled RLS on nothing and defined no policy, so
// which route provisioned production silently decided whether the database
// had row level security at all.
//
// This check fails if the two sets ever stop covering the same tables, or if
// either set leaves a table without RLS and a service-role policy.

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];

function readSet(relativeDir) {
  const directory = path.join(projectRoot, relativeDir);
  return readdirSync(directory)
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .map((file) => readFileSync(path.join(directory, file), "utf8"))
    .join("\n")
    .toLowerCase();
}

function tablesIn(sql) {
  const found = new Set();
  for (const match of sql.matchAll(/create table if not exists\s+(?:public\.)?([a-z_]+)/g)) {
    found.add(match[1]);
  }
  return found;
}

function rlsEnabledIn(sql) {
  const found = new Set();
  for (const match of sql.matchAll(/alter table\s+(?:public\.)?([a-z_]+)\s+enable row level security/g)) {
    found.add(match[1]);
  }
  return found;
}

function servicePolicyTablesIn(sql) {
  const found = new Set();
  for (const match of sql.matchAll(/create policy\s+\S+\s+on\s+(?:public\.)?([a-z_]+)[^;]*to service_role/g)) {
    found.add(match[1]);
  }
  return found;
}

const sets = {
  "server/migrations": readSet("server/migrations"),
  "supabase/migrations": readSet("supabase/migrations"),
};

const tablesBySet = Object.fromEntries(
  Object.entries(sets).map(([name, sql]) => [name, tablesIn(sql)]),
);

// 1. Both sets must create exactly the same tables.
const [firstSet, secondSet] = Object.keys(sets);
const onlyInFirst = [...tablesBySet[firstSet]].filter((t) => !tablesBySet[secondSet].has(t)).sort();
const onlyInSecond = [...tablesBySet[secondSet]].filter((t) => !tablesBySet[firstSet].has(t)).sort();

for (const table of onlyInFirst) {
  errors.push(`${table} is created in ${firstSet} but not in ${secondSet}.`);
}
for (const table of onlyInSecond) {
  errors.push(`${table} is created in ${secondSet} but not in ${firstSet}.`);
}

// 2. Every table in every set must have RLS enabled and a service-role policy.
for (const [name, sql] of Object.entries(sets)) {
  const tables = tablesBySet[name];
  const rlsEnabled = rlsEnabledIn(sql);
  const policied = servicePolicyTablesIn(sql);

  for (const table of [...tables].sort()) {
    if (!rlsEnabled.has(table)) {
      errors.push(`${name}: ${table} never gets ENABLE ROW LEVEL SECURITY.`);
    }
    if (!policied.has(table)) {
      errors.push(`${name}: ${table} has no service_role-scoped policy.`);
    }
  }
}

if (errors.length) {
  console.error("[migration-parity] Check failed:");
  for (const error of errors) console.error(`- ${error}`);
  console.error(
    "\nBoth migration sets must create the same tables and give every table RLS plus a\n" +
      "service_role policy. A set without RLS leaves application tables readable by the\n" +
      "anon key, which ships publicly in the browser bundle.",
  );
  process.exit(1);
}

const tableCount = tablesBySet[firstSet].size;
console.log(
  `[migration-parity] Verified ${Object.keys(sets).length} migration sets cover the same ` +
    `${tableCount} tables, each with RLS enabled and a service_role policy.`,
);
