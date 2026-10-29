import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CrmSharePanel } from "./CrmSharePanel";
import {
  getWebhookHistory,
  recordWebhookHistory,
  setWebhookUrl,
} from "../lib/crmWebhook";
import { buildWebhookPayload } from "../lib/crmWebhookPayload";
import type { StoredProject } from "../data/projectStore";

function bareProject(): StoredProject {
  return {
    id: "proj-empty",
    name: "Empty Opportunity",
    owner: "Steve",
    stage: "Discovery",
    status: "",
    updated: "Just now",
    resumeTo: "/wingman/proposal",
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
  } as unknown as StoredProject;
}

function fixtureProject(): StoredProject {
  return {
    id: "proj-001",
    name: "Boardroom AV Upgrade",
    owner: "Steve",
    stage: "Proposal Builder",
    status: "recommended",
    updated: "Just now",
    resumeTo: "/wingman/proposal",
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    discoveryBrief: {
      capturedPercent: 88,
      roomModel: {
        clientName: "Acme Corp",
        siteName: "London HQ",
        application: "Boardroom",
        sourceCount: "4",
        displayCount: "2",
      },
      discoveryConversation: [
        {
          stepId: "opportunity",
          question: "What type of opportunity is this?",
          answer: "Meeting room / boardroom",
          note: "The exec boardroom on the top floor.",
          confirmed: true,
        },
        {
          stepId: "scale",
          question: "What is the approximate room or system scale?",
          answer: "Single large room",
          note: "",
        },
      ],
    },
    productSelections: [
      { sku: "NHD-500-TX", title: "NetworkHD TX", quantity: 2, family: "NetworkHD" },
      { sku: "NHD-500-RX", title: "NetworkHD RX", quantity: 2 },
    ],
  } as StoredProject;
}

