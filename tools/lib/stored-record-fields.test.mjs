import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import ts from "typescript";
import { afterEach, describe, expect, it } from "vitest";
import { reachedBy } from "../check-stored-records.mjs";
import {
  collectAccessNames,
  collectFormKeyNames,
  collectReachableFields,
  collectReadSymbols,
  compareStoredRecordFields,
  declarationKey,
  discoverStoredRecordTypes,
  fieldKey,
  sourceCorpus,
  unreadFields,
} from "./stored-record-fields.mjs";

const roots = [];

afterEach(() => {
  while (roots.length) rmSync(roots.pop(), { recursive: true, force: true });
});

/**
 * A throwaway project and the compiler program over it, so the collectors that
 * read the app's own types can be asked about a store this small.
 */
function programFor(files) {
  const root = mkdtempSync(path.join(tmpdir(), "wm-stored-records-"));
  roots.push(root);
  for (const [relative, text] of Object.entries(files)) {
    const absolute = path.join(root, relative);
    mkdirSync(path.dirname(absolute), { recursive: true });
    writeFileSync(absolute, text);
  }
  const program = ts.createProgram({
    rootNames: Object.keys(files).map((relative) => path.join(root, relative)),
    options: {
      strict: true,
      noEmit: true,
      skipLibCheck: true,
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
    },
  });
  const checker = program.getTypeChecker();
  return { root, program, checker };
}

/** What the gate collects for a program, before it prints anything. */
function auditIn(context) {
  const roots = discoverStoredRecordTypes(context);
  const fields = collectReachableFields({ ...context, roots });
  const accessNames = new Set([
    ...collectAccessNames(sourceCorpus(context), { exclude: new Set() }),
    ...collectFormKeyNames(context),
  ]);
  return {
    roots,
    fields,
    unread: unreadFields({ fields, reads: collectReadSymbols(context), accessNames }),
  };
}

/** The fields the gate would report for a program, through both read halves. */
function unreadIn(context) {
  const { roots, unread } = auditIn(context);
  return {
    roots: roots.map((record) => record.type),
    unread: unread.map((entry) => entry.field),
  };
}

/**
 * A stand-in for a property's declaration node: `unreadFields` only asks where
 * it starts, and which file it starts in.
 */
const declarationAt = (position, file = "src/record.ts") => ({
  getStart: () => position,
  getSourceFile: () => ({ fileName: file }),
});
const field = (name, { symbolAt, line = 1, type = "Record" } = {}) => ({
  file: "src/record.ts",
  type,
  field: name,
  line,
  symbols: symbolAt === undefined ? [declarationAt(0)] : [declarationAt(symbolAt)],
});

