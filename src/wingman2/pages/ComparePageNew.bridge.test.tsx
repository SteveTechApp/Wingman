import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

vi.mock("./ComparePageNew.advanced", () => ({ default: () => <div>Advanced competitor comparison</div> }));
vi.mock("./BattleCardsPage", () => ({ default: () => <div>Competitor objection guidance</div> }));
import ComparePageNew from "./ComparePageNew";

describe("Compare route modes", () => {
  it("renders the current comparison workflow", () => {
    render(<MemoryRouter initialEntries={["/wingman/compare"]}><ComparePageNew /></MemoryRouter>);
    expect(screen.getByText("Advanced competitor comparison")).toBeInTheDocument();
  });

  it("opens objection guidance from the router URL", () => {
    render(<MemoryRouter initialEntries={["/wingman/compare?mode=battle-cards"]}><ComparePageNew /></MemoryRouter>);
    expect(screen.getByText("Competitor objection guidance")).toBeInTheDocument();
    expect(screen.queryByText("Advanced competitor comparison")).toBeNull();
  });
});