describe("CrmSharePanel payload preview", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, statusText: "OK" }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("hides the payload JSON by default", () => {
    render(<CrmSharePanel project={fixtureProject()} />);
    expect(screen.queryByTestId("crm-webhook-payload")).toBeNull();
  });

  it("shows the exact webhook payload JSON including the conversation trail", () => {
    const project = fixtureProject();
    render(<CrmSharePanel project={project} />);

    // The expander lives inside the webhook section.
    fireEvent.click(screen.getByRole("button", { name: /Send to CRM via Webhook/ }));
    fireEvent.click(screen.getByRole("button", { name: /View payload/ }));

    const pre = screen.getByTestId("crm-webhook-payload");
    const rendered = JSON.parse(pre.textContent ?? "{}") as Record<string, unknown>;

    // generatedAt is a fresh timestamp and the attachment content embeds a
    // per-build DBR reference — exclude both from the byte-comparison and
    // assert the attachment separately below.
    const {
      generatedAt: renderedAt,
      discoveryBriefAttachment: renderedAtt,
      ...renderedRest
    } = rendered;
    const {
      generatedAt: expectedAt,
      discoveryBriefAttachment: expectedAtt,
      ...expectedRest
    } = buildWebhookPayload(project);
    expect(renderedAt).toBeTypeOf("string");
    expect(expectedAt).toBeTypeOf("string");
    expect(expectedAtt).toBeDefined();
    expect(renderedRest).toEqual(expectedRest);

    // The discovery brief HTML is attached (base64) with a stable filename.
    const attachment = renderedAtt as
      | { filename?: string; mimeType?: string; content?: string }
      | undefined;
    expect(attachment?.filename).toBe("wingman-discovery-brief-boardroom-av-upgrade.html");
    expect(attachment?.mimeType).toBe("text/html;charset=utf-8");
    const html = Buffer.from(attachment?.content ?? "", "base64").toString("utf8");
    expect(html).toContain("What type of opportunity is this?");
    expect(html).toContain("The exec boardroom on the top floor.");

    // The conversation trail is visible in the JSON, not just the summary.
    expect(pre.textContent).toContain("discoveryConversation");
    expect(pre.textContent).toContain("The exec boardroom on the top floor.");
    expect(pre.textContent).toContain('"answer": "Meeting room / boardroom"');
    expect(pre.textContent).toContain('"sku": "NHD-500-TX"');
  });

  it("notes how many conversation rows the payload carries", () => {
    render(<CrmSharePanel project={fixtureProject()} />);
    fireEvent.click(screen.getByRole("button", { name: /Send to CRM via Webhook/ }));
    fireEvent.click(screen.getByRole("button", { name: /View payload/ }));
    expect(screen.getByText(/2 rows/)).not.toBeNull();
  });

  it("toggles the payload preview closed again", () => {
    render(<CrmSharePanel project={fixtureProject()} />);
    fireEvent.click(screen.getByRole("button", { name: /Send to CRM via Webhook/ }));
    fireEvent.click(screen.getByRole("button", { name: /View payload/ }));
    expect(screen.getByTestId("crm-webhook-payload")).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Hide payload/ }));
    expect(screen.queryByTestId("crm-webhook-payload")).toBeNull();
  });

  it("records the sent discovery conversation in webhook history and shows it on expand", async () => {
    const project = fixtureProject();
    setWebhookUrl("https://hooks.example.com/zoho");
    render(<CrmSharePanel project={project} />);

    fireEvent.click(screen.getByRole("button", { name: /Send to CRM via Webhook/ }));
    fireEvent.click(screen.getByRole("button", { name: /Send Project Summary/ }));

    // The history entry stores the exact conversation that went out.
    await waitFor(() => {
      const history = getWebhookHistory();
      expect(history).toHaveLength(1);
      expect(history[0].discoveryConversation).toHaveLength(2);
      expect(history[0].discoveryConversation?.[0].question).toBe(
        "What type of opportunity is this?",
      );
      expect(history[0].discoveryConversation?.[0].answer).toBe(
        "Meeting room / boardroom",
      );
      expect(history[0].discoveryConversation?.[0].note).toBe(
        "The exec boardroom on the top floor.",
      );
    });

    // The panel can expand the send to show the conversation that reached the CRM.
    fireEvent.click(screen.getByRole("button", { name: /Webhook send history/ }));
    fireEvent.click(
      screen.getByRole("button", {
        name: /View conversation sent to CRM for Boardroom AV Upgrade/,
      }),
    );
    expect(screen.getByText(/The exec boardroom on the top floor\./)).not.toBeNull();
    expect(screen.getByText(/Confirmed with customer/)).not.toBeNull();
    expect(screen.getByText(/Single large room/)).not.toBeNull();
  });

  it("includes the discovery conversation rows in the copied summary", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    render(<CrmSharePanel project={fixtureProject()} />);
    fireEvent.click(
      screen.getByRole("button", { name: /Copy project summary to clipboard/ }),
    );

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    const text = writeText.mock.calls[0][0] as string;
    expect(text).toContain("Discovery conversation:");
    expect(text).toContain("Q: What type of opportunity is this?");
    expect(text).toContain("A: Meeting room / boardroom");
    expect(text).toContain("The exec boardroom on the top floor.");
    expect(text).toContain("Confirmed with customer");
    expect(text).toContain("Q: What is the approximate room or system scale?");
    expect(text).toContain("A: Single large room");
  });

  it("notes when there is no discovery conversation to copy", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    render(<CrmSharePanel project={bareProject()} />);
    fireEvent.click(
      screen.getByRole("button", { name: /Copy project summary to clipboard/ }),
    );

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    const text = writeText.mock.calls[0][0] as string;
    expect(text).toContain("Discovery conversation:");
    expect(text).toContain("No discovery conversation captured.");
  });

  it("explains a failed send with the reason it stored, not only its ERR status", () => {
    const project = fixtureProject();
    recordWebhookHistory({
      id: "wh-failed",
      projectId: project.id,
      projectName: project.name,
      sentAt: "2026-10-26T10:15:00.000Z",
      status: "error",
      httpStatus: 500,
      errorMessage: "HTTP 500 Internal Server Error",
    });

    render(<CrmSharePanel project={project} />);
    fireEvent.click(screen.getByRole("button", { name: /Send to CRM via Webhook/ }));
    fireEvent.click(screen.getByRole("button", { name: /Webhook send history/ }));

    const reason = screen.getByTestId("crm-webhook-failure-wh-failed");
    expect(reason.textContent).toBe("HTTP 500 Internal Server Error");
    // The status cell still says what the row always said.
    expect(screen.getByText("500")).not.toBeNull();
  });

  it("shows a send that never reached the endpoint as ERR with its reason", () => {
    const project = fixtureProject();
    recordWebhookHistory({
      id: "wh-network",
      projectId: project.id,
      projectName: project.name,
      sentAt: "2026-10-26T10:20:00.000Z",
      status: "error",
      errorMessage: "Failed to fetch",
    });

    render(<CrmSharePanel project={project} />);
    fireEvent.click(screen.getByRole("button", { name: /Send to CRM via Webhook/ }));
    fireEvent.click(screen.getByRole("button", { name: /Webhook send history/ }));

    expect(screen.getByText("ERR")).not.toBeNull();
    expect(screen.getByTestId("crm-webhook-failure-wh-network").textContent).toBe("Failed to fetch");
  });

  it("keeps a successful send to its status and time", () => {
    const project = fixtureProject();
    recordWebhookHistory({
      id: "wh-ok",
      projectId: project.id,
      projectName: project.name,
      sentAt: "2026-10-26T10:25:00.000Z",
      status: "success",
      httpStatus: 200,
    });

    render(<CrmSharePanel project={project} />);
    fireEvent.click(screen.getByRole("button", { name: /Send to CRM via Webhook/ }));
    fireEvent.click(screen.getByRole("button", { name: /Webhook send history/ }));

    expect(screen.queryByTestId("crm-webhook-failure-wh-ok")).toBeNull();
  });

  it("records the payload a failed send did not get through, so it can be retried", async () => {
    setWebhookUrl("https://hooks.example.com/zoho");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500, statusText: "Internal Server Error" }),
    );

    render(<CrmSharePanel project={fixtureProject()} />);
    fireEvent.click(screen.getByRole("button", { name: /Send to CRM via Webhook/ }));
    fireEvent.click(screen.getByRole("button", { name: /Send Project Summary/ }));

    await waitFor(() => expect(getWebhookHistory()).toHaveLength(1));
    const stored = getWebhookHistory()[0];
    expect(stored.status).toBe("error");
    // The body that never landed is what a retry re-sends.
    expect(stored.payload?.projectName).toBe("Boardroom AV Upgrade");
    expect(stored.payload?.products).toHaveLength(2);
  });

  it("retries a failed send from its row with the payload it stored", async () => {
    const project = fixtureProject();
    setWebhookUrl("https://hooks.example.com/zoho");
    // A snapshot from an earlier attempt: its own timestamp, not a fresh build.
    const storedPayload = {
      ...buildWebhookPayload(project),
      generatedAt: "2026-10-26T10:15:00.000Z",
    };
    recordWebhookHistory({
      id: "wh-failed",
      projectId: project.id,
      projectName: project.name,
      sentAt: "2026-10-26T10:15:00.000Z",
      status: "error",
      httpStatus: 500,
      errorMessage: "HTTP 500 Internal Server Error",
      payload: storedPayload,
    });

    render(<CrmSharePanel project={project} />);
    fireEvent.click(screen.getByRole("button", { name: /Send to CRM via Webhook/ }));
    fireEvent.click(screen.getByRole("button", { name: /Webhook send history/ }));
    fireEvent.click(screen.getByTestId("crm-webhook-retry-wh-failed"));

    await waitFor(() => expect(getWebhookHistory()).toHaveLength(2));

    const fetchMock = vi.mocked(globalThis.fetch);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    // The configured endpoint receives the exact body the first attempt held.
    expect(url).toBe("https://hooks.example.com/zoho");
    expect(JSON.parse(String(init.body))).toEqual(storedPayload);

    // The retry is its own attempt, and the row it came from keeps its failure —
    // but not the snapshot, which has been delivered and can never be sent again.
    const [retried, original] = getWebhookHistory();
    expect(retried.status).toBe("success");
    expect(retried.projectId).toBe(project.id);
    expect(original.status).toBe("error");
    expect(original.errorMessage).toBe("HTTP 500 Internal Server Error");
    expect(original.retriedAt).toBeTruthy();
    expect(original.payload).toBeUndefined();

    expect(await screen.findByTestId("crm-webhook-retry-note")).toBeTruthy();
    expect(screen.getByTestId("crm-webhook-retry-note").textContent).toMatch(/accepted/);

    // The body landed, so the row it came from stops offering to send it again.
    expect(screen.getByTestId("crm-webhook-retried-wh-failed")).toBeTruthy();
    expect(screen.queryByTestId("crm-webhook-retry-wh-failed")).toBeNull();
  });

  it("offers no retry for a failure that stored no payload", () => {
    const project = fixtureProject();
    recordWebhookHistory({
      id: "wh-legacy",
      projectId: project.id,
      projectName: project.name,
      sentAt: "2026-10-26T10:30:00.000Z",
      status: "error",
      errorMessage: "Failed to fetch",
    });

    render(<CrmSharePanel project={project} />);
    fireEvent.click(screen.getByRole("button", { name: /Send to CRM via Webhook/ }));
    fireEvent.click(screen.getByRole("button", { name: /Webhook send history/ }));

    expect(screen.queryByTestId("crm-webhook-retry-wh-legacy")).toBeNull();
    // The reason is still shown, so the row explains itself without an action.
    expect(screen.getByTestId("crm-webhook-failure-wh-legacy").textContent).toBe("Failed to fetch");
  });

  it("offers no retry for a send that already landed", () => {
    const project = fixtureProject();
    recordWebhookHistory({
      id: "wh-ok",
      projectId: project.id,
      projectName: project.name,
      sentAt: "2026-10-26T10:35:00.000Z",
      status: "success",
      httpStatus: 200,
    });

    render(<CrmSharePanel project={project} />);
    fireEvent.click(screen.getByRole("button", { name: /Send to CRM via Webhook/ }));
    fireEvent.click(screen.getByRole("button", { name: /Webhook send history/ }));

    expect(screen.queryByTestId("crm-webhook-retry-wh-ok")).toBeNull();
  });

  it("resends every failed send for this project in one action", async () => {
    const project = fixtureProject();
    setWebhookUrl("https://hooks.example.com/zoho");
    // Two snapshots from earlier attempts, each with its own timestamp.
    const olderPayload = {
      ...buildWebhookPayload(project),
      generatedAt: "2026-10-26T10:15:00.000Z",
    };
    const newerPayload = {
      ...buildWebhookPayload(project),
      generatedAt: "2026-10-26T10:40:00.000Z",
    };

    recordWebhookHistory({
      id: "wh-older",
      projectId: project.id,
      projectName: project.name,
      sentAt: "2026-10-26T10:15:00.000Z",
      status: "error",
      httpStatus: 500,
      errorMessage: "HTTP 500 Internal Server Error",
      payload: olderPayload,
    });
    recordWebhookHistory({
      id: "wh-newer",
      projectId: project.id,
      projectName: project.name,
      sentAt: "2026-10-26T10:40:00.000Z",
      status: "error",
      errorMessage: "Failed to fetch",
      payload: newerPayload,
    });
    // Neither of these is this action's work: one stored no body, the other
    // belongs to a different room.
    recordWebhookHistory({
      id: "wh-legacy",
      projectId: project.id,
      projectName: project.name,
      sentAt: "2026-10-26T10:05:00.000Z",
      status: "error",
      errorMessage: "Failed to fetch",
    });
    recordWebhookHistory({
      id: "wh-other-room",
      projectId: "proj-other",
      projectName: "Other room",
      sentAt: "2026-10-26T10:45:00.000Z",
      status: "error",
      errorMessage: "Failed to fetch",
      payload: olderPayload,
    });

    render(<CrmSharePanel project={project} />);
    fireEvent.click(screen.getByRole("button", { name: /Send to CRM via Webhook/ }));
    fireEvent.click(screen.getByRole("button", { name: /Webhook send history/ }));

    const bulk = screen.getByTestId("crm-webhook-retry-failed");
    expect(bulk.textContent).toContain("Resend 2 failed sends");
    fireEvent.click(bulk);

    // Each retry lands as its own attempt beside the failures it started from.
    await waitFor(() => expect(getWebhookHistory()).toHaveLength(6));

    const fetchMock = vi.mocked(globalThis.fetch);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const bodies = fetchMock.mock.calls.map(([, init]) => JSON.parse(String(init?.body)));
    // History order, newest first, and each body is the snapshot it stored.
    expect(bodies).toEqual([newerPayload, olderPayload]);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "https://hooks.example.com/zoho",
      "https://hooks.example.com/zoho",
    ]);

    const note = await screen.findByTestId("crm-webhook-retry-note");
    expect(note.textContent).toContain("Resent 2 failed sends — 2 accepted, 0 failed again.");
    // The red row it could not resend is accounted for rather than ignored.
    expect(note.textContent).toContain("1 earlier failure stored no payload");

    // Both bodies landed, so neither row is offered again and the batch is gone
    // rather than sitting there as a button that would do nothing. The older
    // row sits past the five the panel lists, so the store is the record here.
    const marked = getWebhookHistory().filter((entry) => entry.retriedAt);
    expect(marked.map((entry) => entry.id).sort()).toEqual(["wh-newer", "wh-older"]);
    // A delivered snapshot stops occupying storage; the failure, its reason and
    // its time are what the row keeps.
    expect(marked.every((entry) => entry.payload === undefined)).toBe(true);
    expect(marked.every((entry) => Boolean(entry.errorMessage?.trim()))).toBe(true);
    // The other room's failure was not this batch's work, so it keeps its body.
    expect(getWebhookHistory().find((entry) => entry.id === "wh-other-room")?.payload)
      .toEqual(olderPayload);
    expect(screen.getByTestId("crm-webhook-retried-wh-newer")).toBeTruthy();
    expect(screen.queryByTestId("crm-webhook-retry-wh-newer")).toBeNull();
    expect(screen.queryByTestId("crm-webhook-retry-failed")).toBeNull();
  });

  it("does not count an already-resent failure as one that stored no body", async () => {
    const project = fixtureProject();
    setWebhookUrl("https://hooks.example.com/zoho");
    const payload = buildWebhookPayload(project);
    // Delivered on an earlier visit: marked, and the mark dropped its snapshot,
    // so it looks body-less now for the same reason a legacy row does.
    recordWebhookHistory({
      id: "wh-delivered",
      projectId: project.id,
      projectName: project.name,
      sentAt: "2026-10-26T10:00:00.000Z",
      status: "error",
      errorMessage: "HTTP 500 Internal Server Error",
      retriedAt: "2026-10-26T10:30:00.000Z",
    });
    recordWebhookHistory({
      id: "wh-legacy",
      projectId: project.id,
      projectName: project.name,
      sentAt: "2026-10-26T10:05:00.000Z",
      status: "error",
      errorMessage: "Failed to fetch",
    });
    recordWebhookHistory({
      id: "wh-open",
      projectId: project.id,
      projectName: project.name,
      sentAt: "2026-10-26T10:10:00.000Z",
      status: "error",
      errorMessage: "Failed to fetch",
      payload,
    });

    render(<CrmSharePanel project={project} />);
    fireEvent.click(screen.getByRole("button", { name: /Send to CRM via Webhook/ }));
    fireEvent.click(screen.getByRole("button", { name: /Webhook send history/ }));
    fireEvent.click(screen.getByTestId("crm-webhook-retry-failed"));

    const note = await screen.findByTestId("crm-webhook-retry-note");
    expect(note.textContent).toContain("Resent 1 failed send — 1 accepted, 0 failed again.");
    // Only the row that never stored a body is a send the action missed.
    expect(note.textContent).toContain("1 earlier failure stored no payload");
  });

  it("reports the split when a bulk resend is partly refused", async () => {
    const project = fixtureProject();
    setWebhookUrl("https://hooks.example.com/zoho");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({ ok: false, status: 502, statusText: "Bad Gateway" })
        .mockResolvedValueOnce({ ok: true, status: 200, statusText: "OK" }),
    );
    const payload = buildWebhookPayload(project);
    recordWebhookHistory({
      id: "wh-a",
      projectId: project.id,
      projectName: project.name,
      sentAt: "2026-10-26T11:00:00.000Z",
      status: "error",
      errorMessage: "Failed to fetch",
      payload,
    });
    recordWebhookHistory({
      id: "wh-b",
      projectId: project.id,
      projectName: project.name,
      sentAt: "2026-10-26T10:00:00.000Z",
      status: "error",
      errorMessage: "Failed to fetch",
      payload,
    });

    render(<CrmSharePanel project={project} />);
    fireEvent.click(screen.getByRole("button", { name: /Send to CRM via Webhook/ }));
    fireEvent.click(screen.getByRole("button", { name: /Webhook send history/ }));
    fireEvent.click(screen.getByTestId("crm-webhook-retry-failed"));

    await waitFor(() => expect(getWebhookHistory()).toHaveLength(4));

    const note = await screen.findByTestId("crm-webhook-retry-note");
    expect(note.textContent).toContain("1 accepted, 1 failed again");
    // Both attempts were recorded, so the refusal keeps its own reason.
    expect(
      getWebhookHistory()
        .slice(0, 2)
        .map((entry) => entry.status)
        .sort(),
    ).toEqual(["error", "success"]);

    // The first body was refused, so it stays resendable; the second landed, so
    // its row is marked and no longer offered.
    expect(screen.getByTestId("crm-webhook-retried-wh-a")).toBeTruthy();
    expect(screen.queryByTestId("crm-webhook-retry-wh-a")).toBeNull();
    expect(screen.getByTestId("crm-webhook-retry-wh-b")).toBeTruthy();
    // The refused retry is a failed attempt of its own with its own stored body,
    // so the batch counts it beside the original it came from.
    expect(screen.getByTestId("crm-webhook-retry-failed").textContent).toContain(
      "Resend 2 failed sends",
    );
  });
});