describe("stored-record fields", () => {
  describe("access names", () => {
    const corpus = [
      {
        path: "src/a.ts",
        text: 'read = project.proposal;\nkeyed = row["priority"];\nwritten = { title: "x" };\nbare = title;\n',
      },
    ];

    it("counts a property access and a literal keyed access", () => {
      const names = collectAccessNames(corpus, { exclude: new Set() });
      expect(names.has("proposal")).toBe(true);
      expect(names.has("priority")).toBe(true);
    });

    it("does not count an object literal key or a bare mention", () => {
      const names = collectAccessNames(corpus, { exclude: new Set() });
      expect(names.has("title")).toBe(false);
    });

    it("ignores excluded files", () => {
      const names = collectAccessNames(corpus, { exclude: new Set(["src/a.ts"]) });
      expect(names.size).toBe(0);
    });
  });

  describe("unread fields", () => {
    it("reports a field the compiler never resolves and no code names", () => {
      const unread = unreadFields({ fields: [field("visibleSections")], reads: new Set(), accessNames: new Set() });
      expect(unread.map((entry) => entry.field)).toEqual(["visibleSections"]);
    });

    it("accepts a field resolved through its own property symbol", () => {
      const unread = unreadFields({
        fields: [field("title", { symbolAt: 42 })],
        reads: new Set([declarationKey(declarationAt(42))]),
        accessNames: new Set(),
      });
      expect(unread).toEqual([]);
    });

    it("does not accept a reader that only shares the offset, in another file", () => {
      // Offsets are measured from the start of their own file, so a read at 42
      // in one file says nothing about a field declared at 42 in another.
      const unread = unreadFields({
        fields: [field("captureLanguage", { symbolAt: 42 })],
        reads: new Set([declarationKey(declarationAt(42, "src/other.ts"))]),
        accessNames: new Set(),
      });
      expect(unread.map((entry) => entry.field)).toEqual(["captureLanguage"]);
    });

    it("accepts a field read through the untyped decode boundary", () => {
      // The codecs read `record.field` off a `Record<string, unknown>`, which
      // resolves to an index signature rather than to the record's symbol.
      const unread = unreadFields({ fields: [field("purpose")], reads: new Set(), accessNames: new Set(["purpose"]) });
      expect(unread).toEqual([]);
    });
  });

  describe("a store kept as a table", () => {
    // The write parses the map, puts one draft in it and persists the table, so
    // the argument at the setItem call has an index signature and no fields.
    const store = {
      "src/store.ts": [
        "type Draft = { personalisation: string; savedAt: string };",
        'const KEY = "wingman-drafts-v1";',
        "export function saveDraft(id: string, draft: Draft) {",
        '  const existing = JSON.parse(localStorage.getItem(KEY) || "{}") as Record<string, Draft>;',
        "  existing[id] = draft;",
        "  localStorage.setItem(KEY, JSON.stringify(existing));",
        "}",
        "export function readDraft(id: string) {",
        '  const stored = (JSON.parse(localStorage.getItem(KEY) || "{}") as Record<string, Draft>)[id];',
        '  return stored ? stored.personalisation : "";',
        "}",
      ].join("\n"),
    };

    it("makes the map's value type a stored record", () => {
      expect(unreadIn(programFor(store)).roots).toContain("Draft");
    });

    it("reports a field inside the draft that nothing reads", () => {
      expect(unreadIn(programFor(store)).unread).toEqual(["savedAt"]);
    });
  });

  describe("a record holding a map field", () => {
    // The write persists the record, not the draft: the draft is the value of a
    // `Record<string, Draft>` field. Walking that field as an object with no
    // declared properties — which is what an index signature is — polices the
    // map's own shape and misses every field of the record inside it.
    const store = {
      "src/store.ts": [
        "type Draft = { personalisation: string; savedAt: string };",
        "type Store = { title: string; drafts: Record<string, Draft> };",
        'const KEY = "wingman-drafts-v1";',
        "export function save(store: Store) { localStorage.setItem(KEY, JSON.stringify(store)); }",
        "export function read(store: Store, id: string) {",
        "  return `${store.title} ${store.drafts[id].personalisation}`;",
        "}",
      ].join("\n"),
    };

    it("walks the map's value type as a stored record", () => {
      // `savedAt` is declared on the draft, reached only through the map field.
      expect(unreadIn(programFor(store)).unread).toEqual(["savedAt"]);
    });

    it("names the hops the field was reached by, not only the store it lives in", () => {
      // The record → field → map value chain a failure prints: without it a field
      // inside a map reads exactly like one declared on the record itself.
      const savedAt = auditIn(programFor(store)).fields.find((entry) => entry.field === "savedAt");
      expect(savedAt.path).toEqual(["Store.drafts", "map value", "Draft.savedAt"]);
    });
  });

  describe("a field reached through several stores", () => {
    // The same declaration is one field, but the chain a failure prints is the
    // route to it, and a record can be reached shallowly (its own write) and
    // deeply (held inside another store's record). Which root the walk meets first
    // is the order the writes appear in the file, so the deep write is written
    // first here: the direct chain has to win over walk order rather than by luck.
    const SAVE_WRAPPER =
      "export function saveWrapper(wrapper: Wrapper) { localStorage.setItem(WRAPPER_KEY, JSON.stringify(wrapper)); }";
    const SAVE_DRAFT =
      "export function saveDraft(draft: Draft) { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); }";
    const store = (...writes) => ({
      "src/store.ts": [
        "type Draft = { title: string; savedAt: string };",
        "type Wrapper = { layer: { draft: Draft } };",
        'const WRAPPER_KEY = "wingman-wrapper-v1";',
        'const DRAFT_KEY = "wingman-draft-v1";',
        ...writes,
        "export function readDraft(draft: Draft) { return draft.title; }",
      ].join("\n"),
    });
    const savedAtOf = (files) => auditIn(programFor(files)).fields.find((entry) => entry.field === "savedAt");

    it("prints the direct route even when the deep root was walked first", () => {
      expect(savedAtOf(store(SAVE_WRAPPER, SAVE_DRAFT)).path).toEqual(["Draft.savedAt"]);
    });

    it("is not lengthened by a route that also reaches it, in either walk order", () => {
      expect(savedAtOf(store(SAVE_DRAFT, SAVE_WRAPPER)).path).toEqual(["Draft.savedAt"]);
    });

    it("keeps the name the dropped route brought, because the field is still that record's", () => {
      // The deep route is the one that names `Draft`; the short one is the record's
      // own write, where the type is the fallback it was walked as. The label and
      // the path are separate answers, so shortening the chain must not un-name it.
      expect(savedAtOf(store(SAVE_WRAPPER, SAVE_DRAFT)).type).toBe("Draft");
    });
  });

  describe("a loose map handed to its codec inside an object literal", () => {
    // `decodeRoomModel({ roomModel })` reads the local the pattern bound, and the
    // shorthand's own name resolves to the property the literal creates rather than
    // to that variable — one lookup short of the binding, which is why the map stayed
    // opaque through the shape apps actually write.
    const store = {
      "src/store.ts": [
        "type Room = { width: number; depth: number };",
        "type Brief = { savedAt: string; roomModel: Record<string, unknown> };",
        'const KEY = "wingman-brief-v1";',
        "export function saveBrief(brief: Brief) { localStorage.setItem(KEY, JSON.stringify(brief)); }",
        "export function decodeRoomModel(raw: Record<string, unknown>): Room {",
        "  return { width: Number(raw.widthCm), depth: Number(raw.depthCm) };",
        "}",
        "export function readBrief(brief: Brief) {",
        "  const { roomModel } = brief;",
        "  const room = decodeRoomModel({ roomModel });",
        "  return `${brief.savedAt} ${room.width}`;",
        "}",
      ].join("\n"),
    };

    it("polices the shape the codec decodes the map into", () => {
      expect(unreadIn(programFor(store)).unread).toEqual(["depth"]);
    });

    it("names the codec in the path, because it is what typed the entry", () => {
      const depth = auditIn(programFor(store)).fields.find((entry) => entry.field === "depth");
      expect(depth.path).toEqual(["Brief.roomModel", "decoded by decodeRoomModel", "Room.depth"]);
    });

    it("leaves the map opaque when the shorthand reads a local from somewhere else", () => {
      // The shorthand's value is resolved in scope rather than by name in the file: a
      // same-named local that was never taken off the field is not this field's read,
      // so the codec is not found and nothing behind the map is invented.
      const elsewhere = {
        "src/store.ts": [
          "type Room = { width: number; depth: number };",
          "type Brief = { savedAt: string; roomModel: Record<string, unknown> };",
          'const KEY = "wingman-brief-v1";',
          "export function saveBrief(brief: Brief) { localStorage.setItem(KEY, JSON.stringify(brief)); }",
          "export function decodeRoomModel(raw: Record<string, unknown>): Room {",
          "  return { width: Number(raw.widthCm), depth: Number(raw.depthCm) };",
          "}",
          "export function readBrief(brief: Brief) {",
          "  const roomModel: Record<string, unknown> = {};",
          "  const room = decodeRoomModel({ roomModel });",
          "  return `${brief.savedAt} ${room.width}`;",
          "}",
        ].join("\n"),
      };
      // `roomModel` itself is still unread; the shape behind it was never decoded
      // from this field, so `depth` is not invented as a stored field.
      expect(unreadIn(programFor(elsewhere)).unread).toEqual(["roomModel"]);
    });

    it("leaves the map opaque when the literal spreads the whole record", () => {
      // A spread names no property: crediting it would police whatever the codec
      // reads out of every field of the record, which is the widening this gate
      // refuses.
      const spread = {
        "src/store.ts": [
          "type Room = { width: number; depth: number };",
          "type Brief = { savedAt: string; roomModel: Record<string, unknown> };",
          'const KEY = "wingman-brief-v1";',
          "export function saveBrief(brief: Brief) { localStorage.setItem(KEY, JSON.stringify(brief)); }",
          "export function decodeRoomModel(raw: Record<string, unknown>): Room {",
          "  return { width: Number(raw.widthCm), depth: Number(raw.depthCm) };",
          "}",
          "export function readBrief(brief: Brief) {",
          "  const room = decodeRoomModel({ ...brief });",
          "  return `${brief.savedAt} ${room.width}`;",
          "}",
        ].join("\n"),
      };
      // `savedAt` is read by the return; `roomModel` is named nowhere, because a
      // spread names no property of the record it copies.
      expect(unreadIn(programFor(spread)).unread).toEqual(["roomModel"]);
    });
  });

  describe("a loose map handed to its codec by a helper", () => {
    // The map is not passed to the codec directly: a function that exists only to
    // return it hands it over, and the codec's argument is that call. The return is
    // an argument of nothing, so following the field as far as the helper left the
    // shape behind the map outside the gate.
    const store = {
      "src/store.ts": [
        "type Room = { width: number; depth: number };",
        "type Brief = { savedAt: string; roomModel: Record<string, unknown> };",
        'const KEY = "wingman-brief-v1";',
        "export function saveBrief(brief: Brief) { localStorage.setItem(KEY, JSON.stringify(brief)); }",
        "export function roomModelOf(brief: Brief): Record<string, unknown> {",
        "  return brief.roomModel;",
        "}",
        "export function decodeRoomModel(raw: Record<string, unknown>): Room {",
        "  return { width: Number(raw.widthCm), depth: Number(raw.depthCm) };",
        "}",
        "export function readBrief(brief: Brief) {",
        "  const room = decodeRoomModel(roomModelOf(brief));",
        "  return `${brief.savedAt} ${room.width}`;",
        "}",
      ].join("\n"),
    };

    it("polices the shape the codec decodes the returned map into", () => {
      // `depth` is written by the codec and read nowhere; `roomModel` is read by the
      // helper's own return, so it is not what the gate is looking for here.
      expect(unreadIn(programFor(store)).unread).toEqual(["depth"]);
    });

    it("names the helper as well as the codec, because the map went through it", () => {
      // Two hops, both true: the map left by `roomModelOf` and was typed by
      // `decodeRoomModel`. Naming only the codec would leave the reader to find the
      // function in between.
      const depth = auditIn(programFor(store)).fields.find((entry) => entry.field === "depth");
      expect(depth.path).toEqual([
        "Brief.roomModel",
        "returned by roomModelOf",
        "decoded by decodeRoomModel",
        "Room.depth",
      ]);
    });

    it("follows a concise arrow whose body is the local it destructured off", () => {
      const arrow = {
        "src/store.ts": [
          "type Room = { width: number; depth: number };",
          "type Brief = { savedAt: string; roomModel: Record<string, unknown> };",
          'const KEY = "wingman-brief-v1";',
          "export function saveBrief(brief: Brief) { localStorage.setItem(KEY, JSON.stringify(brief)); }",
          "export const roomModelOf = (brief: Brief): Record<string, unknown> => {",
          "  const { roomModel } = brief;",
          "  return roomModel;",
          "};",
          "export function decodeRoomModel(raw: Record<string, unknown>): Room {",
          "  return { width: Number(raw.widthCm), depth: Number(raw.depthCm) };",
          "}",
          "export function readBrief(brief: Brief) {",
          "  const room = decodeRoomModel(roomModelOf(brief));",
          "  return `${brief.savedAt} ${room.width}`;",
          "}",
        ].join("\n"),
      };
      expect(unreadIn(programFor(arrow)).unread).toEqual(["depth"]);
    });

    it("leaves the map opaque when the helper never returns it", () => {
      // A same-shaped helper that builds a fresh map reads nothing off the field, so
      // the codec is decoding something else and the map stays unread rather than
      // being policed as whatever that helper hands over.
      const fresh = {
        "src/store.ts": [
          "type Room = { width: number; depth: number };",
          "type Brief = { savedAt: string; roomModel: Record<string, unknown> };",
          'const KEY = "wingman-brief-v1";',
          "export function saveBrief(brief: Brief) { localStorage.setItem(KEY, JSON.stringify(brief)); }",
          "const freshRoom = (): Record<string, unknown> => ({});",
          "export function decodeRoomModel(raw: Record<string, unknown>): Room {",
          "  return { width: Number(raw.widthCm), depth: Number(raw.depthCm) };",
          "}",
          "export function readBrief(brief: Brief) {",
          "  const room = decodeRoomModel(freshRoom());",
          "  return `${brief.savedAt} ${room.width}`;",
          "}",
        ].join("\n"),
      };
      expect(unreadIn(programFor(fresh)).unread).toEqual(["roomModel"]);
    });

    it("leaves it opaque when one path returns something that never came off the field", () => {
      // The field's return is not enough on its own: a helper that hands back a fresh
      // map on another path may be the value the codec actually decodes, and
      // crediting that would invent the shape behind it.
      const mixed = {
        "src/store.ts": [
          "type Room = { width: number; depth: number };",
          "type Brief = { savedAt: string; roomModel: Record<string, unknown> };",
          'const KEY = "wingman-brief-v1";',
          "export function saveBrief(brief: Brief) { localStorage.setItem(KEY, JSON.stringify(brief)); }",
          "export function roomModelOf(brief: Brief): Record<string, unknown> {",
          "  if (brief.savedAt) return {};",
          "  return brief.roomModel;",
          "}",
          "export function decodeRoomModel(raw: Record<string, unknown>): Room {",
          "  return { width: Number(raw.widthCm), depth: Number(raw.depthCm) };",
          "}",
          "export function readBrief(brief: Brief) {",
          "  const room = decodeRoomModel(roomModelOf(brief));",
          "  return `${brief.savedAt} ${room.width}`;",
          "}",
        ].join("\n"),
      };
      const audit = auditIn(programFor(mixed));
      // `roomModel` is still read — by the helper's own return — and `savedAt` by the
      // caller; what must not appear is a field of the codec's result.
      expect(audit.unread).toEqual([]);
      expect(audit.fields.map((entry) => entry.field)).not.toContain("depth");
    });

    it("does not take a same-named local for the helper", () => {
      // Resolved through the callee's declaration, not by the name in the file: the
      // local the call reaches builds a fresh map, so the real helper's existence
      // must not make its result look decoded.
      const shadowed = {
        "src/store.ts": [
          "type Room = { width: number; depth: number };",
          "type Brief = { savedAt: string; roomModel: Record<string, unknown> };",
          'const KEY = "wingman-brief-v1";',
          "export function saveBrief(brief: Brief) { localStorage.setItem(KEY, JSON.stringify(brief)); }",
          "export function roomModelOf(brief: Brief): Record<string, unknown> {",
          "  return brief.roomModel;",
          "}",
          "export function decodeRoomModel(raw: Record<string, unknown>): Room {",
          "  return { width: Number(raw.widthCm), depth: Number(raw.depthCm) };",
          "}",
          "export function readBrief(brief: Brief) {",
          "  const roomModelOf = (): Record<string, unknown> => ({});",
          "  const room = decodeRoomModel(roomModelOf());",
          "  return `${brief.savedAt} ${room.width}`;",
          "}",
        ].join("\n"),
      };
      const audit = auditIn(programFor(shadowed));
      expect(audit.unread).toEqual([]);
      expect(audit.fields.map((entry) => entry.field)).not.toContain("depth");
    });

    describe("held on an object and called as a method", () => {
      // The same helper, grouped where helpers usually live: `helpers.roomModelOf(brief)`.
      // The call's callee resolves to the property that holds the arrow rather than to
      // the arrow, so a carrier registered only against the function's own declaration
      // was never found and the map stayed opaque through this shape.
      const onAnObject = {
        "src/store.ts": [
          "type Room = { width: number; depth: number };",
          "type Brief = { savedAt: string; roomModel: Record<string, unknown> };",
          'const KEY = "wingman-brief-v1";',
          "export function saveBrief(brief: Brief) { localStorage.setItem(KEY, JSON.stringify(brief)); }",
          "export const briefHelpers = {",
          "  roomModelOf: (brief: Brief): Record<string, unknown> => brief.roomModel,",
          "};",
          "export function decodeRoomModel(raw: Record<string, unknown>): Room {",
          "  return { width: Number(raw.widthCm), depth: Number(raw.depthCm) };",
          "}",
          "export function readBrief(brief: Brief) {",
          "  const room = decodeRoomModel(briefHelpers.roomModelOf(brief));",
          "  return `${brief.savedAt} ${room.width}`;",
          "}",
        ].join("\n"),
      };

      it("polices the shape the codec decodes the method's result into", () => {
        expect(unreadIn(programFor(onAnObject)).unread).toEqual(["depth"]);
      });

      it("names the method as well as the codec, because the map went through it", () => {
        const depth = auditIn(programFor(onAnObject)).fields.find((entry) => entry.field === "depth");
        expect(depth.path).toEqual([
          "Brief.roomModel",
          "returned by roomModelOf",
          "decoded by decodeRoomModel",
          "Room.depth",
        ]);
      });

      it("follows the method shorthand as well as a property holding an arrow", () => {
        const shorthand = {
          "src/store.ts": [
            "type Room = { width: number; depth: number };",
            "type Brief = { savedAt: string; roomModel: Record<string, unknown> };",
            'const KEY = "wingman-brief-v1";',
            "export function saveBrief(brief: Brief) { localStorage.setItem(KEY, JSON.stringify(brief)); }",
            "export const briefHelpers = {",
            "  roomModelOf(brief: Brief): Record<string, unknown> {",
            "    return brief.roomModel;",
            "  },",
            "};",
            "export function decodeRoomModel(raw: Record<string, unknown>): Room {",
            "  return { width: Number(raw.widthCm), depth: Number(raw.depthCm) };",
            "}",
            "export function readBrief(brief: Brief) {",
            "  const room = decodeRoomModel(briefHelpers.roomModelOf(brief));",
            "  return `${brief.savedAt} ${room.width}`;",
            "}",
          ].join("\n"),
        };
        expect(unreadIn(programFor(shorthand)).unread).toEqual(["depth"]);
      });

      it("leaves the map opaque when the method builds a fresh one", () => {
        const fresh = {
          "src/store.ts": [
            "type Room = { width: number; depth: number };",
            "type Brief = { savedAt: string; roomModel: Record<string, unknown> };",
            'const KEY = "wingman-brief-v1";',
            "export function saveBrief(brief: Brief) { localStorage.setItem(KEY, JSON.stringify(brief)); }",
            "export const briefHelpers = {",
            "  roomModelOf: (): Record<string, unknown> => ({}),",
            "};",
            "export function decodeRoomModel(raw: Record<string, unknown>): Room {",
            "  return { width: Number(raw.widthCm), depth: Number(raw.depthCm) };",
            "}",
            "export function readBrief(brief: Brief) {",
            "  const room = decodeRoomModel(briefHelpers.roomModelOf(brief));",
            "  return `${brief.savedAt} ${room.width}`;",
            "}",
          ].join("\n"),
        };
        expect(unreadIn(programFor(fresh)).unread).toEqual(["roomModel"]);
      });

      it("does not credit a same-named method on another object", () => {
        // Keyed by the property each call names, not by the method's text: the real
        // helper's existence must not make another object's same-named method look
        // like it hands this field over.
        const other = {
          "src/store.ts": [
            "type Room = { width: number; depth: number };",
            "type Brief = { savedAt: string; roomModel: Record<string, unknown> };",
            'const KEY = "wingman-brief-v1";',
            "export function saveBrief(brief: Brief) { localStorage.setItem(KEY, JSON.stringify(brief)); }",
            "export const briefHelpers = {",
            "  roomModelOf: (brief: Brief): Record<string, unknown> => brief.roomModel,",
            "};",
            "export const otherHelpers = {",
            "  roomModelOf: (): Record<string, unknown> => ({}),",
            "};",
            "export function decodeRoomModel(raw: Record<string, unknown>): Room {",
            "  return { width: Number(raw.widthCm), depth: Number(raw.depthCm) };",
            "}",
            "export function readBrief(brief: Brief) {",
            "  const room = decodeRoomModel(otherHelpers.roomModelOf(brief));",
            "  return `${brief.savedAt} ${room.width}`;",
            "}",
          ].join("\n"),
        };
        const audit = auditIn(programFor(other));
        expect(audit.fields.map((entry) => entry.field)).not.toContain("depth");
        expect(audit.unread).toEqual([]);
      });
    });

    describe("reached through a class instance", () => {
      // The same helper again, but grouped on a class: `factory.roomModelOf(brief)`.
      // The call's callee resolves to the member declared on the class, so a carrier
      // keyed by the declaration that member names has to be found from a call made
      // through an instance — the shape a factory written as a class arrives in.
      const method = {
        "src/store.ts": [
          "type Room = { width: number; depth: number };",
          "type Brief = { savedAt: string; roomModel: Record<string, unknown> };",
          'const KEY = "wingman-brief-v1";',
          "export function saveBrief(brief: Brief) { localStorage.setItem(KEY, JSON.stringify(brief)); }",
          "export class BriefFactory {",
          "  roomModelOf(brief: Brief): Record<string, unknown> {",
          "    return brief.roomModel;",
          "  }",
          "}",
          "export function decodeRoomModel(raw: Record<string, unknown>): Room {",
          "  return { width: Number(raw.widthCm), depth: Number(raw.depthCm) };",
          "}",
          "export function readBrief(brief: Brief) {",
          "  const room = decodeRoomModel(new BriefFactory().roomModelOf(brief));",
          "  return `${brief.savedAt} ${room.width}`;",
          "}",
        ].join("\n"),
      };

      it("polices the shape the codec decodes the method's result into", () => {
        expect(unreadIn(programFor(method)).unread).toEqual(["depth"]);
      });

      it("names the method as well as the codec, because the map went through it", () => {
        const depth = auditIn(programFor(method)).fields.find((entry) => entry.field === "depth");
        expect(depth.path).toEqual([
          "Brief.roomModel",
          "returned by roomModelOf",
          "decoded by decodeRoomModel",
          "Room.depth",
        ]);
      });

      it("follows a helper held as a class field, which is an arrow rather than a method", () => {
        // A factory written as a class usually keeps its helper as a field: the arrow
        // is the initialiser of a `PropertyDeclaration`, not a `PropertyAssignment` or
        // a variable, and the call through the instance resolves to that field.
        const field = {
          "src/store.ts": [
            "type Room = { width: number; depth: number };",
            "type Brief = { savedAt: string; roomModel: Record<string, unknown> };",
            'const KEY = "wingman-brief-v1";',
            "export function saveBrief(brief: Brief) { localStorage.setItem(KEY, JSON.stringify(brief)); }",
            "export class BriefFactory {",
            "  roomModelOf = (brief: Brief): Record<string, unknown> => brief.roomModel;",
            "}",
            "export function decodeRoomModel(raw: Record<string, unknown>): Room {",
            "  return { width: Number(raw.widthCm), depth: Number(raw.depthCm) };",
            "}",
            "export function readBrief(brief: Brief) {",
            "  const factory = new BriefFactory();",
            "  const room = decodeRoomModel(factory.roomModelOf(brief));",
            "  return `${brief.savedAt} ${room.width}`;",
            "}",
          ].join("\n"),
        };
        expect(unreadIn(programFor(field)).unread).toEqual(["depth"]);
      });

      it("leaves the map opaque when the instance's helper builds a fresh one", () => {
        const fresh = {
          "src/store.ts": [
            "type Room = { width: number; depth: number };",
            "type Brief = { savedAt: string; roomModel: Record<string, unknown> };",
            'const KEY = "wingman-brief-v1";',
            "export function saveBrief(brief: Brief) { localStorage.setItem(KEY, JSON.stringify(brief)); }",
            "export class BriefFactory {",
            "  roomModelOf(brief: Brief): Record<string, unknown> {",
            "    return { savedAt: brief.savedAt };",
            "  }",
            "}",
            "export function decodeRoomModel(raw: Record<string, unknown>): Room {",
            "  return { width: Number(raw.widthCm), depth: Number(raw.depthCm) };",
            "}",
            "export function readBrief(brief: Brief) {",
            "  const room = decodeRoomModel(new BriefFactory().roomModelOf(brief));",
            "  return `${brief.savedAt} ${room.width}`;",
            "}",
          ].join("\n"),
        };
        expect(unreadIn(programFor(fresh)).unread).toEqual(["roomModel"]);
      });

      it("does not credit a same-named method on another class", () => {
        // Keyed by the member each call names, not by the method's text: the real
        // helper's existence must not make another class's same-named member look like
        // it hands this field over.
        const other = {
          "src/store.ts": [
            "type Room = { width: number; depth: number };",
            "type Brief = { savedAt: string; roomModel: Record<string, unknown> };",
            'const KEY = "wingman-brief-v1";',
            "export function saveBrief(brief: Brief) { localStorage.setItem(KEY, JSON.stringify(brief)); }",
            "export class BriefFactory {",
            "  roomModelOf(brief: Brief): Record<string, unknown> {",
            "    return brief.roomModel;",
            "  }",
            "}",
            "export class OtherFactory {",
            "  roomModelOf(): Record<string, unknown> {",
            "    return {};",
            "  }",
            "}",
            "export function decodeRoomModel(raw: Record<string, unknown>): Room {",
            "  return { width: Number(raw.widthCm), depth: Number(raw.depthCm) };",
            "}",
            "export function readBrief(brief: Brief) {",
            "  const room = decodeRoomModel(new OtherFactory().roomModelOf());",
            "  return `${brief.savedAt} ${room.width}`;",
            "}",
          ].join("\n"),
        };
        const audit = auditIn(programFor(other));
        expect(audit.fields.map((entry) => entry.field)).not.toContain("depth");
        expect(audit.unread).toEqual([]);
      });
    });
  });

  describe("a loose map field read through a codec", () => {
    // `roomModel` declares nothing to walk: its entries are `unknown`, so the gate
    // stopped at the map and a field of the shape it is decoded into was outside
    // it. The codec that takes the map and returns a record is that field's real
    // schema, so its result is policed as what the store holds.
    const store = {
      "src/store.ts": [
        "type Room = { width: number; depth: number };",
        "type Brief = { savedAt: string; roomModel: Record<string, unknown> };",
        'const KEY = "wingman-brief-v1";',
        "export function saveBrief(brief: Brief) { localStorage.setItem(KEY, JSON.stringify(brief)); }",
        "export function decodeRoomModel(raw: Record<string, unknown>): Room {",
        "  return { width: Number(raw.widthCm), depth: Number(raw.depthCm) };",
        "}",
        "export function readBrief(brief: Brief) {",
        "  const room = decodeRoomModel(brief.roomModel);",
        "  return `${brief.savedAt} ${room.width}`;",
        "}",
      ].join("\n"),
    };

    it("polices the shape the codec decodes the map into", () => {
      // `depth` is written by the codec and read nowhere; `width` is read, and
      // `roomModel` itself is read by being handed to the codec.
      expect(unreadIn(programFor(store)).unread).toEqual(["depth"]);
    });

    it("names the codec in the path, because it is what typed the entry", () => {
      const depth = auditIn(programFor(store)).fields.find((entry) => entry.field === "depth");
      expect(depth.path).toEqual(["Brief.roomModel", "decoded by decodeRoomModel", "Room.depth"]);
    });

    it("follows nothing from a codec that returns no record", () => {
      // The filter that keeps this from being "whatever the value flows into": a
      // helper that takes the same loose map and hands back a string types no
      // stored shape, so it adds no fields to police.
      const described = {
        "src/store.ts": [
          'type Brief = { label: string; roomModel: Record<string, unknown> };',
          'const KEY = "wingman-brief-v1";',
          "export function saveBrief(brief: Brief) { localStorage.setItem(KEY, JSON.stringify(brief)); }",
          "function describe(raw: Record<string, unknown>): string { return Object.keys(raw).join(','); }",
          "export function readBrief(brief: Brief) { return `${brief.label} ${describe(brief.roomModel)}`; }",
        ].join("\n"),
      };
      expect(unreadIn(programFor(described)).unread).toEqual([]);
    });

    it("reports a loose field with no codec, and invents nothing behind it", () => {
      const opaque = {
        "src/store.ts": [
          'type Row = { payload: Record<string, unknown> };',
          'const KEY = "wingman-row-v1";',
          "export function saveRow(row: Row) { localStorage.setItem(KEY, JSON.stringify(row)); }",
        ].join("\n"),
      };
      expect(unreadIn(programFor(opaque)).unread).toEqual(["payload"]);
    });
  });

  describe("a record read by destructuring", () => {
    // `const { personalisation } = draft` is a read of `draft.personalisation`,
    // but the bound name resolves to the local variable the pattern declares,
    // so asking the compiler about that name matches no stored field.
    const spreads = {
      "src/store.ts": [
        "type Draft = { personalisation: string; savedAt: string };",
        'const KEY = "wingman-drafts-v1";',
        "export function save(draft: Draft) { localStorage.setItem(KEY, JSON.stringify(draft)); }",
        "export function render(draft: Draft) {",
        "  const { personalisation } = draft;",
        "  return personalisation;",
        "}",
      ].join("\n"),
    };

    it("credits the property the pattern names, not the local it binds", () => {
      // Nothing else names `personalisation`: no `.personalisation` and no
      // `[\"personalisation\"]` in this program, so the binding is the only reader.
      expect(unreadIn(programFor(spreads)).unread).toEqual(["savedAt"]);
    });

    it("follows a rename, which names the property and binds another", () => {
      const renamed = {
        "src/store.ts": [
          "type Draft = { personalisation: string; savedAt: string };",
          'const KEY = "wingman-drafts-v1";',
          "export function save(draft: Draft) { localStorage.setItem(KEY, JSON.stringify(draft)); }",
          "export function render(draft: Draft) {",
          "  const { personalisation: copy } = draft;",
          "  return copy;",
          "}",
        ].join("\n"),
      };
      expect(unreadIn(programFor(renamed)).unread).toEqual(["savedAt"]);
    });

    it("credits nothing for a computed key or a rest element", () => {
      // Neither names a property statically: a computed key is resolved at run
      // time and a rest element takes the whole record, so crediting either would
      // make every field of the record read.
      const opaque = {
        "src/store.ts": [
          "type Draft = { personalisation: string; savedAt: string };",
          'const KEY = "wingman-drafts-v1";',
          "export function save(draft: Draft) { localStorage.setItem(KEY, JSON.stringify(draft)); }",
          "export function render(draft: Draft, key: keyof Draft) {",
          "  const { [key]: chosen, ...rest } = draft;",
          "  return `${chosen} ${Object.keys(rest).length}`;",
          "}",
        ].join("\n"),
      };
      expect(unreadIn(programFor(opaque)).unread.sort()).toEqual(["personalisation", "savedAt"]);
    });
  });

  describe("a loose map handed to its codec through a destructured local", () => {
    // The codec's argument is the local the pattern bound, not `brief.roomModel`,
    // so the read the gate already credits (`const { roomModel } = brief`) is the
    // only thing tying the call back to the field — and the map stays opaque
    // unless the two are joined.
    const store = {
      "src/store.ts": [
        "type Room = { width: number; depth: number };",
        "type Brief = { savedAt: string; roomModel: Record<string, unknown> };",
        'const KEY = "wingman-brief-v1";',
        "export function saveBrief(brief: Brief) { localStorage.setItem(KEY, JSON.stringify(brief)); }",
        "export function decodeRoomModel(raw: Record<string, unknown>): Room {",
        "  return { width: Number(raw.widthCm), depth: Number(raw.depthCm) };",
        "}",
        "export function readBrief(brief: Brief) {",
        "  const { roomModel } = brief;",
        "  const room = decodeRoomModel(roomModel);",
        "  return `${brief.savedAt} ${room.width}`;",
        "}",
      ].join("\n"),
    };

    it("polices the shape the codec decodes the map into", () => {
      expect(unreadIn(programFor(store)).unread).toEqual(["depth"]);
    });

    it("names the codec in the path, because it is what typed the entry", () => {
      const depth = auditIn(programFor(store)).fields.find((entry) => entry.field === "depth");
      expect(depth.path).toEqual(["Brief.roomModel", "decoded by decodeRoomModel", "Room.depth"]);
    });

    it("leaves the map opaque when the local came from somewhere else", () => {
      // A local of the same type that was never taken off the field is not this
      // field's read, so the codec is not found and nothing behind the map is
      // policed — the fail-closed half the binding must not widen.
      const elsewhere = {
        "src/store.ts": [
          "type Room = { width: number; depth: number };",
          "type Brief = { savedAt: string; roomModel: Record<string, unknown> };",
          'const KEY = "wingman-brief-v1";',
          "export function saveBrief(brief: Brief) { localStorage.setItem(KEY, JSON.stringify(brief)); }",
          "export function decodeRoomModel(raw: Record<string, unknown>): Room {",
          "  return { width: Number(raw.widthCm), depth: Number(raw.depthCm) };",
          "}",
          "export function readBrief(brief: Brief) {",
          "  const roomModel: Record<string, unknown> = {};",
          "  const room = decodeRoomModel(roomModel);",
          "  return `${brief.savedAt} ${room.width}`;",
          "}",
        ].join("\n"),
      };
      // `roomModel` itself is still unread; the shape behind it was never decoded
      // from this field, so `depth` is not invented as a stored field.
      expect(unreadIn(programFor(elsewhere)).unread).toEqual(["roomModel"]);
    });
  });

  describe("the store a record came through", () => {
    // The draft is reached through a table written to `wingman-drafts-v1`, which is
    // the store a person has to open to see it. The write's file and line travel
    // with the key, so two writes to one key stay distinguishable.
    const table = {
      "src/store.ts": [
        "type Draft = { personalisation: string; savedAt: string };",
        'const KEY = "wingman-drafts-v1";',
        "export function save(store: { drafts: Record<string, Draft> }) {",
        "  localStorage.setItem(KEY, JSON.stringify(store));",
        "}",
      ].join("\n"),
    };

    it("names the storage key and the write that reached the field", () => {
      const savedAt = auditIn(programFor(table)).fields.find((entry) => entry.field === "savedAt");
      expect(savedAt.stores).toHaveLength(1);
      expect(savedAt.stores[0]).toContain("wingman-drafts-v1");
      expect(savedAt.stores[0]).toContain("src/store.ts:");
    });

    it("names every write when one record is stored twice", () => {
      // One record, two stores: keeping a root per type rather than per write named
      // only the first, so the second store could never appear in a report.
      const shared = {
        "src/shared.ts": [
          "type Draft = { personalisation: string; savedAt: string };",
          'export function saveA(draft: Draft) { localStorage.setItem("wingman-a", JSON.stringify(draft)); }',
          'export function saveB(draft: Draft) { localStorage.setItem("wingman-b", JSON.stringify(draft)); }',
        ].join("\n"),
      };
      const stores = auditIn(programFor(shared)).fields.find((entry) => entry.field === "savedAt").stores;
      expect(stores.some((store) => store.includes("wingman-a"))).toBe(true);
      expect(stores.some((store) => store.includes("wingman-b"))).toBe(true);
    });
  });

  describe("a form that edits through a computed key", () => {
    const form = {
      "src/form.ts": [
        "type Form = { title: string; author: string; hidden: string };",
        'const KEY = "wingman-form-v1";',
        "export function saveForm(value: Form) { localStorage.setItem(KEY, JSON.stringify(value)); }",
        "export function renderForm(value: Form) {",
        "  const field = (key: keyof Form, label: string) => `${label}: ${value[key]}`;",
        '  return [field("title", "Title"), field("author", "Author")].join(",");',
        "}",
      ].join("\n"),
    };

    it("counts the keys the form is handed as reads", () => {
      const names = collectFormKeyNames(programFor(form));
      expect(names.has("title")).toBe(true);
      expect(names.has("author")).toBe(true);
    });

    it("accepts those fields and still reports one with no box of its own", () => {
      // `hidden` is a field of the same record; the form could edit it, but no
      // call names it, so it is not a field a surface reads.
      expect(unreadIn(programFor(form)).unread).toEqual(["hidden"]);
    });
  });

  describe("the path a failure prints", () => {
    it("keeps a short chain whole", () => {
      expect(reachedBy(["Store.drafts", "map value", "Draft.savedAt"])).toBe(
        "\n    reached by Store.drafts → map value → Draft.savedAt",
      );
    });

    it("elides the middle of a long one, which still ends at the field", () => {
      const long = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "Draft.savedAt"];
      const printed = reachedBy(long);
      expect(printed).toContain("a → b → c → d → … → h → i → Draft.savedAt");
      expect(printed).not.toContain("→ e →");
    });

    it("says nothing for a field with no recorded path", () => {
      expect(reachedBy(undefined)).toBe("");
      expect(reachedBy([])).toBe("");
    });
  });

  describe("baseline comparison", () => {
    const entry = (name) => ({ file: "src/record.ts", type: "Record", field: name });

    it("reports a field the baseline does not cover", () => {
      const { added, stale } = compareStoredRecordFields({ unread: [entry("fresh")], baseline: [] });
      expect(added.map(fieldKey)).toEqual(["src/record.ts|Record|fresh"]);
      expect(stale).toEqual([]);
    });

    it("keeps a covered field quiet", () => {
      const { added, stale } = compareStoredRecordFields({ unread: [entry("known")], baseline: [entry("known")] });
      expect(added).toEqual([]);
      expect(stale).toEqual([]);
    });

    it("reports a baseline entry that gained a reader, so the file ratchets down", () => {
      const { added, stale } = compareStoredRecordFields({ unread: [], baseline: [entry("removed")] });
      expect(added).toEqual([]);
      expect(stale.map(fieldKey)).toEqual(["src/record.ts|Record|removed"]);
    });
  });
});
