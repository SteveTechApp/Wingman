#!/usr/bin/env node
// Fix product classifications based on the 2026 WyreStorm Product Guide.
// Run: node tools/fix-product-classifications-2026.mjs

import { readFileSync, writeFileSync } from "node:fs";

const INDEX_PATH = "public/product-intelligence-index.json";
const data = JSON.parse(readFileSync(INDEX_PATH, "utf8"));
const products = data.products || [];
let fixCount = 0;

function findProduct(sku) {
  return products.find((p) => String(p.sku || "").toUpperCase().trim() === sku);
}

function fix(sku, field, oldValue, newValue) {
  const p = findProduct(sku);
  if (!p) {
    console.log(`  SKIP ${sku}: not found in index`);
    return;
  }
  const current = Array.isArray(p[field]) ? p[field].join(", ") : String(p[field] || "");
  if (current.includes(oldValue) || (Array.isArray(p[field]) && p[field].includes(oldValue))) {
    if (Array.isArray(p[field])) {
      p[field] = p[field].map((v) => v === oldValue ? newValue : v);
    } else {
      p[field] = String(p[field] || "").replace(oldValue, newValue);
    }
    console.log(`  FIXED ${sku}: ${field} "${oldValue}" → "${newValue}"`);
    fixCount++;
  } else {
    console.log(`  SKIP ${sku}: "${oldValue}" not found in ${field} (current: "${current.slice(0, 80)}")`);
  }
}

function addTag(sku, tag) {
  const p = findProduct(sku);
  if (!p) return;
  if (!Array.isArray(p.tags)) p.tags = [];
  if (!p.tags.includes(tag)) {
    p.tags.push(tag);
    console.log(`  ADDED ${sku}: tag "${tag}"`);
    fixCount++;
  }
}

function removeTag(sku, tag) {
  const p = findProduct(sku);
  if (!p || !Array.isArray(p.tags)) return;
  const idx = p.tags.indexOf(tag);
  if (idx >= 0) {
    p.tags.splice(idx, 1);
    console.log(`  REMOVED ${sku}: tag "${tag}"`);
    fixCount++;
  }
}

// ── Fix 1: NHD-120-TX/RX should be "NetworkHD 100", not generic AV-over-IP ──
console.log("\n=== Fix 1: NetworkHD 100 series classification ===");
fix("NHD-120-TX", "category", "AV-over-IP", "NetworkHD 100");
fix("NHD-120-RX", "category", "AV-over-IP", "NetworkHD 100");
fix("NHD-124-TX", "category", "AV-over-IP", "NetworkHD 100");
fix("NHD-120-IW-TX", "category", "AV-over-IP", "NetworkHD 100");
fix("NHD-150-RX", "category", "AV-over-IP", "NetworkHD 100");

// ── Fix 2: SW-640L-TX-W — remove false "Video Wall" tag ──
console.log("\n=== Fix 2: SW-640L-TX-W presentation switcher tags ===");
removeTag("SW-640L-TX-W", "Video Wall");
removeTag("SW-640L-TX-W", "Seamless Switching");
removeTag("SW-620-TX-W", "Video Wall");
removeTag("SW-620-TX-W", "Seamless Switching");

// ── Fix 3: MX-0402-MST should be Matrix, not Presentation switching ──
console.log("\n=== Fix 3: MX-0402-MST matrix classification ===");
fix("MX-0402-MST", "category", "Presentation switching", "Matrix switching");
removeTag("MX-0402-MST", "Presentation switcher");
removeTag("MX-0402-MST", "Dual-display / MST room core");
addTag("MX-0402-MST", "Matrix");
addTag("MX-0402-MST", "Matrix switcher");

// ── Fix 4: SW-510-TX is a presentation switcher, not HDBaseT extender ──
console.log("\n=== Fix 4: SW-510-TX presentation switcher classification ===");
fix("SW-510-TX", "category", "HDBaseT extender", "Presentation switcher");
removeTag("SW-510-TX", "HDBaseT extender");
addTag("SW-510-TX", "Presentation switcher");
addTag("SW-510-TX", "HDBaseT");

// ── Fix 5: SW-0X01-8K is a range/family page, not a saleable product ──
console.log("\n=== Fix 5: SW-0X01-8K phantom range page ===");
const sw0x = findProduct("SW-0X01-8K");
if (sw0x) {
  sw0x.reviewRequired = true;
  sw0x.reviewNotes = "Range/family page from product guide — SW-0201-8K and SW-0401-8K are the actual SKUs. Do not present as a single product.";
  if (!Array.isArray(sw0x.tags)) sw0x.tags = [];
  if (!sw0x.tags.includes("range-page")) sw0x.tags.push("range-page");
  console.log("  FIXED SW-0X01-8K: marked as review-required range page");
  fixCount++;
}

