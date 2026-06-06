import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const srcDir = path.join(root, "src");
const cssPath = path.join(root, "src", "wingman2", "styles", "wingman-style-stack.css");

function fail(message) {
  throw new Error(message);
}

function backup(file) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  fs.copyFileSync(file, `${file}.bak-remove-blank-template-header-${stamp}`);
}

function walk(dir) {
  const out = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (["node_modules", "dist", "build", ".git"].includes(entry.name)) continue;
      out.push(...walk(full));
      continue;
    }

    out.push(full);
  }

  return out;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findClosingAngle(text, start) {
  let quote = "";
  let braceDepth = 0;

  for (let i = start; i < text.length; i += 1) {
    const char = text[i];

    if (quote) {
      if (char === quote && text[i - 1] !== "\\") quote = "";
      continue;
    }

    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }

    if (char === "{") braceDepth += 1;
    if (char === "}") braceDepth = Math.max(0, braceDepth - 1);

    if (char === ">" && braceDepth === 0) return i;
  }

  return -1;
}

function findMatchingClose(text, start, tagName) {
  const pattern = new RegExp(`<\\/?${tagName}\\b[^>]*?>`, "gi");
  pattern.lastIndex = start;

  let depth = 0;
  let match;

  while ((match = pattern.exec(text))) {
    const token = match[0];
    const isClose = token.startsWith(`</`);
    const isSelfClosing = /\/\s*>$/.test(token);

    if (!isClose && !isSelfClosing) depth += 1;
    if (isClose) depth -= 1;

    if (depth === 0) return match.index + token.length;
  }

  return -1;
}

function addAttributeToOpeningTag(text, start, attr) {
  const openEnd = findClosingAngle(text, start);
  if (openEnd < 0) return text;
  const opening = text.slice(start, openEnd + 1);

  if (opening.includes(attr)) return text;

  const insertAt = opening.endsWith("/>") ? openEnd - 1 : openEnd;
  return `${text.slice(0, insertAt)} ${attr}${text.slice(insertAt)}`;
}

if (!fs.existsSync(srcDir)) fail("Cannot find src folder. Run this from C:\\Users\\Steve\\Wingman.");
if (!fs.existsSync(cssPath)) fail("Cannot find src/wingman2/styles/wingman-style-stack.css.");

const sourceFiles = walk(srcDir).filter((file) => /\.(tsx|jsx|ts|js)$/.test(file));

const templateFiles = sourceFiles.filter((file) => {
  const text = fs.readFileSync(file, "utf8");

  return /Choose the right starting point faster/i.test(text)
    && /Start discovery/i.test(text)
    && /Product pitch/i.test(text)
    && /No template/i.test(text);
});

if (templateFiles.length === 0) {
  fail("Could not locate the Room Templates page source containing the blank discovery header.");
}

const markerAttr = 'data-wingman-remove-blank-discovery-header="true"';
const pageAttr = 'data-wingman-room-templates-page="true"';

for (const file of templateFiles) {
  const original = fs.readFileSync(file, "utf8");
  let updated = original;

  if (!updated.includes(pageAttr)) {
    updated = updated.replace(
      /(return\s*\(\s*<)(main|section|div)\b/,
      `$1$2 ${pageAttr}`
    );
  }

  const startPhraseIndex = updated.search(/Start blank discovery/i);
  const noTemplateIndex = updated.search(/No template/i);

  if (startPhraseIndex < 0 || noTemplateIndex < 0) {
    console.log(`Skipped, phrases not found in same file: ${path.relative(root, file)}`);
    continue;
  }

  const heroIndex = updated.search(/Choose the right starting point faster/i);
  const tagMatches = [];
  const openTagPattern = /<(section|article|button|div)\b/gi;
  let match;

  while ((match = openTagPattern.exec(updated))) {
    const tagStart = match.index;
    const tagName = match[1];

    if (tagStart > startPhraseIndex) continue;

    const tagEnd = findMatchingClose(updated, tagStart, tagName);
    if (tagEnd < 0) continue;
    if (tagEnd < noTemplateIndex) continue;

    const block = updated.slice(tagStart, tagEnd);
    if (!/Start blank discovery/i.test(block)) continue;
    if (!/No template/i.test(block)) continue;
    if (heroIndex > tagStart && heroIndex < tagEnd) continue;

    tagMatches.push({
      tagStart,
      tagEnd,
      tagName,
      length: tagEnd - tagStart
    });
  }

  if (tagMatches.length === 0) {
    fail(`Could not isolate the blank discovery header block in ${path.relative(root, file)}.`);
  }

  const priority = { section: 1, article: 2, button: 3, div: 4 };

  tagMatches.sort((a, b) => {
    const priorityDelta = priority[a.tagName] - priority[b.tagName];
    if (priorityDelta !== 0) return priorityDelta;
    return a.length - b.length;
  });

  const selected = tagMatches[0];

  updated = addAttributeToOpeningTag(updated, selected.tagStart, markerAttr);

  if (updated !== original) {
    backup(file);
    fs.writeFileSync(file, updated, "utf8");
    console.log(`Marked blank discovery header for removal: ${path.relative(root, file)}`);
    console.log(`Matched tag: <${selected.tagName}>`);
  }
}

const cssOriginal = fs.readFileSync(cssPath, "utf8");
let cssUpdated = cssOriginal;

/* Remove the previous invalid :contains rule if it still exists. */
cssUpdated = cssUpdated.replace(
  /\/\*\s*Text-specific safety net for the exact strip shown in the screenshot\.\s*\*\/\s*\[data-wingman-room-templates-page="true"\]\s+section:has\(:is\(h1, h2, h3, p, span\):not\(svg\):contains\("No template"\)\)\s*\{\s*display:\s*none\s*!important;\s*\}\s*/g,
  ""
);

const start = "/* WINGMAN REMOVE ROOM TEMPLATE BLANK DISCOVERY HEADER - START */";
const end = "/* WINGMAN REMOVE ROOM TEMPLATE BLANK DISCOVERY HEADER - END */";

const cssBlock = `${start}
[data-wingman-room-templates-page="true"] [data-wingman-remove-blank-discovery-header="true"],
[data-wingman-remove-blank-discovery-header="true"] {
  display: none !important;
}
${end}`;

const blockRegex = new RegExp(`${escapeRegExp(start)}[\\s\\S]*?${escapeRegExp(end)}`);

if (blockRegex.test(cssUpdated)) {
  cssUpdated = cssUpdated.replace(blockRegex, cssBlock);
}

if (!blockRegex.test(cssOriginal)) {
  cssUpdated = `${cssUpdated.trimEnd()}\n\n${cssBlock}\n`;
}

if (cssUpdated !== cssOriginal) {
  backup(cssPath);
  fs.writeFileSync(cssPath, cssUpdated, "utf8");
  console.log(`Updated CSS: ${path.relative(root, cssPath)}`);
}

console.log("");
console.log("Done. The Start blank discovery / No template header is now hidden.");
