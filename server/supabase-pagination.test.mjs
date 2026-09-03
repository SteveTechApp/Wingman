// Pins the pagination contract of readAllSupabaseRows: every row of a table is
// read regardless of how it compares to PostgREST's 1000-row response cap, a
// short page proves exhaustion, errors mid-read are surfaced as truncated
// failures, and a pathological server can never spin into an unbounded loop.
//
// The fake client records the Range windows it is asked for, so the tests also
// pin that pagination is deterministic (fixed window arithmetic) rather than
// depending on the server's mood.

import { describe, expect, it } from "vitest";
import { POSTGREST_MAX_ROWS, readAllSupabaseRows } from "./supabase-pagination.mjs";

function makeRows(count) {
  return Array.from({ length: count }, (_, index) => ({ id: `row-${index}`, n: index }));
}

// A fake client that honours arbitrary Range windows against a fixed row
// array, with an optional page-indexed failure. Unlike fakeClient above, the
// window arithmetic is pageSize-agnostic, so tests can SHRINK the pageSize
// passed to readAllSupabaseRows and still exercise multi-page walks against a
// small row count - the cheap way to simulate a table that outgrew the
// PostgREST cap.
function windowedClient(rows, { pageSize, failPage } = {}) {
  const requestedRange = [];
  return {
    requestedRange,
    from: () => ({
      select: () => {
        const state = { from: 0, to: null };
        const api = {
          range: (start, end) => {
            state.from = start;
            state.to = end;
            return api;
          },
          order: async () => {
            requestedRange.push([state.from, state.to]);
            const pageIndex = state.from / pageSize;
            if (failPage === pageIndex) {
              return { data: null, error: new Error(`boom on page ${pageIndex}`) };
            }
            return {
              data: rows.slice(state.from, Math.min(state.to + 1, rows.length)),
              error: null,
            };
          },
        };
        return api;
      },
    }),
  };
}

function fakeClient(rows, { failPage } = {}) {
  const requestedRange = [];
  let currentFrom = 0;
  let currentTo = null;
  return {
    requestedRange,
    from: () => ({
      select: () => {
        const state = { from: currentFrom, to: currentTo };
        const api = {
          range: (start, end) => {
            state.from = start;
            state.to = end;
            return api;
          },
          order: async () => {
            requestedRange.push([state.from, state.to]);
            const page = state.from / POSTGREST_MAX_ROWS;
            if (failPage === page) {
              return { data: null, error: new Error(`boom on page ${page}`) };
            }
            return {
              data: rows.slice(state.from, Math.min(state.to + 1, rows.length)),
              error: null,
            };
          },
        };
        return api;
      },
    }),
  };
}

describe("readAllSupabaseRows pagination", () => {
  it("reads a table larger than one page in deterministic range windows", async () => {
    const rows = makeRows(2500);
    const client = fakeClient(rows);
    const result = await readAllSupabaseRows(client, "big_table", { order: "id" });

    expect(result.error).toBeNull();
    expect(result.truncated).toBe(false);
    expect(result.pages).toBe(3);
    expect(result.data).toHaveLength(2500);
    expect(result.data[0]).toEqual(rows[0]);
    expect(result.data[2499]).toEqual(rows[2499]);
    expect(client.requestedRange).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ]);
  });

  it("treats a full page as proof of more rows and probes the empty tail", async () => {
    // A page exactly as large as the window does NOT prove exhaustion - a
    // table with 1000+ rows also answers the first window with 1000 rows. The
    // helper must probe the next window and only quit on a short page, or a
    // 1000-row table's read would be indistinguishable from a 1000+ one.
    const rows = makeRows(POSTGREST_MAX_ROWS);
    const client = fakeClient(rows);
    const result = await readAllSupabaseRows(client, "exact_page", { order: "id" });

    expect(result.error).toBeNull();
    expect(result.truncated).toBe(false);
    expect(result.pages).toBe(2);
    expect(result.data).toHaveLength(POSTGREST_MAX_ROWS);
    expect(client.requestedRange).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
  });

  it("returns a truncated failure when a later page errors", async () => {
    const client = fakeClient(makeRows(2500), { failPage: 2 });
    const result = await readAllSupabaseRows(client, "flaky_table", { order: "id" });

    expect(result.error).not.toBeNull();
    expect(result.error.message).toContain("boom on page 2");
    expect(result.truncated).toBe(true);
    // Rows from the completed pages are still surfaced so callers can decide.
    expect(result.data).toHaveLength(2000);
    expect(client.requestedRange).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ]);
  });

  it("hits the safety valve instead of looping on a server that never reports a short page", async () => {
    // A sick server returns a full page for every range, forever.
    const lyingClient = {
      from: () => ({
        select: () => {
          const state = { from: 0, to: null };
          const api = {
            range: (start, end) => {
              state.from = start;
              state.to = end;
              return api;
            },
            order: async () => {
              return { data: makeRows(POSTGREST_MAX_ROWS), error: null };
            },
          };
          return api;
        },
      }),
    };

    const result = await readAllSupabaseRows(lyingClient, "unhinged", {
      order: "id",
      maxPages: 3,
    });

    expect(result.truncated).toBe(true);
    expect(result.error).not.toBeNull();
    expect(result.error.code).toBe("POSTGREST_PAGINATION_LIMIT");
    expect(result.pages).toBe(3);
    expect(result.data).toHaveLength(3 * POSTGREST_MAX_ROWS);
  });

  it("propagates a thrown client error as a truncated failure", async () => {
    const explodingClient = {
      from: () => ({
        select: () => {
          const api = {
            range: () => api,
            order: async () => {
              throw new Error("network dropped");
            },
          };
          return api;
        },
      }),
    };

    const result = await readAllSupabaseRows(explodingClient, "explosive", { order: "id" });
    expect(result.truncated).toBe(true);
    expect(result.error.message).toContain("network dropped");
  });
});