// ── Fix 6: Add missing HALO-VX10 (v1, superseded by v2) ──
console.log("\n=== Fix 6: Add HALO-VX10 (superseded) ===");
if (!findProduct("HALO-VX10")) {
  products.push({
    sku: "HALO-VX10",
    title: "HALO VX10 Video Bar",
    name: "HALO VX10 Video Bar",
    category: "UC / conferencing",
    productType: "Video bar",
    tags: ["UC / conferencing", "Camera", "Audio", "Hybrid conferencing", "Video bar"],
    summary: "All-in-one video bar for small meeting rooms. Superseded by HALO-VX10-V2.",
    doNotUse: true,
    visibility: "hidden",
    supersededBy: "HALO-VX10-V2",
    source: "Product Guide 2026",
  });
  console.log("  ADDED HALO-VX10: superseded, hidden from selection");
  fixCount++;
}

// ── Fix 7: Add missing MX-0808-KIT ──
console.log("\n=== Fix 7: Add MX-0808-KIT ===");
if (!findProduct("MX-0808-KIT")) {
  products.push({
    sku: "MX-0808-KIT",
    title: "8x8 HDBaseT Matrix Kit",
    name: "WyreStorm 8x8 HDBaseT Matrix Switcher Kit",
    category: "Matrix switching",
    productType: "HDBaseT matrix kit",
    tags: ["Matrix", "Switching", "HDBaseT", "Matrix kit", "Matrix switcher"],
    summary: "8x8 HDBaseT matrix switcher with HDBaseT outputs for distances up to 70m at 4K60.",
    source: "Product Guide 2026",
  });
  console.log("  ADDED MX-0808-KIT: 8x8 HDBaseT matrix kit");
  fixCount++;
}

// ── Fix 8: Add missing EX-100-KVM-H2 and EX-40-KVM-H2 ──
console.log("\n=== Fix 8: Add missing KVM extender variants ===");
if (!findProduct("EX-100-KVM-H2")) {
  products.push({
    sku: "EX-100-KVM-H2",
    title: "4K60 HDBaseT KVM Extender",
    name: "WyreStorm 4K60 HDBaseT KVM Extender 100m",
    category: "HDBaseT extender",
    productType: "KVM extender",
    tags: ["HDBaseT extender", "HDBaseT", "KVM", "USB", "4K60"],
    summary: "4K60 HDBaseT KVM extender with USB, RS-232 and IR pass-through up to 100m.",
    source: "Product Guide 2026",
  });
  console.log("  ADDED EX-100-KVM-H2");
  fixCount++;
}
if (!findProduct("EX-40-KVM-H2")) {
  products.push({
    sku: "EX-40-KVM-H2",
    title: "4K60 HDBaseT KVM Extender 40m",
    name: "WyreStorm 4K60 HDBaseT KVM Extender 40m",
    category: "HDBaseT extender",
    productType: "KVM extender",
    tags: ["HDBaseT extender", "HDBaseT", "KVM", "USB", "4K60"],
    summary: "4K60 HDBaseT KVM extender with USB, RS-232 and IR pass-through up to 40m.",
    source: "Product Guide 2026",
  });
  console.log("  ADDED EX-40-KVM-H2");
  fixCount++;
}

// ── Fix 9: NHD-500 family consistency ──
console.log("\n=== Fix 9: NHD-500 family consistency ===");
fix("NHD-500-TX", "category", "AVoIP", "NetworkHD 500");
fix("NHD-500-RX", "category", "AVoIP", "NetworkHD 500");
fix("NHD-500-TX-v2", "category", "AVoIP", "NetworkHD 500");
fix("NHD-500-RX-v2", "category", "AVoIP", "NetworkHD 500");

// ── Fix 10: NHD-600 family consistency ──
console.log("\n=== Fix 10: NHD-600 family consistency ===");
fix("NHD-600-TRX", "category", "AV-over-IP", "NetworkHD 600");
fix("NHD-610-TX", "category", "AV-over-IP", "NetworkHD 600");

// ── Write changes ──
data.products = products;
writeFileSync(INDEX_PATH, JSON.stringify(data, null, 2) + "\n");
console.log(`\n=== Done: ${fixCount} fixes applied to ${products.length} products ===`);
