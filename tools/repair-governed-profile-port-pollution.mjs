import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const file = path.join(root, "data/governance/wyrestorm-technical-profiles.json");
const apply = process.argv.includes("--apply");
const payload = JSON.parse(fs.readFileSync(file, "utf8"));

const accessoryPattern = /\b(?:cables?|remote(?: control)?|mounting brackets?|rack brackets?|wall brackets?|quick\s*start|user guide|power suppl(?:y|ies)|power adapters?|receiver units?|transmitter units?)\b/i;
const removed = [];

for (const profile of payload.profiles ?? []) {
  if (!/^verified(?:-with-warning)?$/i.test(String(profile.status ?? ""))) continue;
  const ports = Array.isArray(profile.ports) ? profile.ports : [];
  profile.ports = ports.filter((port) => {
    if (String(port.category ?? "").toLowerCase() === "power") return true;
    const isAccessory = accessoryPattern.test(`${port.connector ?? ""} ${port.detail ?? ""}`);
    if (isAccessory) removed.push({ sku: profile.sku, connector: port.connector, detail: port.detail });
    return !isAccessory;
  });
}

console.log(`[governed-port-integrity] ${removed.length} accessory row(s) found across ${new Set(removed.map((row) => row.sku)).size} verified profile(s).`);
for (const row of removed) console.log(`- ${row.sku}: ${row.detail || row.connector}`);

if (apply && removed.length) {
  fs.writeFileSync(file, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`[governed-port-integrity] Updated ${path.relative(root, file)}.`);
} else if (!apply && removed.length) {
  process.exitCode = 1;
}
