import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const pagesDir = path.join(root, "src", "wingman2", "pages");

const widePages = new Set([
  "ComparePage.tsx",
  "DiscoveryPage.tsx",
  "RecommendationsPage.tsx",
  "ProposalPage.tsx",
  "VideowallBuilderPage.tsx",
  "ProductFamilyPage.tsx"
]);

function toSlug(fileName) {
  return fileName
    .replace(/\.tsx$/, "")
    .replace(/Page$/, "")
    .replace(/Builder$/, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase();
}

function pageMode(fileName) {
  if (widePages.has(fileName)) {
    return "wide";
  }

  return "standard";
}

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function write(file, content) {
  fs.writeFileSync(file, content.endsWith("\n") ? content : `${content}\n`, "utf8");
}

function isPageFunctionName(name) {
  return Boolean(name && (name.endsWith("Page") || name.endsWith("BuilderPage")));
}

function isJsxReturnExpression(expression) {
  if (!expression) {
    return false;
  }

  if (ts.isJsxElement(expression) || ts.isJsxFragment(expression) || ts.isJsxSelfClosingElement(expression)) {
    return true;
  }

  if (ts.isParenthesizedExpression(expression)) {
    return isJsxReturnExpression(expression.expression);
  }

  return false;
}

function expressionText(source, expression) {
  return source.slice(expression.getStart(source), expression.getEnd());
}

function collectReturnStatementsFromFunctionBody(body, sourceFile) {
  const returns = [];

  function visit(node) {
    if (
      ts.isFunctionDeclaration(node) ||
      ts.isFunctionExpression(node) ||
      ts.isArrowFunction(node) ||
      ts.isMethodDeclaration(node) ||
      ts.isClassDeclaration(node)
    ) {
      if (node !== body) {
        return;
      }
    }

    if (ts.isReturnStatement(node) && isJsxReturnExpression(node.expression)) {
      const expr = node.expression;

      if (!expressionText(sourceFile, expr).includes("WingmanPageFrame")) {
        returns.push(node);
      }

      return;
    }

    ts.forEachChild(node, visit);
  }

  for (const statement of body.statements) {
    visit(statement);
  }

  return returns;
}

function findComponentBodies(sourceFile) {
  const bodies = [];

  for (const statement of sourceFile.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name && isPageFunctionName(statement.name.text) && statement.body) {
      bodies.push(statement.body);
    }

    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        const name = ts.isIdentifier(declaration.name) ? declaration.name.text : "";

        if (!isPageFunctionName(name)) {
          continue;
        }

        const initializer = declaration.initializer;

        if (!initializer) {
          continue;
        }

        if ((ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer)) && ts.isBlock(initializer.body)) {
          bodies.push(initializer.body);
        }
      }
    }
  }

  return bodies;
}

function ensureImport(raw) {
  const importLine = 'import { WingmanPageFrame } from "../components/layout";';

  if (raw.includes(importLine)) {
    return raw;
  }

  const lines = raw.split(/\r?\n/);
  let insertIndex = 0;

  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index].trim().startsWith("import ")) {
      insertIndex = index + 1;
      continue;
    }

    if (insertIndex > 0) {
      break;
    }
  }

  lines.splice(insertIndex, 0, importLine, "");

  return lines.join("\n");
}

function migrateFile(file) {
  const fileName = path.basename(file);
  const slug = toSlug(fileName);
  const mode = pageMode(fileName);
  const sourceText = read(file);

  if (sourceText.includes("WingmanPageFrame")) {
    return {
      file,
      changed: false,
      reason: "already uses WingmanPageFrame"
    };
  }

  const sourceFile = ts.createSourceFile(fileName, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const bodies = findComponentBodies(sourceFile);

  if (bodies.length === 0) {
    return {
      file,
      changed: false,
      reason: "no page component body found"
    };
  }

  const replacements = [];

  for (const body of bodies) {
    const returns = collectReturnStatementsFromFunctionBody(body, sourceFile);

    for (const returnStatement of returns) {
      const expression = returnStatement.expression;
      const start = expression.getStart(sourceFile);
      const end = expression.getEnd();
      const current = sourceText.slice(start, end);

      const replacement = `(
    <WingmanPageFrame mode="${mode}" className="wm-page-migrated wm-page-migrated--${slug}">
      ${current}
    </WingmanPageFrame>
  )`;

      replacements.push({ start, end, replacement });
    }
  }

  if (replacements.length === 0) {
    return {
      file,
      changed: false,
      reason: "no unwrapped JSX returns found"
    };
  }

  let next = sourceText;

  for (const replacement of replacements.sort((a, b) => b.start - a.start)) {
    next = `${next.slice(0, replacement.start)}${replacement.replacement}${next.slice(replacement.end)}`;
  }

  next = ensureImport(next);

  write(file, next);

  return {
    file,
    changed: true,
    reason: `wrapped ${replacements.length} return(s)`
  };
}

const pageFiles = fs
  .readdirSync(pagesDir)
  .filter((name) => name.endsWith("Page.tsx") || name.endsWith("BuilderPage.tsx"))
  .map((name) => path.join(pagesDir, name))
  .sort();

const results = pageFiles.map(migrateFile);

for (const result of results) {
  const relative = path.relative(root, result.file).replaceAll("\\", "/");
  const marker = result.changed ? "changed" : "skipped";
  console.log(`[page-frame] ${marker}: ${relative} - ${result.reason}`);
}

const changedCount = results.filter((result) => result.changed).length;

console.log(`[page-frame] Migration complete. Changed files: ${changedCount}`);