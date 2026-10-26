import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { relativePath, STYLE_SCAN_ROOT, styleSheetFiles } from "./dead-css.mjs";
import { shippedFiles } from "./shipped-source.mjs";

/**
 * The inverse of the dead-CSS gate: markup that names a class no stylesheet
 * answers.
 *
 * `tools/lib/dead-css.mjs` starts from the CSS and asks whether shipped markup
 * can ever match it. This module starts from the markup and asks whether any
 * stylesheet ever answers the class. Both sides read the same stylesheets under
 * `src/wingman2`, so a rule deleted by the pruner shows up here as a class whose
 * only style has gone.
 *
 * A class counts as answered when one of these is true:
 *
 * - a project stylesheet declares it (`.wm-card`);
 * - Tailwind generates a rule for it (`text-sm`, `w-3.5`, `hover:bg-red-500`),
 *   which the compiler decides, so utilities are not echoed in an allowlist;
 * - it is a Tailwind marker (`group`, `peer`) that carries behaviour rather
 *   than declarations.
 *
 * Two kinds of token are never asked: names assembled at runtime
 * (`wm-card--${tone}`) never appear literally, and test files assert class
 * names rather than render them.
 */

export const MARKUP_SCAN_ROOT = STYLE_SCAN_ROOT;
export const UNSTYLED_BASELINE_PATH = path.join("tools", "wingman-unstyled-classes-baseline.json");

const markupExtensions = new Set([".tsx", ".jsx", ".ts", ".js", ".mjs", ".html"]);
const skipDirs = new Set(["node_modules", "dist", "coverage", "reports", "data"]);
const testFile = /\.(?:test|spec)\.[cm]?[jt]sx?$/;

/** Tailwind markers: the class holds a hook for variants, not declarations. */
const markerClass = /^(?:group|peer)(?:\/[\w-]+)?$/;

/** A class assembled around a runtime value; `\u0000` stands in for it. */
const DYNAMIC = "\u0000";

/** A token that could be a class name, not a fragment of prose or code. */
const classLike = /^-?[A-Za-z_][A-Za-z0-9_:/.[\]#%!-]*$/;

/** Everything a file renders as a class attribute, whatever its value shape. */
export function classAttributeValues(text) {
  const values = [];
  for (const match of text.matchAll(/\b(?:className|class)\s*=\s*/g)) {
    let index = match.index + match[0].length;
    while (index < text.length && /\s/.test(text[index])) index += 1;
    const char = text[index];
    if (char === '"' || char === "'") {
      const literal = readQuoted(text, index);
      values.push({ value: literal.value, template: false });
      continue;
    }
    if (char === "`") {
      const literal = readQuoted(text, index);
      values.push({ value: literal.value, template: true });
      continue;
    }
    if (char === "{") {
      for (const literal of stringLiteralsIn(readBraced(text, index).value)) values.push(literal);
    }
  }
  return values;
}

/** Class tokens named by one class attribute value, in source order. */
export function classTokensIn(text) {
  const tokens = [];
  for (const { value, template } of classAttributeValues(text)) {
    for (const token of (template ? stripTemplateExpressions(value) : value).split(/\s+/)) {
      if (!token || token.includes(DYNAMIC)) continue;
      if (classLike.test(token)) tokens.push(token);
    }
  }
  return tokens;
}

/**
 * Class names a stylesheet answers: project `.css` files plus the `<style>`
 * blocks that export builders ship inside the documents they generate. A
 * quotation document's classes are styled there, not in the app sheet, and
 * asking the app sheet alone would report every one of them.
 */
export function styleSheetClassNames(root, { files = styleSheetFiles(root), sources = markupFiles(root) } = {}) {
  const names = new Set();
  for (const file of [...files, ...sources]) {
    const text = fs.readFileSync(file, "utf8");
    const css = path.extname(file) === ".css" ? text : inlineStyleBlocks(text).join("\n");
    if (!css) continue;
    for (const match of css.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/url\([^)]*\)/g, " ").matchAll(/\.(-?[_a-zA-Z][_a-zA-Z0-9-]*)/g)) {
      names.add(match[1]);
    }
  }
  return names;
}

/**
 * Class names shipped markup asks for: `{ file, name }` entries, one per
 * distinct pairing so the baseline names the file that needs the style.
 */
export function collectClassUsage(root) {
  const entries = new Map();
  for (const absolute of markupFiles(root)) {
    const file = relativePath(root, absolute);
    for (const name of classTokensIn(fs.readFileSync(absolute, "utf8"))) {
      entries.set(`${file}::${name}`, { file, name });
    }
  }
  return [...entries.values()].sort((left, right) => left.file.localeCompare(right.file) || left.name.localeCompare(right.name));
}

/**
 * Source files that can carry markup, in a deterministic order: shipped source
 * only, so a component parked in an ignored directory asks for no styles it
 * would never render. The stylesheets on the other side of the question read the
 * same rule through `styleSheetFiles`.
 */
export function markupFiles(root, directory = path.join(root, MARKUP_SCAN_ROOT)) {
  if (!fs.existsSync(directory)) return [];
  return shippedFiles(root, walkMarkup(directory))
    .sort((left, right) => relativePath(root, left).localeCompare(relativePath(root, right)));
}

