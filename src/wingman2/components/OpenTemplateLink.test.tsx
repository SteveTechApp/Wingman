/**
 * Five surfaces print this link, so its three facts — the wording, the
 * destination and the accessible name — are pinned here rather than once per
 * surface. A surface decides how the link looks; it no longer decides what it
 * says.
 */
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { ReactNode } from "react";
import { routeCatalogByKey } from "../app/routeCatalog";
import { OpenTemplateLink } from "./OpenTemplateLink";

function renderLink(node: ReactNode) {
  return render(<MemoryRouter>{node}</MemoryRouter>);
}

describe("OpenTemplateLink", () => {
  it("prints the one wording the app uses, and opens the template's own route", () => {
    renderLink(<OpenTemplateLink template={{ id: "tpl-1", name: "Acme standard room" }} />);

    const link = screen.getByRole("link", { name: "Open template: Acme standard room" });
    expect(link.textContent).toBe("Open template: Acme standard room");
    expect(link.getAttribute("href")).toBe(`${routeCatalogByKey.templates.path}/tpl-1`);
    // The wording is also the accessible name, so the link is announced as an
    // action rather than as a bare design name.
    expect(link.getAttribute("aria-label")).toBe("Open template: Acme standard room");
  });

  it("keeps the verb in the accessible name when a surface splits it off for a phone", () => {
    renderLink(
      <OpenTemplateLink
        template={{ id: "tpl-2", name: "Northbridge room" }}
        verbClassName="wm-guided-recent-template-verb"
      />,
    );

    const link = screen.getByRole("link", { name: "Open template: Northbridge room" });
    // The verb is its own element, which is what a narrow column hides: the name
    // then leads on screen, and the announcement still says what the link does.
    expect(link.querySelector(".wm-guided-recent-template-verb")?.textContent).toBe(
      "Open template: ",
    );
    expect(link.textContent).toBe("Open template: Northbridge room");
  });

  it("leaves the mark and the trailing node either side of the wording", () => {
    renderLink(
      <OpenTemplateLink
        template={{ id: "tpl-3", name: "Retail pod" }}
        className="wm-project-template-lineage__link"
        labelClassName="wm-project-template-lineage__name"
        icon={<span data-testid="mark" />}
        trailing={<span data-testid="arrow">→</span>}
      />,
    );

    const link = screen.getByRole("link");
    expect(link.className).toBe("wm-project-template-lineage__link");
    expect(link.firstElementChild).toBe(screen.getByTestId("mark"));
    expect(link.querySelector(".wm-project-template-lineage__name")?.textContent).toBe(
      "Open template: Retail pod",
    );
    expect(link.lastElementChild).toBe(screen.getByTestId("arrow"));
  });
});
