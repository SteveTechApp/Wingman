import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

/**
 * Which fields of the records we persist nothing in the app reads.
 *
 * The question is "does any surface use this value?", and a text search cannot
 * answer it here: the fields are called `title`, `status`, `source`, `evidence`,
 * so their names appear everywhere while the field itself may be read nowhere.
 * Counting bare mentions makes such a field look used; counting `.field` makes
 * it look used by some other object that happens to share the name. So this
 * reads the compiler's answer instead — every property symbol the program
 * actually resolves is a read, and a declared field no read resolves to is one
 * nothing consumes.
 *
 * What counts as a read — either half is enough:
 *
 * - the compiler resolves the property symbol: a property access
 *   (`project.proposal`), an element access with a literal key
 *   (`entry["domain"]`), or destructuring (`const { title } = proposal`);
 * - the name is used in an access position in shipped source (`.field` or
 *   `["field"]`). This half exists because the persistence layer decodes
 *   untyped JSON — a codec reads `record.field` off a `Record<string, unknown>`,
 *   which resolves to an index signature rather than to the record's own
 *   symbol. Without it every persisted mirror of a runtime type would read as
 *   dead, which is most of the store.
 *
 * What does not: writing a field (`row.errorMessage = message`, or `field:` in
 * an object literal) names the wire rather than consuming it — a value stored
 * and never shown is exactly the debt this finds.
 *
 * Records are found by walking the storage writes rather than by listing the
 * records: every `setItem(key, JSON.stringify(value))` in shipped source makes
 * `value`'s type a root, and every type reachable from a root is policed too.
 * A new store is covered the moment it is written, and a field added deep
 * inside `StoredProjectProposal` is covered without anyone registering it.
 *
 * A store kept as a table — a `Record` of drafts, keyed by template — is a root
 * by its values rather than by its own shape: the map has no fields, so the
 * record inside it is what a surface reads. See `expandStoredTypes`.
 *
 * A map of `unknown` is the one thing no type describes, so the gate follows the
 * codec that reads it instead: `Record<string, unknown>` declares nothing to
 * walk, and the function the field is handed to — taking the loose map and
 * returning a declared record — is where the stored shape actually is. See
 * `collectCodecReturnTypes`.
 */

export const TYPECHECK_CONFIG = "tsconfig.typecheck.json";

/** The compiler program the project's own typecheck uses, so this sees the same types. */
export function createProjectProgram(root = process.cwd()) {
  const configPath = path.join(root, TYPECHECK_CONFIG);
  if (!fs.existsSync(configPath)) {
    throw new Error(`Missing ${TYPECHECK_CONFIG}; the stored-record check reads the same program as tsc.`);
  }
  const parsed = ts.getParsedCommandLineOfConfigFile(
    configPath,
    { noEmit: true },
    { ...ts.sys, onUnRecoverableConfigFileDiagnostic: () => {} },
  );
  if (!parsed) throw new Error(`Could not read ${TYPECHECK_CONFIG}.`);
  const program = ts.createProgram({ rootNames: parsed.fileNames, options: parsed.options });
  return { program, checker: program.getTypeChecker(), root, fileNames: parsed.fileNames };
}

export function relativePath(root, fileName) {
  return path.relative(root, fileName).split(path.sep).join("/");
}

function isProjectSource(fileName, root) {
  if (fileName.includes("node_modules")) return false;
  if (/\.d\.ts$/.test(fileName)) return false;
  return relativePath(root, fileName).startsWith("src/");
}

export function shippedSources({ program, root }) {
  return program.getSourceFiles().filter((source) => isProjectSource(source.fileName, root) && !source.isDeclarationFile);
}

/** The shipped `src/` sources as `{ path, text }`, for the access-name corpus. */
export function sourceCorpus({ program, root }) {
  return shippedSources({ program, root }).map((source) => ({
    path: relativePath(root, source.fileName),
    text: source.text,
  }));
}

function isTestFile(filePath) {
  return /\.(test|spec)\.[^.]+$/.test(filePath) || /(^|\/)(__tests__|e2e)\//.test(filePath);
}

/**
 * TypeScript's utility wrappers, which name a transformation rather than a record.
 *
 * `Pick<WallRequirements, …>` has fields and a symbol of its own, and that symbol is
 * called `Pick` — so a report keyed on it would say `Pick.sourceCustom` and leave a
 * person hunting for a type nobody declared. The fields are the picked type's, so
 * that is the name to print; `Record` is excluded because its arguments describe a
 * map rather than a record, and the map's values are walked in their own right.
 */
const UTILITY_TYPE_NAMES = new Set([
  "Pick",
  "Omit",
  "Partial",
  "Required",
  "Readonly",
  "NonNullable",
  "Exclude",
  "Extract",
  "ReturnType",
  "Parameters",
  "InstanceType",
  "Awaited",
]);

function typeLabel(type, fallback) {
  const name = type.aliasSymbol?.name ?? type.symbol?.name;
  if (name && UTILITY_TYPE_NAMES.has(name)) {
    const source = type.aliasTypeArguments?.[0];
    if (source) return typeLabel(source, fallback);
  }
  if (!name || name === "__type" || name === "__object" || name === "Array" || name === "ReadonlyArray") return fallback;
  return name;
}

