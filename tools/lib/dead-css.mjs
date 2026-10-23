import fs from "node:fs";
import path from "node:path";

/**
 * Shared dead-class detection for the CSS consolidation tool and the
 * checked-in baseline gate.
 *
 * A selector is dead when it can never match shipped markup. Class tokens are
 * resolved against the source corpus, and the check is structural rather than
 * per-token, so a chain survives only if every one of its parts can match:
 *
 * - `.a .b` is dead when either compound is dead. If `.b` is never rendered,
 *   the descendant can never match even though `.a` is live; if `.a` is
 *   never rendered, the ancestor that scopes the rule has gone and the rule is
 *   orphaned even though `.b` is still used elsewhere.
 * - A comma list is an OR, so `.a, .b` stays only while at least one branch can
 *   match.
 * - Tokens inside `:is()`/`:not()`/attribute brackets are ignored, which keeps
 *   rules that might still match rather than deleting them.
 *
 * Tokens assembled at runtime (`wm-polish-${accent}`, `"wm-tier-" + tone`) never
 * appear literally, so a class-like source word with a trailing hyphen — or any
 * shorter hyphen-delimited prefix of it — marks the family as dynamic and keeps
 * the rule. Third-party runtimes inject their own class names, so their known
 * prefixes are always kept.
 */

const corpusExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".html", ".json"]);
const skipDirs = new Set(["node_modules", "dist", "coverage", "reports", "data"]);
const libraryClass = /^(recharts-|react-flow|xyflow-|monaco-|ace-|tippy-|swiper-|leaflet-|ProseMirror-|rc-|dnd-)/;

export const STYLE_SCAN_ROOT = path.join("src", "wingman2");
/** The checked-in allowlist. It must never count as evidence that a class is used. */
export const BASELINE_PATH = path.join("tools", "wingman-dead-css-baseline.json");

/** Readable, stable selector keys for the baseline file. */
export function normalizeSelector(selector) {
  return selector.replace(/\s+/g, " ").trim();
}

/** Relative POSIX path, so baselines are identical on every OS. */
export function relativePath(root, file) {
  return path.relative(root, file).split(path.sep).join("/");
}

/** Every `.css` file under `src/wingman2`, in a deterministic order. */
export function styleSheetFiles(root, directory = path.join(root, STYLE_SCAN_ROOT)) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) return styleSheetFiles(root, absolute);
      return entry.name.endsWith(".css") ? [absolute] : [];
    })
    .sort((left, right) => relativePath(root, left).localeCompare(relativePath(root, right)));
}

const combinators = new Set([" ", "\t", "\n", "\r", ">", "+", "~"]);

/**
 * Walk a selector one character at a time, calling `visit(char, atTopLevel)`.
 * Parenthesized arguments (`:is(...)`, `:not(...)`) and attribute brackets can
 * contain combinators, commas, quotes and classes that must not split or
 * decouple the surrounding selector.
 */
function scanSelector(text, visit) {
  let depth = 0;
  let quote = null;
  for (const char of text) {
    if (quote) {
      if (char === quote) quote = null;
      visit(char, false);
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      visit(char, false);
      continue;
    }
    if (char === "(" || char === "[") {
      depth += 1;
      visit(char, false);
      continue;
    }
    if (char === ")" || char === "]") {
      depth = Math.max(0, depth - 1);
      visit(char, false);
      continue;
    }
    visit(char, depth === 0);
  }
}

/** Split a selector list on top-level commas; `:is(.a, .b)` stays one branch. */
export function selectorBranches(selector) {
  const branches = [];
  let current = "";
  scanSelector(selector, (char, topLevel) => {
    if (topLevel && char === ",") {
      branches.push(current.trim());
      current = "";
      return;
    }
    current += char;
  });
  branches.push(current.trim());
  return branches.filter((branch) => branch.length > 0);
}

/** Split one branch into compounds: `a > .b .c` -> [`a`, `.b`, `.c`]. */
export function selectorCompounds(branch) {
  const compounds = [];
  let current = "";
  scanSelector(branch, (char, topLevel) => {
    if (topLevel && combinators.has(char)) {
      if (current.trim()) compounds.push(current.trim());
      current = "";
      return;
    }
    current += char;
  });
  if (current.trim()) compounds.push(current.trim());
  return compounds;
}

