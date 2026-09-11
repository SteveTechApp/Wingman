import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

export const MAX_PRODUCTION_FILE_LINES = 1200;
export const MAX_PAGE_ENTRY_LINES = 400;

// This is the initial migration debt approved by the modular-refactor plan.
// Keeping the keys in code means editing the JSON cannot silently exempt a new
// violation. Delete keys from both places as files are split; never add keys.
export const MIGRATION_ALLOWLIST_KEYS = new Set([
  "max-file-lines:src/wingman2/components/ProposalCompletionWizard.tsx",
  "max-file-lines:src/wingman2/components/WingmanGuruDrawer.tsx",
  "max-file-lines:src/wingman2/data/productPositioningCards.ts",
  "max-file-lines:src/wingman2/data/productStories.ts",
  "max-file-lines:src/wingman2/data/projectStore.ts",
  "max-file-lines:src/wingman2/lib/compareEligibilityEngine.ts",
  "max-file-lines:src/wingman2/lib/compareSpecEngine.ts",
  "max-file-lines:src/wingman2/lib/productStoryEngine.ts",
  "max-file-lines:src/wingman2/lib/productTopology.ts",
  "max-file-lines:src/wingman2/lib/projectTopology.ts",
  "max-file-lines:src/wingman2/lib/roomTemplates.ts",
  "max-file-lines:src/wingman2/pages/ComparePageNew.advanced.tsx",
  "max-file-lines:src/wingman2/pages/DiscoveryPage.tsx",
  "max-file-lines:src/wingman2/pages/ProductCallCardsPage.tsx",
  "max-file-lines:src/wingman2/pages/ProductPitchPage.tsx",
  "max-file-lines:src/wingman2/pages/ProjectDetailPage.tsx",
  "max-file-lines:src/wingman2/pages/RecommendationsPage.tsx",
  "max-file-lines:src/wingman2/pages/discovery/DiscoveryGuidedInterview.tsx",
  "max-file-lines:src/wingman2/pages/discovery/discoveryQuestions.ts",
  "page-entry-lines:src/wingman2/pages/CatalogBrowserPage.tsx",
  "page-entry-lines:src/wingman2/pages/ComparePageNew.advanced.tsx",
  "page-entry-lines:src/wingman2/pages/DashboardPage.tsx",
  "page-entry-lines:src/wingman2/pages/DiscoveryPage.tsx",
  "page-entry-lines:src/wingman2/pages/IngestPage.tsx",
  "page-entry-lines:src/wingman2/pages/ProductCallCardsPage.tsx",
  "page-entry-lines:src/wingman2/pages/ProductFamilyPage.tsx",
  "page-entry-lines:src/wingman2/pages/ProductPitchPage.tsx",
  "page-entry-lines:src/wingman2/pages/ProfilePage.tsx",
  "page-entry-lines:src/wingman2/pages/ProjectDetailPage.tsx",
  "page-entry-lines:src/wingman2/pages/ProjectsPage.tsx",
  "page-entry-lines:src/wingman2/pages/RecommendationsPage.tsx",
  "page-entry-lines:src/wingman2/pages/TemplateReviewPage.tsx",
  "page-entry-lines:src/wingman2/pages/VideowallBuilderPage.tsx",
]);

function normalize(file) {
  return file.split(path.sep).join("/");
}

function productionFiles(rootDir) {
  const sourceRoot = path.join(rootDir, "src", "wingman2");
  if (!fs.existsSync(sourceRoot)) return [];
  const files = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (/\.(?:ts|tsx)$/.test(entry.name) && !/\.(?:test|spec)\.(?:ts|tsx)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) files.push(absolute);
    }
  };
  visit(sourceRoot);
  return files;
}

function lineCount(source) {
  if (source.length === 0) return 0;
  return source.replace(/\r?\n$/, "").split(/\r?\n/).length;
}

function featureName(file) {
  const match = normalize(file).match(/(?:^|\/)src\/wingman2\/features\/([^/]+)\//);
  return match?.[1] ?? null;
}

function resolveImport(importer, specifier, rootDir) {
  if (specifier.startsWith(".")) return normalize(path.relative(rootDir, path.resolve(path.dirname(importer), specifier)));
  const match = specifier.match(/^(?:@\/|src\/)?wingman2\/(.*)$/);
  return match ? `src/wingman2/${match[1]}` : null;
}

function importSpecifiers(source, file) {
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const imports = [];
  const visit = (node) => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) imports.push(node.moduleSpecifier.text);
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && node.arguments.length === 1 && ts.isStringLiteral(node.arguments[0])) imports.push(node.arguments[0].text);
    ts.forEachChild(node, visit);
  };
  visit(ast);
  return imports;
}

function canonicalModule(target) {
  return target.replace(/\.(?:ts|tsx|js|jsx)$/, "").replace(/\/index$/, "");
}

function isFeaturePublicRoot(target, owner) {
  return canonicalModule(target) === `src/wingman2/features/${owner}`;
}

