import ts from "typescript";

/**
 * Cross-chunk init order: a module-scope read of an imported binding that a page
 * load can evaluate before the module it takes from.
 *
 * `proposalDocxExport.ts` used to read the schematic palette into two tables at
 * module scope, and the palette's module sits in a chunk cycle, so the bundler
 * was free to run the reader first: every load of `/wingman/templates/<id>` died
 * on `Cannot read properties of undefined (reading 'aqua')`. The dev server loads
 * one module at a time and rendered the page, so only a built app showed it. Four
 * more of the same class failed quietly — an alias, an object, a prefix and a
 * story table — which is why they had sat there.
 *
 * The question is asked of the chunks rather than of the sources, because the
 * sources are not what runs: a statement the bundler dropped cannot fail, and the
 * statement that does run is written in the names the chunk imports. So the reads
 * here are read out of the emitted code, and the exporting chunk named in the
 * import statement is the module the read takes from.
 *
 * What makes a read unsafe is a chunk cycle, not a source cycle. A chunk's static
 * imports are evaluated before its body, so the binding is normally initialized
 * by the time the reader runs; when two chunks import each other, one of them has
 * to go first, and the chunk that runs first reads a binding the other has not
 * initialized. Which chunk goes first depends on where the cycle is entered, and
 * a route chunk can enter it differently from the app's own boot — so the
 * question is asked once per entry the bundle emits.
 *
 * One thing is initialized before any chunk body runs: a function declaration is
 * hoisted and initialized when the module is instantiated, so a read of an
 * exported function from a chunk that has not evaluated yet has something to
 * call. Only `var` (undefined), `let`, `const` and `class` (temporal dead zone)
 * make a read fail, which is why the palette's `const` tables were the ones that
 * threw and why this gate asks what kind of binding the read takes.
 */

/**
 * The chunk graph facts a bundle yields, as plain data.
 *
 * `imports` is the emitted static import order, which is the order the browser
 * evaluates them in, and `modules` is kept for the report only — the reads come
 * from the chunk's own code, not from its module list.
 */
export function toChunkFacts(outputs) {
  const chunks = outputs
    .filter((output) => output.type === "chunk")
    .map((output) => ({
      fileName: output.fileName,
      code: String(output.code ?? ""),
      imports: [...(output.imports ?? [])],
      dynamicImports: [...(output.dynamicImports ?? [])],
      isEntry: Boolean(output.isEntry),
      isDynamicEntry: Boolean(output.isDynamicEntry),
      facadeModuleId: output.facadeModuleId ? output.facadeModuleId.split("\\").join("/") : null,
      modules: Object.keys(output.modules ?? {}).map((id) => id.split("\\").join("/")),
      map: output.map ?? null,
    }));

  // A chunk that is not in the bundle cannot be imported by one that is: an
  // import of a file the build did not emit (an external, a `public/` script) is
  // not part of this graph.
  const names = new Set(chunks.map((chunk) => chunk.fileName));
  return chunks.map((chunk) => ({ ...chunk, imports: chunk.imports.filter((file) => names.has(file)) }));
}

/** The chunk a relative import specifier names, as the bundle spells it. */
function resolveImportedChunk(from, specifier, names) {
  if (!specifier.startsWith(".")) return null;
  const joined = [from.split("/").slice(0, -1).join("/"), specifier].filter(Boolean).join("/");
  const parts = [];
  for (const part of joined.split("/")) {
    if (part === "." || part === "") continue;
    if (part === "..") parts.pop();
    else parts.push(part);
  }
  const resolved = parts.join("/");
  if (names.has(resolved)) return resolved;
  const directory = from.split("/").slice(0, -1).join("/");
  return names.has(directory) ? directory : null;
}

function isFunctionBoundary(node) {
  return (
    ts.isFunctionDeclaration(node) ||
    ts.isFunctionExpression(node) ||
    ts.isArrowFunction(node) ||
    ts.isMethodDeclaration(node) ||
    ts.isConstructorDeclaration(node) ||
    ts.isGetAccessorDeclaration(node) ||
    ts.isSetAccessorDeclaration(node)
  );
}