/**
 * The object types worth walking: through a union, a collection's element, and a
 * map's value.
 *
 * The map half is what lets this see a store that is persisted as a table. The
 * template document drafts are written by parsing the store into a
 * `Record<string, StoredTemplateDocumentDraft>`, putting one draft in it and
 * persisting the map, so the type at the `setItem` call has an index signature
 * and no declared properties: a walk over it finds nothing, which is how a
 * write-only field on the draft stayed invisible until a person swept it by
 * hand. A map's own shape is not stored state — the table has no fields, its
 * values do — so the value type is what becomes a root.
 *
 * The same question is asked of a field, not only of the write: a record holding
 * `drafts: Record<string, Draft>` stores the draft's fields just as a table written
 * to storage does, so `collectReachableFields` expands each field's type through
 * this function too. Walking the field as an object with no declared properties —
 * which is what an index signature is — would police the map's own shape and miss
 * every field of the draft inside it.
 *
 * `seen` carries across the descent, because a map of maps is one write and a
 * record that contains itself must terminate.
 */
export function expandStoredTypes(type, checker, seen = new Set()) {
  if (seen.has(type.id)) return [];
  seen.add(type.id);
  if (type.isUnionOrIntersection()) {
    return type.types.flatMap((member) => expandStoredTypes(member, checker, seen));
  }
  if (checker.isArrayType?.(type) || checker.isTupleType?.(type)) {
    return (checker.getTypeArguments(type) ?? []).flatMap((member) => expandStoredTypes(member, checker, seen));
  }
  if (type.getProperties().length) return [type];
  // An index signature with nothing declared beside it: the table's values are
  // the record. A type with no index infos either (`unknown`, a primitive, a
  // function) stores nothing this gate can police and is dropped as before.
  const indexInfos = checker.getIndexInfosOfType?.(type) ?? [];
  return indexInfos.flatMap((info) => expandStoredTypes(info.type, checker, seen));
}

/**
 * Whether a field's declared type is a map the gate cannot see into: an index
 * signature whose value type declares nothing to walk (`Record<string, unknown>`),
 * or `unknown` itself.
 *
 * A primitive is equally empty of declarations, but it is not a map whose entries
 * a codec types, so it is not this question — following a string field's readers
 * would only find functions that hand strings back.
 */
function isLooseMapType(type, checker) {
  if (type.isUnionOrIntersection()) return type.types.some((member) => isLooseMapType(member, checker));
  if (type.flags & (ts.TypeFlags.Unknown | ts.TypeFlags.Any)) return true;
  const indexInfos = checker.getIndexInfosOfType?.(type) ?? [];
  if (!indexInfos.length) return false;
  return indexInfos.every((info) => expandStoredTypes(info.type, checker, new Set()).length === 0);
}

/** How a codec is named in a path: the function a person would open. */
function calleeName(expression) {
  if (ts.isIdentifier(expression)) return expression.text;
  if (ts.isPropertyAccessExpression(expression)) return expression.name.text;
  const text = expression.getText();
  return text.length > 32 ? `${text.slice(0, 32)}…` : text;
}

/**
 * The shapes the codecs that read a loose field decode it into.
 *
 * A `Record<string, unknown>` field is where the walk above stops: its entries
 * declare nothing, so nothing inside the map is policed and a write-only field of
 * the shape it is stored as stays invisible — the map is an opaque blob to this
 * gate. But the app does not read that blob as a blob: it hands it to a decoder
 * (`wallStartingPointFromSummary(summary)`, `readQuickStartSeedRecord(state)`) that
 * takes the loose map and returns a declared record. That decoder is the field's
 * real schema, so the type it returns is the shape to police.
 *
 * Found from the field rather than from a register: every read of the field that
 * is passed to a call names that call's return type, and a call whose argument is
 * the loose value and whose result is a record is the codec. Two rules keep this
 * from being "whatever the value flows into": only a direct argument counts (a
 * value nested one call deeper is that call's input, not this one's), and only a
 * result with declared fields is followed (a codec returning a string types
 * nothing).
 *
 * Reference is by property declaration, so `brief.roomModel` is seen. A destructured
 * read is followed too — `const { roomModel } = brief` binds the property to a local,
 * and the call that takes that local is this field's codec, so
 * `destructuredPropertyDeclarations` is what ties the two together. A loose map
 * handed over inside an object literal — `decodeRoomModel({ roomModel })` — is the
 * same read one wording down: the shorthand's own name resolves to the property it
 * creates rather than to the variable it reads, so the local behind it has to be
 * looked up in scope before the binding can be recognised. A read the walk still
 * cannot tie to a declaration — a computed key, a rest element, a spread of the
 * whole record — is not, and a codec reached only through one is not found: the
 * gate fails closed on what it can see rather than pretending the map was decoded.
 *
 * A map can also reach its codec through a function that hands it back: `const
 * roomModelOf = (brief) => brief.roomModel`, then
 * `decodeRoomModel(roomModelOf(brief))`. The codec's argument is that call, and the
 * field's own return is an argument of nothing, so the helper has to be recognised
 * before any read is walked — a function whose **every** returned value is this
 * field's read — and a call to it, standing as a whole argument of another call, is
 * the codec. That rule is what keeps a helper that returns something else on one
 * path from policing a shape decoded from a value that never came off the field,
 * and it is resolved through the callee's declaration, so a same-named local is not
 * mistaken for the helper.
 *
 * The helper is usually grouped on an object — `const helpers = { roomModelOf:
 * (brief) => brief.roomModel }`, `decodeRoomModel(helpers.roomModelOf(brief))`, or
 * the method shorthand `{ roomModelOf(brief) { … } }` — and that shape names the
 * property rather than the function, so a carrier registered only against the
 * function's own declaration was never found: the map stayed opaque through the way
 * helpers are actually written. The carrier is therefore registered against the
 * declaration the call's callee resolves to, property or method included, which is
 * also what keeps a same-named method on another object from being credited.
 *
 * Each answer travels with the name of the codec that produced it, because that
 * name is a hop in the path a field of the decoded record was reached by: a
 * failure that said only "map value" would leave the reader to find which of the
 * functions reading that map typed the entry.
 */