export function parseMigrationAllowlistJson(source) {
  const ast = ts.parseJsonText("wingman-architecture-allowlist.json", source);
  const duplicateKeys = [];
  const root = ast.statements[0]?.expression;
  if (root && ts.isObjectLiteralExpression(root)) {
    const violationsProperty = root.properties.find((property) => ts.isPropertyAssignment(property) && property.name.getText(ast).replace(/^['"]|['"]$/g, "") === "violations");
    if (violationsProperty && ts.isPropertyAssignment(violationsProperty) && ts.isObjectLiteralExpression(violationsProperty.initializer)) {
      const seen = new Set();
      for (const property of violationsProperty.initializer.properties) {
        const key = property.name?.getText(ast).replace(/^['"]|['"]$/g, "");
        if (seen.has(key)) duplicateKeys.push(key);
        seen.add(key);
      }
    }
  }
  const parsed = JSON.parse(source);
  return { ...parsed, duplicateKeys };
}

function allowlistEntries(migrationAllowlist) {
  return migrationAllowlist?.violations ?? {};
}

export function checkWingmanArchitecture({ rootDir, migrationAllowlist = {} }) {
  const violations = [];
  const allowed = allowlistEntries(migrationAllowlist);
  const activeDebt = new Set();

  for (const key of migrationAllowlist?.duplicateKeys ?? []) {
    violations.push({ rule: "migration-allowlist-duplicate", file: "tools/wingman-architecture-allowlist.json", detail: `Duplicate migration exception: ${key}` });
  }

  for (const [key, entry] of Object.entries(allowed)) {
    const rule = key.split(":", 1)[0];
    if (!new Set(["max-file-lines", "page-entry-lines"]).has(rule)) {
      violations.push({ rule: "migration-allowlist-unknown-rule", file: "tools/wingman-architecture-allowlist.json", detail: `Unknown migration rule: ${key}` });
    }
    if (!Number.isInteger(entry?.maxLines) || entry.maxLines < 1) {
      violations.push({ rule: "migration-allowlist-invalid-ceiling", file: "tools/wingman-architecture-allowlist.json", detail: `Migration exception requires a positive integer maxLines: ${key}` });
    }
    if (!MIGRATION_ALLOWLIST_KEYS.has(key)) {
      violations.push({ rule: "migration-allowlist-addition", file: "tools/wingman-architecture-allowlist.json", detail: `Unapproved migration exception: ${key}` });
    }
  }

  const report = (rule, file, detail, lines) => {
    const key = `${rule}:${file}`;
    activeDebt.add(key);
    const ceiling = allowed[key]?.maxLines;
    if (typeof lines === "number" && MIGRATION_ALLOWLIST_KEYS.has(key) && Number.isInteger(ceiling) && lines <= ceiling) return;
    violations.push({ rule, file, detail });
  };

  for (const absolute of productionFiles(rootDir)) {
    const file = normalize(path.relative(rootDir, absolute));
    const source = fs.readFileSync(absolute, "utf8");
    const lines = lineCount(source);
    if (lines > MAX_PRODUCTION_FILE_LINES) report("max-file-lines", file, `${lines} lines exceeds ${MAX_PRODUCTION_FILE_LINES}`, lines);
    if (/^src\/wingman2\/pages\/[^/]+\.tsx$/.test(file) && lines > MAX_PAGE_ENTRY_LINES) report("page-entry-lines", file, `${lines} lines exceeds ${MAX_PAGE_ENTRY_LINES}`, lines);

    const owner = featureName(file);
    if (!owner) continue;
    for (const specifier of importSpecifiers(source, file)) {
      const target = resolveImport(absolute, specifier, rootDir);
      if (!target) continue;
      const targetOwner = featureName(target);
      if (targetOwner && targetOwner !== owner && !isFeaturePublicRoot(target, targetOwner)) {
        report("private-cross-feature-import", file, `Feature ${owner} imports private module ${specifier} from ${targetOwner}`);
      }
    }

    // Feature packages may consume shared runtime APIs. Dependency direction
    // is guarded at the other end: app/shared core may compose a feature only
    // through that feature's public root, never through a private module.
  }

  for (const absolute of productionFiles(rootDir)) {
    const file = normalize(path.relative(rootDir, absolute));
    if (!/^src\/wingman2\/(?:app|components|layout|lib|types|utils)\//.test(file)) continue;
    const source = fs.readFileSync(absolute, "utf8");
    for (const specifier of importSpecifiers(source, file)) {
      const target = resolveImport(absolute, specifier, rootDir);
      const targetOwner = target && featureName(target);
      if (targetOwner && !isFeaturePublicRoot(target, targetOwner)) {
        report("app-core-imports-feature-private", file, `App/shared core imports private feature module ${specifier}`);
      }
    }
  }
  for (const key of Object.keys(allowed)) {
    if (MIGRATION_ALLOWLIST_KEYS.has(key) && !activeDebt.has(key)) {
      violations.push({ rule: "migration-allowlist-stale", file: "tools/wingman-architecture-allowlist.json", detail: `Remove stale migration exception: ${key}` });
    }
  }
  return violations.sort((a, b) => a.rule.localeCompare(b.rule) || a.file.localeCompare(b.file) || a.detail.localeCompare(b.detail));
}
