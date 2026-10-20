import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export function assertTailwindUtilities(css) {
  if (!/--spacing\s*:\s*(?:0?\.25rem|4px)\s*[;}]/.test(css)) throw new Error("Tailwind theme --spacing is missing or unresolved");
  if (!/\.h-3\\\.5\s*\{[^}]*height\s*:/.test(css)) throw new Error("Tailwind theme-dependent .h-3.5 utility is missing");
}

export function checkTailwindBuild(directory = path.resolve("dist/assets")) {
  const css = fs.readdirSync(directory).filter(name => name.endsWith(".css")).map(name => fs.readFileSync(path.join(directory, name), "utf8")).join("\n");
  assertTailwindUtilities(css);
  console.log("Tailwind built theme and spacing utilities passed");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { checkTailwindBuild(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
