import { execFileSync } from "node:child_process";
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
 * appear literally, so the literal fragment that builds them marks the family
 * as dynamic and keeps the rule. A fragment only counts when the source builds
 * a *class* with it: the literal sits in a `className=`/`class=`/`classList`
 * position, and is either the text just before a `${` interpolation or a
 * quoted literal ending in `-` followed by `+`. Merely *mentioning* a prefix
 * (`"vw-"` in a regex, a comment, a DOM id, a download filename) is not
 * assembly: that turned one incidental `vw-` token into evidence for every
 * `vw-*` rule, and `compare-`, `wingman-`, `product-` and `project-` were kept
 * alive the same way by ids and filenames. Third-party runtimes inject their
 * own class names, so their known prefixes are always kept.
 *
 * A `new RegExp(\`…\`)` template is a mention however it is named: a pattern
 * describes text the app matches (`^text-${families}-\d+$`), so a tool whose
 * pattern list is called `visualClassPatterns` builds no class with it. Without
 * that rule the Tailwind families counted as assembled at runtime, and every
 * selector starting `text-`, `bg-` or `border-` looked live.
 */

const corpusExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".html", ".json"]);
const classFragmentChar = /[A-Za-z0-9_-]/;
/** Shortest fragment worth trusting: below this a prefix says nothing. */
const MIN_DYNAMIC_FRAGMENT = 3;
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
 * Where a class name may be written: a JSX/host `className=` (or HTML
 * `class=`), the DOM `classList` calls, and a builder whose own name says it
 * produces classes (`compareDecisionButtonClass`, `routeClassNames`). Only a
 * literal inside one of these counts as class assembly — an `id=`, a filename,
 * a data key or a regex alternative that happens to look like a prefix is not a
 * class family.
 */
