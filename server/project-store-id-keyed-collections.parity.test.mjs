/**
 * Cross-side parity coverage for the by-id last-writer-wins merge of the
 * id-keyed work-product collections (compareRuns, proposalVersions,
 * requirements, productSelections, visualAssets) — ADR-0001 §1.2i.
 *
 * The client (src/wingman2/data/projectStore.ts) and the server
 * (server/wingman-app-store.mjs) each implement the SAME pure merge:
 *
 *   mergeIdKeyedCollectionItems(storedItems, editorItems, { idKey, timeKey,
 *   editorIsFresh })  →  by-id LWW per item + fresh-editor removal guard
 *
 * The sync path and the hydration path pass the SAME pair with the SAME role
 * orientation (stored = server row, editor = the client's local payload) and
 * the same freshness predicate (client basis >= row revision), so both flows
 * must produce identical arrays for identical inputs. The first suite feeds a
 * shared corpus of (stored, editor, freshness, keys) pairs to BOTH
 * implementations and requires deep-equal outputs and per-item decisions. The
 * second suite drives the whole hydration merge against the server merge
 * helpers on the same pair and requires the merged collections to match, so
 * no drift in how each side calls the helpers goes unnoticed.
 */
import { describe, expect, it } from "vitest";
import {
  ID_KEYED_COLLECTION_MERGE_KEYS as SERVER_MERGE_KEYS,
  pickCollectionItemVersion as serverPickCollectionItemVersion,
  mergeIdKeyedCollectionItems as serverMergeIdKeyedCollectionItems,
} from "./wingman-app-store.mjs";
import {
  ID_KEYED_COLLECTION_MERGE_KEYS as CLIENT_MERGE_KEYS,
  pickCollectionItemVersion as clientPickCollectionItemVersion,
  mergeIdKeyedCollectionItems as clientMergeIdKeyedCollectionItems,
  mergeProjectVersionsForHydration,
} from "../src/wingman2/data/projectHydrationMerge.ts";

function iso(ms) {
  return new Date(ms).toISOString();
}

function json(value) {
  return JSON.stringify(value);
}

function deepFreeze(value) {
  if (value && typeof value === "object") {
    Object.freeze(value);
    for (const key of Object.keys(value)) deepFreeze(value[key]);
  }
  return value;
}

/**
 * Shared corpus: every pair is fed to the server AND client implementations.
 * Inputs are frozen so no implementation can mutate the corpus and mask drift.
 */
