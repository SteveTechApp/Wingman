import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();

const targetFiles = [
  "src/wingman2/pages/CatalogBrowserPage.tsx",
  "src/wingman2/pages/RecommendationsPage.tsx",
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

const failures = [];

function getClassNameAttributes(node) {
  return node.attributes.properties.filter(
    (property) =>
      ts.isJsxAttribute(property) &&
      ts.isIdentifier(property.name) &&
      property.name.text === "className",
  );
}

for (const relativePath of targetFiles) {
  const absolutePath = path.join(root, relativePath);

  if (!fs.existsSync(absolutePath)) {
    continue;
  }

  const text = fs.readFileSync(absolutePath, "utf8");
  const sourceFile = ts.createSourceFile(relativePath, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

  function visit(node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const classNameAttrs = getClassNameAttributes(node);

      if (classNameAttrs.length > 1) {
        const position = sourceFile.getLineAndCharacterOfPosition(classNameAttrs[1].getStart(sourceFile));
        failures.push(`${relativePath}:${position.line + 1}:${position.character + 1} has ${classNameAttrs.length} className attributes`);
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
}

if (failures.length) {
  console.error("[duplicate-classnames] FAILED:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("[duplicate-classnames] No duplicate JSX className attributes found.");