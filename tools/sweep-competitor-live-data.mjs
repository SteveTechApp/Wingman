import fs from "node:fs/promises";
import path from "node:path";
import { resolveCompetitorLiveLookup } from "../server/competitor/live-lookup.mjs";

const targets = [
  ["Atlona", "AT-UHD-EX-100CE-KIT", "https://atlona.com/pdf/data_sheet/AT-UHD-EX-100CE-KIT_Spec.pdf"],
  ["Atlona", "AT-OME-MS42", "https://atlona.com/pdf/data_sheet/AT-OME-MS42_Spec.pdf"],
  ["Blustream", "SW41AB-V2", "https://www.bhphotovideo.com/c/product/1792125-REG/blustream_sw41ab_v2_4_way_4k_hdmi_2_0.html"],
  ["Crestron", "DM-NVX-350", "https://docs.crestron.com/en-us/9496/Content/Topics/Specifications/Specifications-350.htm"],
  ["Extron", "DTP3-T-203", "https://creationnetworks.net/products/extron-dtp3-t-203-three-input-4k-60-switcher-with-integrated-dtp3-transmitter"],
  ["Kramer", "TP-580T", "https://manuals.plus/m/16a66283e9b2e9cfa0835d0b5c75b56844a6277a13ab91b0daa67b0e232029fd"],
];

const results = [];
for (const [manufacturer, model, productUrl] of targets) {
  console.log(`[competitor-sweep] Looking up ${manufacturer} ${model}...`);
  const result = await resolveCompetitorLiveLookup({ manufacturer, model, productUrl, forceRefresh: true });
  results.push({
    manufacturer,
    model,
    ok: result.ok,
    resolvedUrl: result.resolvedUrl,
    sourceUrls: result.sourceUrls,
    keySpecs: result.keySpecs,
    technologyProfile: result.technologyProfile,
    attempts: result.sources,
    fetchedAt: result.fetchedAt,
  });
  console.log(`[competitor-sweep] ${model}: ${result.ok ? `resolved from ${result.sourceUrls?.length || 0} evidence source(s)` : "no usable source"}`);
}

const reportPath = path.join(process.cwd(), "reports/competitor-live-data-sweep.json");
await fs.mkdir(path.dirname(reportPath), { recursive: true });
await fs.writeFile(reportPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2)}\n`);
console.log(`[competitor-sweep] Wrote ${path.relative(process.cwd(), reportPath)}.`);