describe("readAllSupabaseRows with a shrunk pageSize (mutation: simulates a >cap table cheaply)", () => {
  // The real hazard this pins: PostgREST silently caps a request at 1000 rows,
  // so a table that outgrew the cap looks complete to a naive one-request
  // reader. The supabase-tables stores (wingman-app-store's 8 snapshot tables,
  // the competitor ledger mirror) gate every full-table read on this helper's
  // contract: `error` is non-null - and the store refuses the snapshot - unless
  // the walk PROVABLY reached the end of the table. These tests shrink the
  // pageSize so a small row count stands in for a >cap table, pinning that the
  // helper honours the shrunken window and never reports a truncated read as
  // complete.

  it("walks every shrunken window and serves the FULL table, never a one-window slice", async () => {
    const pageSize = 25;
    const rows = makeRows(60); // 60 rows vs a 25-row window: 3 pages, like 1500 vs 1000.
    const client = windowedClient(rows, { pageSize });

    const result = await readAllSupabaseRows(client, "small_cap_table", { order: "id", pageSize });

    expect(result.error).toBeNull();
    expect(result.truncated).toBe(false);
    expect(result.pages).toBe(3);
    expect(result.data).toHaveLength(60);
    expect(result.data[0]).toEqual(rows[0]);
    expect(result.data[59]).toEqual(rows[59]);
    // Deterministic window arithmetic under the shrunken cap.
    expect(client.requestedRange).toEqual([
      [0, 24],
      [25, 49],
      [50, 74],
    ]);
  });

  it("treats an exact multiple of the shrunken pageSize as NOT exhausted and probes the empty tail", async () => {
    const pageSize = 25;
    const rows = makeRows(50); // Exactly 2 windows: the second full window is not proof of the end.
    const client = windowedClient(rows, { pageSize });

    const result = await readAllSupabaseRows(client, "exact_shrunk", { order: "id", pageSize });

    expect(result.error).toBeNull();
    expect(result.truncated).toBe(false);
    expect(result.pages).toBe(3);
    expect(result.data).toHaveLength(50);
    expect(client.requestedRange).toEqual([
      [0, 24],
      [25, 49],
      [50, 74],
    ]);
  });

  it("surfaces a mid-table error at a shrunken window as truncated - the store gate refuses it", async () => {
    const pageSize = 25;
    const client = windowedClient(makeRows(60), { pageSize, failPage: 1 });

    const result = await readAllSupabaseRows(client, "flaky_shrunk", { order: "id", pageSize });

    expect(result.error).not.toBeNull();
    expect(result.error.message).toContain("boom on page 1");
    expect(result.truncated).toBe(true);
    // Rows from the completed window are surfaced, but the read is a hard
    // failure - a store that gates on `error` never serves this as a snapshot.
    expect(result.data).toHaveLength(25);
    expect(client.requestedRange).toEqual([
      [0, 24],
      [25, 49],
    ]);
  });

  it("the store gate is load-bearing: an unguarded one-window read silently serves a truncated snapshot", async () => {
    // The demonstration: if a store trusted a single Range request (the
    // pre-pagination behaviour, or a future regression that drops the loop),
    // the same 60-row / 25-row-cap table would come back as 25 rows with
    // `error: null` - indistinguishable from a complete table. readAllSupabaseRows
    // is the guard that makes the store's refusal meaningful.
    const pageSize = 25;
    const rows = makeRows(60);
    const client = windowedClient(rows, { pageSize });

    // Naive one-window read, as a truncating store implementation would issue.
    const naive = await client
      .from("small_cap_table")
      .select("*")
      .range(0, pageSize - 1)
      .order("id");
    expect(naive.error).toBeNull(); // looks complete...
    expect(naive.data).toHaveLength(pageSize); // ...but only the first window

    const guarded = await readAllSupabaseRows(client, "small_cap_table", { order: "id", pageSize });
    expect(guarded.error).toBeNull();
    expect(guarded.truncated).toBe(false);
    expect(guarded.data).toHaveLength(rows.length); // the whole table
  });
});