function buildCorpus() {
  const t0 = iso(1_700_000_000_000);
  const t1 = iso(1_700_000_000_001);
  const t2 = iso(1_700_000_000_002);
  const cases = [];

  // id-keyed lanes (compareRuns, proposalVersions, requirements, visualAssets)
  for (const { idKey, timeKey } of Object.values(SERVER_MERGE_KEYS)) {
    const item = (id, at, extra = {}) => ({ [idKey]: id, [timeKey]: at, label: id, ...extra });
    const laneName = timeKey;
    cases.push(
      // 1. Disjoint items from both sides must UNION when the editor never
      //    saw the stored copy (stale editor).
      {
        name: `${laneName}: disjoint items union when editor is stale`,
        idKey,
        timeKey,
        stored: [item("a", t0, { side: "stored" })],
        editor: [item("b", t1, { side: "editor" })],
        editorIsFresh: false,
      },
      // 1b. A fresh editor that omits a stored item has REMOVED it, even
      //     while adding its own.
      {
        name: `${laneName}: fresh editor removal with simultaneous addition`,
        idKey,
        timeKey,
        stored: [item("a", t0, { side: "stored" })],
        editor: [item("b", t1, { side: "editor" })],
        editorIsFresh: true,
      },
      // 2. Same id: later embedded write time wins.
      {
        name: `${laneName}: same id later editor time wins`,
        idKey,
        timeKey,
        stored: [item("a", t1, { side: "stored" })],
        editor: [item("a", t2, { side: "editor" })],
        editorIsFresh: true,
      },
      {
        name: `${laneName}: same id later stored time wins`,
        idKey,
        timeKey,
        stored: [item("a", t2, { side: "stored" })],
        editor: [item("a", t1, { side: "editor" })],
        editorIsFresh: true,
      },
      // 3. Same id, same time, different content -> deterministic content order.
      {
        name: `${laneName}: equal times resolve by content order`,
        idKey,
        timeKey,
        stored: [item("a", t1, { note: "aaa" })],
        editor: [item("a", t1, { note: "zzz" })],
        editorIsFresh: true,
      },
      // 4. Same id, identical content -> stored copy kept (no-op re-sync).
      {
        name: `${laneName}: identical re-sync is a no-op keeping stored`,
        idKey,
        timeKey,
        stored: [item("a", t1, { note: "same" })],
        editor: [item("a", t1, { note: "same" })],
        editorIsFresh: true,
      },
      // 5. Stored-only item: kept when the editor is stale (never saw it),
      //    dropped when the editor is fresh (deliberate removal).
      {
        name: `${laneName}: stale editor keeps stored-only item`,
        idKey,
        timeKey,
        stored: [item("a", t0)],
        editor: [],
        editorIsFresh: false,
      },
      {
        name: `${laneName}: fresh editor drops stored-only item`,
        idKey,
        timeKey,
        stored: [item("a", t0)],
        editor: [],
        editorIsFresh: true,
      },
      // 6. Editor-only item is always added (offline addition survives).
      {
        name: `${laneName}: editor-only item always added (stale editor too)`,
        idKey,
        timeKey,
        stored: [],
        editor: [item("a", t0)],
        editorIsFresh: false,
      },
      // 7. Mixed: two edits + one removal + one addition in one payload.
      {
        name: `${laneName}: mixed concurrent payload`,
        idKey,
        timeKey,
        stored: [item("keep-me", t0), item("remove-me", t0), item("edit-me", t1, { side: "stored" })],
        editor: [item("edit-me", t2, { side: "editor" }), item("add-me", t2)],
        editorIsFresh: true,
      },
      // 8. Legacy items without the embedded time key on one side.
      {
        name: `${laneName}: untimed legacy stored item cannot displace timed editor item`,
        idKey,
        timeKey,
        stored: [{ [idKey]: "a", label: "legacy-no-time" }],
        editor: [item("a", t1, { side: "editor" })],
        editorIsFresh: true,
      },
      {
        name: `${laneName}: untimed editor item cannot displace timed stored item`,
        idKey,
        timeKey,
        stored: [item("a", t1, { side: "stored" })],
        editor: [{ [idKey]: "a", label: "legacy-no-time" }],
        editorIsFresh: true,
      },
      // 9. Missing/invalid identity keys are ignored on both sides.
      {
        name: `${laneName}: id-less items are ignored`,
        idKey,
        timeKey,
        stored: [{ [timeKey]: t0, label: "no-id" }, item("a", t0)],
        editor: [{ [timeKey]: t1, label: "no-id-editor" }],
        editorIsFresh: true,
      },
      // 10. Undefined / non-array inputs behave as empty.
      {
        name: `${laneName}: undefined collections behave as empty`,
        idKey,
        timeKey,
        stored: undefined,
        editor: [item("a", t0)],
        editorIsFresh: false,
      },
      {
        name: `${laneName}: both sides undefined -> empty`,
        idKey,
        timeKey,
        stored: undefined,
        editor: undefined,
        editorIsFresh: true,
      },
      // 11. Stored order is preserved, editor-only items appended after it.
      {
        name: `${laneName}: stored order preserved with editor additions appended`,
        idKey,
        timeKey,
        stored: [item("b", t0), item("a", t0)],
        editor: [item("c", t2)],
        editorIsFresh: true,
      },
    );
  }

  // sku-keyed lane (productSelections) gets the same matrix plus sku identity.
  for (const { idKey, timeKey } of [{ idKey: "sku", timeKey: "addedAt" }]) {
    const item = (sku, at, extra = {}) => ({ [idKey]: sku, [timeKey]: at, title: sku, ...extra });
    cases.push(
      {
        name: `productSelections: same sku later addedAt wins`,
        idKey,
        timeKey,
        stored: [item("NHD-621-TX", t1, { quantity: 2 })],
        editor: [item("NHD-621-TX", t2, { quantity: 4 })],
        editorIsFresh: true,
      },
      {
        name: `productSelections: fresh editor removing a sku drops it`,
        idKey,
        timeKey,
        stored: [item("NHD-621-TX", t0), item("NHD-621-RX", t0)],
        editor: [item("NHD-621-RX", t0)],
        editorIsFresh: true,
      },
      {
        name: `productSelections: stale editor keeps removed sku`,
        idKey,
        timeKey,
        stored: [item("NHD-621-TX", t0), item("NHD-621-RX", t0)],
        editor: [item("NHD-621-RX", t0)],
        editorIsFresh: false,
      },
    );
  }

  return cases.map((entry) => deepFreeze(entry));
}

