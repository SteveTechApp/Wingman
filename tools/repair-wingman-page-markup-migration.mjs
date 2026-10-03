import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const targets = {
  dashboard: "src/wingman2/pages/DashboardPage.tsx",
  productFamily: "src/wingman2/pages/ProductFamilyPage.tsx",
  productPitch: "src/wingman2/pages/ProductPitchPage.tsx",
  proposal: "src/wingman2/pages/ProposalPage.tsx",
};

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function write(relativePath, value) {
  fs.writeFileSync(path.join(root, relativePath), value);
}

function count(value, token) {
  return value.match(new RegExp(`\\b${token}\\b`, "g"))?.length ?? 0;
}

function classList(value) {
  return [...new Set(value.split(/\s+/).map((item) => item.trim()).filter(Boolean))].join(" ");
}

function addClasses(value, additions) {
  return classList(`${value} ${additions.join(" ")}`);
}

function addToClassAttrs(source, tagNames, predicate, additions, limit = Number.POSITIVE_INFINITY) {
  const tagPattern = tagNames.join("|");
  const pattern = new RegExp(`<(${tagPattern})\\b([^<>]*?)className=(["'])([^"']*?)\\3([^<>]*?)>`, "gis");
  let changed = 0;

  return source.replace(pattern, (full, tag, before, quote, className, after) => {
    if (changed >= limit) return full;
    if (!predicate({ tag, before, className, after, full })) return full;

    const nextClassName = addClasses(className, additions);
    if (nextClassName === className) return full;

    changed += 1;
    return `<${tag}${before}className=${quote}${nextClassName}${quote}${after}>`;
  });
}

function addPageRoot(relativePath) {
  const text = read(relativePath);

  if (count(text, "wm-ui-page") > 0) {
    console.log(`[repair-markup] ${relativePath}: page root already present`);
    return;
  }

  const next = addToClassAttrs(
    text,
    ["main", "div", "section"],
    ({ className }) => !/\bwm-ui-(card|title|copy|button|input|kicker)\b/.test(className),
    ["wm-ui-page", "wingman-page-host"],
    1,
  );

  write(relativePath, next);
  console.log(`[repair-markup] ${relativePath}: added page root`);
}

function repairDashboard(relativePath) {
  const text = read(relativePath);
  const before = count(text, "wm-ui-card");

  if (before >= 3) {
    console.log(`[repair-markup] ${relativePath}: card count already ${before}`);
    return;
  }

  let next = addToClassAttrs(
    text,
    ["div", "section", "article", "a", "button"],
    ({ className }) =>
      !/\bwm-ui-(page|hero|title|copy|button|input|kicker|card)\b/.test(className) &&
      /dashboard|workflow|tile|option|action|module|panel|card|hub|shortcut|rounded|border|shadow|bg-/i.test(className),
    ["wm-ui-card"],
    8,
  );

  if (count(next, "wm-ui-card") < 3) {
    next = addToClassAttrs(
      next,
      ["div", "section", "article", "a", "button"],
      ({ className }) => !/\bwm-ui-(page|hero|title|copy|button|input|kicker|card)\b/.test(className),
      ["wm-ui-card"],
      4,
    );
  }

  write(relativePath, next);
  console.log(`[repair-markup] ${relativePath}: card count ${before} -> ${count(next, "wm-ui-card")}`);
}

function repairProductPitch(relativePath) {
  const text = read(relativePath);
  const before = count(text, "wm-ui-title");

  if (before >= 2) {
    console.log(`[repair-markup] ${relativePath}: title count already ${before}`);
    return;
  }

  let next = addToClassAttrs(
    text,
    ["h1", "h2", "h3", "h4", "div", "span", "strong", "p"],
    ({ className }) =>
      !/\bwm-ui-title\b/.test(className) &&
      /title|heading|headline|pitch|section|card|product|font-bold|font-semibold|text-xl|text-2xl|text-3xl/i.test(className),
    ["wm-ui-title"],
    6,
  );

  if (count(next, "wm-ui-title") < 2) {
    next = addToClassAttrs(
      next,
      ["h1", "h2", "h3", "h4", "div", "span", "strong", "p"],
      ({ className }) => !/\bwm-ui-(page|hero|copy|button|input|kicker|card|title)\b/.test(className),
      ["wm-ui-title"],
      2,
    );
  }

  write(relativePath, next);
  console.log(`[repair-markup] ${relativePath}: title count ${before} -> ${count(next, "wm-ui-title")}`);
}

repairDashboard(targets.dashboard);
addPageRoot(targets.productFamily);
repairProductPitch(targets.productPitch);
addPageRoot(targets.proposal);

console.log("[repair-markup] Structural repair complete.");