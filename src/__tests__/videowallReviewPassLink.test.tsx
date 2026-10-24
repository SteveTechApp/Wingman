import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { UiModeProvider } from "../wingman2/data/uiMode";
import { WALL_REVIEW_PASS_KEY } from "../wingman2/lib/wallReviewPass";
import { wallLinkFromSearch, wallLinkToken } from "../wingman2/lib/wallLink";
import { wallStartingPointBrief } from "../wingman2/lib/wallStartingPoints";
import { VIDEO_WALL_DRAFT_KEY } from "../wingman2/lib/videowallDraft";
import { defaultWallRequirements, type WallRequirements } from "../wingman2/lib/videowallOptions";
import { wallPhysicalSize } from "../wingman2/lib/wallPhysicalSize";
import { VideoWallPage } from "../wingman2/pages/VideowallBuilderPage";

const UI_MODE_KEY = "wingman-ui-mode-v1";

/** Reads what a copied address bar would say, which is what a shared link is. */
function AddressBar() {
  const location = useLocation();
  return <p data-testid="address-bar">{`${location.pathname}${location.search}`}</p>;
}

function renderBuilder(entry = "/wingman/videowall") {
  return render(
    <UiModeProvider>
      <MemoryRouter initialEntries={[entry]}>
        <AddressBar />
        <VideoWallPage />
      </MemoryRouter>
    </UiModeProvider>,
  );
}

const address = () => screen.getByTestId("address-bar").textContent ?? "";
/** The address, split so a test can ask about the pass without the wall token. */
const addressParams = () => new URLSearchParams(address().split("?")[1] ?? "");

function wall(overrides: Partial<WallRequirements> = {}) {
  return { ...defaultWallRequirements, ...overrides };
}

describe("the builder's review pass in the URL", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    // The expert builder is where the pass rail is the whole page.
    window.localStorage.setItem(UI_MODE_KEY, "unguided");
  });

  it("opens the pass a shared link names, on a machine with no stored draft", () => {
    renderBuilder("/wingman/videowall?pass=transport");

    expect(screen.getByTestId("videowall-expert-panel-transport")).toBeTruthy();
    expect(screen.getByTestId("videowall-review-transport").getAttribute("aria-pressed")).toBe("true");
    expect(addressParams().get("pass")).toBe("transport");
    // The address names the wall beside the pass, so copying it shares both.
    expect(wallLinkFromSearch(addressParams())).toEqual(wallStartingPointBrief(defaultWallRequirements));
  });

  it("opens the expert reading for a link even where this device is in the focused view", async () => {
    window.localStorage.setItem(UI_MODE_KEY, "guided");

    renderBuilder("/wingman/videowall?pass=transport");

    await waitFor(() => expect(screen.getByTestId("videowall-expert-panel-transport")).toBeTruthy());
    expect(screen.queryByTestId("videowall-preset-filter-summary")).toBeNull();
  });

  it("puts the pass a rep chooses into the address bar", async () => {
    renderBuilder();

    fireEvent.click(screen.getByTestId("videowall-review-wall"));

    expect(screen.getByTestId("videowall-expert-panel-wall")).toBeTruthy();
    await waitFor(() => expect(addressParams().get("pass")).toBe("wall"));
  });

  it("writes a remembered pass into the link, so copying the page shares it", async () => {
    window.localStorage.setItem(WALL_REVIEW_PASS_KEY, "transport");

    renderBuilder();

    expect(screen.getByTestId("videowall-expert-panel-transport")).toBeTruthy();
    await waitFor(() => expect(addressParams().get("pass")).toBe("transport"));
  });

  it("drops the opening pass from the link but keeps the wall it shows", async () => {
    renderBuilder("/wingman/videowall?pass=wall");

    fireEvent.click(screen.getByTestId("videowall-review-decision"));

    await waitFor(() => expect(addressParams().get("pass")).toBeNull());
    expect(screen.getByTestId("videowall-expert-panel-decision")).toBeTruthy();
    expect(wallLinkFromSearch(addressParams())).not.toBeNull();
  });

  it("ignores a link whose pass names no stage rather than showing a blank review", async () => {
    renderBuilder("/wingman/videowall?pass=print");

    expect(screen.getByTestId("videowall-expert-panel-decision")).toBeTruthy();
    await waitFor(() => expect(addressParams().get("pass")).toBeNull());
  });
});

