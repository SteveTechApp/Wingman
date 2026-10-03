#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { atomicWriteJsonSync } from "./lib/atomic-json-writer.mjs";

const root = process.cwd();
const dbPath = path.join(root, "data", "admin", "wingman-product-admin-db.json");

const allowedStatuses = new Set([
  "live",
  "do-not-use",
  "review",
  "draft",
  "unlisted",
  "source-controlled"
]);

function readDb() {
  if (!fs.existsSync(dbPath)) {
    return { schemaVersion: 1, records: {} };
  }

  const parsed = JSON.parse(fs.readFileSync(dbPath, "utf8").replace(/^\uFEFF/, ""));
  if (!parsed.records || typeof parsed.records !== "object") {
    throw new Error("Invalid admin DB: records object is missing.");
  }

  return parsed;
}

function writeDb(db) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  atomicWriteJsonSync(dbPath, db);
}

function normaliseSku(value) {
  return String(value || "").trim().toUpperCase();
}

function usage() {
  console.log(`
Wingman admin product DB

Commands:
  node tools/admin-product-db.mjs list
  node tools/admin-product-db.mjs get <SKU>
  node tools/admin-product-db.mjs set-status <SKU> <live|do-not-use|review|draft|unlisted|source-controlled> [note]
  node tools/admin-product-db.mjs set-note <SKU> <note>
  node tools/admin-product-db.mjs set-evidence <SKU> <url>
  node tools/admin-product-db.mjs remove <SKU>
  node tools/admin-product-db.mjs validate
`);
}

function ensureRecord(db, sku) {
  if (!db.records[sku]) {
    db.records[sku] = {
      sku,
      statusOverride: "source-controlled",
      doNotUse: false,
      visibility: "default",
      adminNotes: "",
      evidenceUrl: "",
      updatedBy: "admin",
      updatedAt: new Date().toISOString()
    };
  }

  return db.records[sku];
}

const [command, rawSku, value, ...rest] = process.argv.slice(2);
const db = readDb();

if (!command || command === "help") {
  usage();
  process.exit(0);
}

if (command === "list") {
  const records = Object.values(db.records).sort((a, b) => a.sku.localeCompare(b.sku));

  if (records.length === 0) {
    console.log("No admin overrides found.");
    process.exit(0);
  }

  for (const record of records) {
    console.log(`${record.sku} | ${record.statusOverride} | doNotUse=${record.doNotUse} | ${record.adminNotes || ""}`);
  }

  process.exit(0);
}

if (command === "get") {
  const sku = normaliseSku(rawSku);
  console.log(JSON.stringify(db.records[sku] || null, null, 2));
  process.exit(0);
}

if (command === "set-status") {
  const sku = normaliseSku(rawSku);
  const status = String(value || "").trim().toLowerCase();
  const note = rest.join(" ").trim();

  if (!sku) {
    throw new Error("SKU is required.");
  }

  if (!allowedStatuses.has(status)) {
    throw new Error(`Invalid status: ${status}`);
  }

  const record = ensureRecord(db, sku);
  record.statusOverride = status;
  record.doNotUse = status === "do-not-use";
  record.visibility = status === "do-not-use" ? "hidden" : "default";

  if (note) {
    record.adminNotes = note;
  }

  record.updatedBy = "admin";
  record.updatedAt = new Date().toISOString();

  writeDb(db);
  console.log(`Updated ${sku}: ${status}`);
  process.exit(0);
}

if (command === "set-note") {
  const sku = normaliseSku(rawSku);
  const note = [value, ...rest].join(" ").trim();

  if (!sku) {
    throw new Error("SKU is required.");
  }

  const record = ensureRecord(db, sku);
  record.adminNotes = note;
  record.updatedBy = "admin";
  record.updatedAt = new Date().toISOString();

  writeDb(db);
  console.log(`Updated note for ${sku}`);
  process.exit(0);
}

if (command === "set-evidence") {
  const sku = normaliseSku(rawSku);
  const evidenceUrl = String(value || "").trim();

  if (!sku) {
    throw new Error("SKU is required.");
  }

  const record = ensureRecord(db, sku);
  record.evidenceUrl = evidenceUrl;
  record.updatedBy = "admin";
  record.updatedAt = new Date().toISOString();

  writeDb(db);
  console.log(`Updated evidence URL for ${sku}`);
  process.exit(0);
}

if (command === "remove") {
  const sku = normaliseSku(rawSku);

  if (!sku) {
    throw new Error("SKU is required.");
  }

  delete db.records[sku];
  writeDb(db);
  console.log(`Removed admin override for ${sku}`);
  process.exit(0);
}

if (command === "validate") {
  for (const [sku, record] of Object.entries(db.records)) {
    if (sku !== normaliseSku(record.sku)) {
      throw new Error(`Record key does not match normalised SKU: ${sku}`);
    }

    if (!allowedStatuses.has(record.statusOverride)) {
      throw new Error(`Invalid status for ${sku}: ${record.statusOverride}`);
    }

    if (typeof record.doNotUse !== "boolean") {
      throw new Error(`Invalid doNotUse value for ${sku}`);
    }
  }

  console.log(`[admin-product-db] OK: ${Object.keys(db.records).length} admin override record(s).`);
  process.exit(0);
}

throw new Error(`Unknown command: ${command}`);