/** A function that is called where it stands runs at module scope like any statement. */
function isImmediatelyInvoked(node) {
  let current = node;
  let parent = current.parent;
  while (parent && ts.isParenthesizedExpression(parent)) {
    current = parent;
    parent = current.parent;
  }
  return Boolean(parent && ts.isCallExpression(parent) && parent.expression === current);
}

/**
 * The bindings a chunk imports, by the name its own code uses for them.
 *
 * `exportedName` is what the *other* chunk calls it, which is the name to ask
 * about; `null` stands for a namespace object.
 */
function importBindingsOf({ fileName, source, names }) {
  const imported = new Map();
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    const importedFrom = resolveImportedChunk(fileName, statement.moduleSpecifier.text, names);
    const clause = statement.importClause;
    if (!importedFrom || !clause) continue;
    if (clause.name) imported.set(clause.name.text, { importedFrom, exportedName: "default" });
    const bindings = clause.namedBindings;
    if (!bindings) continue;
    if (ts.isNamespaceImport(bindings)) {
      imported.set(bindings.name.text, { importedFrom, exportedName: null });
      continue;
    }
    for (const element of bindings.elements) {
      imported.set(element.name.text, {
        importedFrom,
        exportedName: (element.propertyName ?? element.name).text,
      });
    }
  }
  return imported;
}

/** Whether an identifier is being read as a value rather than named. */
function isValueReference(identifier) {
  const parent = identifier.parent;
  if (!parent) return false;
  if (ts.isPropertyAccessExpression(parent) && parent.name === identifier) return false;
  if (ts.isPropertyAssignment(parent) && parent.name === identifier) return false;
  if (ts.isJsxAttribute(parent) && parent.name === identifier) return false;
  if (ts.isImportSpecifier(parent) || ts.isImportClause(parent) || ts.isNamespaceImport(parent)) return false;
  if (ts.isExportSpecifier(parent) || ts.isExportAssignment(parent)) return false;
  const namesItself =
    (ts.isVariableDeclaration(parent) ||
      ts.isParameter(parent) ||
      ts.isBindingElement(parent) ||
      ts.isFunctionDeclaration(parent) ||
      ts.isFunctionExpression(parent) ||
      ts.isClassDeclaration(parent) ||
      ts.isClassExpression(parent) ||
      ts.isPropertyDeclaration(parent) ||
      ts.isMethodDeclaration(parent) ||
      ts.isGetAccessorDeclaration(parent) ||
      ts.isSetAccessorDeclaration(parent)) &&
    parent.name === identifier;
  return !namesItself;
}

/**
 * Every module-scope read of an imported binding in the emitted chunks.
 *
 * The chunk is one module as far as the browser is concerned — its body runs
 * where its imports have finished — so module scope here is the chunk's top level,
 * and a read inside a function (including the lazy `__esm`-style wrapper a CJS
 * dependency is built with) runs later than that.
 */
