import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CrmSharePanel } from "./CrmSharePanel";
import {
  buildWebhookPayload,
  getWebhookHistory,
  setWebhookUrl,
} from "../lib/crmWebhook";
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
});
