import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";
import { expect, it } from "vitest";
import { VideowallResultPages } from "./VideowallResultPages";

function Harness() {
  const location = useLocation();
  const navigate = useNavigate();
  return <>
    <output data-testid="address">{location.search}</output>
    <button onClick={() => navigate(-1)}>Browser back</button>
    <VideowallResultPages pages={{ brief: "Brief content", recommendation: "Recommendation content", layout: "Layout content", survey: "Survey content", save: "Save content" }} />
  </>;
}

it("restores a linked section and keeps the wall and other query parameters while navigating", () => {
  render(<MemoryRouter initialEntries={["/wingman/videowall?wall=1.e30&section=layout&pick=nhd500"]}><Harness /></MemoryRouter>);
  expect(screen.getByText("Layout content")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Continue to cabling & survey" }));
  expect(screen.getByText("Survey content")).toBeTruthy();
  expect(screen.queryByText("Layout content")).toBeNull();
  const params = new URLSearchParams(screen.getByTestId("address").textContent || "");
  expect(params.get("wall")).toBe("1.e30");
  expect(params.get("pick")).toBe("nhd500");
  expect(params.get("section")).toBe("survey");
  fireEvent.click(screen.getByRole("button", { name: "Browser back" }));
  expect(screen.getByText("Layout content")).toBeTruthy();
});

it("opens a legacy or invalid section on the brief", () => {
  render(<MemoryRouter initialEntries={["/wingman/videowall?wall=1.e30&section=unknown"]}><Harness /></MemoryRouter>);
  expect(screen.getByText("Brief content")).toBeTruthy();
  expect(screen.queryByText("Survey content")).toBeNull();
  expect(screen.getByTestId("videowall-section-brief").getAttribute("aria-current")).toBe("step");
});
