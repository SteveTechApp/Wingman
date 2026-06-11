import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

const comparePagePath = "src/wingman2/pages/ComparePageNew.tsx";

const requiredFiles = [
  comparePagePath,
  "src/wingman2/lib/competitorCompareDecision.ts",
  "src/wingman2/lib/competitorProductIntelligence.ts",
  "src/wingman2/lib/rigorousCompare.ts",
  "src/wing