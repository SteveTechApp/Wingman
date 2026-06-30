import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const targetFiles = [
  "src/wingman2/pages/DashboardPage.tsx",
  "src/wingman2/pages/DiscoveryPage.tsx",
  "src/wingman2/pages/FinderPage.tsx",
  "src/wingman2/pages/ProductFamilyPage.tsx",
  "src/wingman2/pages/ProductPitchPage.tsx",
  "src/wingman2/pages/ProposalPage.tsx",
  "src/wingman2/pages/ComparePageNew.tsx",
  "src/wingman2/pages/TemplatesPage.tsx",
  "src/wingman2/pages/VideowallBuilderPage.tsx",
  "src/wingman2/pages/ProjectsPage.tsx",
  "src/wingman2/pages/ProjectDetailPage.tsx",
  "src/wingman2/pages/ProductCallCardsPage.tsx",
  "src/wingman2/pages/CatalogBrowserPage.tsx",
];

const colourFamilies =
  "(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)";

const visualClassPatterns = [
  new RegExp(`^text-${colourFamilies}-(?:50|100|200|300|400|500|600|700|800|900|950)(?:\\/\\d+)?$`),
  /^(?:text-white|text-black)(?:\/\d+)?$/,
  new RegExp(`^bg-${colourFamilies}-(?:50|100|200|300|400|500|600|700|800|900|950)(?:\\/\\d+)?$`),
  /^(?:bg-white|bg-black)(?:\/\d+)?$/,
  /^bg-\[[^\]]+\](?:\/\d+)?$/,
  new RegExp(`^(?:from|via|to)-${colourFamilies}-(?:50|100|200|300|400|500|600|700|800|900|950)(?:\\/\\d+)?$`),
  /^(?:from|via|to)-\[[^\]]+\](?:\/\d+)?$/,
  new RegExp(`^border-${colourFamilies}-(?:50|100|200|300|400|500|600|700|800|900|950)(?:\\/\\d+)?$`),
  /^(?:border-white|border-black)(?:\/\d+)?$/,
  /^border-\[[^\]]+\](?:\/\d+)?$/,
  new RegExp(`^ring-${colourFamilies}-(?:50|100|200|300|400|500|600|700|800|900|950)(?:\\/\\d+)?$`),
  /^(?:ring-white|ring-black)(?:\/\d+)?$/,
  /^ring-\[[^\]]+\](?:\/\d+)?$/,
  new RegExp(`^outline-${colourFamilies}-(?:50|100|200|300|400|500|600|700|800|900|950)(?:\\/\\d+)?$`),
  /^outline-\[[^\]]+\](?:\/\d+)?$/,
  new RegExp(`^decoration-${colourFamilies}-(?:50|100|200|300|400|500|600|700|800|900|950)(?:\\/\\d+)?$`),
  /^shadow-(?:sm|md|lg|xl|2xl|inner|none)$/,
];

function isVisualUtility(token) {
  if (token.includes(":")) {
    const parts = token.split(":");
    const finalPart = parts.at(-1);
    const prefix = parts.slice(0, -1).join(":");

    if (/^(hover|focus|active|disabled|visited|dark|group-hover|peer-checked|aria-selected|data-\[[^\]]+\])(?::|$)/.test(prefix)) {
      return isVisualUtility(finalPart);
    }

    return false;
  }

  return visualClassPatterns.some((pattern) => pattern.test(token));
}

function addSemanticFallback(tag, className, removedAny) {
  if (!removedAny) return className;

  const lowerTag = tag.toLowerCase();
  const classes = new Set(className.split(/\s+/).filter(Boolean));
  const hasSemantic = [...classes].some((item) => item.startsWith("wm-ui-"));

  if (!hasSemantic) return className;

  if (/^h[1-4]$/.test(lowerTag)) classes.add("wm-ui-title");
  if (lowerTag === "p") classes.add("wm-ui-copy");
  if (["input", "select", "textarea"].includes(lowerTag)) classes.add("wm-ui-input");
  if (lowerTag === "button") classes.add("wm-ui-button");

  return [...classes].join(" ");
}

function normaliseClassName(tag, className) {
  if (!/\bwm-ui-/.test(className)) {
    return className;
  }

  const originalTokens = className.split(/\s+/).filter(Boolean);
  let removedAny = false;

  const kept = originalTokens.filter((token) => {
    const remove = isVisualUtility(token);
    if (remove) removedAny = true;
    return !remove;
  });

  return addSemanticFallback(tag, [...new Set(kept)].join(" "), removedAny);
}

function normaliseStringClassAttributes(source) {
  return source.replace(
    /<([A-Za-z][A-Za-z0-9.]*)\b([^<>]*?)className=(["'])([^"']*?)\3([^<>]*?)>/gs,
    (full, tag, before, quote, className, after) => {
      const nextClassName = normaliseClassName(tag, className);
      if (nextClassName === className) return full;
      return `<${tag}${before}className=${quote}${nextClassName}${quote}${after}>`;
    },
  );
}

function normaliseTemplateClassAttributes(source) {
  return source.replace(/<([A-Za-z][A-Za-z0-9.]*)\b([^<>]*?)className=\{`([^`]*?)`\}([^<>]*?)>/gs, (full, tag, before, className, after) => {
    if (className.includes("${")) return full;
    const nextClassName = normaliseClassName(tag, className);
    if (nextClassName === className) return full;
    return `<${tag}${before}className={\`${nextClassName}\`}${after}>`;
  });
}

function migrateFile(relativePath) {
  const absolutePath = path.join(root, relativePath);

  if (!fs.existsSync(absolutePath)) {
    console.log(`[visual-classes] skipped missing ${relativePath}`);
    return false;
  }

  const original = fs.readFileSync(absolutePath, "utf8");
  let next = original;

  next = normaliseStringClassAttributes(next);
  next = normaliseTemplateClassAttributes(next);

  if (next !== original) {
    fs.writeFileSync(absolutePath, next);
    console.log(`[visual-classes] normalised ${relativePath}`);
    return true;
  }

  console.log(`[visual-classes] unchanged ${relativePath}`);
  return false;
}

let changed = 0;
for (const file of targetFiles) {
  if (migrateFile(file)) changed += 1;
}

console.log(`[visual-classes] Completed. Files changed: ${changed}/${targetFiles.length}`);