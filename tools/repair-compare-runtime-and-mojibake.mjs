import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const stamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
const backupRoot = path.join(repoRoot, "_RECOVERY", `compare-runtime-mojibake-clean-${stamp}`);

const touched = [];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function write(file, content) {
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

function saveIfChanged(relativePath, next) {
  const file = path.join(repoRoot, relativePath);
  const current = read(file);

  if (current === next) {
    return;
  }

  backup(relativePath);
  write(file, next);
  touched.push(relativePath);
}

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) {
    return files;
  }

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (["node_modules", "dist", "build", "_RECOVERY", ".git"].includes(entry.name)) {
        continue;
      }

      walk(full, files);
      continue;
    }

    if (/\.(ts|tsx|js|mjs|json|md|css|html)$/i.test(entry.name)) {
      files.push(full);
    }
  }

  return files;
}

function cleanMojibake(text, isCss = false) {
  let next = text;

  next = next.replace(/<li key=\{note\}>\u00c3[^<]*\{note\}<\/li>/g, "<li key={note}>• {note}</li>");
  next = next.replace(/\bYes\s+\u00c3[^\s"']+/g, "Yes —");
  next = next.replace(/\u00c3[^\s"'<>{}\[\](),;]+/g, "•");
  next = next.replace(/\u00c2[^\s"'<>{}\[\](),;]+/g, "");
  next = next.replace(/\u00e2\u20ac\u2122/g, "'");
  next = next.replace(/\u00e2\u20ac\u00a2/g, "•");
  next = next.replace(/\u00e2\u20ac[\u0153\u009c\u009d]/g, '"');
  next = next.replace(/\u00e2\u20ac[\u201c\u201d]/g, "—");
  next = next.replace(/\u00ef\u00bf\u00bd/g, "•");
  next = next.replace(/\uFFFD/g, "•");

  if (isCss) {
    next = next
      .split(/\r?\n/)
      .filter((line) => {
        const trimmed = line.trim();

        if (/^<\/?[A-Za-z]/.test(trimmed)) {
          return false;
        }

        if (trimmed.includes("className=")) {
          return false;
        }

        if (trimmed.includes("key={")) {
          return false;
        }

        return true;
      })
      .join("\n");
  }

  return next;
}

function repairComparePage() {
  const relative = path.join("src", "wingman2", "pages", "ComparePage.tsx");
  const file = path.join(repoRoot, relative);

  if (!fs.existsSync(file)) {
    throw new Error(`Missing ${relative}`);
  }

  let text = read(file);

  text = text.replaceAll("setCompetitor brand", "setBrand");
  text = text.replaceAll("setCompetitor Brand", "setBrand");
  text = text.replaceAll("set competitor brand", "setBrand");
  text = text.replaceAll("set competitor Brand", "setBrand");

  text = text.replace(
    /const HISTORY_KEY = "wingman\.compare\.inputHistory\.v\d+";/,
    'const HISTORY_KEY = "wingman.compare.inputHistory.v2";',
  );

  if (!text.includes('const HISTORY_KEY = "wingman.compare.inputHistory.v2";')) {
    text = text.replace(
      /const MAX_HISTORY_ITEMS = 20;/,
      'const HISTORY_KEY = "wingman.compare.inputHistory.v2";\nconst MAX_HISTORY_ITEMS = 20;',
    );
  }

  if (!/productUrl:\s*string;/.test(text)) {
    text = text.replace(
      /rawText:\s*string;\s*allowWeb:\s*boolean;/,
      "rawText: string;\n  productUrl: string;\n  allowWeb: boolean;",
    );
  }

  if (!text.includes("const [productUrl, setProductUrl]")) {
    text = text.replace(
      /const \[productName, setProductName\] = useState\(""\);\s*/,
      'const [productName, setProductName] = useState("");\n  const [productUrl, setProductUrl] = useState("");\n  ',
    );
  }

  if (!text.includes("setProductUrl(item.productUrl")) {
    text = text.replace(
      /setRawText\(item\.rawText\);\s*setAllowWeb\(item\.allowWeb\);/,
      'setRawText(item.rawText);\n    setProductUrl(item.productUrl || "");\n    setAllowWeb(item.allowWeb);',
    );
  }

  if (!/productUrl,\s*rawText,\s*allowWeb/.test(text)) {
    text = text.replace(
      /productName,\s*rawText,\s*allowWeb,/,
      "productName,\n      productUrl,\n      rawText,\n      allowWeb,",
    );
  }

  if (!/lookupCompareIntelligence\(\{[\s\S]*?productUrl,[\s\S]*?\}\);/.test(text)) {
    text = text.replace(
      /lookupCompareIntelligence\(\{([\s\S]*?)rawText,\s*allowWeb,\s*\}\);/,
      "lookupCompareIntelligence({$1rawText,\n        productUrl,\n        allowWeb,\n      });",
    );
  }

  if (!text.includes("Vendor or distributor product page")) {
    const block = `
          <label className="flex flex-col gap-2 lg:col-span-4">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Vendor or distributor product page
            </span>
            <input
              value={productUrl}
              onChange={(event) => setProductUrl(event.target.value)}
              placeholder="Optional. Paste a manufacturer page, distributor listing, or saved product link."
              className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none ring-cyan-300/40 placeholder:text-slate-500 focus:ring-2"
            />
            <span className="text-xs leading-5 text-slate-500">
              Wingman will check this page first before looking elsewhere.
            </span>
          </label>

`;

    text = text.replace(
      /(\s+<label className="flex flex-col gap-2 lg:col-span-4">\s+<span className="text-xs font-semibold uppercase tracking-\[0\.18em\] text-slate-400">\s+Paste anything the customer sent you)/,
      `${block}$1`,
    );
  }

  text = cleanMojibake(text, false);
  saveIfChanged(relative, text);
}

function repairCompareClient() {
  const relative = path.join("src", "wingman2", "lib", "compareIntelligenceClient.ts");
  const file = path.join(repoRoot, relative);

  if (!fs.existsSync(file)) {
    return;
  }

  let text = read(file);

  if (!/productUrl\?:\s*string;/.test(text)) {
    text = text.replace(
      /rawText\?:\s*string;\s*allowWeb\?:\s*boolean;/,
      "rawText?: string;\n  productUrl?: string;\n  allowWeb?: boolean;",
    );
  }

  if (!/query\?:\s*\{[\s\S]*?productUrl\?:\s*string;/.test(text)) {
    text = text.replace(
      /productName\?:\s*string;\s*allowWeb\?:\s*boolean;/,
      "productName?: string;\n    productUrl?: string;\n    allowWeb?: boolean;",
    );
  }

  text = cleanMojibake(text, false);
  saveIfChanged(relative, text);
}

function cleanKnownEncodingFiles() {
  const roots = ["src", "data", "public", "server", "docs"]
    .map((root) => path.join(repoRoot, root))
    .filter((root) => fs.existsSync(root));

  for (const root of roots) {
    for (const file of walk(root)) {
      const relative = path.relative(repoRoot, file);
      const isCss = /\.css$/i.test(file);
      const current = read(file);
      const next = cleanMojibake(current, isCss);

      if (next !== current) {
        saveIfChanged(relative, next);
      }
    }
  }
}

repairCompareClient();
repairComparePage();
cleanKnownEncodingFiles();

console.log("");
console.log("Compare runtime and mojibake cleanup complete.");
console.log(`Backup saved to: ${backupRoot}`);
console.log("");
console.log("Modified files:");

if (touched.length === 0) {
  console.log(" - No files changed.");
}

for (const file of [...new Set(touched)].sort()) {
  console.log(` - ${file}`);
}