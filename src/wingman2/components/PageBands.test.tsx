import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { PageBandPanel, PageBandRail } from "./PageBands";
import { bandKeyAt, bandNeighbours } from "../lib/pageBands";

const ladder = [
  { key: "one", label: "First", next: "Continue to the second" },
  { key: "two", label: "Second", back: "Back to the first", next: "Continue to the third" },
  { key: "three", label: "Third", back: "Back to the second" },
] as const;

it("presses the open band and says what the others are", () => {
  render(<PageBandRail label="Bands" bands={ladder} active="two" onSelect={() => {}} testIdPrefix="probe" />);

  expect(screen.getByRole("navigation", { name: "Bands" })).toBeTruthy();
  expect(screen.getByTestId("probe-two").getAttribute("aria-pressed")).toBe("true");
  expect(screen.getByTestId("probe-one").getAttribute("aria-pressed")).toBe("false");
  expect(screen.getByTestId("probe-three").textContent).toContain("3");
});

it("reports the band a rep picks", () => {
  let picked = "";
  render(<PageBandRail label="Bands" bands={ladder} active="one" onSelect={(key) => { picked = key; }} testIdPrefix="probe" />);

  fireEvent.click(screen.getByTestId("probe-three"));
  expect(picked).toBe("three");
});

it("prints a status line only when the surface has one", () => {
  render(<PageBandRail label="Bands" bands={[{ ...ladder[0], status: "8 of 16 links" }, ladder[1]]} active="one" onSelect={() => {}} testIdPrefix="probe" />);

  expect(screen.getByText("8 of 16 links")).toBeTruthy();
  expect(screen.getByTestId("probe-two").querySelector("small")).toBeNull();
});

it("renders the open band and nothing behind it", () => {
  const { rerender } = render(<PageBandPanel band="one" of="one" testIdPrefix="probe">First reading</PageBandPanel>);
  expect(screen.getByTestId("probe-panel-one").textContent).toBe("First reading");

  rerender(<PageBandPanel band="two" of="one" testIdPrefix="probe">First reading</PageBandPanel>);
  expect(screen.queryByTestId("probe-panel-one")).toBeNull();
});

it("reads a ladder: an unknown key opens the first band, and the nav sits either side", () => {
  expect(bandKeyAt(ladder, null)).toBe("one");
  expect(bandKeyAt(ladder, "gone")).toBe("one");
  expect(bandKeyAt(ladder, "three")).toBe("three");
  expect(bandNeighbours(ladder, "two").previous?.key).toBe("one");
  expect(bandNeighbours(ladder, "two").next?.key).toBe("three");
  expect(bandNeighbours(ladder, "one").previous).toBeUndefined();
  expect(bandNeighbours(ladder, "three").next).toBeUndefined();
});