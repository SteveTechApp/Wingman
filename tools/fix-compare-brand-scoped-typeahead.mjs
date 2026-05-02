import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const backupRoot = path.join(repoRoot, "_RECOVERY", `compare-brand-scoped-typeahead-${new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14)}`);
const touched = [];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function read(relativePath) {
  const file = path.join(repoRoot, relativePath);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function write(relativePath, content) {
  const file = path.join(repoRoot, relativePath);
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, content, "utf8");
}

function backup(relativePath) {
  const source = path.join(repoRoot, relativePath);

  if (!fs.existsSync(source)) {
    return;
  }

  const target = path.join(backupRoot, relativePath);
  ensureDir(path.dirname(target));
  fs.copyFileSync(source, target);
}

function save(relativePath, content) {
  const current = read(relativePath);

  if (current === content) {
    return;
  }

  backup(relativePath);
  write(relativePath, content);
  touched.push(relativePath);
}

function functionBounds(text, functionName) {
  const re = new RegExp(`function\\s+${functionName}\\s*\\(`);
  const match = re.exec(text);

  if (!match) {
    return null;
  }

  const start = match.index;
  const openBrace = text.indexOf("{", match.index);

  if (openBrace < 0) {
    return null;
  }

  let depth = 0;

  for (let i = openBrace; i < text.length; i++) {
    if (text[i] === "{") {
      depth++;
    }

    if (text[i] === "}") {
      depth--;

      if (depth === 0) {
        return { start, end: i + 1 };
      }
    }
  }

  return null;
}

function replaceFunction(text, functionName, replacement) {
  const bounds = functionBounds(text, functionName);

  if (!bounds) {
    throw new Error(`Could not find function ${functionName}`);
  }

  return text.slice(0, bounds.start) + replacement + text.slice(bounds.end);
}

const relative = path.join("src", "wingman2", "pages", "ComparePage.tsx");
let text = read(relative);

if (!text) {
  throw new Error(`Missing ${relative}`);
}

text = replaceFunction(
  text,
  "uniqueSuggestions",
  `function normaliseSuggestion(value: unknown) {
  return cleanText(value).toLowerCase().trim();
}

function uniqueSuggestions(
  history: CompareHistoryItem[],
  key: "brand" | "sku" | "productName" | "productUrl",
  activeBrand = "",
) {
  const selectedBrand = normaliseSuggestion(activeBrand);

  return Array.from(
    new Set(
      history
        .filter((item) => {
          if (key === "brand") {
            return true;
          }

          if (!selectedBrand) {
            return false;
          }

          return normaliseSuggestion(item.brand) === selectedBrand;
        })
        .map((item) => item[key]?.trim())
        .filter((value): value is string => Boolean(value) && !hasBadEncoding(value)),
    ),
  ).slice(0, 12);
}`
);

text = text.replace(
  /const brandSuggestions = useMemo\(\(\) => uniqueSuggestions\(history, "brand"\), \[history\]\);/,
  'const brandSuggestions = useMemo(() => uniqueSuggestions(history, "brand"), [history]);',
);

text = text.replace(
  /const skuSuggestions = useMemo\(\(\) => uniqueSuggestions\(history, "sku"\), \[history\]\);/,
  'const skuSuggestions = useMemo(() => uniqueSuggestions(history, "sku", brand), [history, brand]);',
);

text = text.replace(
  /const productNameSuggestions = useMemo\(\(\) => uniqueSuggestions\(history, "productName"\), \[history\]\);/,
  'const productNameSuggestions = useMemo(() => uniqueSuggestions(history, "productName", brand), [history, brand]);',
);

text = text.replace(
  /const productUrlSuggestions = useMemo\(\(\) => uniqueSuggestions\(history, "productUrl"\), \[history\]\);/,
  'const productUrlSuggestions = useMemo(() => uniqueSuggestions(history, "productUrl", brand), [history, brand]);',
);

text = text.replace(
  "Use the exact model number if available",
  "Use the exact model number if available. Suggestions are limited to the selected brand.",
);

text = text.replace(
  "Optional short description from the customer or quote",
  "Optional short description from the customer or quote. Suggestions are limited to the selected brand.",
);

text = text.replace(
  "Optional. Paste a manufacturer page, distributor listing, or saved product link if you have one.",
  "Optional. Paste a manufacturer page, distributor listing, or saved product link if you have one. Suggestions are limited to the selected brand.",
);

save(relative, text);

console.log("");
console.log("Compare brand-scoped typeahead installed.");
console.log(`Backup saved to: ${backupRoot}`);
console.log("");
console.log("Modified files:");

if (touched.length === 0) {
  console.log(" - No files changed.");
}

for (const file of [...new Set(touched)].sort()) {
  console.log(` - ${file}`);
}