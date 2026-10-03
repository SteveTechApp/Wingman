import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { WorkflowPages } from "./WorkflowPages";
import { PagedItems } from "./PagedItems";

function Example() {
  const [value, setValue] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  return <><output>{location.search}</output><button onClick={() => navigate(-1)}>Browser back</button>
    <WorkflowPages label="Design pages" pages={[
      { id: "room", label: "Room", content: <label>Room name<input value={value} onChange={(e) => setValue(e.target.value)} /></label> },
      { id: "review", label: "Review", content: <p>Review {value}</p> },
    ]} /></>;
}

describe("focused workflow navigation", () => {
  it("preserves query context and entered values through page changes and browser back", () => {
    render(<MemoryRouter initialEntries={["/design?projectId=123"]}><Example /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText("Room name"), { target: { value: "Lecture hall" } });
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(screen.getByText("Review Lecture hall")).toBeVisible();
    expect(screen.queryByLabelText("Room name")).toBeNull();
    expect(screen.getByText("?projectId=123&view=review")).toBeVisible();
    expect(screen.getByRole("region", { name: "Review" })).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Browser back" }));
    expect(screen.getByLabelText("Room name")).toHaveValue("Lecture hall");
  });

  it("opens deep links and safely handles an unknown page", () => {
    const view = render(<MemoryRouter initialEntries={["/design?view=review"]}><Example /></MemoryRouter>);
    expect(screen.getByRole("button", { name: "Review" })).toHaveAttribute("aria-current", "page");
    view.unmount();
    render(<MemoryRouter initialEntries={["/design?view=missing"]}><Example /></MemoryRouter>);
    expect(screen.getByLabelText("Room name")).toBeVisible();
  });

  it("bounds results and resets pagination when filters change", () => {
    const items = Array.from({ length: 10 }, (_, index) => `Product ${index + 1}`);
    const content = (key: string) => <PagedItems items={items} pageSize={4} resetKey={key}>{(page) => <ul>{page.map((item) => <li key={item}>{item}</li>)}</ul>}</PagedItems>;
    const view = render(content("all"));
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
    fireEvent.click(screen.getByRole("button", { name: "Next results" }));
    expect(screen.getByText("Product 5")).toBeVisible();
    view.rerender(content("new filter"));
    expect(screen.getByText("Product 1")).toBeVisible();
    expect(screen.queryByText("Product 5")).toBeNull();
  });
});
