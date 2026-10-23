import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultWallRequirements } from "../../lib/videowallOptions";
import { wallTransportPlan } from "../../lib/videowallTransport";
import { WALL_SURVEY_HEADER } from "../../lib/wallSurvey";
import { readWallSurveyPhotos } from "../../lib/wallSurveyScan";
import { VideowallTransport } from "./VideowallTransport";

// Only the model call is stubbed: the review, the confidence tones and the
// accepted-subset merge are the real module, because they are what the rep sees.
vi.mock("../../lib/wallSurveyScan", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/wallSurveyScan")>();
  return {
    ...actual,
    readWallSurveyPhotos: vi.fn(async () => ({
      scan: {
        readings: [
          {
            id: "source-1",
            label: "Source 1",
            metres: 4.5,
            confidence: 0.82,
            note: "Clear handwriting.",
            detail: { enclosure: "Back box" },
          },
          {
            id: "display-2",
            label: "Panel 2",
            metres: 6,
            confidence: 0.41,
            note: "Digit smudged.",
            detail: {},
          },
        ],
        runs: [{ id: "source-1", metres: 4.5 }],
        details: [{ id: "source-1", detail: { enclosure: "Back box" } }],
        unread: ["display-1"],
        blank: [],
        problems: [],
        summary: "Two rows legible.",
        confidence: 0.7,
        photoCount: 1,
      },
      failures: [],
    })),
  };
});

function plan(overrides: Partial<typeof defaultWallRequirements> = {}) {
  return wallTransportPlan({ ...defaultWallRequirements, ...overrides });
}

describe("VideowallTransport measured runs", () => {
  it("shows the saved measurement and records one per link", () => {
    const onChange = vi.fn();
    render(
      <VideowallTransport
        plan={plan({ columns: 2, rows: 1, sources: 1 })}
        measuredRuns={{ "source-1": 3 }}
        onMeasure={onChange}
      />,
    );

    expect(screen.getByLabelText("Measured run for Source 1 (metres)")).toHaveValue(3);
    expect(screen.getByLabelText("Measured run for Panel 1 (metres)")).toHaveValue(null);

    fireEvent.change(screen.getByLabelText("Measured run for Panel 2 (metres)"), { target: { value: "8" } });
    expect(onChange).toHaveBeenCalledWith(["display-2"], 8);
  });

  it("applies a folded row's measurement to every link it covers", () => {
    const onChange = vi.fn();
    render(
      <VideowallTransport
        plan={plan({ layout: "independent", columns: 4, rows: 4, sources: 1 })}
        onMeasure={onChange}
      />,
    );

    fireEvent.change(screen.getByLabelText("Measured run for Panel 12–16 (metres)"), { target: { value: "6" } });
    expect(onChange).toHaveBeenCalledWith(
      ["display-12", "display-13", "display-14", "display-15", "display-16"],
      6,
    );
  });

  it("prints the over-limit link's measured run in the length column", () => {
    render(
      <VideowallTransport
        plan={plan({ layout: "independent", columns: 2, rows: 1, sources: 1, measuredRuns: { "display-2": 9 } })}
      />,
    );

    expect(screen.getAllByText("HDMI 2.0 copper (passive)").length).toBeGreaterThan(0);
    expect(screen.getByText("9 m measured · 5 m passive limit")).toBeTruthy();
    expect(screen.getByText(/The measured 9 m run exceeds the 5 m passive HDMI limit/)).toBeTruthy();
  });
});