describe("id-keyed collection merge parity (server vs client)", () => {
  const corpus = buildCorpus();
  const mergeKeys = new Set(Object.keys(SERVER_MERGE_KEYS));
  expect(new Set(Object.keys(CLIENT_MERGE_KEYS))).toEqual(mergeKeys);
  for (const key of mergeKeys) {
    expect(CLIENT_MERGE_KEYS[key]).toEqual(SERVER_MERGE_KEYS[key]);
  }

  it("covers every collection in the corpus", () => {
    const covered = new Set();
    for (const entry of corpus) {
      for (const [key, spec] of Object.entries(SERVER_MERGE_KEYS)) {
        if (spec.idKey === entry.idKey && spec.timeKey === entry.timeKey) covered.add(key);
      }
    }
    expect(covered).toEqual(mergeKeys);
  });

  it("produces identical merged arrays and per-item decisions on both sides", () => {
    expect(corpus.length).toBeGreaterThan(50);
    for (const entry of corpus) {
      const args = {
        idKey: entry.idKey,
        timeKey: entry.timeKey,
        editorIsFresh: entry.editorIsFresh,
      };
      const serverOutput = serverMergeIdKeyedCollectionItems(entry.stored, entry.editor, args);
      const clientOutput = clientMergeIdKeyedCollectionItems(entry.stored, entry.editor, args);
      expect(json(clientOutput), `${entry.name} — client and server merges diverge`).toBe(json(serverOutput));

      // Per-item decisions must match too, so a client-only conflict flag can
      // never disagree with what the server decided for the same pair.
      for (const storedItem of entry.stored ?? []) {
        for (const editorItem of entry.editor ?? []) {
          const keyOf = (item) => String(item?.[entry.idKey]);
          if (keyOf(storedItem) !== keyOf(editorItem)) continue;
          const serverPick = serverPickCollectionItemVersion(storedItem, editorItem, entry.timeKey);
          const clientPick = clientPickCollectionItemVersion(storedItem, editorItem, entry.timeKey);
          expect(json(clientPick.value), `${entry.name} — pick values diverge`).toBe(json(serverPick.value));
          expect(clientPick.editorWon, `${entry.name} — pick winner flags diverge`).toBe(serverPick.editorWon);
        }
      }
    }
  });

  it("resolves the classic cases with the intended semantics", () => {
    const t1 = iso(1_700_000_000_001);
    const t2 = iso(1_700_000_000_002);
    const { idKey, timeKey } = SERVER_MERGE_KEYS.requirements;

    // Two sessions adding disjoint items both survive when the editor is
    // stale (its payload predates the stored item) - or when the editor has
    // seen the stored copy and simply adds its own.
    const staleUnion = serverMergeIdKeyedCollectionItems(
      [{ [idKey]: "a", [timeKey]: t1 }],
      [{ [idKey]: "b", [timeKey]: t2 }],
      { idKey, timeKey, editorIsFresh: false },
    );
    expect(staleUnion.map((item) => item[idKey]).sort()).toEqual(["a", "b"]);
    const freshUnion = serverMergeIdKeyedCollectionItems(
      [{ [idKey]: "a", [timeKey]: t1 }],
      [{ [idKey]: "a", [timeKey]: t1 }, { [idKey]: "b", [timeKey]: t2 }],
      { idKey, timeKey, editorIsFresh: true },
    );
    expect(freshUnion.map((item) => item[idKey]).sort()).toEqual(["a", "b"]);

    const lww = serverMergeIdKeyedCollectionItems(
      [{ [idKey]: "a", [timeKey]: t1, value: "old" }],
      [{ [idKey]: "a", [timeKey]: t2, value: "new" }],
      { idKey, timeKey, editorIsFresh: true },
    );
    expect(lww).toHaveLength(1);
    expect(lww[0].value).toBe("new");

    const keptRemoval = serverMergeIdKeyedCollectionItems(
      [{ [idKey]: "a", [timeKey]: t1 }],
      [],
      { idKey, timeKey, editorIsFresh: false },
    );
    expect(keptRemoval).toHaveLength(1);

    const honoredRemoval = serverMergeIdKeyedCollectionItems(
      [{ [idKey]: "a", [timeKey]: t1 }],
      [],
      { idKey, timeKey, editorIsFresh: true },
    );
    expect(honoredRemoval).toEqual([]);
  });
});