function collectCodecReturnTypes({ program, checker, root, property }) {
  const declarations = property.declarations ?? [];
  if (!declarations.length || !program) return [];

  const types = [];
  const seen = new Set();
  const sources = shippedSources({ program, root }).filter(
    (source) => !isTestFile(relativePath(root, source.fileName)),
  );

  const isThisField = (node) => {
    const symbol = checker.getSymbolAtLocation(node);
    return Boolean(symbol) && declarations.some((declaration) => symbol.declarations?.includes(declaration));
  };

  /**
   * Whether a symbol is a local a pattern bound off this field —
   * `const { roomModel } = brief` then `decodeRoomModel(roomModel)`.
   *
   * The argument of that call is the local, not `brief.roomModel`, so the codec is
   * reached only by following the binding back to the property the element names.
   * Without it a map decoded through a destructured name stayed opaque, which is the
   * quiet direction: the shape it decodes into was never policed.
   */
  const symbolBoundToThisField = (symbol) =>
    (symbol?.declarations ?? []).some(
      (declaration) => ts.isBindingElement(declaration)
        && destructuredPropertyDeclarations(declaration, checker)
          .some((property) => declarations.includes(property)),
    );

  const boundToThisField = (node) =>
    ts.isIdentifier(node) && Boolean(symbolBoundToThisField(checker.getSymbolAtLocation(node)));

  /**
   * The local a shorthand property reads — `decodeRoomModel({ roomModel })`.
   *
   * A shorthand's name resolves to the property it creates, not to the variable it
   * reads: `getSymbolAtLocation` on `roomModel` in `{ roomModel }` answers the
   * `ShorthandPropertyAssignment` itself, so the binding the pattern made is one
   * lookup away and the gate did not take it. The value is the same-named symbol in
   * scope at that point, which is what `getSymbolsInScope` answers — the nearest one,
   * so a shadowing local is the local the shorthand actually reads. Resolved through
   * the compiler rather than by matching names in the file: a same-named local that
   * was never taken off the field must stay uncredited.
   */
  const shorthandValueSymbol = (shorthand) =>
    (checker.getSymbolsInScope?.(shorthand, ts.SymbolFlags.Variable) ?? [])
      .find((symbol) => symbol.getName() === shorthand.name.text);

  /**
   * Whether one node, standing alone, reads this field.
   *
   * The same reads the gate already credits: a property access, a bare identifier
   * that resolves to the field, a local destructured off it, and a shorthand
   * property standing for that local. A read this walk cannot tie to the
   * declaration — a computed key, a rest element, a spread of the whole record —
   * is not one, which fails closed: the map stays opaque rather than being policed
   * as something the gate guessed.
   */
  const readsFieldValue = (node) => {
    if (!node || (!ts.isPropertyAccessExpression(node) && !ts.isIdentifier(node))) return false;
    // A shorthand's name is an identifier in a read position like any other, but the
    // symbol it resolves to is the property it creates, so it is recognised through
    // the local behind it instead.
    const shorthand = ts.isIdentifier(node)
      && Boolean(node.parent)
      && ts.isShorthandPropertyAssignment(node.parent)
      && node.parent.name === node;
    return isThisField(node)
      || boundToThisField(node)
      || (shorthand && Boolean(symbolBoundToThisField(shorthandValueSymbol(node.parent))));
  };

  /** A node without the parentheses a caller wrote around it. */
  const unwrapped = (node) => {
    let current = node;
    while (current && ts.isParenthesizedExpression(current)) current = current.expression;
    return current;
  };

  /**
   * The values a function hands back, as expressions.
   *
   * A `return` inside a nested function belongs to that function, so its subtree is
   * not walked: what a helper's own callers receive is what this function returns.
   * A concise arrow returns its body, which is the shape the same helper is usually
   * written in.
   */
  const returnedExpressions = (fn) => {
    if (ts.isArrowFunction(fn) && !ts.isBlock(fn.body)) return [fn.body];
    const body = fn.body;
    if (!body || !ts.isBlock(body)) return [];
    const expressions = [];
    const collect = (node) => {
      if (ts.isFunctionLike(node) && node !== fn) return;
      if (ts.isReturnStatement(node) && node.expression) expressions.push(node.expression);
      ts.forEachChild(node, collect);
    };
    ts.forEachChild(body, collect);
    return expressions;
  };

  /**
   * The node that names a helper, in whichever shape it was written.
   *
   * Its own name (`function roomModelOf`, a method inside an object or a class), the
   * variable it is assigned to (`const roomModelOf = …`), the property that holds it
   * (`{ roomModelOf: (brief) => … }`), or the class field it is declared as
   * (`class Factory { roomModelOf = (brief) => … }`). Every calling shape lands on
   * the same name: the shorthand `{ roomModelOf(brief) { … } }` and the instance's
   * `factory.roomModelOf(brief)` are both called `roomModelOf`. One function rather
   * than the name and the node as two lists: keeping them apart is what left the
   * class field in one of them and not the other — a helper reached through an
   * instance's field stayed opaque while the same helper as a method was followed.
   */
  const helperNameNode = (fn) => {
    if (fn.name && ts.isIdentifier(fn.name)) return fn.name;
    const holder = fn.parent;
    if (
      holder
      && (ts.isVariableDeclaration(holder) || ts.isPropertyAssignment(holder) || ts.isPropertyDeclaration(holder))
      && ts.isIdentifier(holder.name)
    ) {
      return holder.name;
    }
    return null;
  };

  /**
   * Helpers that hand this field's loose map back as their own result.
   *
   * A field is often not passed to its codec directly but through one: `const
   * roomModelOf = (brief) => brief.roomModel` and then
   * `decodeRoomModel(roomModelOf(brief))`. The codec's argument is that call, not
   * the field, so the map stayed opaque through a helper that exists only to hand
   * it over. A helper is a carrier when **every** value it returns is this field's
   * read: one path that returns something else means the codec may be decoding
   * something that never came off the field, and crediting that would invent the
   * shape behind it — the direction this gate fails closed on.
   *
   * Keyed by the declaration a call's callee resolves to, not by the name in the
   * file: a same-named local that was never taken off the field must not stand in
   * for the helper, which is the same rule the shorthand lookup keeps. That includes
   * the declaration a call **through an object** lands on: `helpers.roomModelOf(brief)`
   * resolves to the property or method that holds the helper, not to the arrow behind
   * it, so the carrier is registered against the name the call names. Keying only the
   * function's own declaration left a method-shaped helper unfindable — the map stayed
   * opaque through the shape helpers are actually grouped in — and keying the property
   * by its text would credit a same-named method on another object, so the key is
   * still the declaration the callee's name resolves to.
   */
  const carrierNames = new Map();
  const registerCarrier = (fn) => {
    const named = helperNameNode(fn);
    if (!named) return;
    const returns = returnedExpressions(fn).map(unwrapped);
    if (!returns.length || !returns.every(readsFieldValue)) return;
    // Keyed by the declaration the name resolves to: for a class field that is the
    // `PropertyDeclaration`, which is also what a call through an instance resolves
    // to, so `factory.roomModelOf(brief)` finds it the way `helpers.roomModelOf(brief)`
    // finds the object's property.
    for (const declaration of checker.getSymbolAtLocation(named)?.declarations ?? []) {
      carrierNames.set(declarationKey(declaration), named.text);
    }
  };
  const registerCarriers = (node) => {
    if (
      ts.isFunctionDeclaration(node)
      || ts.isFunctionExpression(node)
      || ts.isArrowFunction(node)
      || ts.isMethodDeclaration(node)
    ) {
      registerCarrier(node);
    }
    ts.forEachChild(node, registerCarriers);
  };

  /** The helper a call resolves to, when that helper hands this field back. */
  const carrierNameOf = (call) => {
    const symbol = checker.getSymbolAtLocation(unwrapped(call.expression));
    const resolved = symbol && symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
    for (const declaration of resolved?.declarations ?? []) {
      const name = carrierNames.get(declarationKey(declaration));
      if (name) return name;
    }
    return null;
  };

  /**
   * Record what a call's result holds, as a shape decoded from this field.
   *
   * `via` names the helper the map travelled through, when it did not arrive as the
   * call's own argument: it is a hop in the path a failure prints, because `returned
   * by roomModelOf` says which function to open and `decoded by decodeRoomModel`
   * alone would not.
   */
  const record = (call, via) => {
    const signature = checker.getResolvedSignature(call);
    const returnType = signature ? checker.getReturnTypeOfSignature(signature) : undefined;
    for (const member of returnType ? expandStoredTypes(returnType, checker, new Set()) : []) {
      if (seen.has(member.id)) continue;
      seen.add(member.id);
      types.push({ type: member, codec: calleeName(call.expression), via: via ?? null });
    }
  };

  for (const source of sources) registerCarriers(source);

  const visit = (node) => {
    if (readsFieldValue(node)) {
      // The nearest enclosing call this value is a whole argument of. Walking up
      // stops at a statement or a function boundary, because a value read inside
      // one expression is not an argument of a call around the statement.
      let child = node;
      let parent = node.parent;
      while (parent && !ts.isStatement(parent) && !ts.isFunctionLike(parent)) {
        if (ts.isCallExpression(parent) && parent.arguments.some((argument) => argument === child)) {
          record(parent, null);
          break;
        }
        child = parent;
        parent = parent.parent;
      }
    }
    // The map arriving through a helper's result rather than as this call's own
    // argument: `decodeRoomModel(roomModelOf(brief))`. Only a call the carrier pass
    // named counts, and only as a whole argument — a value nested one call deeper is
    // that call's input, not this one's, which is the rule the direct case keeps too.
    if (ts.isCallExpression(node)) {
      for (const argument of node.arguments) {
        const inner = unwrapped(argument);
        const name = ts.isCallExpression(inner) ? carrierNameOf(inner) : null;
        if (!name) continue;
        record(node, `returned by ${name}`);
        break;
      }
    }
    ts.forEachChild(node, visit);
  };

  for (const source of sources) visit(source);
  return types;
}