function walkMarkup(directory) {
  return fs.readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (entry.name.startsWith(".") || skipDirs.has(entry.name)) return [];
        return walkMarkup(absolute);
      }
      if (testFile.test(entry.name) || !markupExtensions.has(path.extname(entry.name))) return [];
      return fs.statSync(absolute).size > 4 * 1024 * 1024 ? [] : [absolute];
    });
}

/** Stylesheet text an export builder embeds in the documents it generates. */
export function inlineStyleBlocks(text) {
  return [...text.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((match) => match[1]);
}

/**
 * Class names Tailwind would generate for the given candidates.
 *
 * The app sheet imports theme and utilities with `source(none)` and names its
 * sources in CSS, so the compiler is the authority here: a token is a utility
 * only when it produces a rule. Asking the compiler keeps theme utilities and
 * arbitrary values working without a second hand-written vocabulary.
 */
export async function collectUtilityClasses(tokens, { base = process.cwd() } = {}) {
  if (tokens.length === 0) return new Set();
  const require = createRequire(import.meta.url);
  const { compile } = await import("tailwindcss");
  const compiler = await compile(
    '@import "tailwindcss/theme.css" source(none);@import "tailwindcss/utilities" source(none);',
    {
      base,
      onDependency() {},
      loadStylesheet(id) {
        const file = require.resolve(id);
        return { path: file, base: path.dirname(file), content: fs.readFileSync(file, "utf8") };
      },
    },
  );
  const generated = compiler
    .build([...new Set(tokens)])
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/url\([^)]*\)/g, " ");
  const classes = new Set();
  for (const match of generated.matchAll(/\.((?:\\.|[A-Za-z0-9_-])+)/g)) classes.add(match[1].replace(/\\(.)/g, "$1"));
  return classes;
}

/**
 * Every class name markup asks for that nothing answers. The stylesheet and
 * utility answers are passed in so a caller can build them once for the whole
 * tree rather than per file.
 */
export function unstyledClasses(usage, { stylesheetClasses, utilityClasses = new Set() }) {
  return usage.filter(({ name }) => !stylesheetClasses.has(name) && !utilityClasses.has(name) && !markerClass.test(name));
}

/** Compare current unstyled classes with a baseline list of `{ file, name }`. */
export function compareUnstyledClasses(current, baseline) {
  const key = (entry) => `${entry.file}::${entry.name}`;
  const currentKeys = new Set(current.map(key));
  const baselineKeys = new Set(baseline.map(key));
  return {
    added: current.filter((entry) => !baselineKeys.has(key(entry))),
    stale: baseline.filter((entry) => !currentKeys.has(key(entry))),
  };
}

function readQuoted(text, start) {
  const quote = text[start];
  let index = start + 1;
  let value = "";
  while (index < text.length) {
    const char = text[index];
    if (char === "\\") {
      value += text.slice(index, index + 2);
      index += 2;
      continue;
    }
    if (char === quote) return { value, end: index + 1 };
    value += char;
    index += 1;
  }
  return { value, end: text.length };
}

/** Read a JSX expression container, keeping nested braces and literals whole. */
function readBraced(text, start) {
  let depth = 0;
  let index = start;
  while (index < text.length) {
    const char = text[index];
    if (char === '"' || char === "'" || char === "`") {
      index = readQuoted(text, index).end;
      continue;
    }
    if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) return { value: text.slice(start + 1, index), end: index + 1 };
    }
    index += 1;
  }
  return { value: text.slice(start + 1), end: text.length };
}

/**
 * A literal that is an operand of a comparison is a value being tested, not a
 * class name: `mode === "guided" ? "is-active" : ""` renders `is-active`, and
 * reading `guided` as a class would invent a name no stylesheet can answer.
 */
const comparisonOperator = /(?:===|!==|==|!=)$/;
const comparisonAhead = /^\s*(?:===|!==|==|!=)/;

/** String literals inside a JSX expression, skipping comments and comparisons. */
function stringLiteralsIn(expression) {
  const literals = [];
  let index = 0;
  while (index < expression.length) {
    const char = expression[index];
    if (char === '"' || char === "'" || char === "`") {
      const literal = readQuoted(expression, index);
      const before = expression.slice(0, index).trimEnd();
      const after = expression.slice(literal.end).trimStart();
      if (!comparisonOperator.test(before) && !comparisonAhead.test(after)) {
        literals.push({ value: literal.value, template: char === "`" });
      }
      index = literal.end;
      continue;
    }
    if (char === "/" && expression[index + 1] === "/") {
      const end = expression.indexOf("\n", index);
      index = end === -1 ? expression.length : end;
      continue;
    }
    if (char === "/" && expression[index + 1] === "*") {
      const end = expression.indexOf("*/", index + 2);
      index = end === -1 ? expression.length : end + 2;
      continue;
    }
    index += 1;
  }
  return literals;
}

/** Replace each `${...}` in a template literal with the runtime placeholder. */
function stripTemplateExpressions(text) {
  let result = "";
  let index = 0;
  while (index < text.length) {
    if (text[index] === "$" && text[index + 1] === "{") {
      let depth = 1;
      let cursor = index + 2;
      while (cursor < text.length && depth > 0) {
        const char = text[cursor];
        if (char === '"' || char === "'" || char === "`") {
          cursor = readQuoted(text, cursor).end;
          continue;
        }
        if (char === "{") depth += 1;
        else if (char === "}") depth -= 1;
        cursor += 1;
      }
      result += DYNAMIC;
      index = cursor;
      continue;
    }
    result += text[index];
    index += 1;
  }
  return result;
}
