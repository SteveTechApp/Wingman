import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const sourcePath = path.join(rootDir, "data", "product-intelligence-db.json");
const outputPath = path.join(rootDir, "data", "product-intelligence-index.json");

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function compact(value) {
  if (Array.isArray(value)) {
    const next = value.map((entry) => compact(entry)).filter((entry) => entry !== undefined);
    return next.length > 0 ? next : undefined;
  }

  if (!isPlainObject(value)) {
    if (value == null) return undefined;
    if (typeof value === "string" && value.trim() === "") return undefined;
    return value;
  }

  const next = Object.fromEntries(
    Object.entries(value)
      .map(([key, entry]) => [key, compact(entry)])
      .filter(([, entry]) => entry !== undefined),
  );

  return Object.keys(next).length > 0 ? next : undefined;
}

function toIndexRecord(record) {
  const evidenceCount = Array.isArray(record?.evidence)
    ? record.evidence.length
    : Math.max(0, Number(record?.evidenceCount) || 0);
  const openReviewFlagCount = Array.isArray(record?.reviewFlags)
    ? record.reviewFlags.filter((flag) => String(flag?.status ?? "").trim().toLowerCase() === "open").length
    : Math.max(0, Number(record?.openReviewFlagCount) || 0);

  return compact({
    id: record?.id,
    vendorType: record?.vendorType,
    brand: record?.brand,
    sku: record?.sku,
    name: record?.name,
    family: record?.family,
    group: record?.group,
    category: record?.category,
    subcategory: record?.subcategory,
    classificationSource: record?.classificationSource,
    summary: record?.summary,
    technology: record?.technology,
    topology: record?.topology,
    role: record?.role,
    directionality: record?.directionality,
    outputBehavior: record?.outputBehavior,
    features: record?.features,
    transport: record?.transport,
    inputs: record?.inputs,
    outputs: record?.outputs,
    control: record?.control,
    audio: record?.audio,
    video: record?.video,
    latency: record?.latency,
    distance: record?.distance,
    distanceMeters: record?.distanceMeters,
    usb: record?.usb,
    wireless: record?.wireless,
    integration: record?.integration,
    power: record?.power,
    status: record?.status,
    confidence: record?.confidence,
    sourceType: record?.sourceType,
    sourceUrls: Array.isArray(record?.sourceUrls) ? record.sourceUrls.filter(Boolean).slice(0, 1) : undefined,
    lastCapturedAt: record?.lastCapturedAt,
    archived: record?.archived,
    evidenceCount: evidenceCount > 0 ? evidenceCount : undefined,
    openReviewFlagCount: openReviewFlagCount > 0 ? openReviewFlagCount : undefined,
  });
}

async function main() {
  const raw = JSON.parse(await readFile(sourcePath, "utf8"));
  const records = Array.isArray(raw?.records) ? raw.records.map((record) => toIndexRecord(record)).filter(Boolean) : [];

  const indexPayload = {
    version: raw?.version ?? 1,
    generatedAt: raw?.generatedAt,
    updatedAt: raw?.updatedAt,
    records,
  };

  await writeFile(outputPath, `${JSON.stringify(indexPayload, null, 2)}\n`, "utf8");

  const fullBytes = Buffer.byteLength(JSON.stringify(raw));
  const indexBytes = Buffer.byteLength(JSON.stringify(indexPayload));
  const reduction = fullBytes > 0 ? (((fullBytes - indexBytes) / fullBytes) * 100).toFixed(1) : "0.0";

  console.log(`Wrote ${path.relative(rootDir, outputPath)} (${indexBytes} bytes, ${reduction}% smaller than full DB).`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