describe("the wall a builder link carries", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.localStorage.setItem(UI_MODE_KEY, "unguided");
  });

  it("opens the shared wall instead of this browser's saved draft", () => {
    window.localStorage.setItem(
      VIDEO_WALL_DRAFT_KEY,
      JSON.stringify({
        requirements: wall({ application: "lcd-loop", layout: "single", columns: 4, rows: 1, windows: 1 }),
        selectedId: "",
      }),
    );
    const shared = wall({ application: "projection", projectors: 2, layout: "single", windows: 1, sources: 2 });

    renderBuilder(`/wingman/videowall?wall=${wallLinkToken(shared)}`);

    // The sender's wall is on screen, not the four-panel one saved here.
    expect(screen.getAllByText(/2 projectors/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/4 × 1 array/)).toBeNull();
    // And the address still names it, so forwarding the page forwards the wall.
    expect(wallLinkFromSearch(addressParams())?.projectors).toBe(2);
  });

  it("keeps an edit the rep has not saved yet", async () => {
    const { unmount } = renderBuilder();

    fireEvent.click(screen.getByRole("button", { name: /One wide picture across two projectors/ }));
    fireEvent.click(screen.getByTestId("videowall-review-transport"));
    fireEvent.change(screen.getAllByLabelText(/Measured run for/)[0], { target: { value: "12" } });

    // The design is written as the rep edits, not only when they save it.
    await waitFor(() => {
      const draft = JSON.parse(window.localStorage.getItem(VIDEO_WALL_DRAFT_KEY) || "null");
      expect(Object.values(draft?.requirements?.measuredRuns ?? {})).toContain(12);
    });

    const draft = JSON.parse(window.localStorage.getItem(VIDEO_WALL_DRAFT_KEY)!);
    unmount();
    renderBuilder(`/wingman/videowall?wall=${wallLinkToken(draft.requirements)}&pass=transport`);

    // Reloading the builder's own address reopens the draft, which is newer than
    // the brief in the address, so the unsaved run is still on the wall.
    expect((screen.getAllByLabelText(/Measured run for/)[0] as HTMLInputElement).value).toBe("12");
  });

  it("keeps the survey when the address is the builder's own", async () => {
    const own = wall({
      application: "projection",
      projectors: 2,
      layout: "single",
      windows: 1,
      sources: 2,
      measuredRuns: { "display-1": 12 },
    });
    window.localStorage.setItem(VIDEO_WALL_DRAFT_KEY, JSON.stringify({ requirements: own, selectedId: "" }));

    renderBuilder(`/wingman/videowall?wall=${wallLinkToken(own)}`);

    // The page wrote this address itself while the rep was reading it, so it is
    // not news: the saved design reopens with the survey still on it.
    await waitFor(() => expect(screen.queryByTestId("videowall-shared-wall")).toBeNull());
    fireEvent.click(screen.getByTestId("videowall-review-transport"));
    const run = screen.getByLabelText("Measured run for Projector 1 (metres)") as HTMLInputElement;
    expect(run.value).toBe("12");
  });

  it("stops calling the wall shared once the rep starts again", () => {
    const shared = wall({ application: "projection", projectors: 2, layout: "single", windows: 1, sources: 2 });
    renderBuilder(`/wingman/videowall?wall=${wallLinkToken(shared)}`);
    expect(screen.getByTestId("videowall-shared-wall")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Start again" }));

    // The address now names the fresh wall, so the note would be describing a
    // design that is no longer on screen.
    expect(screen.queryByTestId("videowall-shared-wall")).toBeNull();
    expect(wallLinkFromSearch(addressParams())).toEqual(wallStartingPointBrief(defaultWallRequirements));
  });

  it("opens the focused result on the shared wall and says where it came from", () => {
    window.localStorage.setItem(UI_MODE_KEY, "guided");
    const shared = wall({ application: "projection", projectors: 2, layout: "single", windows: 1, sources: 2 });

    renderBuilder(`/wingman/videowall?wall=${wallLinkToken(shared)}`);

    // The recipient lands on the design, not on the preset picker, and the
    // page says the wall arrived with the link rather than from this browser.
    expect(screen.getByTestId("videowall-wizard")).toBeTruthy();
    const banner = screen.getByTestId("videowall-shared-wall");
    // The banner names what the rep is looking at, in the confirmation's own
    // display phrase, rather than only saying that a link arrived.
    expect(banner.textContent).toContain(`the ${shared.columns} × ${shared.rows} array, ${wallPhysicalSize(shared).basis}`);
    expect(screen.getAllByText(/2 projectors/).length).toBeGreaterThan(0);
  });

  it("puts the wall a rep is editing into the address, so a copied link opens it", async () => {
    renderBuilder();

    fireEvent.click(screen.getByRole("button", { name: /One wide picture across two projectors/ }));

    await waitFor(() => expect(wallLinkFromSearch(addressParams())?.projectors).toBe(2));
    expect(wallLinkFromSearch(addressParams())?.application).toBe("projection");
  });

  it("keeps the survey off the link", async () => {
    renderBuilder();

    fireEvent.click(screen.getByRole("button", { name: /One wide picture across two projectors/ }));
    fireEvent.click(screen.getByTestId("videowall-review-transport"));
    const runs = screen.getAllByLabelText(/Measured run for/)[0] as HTMLInputElement;
    fireEvent.change(runs, { target: { value: "12" } });

    await waitFor(() => expect(wallLinkFromSearch(addressParams())?.projectors).toBe(2));
    // A measurement belongs to one room: the link names the wall, not the site.
    expect(wallLinkFromSearch(addressParams())?.measuredRuns).toEqual({});
  });
});
