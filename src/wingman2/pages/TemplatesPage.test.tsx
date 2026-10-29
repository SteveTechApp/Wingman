import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes, useParams } from "react-router-dom";
import { roomTemplates } from "../lib/roomTemplates";
import { templateMatchesMarketFilter } from "../lib/templateMarkets";
import { readDiscoveryHandoff } from "../lib/discoveryTemplateHandoff";
import { expectResultsWindow, turnResultsPage } from "../lib/testHelpers/resultsPager";
import type { CustomRoomTemplate } from "../lib/customRoomTemplates";
import { HOUSE_DOCUMENT_BRAND } from "../lib/solutionTemplates";
import { WALL_ENTRY_INTRO, WALL_ENTRY_NAME } from "../lib/wallEntry";
import { routeCatalogByKey } from "../app/routeCatalog";
import { TemplatesPage } from "./TemplatesPage";

const mode = vi.hoisted(() => ({ isGuided: true }));
vi.mock("../data/uiMode", () => ({ useUiMode: () => mode }));
vi.mock("../lib/customRoomTemplates", async importOriginal => ({
  ...await importOriginal<typeof import("../lib/customRoomTemplates")>(),
  useCustomRoomTemplates: () => [customTemplate],
}));

const customTemplate: CustomRoomTemplate = {
  ...roomTemplates[0], id: "saved-custom-room", name: "Saved custom room",
  customTemplate: true, createdAt: "2026-10-23", updatedAt: "2026-10-23",
  schemaVersion: 3, discoveryAnswers: { displays: "2" }, discoveryNotes: {},
};

function EditorDestination() {
  return <div>Editing {useParams().id}</div>;
}

afterEach(() => { cleanup(); sessionStorage.clear(); localStorage.clear(); });

it.each([true, false])("edits the original custom template in guided=%s", isGuided => {
  mode.isGuided = isGuided;
  render(<MemoryRouter initialEntries={["/wingman/templates"]}><Routes>
    <Route path="/wingman/templates" element={<TemplatesPage />} />
    <Route path="/wingman/templates/:id/edit" element={<EditorDestination />} />
    <Route path="/wingman/templates/:id" element={<div>Review destination</div>} />
  </Routes></MemoryRouter>);
  fireEvent.click(screen.getByRole("button", { name: "Custom" }));
  fireEvent.click(screen.getByText("Manage custom template"));
  fireEvent.click(screen.getByRole("button", { name: "Edit" }));
  expect(screen.getByText("Editing saved-custom-room")).toBeTruthy();
  expect(readDiscoveryHandoff()).toMatchObject({
    mode: "template-edit", templateId: customTemplate.id, answers: customTemplate.discoveryAnswers,
  });
});

it("names the wall entry and says where a wall design begins", () => {
  mode.isGuided = true;
  render(<MemoryRouter initialEntries={["/wingman/templates"]}><Routes>
    <Route path="/wingman/templates" element={<TemplatesPage />} />
    <Route path="/wingman/templates/:id" element={<div>Review destination</div>} />
  </Routes></MemoryRouter>);

  // The same name and the same beginning the two Home readings offer. An action
  // row has no space for the sentence, so it travels as the link's description
  // rather than being dropped or left to this page to invent its own.
  const entry = screen.getByRole("link", { name: WALL_ENTRY_NAME });
  expect(entry.getAttribute("href")).toBe(routeCatalogByKey.videowall.path);
  expect(entry.getAttribute("title")).toBe(WALL_ENTRY_INTRO);
});