/**
 * Class tokens that must match on one element: `.a.b:hover` -> [`a`, `b`].
 * Tokens inside `:not()`/`:is()`/attribute brackets are ignored, so those
 * compounds are treated as possibly-live.
 */
export function compoundClassTokens(compound) {
  const tokens = [];
  const text = [];
  scanSelector(compound, (char, topLevel) => {
    if (topLevel) text.push(char);
  });
  for (const match of text.join("").matchAll(/\.(-?[_a-zA-Z][_a-zA-Z0-9-]*)/g)) tokens.push(match[1]);
  return tokens;
}

/**
 * Class tokens referenced by shipped source, plus the literal fragments used
 * to assemble class names at runtime.
 */
export function buildVocabulary(root) {
  const vocabulary = new Set();
  const dynamicFragments = new Set();
  (function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (entry.name.startsWith(".") || skipDirs.has(entry.name)) continue;
        walk(path.join(directory, entry.name));
        continue;
      }
      // Stylesheets are the thing being checked; their own selectors must not
      // count as evidence that a class is used.
      if (!corpusExtensions.has(path.extname(entry.name))) continue;
      const full = path.join(directory, entry.name);
      if (full === path.join(root, BASELINE_PATH)) continue;
      if (fs.statSync(full).size > 4 * 1024 * 1024) continue;
      const text = fs.readFileSync(full, "utf8");
      for (const token of text.match(/[A-Za-z_][A-Za-z0-9_-]{2,}/g) ?? []) {
        vocabulary.add(token);
        if (token.length >= 3 && token.endsWith("-")) dynamicFragments.add(token);
      }
    }
  })(root);
  return { vocabulary, dynamicFragments };
}

/**
 * Parse class rules with brace awareness. A comment before a rule is kept in
 * the file when the rule is pruned, but is not part of the selector, so
 * baseline keys stay stable no matter how a stylesheet is commented.
 */
export function parseRules(css) {
  const rules = [];
  function parse(start, end) {
    let cursor = start;
    while (cursor < end) {
      const open = css.indexOf("{", cursor);
      if (open === -1 || open >= end) break;
      let depth = 1;
      let index = open + 1;
      while (index < end && depth > 0) {
        if (css[index] === "{") depth += 1;
        else if (css[index] === "}") depth -= 1;
        index += 1;
      }
      const prelude = css.slice(cursor, open);
      const trimmed = prelude.trim();
      if (/^@(media|supports|layer|container)/.test(trimmed)) parse(open + 1, index - 1);
      else if (!trimmed.startsWith("@")) {
        const lastCommentEnd = prelude.lastIndexOf("*/");
        const contentStart = lastCommentEnd === -1 ? cursor : cursor + lastCommentEnd + 2;
        const selector = trimmed.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\s+/g, " ").trim();
        if (selector.length > 0) {
          // Bounds of the selector text itself, so a mixed list can be rewritten
          // without touching the comment or the indentation before it.
          const afterComment = prelude.slice(contentStart - cursor);
          const leading = afterComment.match(/^\s*/)[0].length;
          const selectorStart = contentStart + leading;
          const selectorEnd = cursor + prelude.trimEnd().length;
          rules.push({ selector, contentStart, selectorStart, selectorEnd, deleteEnd: index });
        }
      }
      cursor = index;
    }
  }
  parse(0, css.length);
  return rules;
}

/**
 * Detection predicates sharing one vocabulary scan.
 *
 * - `isDeadSelector`: the whole rule can never match (every comma branch dead).
 * - `isDeadBranch`: one comma branch can never match (any compound dead).
 *   A live sibling branch keeps the rule, but the dead branch is still
 *   removable text, and it would otherwise hide inside the rule forever.
 */