const classAttribute = /\bclassName\s*=\s*|\bclass\s*=\s*|\bclassList\s*\.\s*(?:add|remove|toggle|replace)\s*\(\s*/g;
const classBuilderWords = new Set(["class", "classes", "classname", "classnames", "classlist"]);

/**
 * Whether a declaration's own name says it builds classes: `statusClass`,
 * `routeClassNames`, `classForMode`. `buildClassroom` and `classifyProduct`
 * only start with the letters, so their ids stay mentions.
 */
function isClassBuilderName(name) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[^A-Za-z]+/)
    .some((word) => classBuilderWords.has(word.toLowerCase()));
}
const nearestDeclaration = /\b(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=/g;
const nearestFunction = /\bfunction\s+([A-Za-z0-9_$]+)\s*[<(]/g;

/**
 * Whether a position sits in a class builder: the nearest declaration is named
 * for classes (`routeClassNames`), or the nearest enclosing function is
 * (`compareDecisionButtonClass`, whose body may hold an ordinary `const tone`
 * between the name and the template). An id or filename template inside an
 * ordinary builder matches neither, so it stays a mention.
 */
function enclosingClassBuilder(text, position) {
  const context = text.slice(Math.max(0, position - 600), position);
  let declaration = null;
  let fn = null;
  for (const match of context.matchAll(nearestDeclaration)) declaration = match[1];
  for (const match of context.matchAll(nearestFunction)) fn = match[1];
  return Boolean(
    (declaration && isClassBuilderName(declaration))
    || (fn && isClassBuilderName(fn)),
  );
}

/** Index just past the class-bearing expression that starts at `start`. */
function classExpressionEnd(text, start) {
  const opener = text[start];
  if (opener === "{") {
    let depth = 0;
    let quote = null;
    for (let index = start; index < text.length; index += 1) {
      const char = text[index];
      if (quote) {
        if (char === "\\") index += 1;
        else if (char === quote) quote = null;
        continue;
      }
      if (char === '"' || char === "'" || char === "`") {
        quote = char;
        continue;
      }
      if (char === "{") depth += 1;
      else if (char === "}") {
        depth -= 1;
        if (depth === 0) return index;
      }
    }
    return text.length;
  }
  if (opener === "`") return text.indexOf("`", start + 1) + 1 || text.length;
  if (opener === '"' || opener === "'") return text.indexOf(opener, start + 1) + 1 || text.length;
  return start;
}

/**
 * Index just past the string or template literal opening at `start`.
 *
 * A template's `${…}` is scanned as the expression it is, so a pattern built
 * from nested calls still ends at its own closing backtick rather than at the
 * first one inside an interpolation.
 */
function literalEnd(text, start) {
  const quote = text[start];
  let cursor = start + 1;
  while (cursor < text.length) {
    const char = text[cursor];
    if (char === "\\") {
      cursor += 2;
      continue;
    }
    if (quote === "`" && char === "$" && text[cursor + 1] === "{") {
      cursor = bracketEnd(text, cursor + 1) + 1;
      continue;
    }
    if (char === quote) return cursor + 1;
    cursor += 1;
  }
  return text.length;
}

const closingBracket = { "(": ")", "{": "}", "[": "]" };

/**
 * Index of the bracket closing the one at `open`, or the end of the text when
 * nothing closes it. Strings, templates and comments are skipped, so a brace in
 * a message cannot end an argument list early.
 */
function bracketEnd(text, open) {
  const opener = text[open];
  const closer = closingBracket[opener];
  if (!closer) return open;
  let depth = 0;
  let cursor = open;
  while (cursor < text.length) {
    const char = text[cursor];
    if (char === '"' || char === "'" || char === "`") {
      cursor = literalEnd(text, cursor);
      continue;
    }
    if (char === "/" && text[cursor + 1] === "/") {
      const lineEnd = text.indexOf("\n", cursor);
      cursor = lineEnd === -1 ? text.length : lineEnd;
      continue;
    }
    if (char === "/" && text[cursor + 1] === "*") {
      const commentEnd = text.indexOf("*/", cursor + 2);
      cursor = commentEnd === -1 ? text.length : commentEnd + 2;
      continue;
    }
    if (char === opener) depth += 1;
    else if (char === closer) {
      depth -= 1;
      if (depth === 0) return cursor;
    }
    cursor += 1;
  }
  return text.length;
}

/**
 * Spans of `RegExp(…)` / `new RegExp(…)` argument lists.
 *
 * A pattern is not a class, so no literal inside one is assembly evidence —
 * even in a file whose own names read as class builders.
 */
function regExpArgumentRanges(text) {
  const ranges = [];
  for (const match of text.matchAll(/(?<![\w$])RegExp\s*\(/g)) {
    const open = match.index + match[0].length - 1;
    ranges.push([open, bracketEnd(text, open)]);
  }
  return ranges;
}

/**
 * Literal prefix fragments a source file uses to assemble a class name.
 *
 * Evidence comes only from a class-bearing position: inside `className=` /
 * `class=` (a template literal, or any expression in its braces), inside
 * `classList` calls, and inside a declaration whose own name says it builds
 * classes. Within one, a template literal contributes the class-shaped text
 * immediately before each `${`, and a quoted literal ending in `-` directly
 * followed by `+` contributes that literal. A word that merely ends in a
 * hyphen somewhere in the file — a regex alternative, a comment, a DOM id, a
 * download filename — contributes nothing: it is a mention, not assembly, and
 * one such mention used to keep an entire stylesheet alive.
 */
export function collectDynamicFragments(text, fragments, onFragment) {
  // A pattern describes the text the app matches, so nothing inside one builds a
  // class — see the header. Checked here rather than per call site, because
  // every way of writing a fragment passes through `add`.
  const patternRanges = regExpArgumentRanges(text);
  const inPattern = (at) => patternRanges.some(([from, to]) => at >= from && at <= to);
  const add = (fragment, at) => {
    if (inPattern(at)) return;
    if (fragment.length < MIN_DYNAMIC_FRAGMENT || !fragment.endsWith("-")) return;
    fragments.add(fragment);
    onFragment?.(fragment, at);
  };
  const addInterpolations = (from, to) => {
    for (let index = text.indexOf("${", from); index !== -1 && index < to; index = text.indexOf("${", index + 2)) {
      let start = index;
      while (start > from && classFragmentChar.test(text[start - 1])) start -= 1;
      add(text.slice(start, index), start);
    }
  };
  const addConcatenations = (from, to) => {
    for (const match of text.slice(from, to).matchAll(/(["'`])([^"'`\n]{1,200}?)\1\s*\+/g)) {
      add(match[2].match(/[A-Za-z0-9_-]+$/)?.[0] ?? "", from + match.index);
    }
  };
  for (const match of text.matchAll(classAttribute)) {
    const start = match.index + match[0].length;
    const end = classExpressionEnd(text, start);
    addInterpolations(start, end);
    addConcatenations(start, end);
  }
  for (let index = text.indexOf("${"); index !== -1; index = text.indexOf("${", index + 2)) {
    if (!enclosingClassBuilder(text, index)) continue;
    let start = index;
    while (start > 0 && classFragmentChar.test(text[start - 1])) start -= 1;
    add(text.slice(start, index), start);
  }
  for (const match of text.matchAll(/(["'`])([^"'`\n]{1,200}?)\1\s*\+/g)) {
    if (!enclosingClassBuilder(text, match.index)) continue;
    add(match[2].match(/[A-Za-z0-9_-]+$/)?.[0] ?? "", match.index);
  }
  return fragments;
}

/** The text of the source line a position sits on, trimmed for a report. */
export function sourceLine(text, position, limit = 160) {
  const start = text.lastIndexOf("\n", Math.max(0, position - 1)) + 1;
  const end = text.indexOf("\n", position);
  const line = text.slice(start, end === -1 ? text.length : end).trim();
  return line.length > limit ? `${line.slice(0, limit - 1)}…` : line;
}

/**
 * Class tokens referenced by shipped source, plus the literal fragments used
 * to assemble class names at runtime.
 */
/**
 * The source files whose text counts as evidence: shipped source under the root
 * — every tracked file plus untracked files git does not ignore — except
 * stylesheets, the checked-in baseline, ignored build output and `reports/`.
 * Sorted, so a report that lists these places reads the same twice.
 *
 * Ignored trees are left out on purpose. A copy of an old component parked in
 * `_backups/`, an abandoned worktree or a local export is not shipped source,
 * and one such copy still naming a retired class was enough to keep the rule
 * alive here while the same branch failed the gate on a clean checkout. Git
 * answers the question when the root is a checkout; anywhere else (a sandbox, an
 * unpacked tarball) the tree is walked as before.
 */
export function corpusFiles(root) {
  const listed = gitListedFiles(root);
  const files = [];
  if (listed) {
    for (const relative of listed) {
      const segments = relative.split("/").slice(0, -1);
      if (segments.some((segment) => segment.startsWith(".") || skipDirs.has(segment))) continue;
      const full = path.join(root, relative);
      if (isCorpusFile(root, full)) files.push(full);
    }
  } else {
    (function walk(directory) {
      for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        if (entry.isDirectory()) {
          if (entry.name.startsWith(".") || skipDirs.has(entry.name)) continue;
          walk(path.join(directory, entry.name));
          continue;
        }
        const full = path.join(directory, entry.name);
        if (isCorpusFile(root, full)) files.push(full);
      }
    })(root);
  }
  return files.sort((left, right) => relativePath(root, left).localeCompare(relativePath(root, right)));
}

function isCorpusFile(root, full) {
  // Stylesheets are the thing being checked; their own selectors must not count
  // as evidence that a class is used.
  if (!corpusExtensions.has(path.extname(full))) return false;
  if (full === path.join(root, BASELINE_PATH)) return false;
  return fs.statSync(full).size <= 4 * 1024 * 1024;
}

/**
 * Paths git would ship from `root`, POSIX-separated: tracked files plus untracked
 * files no ignore rule covers. `--exclude-standard` is the whole point — it is
 * what keeps a backup copy out of the evidence. Null when `root` is not a git
 * checkout, so the caller can fall back to walking the tree.
 */
function gitListedFiles(root) {
  try {
    const listed = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      maxBuffer: 64 * 1024 * 1024,
    });
    return listed.split("\0").filter(Boolean).map((entry) => entry.split("\\").join("/"));
  } catch {
    return null;
  }
}

/**
 * Class tokens referenced by shipped source, plus the literal fragments used
 * to assemble class names at runtime.
 *
 * `onFragment` receives each accepted fragment with the place that builds it,
 * so the triage report can show its evidence without re-implementing the rule.
 */
export function buildVocabulary(root, { onFragment } = {}) {
  const vocabulary = new Set();
  const dynamicFragments = new Set();
  for (const full of corpusFiles(root)) {
    const text = fs.readFileSync(full, "utf8");
    for (const token of text.match(/[A-Za-z_][A-Za-z0-9_-]{2,}/g) ?? []) vocabulary.add(token);
    if (!onFragment) {
      collectDynamicFragments(text, dynamicFragments);
      continue;
    }
    collectDynamicFragments(text, dynamicFragments, (fragment, at) => onFragment({
      fragment,
      file: relativePath(root, full),
      line: text.slice(0, at).split("\n").length,
      text: sourceLine(text, at),
    }));
  }
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
 * The literal fragment that keeps a class token alive at runtime, or null.
 *
 * A token survives without being written literally when one of its hyphen
 * prefixes is a fragment source assembles in a class-bearing position. That is
 * the second half of "live", and it lives here so the gate and the triage
 * report's exemption list cannot name different keepers for the same class.
 */
export function assembledFragmentFor(token, dynamicFragments) {
  for (let index = 0; index < token.length; index += 1) {
    if (token[index] !== "-") continue;
    const fragment = token.slice(0, index + 1);
    if (fragment.length >= MIN_DYNAMIC_FRAGMENT && dynamicFragments.has(fragment)) return fragment;
  }
  return null;
}

/**
 * Detection predicates sharing one vocabulary scan.
 *
 * - `isDeadSelector`: the whole rule can never match (every comma branch dead).
 * - `isDeadBranch`: one comma branch can never match (any compound dead).
 *   A live sibling branch keeps the rule, but the dead branch is still
 *   removable text, and it would otherwise hide inside the rule forever.
 */
export function createDeadSelectorTests(root, options = {}) {
  const { vocabulary, dynamicFragments } = buildVocabulary(root, options);
  const literalCache = new Map();
  function maybeDynamic(token) {
    if (literalCache.has(token)) return literalCache.get(token);
    const dynamic = libraryClass.test(token)
      || vocabulary.has(token)
      || assembledFragmentFor(token, dynamicFragments) !== null;
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
  // The vocabulary and fragments come back with the predicates so the triage
  // report can ask the inverse question — which live class survives only
  // because source assembles its prefix — without a second corpus scan.
  return { isDeadSelector, isDeadBranch, deadClassEvidence, vocabulary, dynamicFragments };
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
