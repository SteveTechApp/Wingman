/**
 * Reads EVERY row of a Supabase table by paging past PostgREST's response cap.
 *
 * PostgREST silently returns at most 1000 rows per request (the default
 * `max-rows` limit) unless you ask for range-specific pages. A naive
 * `select("*")` on a table that has grown past 1000 rows therefore returns a
 * truncated dataset with no error - and in this codebase a truncated read is
 * not merely a missing row: the Supabase-tables snapshot write (`deleteRowsNotIn`)
 * and the ledger's stale-row cleanup delete rows *not present in the read*, so
 * a truncated read permanently DELETES the unread tail. Every full-table read
 * must therefore page until it provably reaches the end of the table.
 *
 * Deterministic pagination:
 *   - Each request fetches a `Range: <from>-<to>` window of `pageSize` rows.
 *   - A response shorter than `pageSize` proves the table is exhausted, so the
 *     helper stops and reports success with the number of pages fetched.
 *   - A `maxPages` guard turns a pathological server (one that rep lies about
 *     the table being exhausted) into a loud error instead of an unbounded
 *     request loop.
 *   - An explicit `order` column gives PostgREST a stable, non-overlapping page
 *     boundary; `id` is the default because every table this helper is used
 *     against has one.
 *
 * Returns a supabase-js-shaped `{ data, error }` (plus metadata) so callers can
 * keep their existing error handling: `error` is null only when the whole table
 * was read, `truncated: true` signals a read that did not reach the end.
 */

export const POSTGREST_MAX_ROWS = 1000;

// The code stamped on the safety-valve error when a table never reports a
// short page. Exported so callers can branch on truncation via
// result.errorCode === POSTGREST_PAGINATION_LIMIT instead of matching
// message text.
export const POSTGREST_PAGINATION_LIMIT = "POSTGREST_PAGINATION_LIMIT";
const DEFAULT_MAX_PAGES = 100;

export async function readAllSupabaseRows(
  client,
  table,
  { select = "*", order = "id", ascending = true, pageSize = POSTGREST_MAX_ROWS, maxPages = DEFAULT_MAX_PAGES } = {},
) {
  const rows = [];
  let from = 0;

  for (let page = 1; page <= maxPages; page += 1) {
    let query = client.from(table).select(select).range(from, from + pageSize - 1);
    if (order) query = query.order(order, { ascending });

    let data;
    let error;
    try {
      ({ data, error } = await query);
    } catch (reason) {
      return {
        data: rows,
        error: reason instanceof Error ? reason : new Error(String(reason)),
        pages: page - 1,
        truncated: true,
      };
    }

    if (error) {
      return { data: rows, error, pages: page - 1, truncated: true };
    }

    const chunk = Array.isArray(data) ? data : [];
    rows.push(...chunk);

    // A short page (or an empty one) proves the table is fully read.
    if (chunk.length < pageSize) {
      return { data: rows, error: null, pages: page, truncated: false };
    }

    from += pageSize;
  }

  // Every page came back full and we hit the safety valve: the server never
  // reported an exhausted table, so we cannot claim a complete read.
  const limitError = new Error(
    `Table "${table}" exceeded ${pageSize * maxPages} rows without reporting a short page; ` +
      "pagination stopped at the safety valve and the read may be incomplete.",
  );
  limitError.code = POSTGREST_PAGINATION_LIMIT;
  return { data: rows, error: limitError, pages: maxPages, truncated: true };
}