import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

const normalize = (value) => value.replace(/\\/g, "/");
const isTest = (value) => /(?:^|\/)__tests__\/|\.(?:test|spec)\.[^.]+$/.test(normalize(value));

/** Conservative source reachability: type imports count; test imports do not. */
export function auditRuntimeReachability(root, retained = {}) {
  const files = [];
  function visit(directory) {
    if (!existsSync(directory)) return;
    for (const item of readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, item.name);
      if (item.isDirectory()) visit(file);
      else if (/\.tsx?$/.test(file) && !/\.d\.ts$/.test(file) && !isTest(file)) files.push(file);
    }
  }
  visit(path.join(root, "src"));
  const known = new Set(files.map((file) => normalize(path.resolve(file))));
  const relative = (file) => normalize(path.relative(root, file));
  const options = { moduleResolution: ts.ModuleResolutionKind.Bundler, baseUrl: root, paths: { "@/*": ["src/*"] } };
  const edges = new Map();
  for (const file of files) {
    const imports = ts.preProcessFile(readFileSync(file, "utf8"), true, true).importedFiles;
    const targets = imports.flatMap(({ fileName }) => {
      const resolved = ts.resolveModuleName(fileName, file, options, ts.sys).resolvedModule?.resolvedFileName;
      return resolved && known.has(normalize(path.resolve(resolved))) ? [path.resolve(resolved)] : [];
    });
    edges.set(path.resolve(file), targets);
  }
  const reachable = new Set();
  const entry = path.join(root, "src/main.tsx");
  const queue = existsSync(entry) ? [entry] : [];
  while (queue.length) {
    const current = queue.pop();
    if (reachable.has(current)) continue;
    reachable.add(current);
    queue.push(...(edges.get(current) ?? []));
  }
  const unreachable = files.filter((file) => !reachable.has(file)).map(relative).sort();
  const orphans = unreachable.filter((file) => !retained[file]?.trim());
  const staleRetentions = Object.keys(retained).filter((file) => !unreachable.includes(file));
  return { total: files.length, reachable: reachable.size, unreachable, orphans, staleRetentions, missingEntry: !existsSync(entry) };
}
