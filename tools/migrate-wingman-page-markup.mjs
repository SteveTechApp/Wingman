import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const targetFiles = [
  "src/wingman2/pages/DashboardPage.tsx",
  "src/wingman2/pages/DiscoveryPage.tsx",
  "src/wingman2/pages/RecommendationsPage.tsx",
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

const classAttrPattern = /<([A-Za-z][A-Za-z0-9.]*)\b([^<>]*?)className=(["'])([^"']*?)\3([^<>]*?)>/gs;

function normalizeClassList(value) {
  return value
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function addClasses(existing, additions) {
  const classes = normalizeClassList(existing);
  for (const addition of additions) {
    if (addition && !classes.includes(addition)) {
      classes.push(addition);
    }
  }
  return classes.join(" ");
}

function hasAny(value, patterns) {
  return patterns.some((pattern) => pattern.test(value));
}

function decideClasses(tag, before, className, after) {
  const lowerTag = tag.toLowerCase();
  const attrText = `${before} ${className} ${after}`;
  const classes = [];

  if (lowerTag === "main") {
    classes.push("wm-ui-page", "wingman-page-host");
  }

  if (lowerTag === "section") {
    classes.push("wm-ui-section");
  }

  if (lowerTag === "article") {
    classes.push("wm-ui-card");
  }

  if (/^h[1-4]$/.test(lowerTag)) {
    classes.push("wm-ui-title");
  }

  if (lowerTag === "p") {
    classes.push("wm-ui-copy");
  }

  if (["input", "select", "textarea"].includes(lowerTag)) {
    classes.push("wm-ui-input");
  }

  if (lowerTag === "label" && hasAny(attrText, [/uppercase/i, /tracking/i, /eyebrow/i, /kicker/i, /label/i])) {
    classes.push("wm-ui-kicker");
  }

  if (lowerTag === "button" || (lowerTag === "a" && /role=["']button["']/i.test(attrText))) {
    classes.push("wm-ui-button");

    if (
      hasAny(attrText, [
        /primary/i,
        /selected/i,
        /active/i,
        /next/i,
        /continue/i,
        /save/i,
        /start/i,
        /run/i,
        /generate/i,
        /compare/i,
        /create/i,
        /submit/i,
      ])
    ) {
      classes.push("wm-ui-button-primary");
    } else {
      classes.push("wm-ui-button-secondary");
    }
  }

  if (
    hasAny(attrText, [
      /\bhero\b/i,
      /page-hero/i,
      /native-hero/i,
      /template-hero/i,
      /dashboard-hero/i,
      /landing-hero/i,
    ])
  ) {
    classes.push("wm-ui-hero");
  }

  if (
    hasAny(attrText, [
      /\bcard\b/i,
      /\bpanel\b/i,
      /\bsurface\b/i,
      /\btile\b/i,
      /\boption\b/i,
      /\bchoice\b/i,
      /\bresult\b/i,
      /\bstage\b/i,
      /\bstep\b/i,
      /\bbox\b/i,
      /\bform\b/i,
      /\bmodule\b/i,
      /\bsummary\b/i,
      /\bcallout\b/i,
      /\bprofile\b/i,
      /\bitem\b/i,
      /\brow\b/i,
      /\blist\b/i,
      /rounded-/i,
      /border/i,
      /shadow/i,
      /bg-\[/i,
      /bg-slate/i,
      /bg-white/i,
    ])
  ) {
    if (!classes.includes("wm-ui-hero")) {
      classes.push("wm-ui-card");
    }
  }

  if (
    hasAny(attrText, [
      /\bheader\b/i,
      /card-header/i,
      /section-header/i,
      /panel-header/i,
      /title-row/i,
      /heading-row/i,
    ])
  ) {
    classes.push("wm-ui-card-header");
  }

  if (
    hasAny(attrText, [
      /\btitle\b/i,
      /\bheading\b/i,
      /headline/i,
      /section-title/i,
      /card-title/i,
    ])
  ) {
    classes.push("wm-ui-title");
  }

  if (
    hasAny(attrText, [
      /\bcopy\b/i,
      /\bdescription\b/i,
      /\bsubtitle\b/i,
      /\blede\b/i,
      /\bintro\b/i,
      /\bsummary\b/i,
      /\bmuted\b/i,
      /text-sm/i,
      /text-base/i,
      /text-slate/i,
      /leading-/i,
    ])
  ) {
    classes.push("wm-ui-copy");
  }

  if (
    hasAny(attrText, [
      /\beyebrow\b/i,
      /\bkicker\b/i,
      /\boverline\b/i,
      /uppercase/i,
      /tracking-/i,
    ])
  ) {
    classes.push("wm-ui-kicker");
  }

  return [...new Set(classes)];
}

function migrateClassAttributes(source) {
  return source.replace(classAttrPattern, (full, tag, before, quote, className, after) => {
    const additions = decideClasses(tag, before, className, after);
    if (additions.length === 0) {
      return full;
    }

    const nextClassName = addClasses(className, additions);
    return `<${tag}${before}className=${quote}${nextClassName}${quote}${after}>`;
  });
}

function addClassNameToBareTags(source) {
  let next = source;

  next = next.replace(/<main\b(?![^>]*className=)([^>]*)>/g, '<main className="wm-ui-page wingman-page-host"$1>');
  next = next.replace(/<section\b(?![^>]*className=)([^>]*)>/g, '<section className="wm-ui-section"$1>');
  next = next.replace(/<article\b(?![^>]*className=)([^>]*)>/g, '<article className="wm-ui-card"$1>');
  next = next.replace(/<h1\b(?![^>]*className=)([^>]*)>/g, '<h1 className="wm-ui-title"$1>');
  next = next.replace(/<h2\b(?![^>]*className=)([^>]*)>/g, '<h2 className="wm-ui-title"$1>');
  next = next.replace(/<h3\b(?![^>]*className=)([^>]*)>/g, '<h3 className="wm-ui-title"$1>');
  next = next.replace(/<p\b(?![^>]*className=)([^>]*)>/g, '<p className="wm-ui-copy"$1>');
  next = next.replace(/<button\b(?![^>]*className=)([^>]*)>/g, '<button className="wm-ui-button wm-ui-button-secondary"$1>');
  next = next.replace(/<input\b(?![^>]*className=)([^>]*)>/g, '<input className="wm-ui-input"$1>');
  next = next.replace(/<select\b(?![^>]*className=)([^>]*)>/g, '<select className="wm-ui-input"$1>');
  next = next.replace(/<textarea\b(?![^>]*className=)([^>]*)>/g, '<textarea className="wm-ui-input"$1>');

  return next;
}

function migrateTemplateLiteralClassNames(source) {
  return source.replace(/className=\{`([^`]*?)`\}/gs, (full, className) => {
    if (className.includes("${")) {
      return full;
    }

    const attrText = className;
    const additions = [];

    if (hasAny(attrText, [/\bhero\b/i])) additions.push("wm-ui-hero");
    if (hasAny(attrText, [/\bcard\b/i, /\bpanel\b/i, /\btile\b/i, /\boption\b/i, /\bchoice\b/i, /\bresult\b/i, /rounded-/i, /border/i, /bg-\[/i, /bg-slate/i])) additions.push("wm-ui-card");
    if (hasAny(attrText, [/\btitle\b/i, /\bheading\b/i, /headline/i])) additions.push("wm-ui-title");
    if (hasAny(attrText, [/\bcopy\b/i, /\bdescription\b/i, /\bsummary\b/i, /text-sm/i, /text-base/i, /text-slate/i])) additions.push("wm-ui-copy");
    if (hasAny(attrText, [/\beyebrow\b/i, /\bkicker\b/i, /uppercase/i, /tracking-/i])) additions.push("wm-ui-kicker");

    if (additions.length === 0) {
      return full;
    }

    return `className={\`${addClasses(className, additions)}\`}`;
  });
}

function migrateFile(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    console.log(`[markup-migration] skipped missing ${relativePath}`);
    return { changed: false, relativePath };
  }

  const original = fs.readFileSync(absolutePath, "utf8");
  let next = original;

  next = migrateClassAttributes(next);
  next = migrateTemplateLiteralClassNames(next);
  next = addClassNameToBareTags(next);

  if (next !== original) {
    fs.writeFileSync(absolutePath, next);
    console.log(`[markup-migration] migrated ${relativePath}`);
    return { changed: true, relativePath };
  }

  console.log(`[markup-migration] unchanged ${relativePath}`);
  return { changed: false, relativePath };
}

const results = targetFiles.map(migrateFile);
const changed = results.filter((result) => result.changed).length;

console.log(`[markup-migration] Completed. Files changed: ${changed}/${targetFiles.length}`);