it("applies the organisation's saved defaults to the draft on request, and keeps the words", () => {
  mode.isGuided = true;
  render(<MemoryRouter initialEntries={["/wingman/templates"]}><Routes>
    <Route path="/wingman/templates" element={<TemplatesPage />} />
    <Route path="/wingman/templates/:id" element={<div>Review destination</div>} />
  </Routes></MemoryRouter>);

  fireEvent.click(screen.getByRole("button", { name: "Custom" }));
  // Personalising a card opens the preview; the configure step is the drawer's
  // own Personalise action.
  fireEvent.click(screen.getAllByRole("button", { name: "Personalise" })[0]);
  fireEvent.click(screen.getByRole("button", { name: "Personalise" }));

  // How much document a draft prints is the Detail level's decision. The drawer
  // used to offer per-section switches whose sections the document does not have
  // (see `DocumentPersonalisation`), so no rep can set one that changes nothing.
  expect(screen.queryByText("Output structure")).toBeNull();
  expect(screen.queryByLabelText("Optional upgrade section")).toBeNull();

  // A rep's own wording and their earlier brand choice, before Settings moves.
  fireEvent.change(screen.getByLabelText("Document title"), { target: { value: "Northbridge AV" } });
  fireEvent.change(screen.getByLabelText("Primary colour"), { target: { value: "#000000" } });
  // Who this document is for and how deep it goes, chosen for this customer.
  fireEvent.change(screen.getByLabelText("Audience"), { target: { value: "Integrator" } });
  fireEvent.change(screen.getByLabelText("Detail"), { target: { value: "Technical" } });

  localStorage.setItem(
    "wingman-organisation-document-settings-v1",
    JSON.stringify({ font: "Inter", footer: "Acme AV" }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Use document defaults" }));

  // The two stored values arrive; a setting the organisation never chose falls
  // back to the house table rather than to blank.
  expect((screen.getByLabelText("Font") as HTMLInputElement).value).toBe("Inter");
  expect((screen.getByLabelText("Footer") as HTMLInputElement).value).toBe("Acme AV");
  expect((screen.getByLabelText("Primary colour") as HTMLInputElement).value)
    .toBe(HOUSE_DOCUMENT_BRAND.primaryColour);
  expect((screen.getByLabelText("Disclaimer") as HTMLTextAreaElement).value)
    .toBe(HOUSE_DOCUMENT_BRAND.disclaimer);

  // The draft's own words are not brand, so taking the brand leaves them alone.
  expect((screen.getByLabelText("Document title") as HTMLInputElement).value).toBe("Northbridge AV");
  // Nor are the audience and detail: a rep who only wanted the new colours and
  // font keeps the reader they picked, even though Settings can seed those two.
  expect((screen.getByLabelText("Audience") as HTMLSelectElement).value).toBe("Integrator");
  expect((screen.getByLabelText("Detail") as HTMLSelectElement).value).toBe("Technical");
  expect(screen.getByTestId("template-brand-defaults-note").textContent).toContain("defaults applied");
  expect(screen.getByTestId("template-brand-defaults-note").textContent).toContain("audience, detail and words are unchanged");
});

it("returns to the first page on a market change, and leaves the page alone on a card click", () => {
  mode.isGuided = true;
  const inMarket = (market: string) => roomTemplates.filter(template => templateMatchesMarketFilter(template, market)).length;
  const education = inMarket("Education");
  const hospitality = inMarket("Hospitality");
  // Eight cards fit a page, so both markets need an arrow: the second page is
  // what a filter change has to undo.
  expect(education).toBeGreaterThan(8);
  expect(hospitality).toBeGreaterThan(8);

  render(<MemoryRouter initialEntries={["/wingman/templates"]}><Routes>
    <Route path="/wingman/templates" element={<TemplatesPage />} />
    <Route path="/wingman/templates/:id" element={<div>Review destination</div>} />
  </Routes></MemoryRouter>);

  fireEvent.click(screen.getByRole("button", { name: "Education" }));
  expectResultsWindow(1, 8, education);
  turnResultsPage(9, education, education);

  // Personalising a card opens the preview over the list; closing it returns the
  // rep to the page they were reading, because no filter moved.
  fireEvent.click(screen.getAllByRole("button", { name: "Personalise" })[0]);
  expect(screen.getByRole("dialog")).toBeTruthy();
  expectResultsWindow(9, education, education);
  fireEvent.click(screen.getAllByRole("button", { name: "Close template preview" })[0]);
  expectResultsWindow(9, education, education);

  // A market is a filter, so it returns the list to its first page.
  fireEvent.click(screen.getByRole("button", { name: "Hospitality" }));
  expectResultsWindow(1, 8, hospitality);
});