export function createDeadSelectorTests(root) {
  const { vocabulary, dynamicFragments } = buildVocabulary(root);
  const literalCache = new Map();
  function maybeDynamic(token) {
    if (literalCache.has(token)) return literalCache.get(token);
    let dynamic = libraryClass.test(token) || vocabulary.has(token);
    if (!dynamic) {
      for (let i = 0; i < token.length && !dynamic; i += 1) {
        if (token[i] !== "-") continue;
        const fragment = token.slice(0, i + 1);
        if (fragment.length >= 3 && dynamicFragments.has(fragment)) dynamic = true;
      }
    }
    literalCache.set(token, dynamic);
    return dynamic;
  }
  // A compound with no class token (a tag, attribute or pseudo-element) is
  // treated as live: only missing classes are evidence of deadness.
  function liveCompound(compound) {
    const tokens = compoundClassTokens(compound);
    return tokens.length === 0 || tokens.some((token) => maybeDynamic(token));
  }
  const isDeadBranch = (branch) => selectorCompounds(branch).some((compound) => !liveCompound(compound));
  const isDeadSelector = (selector) => {
    const branches = selectorBranches(selector);
    return branches.length > 0 && branches.every(isDeadBranch);
  };
  const deadClassEvidence = (selector) => selectorBranches(selector).map((branch) => ({
    branch,
    unusedClasses: [...new Set(selectorCompounds(branch)
      .filter((compound) => !liveCompound(compound)).flatMap(compoundClassTokens))],
  }));
  return { isDeadSelector, isDeadBranch, deadClassEvidence };
}

/** Predicate: true when the selector can never match. */
export function createDeadSelectorTest(root) {
  return createDeadSelectorTests(root).isDeadSelector;
}

/** Predicate: true when one comma branch can never match. */
export function createDeadBranchTest(root) {
  return createDeadSelectorTests(root).isDeadBranch;
}

/** Live and dead comma branches of a selector, in source order. */
export function partitionSelectorBranches(selector, isDeadBranch) {
  return selectorBranches(selector).reduce(
    (result, branch) => {
      (isDeadBranch(branch) ? result.dead : result.live).push(branch);
      return result;
    },
    { live: [], dead: [] },
  );
}

/**
 * Drop conditional at-rules left with an empty body by pruning. Blocks that
 * still hold a comment are kept: the comment may be a marker other checks use.
 * `@layer { }` is kept on purpose: an empty block still declares layer order.
 */
export function stripEmptyConditionalBlocks(css) {
  const empty = /(^|\n)[ \t]*@(?:media|supports|container)[^{;]*\{[ \t\r\n]*\}/g;
  let next = css;
  for (let previous = ""; previous !== next; ) {
    previous = next;
    next = next.replace(empty, "$1");
  }
  return next;
}

/**
 * Unmatchable selector text in one stylesheet, one entry per rule when the
 * whole rule is dead, otherwise one entry per dead branch. Branch entries are
 * the selector text a split would delete, so the baseline covers exactly what
 * the pruner removes.
 */
export function deadSelectorEntries(css, relative, isDeadBranch) {
  return parseRules(css).flatMap((rule) => {
    const { live, dead } = partitionSelectorBranches(rule.selector, isDeadBranch);
    if (dead.length === 0) return [];
    if (live.length === 0) {
      return [{ file: relative, selector: normalizeSelector(rule.selector), bytes: Buffer.byteLength(css.slice(rule.contentStart, rule.deleteEnd)) }];
    }
    return dead.map((branch) => ({ file: relative, selector: normalizeSelector(branch), bytes: Buffer.byteLength(branch) }));
  });
}

/** Every unmatchable selector across the stylesheets the gate scans. */
export function collectDeadSelectors(root, files = styleSheetFiles(root)) {
  const { isDeadBranch } = createDeadSelectorTests(root);
  return files.flatMap((file) =>
    deadSelectorEntries(fs.readFileSync(file, "utf8"), relativePath(root, file), isDeadBranch),
  );
}

/** Compare current dead selectors with a baseline list of `{ file, selector }`. */
export function compareDeadSelectors(current, baseline) {
  const currentKeys = new Set(current.map((entry) => `${entry.file}::${entry.selector}`));
  const baselineKeys = new Set(baseline.map((entry) => `${entry.file}::${entry.selector}`));
  return {
    added: current.filter((entry) => !baselineKeys.has(`${entry.file}::${entry.selector}`)),
    stale: baseline.filter((entry) => !currentKeys.has(`${entry.file}::${entry.selector}`)),
  };
}
