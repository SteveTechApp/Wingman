import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const errors = [];
const passed = [];

function check(condition, message) {
  if (condition) passed.push(message);
  else errors.push(message);
}

function parseCsvLine(line) {
  const values = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (char === "," && !quoted) {
      values.push(value);
      value = "";
      continue;
    }

    value += char;
  }

  values.push(value);
  return values;
}

const atlonaPath = path.join(root, "data-sources", "competitors", "atlona.csv");
const profilesPath = path.join(root, "data", "governance", "wyrestorm-technical-profiles.json");
const enginePath = path.join(root, "src", "wingman2", "lib", "compareSpecEngine.ts");
const showdownPath = path.join(root, "src", "wingman2", "components", "compare", "CompareShowdown.tsx");
const battleCardPath = path.join(root, "src", "wingman2", "components", "compare", "BattleCard.tsx");

const csvLines = fs.readFileSync(atlonaPath, "utf8").split(/\r?\n/).filter(Boolean);
const headers = parseCsvLine(csvLines[0]);
const modelIndex = headers.indexOf("model");
const targetLine = csvLines.slice(1).find((line) => parseCsvLine(line)[modelIndex] === "AT-OME-CS31-SA");

check(Boolean(targetLine), "Atlona AT-OME-CS31-SA source row exists");

if (targetLine) {
  const values = parseCsvLine(targetLine);
  const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));

  const inputs = JSON.parse(row.inputs_json);
  const outputs = JSON.parse(row.outputs_json);

  check(inputs.some((item) => item.type === "HDMI" && Number(item.count) === 3),
    "AT-OME-CS31-SA has three HDMI AV inputs");
  check(!inputs.some((item) => item.type === "USB-C"),
    "AT-OME-CS31-SA is not conflated with the SA-C USB-C model");
  check(outputs.some((item) => item.type === "HDMI" && Number(item.count) === 1),
    "AT-OME-CS31-SA has one HDMI AV output");
  check(!outputs.some((item) => item.type === "HDBaseT"),
    "AT-OME-CS31-SA is not conflated with the SA-HDBT model");
  check(Number(row.routed_input_count) === 3 && Number(row.routed_output_count) === 1,
    "AT-OME-CS31-SA routed capacity is 3x1");
}

const governance = JSON.parse(fs.readFileSync(profilesPath, "utf8"));
const apo = governance.profiles.find((profile) => String(profile.sku).toUpperCase() === "APO-210-UC");

check(Boolean(apo), "APO-210-UC governed profile exists");

if (apo) {
  check(/^4K30/i.test(String(apo.maxResolution)), "APO-210-UC maximum video is governed as 4K30");
  check(!/8K/i.test(String(apo.maxResolution)), "APO-210-UC does not claim 8K");
  check(apo.specs?.poe === false && apo.specs?.poh === false, "APO-210-UC does not claim PoE or PoH");
  check(Number(apo.features?.routedInputCount) === 2, "APO-210-UC has two routed presentation inputs");
}

const engine = fs.readFileSync(enginePath, "utf8");
const showdown = fs.readFileSync(showdownPath, "utf8");
const battleCard = fs.readFileSync(battleCardPath, "utf8");

check(engine.includes("Product purpose outranks transport"),
  "Presentation product purpose outranks HDBaseT transport");
check(engine.includes("Routed input capacity unverified"),
  "Routed input capacity fails closed");
check(engine.includes('compareCapabilityLists("audio"'),
  "Audio compares actual capability descriptions rather than option counts");
check(battleCard.includes("function buildBattleCardLayout") && battleCard.includes("counterpart?: SpecSheet"),
  "Battle cards use a counterpart-aware dynamic layout builder");
check(showdown.includes("counterpart={match.sheet}") && showdown.includes("counterpart={result.competitor}"),
  "Both battle cards align their semantic groups from the opposing sheet");
check(!showdown.includes("buildBattleStats(result.competitor"),
  "Competitor battle-card data is not built independently");
check(!showdown.includes("buildBattleStats(match.sheet"),
  "WyreStorm battle-card data is not built independently");

console.log(`[compare-alignment] ${passed.length} passed, ${errors.length} failed`);

for (const item of passed) console.log(`PASS: ${item}`);
for (const item of errors) console.error(`FAIL: ${item}`);

if (errors.length) process.exit(1);
