import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AV_GLOSSARY_CATEGORIES, AV_GLOSSARY_TERMS } from "../data/avGlossary";
import { GlossaryPage } from "./GlossaryPage";

describe("glossary paging reset", () => {
  it("returns to the first page on a category change, and leaves the page alone on a term click", () => {
    // The whole glossary is longer than one page, so both arrows are on screen.
    const total = AV_GLOSSARY_TERMS.length;
    expect(total).toBeGreaterThan(8);

    render(
      <MemoryRouter initialEntries={["/wingman/glossary"]}>
        <GlossaryPage />
      </MemoryRouter>,
    );

    expect(screen.getByText(`1–8 of ${total}`)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Next results" }));
    expect(screen.getByText(`9–16 of ${total}`)).toBeTruthy();

    // Reading a term is not narrowing the list: the definition opens and the
    // page the rep was scanning stays where it was.
    const ninthTerm = AV_GLOSSARY_TERMS[8];
    fireEvent.click(screen.getByText(ninthTerm.term));
    expect(screen.getAllByRole("heading").some((heading) => heading.textContent?.includes(ninthTerm.term))).toBe(true);
    expect(screen.getByText(`9–16 of ${total}`)).toBeTruthy();

    // A category is a filter, so the list returns to its first page — even one
    // that still needs two pages of its own.
    const twoPageCategory = AV_GLOSSARY_CATEGORIES.find(
      (category) => AV_GLOSSARY_TERMS.filter((term) => term.category === category).length > 8,
    );
    expect(twoPageCategory).toBeTruthy();
    const categoryTotal = AV_GLOSSARY_TERMS.filter((term) => term.category === twoPageCategory).length;
    // The category row's buttons are the pressed ones; a term button carries its
    // own category as text, so match on the pressed state rather than the name.
    const categoryButton = screen.getAllByRole("button").find(
      (button) => button.hasAttribute("aria-pressed") && button.textContent?.startsWith(twoPageCategory!),
    );
    expect(categoryButton).toBeTruthy();
    fireEvent.click(categoryButton!);
    expect(screen.getByText(`1–8 of ${categoryTotal}`)).toBeTruthy();
    expect(screen.queryByText(`9–16 of ${total}`)).toBeNull();
  });
});