export function collectChunkModuleScopeReads({ chunks }) {
  const names = new Set(chunks.map((chunk) => chunk.fileName));
  const reads = [];
  const stats = { chunksWithImports: 0, importBindings: 0, namespaceReads: 0 };

  for (const chunk of chunks) {
    // Parent pointers are what tell a named identifier from a referenced one, so
    // they are recorded: without them every read looks like a declaration.
    const source = ts.createSourceFile(chunk.fileName, chunk.code, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
    const imported = importBindingsOf({ fileName: chunk.fileName, source, names });
    if (!imported.size) continue;
    stats.chunksWithImports += 1;
    stats.importBindings += imported.size;

    const record = (identifier, binding) => {
      const { line, character } = source.getLineAndCharacterOfPosition(identifier.getStart(source));
      // A namespace read takes one property; `ns.aqua` is the binding, `ns` alone
      // is the object, which exists as soon as the chunk is instantiated.
      const accessed =
        ts.isPropertyAccessExpression(identifier.parent) && identifier.parent.expression === identifier
          ? identifier.parent.name.text
          : null;
      if (binding.exportedName === null) stats.namespaceReads += 1;
      reads.push({
        chunk: chunk.fileName,
        importedFrom: binding.importedFrom,
        exportedName: binding.exportedName ?? accessed,
        localName: identifier.text,
        line: line + 1,
        column: character + 1,
        snippet: (identifier.parent ?? identifier).getText(source).slice(0, 90),
      });
    };

    const visit = (node) => {
      if (isFunctionBoundary(node)) {
        if (isImmediatelyInvoked(node)) {
          ts.forEachChild(node.body ?? node, visit);
        }
        return;
      }
      if (ts.isClassDeclaration(node) || ts.isClassExpression(node)) {
        for (const clause of node.heritageClauses ?? []) visit(clause);
        for (const member of node.members) {
          // A static block and a static initializer run when the class is
          // defined, which is module scope; an instance member does not.
          if (ts.isClassStaticBlockDeclaration(member)) visit(member);
          else if (ts.isPropertyDeclaration(member) && member.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.StaticKeyword)) {
            visit(member.initializer ?? member);
          }
        }
        return;
      }
      if (ts.isIdentifier(node)) {
        const binding = imported.get(node.text);
        if (binding && isValueReference(node)) record(node, binding);
        return;
      }
      ts.forEachChild(node, visit);
    };
    for (const statement of source.statements) visit(statement);
  }

  return { reads, stats };
}

/**
 * What kind of binding a read takes, and whether it is initialized before any
 * chunk body runs.
 *
 * An export of a `function` declaration is: the ESM instantiation step hoists and
 * initializes function declarations, so a cycle can call one before the exporting
 * chunk has evaluated — which is why the legacy project store's read of
 * `createDesignProjectCommands` has always worked. `var` is `undefined` until its
 * chunk evaluates and `let`, `const` and `class` are in the temporal dead zone, so
 * a read of any of those is the failure this gate is for; the palette table that
 * threw was a `const`. An export re-exported from another chunk is asked about
 * where it is declared, and a binding whose declaration cannot be found is treated
 * as uninitialized: the gate fails closed, because a scan that cannot see the
 * declaration is not evidence that it is safe.
 *
 * The kind comes from the emitted declaration, not from the source, because the
 * bundler is free to write a source's `const` as anything it likes — what the
 * browser links is the emitted form.
 */