/**
 * The send record shares the origin's storage with the project store, so a write
 * can be refused. The panel is the only place a rep finds out, because the row
 * that would have shown the send is the row that is missing.
 */
describe("CrmSharePanel when this browser refuses the history record", () => {
  /** Refuse only the history write, so the endpoint URL still saves. */
  function refuseHistoryWrites() {
    const setItem = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (
      this: Storage,
      key: string,
      value: string,
    ) {
      if (key === "wingman-crm-webhook-history") {
        throw new DOMException("full", "QuotaExceededError");
      }
      return setItem.call(this, key, value);
    });
  }

  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, statusText: "OK" }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("says a send that landed will not be in the list below", async () => {
    setWebhookUrl("https://hooks.example.com/zoho");
    refuseHistoryWrites();

    render(<CrmSharePanel project={fixtureProject()} />);
    fireEvent.click(screen.getByRole("button", { name: /Send to CRM via Webhook/ }));
    fireEvent.click(screen.getByRole("button", { name: /Send Project Summary/ }));

    const warning = await screen.findByTestId("crm-webhook-record-warning");
    expect(warning.textContent).toContain("could not record that send in Recent Sends");
    // The two halves are separate facts: the CRM has the send, the list will not.
    expect(warning.textContent).toContain("The endpoint accepted it");
    expect(getWebhookHistory()).toHaveLength(0);
  });

  it("says a failed send has no body left to resend", async () => {
    setWebhookUrl("https://hooks.example.com/zoho");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500, statusText: "Internal Server Error" }),
    );
    refuseHistoryWrites();

    render(<CrmSharePanel project={fixtureProject()} />);
    fireEvent.click(screen.getByRole("button", { name: /Send to CRM via Webhook/ }));
    fireEvent.click(screen.getByRole("button", { name: /Send Project Summary/ }));

    const warning = await screen.findByTestId("crm-webhook-record-warning");
    expect(warning.textContent).toContain("no body to resend");
    // The ordinary failure line still prints what the endpoint said.
    expect(screen.getByText(/Server responded with HTTP 500/)).toBeTruthy();
    expect(getWebhookHistory()).toHaveLength(0);
  });

  it("clears the notice once a send is recorded again", async () => {
    setWebhookUrl("https://hooks.example.com/zoho");
    refuseHistoryWrites();

    render(<CrmSharePanel project={fixtureProject()} />);
    fireEvent.click(screen.getByRole("button", { name: /Send to CRM via Webhook/ }));
    fireEvent.click(screen.getByRole("button", { name: /Send Project Summary/ }));
    await screen.findByTestId("crm-webhook-record-warning");

    // Storage is available again: the next send is kept, and the notice goes with
    // it rather than standing over a list that now holds the send.
    vi.mocked(Storage.prototype.setItem).mockRestore();
    fireEvent.click(screen.getByRole("button", { name: /Sent successfully/ }));

    await waitFor(() => expect(getWebhookHistory()).toHaveLength(1));
    expect(screen.queryByTestId("crm-webhook-record-warning")).toBeNull();
  });
});