function isBehaviour(property, checker) {
  const declaration = property.valueDeclaration ?? property.declarations?.[0];
  if (!declaration) return true;
  if (
    ts.isMethodDeclaration(declaration) ||
    ts.isMethodSignature(declaration) ||
    ts.isIndexSignatureDeclaration(declaration) ||
    ts.isCallSignatureDeclaration(declaration) ||
    ts.isConstructSignatureDeclaration(declaration) ||
    ts.isGetAccessor(declaration) ||
    ts.isSetAccessor(declaration)
  ) {
    return true;
  }
  // A function-typed property is behaviour, not stored state.
  return checker.getTypeOfSymbolAtLocation(property, declaration).getCallSignatures().length > 0;
}

/**
 * The types the app persists: each `setItem(key, JSON.stringify(value))` names
 * one, as `{ file, line, key, type, typeObj }`. The label is for the report only;
 * an inline literal has no type name, so its storage key labels it. The key and
 * the write's own file and line travel too, because a record is reached through a
 * store: a table written to `wingman-site-survey-edits` and a map field inside
 * `StoredProject` look the same once their fields are collected.
 */
export function discoverStoredRecordTypes({ program, checker, root }) {
  const roots = [];

  const visit = (node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      (node.expression.name.text === "setItem" || node.expression.name.text === "setItemSync") &&
      node.arguments.length >= 2
    ) {
      const stored = stringifiedArgument(node.arguments[1]);
      if (stored) {
        const source = node.getSourceFile();
        const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
        // An inline literal has no type name, so the storage key names the
        // record: that is what a reader of the report recognises.
        const key = storageKeyName(node.arguments[0], checker);
        const fallback = key ?? expressionLabel(stored);
        // One root per write, not per type: a record written to two keys is reachable
        // through both, and a report that kept only the first would name the wrong
        // store for every field of the second. Fields are collected once per
        // declaration, so this adds no duplicate findings.
        for (const type of expandStoredTypes(checker.getTypeAtLocation(stored), checker)) {
          roots.push({
            file: relativePath(root, source.fileName),
            line: line + 1,
            key,
            type: typeLabel(type, fallback),
            typeObj: type,
          });
        }
      }
    }
    ts.forEachChild(node, visit);
  };

  // A test persists a fixture to prove a codec round-trips, not because the app
  // stores that shape: its inline literals would each become a "record".
  for (const source of shippedSources({ program, root })) {
    if (isTestFile(relativePath(root, source.fileName))) continue;
    visit(source);
  }
  return roots;
}

