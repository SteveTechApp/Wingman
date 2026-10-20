import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

// Inspect syntax, not comments or fixture strings. Named functions include
// their nested callbacks and helpers, so multiline locators cannot evade it.
export function findCopyLocators(source, functions = ["walkDiscovery", "saveDiscoveryProjectAndExportBrief"]) {
  const file = ts.createSourceFile("flow.mjs", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const findings = [];
  function scan(node, active = false) {
    if (ts.isFunctionDeclaration(node)) active = active || functions.includes(node.name?.text);
    if (active && ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const method = node.expression.name.text;
      const copyMethod = ["getByText", "getByLabel", "getByPlaceholder", "getByTitle", "getByAltText"].includes(method);
      const copyOption = node.arguments.some(arg => ts.isObjectLiteralExpression(arg) && arg.properties.some(prop =>
        ["hasText", "hasNotText", ...(method === "getByRole" ? ["name"] : [])].includes(prop.name?.getText(file).replace(/["']/g, ""))));
      const textSelector = method === "locator" && node.arguments.some(arg => /(?:text=|:has-text\(|:text(?:-is|-matches)?\()/.test(arg.getText(file)));
      if (copyMethod || copyOption || textSelector) findings.push({ line: file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1, method });
    }
    ts.forEachChild(node, child => scan(child, active));
  }
  scan(file);
  return findings;
}

export function checkDiscoveryLocators(root = process.cwd()) {
  const relative = "tools/e2e-smoke-check.mjs";
  return findCopyLocators(fs.readFileSync(path.join(root, relative), "utf8")).map(row => `${relative}:${row.line}: ${row.method} must use a stable data-testid`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const failures = checkDiscoveryLocators();
  console.log(failures.length ? failures.join("\n") : "Discovery locator contract passed");
  process.exitCode = failures.length ? 1 : 0;
}
