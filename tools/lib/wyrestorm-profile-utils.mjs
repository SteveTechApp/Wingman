/**
 * Shared pure helpers for the WyreStorm governed-profile toolchain.
 *
 * Owned jointly by the campaign draft tool, the PDF spec-sheet ingest tool and
 * the govern batch so profile shape, schema validation, class mapping and
 * atomic writes can never drift between them.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export function text(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

export function unique(values, limit = 30) {
  return Array.from(new Set(values.map(text).filter(Boolean))).slice(0, limit);
}

export function list(value) {
  return Array.isArray(value) ? value : [];
}

export function normaliseSkuKey(value) {
  return text(value).toUpperCase().replace(/[^A-Z0-9]/g, "");
}

// Prefix rule only - the caller supplies the productClassification fallback
// when the SKU prefix does not resolve (e.g. COM-MIC-HUB, HALO-30).
export function productClassFromSku(sku) {
  const key = text(sku).toUpperCase();
  if (key.startsWith("NHD-")) return "AVOIP";
  if (key.startsWith("MX-") || key.startsWith("MXV-")) return "MATRIX";
  if (key.startsWith("EX") || key.startsWith("RX") || key.startsWith("TX")) return "HDBASET";
  if (key.startsWith("SW-")) return "PRESENTATION";
  if (key.startsWith("CAM-")) return "CAMERA";
  if (key.startsWith("AMP-")) return "AUDIO";
  if (key.startsWith("APO-") || key.startsWith("HALO-") || key.startsWith("FOCUS-")) return "UC";
  if (key.startsWith("SYN-")) return "CONTROL";
  return "";
}

export function profileClass(product) {
  const primary = text(product.productClassification?.primaryCategory).toUpperCase();
  const sku = text(product.sku).toUpperCase();
  if (sku.startsWith("NHD-")) return "AVOIP";
  if (sku.startsWith("MX-") || sku.startsWith("MXV-")) return "MATRIX";
  if (sku.startsWith("EX") || sku.startsWith("RX") || sku.startsWith("TX")) return "HDBASET";
  if (sku.startsWith("SW-")) return "PRESENTATION";
  if (sku.startsWith("CAM-") || primary.includes("CAMERA")) return "CAMERA";
  if (sku.startsWith("AMP-") || primary.includes("AUDIO")) return "AUDIO";
  if (sku.startsWith("APO-") || sku.startsWith("HALO-") || sku.startsWith("FOCUS-")) return "UC";
  if (sku.startsWith("SYN-")) return "CONTROL";
  return primary.replace(/[^A-Z0-9]+/g, "_") || "OTHER";
}

export function validateSchema(value, schema, location = "$") {
  const errors = [];
  const typeMatches = {
    object: (candidate) => candidate !== null && typeof candidate === "object" && !Array.isArray(candidate),
    array: Array.isArray,
    string: (candidate) => typeof candidate === "string",
    integer: Number.isInteger,
  };
  if (schema.type && !typeMatches[schema.type]?.(value)) return [`${location} must be ${schema.type}.`];
  if (schema.enum && !schema.enum.includes(value)) errors.push(`${location} has an invalid value.`);
  if (typeof value === "string" && schema.minLength !== undefined && value.length < schema.minLength) errors.push(`${location} is too short.`);
  if (typeof value === "number" && schema.minimum !== undefined && value < schema.minimum) errors.push(`${location} is below its minimum.`);
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) errors.push(`${location} has too few items.`);
    if (schema.items) value.forEach((item, index) => errors.push(...validateSchema(item, schema.items, `${location}[${index}]`)));
  }
  if (typeMatches.object(value)) {
    for (const required of schema.required ?? []) {
      if (!Object.hasOwn(value, required)) errors.push(`${location}.${required} is required.`);
    }
    for (const [key, childSchema] of Object.entries(schema.properties ?? {})) {
      if (Object.hasOwn(value, key)) errors.push(...validateSchema(value[key], childSchema, `${location}.${key}`));
    }
  }
  return errors;
}

export function atomicWriteJson(filePath, value) {
  const temporary = path.join(
    path.dirname(filePath),
    `.${path.basename(filePath)}.${process.pid}.${Date.now()}.${os.hostname()}.tmp`,
  );
  let descriptor;
  try {
    descriptor = fs.openSync(temporary, "wx", 0o600);
    fs.writeFileSync(descriptor, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    fs.fsyncSync(descriptor);
    fs.closeSync(descriptor);
    descriptor = undefined;
    fs.renameSync(temporary, filePath);
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}