/** The literal key of a storage write, or the constant that holds it. */
function storageKeyName(node, checker) {
  if (!node) return null;
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (!ts.isIdentifier(node)) return null;
  const symbol = checker.getSymbolAtLocation(node);
  const resolved = symbol && symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
  const declaration = resolved?.valueDeclaration;
  const initializer = declaration && ts.isVariableDeclaration(declaration) ? declaration.initializer : undefined;
  if (initializer && (ts.isStringLiteral(initializer) || ts.isNoSubstitutionTemplateLiteral(initializer))) {
    return initializer.text;
  }
  return node.text;
}

/** The value handed to `JSON.stringify`, or null when the write stores something else. */
function stringifiedArgument(argument) {
  if (
    ts.isCallExpression(argument) &&
    ts.isPropertyAccessExpression(argument.expression) &&
    argument.expression.name.text === "stringify" &&
    argument.arguments.length >= 1
  ) {
    return argument.arguments[0];
  }
  return null;
}

function expressionLabel(node) {
  const text = node.getText();
  return text.length > 40 ? `${text.slice(0, 40)}…` : text;
}

/**
 * How a store is named in the report: its storage key, and the write that put the
 * record there.
 *
 * The key alone is not enough — a key can be written from more than one place, and
 * an inline literal is written to a key computed elsewhere — so the write's file
 * and line travel with it. A failure then says which store a record came through,
 * which is the difference between "a field of a table written to storage" and "a
 * field of a map held inside a larger record".
 */
export function storeLabel(root) {
  return root.key ? `${root.key} (${root.file}:${root.line})` : `${root.file}:${root.line}`;
}

/**
 * Named stores first, then the writes whose key this gate could not read.
 *
 * A field is often reachable through many stores — a topology shared by the
 * project store, two handoff keys and a template draft — and the report prints the
 * first few. The order therefore decides what a person sees, and a storage key is
 * what identifies a store (`wingman-site-survey-edits`); `file:line` is the fallback
 * for a computed key and is only as recognisable as the write itself.
 */
function storeSortKey(store) {
  return `${store.includes(" (") ? "0" : "1"}:${store}`;
}

/**
 * Every field the stored records reach, as
 * `{ file, type, field, line, path, symbols, stores }`. The file and line are the
 * field's own declaration — the place a dead one would be removed from — and the
 * type label is the nearest named type, which for an inline literal is the record
 * holding it. `path` is how it was reached, hop by hop (`StoredProject.proposal`,
 * `map value`, `decoded by …`, `array element`); `stores` is every write that
 * reaches it. A report needs both: the stores say where the record is persisted,
 * and the path says how far inside it the field sits and through what.
 */
