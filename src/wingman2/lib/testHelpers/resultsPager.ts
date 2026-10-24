import { fireEvent, screen, within } from "@testing-library/react";
import { expect } from "vitest";

/**
 * The pager `PagedItems` renders, stated as numbers rather than markup.
 *
 * Every paged list in the app shows the same control — a nav labelled "Results
 * pages" reading "5–8 of 12" — so a caller's paging contract is the window it
 * shows, the window the arrow lands on, and whether it offers a pager at all.
 * Reading the window through that nav also proves there is exactly one pager in
 * the scope being tested: a second one makes the lookup throw rather than pass
 * against whichever came first.
 */

const WINDOW = /^(\d+)–(\d+) of (\d+)$/;

function pager(scope?: HTMLElement) {
  return (scope ? within(scope) : screen).getByRole("navigation", { name: "Results pages" });
}

/** The window the pager is showing, as numbers a caller can assert against. */
export function resultsWindow(scope?: HTMLElement) {
  const text = within(pager(scope)).getByText(WINDOW).textContent ?? "";
  const [, from, to, total] = WINDOW.exec(text)!;
  return { from: Number(from), to: Number(to), total: Number(total) };
}

/** Assert the pager shows exactly this window of results. */
export function expectResultsWindow(from: number, to: number, total: number, scope?: HTMLElement) {
  expect(resultsWindow(scope)).toEqual({ from, to, total });
}

/** Turn the page once and assert the window it lands on. */
export function turnResultsPage(from: number, to: number, total: number, scope?: HTMLElement) {
  const nav = pager(scope);
  fireEvent.click(within(nav).getByRole("button", { name: "Next results" }));
  expectResultsWindow(from, to, total, scope);
}

/** Assert the list fits one page, so no pager is offered. */
export function expectNoResultsPager(scope?: HTMLElement) {
  expect((scope ? within(scope) : screen).queryByRole("navigation", { name: "Results pages" })).toBeNull();
}