/** Builds a minimal client-shaped project around the given collection. */
function clientProject(collectionKey, items, { basis, at, extra = {} }) {
  return {
    id: "proj-1",
    name: "Parity Project",
    owner: "Parity",
    ownerId: "parity-owner",
    stage: "Discovery",
    status: "Draft",
    updated: "Just now",
    resumeTo: "/wingman/discovery",
    createdAt: at,
    updatedAt: at,
    syncRevision: basis,
    [collectionKey]: items,
    ...extra,
  };
}

describe("hydration workflow parity (client merge vs server merge helpers)", () => {
  const t1 = iso(1_700_000_000_001);
  const t2 = iso(1_700_000_000_002);

  it("keeps both sessions' additions to one collection identical to the server merge", () => {
    const collectionKey = "requirements";
    const { idKey, timeKey } = SERVER_MERGE_KEYS[collectionKey];
    // Row R at revision 3 with session A's requirement req-a. Session B
    // synced at revision 3 (so its payload carries req-a too) and adds its
    // own req-b offline: both items must survive a reload, and the client
    // hydration must produce the same collection the server merge would.
    const row = clientProject(collectionKey, [{ [idKey]: "req-a", [timeKey]: t1, label: "A" }], { basis: 3, at: t2 });
    const payload = clientProject(
      collectionKey,
      [
        { [idKey]: "req-a", [timeKey]: t1, label: "A" },
        { [idKey]: "req-b", [timeKey]: t2, label: "B" },
      ],
      { basis: 3, at: t2 },
    );

    const hydrated = mergeProjectVersionsForHydration(payload, row);
    const serverMerged = serverMergeIdKeyedCollectionItems(row[collectionKey], payload[collectionKey], {
      idKey,
      timeKey,
      editorIsFresh: 3 >= 3,
    });
    expect(json(hydrated.project[collectionKey])).toBe(json(serverMerged));
    expect(hydrated.project[collectionKey].map((item) => item[idKey]).sort()).toEqual(["req-a", "req-b"]);
  });

  it("honours a same-item concurrent edit identically on both sides", () => {
    const collectionKey = "compareRuns";
    const { idKey, timeKey } = SERVER_MERGE_KEYS[collectionKey];
    const item = (at, summary) => ({ [idKey]: "run-1", [timeKey]: at, summary, matchScore: 90 });
    // Both sessions edited run-1; B's edit is later, so both sides adopt it.
    const row = clientProject(collectionKey, [item(t1, "stored summary")], { basis: 2, at: t2 });
    const payload = clientProject(collectionKey, [item(t2, "editor summary")], { basis: 2, at: t2 });

    const hydrated = mergeProjectVersionsForHydration(payload, row);
    const serverMerged = serverMergeIdKeyedCollectionItems(row[collectionKey], payload[collectionKey], {
      idKey,
      timeKey,
      editorIsFresh: 2 >= 2,
    });
    expect(json(hydrated.project[collectionKey])).toBe(json(serverMerged));
    expect(hydrated.project[collectionKey][0].summary).toBe("editor summary");
  });

  it("keeps a stale reload from resurrecting nothing and a fresh one from resurrecting removals — both sides agree", () => {
    const collectionKey = "productSelections";
    const { idKey, timeKey } = SERVER_MERGE_KEYS[collectionKey];
    const item = (sku, addedAt, quantity) => ({ [idKey]: sku, [timeKey]: addedAt, quantity });

    // Row R at revision 4 has the sku; local P is based on revision 4 and
    // removed it (its payload omits it). Hydration and the server merge both
    // drop the stored-only item because the editor is fresh.
    const row = clientProject(collectionKey, [item("NHD-621-TX", t1, 2)], { basis: 4, at: t2 });
    const payload = clientProject(collectionKey, [], { basis: 4, at: t2 });

    const hydratedFresh = mergeProjectVersionsForHydration(payload, row);
    const serverMergedFresh = serverMergeIdKeyedCollectionItems(row[collectionKey], payload[collectionKey], {
      idKey,
      timeKey,
      editorIsFresh: 4 >= 4,
    });
    // Both workflows drop the collection entirely (the client hydration and
    // the server sync merge both delete an emptied collection key; the pure
    // helper returns [] for the same input).
    expect(json(hydratedFresh.project[collectionKey] ?? [])).toBe(json(serverMergedFresh));
    expect(hydratedFresh.project[collectionKey]).toBeUndefined();

    // Local P based on revision 2 (older than the row at 4) never saw the
    // sku: both sides keep it.
    const stalePayload = clientProject(collectionKey, [], { basis: 2, at: t1 });
    const hydratedStale = mergeProjectVersionsForHydration(stalePayload, row);
    const serverMergedStale = serverMergeIdKeyedCollectionItems(row[collectionKey], stalePayload[collectionKey], {
      idKey,
      timeKey,
      editorIsFresh: 2 >= 4,
    });
    expect(json(hydratedStale.project[collectionKey] ?? [])).toBe(json(serverMergedStale));
    expect(hydratedStale.project[collectionKey]).toHaveLength(1);
  });

  it("flags a conflict when a local item wins over a differing backend item (and not for backend adoptions)", () => {
    const collectionKey = "visualAssets";
    const { idKey, timeKey } = SERVER_MERGE_KEYS[collectionKey];
    const item = (at, title) => ({ [idKey]: "asset-1", [timeKey]: at, title });

    const row = clientProject(collectionKey, [item(t1, "backend older")], { basis: 3, at: t2 });
    const payload = clientProject(collectionKey, [item(t2, "local newer")], { basis: 3, at: t2 });

    const localWins = mergeProjectVersionsForHydration(payload, row);
    expect(localWins.conflict).toBe(true);
    expect(localWins.project[collectionKey][0].title).toBe("local newer");

    const backendWins = mergeProjectVersionsForHydration(payload, clientProject(collectionKey, [item(t2, "also new")], { basis: 3, at: t2 }));
    expect(backendWins.project[collectionKey][0].title).toBe("also new");
    // A plain union of disjoint items is not a conflict: the OTHER session's
    // asset was synced at revision 4, after this local copy's revision-3
    // basis, so the local copy never saw it and it is kept alongside the
    // local-only asset.
    const disjointRow = clientProject(
      collectionKey,
      [{ [idKey]: "asset-2", [timeKey]: t1, title: "other asset" }],
      { basis: 4, at: t2 },
    );
    const noConflict = mergeProjectVersionsForHydration(payload, disjointRow);
    expect(noConflict.project[collectionKey]).toHaveLength(2);
    expect(noConflict.project[collectionKey].map((item) => item[idKey]).sort()).toEqual(["asset-1", "asset-2"]);
    expect(noConflict.conflict).toBe(false);
  });
});