export function collectReachableFields({ program, checker, root, roots }) {
  if (!program) {
    throw new Error("collectReachableFields needs the program: a loose map field is followed through the codec that reads it.");
  }
  const fields = new Map();
  const fieldStores = new Map();
  // A loose field is often reached through many stores and is walked once per
  // store, so its codecs are looked up once rather than once per store.
  const codecsByField = new Map();
  const codecsFor = (property, declaration) => {
    const key = declarationKey(declaration);
    if (!codecsByField.has(key)) {
      codecsByField.set(key, collectCodecReturnTypes({ program, checker, root, property }));
    }
    return codecsByField.get(key);
  };

  const walkFrom = (record) => {
    const store = storeLabel(record);
    // Cycle protection is per store, not global: a record reached through two
    // stores is walked twice so both are named on its fields, while a record that
    // contains itself still terminates.
    const visited = new Set();

    /**
     * Walk a stored type, recording the hops that got here.
     *
     * `path` is the chain a field was reached by, as words a person can follow:
     * `StoredProject.proposal`, `map value`, `returned by roomModelOf`,
     * `decoded by buildProposalDraft`, `array element`. It exists because the set of stores says *where* a record is
     * persisted and nothing about *how* the field is reached inside it — a field
     * three maps and a codec deep reads the same as one declared on the project
     * itself, and the reader is left to search for the hole.
     *
     * The descent below mirrors `expandStoredTypes` — through a union, a
     * collection's element, a map's value — rather than calling it, because the
     * flattened answer is what loses the hop. `chain` is the structural cycle guard
     * that function keeps: a `Record<string, Json>` that contains itself must not
     * recurse forever, and `seen` cannot serve because records are guarded by
     * `visited` above.
     */
    const walk = (type, fallbackLabel, path, chain) => {
      if (chain.has(type.id)) return;
      const guarded = new Set(chain).add(type.id);

      if (type.isUnionOrIntersection()) {
        for (const member of type.types) walk(member, fallbackLabel, path, guarded);
        return;
      }
      if (checker.isArrayType?.(type) || checker.isTupleType?.(type)) {
        for (const argument of checker.getTypeArguments(type) ?? []) {
          walk(argument, fallbackLabel, [...path, "array element"], guarded);
        }
        return;
      }

      // A map's values are records: a `Record<string, Draft>` field stores the
      // draft, not a table with no fields.
      const indexInfos = checker.getIndexInfosOfType?.(type) ?? [];
      if (!type.getProperties().length) {
        for (const info of indexInfos) walk(info.type, fallbackLabel, [...path, "map value"], guarded);
        return;
      }

      if (visited.has(type.id)) return;
      visited.add(type.id);
      const label = typeLabel(type, fallbackLabel);
      for (const property of type.getProperties()) {
        const declaration = property.valueDeclaration ?? property.declarations?.[0];
        if (!declaration) continue;
        const owner = declaration.getSourceFile();
        if (!isProjectSource(owner.fileName, root)) continue;
        if (isBehaviour(property, checker)) continue;

        // The field's own hop, named by the record that declares it: this is the
        // `record → field` half of the path, and the map and codec hops follow it.
        const fieldPath = [...path, `${label}.${property.name}`];

        // A declaration is one field however many paths reach it: a type met as
        // itself and again as an inline shape in another record used to be listed
        // twice, once per label, which read as two fields and doubled the count.
        // The label is upgraded when a later path knows the type by name, so the
        // report names `DocumentPersonalisation` rather than the record that
        // happened to be walked first.
        const key = declarationKey(declaration);
        if (!fieldStores.has(key)) fieldStores.set(key, new Set());
        fieldStores.get(key).add(store);
        const named = label !== fallbackLabel;
        if (!fields.has(key)) {
          const { line } = owner.getLineAndCharacterOfPosition(declaration.getStart(owner));
          fields.set(key, {
            file: relativePath(root, owner.fileName),
            type: label,
            named,
            field: property.name,
            line: line + 1,
            path: fieldPath,
            symbols: property.declarations ?? [declaration],
          });
        } else {
          const seen = fields.get(key);
          if (named && !seen.named) {
            seen.type = label;
            seen.named = true;
          }
          // The shortest route wins, whatever root it was found from: a field of a
          // root record is one hop on that store's own write (`Draft.savedAt`), and
          // the same field sits three hops inside another store's record, so a walk
          // that met the deep root first would print a chain that is not the direct
          // route to the field. Two paths of equal length are both as direct, so the
          // first one stays. The label upgrade above is a separate question — a name
          // is worth keeping even from the route that was dropped — and is not tied
          // to which path was kept.
          if (fieldPath.length < (seen.path?.length ?? Infinity)) seen.path = fieldPath;
        }

        const propertyType = checker.getTypeOfSymbolAtLocation(property, declaration);
        walk(propertyType, label, fieldPath, new Set());
        // A map of `unknown` walks to nothing, so the shape it is stored as is
        // whatever the codec reading it decodes into. Without this the entries of
        // a loose map are outside the gate, and a field of the decoded record that
        // no surface reads is never reported.
        if (isLooseMapType(propertyType, checker)) {
          for (const codec of codecsFor(property, declaration)) {
            const hops = codec.via ? [codec.via, `decoded by ${codec.codec}`] : [`decoded by ${codec.codec}`];
            walk(codec.type, label, [...fieldPath, ...hops], new Set());
          }
        }
      }
    };

    walk(record.typeObj, record.type, [], new Set());
  };

  for (const record of roots) walkFrom(record);
  return [...fields.entries()].map(([key, { named: _named, ...field }]) => ({
    ...field,
    stores: [...(fieldStores.get(key) ?? [])].sort((left, right) => storeSortKey(left).localeCompare(storeSortKey(right))),
  }));
}

