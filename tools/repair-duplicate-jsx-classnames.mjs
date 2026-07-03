import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();

const targetFiles = [
  "src/wingman2/pages/CatalogBrowserPage.tsx",
  "src/wingman2/pages/FinderPage.tsx",
  "src/wingman2/pages/ProductCallCardsPage.tsx",
  "src/wingman2/pages/ProductFamilyPage.tsx",
  "src/wingman2/pages/ProductPitchPage.tsx",
  "src/wingman2/pages/ProjectDetailPage.tsx",
  "src/wingman2/pages/ProjectsPage.tsx",
  "src/wingman2/pages/ProposalPage.tsx",
  "src/wingman2/pages/DashboardPage.tsx",
  "src/wingman2/pages/DiscoveryPage.tsx",
  "src/wingman2/pages/ComparePageNew.tsx",
  "src/wingman2/pages/TemplatesPage.tsx",
  "src/wingman2/pages/VideowallBuilderPage.tsx",
];

function getClassNameAttributes(node) {
  return node.attributes.properties.filter(
    (property) =>
      ts.isJsxAttribute(property) &&
      ts.isIdentifier(property.name) &&
      property.name.text === "className",
  );
}

function valueExpression(sourceFile, attr) {
  const initializer = attr.initializer;

  if (!initializer) {
    return "true";
  }

  if (ts.isStringLiteral(initializer)) {
    return JSON.stringify(initializer.text);
  }

  if (ts.isJsxExpression(initializer)) {
    if (!initializer.expression) {
      return '""';
    }

    return initializer.expression.getText(sourceFile);
  }

  return initializer.getText(sourceFile);
}

function whitespaceStart(text, start) {
  let cursor = start;
  while (cursor > 0 && /[ \t]/.test(text[cursor - 1])) {
    cursor -= 1;
  }
  return cursor;
}

function repairFile(relativePath) {
  const absolutePath = path.join(root, relativePath);

  if (!fs.existsSync(absolutePath)) {
    return 0;
  }

  const original = fs.readFileSync(absolutePath, "utf8");
  const sourceFile = ts.createSourceFile(relativePath, original, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const edits = [];

  function inspectOpeningLike(node) {
    const classNameAttrs = getClassNameAttributes(node);

    if (classNameAttrs.length <= 1) {
      return;
    }

    const mergedValues = classNameAttrs.map((attr) => valueExpression(sourceFile, attr));
    const replacement = `className={[${mergedValues.join(", ")}].filter(Boolean).join(" ")}`;

    const first = classNameAttrs[0];
    edits.push({
      start: first.getStart(sourceFile),
      end: first.end,
      replacement,
    });

    for (const attr of classNameAttrs.slice(1)) {
      edits.push({
        start: whitespaceStart(original, attr.getStart(sourceFile)),
        end: attr.end,
        replacement: "",
      });
    }
  }

  function visit(node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      inspectOpeningLike(node);
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  if (edits.length === 0) {
    console.log(`[duplicate-classnames] unchanged ${relativePath}`);
    return 0;
  }

  edits.sort((left, right) => right.start - left.start);

  let next = original;
  for (const edit of edits) {
    next = `${next.slice(0, edit.start)}${edit.replacement}${next.slice(edit.end)}`;
  }

  fs.writeFileSync(absolutePath, next);
  const repairedTags = edits.filter((edit) => edit.replacement.startsWith("className=")).length;
  console.log(`[duplicate-classnames] repaired ${relativePath}: ${repairedTags}`);
  return repairedTags;
}

let total = 0;
for (const file of targetFiles) {
  total += repairFile(file);
}

console.log(`[duplicate-classnames] Completed. JSX tags repaired: ${total}`);