describe("VideowallTransport cable fix", () => {
  const requirements = {
    ...defaultWallRequirements,
    layout: "independent" as const,
    columns: 2,
    rows: 1,
    sources: 1,
    measuredRuns: { "display-2": 9 },
  };

  it("offers the cable change that clears an over-limit run, in the row it flags", () => {
    const onRequirementsChange = vi.fn();
    render(
      <VideowallTransport
        plan={wallTransportPlan(requirements)}
        requirements={requirements}
        measuredRuns={requirements.measuredRuns}
        onMeasure={vi.fn()}
        onRequirementsChange={onRequirementsChange}
      />,
    );

    const fix = screen.getByRole("button", { name: "Use fibre extender" });
    expect(fix.getAttribute("data-transport-fix")).toBe("display-2");
    fireEvent.click(fix);

    const next = onRequirementsChange.mock.calls[0][0];
    // The cable changes; the measurement the rep took does not.
    expect(next.linkTransports).toEqual({ "display-2": { cable: "fibre", segments: 1 } });
    expect(next.measuredRuns).toEqual({ "display-2": 9 });
    // And the design now clears the limit it was flagged for.
    expect(wallTransportPlan(next).counts.limit).toBe(0);
  });

  it("splits a run past one fibre span into regenerated segments", () => {
    const onRequirementsChange = vi.fn();
    const far = { ...requirements, measuredRuns: { "display-2": 640 } };
    render(
      <VideowallTransport
        plan={wallTransportPlan(far)}
        requirements={far}
        measuredRuns={far.measuredRuns}
        onMeasure={vi.fn()}
        onRequirementsChange={onRequirementsChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Split into regenerated fibre segments" }));

    expect(onRequirementsChange.mock.calls[0][0].linkTransports).toEqual({
      "display-2": { cable: "fibre", segments: 3 },
    });
  });

  it("offers no fix where the design cannot keep it, or the run already fits", () => {
    const { unmount } = render(
      <VideowallTransport
        plan={wallTransportPlan(requirements)}
        requirements={requirements}
        measuredRuns={requirements.measuredRuns}
        onMeasure={vi.fn()}
      />,
    );
    // Without a caller that owns the answers there is nothing to change.
    expect(document.querySelector("[data-transport-fix]")).toBeNull();
    unmount();

    render(
      <VideowallTransport
        plan={plan()}
        requirements={defaultWallRequirements}
        onMeasure={vi.fn()}
        onRequirementsChange={vi.fn()}
      />,
    );
    expect(document.querySelector("[data-transport-fix]")).toBeNull();
  });
});

describe("VideowallTransport install detail", () => {
  it("shows display-end cells on display links and records a typed one", () => {
    const onLinkDetails = vi.fn();
    render(
      <VideowallTransport
        plan={plan({ columns: 2, rows: 1, sources: 1 })}
        linkDetails={{ "display-1": { enclosure: "Back box" } }}
        onMeasure={vi.fn()}
        onLinkDetails={onLinkDetails}
      />,
    );

    expect(screen.getByLabelText("Display housing for Panel 1")).toHaveValue("Back box");
    expect(screen.queryByLabelText(/Display housing for Source 1/)).toBeNull();
    expect(screen.getByText("Run only · source end")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Termination for Panel 2"), {
      target: { value: "HDMI faceplate" },
    });
    expect(onLinkDetails).toHaveBeenCalledWith({
      "display-1": { enclosure: "Back box" },
      "display-2": { termination: "HDMI faceplate" },
    });
  });

  it("records one mount per display", () => {
    const onDisplayMounts = vi.fn();
    render(
      <VideowallTransport
        plan={plan({ columns: 2, rows: 1, sources: 1 })}
        requirements={{ ...defaultWallRequirements, columns: 2, rows: 1, sources: 1 }}
        displayMounts={{ "display-1": "Wall bracket" }}
        onDisplayMounts={onDisplayMounts}
      />,
    );
    expect(screen.getByLabelText("Mount for Panel 1")).toHaveValue("Wall bracket");
    fireEvent.change(screen.getByLabelText("Mount for Panel 2"), { target: { value: "Ceiling drop" } });
    expect(onDisplayMounts).toHaveBeenCalledWith({ "display-1": "Wall bracket", "display-2": "Ceiling drop" });
  });

  it("writes a folded row's install detail to every link it covers", () => {
    const onLinkDetails = vi.fn();
    render(
      <VideowallTransport
        plan={plan({ layout: "independent", columns: 4, rows: 4, sources: 1 })}
        onMeasure={vi.fn()}
        onLinkDetails={onLinkDetails}
      />,
    );

    fireEvent.change(screen.getByLabelText("Display housing for Panel 12–16"), { target: { value: "Back box" } });
    expect(onLinkDetails).toHaveBeenCalledWith({
      "display-12": { enclosure: "Back box" },
      "display-13": { enclosure: "Back box" },
      "display-14": { enclosure: "Back box" },
      "display-15": { enclosure: "Back box" },
      "display-16": { enclosure: "Back box" },
    });
  });

  it("shows recorded install detail in the read-only proposal view", () => {
    render(
      <VideowallTransport
        plan={plan({ columns: 2, rows: 1, sources: 1 })}
        linkDetails={{ "display-2": { enclosure: "Back box", termination: "HDMI faceplate" } }}
        displayMounts={{ "display-2": "Wall bracket" }}
      />,
    );

    expect(screen.getByText("Back box · HDMI faceplate · Mount: Wall bracket")).toBeTruthy();
    expect(screen.getAllByText("Not recorded").length).toBeGreaterThan(0);
    expect(screen.queryByLabelText("Display housing for Panel 2")).toBeNull();
  });
});

describe("VideowallTransport survey sheet", () => {
  // jsdom has no blob URLs, so the download test lends them out and gives back
  // exactly what the environment had.
  const urlApi = URL as unknown as Record<string, unknown>;
  const savedUrlApi = { createObjectURL: urlApi.createObjectURL, revokeObjectURL: urlApi.revokeObjectURL };
  afterEach(() => {
    vi.restoreAllMocks();
    Object.assign(URL, savedUrlApi);
  });

  function file(csv: string) {
    const blob = new File([csv], "wall-survey.csv", { type: "text/csv" });
    if (typeof blob.text !== "function") Object.defineProperty(blob, "text", { value: async () => csv });
    return blob;
  }

  it("hands the surveyor a sheet with one row per link", () => {
    const createObjectURL = vi.fn(() => "blob:survey");
    const revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    render(
      <VideowallTransport
        plan={plan({ layout: "independent", columns: 4, rows: 4, sources: 1 })}
        onMeasure={vi.fn()}
        onMeasuredRuns={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByTestId("videowall-survey-download"));

    expect(click).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:survey");
    expect(screen.getByTestId("videowall-survey-status").textContent).toContain("17 links");
    expect(screen.getByLabelText(/Import measurements/)).toHaveAttribute("type", "file");
  });

  it("applies an imported sheet and names the rows it skipped", async () => {
    const onMeasuredRuns = vi.fn();
    render(
      <VideowallTransport
        plan={plan({ columns: 2, rows: 1, sources: 1, measuredRuns: { "display-1": 4 } })}
        measuredRuns={{ "display-1": 4 }}
        onMeasure={vi.fn()}
        onMeasuredRuns={onMeasuredRuns}
      />,
    );

    const csv = [
      WALL_SURVEY_HEADER.join(","),
      "source-1,Source 1,HDMI 2.0 copper (passive),2,5,3",
      "display-1,Panel 1,HDMI 2.0 copper (passive),5,5,",
      "display-2,Panel 2,HDMI 2.0 copper (passive),5,5,2.5",
      "display-7,Panel 7,HDMI 2.0 copper (passive),5,5,9",
    ].join("\r\n");

    fireEvent.change(screen.getByLabelText(/Import measurements/), { target: { files: [file(csv)] } });

    await waitFor(() => expect(onMeasuredRuns).toHaveBeenCalledTimes(1));
    expect(onMeasuredRuns).toHaveBeenCalledWith({ "display-2": 2.5, "source-1": 3 });
    const status = screen.getByTestId("videowall-survey-status").textContent ?? "";
    expect(status).toContain("2 of 3 links measured, 1 cleared.");
    expect(status).toContain('Row 5: "display-7" is not a link in this design.');
  });

  it("lands the install cells an imported sheet carries", async () => {
    const onLinkDetails = vi.fn();
    const onDisplayMounts = vi.fn();
    render(
      <VideowallTransport
        plan={plan({ columns: 2, rows: 1, sources: 1 })}
        linkDetails={{ "display-1": { enclosure: "Ceiling tile" } }}
        onMeasure={vi.fn()}
        onMeasuredRuns={vi.fn()}
        onLinkDetails={onLinkDetails}
        onDisplayMounts={onDisplayMounts}
      />,
    );

    const csv = [
      WALL_SURVEY_HEADER.join(","),
      "source-1,Source 1,HDMI 2.0 copper (passive),2,5,3,Back box,Wall bracket,HDMI faceplate",
      "display-1,Panel 1,HDMI 2.0 copper (passive),5,5,3,Back box,Wall bracket,HDMI faceplate,Floor box",
    ].join("\r\n");

    fireEvent.change(screen.getByLabelText(/Import measurements/), { target: { files: [file(csv)] } });

    await waitFor(() => expect(onLinkDetails).toHaveBeenCalledTimes(1));
    // Source rows carry no display-end fields; the display row carries the mount once.
    expect(onLinkDetails).toHaveBeenCalledWith({ "display-1": { enclosure: "Back box", termination: "HDMI faceplate", entry: "Floor box" } });
    expect(onDisplayMounts).toHaveBeenCalledWith({ "display-1": "Wall bracket" });
  });

  it("keeps the sheet out of the read-only proposal view", () => {
    render(<VideowallTransport plan={plan({ columns: 2, rows: 1, sources: 1 })} />);
    expect(screen.queryByTestId("videowall-survey-download")).toBeNull();
    expect(screen.queryByTestId("videowall-survey-print")).toBeNull();
    expect(screen.queryByLabelText(/Import measurements/)).toBeNull();
    expect(screen.queryByLabelText(/Read worksheet photo/)).toBeNull();
    expect(screen.queryByTestId("videowall-survey-photo-mock")).toBeNull();
  });

  it("shows every scanned row with its confidence and applies nothing until asked", async () => {
    vi.clearAllMocks();
    const onMeasuredRuns = vi.fn();
    const onLinkDetails = vi.fn();
    render(
      <VideowallTransport
        plan={plan({ columns: 2, rows: 1, sources: 1 })}
        measuredRuns={{ "display-1": 4 }}
        linkDetails={{ "display-1": { enclosure: "Ceiling tile" } }}
        onMeasure={vi.fn()}
        onMeasuredRuns={onMeasuredRuns}
        onLinkDetails={onLinkDetails}
      />,
    );

    fireEvent.change(screen.getByLabelText(/Read worksheet photo/), {
      target: { files: [new File(["photo"], "worksheet.jpg", { type: "image/jpeg" })] },
    });

    await waitFor(() => expect(screen.getByTestId("videowall-scan-review")).toBeTruthy());
    // Nothing lands on the design while the rows are under review.
    expect(onMeasuredRuns).not.toHaveBeenCalled();
    expect(onLinkDetails).not.toHaveBeenCalled();
    // Each row carries its own confidence and the reader's note.
    expect(screen.getByText("82%")).toBeTruthy();
    expect(screen.getByText("41%")).toBeTruthy();
    expect(screen.getByText("Clear handwriting.")).toBeTruthy();
    expect(screen.getByText("Digit smudged.")).toBeTruthy();
    expect(screen.getByLabelText("Accept scan for Source 1")).toBeChecked();
    expect(screen.getByText(/Could not be read: display-1/)).toBeTruthy();
    const status = screen.getByTestId("videowall-survey-status").textContent ?? "";
    expect(status).toContain("Read 2 rows from the photo");
  });

  it("applies only the accepted rows, run and install line together", async () => {
    vi.clearAllMocks();
    const onMeasuredRuns = vi.fn();
    const onLinkDetails = vi.fn();
    render(
      <VideowallTransport
        plan={plan({ columns: 2, rows: 1, sources: 1 })}
        measuredRuns={{ "display-1": 4 }}
        linkDetails={{ "display-1": { enclosure: "Ceiling tile" } }}
        onMeasure={vi.fn()}
        onMeasuredRuns={onMeasuredRuns}
        onLinkDetails={onLinkDetails}
      />,
    );

    fireEvent.change(screen.getByLabelText(/Read worksheet photo/), {
      target: { files: [new File(["photo"], "worksheet.jpg", { type: "image/jpeg" })] },
    });
    await waitFor(() => expect(screen.getByTestId("videowall-scan-review")).toBeTruthy());

    // Panel 2 was read at 41%: the rep clears it and keeps Source 1.
    fireEvent.click(screen.getByLabelText("Accept scan for Panel 2"));
    fireEvent.click(screen.getByTestId("videowall-scan-apply"));

    // display-1 was never read, so its recorded run and install detail survive.
    expect(onMeasuredRuns).toHaveBeenCalledWith({ "display-1": 4, "source-1": 4.5 });
    expect(onLinkDetails).not.toHaveBeenCalled();
    expect(screen.queryByTestId("videowall-scan-review")).toBeNull();
    // The record names the link and the run that landed, so the row can be
    // checked against the sheet without counting sentence clauses.
    const landed = screen.getByTestId("videowall-survey-landed");
    expect(landed.textContent).toBe("Source 1: 4.5 m");
    expect(landed.querySelector("[data-landed-link=\"source-1\"]")).not.toBeNull();
    // What did not land keeps its own line beside it.
    expect(screen.getByTestId("videowall-survey-status").textContent).toContain(
      "1 rejected · still to type: display-1",
    );
  });

  it("reads the apply back as one line per link on a wall with several links", async () => {
    vi.clearAllMocks();
    const onMeasuredRuns = vi.fn();
    render(
      <VideowallTransport
        plan={plan({ layout: "independent", columns: 4, rows: 1, sources: 1 })}
        measuredRuns={{}}
        onMeasure={vi.fn()}
        onMeasuredRuns={onMeasuredRuns}
      />,
    );

    const rows = [
      { id: "display-1", label: "Panel 1", metres: 2, confidence: 0.9 },
      { id: "display-2", label: "Panel 2", metres: 3.5, confidence: 0.9 },
      { id: "display-3", label: "Panel 3", metres: 4, confidence: 0.9 },
      { id: "display-4", label: "Panel 4", metres: 5.5, confidence: 0.9 },
    ];
    vi.mocked(readWallSurveyPhotos).mockResolvedValueOnce({
      scan: {
        readings: rows.map((row) => ({ ...row, note: "", detail: {} })),
        runs: rows.map((row) => ({ id: row.id, metres: row.metres })),
        details: [],
        displayMounts: {},
        unread: [],
        blank: [],
        problems: [],
        summary: "Four rows legible.",
        confidence: 0.9,
        photoCount: 1,
      },
      failures: [],
    });

    fireEvent.change(screen.getByLabelText(/Read worksheet photo/), {
      target: { files: [new File(["photo"], "worksheet.jpg", { type: "image/jpeg" })] },
    });
    await waitFor(() => expect(screen.getByTestId("videowall-scan-review")).toBeTruthy());
    fireEvent.click(screen.getByTestId("videowall-scan-apply"));

    // One line per link, in the wall's own order, each naming the run written.
    const landed = screen.getByTestId("videowall-survey-landed");
    expect(within(landed).getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      "Panel 1: 2 m",
      "Panel 2: 3.5 m",
      "Panel 3: 4 m",
      "Panel 4: 5.5 m",
    ]);
    // The counts sentence is gone, so nothing has to be read twice.
    expect(screen.getByTestId("videowall-survey-status").textContent).not.toContain("scanned run");
  });

  it("reads several photos as one batch and keeps every unread link in one list", async () => {
    vi.clearAllMocks();
    const onMeasuredRuns = vi.fn();
    render(
      <VideowallTransport
        plan={plan({ columns: 2, rows: 1, sources: 1 })}
        measuredRuns={{ "display-1": 4 }}
        onMeasure={vi.fn()}
        onMeasuredRuns={onMeasuredRuns}
      />,
    );

    vi.mocked(readWallSurveyPhotos).mockResolvedValueOnce({
      scan: {
        readings: [
          { id: "source-1", label: "Source 1", metres: 4.5, confidence: 0.9, note: "", detail: {} },
          { id: "display-2", label: "Panel 2", metres: 6, confidence: 0.6, note: "", detail: {} },
        ],
        runs: [
          { id: "source-1", metres: 4.5 },
          { id: "display-2", metres: 6 },
        ],
        details: [],
        displayMounts: {},
        unread: ["display-1"],
        blank: [],
        problems: [],
        summary: "Two sheets, one row still smudged.",
        confidence: 0.6,
        photoCount: 2,
      },
      failures: [{ fileName: "back.jpg", message: "The worksheet photo could not be read." }],
    });

    // The picker itself must offer a multi-select, or a rep could only ever
    // hand the reader one sheet at a time.
    expect((screen.getByLabelText(/Read worksheet photos/) as HTMLInputElement).multiple).toBe(true);
    fireEvent.change(screen.getByLabelText(/Read worksheet photos/), {
      target: {
        files: [
          new File(["front"], "front.jpg", { type: "image/jpeg" }),
          new File(["back"], "back.jpg", { type: "image/jpeg" }),
        ],
      },
    });

    await waitFor(() => expect(screen.getByTestId("videowall-scan-review")).toBeTruthy());
    // One call carries the whole batch, so a rep selects every worksheet once.
    expect(vi.mocked(readWallSurveyPhotos).mock.calls[0][0]).toHaveLength(2);
    expect(screen.getByText("Review the photo readings")).toBeTruthy();
    // Every photo's unread rows arrive as one list to type.
    expect(screen.getByTestId("videowall-scan-unread").textContent).toContain(
      "Could not be read from any photo: display-1",
    );
    const status = screen.getByTestId("videowall-survey-status").textContent ?? "";
    expect(status).toContain("Read 2 rows from 2 photos");
    expect(status).toContain("back.jpg (The worksheet photo could not be read.)");
    expect(onMeasuredRuns).not.toHaveBeenCalled();
  });

  it("asks for a sample reading only while the development switch is on", async () => {
    vi.clearAllMocks();
    render(
      <VideowallTransport
        plan={plan({ columns: 2, rows: 1, sources: 1 })}
        measuredRuns={{}}
        onMeasure={vi.fn()}
        onMeasuredRuns={vi.fn()}
      />,
    );

    const pick = () =>
      fireEvent.change(screen.getByLabelText(/Read worksheet photo/), {
        target: { files: [new File(["photo"], "worksheet.jpg", { type: "image/jpeg" })] },
      });

    // Unticked, a photo is a photo: the request asks for a real transcription.
    pick();
    await waitFor(() => expect(vi.mocked(readWallSurveyPhotos)).toHaveBeenCalledTimes(1));
    expect(vi.mocked(readWallSurveyPhotos).mock.calls[0][3]).toEqual({ mock: false });

    // The development switch is what lets the review, apply and reopen steps be
    // walked without a model key.
    fireEvent.click(screen.getByTestId("videowall-survey-photo-mock"));
    pick();
    await waitFor(() => expect(vi.mocked(readWallSurveyPhotos)).toHaveBeenCalledTimes(2));
    expect(vi.mocked(readWallSurveyPhotos).mock.calls[1][3]).toEqual({ mock: true });
  });

  it("applies the run the rep typed over the scanned one", async () => {
    vi.clearAllMocks();
    const onMeasuredRuns = vi.fn();
    const onSurveyReview = vi.fn();
    render(
      <VideowallTransport
        plan={plan({ columns: 2, rows: 1, sources: 1 })}
        measuredRuns={{}}
        onMeasure={vi.fn()}
        onMeasuredRuns={onMeasuredRuns}
        onLinkDetails={vi.fn()}
        onSurveyReview={onSurveyReview}
      />,
    );

    fireEvent.change(screen.getByLabelText(/Read worksheet photo/), {
      target: { files: [new File(["photo"], "worksheet.jpg", { type: "image/jpeg" })] },
    });
    await waitFor(() => expect(screen.getByTestId("videowall-scan-review")).toBeTruthy());

    // Panel 2 was read at 6 m from a smudged digit; the rep corrects it in the
    // list, before anything lands on the design.
    fireEvent.change(screen.getByLabelText("Scanned run for Panel 2 (metres)"), { target: { value: "4" } });
    expect(screen.getByText(/read 6 m/)).toBeTruthy();
    expect(onMeasuredRuns).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId("videowall-scan-apply"));

    expect(onMeasuredRuns).toHaveBeenCalledWith({ "source-1": 4.5, "display-2": 4 });
    // The record keeps the number that landed and the one the photo gave.
    expect(onSurveyReview.mock.calls[0][0].rows).toEqual([
      { id: "source-1", label: "Source 1", metres: 4.5, confidence: 0.82, decision: "accepted" },
      { id: "display-2", label: "Panel 2", metres: 4, readMetres: 6, confidence: 0.41, decision: "accepted" },
    ]);
    // Each accepted link is one line, in the list's order, with the run that
    // was written; the typed-over row says it was corrected.
    expect(screen.getByTestId("videowall-survey-landed").textContent).toBe(
      "Source 1: 4.5 mPanel 2: 4 m (corrected)",
    );
  });

  it("flags a typed run that sits far from its printed allowance", async () => {
    vi.clearAllMocks();
    const onSurveyReview = vi.fn();
    const wallPlan = plan({ columns: 2, rows: 1, sources: 1 });
    const allowance = wallPlan.allLinks.find((link) => link.id === "display-2")!.allowanceMetres;
    const typedRun = String(allowance * 4);
    render(
      <VideowallTransport
        plan={wallPlan}
        measuredRuns={{}}
        onMeasure={vi.fn()}
        onMeasuredRuns={vi.fn()}
        onLinkDetails={vi.fn()}
        onSurveyReview={onSurveyReview}
      />,
    );

    fireEvent.change(screen.getByLabelText(/Read worksheet photo/), {
      target: { files: [new File(["photo"], "worksheet.jpg", { type: "image/jpeg" })] },
    });
    await waitFor(() => expect(screen.getByTestId("videowall-scan-review")).toBeTruthy());

    // Panel 2 read 6 m; the rep types a number that is at least twice the
    // printed allowance, so the doubt shows under the cell it belongs to.
    const runBox = screen.getByLabelText("Scanned run for Panel 2 (metres)");
    fireEvent.change(runBox, { target: { value: typedRun } });
    const row = runBox.closest("tr")!;
    expect(
      within(row).getByText(`${typedRun} m against ≈${allowance} m — at least twice the printed allowance`),
    ).toBeTruthy();
    // The bar counts what the record will have to explain before it lands.
    expect(screen.getByTestId("videowall-scan-typed-runs").textContent).toContain(
      "1 typed run outside the printed allowance",
    );

    fireEvent.click(screen.getByTestId("videowall-scan-apply"));

    // The numbers, not the sentence: the project's review table marks the row
    // from them, in the words the trail prints.
    expect(onSurveyReview.mock.calls[0][0].flags).toEqual([
      { id: "display-2", label: "Panel 2", metres: Number(typedRun), allowanceMetres: allowance },
    ]);
    expect(screen.getByTestId("videowall-survey-status").textContent).toContain(
      `1 typed run outside the printed allowance (Panel 2: ${typedRun} m against ≈${allowance} m)`,
    );
  });

  it("leaves a run the photo read unmarked, however long it is", async () => {
    vi.clearAllMocks();
    const onSurveyReview = vi.fn();
    render(
      <VideowallTransport
        plan={plan({ columns: 2, rows: 1, sources: 1 })}
        measuredRuns={{}}
        onMeasure={vi.fn()}
        onMeasuredRuns={vi.fn()}
        onLinkDetails={vi.fn()}
        onSurveyReview={onSurveyReview}
      />,
    );

    fireEvent.change(screen.getByLabelText(/Read worksheet photo/), {
      target: { files: [new File(["photo"], "worksheet.jpg", { type: "image/jpeg" })] },
    });
    await waitFor(() => expect(screen.getByTestId("videowall-scan-review")).toBeTruthy());

    // Nothing is marked until a person types: the rule is about a run someone
    // wrote by hand, not a photo the rep accepted as it was read.
    expect(document.querySelector("[data-typed-run-warning]")).toBeNull();
    expect(screen.queryByTestId("videowall-scan-typed-runs")).toBeNull();

    fireEvent.click(screen.getByTestId("videowall-scan-apply"));
    expect(onSurveyReview.mock.calls[0][0].flags).toBeUndefined();
  });

  it("applies an install value the rep typed in the review list", async () => {
    vi.clearAllMocks();
    const onLinkDetails = vi.fn();
    render(
      <VideowallTransport
        plan={plan({ columns: 2, rows: 1, sources: 1 })}
        measuredRuns={{}}
        onMeasure={vi.fn()}
        onMeasuredRuns={vi.fn()}
        onLinkDetails={onLinkDetails}
      />,
    );

    fireEvent.change(screen.getByLabelText(/Read worksheet photo/), {
      target: { files: [new File(["photo"], "worksheet.jpg", { type: "image/jpeg" })] },
    });
    await waitFor(() => expect(screen.getByTestId("videowall-scan-review")).toBeTruthy());

    // Source rows carry only the run; the rep can correct display-end cells.
    fireEvent.change(screen.getByLabelText("Scanned termination for Panel 2"), {
      target: { value: "HDMI faceplate" },
    });
    fireEvent.click(screen.getByTestId("videowall-scan-apply"));

    expect(onLinkDetails).toHaveBeenCalledWith({
      "display-2": { termination: "HDMI faceplate" },
    });
  });

  it("leaves the design's run alone when the rep empties a scanned one", async () => {
    vi.clearAllMocks();
    const onMeasuredRuns = vi.fn();
    render(
      <VideowallTransport
        plan={plan({ columns: 2, rows: 1, sources: 1 })}
        measuredRuns={{ "display-2": 3 }}
        onMeasure={vi.fn()}
        onMeasuredRuns={onMeasuredRuns}
        onLinkDetails={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText(/Read worksheet photo/), {
      target: { files: [new File(["photo"], "worksheet.jpg", { type: "image/jpeg" })] },
    });
    await waitFor(() => expect(screen.getByTestId("videowall-scan-review")).toBeTruthy());

    fireEvent.change(screen.getByLabelText("Scanned run for Panel 2 (metres)"), { target: { value: "" } });
    fireEvent.click(screen.getByTestId("videowall-scan-apply"));

    // An emptied box is a decision not to take that reading, not a clear.
    expect(onMeasuredRuns).toHaveBeenCalledWith({ "display-2": 3, "source-1": 4.5 });
    // The emptied row wrote nothing, so it is not claimed as landed.
    const landed = screen.getByTestId("videowall-survey-landed");
    expect(landed.textContent).toBe("Source 1: 4.5 m");
    expect(landed.querySelector("[data-landed-link=\"display-2\"]")).toBeNull();
  });

  it("cannot apply a reading the rep rejected entirely", async () => {
    vi.clearAllMocks();
    const onMeasuredRuns = vi.fn();
    render(
      <VideowallTransport
        plan={plan({ columns: 2, rows: 1, sources: 1 })}
        onMeasure={vi.fn()}
        onMeasuredRuns={onMeasuredRuns}
      />,
    );

    fireEvent.change(screen.getByLabelText(/Read worksheet photo/), {
      target: { files: [new File(["photo"], "worksheet.jpg", { type: "image/jpeg" })] },
    });
    await waitFor(() => expect(screen.getByTestId("videowall-scan-review")).toBeTruthy());

    fireEvent.click(screen.getByLabelText("Accept scan for Source 1"));
    fireEvent.click(screen.getByLabelText("Accept scan for Panel 2"));

    expect((screen.getByTestId("videowall-scan-apply") as HTMLButtonElement).disabled).toBe(true);
    expect(onMeasuredRuns).not.toHaveBeenCalled();
  });

  it("discards a photo reading without touching the design", async () => {
    vi.clearAllMocks();
    const onMeasuredRuns = vi.fn();
    render(
      <VideowallTransport
        plan={plan({ columns: 2, rows: 1, sources: 1 })}
        onMeasure={vi.fn()}
        onMeasuredRuns={onMeasuredRuns}
      />,
    );

    fireEvent.change(screen.getByLabelText(/Read worksheet photo/), {
      target: { files: [new File(["photo"], "worksheet.jpg", { type: "image/jpeg" })] },
    });
    await waitFor(() => expect(screen.getByTestId("videowall-scan-review")).toBeTruthy());

    fireEvent.click(screen.getByTestId("videowall-scan-discard"));

    expect(screen.queryByTestId("videowall-scan-review")).toBeNull();
    expect(onMeasuredRuns).not.toHaveBeenCalled();
    expect(screen.getByTestId("videowall-survey-status").textContent).toBe(
      "Photo reading discarded. The design was not changed.",
    );
  });

  it("names the failure and keeps the recorded runs when the photo cannot be read", async () => {
    vi.clearAllMocks();
    vi.mocked(readWallSurveyPhotos).mockRejectedValueOnce(new Error("The worksheet photo could not be read."));
    const onMeasuredRuns = vi.fn();
    render(
      <VideowallTransport
        plan={plan({ columns: 2, rows: 1, sources: 1 })}
        measuredRuns={{ "display-1": 4 }}
        onMeasure={vi.fn()}
        onMeasuredRuns={onMeasuredRuns}
      />,
    );

    fireEvent.change(screen.getByLabelText(/Read worksheet photo/), {
      target: { files: [new File(["photo"], "worksheet.jpg", { type: "image/jpeg" })] },
    });

    await waitFor(() =>
      expect(screen.getByTestId("videowall-survey-status").textContent).toBe("The worksheet photo could not be read."),
    );
    expect(onMeasuredRuns).not.toHaveBeenCalled();
  });

  it("prints a worksheet built from the saved design", () => {
    const printWindow = { document: { write: vi.fn(), close: vi.fn() }, print: vi.fn() } as unknown as Window;
    const open = vi.spyOn(window, "open").mockReturnValue(printWindow);
    vi.useFakeTimers();
    const design = { ...defaultWallRequirements, columns: 2, rows: 1, sources: 1 };

    render(
      <VideowallTransport
        plan={plan({ columns: 2, rows: 1, sources: 1 })}
        requirements={design}
        onMeasure={vi.fn()}
        onMeasuredRuns={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId("videowall-survey-print"));

    expect(open).toHaveBeenCalledTimes(1);
    const written = (printWindow.document.write as unknown as { mock: { calls: string[][] } }).mock.calls[0][0];
    expect(written).toContain("Wall measurement worksheet");
    expect(written).toContain("display-2");
    vi.advanceTimersByTime(400);
    expect(printWindow.print).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
    open.mockRestore();
  });

  it("records the rows the rep took and the rows the rep cleared", async () => {
    vi.clearAllMocks();
    const onSurveyReview = vi.fn();
    render(
      <VideowallTransport
        plan={plan({ columns: 2, rows: 1, sources: 1 })}
        measuredRuns={{}}
        onMeasure={vi.fn()}
        onMeasuredRuns={vi.fn()}
        onLinkDetails={vi.fn()}
        onSurveyReview={onSurveyReview}
      />,
    );

    fireEvent.change(screen.getByLabelText(/Read worksheet photo/), {
      target: { files: [new File(["photo"], "worksheet.jpg", { type: "image/jpeg" })] },
    });
    await waitFor(() => expect(screen.getByTestId("videowall-scan-review")).toBeTruthy());

    fireEvent.click(screen.getByLabelText("Accept scan for Panel 2"));
    fireEvent.click(screen.getByTestId("videowall-scan-apply"));

    const review = onSurveyReview.mock.calls[0][0];
    expect(review.reviewedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(review.photoCount).toBe(1);
    expect(review.confidence).toBeCloseTo(0.7);
    // The cleared row keeps the smudged 6 m reading it was judged on.
    expect(review.rows).toEqual([
      { id: "source-1", label: "Source 1", metres: 4.5, confidence: 0.82, decision: "accepted" },
      { id: "display-2", label: "Panel 2", metres: 6, confidence: 0.41, decision: "rejected" },
    ]);
    expect(screen.getByTestId("videowall-survey-status").textContent).toContain("review recorded on the design");
  });

  it("shows the review already kept on the design, row by row", () => {
    render(
      <VideowallTransport
        plan={plan({ columns: 2, rows: 1, sources: 1 })}
        onMeasure={vi.fn()}
        onMeasuredRuns={vi.fn()}
        surveyReview={{
          reviewedAt: "2026-10-20T14:12:00.000Z",
          photoCount: 1,
          confidence: 0.7,
          rows: [
            { id: "source-1", label: "Source 1", metres: 4.5, confidence: 0.82, decision: "accepted" },
            { id: "display-2", label: "Panel 2", metres: 6, confidence: 0.41, decision: "rejected" },
          ],
        }}
      />,
    );

    const recorded = screen.getByTestId("videowall-survey-review");
    expect(recorded.textContent).toContain("1 row accepted, 1 rejected, 1 photo, 70% confidence");
    expect(recorded.querySelector("time")?.getAttribute("datetime")).toBe("2026-10-20T14:12:00.000Z");
    const accepted = recorded.querySelector("[data-survey-review-row='source-1']");
    const rejected = recorded.querySelector("[data-survey-review-row='display-2']");
    expect(accepted?.getAttribute("data-decision")).toBe("accepted");
    expect(accepted?.textContent).toContain("4.5 m");
    expect(rejected?.getAttribute("data-decision")).toBe("rejected");
    // The cleared row is still legible: its run, the confidence and the decision.
    expect(rejected?.textContent).toContain("6 m");
    expect(rejected?.textContent).toContain("41%");
    expect(rejected?.textContent).toContain("Rejected");
  });

  it("keeps no review when the rep discards the reading", async () => {
    vi.clearAllMocks();
    const onSurveyReview = vi.fn();
    render(
      <VideowallTransport
        plan={plan({ columns: 2, rows: 1, sources: 1 })}
        onMeasure={vi.fn()}
        onMeasuredRuns={vi.fn()}
        onSurveyReview={onSurveyReview}
      />,
    );

    fireEvent.change(screen.getByLabelText(/Read worksheet photo/), {
      target: { files: [new File(["photo"], "worksheet.jpg", { type: "image/jpeg" })] },
    });
    await waitFor(() => expect(screen.getByTestId("videowall-scan-review")).toBeTruthy());
    fireEvent.click(screen.getByTestId("videowall-scan-discard"));

    expect(onSurveyReview).not.toHaveBeenCalled();
    expect(screen.queryByTestId("videowall-survey-review")).toBeNull();
  });

  it("names the fix when the worksheet tab is blocked", () => {
    vi.spyOn(window, "open").mockReturnValue(null);

    render(
      <VideowallTransport
        plan={plan({ columns: 2, rows: 1, sources: 1 })}
        requirements={{ ...defaultWallRequirements, columns: 2, rows: 1, sources: 1 }}
        onMeasure={vi.fn()}
        onMeasuredRuns={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId("videowall-survey-print"));

    expect(screen.getByTestId("videowall-survey-status").textContent).toContain(
      "Allow pop-ups for this site to print the measurement worksheet.",
    );
    vi.restoreAllMocks();
  });
});

it("accepts dropped photos and displays each reader result", async () => {
  const original = vi.mocked(readWallSurveyPhotos).getMockImplementation()!;
  vi.mocked(readWallSurveyPhotos).mockImplementationOnce(async (files, transport, onProgress) => {
    onProgress?.({ index: 0, fileName: files[0].name, state: "reading" });
    onProgress?.({ index: 0, fileName: files[0].name, state: "complete", result: "2 rows read" });
    return original(files, transport);
  });
  render(<VideowallTransport plan={plan()} onMeasuredRuns={vi.fn()} />);
  fireEvent.drop(screen.getByTestId("videowall-transport"), { dataTransfer: { files: [new File(["photo"], "worksheet.jpg", { type: "image/jpeg" })] } });
  await waitFor(() => expect(screen.getByText("worksheet.jpg: complete — 2 rows read")).toBeTruthy());
});