/**
 * A browser with no room left is the state the record warning describes, and this
 * history is one of the things filling it. Freeing that room is the rep's call:
 * the action sits with the rows it would drop, and the confirmation and the note
 * both name the failures what it costs, because a stored body is the only copy a
 * retry can post.
 */
describe("CrmSharePanel clearing the send history", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, statusText: "OK" }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  /** Three rows in two rooms: one failed with a body, one failed in another room. */
  function seedHistory() {
    const project = fixtureProject();
    recordWebhookHistory({
      id: "wh-failed",
      projectId: project.id,
      projectName: project.name,
      sentAt: "2026-10-26T10:15:00.000Z",
      status: "error",
      httpStatus: 500,
      errorMessage: "HTTP 500 Internal Server Error",
      payload: buildWebhookPayload(project),
    });
    recordWebhookHistory({
      id: "wh-other-room",
      projectId: "proj-other",
      projectName: "Other room",
      sentAt: "2026-10-26T10:10:00.000Z",
      status: "success",
      httpStatus: 200,
    });
    recordWebhookHistory({
      id: "wh-ok",
      projectId: project.id,
      projectName: project.name,
      sentAt: "2026-10-26T10:05:00.000Z",
      status: "success",
      httpStatus: 200,
    });
    return project;
  }

  function openHistory() {
    fireEvent.click(screen.getByRole("button", { name: /Send to CRM via Webhook/ }));
    fireEvent.click(screen.getByRole("button", { name: /Webhook send history/ }));
  }

  it("clears every room's sends only once the rep confirms what it costs", () => {
    const project = seedHistory();
    render(<CrmSharePanel project={project} />);
    openHistory();

    fireEvent.click(screen.getByTestId("crm-webhook-clear-history"));
    // Asked, not done: the rows are still there, and the confirmation names the
    // one that would lose the body kept for it.
    expect(getWebhookHistory()).toHaveLength(3);
    expect(screen.getByTestId("crm-webhook-clear-history-confirm").textContent).toContain(
      "Clear 3 sends",
    );
    expect(
      screen.getByText(/The 1 failed send this room can still resend loses the body kept for it/),
    ).not.toBeNull();

    fireEvent.click(screen.getByTestId("crm-webhook-clear-history-cancel"));
    expect(getWebhookHistory()).toHaveLength(3);
    expect(screen.queryByTestId("crm-webhook-clear-history-confirm")).toBeNull();

    fireEvent.click(screen.getByTestId("crm-webhook-clear-history"));
    fireEvent.click(screen.getByTestId("crm-webhook-clear-history-confirm"));

    // Every room's rows go, and the note says what the room cost rather than
    // leaving the rep to work it out from a shorter list.
    expect(getWebhookHistory()).toHaveLength(0);
    expect(window.localStorage.getItem("wingman-crm-webhook-history")).toBeNull();
    expect(screen.getByTestId("crm-webhook-clear-note").textContent).toContain(
      "Cleared 3 sends from this browser, including the failed send that could be resent",
    );
    expect(screen.getByText("No webhook sends yet.")).not.toBeNull();
    // Nothing left to clear, so the action goes with the rows.
    expect(screen.queryByTestId("crm-webhook-clear-history")).toBeNull();
  });

  it("frees the room the warning is about, so the next send is recorded", async () => {
    const project = seedHistory();
    setWebhookUrl("https://hooks.example.com/zoho");
    const setItem = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (
      this: Storage,
      key: string,
      value: string,
    ) {
      if (key === "wingman-crm-webhook-history") {
        throw new DOMException("full", "QuotaExceededError");
      }
      return setItem.call(this, key, value);
    });

    render(<CrmSharePanel project={project} />);
    fireEvent.click(screen.getByRole("button", { name: /Send to CRM via Webhook/ }));
    fireEvent.click(screen.getByRole("button", { name: /Send Project Summary/ }));

    const warning = await screen.findByTestId("crm-webhook-record-warning");
    expect(warning.textContent).toContain("could not record that send");
    // The rep is told where the room comes from, and the rows are still there.
    expect(warning.textContent).toContain("Clearing the send history gives that storage back");
    expect(getWebhookHistory()).toHaveLength(3);

    // Storage is writable again, and the clear is what makes the next send fit.
    vi.mocked(Storage.prototype.setItem).mockRestore();
    fireEvent.click(screen.getByRole("button", { name: /Webhook send history/ }));
    fireEvent.click(screen.getByTestId("crm-webhook-clear-history"));
    fireEvent.click(screen.getByTestId("crm-webhook-clear-history-confirm"));
    fireEvent.click(screen.getByRole("button", { name: /Sent successfully/ }));

    await waitFor(() => expect(getWebhookHistory()).toHaveLength(1));
    expect(screen.queryByTestId("crm-webhook-record-warning")).toBeNull();
  });

  it("clears the note about dropped sends with the history it counts", () => {
    window.localStorage.setItem(
      "wingman-crm-webhook-history-drops-v1",
      JSON.stringify({ droppedRows: 1 }),
    );
    const project = seedHistory();
    render(<CrmSharePanel project={project} />);
    openHistory();

    fireEvent.click(screen.getByTestId("crm-webhook-clear-history"));
    fireEvent.click(screen.getByTestId("crm-webhook-clear-history-confirm"));

    // The rows the note counts are gone, so the note does not outlive them.
    expect(screen.queryByTestId("crm-webhook-history-drops")).toBeNull();
    expect(window.localStorage.getItem("wingman-crm-webhook-history-drops-v1")).toBeNull();
  });

  it("offers neither the action nor the route to it without a history to clear", async () => {
    setWebhookUrl("https://hooks.example.com/zoho");
    const setItem = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (
      this: Storage,
      key: string,
      value: string,
    ) {
      if (key === "wingman-crm-webhook-history") {
        throw new DOMException("full", "QuotaExceededError");
      }
      return setItem.call(this, key, value);
    });

    render(<CrmSharePanel project={fixtureProject()} />);
    fireEvent.click(screen.getByRole("button", { name: /Send to CRM via Webhook/ }));
    fireEvent.click(screen.getByRole("button", { name: /Send Project Summary/ }));

    const warning = await screen.findByTestId("crm-webhook-record-warning");
    // Nothing stored means nothing this panel could free, so the warning keeps to
    // the send it is about instead of pointing at an action that is not there.
    expect(warning.textContent).not.toContain("Clearing the send history");

    fireEvent.click(screen.getByRole("button", { name: /Webhook send history/ }));
    expect(screen.queryByTestId("crm-webhook-clear-history")).toBeNull();
  });

  it("drops one row and keeps every other send in the list", () => {
    const project = seedHistory();
    render(<CrmSharePanel project={project} />);
    openHistory();

    // One click arms, and nothing has gone yet: a failed row is the last copy of
    // the body a retry would post, so the drop is asked like the clear above it.
    fireEvent.click(screen.getByTestId("crm-webhook-remove-wh-failed"));
    expect(getWebhookHistory()).toHaveLength(3);
    expect(screen.getByTestId("crm-webhook-remove-note-wh-failed").textContent).toContain(
      "takes the body kept for a resend with it",
    );

    fireEvent.click(screen.getByTestId("crm-webhook-remove-wh-failed"));

    // The oversized failure this action exists for is gone; another room's send
    // and this room's clean one stay, in the order they were in.
    expect(getWebhookHistory().map((entry) => entry.id)).toEqual(["wh-ok", "wh-other-room"]);
    expect(screen.queryByTestId("crm-webhook-remove-wh-failed")).toBeNull();
    expect(screen.getByTestId("crm-webhook-remove-wh-other-room")).not.toBeNull();
    // The row that could still be resent went with it, so the batch action has no
    // work left, while the whole-list clear is still there to offer.
    expect(screen.queryByTestId("crm-webhook-retry-failed")).toBeNull();
    expect(screen.getByTestId("crm-webhook-clear-history")).not.toBeNull();

    // A row with no body to send costs the browser's record of it and nothing
    // else, and arming it says so in place of the failure's sentence.
    fireEvent.click(screen.getByTestId("crm-webhook-remove-wh-ok"));
    expect(screen.getByTestId("crm-webhook-remove-note-wh-ok").textContent).toContain(
      "The CRM keeps what it accepted.",
    );
    expect(getWebhookHistory()).toHaveLength(2);
  });

  it("takes the last row out of an empty history, and says what a body-less failure costs", () => {
    const project = fixtureProject();
    // The shape a failure recorded before bodies were kept has: a reason and a
    // status, and no snapshot for a retry to post.
    recordWebhookHistory({
      id: "wh-old-failure",
      projectId: project.id,
      projectName: project.name,
      sentAt: "2026-10-26T09:00:00.000Z",
      status: "error",
      httpStatus: 0,
      errorMessage: "Endpoint unreachable",
    });
    render(<CrmSharePanel project={project} />);
    openHistory();

    fireEvent.click(screen.getByTestId("crm-webhook-remove-wh-old-failure"));
    expect(screen.getByTestId("crm-webhook-remove-note-wh-old-failure").textContent).toContain(
      "It stored no body, so nothing here could be resent.",
    );

    fireEvent.click(screen.getByTestId("crm-webhook-remove-wh-old-failure"));

    // Emptying the list one row at a time leaves the store the way clearing it
    // does: no key, and no action offered for a history that holds nothing.
    expect(window.localStorage.getItem("wingman-crm-webhook-history")).toBeNull();
    expect(screen.getByText("No webhook sends yet.")).not.toBeNull();
    expect(screen.queryByTestId("crm-webhook-clear-history")).toBeNull();
  });

  it("leaves a row this browser would not rewrite in the list", () => {
    const project = seedHistory();
    const setItem = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (
      this: Storage,
      key: string,
      value: string,
    ) {
      if (key === "wingman-crm-webhook-history") {
        throw new DOMException("full", "QuotaExceededError");
      }
      return setItem.call(this, key, value);
    });

    render(<CrmSharePanel project={project} />);
    openHistory();
    fireEvent.click(screen.getByTestId("crm-webhook-remove-wh-failed"));
    fireEvent.click(screen.getByTestId("crm-webhook-remove-wh-failed"));

    // The list shows what the browser holds rather than what the rep asked for, so
    // a refused drop leaves the row where they can see it is still recorded.
    expect(getWebhookHistory()).toHaveLength(3);
    expect(screen.getByTestId("crm-webhook-remove-wh-failed")).not.toBeNull();
  });
});