/**
 * A declaration's identity: where it starts, in the file it starts in.
 *
 * The offset alone is not an identity — it is measured from the start of its
 * own file, so a set of bare numbers let a reader in one file excuse a field
 * declared at the same offset in another. That is how a profile's language
 * preferences, which nothing reads, stayed out of this report: an unrelated
 * declaration in another file lined up with them, and removing a sibling field
 * shifted them into the clear. The file travels with the offset so a read means
 * the property it resolved to and nothing else.
 */
export function declarationKey(declaration) {
  const source = declaration.getSourceFile();
  return `${source.fileName}:${declaration.getStart(source)}`;
}

/** The name an object binding element takes off the object, or null for a computed key. */
function bindingPropertyName(binding) {
  const node = binding.propertyName ?? binding.name;
  if (!node) return null;
  if (ts.isIdentifier(node) || ts.isStringLiteral(node) || ts.isNumericLiteral(node)) return node.text;
  return null;
}

/**
 * The type of the object an object binding pattern takes apart.
 *
 * The pattern itself is not an expression, so the type comes from whatever holds
 * it: a `const`'s initializer (`const { x } = row`), a parameter's own type
 * (`function f({ x }: Row)`), the property of another pattern for a nested one, or
 * a declaration in a `for…of` head, where the declaration has no initializer and its
 * own element type is the answer.
 */
function destructuredSourceType(pattern, checker) {
  const container = pattern.parent;
  if (!container) return undefined;
  if (ts.isVariableDeclaration(container) && container.initializer) {
    return checker.getTypeAtLocation(container.initializer);
  }
  return checker.getTypeAtLocation(container);
}

/**
 * The property declarations a destructuring binding names, as the compiler
 * resolves the pattern rather than the local it binds.
 *
 * `const { roomModel } = brief` is a read of `brief.roomModel`, but
 * `getSymbolAtLocation` on the bound name returns the **local variable**: its
 * declaration is the `BindingElement`, which matches no stored field, so a field
 * read only this way used to be reported unread. The property is recovered the way
 * the pattern is resolved — the type of the object being taken apart, asked for the
 * property the element names — which is also the hop a codec needs: `decode(roomModel)`
 * passes the local, and only the binding ties it back to the field.
 *
 * A renamed binding (`{ roomModel: raw }`) names the property in `propertyName` and
 * binds in `name`, so both are read. A computed key names nothing statically, and a
 * rest element (`{ ...rest }`) takes everything and so attributes nothing to one
 * field: both contribute no declarations, which leaves the gate failing closed on
 * what it cannot tie to a property rather than crediting the whole record.
 */
export function destructuredPropertyDeclarations(binding, checker) {
  if (!binding || !ts.isBindingElement(binding)) return [];
  const pattern = binding.parent;
  if (!pattern || !ts.isObjectBindingPattern(pattern)) return [];
  const name = bindingPropertyName(binding);
  if (!name) return [];
  const source = destructuredSourceType(pattern, checker);
  if (!source) return [];
  return checker.getPropertyOfType(source, name)?.declarations ?? [];
}

/** The property symbols the program resolves as a read, keyed by `declarationKey`. */
export function collectReadSymbols({ program, checker, root }) {
  const reads = new Set();

  const record = (node) => {
    const symbol = checker.getSymbolAtLocation(node);
    for (const declaration of symbol?.declarations ?? []) {
      reads.add(declarationKey(declaration));
    }
  };

  const visit = (node) => {
    // A test asserts behaviour; it is not a surface the app renders.
    if (!isTestFile(relativePath(root, node.getSourceFile().fileName))) {
      if (ts.isPropertyAccessExpression(node)) {
        // `row.errorMessage = message` names the wire, it does not consume it.
        record(node.name);
      } else if (ts.isElementAccessExpression(node)) {
        const argument = node.argumentExpression;
        if (argument && (ts.isStringLiteral(argument) || ts.isNoSubstitutionTemplateLiteral(argument))) {
          record(argument);
        }
      } else if (ts.isBindingElement(node)) {
        // `const { roomModel } = brief` reads a property, so it is credited to the
        // property's declaration rather than to the local variable the pattern
        // binds — a local's own declaration is the binding element, and no field is
        // declared there.
        for (const declaration of destructuredPropertyDeclarations(node, checker)) {
          reads.add(declarationKey(declaration));
        }
      }
    }
    ts.forEachChild(node, visit);
  };

  for (const source of shippedSources({ program, root })) visit(source);
  return reads;
}