export function bindingShapes({ chunks }) {
  const byFileName = new Map(chunks.map((chunk) => [chunk.fileName, chunk]));
  const sources = new Map();
  const importedCache = new Map();
  const cache = new Map();

  const sourceOf = (fileName) => {
    if (!sources.has(fileName)) {
      const chunk = byFileName.get(fileName);
      sources.set(
        fileName,
        chunk ? ts.createSourceFile(fileName, chunk.code, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS) : null,
      );
    }
    return sources.get(fileName);
  };

  /** exported name → `{ local }` in this chunk, or `{ from, name }` when re-exported. */
  const exportMap = (fileName) => {
    const source = sourceOf(fileName);
    const map = new Map();
    if (!source) return map;
    const record = (declaration, reExport) => {
      const clause = declaration.exportClause;
      if (!clause || !ts.isNamedExports(clause)) return;
      for (const element of clause.elements) {
        const exported = element.name.text;
        const local = (element.propertyName ?? element.name).text;
        if (reExport) map.set(exported, { from: reExport, name: exported === "default" ? "default" : local });
        else map.set(exported, { local });
      }
    };
    const isExported = (node) => node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword);
    for (const statement of source.statements) {
      if (!ts.isExportDeclaration(statement)) {
        // A declaration the bundler wrote with `export` in front of it exports its
        // own name, which is how a chunk spells a single-function dependency.
        if (!isExported(statement)) continue;
        if (ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) {
          if (statement.name) map.set(statement.name.text, { local: statement.name.text });
        } else if (ts.isVariableStatement(statement)) {
          for (const declaration of statement.declarationList.declarations) {
            if (ts.isIdentifier(declaration.name)) map.set(declaration.name.text, { local: declaration.name.text });
          }
        }
        continue;
      }
      if (statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier)) {
        const from = resolveImportedChunk(fileName, statement.moduleSpecifier.text, new Set(byFileName.keys()));
        if (from) record(statement, from);
      } else {
        record(statement, null);
      }
    }
    return map;
  };

  /** The bindings a chunk imports, for a re-export that hands one on. */
  const importedLocals = (fileName) => {
    if (!importedCache.has(fileName)) {
      const source = sourceOf(fileName);
      importedCache.set(
        fileName,
        source ? importBindingsOf({ fileName, source, names: new Set(byFileName.keys()) }) : new Map(),
      );
    }
    return importedCache.get(fileName);
  };

  const declarationKind = (fileName, localName) => {
    const source = sourceOf(fileName);
    if (!source) return "unknown";
    for (const statement of source.statements) {
      if (ts.isFunctionDeclaration(statement) && statement.name?.text === localName) return "function";
      if (ts.isClassDeclaration(statement) && statement.name?.text === localName) return "class";
      if (ts.isVariableStatement(statement)) {
        for (const declaration of statement.declarationList.declarations) {
          if (!ts.isIdentifier(declaration.name) || declaration.name.text !== localName) continue;
          const flags = statement.declarationList.flags;
          if (flags & ts.NodeFlags.Const) return "const";
          if (flags & ts.NodeFlags.Let) return "let";
          return "var";
        }
      }
    }
    return "unknown";
  };

  return (read) => {
    const key = `${read.importedFrom}::${read.exportedName}`;
    if (cache.has(key)) return cache.get(key);
    let current = read.importedFrom;
    let name = read.exportedName;
    const visited = new Set();
    const finish = (kind) => {
      const shape = { kind, hoisted: kind === "function" || kind === "namespace" };
      cache.set(key, shape);
      return shape;
    };
    for (let hop = 0; hop < 8; hop += 1) {
      if (name === null) {
        // A namespace read with no property named: the object itself exists at
        // instantiation, so nothing is being read before it exists.
        return finish("namespace");
      }
      const mark = `${current}::${name}`;
      if (visited.has(mark)) return finish("unknown");
      visited.add(mark);
      const entry = exportMap(current).get(name);
      if (!entry) return finish("unknown");
      if (entry.from) {
        current = entry.from;
        name = entry.name;
        continue;
      }
      // `export { x }` hands on a binding that may itself be an import — a barrel
      // re-exporting a function — so that hop is followed too.
      const passedOn = importedLocals(current).get(entry.local);
      if (passedOn) {
        current = passedOn.importedFrom;
        name = passedOn.exportedName;
        continue;
      }
      return finish(declarationKind(current, entry.local));
    }
    return finish("unknown");
  };
}

/**
 * What an entry load can put in the wrong order.
 *
 * `eager` is the chunk list the app has already evaluated when a route chunk
 * arrives: the entry chunk's static import closure, which is what the browser
 * boots through. The app's own boot is walked from nothing for the same reason
 * the list is computable: a cycle between two eager chunks is exactly as fatal as
 * one behind a route, and the boot is the entry load where it fires first.
 */