/**
 * The boot sweep can have to drop sends to keep the history inside its storage,
 * and the rep should learn that where the list lives rather than from a dialog at
 * load. The count is storage, so it survives the load that dropped the rows and
 * goes when the rep has read it. This is one of the two surfaces that print it —
 * the project record's activity log is the other, and its copy is pinned in
 * `ProjectDetailPage.test.tsx`.
 */
describe("CrmSharePanel after a sweep dropped sends", () => {
  const DROPS_KEY = "wingman-crm-webhook-history-drops-v1";

  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, statusText: "OK" }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function leaveDropsNote(droppedRows: number) {
    window.localStorage.setItem(DROPS_KEY, JSON.stringify({ droppedRows }));
  }

  function openWebhookSection() {
    fireEvent.click(screen.getByRole("button", { name: /Send to CRM via Webhook/ }));
  }

  it("says what it dropped, and stops once the rep dismisses it", () => {
    leaveDropsNote(2);
    render(<CrmSharePanel project={fixtureProject()} />);
    openWebhookSection();

    const note = screen.getByTestId("crm-webhook-history-drops");
    // The wording names the browser's send history rather than this list, because
    // the record's activity log prints the same sentence with no list on screen.
    expect(note.textContent).toContain("dropped 2 older sends from its CRM send history");
    // The rows are this browser's record; the sends the CRM took are not lost with
    // them, which is the part a rep needs to hear.
    expect(note.textContent).toContain("Every send the CRM accepted is still listed.");

    fireEvent.click(screen.getByTestId("crm-webhook-history-drops-dismiss"));
    expect(screen.queryByTestId("crm-webhook-history-drops")).toBeNull();
    // Dismissed is acknowledged: the next load does not say it again.
    expect(window.localStorage.getItem(DROPS_KEY)).toBeNull();
  });

  it("reads one dropped send as one", () => {
    leaveDropsNote(1);
    render(<CrmSharePanel project={fixtureProject()} />);
    openWebhookSection();

    expect(screen.getByTestId("crm-webhook-history-drops").textContent).toContain(
      "dropped 1 older send from its CRM send history",
    );
  });

  it("prints nothing when no sweep had to give a send up", () => {
    // A clean load is the common case, and it has nothing to report.
    render(<CrmSharePanel project={fixtureProject()} />);
    openWebhookSection();

    expect(screen.queryByTestId("crm-webhook-history-drops")).toBeNull();
  });
});