/**
 * The keys a form edits through a computed access.
 *
 * `value[key]` over `keyof T` is a reader — the field is on screen and the rep
 * changes it — but neither of this gate's two halves can say so: the compiler
 * cannot resolve a computed key to a property symbol, and the name never appears
 * as `.field` or `["field"]` because the only place it is written is the call
 * site that passes it (`field("author", "Author")`). A sharpened gate that looks
 * at more records would otherwise report every field of a keyed form as dead —
 * reading the personalisation drawer's four brand and detail boxes as persisted
 * values nothing shows.
 *
 * So the name is taken from where it is written. An element access keyed by a
 * parameter makes that parameter's slot a source of names, and a call that binds
 * a string literal into that slot names the field it edits.
 *
 * Only the keys actually passed count. A field added to the record with no box of
 * its own binds no argument, so it still fails — which is the difference between
 * "a form edits this field" and "a form of this type could edit anything".
 */
export function collectFormKeyNames({ program, checker, root }) {
  const keyedSlots = new Map();

  const slotOf = (identifier) => {
    const symbol = checker.getSymbolAtLocation(identifier);
    const declaration = symbol?.declarations?.find((candidate) => ts.isParameter(candidate));
    if (!declaration || !declaration.name || !ts.isIdentifier(declaration.name)) return null;
    const parameters = declaration.parent?.parameters;
    if (!parameters) return null;
    const index = parameters.indexOf(declaration);
    return index < 0 ? null : { symbol, index };
  };

  const visit = (node) => {
    if (ts.isElementAccessExpression(node) && node.argumentExpression && ts.isIdentifier(node.argumentExpression)) {
      const slot = slotOf(node.argumentExpression);
      if (slot) {
        if (!keyedSlots.has(slot.symbol)) keyedSlots.set(slot.symbol, new Set());
        keyedSlots.get(slot.symbol).add(slot.index);
      }
    }
    ts.forEachChild(node, visit);
  };

  const sources = shippedSources({ program, root }).filter(
    (source) => !isTestFile(relativePath(root, source.fileName)),
  );
  for (const source of sources) visit(source);
  if (!keyedSlots.size) return new Set();

  const names = new Set();

  const collect = (node) => {
    if (ts.isCallExpression(node)) {
      const symbol = checker.getSymbolAtLocation(node.expression);
      for (const declaration of symbol?.declarations ?? []) {
        const parameters = callableParameters(declaration);
        if (!parameters) continue;
        for (const parameter of parameters) {
          const parameterSymbol = parameter.name && ts.isIdentifier(parameter.name)
            ? checker.getSymbolAtLocation(parameter.name)
            : null;
          const slots = parameterSymbol && keyedSlots.get(parameterSymbol);
          if (!slots) continue;
          const index = parameters.indexOf(parameter);
          if (!slots.has(index)) continue;
          const argument = node.arguments[index];
          if (argument && (ts.isStringLiteral(argument) || ts.isNoSubstitutionTemplateLiteral(argument))) {
            names.add(argument.text);
          }
        }
      }
    }
    ts.forEachChild(node, collect);
  };
  for (const source of sources) collect(source);
  return names;
}

/** A call's parameters, whether it is declared as a function or as a const holding one. */
function callableParameters(declaration) {
  if (ts.isFunctionDeclaration(declaration) || ts.isMethodDeclaration(declaration)) return declaration.parameters;
  if (ts.isVariableDeclaration(declaration) || ts.isPropertyAssignment(declaration)) {
    const value = declaration.initializer;
    if (value && (ts.isArrowFunction(value) || ts.isFunctionExpression(value))) return value.parameters;
  }
  return null;
}

/** The fields nothing reads, as `{ file, type, field, line, stores }`. */
export function unreadFields({ fields, reads, accessNames = new Set() }) {
  const unread = [];
  for (const field of fields) {
    const symbolRead = field.symbols.some((declaration) => reads.has(declarationKey(declaration)));
    if (!symbolRead && !accessNames.has(field.field)) {
      unread.push({
        file: field.file,
        type: field.type,
        field: field.field,
        line: field.line,
        path: field.path ?? [],
        stores: field.stores ?? [],
      });
    }
  }
  return unread;
}

export function fieldKey(entry) {
  return `${entry.file}|${entry.type}|${entry.field}`;
}

/**
 * The names used in an access position across `sources`, skipping `exclude`.
 * An object literal key (`field:`) is a write and is deliberately not a match.
 */
export function collectAccessNames(sources, { exclude }) {
  const names = new Set();
  for (const source of sources) {
    if (exclude.has(source.path)) continue;
    for (const match of source.text.matchAll(/\.([A-Za-z_$][\w$]*)/g)) names.add(match[1]);
    for (const match of source.text.matchAll(/\[\s*["'`]([A-Za-z_$][\w$]*)["'`]\s*\]/g)) names.add(match[1]);
  }
  return names;
}

/**
 * Findings against the baseline: what is new, and which allowances are no
 * longer needed. The second half is what makes the file ratchet down — an
 * accepted field that gains a reader has to be dropped.
 */
export function compareStoredRecordFields({ unread, baseline = [] }) {
  const accepted = new Set(baseline.map(fieldKey));
  const added = unread.filter((entry) => !accepted.has(fieldKey(entry)));
  const current = new Set(unread.map(fieldKey));
  const stale = baseline.filter((entry) => !current.has(fieldKey(entry)));
  return { added, stale };
}