export function findInitOrderHazards({ chunks, eager = [], entries, reads }) {
  const byFileName = new Map(chunks.map((chunk) => [chunk.fileName, chunk]));

  const considered = reads.filter((read) => !read.hoisted);
  const readsByChunk = new Map();
  for (const read of considered) {
    if (!readsByChunk.has(read.chunk)) readsByChunk.set(read.chunk, []);
    readsByChunk.get(read.chunk).push(read);
  }

  const findings = [];
  const byRead = new Map();

  const walk = (fileName, state, entry) => {
    const standing = state.get(fileName);
    if (standing) return;
    const chunk = byFileName.get(fileName);
    if (!chunk) {
      state.set(fileName, "done");
      return;
    }
    state.set(fileName, "running");
    for (const dependency of chunk.imports) walk(dependency, state, entry);
    for (const read of readsByChunk.get(fileName) ?? []) {
      // The definer is one of this chunk's static imports, so it is either done
      // or still running: still running is the cycle that reorders them.
      if (state.get(read.importedFrom) === "done") continue;
      const key = `${read.chunk}:${read.line}:${read.localName}`;
      if (!byRead.has(key)) {
        byRead.set(key, { ...read, entries: new Set() });
        findings.push(byRead.get(key));
      }
      byRead.get(key).entries.add(entry.label);
    }
    state.set(fileName, "done");
  };

  const eagerSet = new Set(eager);
  for (const entry of entries) {
    const state = new Map(entry.isBoot ? [] : [...eagerSet].map((fileName) => [fileName, "done"]));
    walk(entry.fileName, state, entry);
  }

  const reachable = new Set();
  const mark = (fileName) => {
    if (reachable.has(fileName)) return;
    reachable.add(fileName);
    const chunk = byFileName.get(fileName);
    if (!chunk) return;
    for (const dependency of chunk.imports) mark(dependency);
    for (const dependency of chunk.dynamicImports) mark(dependency);
  };
  for (const fileName of eagerSet) mark(fileName);
  for (const entry of entries) mark(entry.fileName);

  return {
    findings: findings.map((finding) => ({ ...finding, entries: [...finding.entries].sort() })),
    stats: {
      chunks: chunks.length,
      entries: entries.length,
      reads: reads.length,
      hoisted: reads.length - considered.length,
      considered: considered.length,
      unreachableChunks: chunks.filter((chunk) => !reachable.has(chunk.fileName)).map((chunk) => chunk.fileName),
    },
  };
}

/**
 * A reader for one chunk's source map: the original position for a generated one.
 *
 * Decoded once per chunk rather than once per read, and the nearest mapping at or
 * before the generated position is the answer, since a minified chunk is a handful
 * of enormous lines. A chunk with no map returns nothing, and the failure falls
 * back to the generated position rather than to no position at all.
 */
export function sourceMapLookup(map) {
  if (!map || !map.mappings) return () => null;
  const segments = decodeMappings(map.mappings);
  return (line, column) => {
    let best = null;
    for (const segment of segments) {
      if (segment.generatedLine > line) break;
      if (segment.generatedLine === line && segment.generatedColumn > column) break;
      best = segment;
    }
    if (!best || best.sourceIndex === undefined) return null;
    const source = map.sources?.[best.sourceIndex];
    return source ? { source, line: (best.originalLine ?? 0) + 1, column: (best.originalColumn ?? 0) + 1 } : null;
  };
}

/**
 * The generated positions a source map names, as the few fields this needs.
 *
 * Written out rather than taken from a dependency because it is one small table
 * and the gate must not grow the build's install to name a file in a failure.
 */
export function decodeMappings(mappings) {
  const segments = [];
  let generatedLine = 1;
  let generatedColumn = 0;
  let sourceIndex = 0;
  let originalLine = 0;
  let originalColumn = 0;
  const base64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const value = (character) => base64.indexOf(character);

  const groups = String(mappings ?? "").split(";");
  for (const group of groups) {
    generatedColumn = 0;
    for (const segment of group.split(",")) {
      if (!segment) continue;
      const numbers = [];
      let current = 0;
      let shift = 0;
      for (const character of segment) {
        const digit = value(character);
        if (digit < 0) return segments;
        current += (digit & 31) << shift;
        if (digit & 32) {
          shift += 5;
          continue;
        }
        const negative = current & 1;
        numbers.push(negative ? -(current >> 1) : current >> 1);
        current = 0;
        shift = 0;
      }
      if (numbers.length) generatedColumn += numbers[0];
      if (numbers.length >= 4) {
        sourceIndex += numbers[1];
        originalLine += numbers[2];
        originalColumn += numbers[3];
      }
      // A fifth field names the original identifier, which the caller reads from
      // the source file when it needs it.
      if (numbers.length >= 4) {
        segments.push({ generatedLine, generatedColumn, sourceIndex, originalLine, originalColumn });
      } else {
        segments.push({ generatedLine, generatedColumn });
      }
    }
    generatedLine += 1;
  }
  return segments;
}
