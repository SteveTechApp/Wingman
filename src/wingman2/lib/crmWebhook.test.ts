import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getWebhookUrl,
  setWebhookUrl,
  generateCurlSnippet,
  recordWebhookHistory,
  getWebhookHistory,
  resendHistoryEntry,
  resendableProjectFailures,
  markWebhookHistoryRetried,
  removeWebhookHistoryEntry,
  sweepWebhookHistory,
  readWebhookHistoryDrops,
  acknowledgeWebhookHistoryDrops,
  CRM_WEBHOOK_HISTORY_BUDGET_BYTES,
  type CrmWebhookPayload,
  type CrmWebhookHistoryEntry,
} from "./crmWebhook";
import { buildWebhookPayload } from "./crmWebhookPayload";
import { PRODUCT_DATA_MANIFEST } from "./productDataRevision";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  };
})();

Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });

describe("crmWebhook", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe("getWebhookUrl / setWebhookUrl", () => {
    it("returns empty string when no URL is configured", () => {
      expect(getWebhookUrl()).toBe("");
    });

    it("stores and retrieves a webhook URL", () => {
      setWebhookUrl("https://hooks.zoho.com/example");
      expect(getWebhookUrl()).toBe("https://hooks.zoho.com/example");
    });

    it("trims whitespace from the URL", () => {
      setWebhookUrl("  https://hooks.zoho.com/example  ");
      expect(getWebhookUrl()).toBe("https://hooks.zoho.com/example");
    });
  });

  describe("buildWebhookPayload", () => {
    it("builds a payload from a project object", () => {
      const project = {
        id: "proj-001",
        name: "Boardroom AV Upgrade",
        owner: "Steve",
        stage: "Proposal Builder",
        dealOutcome: "won" as const,
        dealOutcomeWhy: "Better HDBaseT reach",
        discoveryBrief: {
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
        proposal: {
          title: "Boardroom AV Solution",
          summary: "4K60 AV over IP for 4-source, 2-display boardroom",
          bomRows: [
            { sku: "NHD-500-TX", description: "4K60 TX", role: "Transmitter", qty: 2, notes: "Install at source" },
            { sku: "NHD-500-RX", description: "4K60 RX", role: "Receiver", qty: 2, notes: "Install at display" },
          ],
        },
      };

      const payload = buildWebhookPayload(project);

      expect(payload.projectId).toBe("proj-001");
      expect(payload.projectName).toBe("Boardroom AV Upgrade");
      expect(payload.customer).toBe("Acme Corp");
      expect(payload.site).toBe("London HQ");
      expect(payload.stage).toBe("Proposal Builder");
      expect(payload.dealOutcome).toBe("won");
      expect(payload.dealOutcomeWhy).toBe("Better HDBaseT reach");
      expect(payload.products).toHaveLength(2);
      expect(payload.products[0].sku).toBe("NHD-500-TX");
      expect(payload.products[0].quantity).toBe(2);
      // The CRM record outlives the catalogue, so it carries the same revision the
      // printed documents do.
      expect(payload.productDataRevision?.manifestHash).toMatch(/^[0-9a-f]{64}$/);
      expect(payload.productDataRevision?.generatedAt).toBe(PRODUCT_DATA_MANIFEST.generatedAt);
      expect(payload.productDataRevision?.buildCommit).toBeTruthy();
      expect(payload.discoveryConversation).toHaveLength(2);
      expect(payload.discoveryConversation?.[0].question).toBe("What type of opportunity is this?");
      expect(payload.discoveryConversation?.[0].answer).toBe("Meeting room / boardroom");
      expect(payload.discoveryConversation?.[0].note).toBe("The exec boardroom on the top floor.");
      expect(payload.discoveryConversation?.[0].confirmed).toBe(true);
      expect(payload.discoveryConversation?.[1].confirmed).toBeUndefined();
      expect(payload.proposalTitle).toBe("Boardroom AV Solution");
      expect(payload.proposalSummary).toBe("4K60 AV over IP for 4-source, 2-display boardroom");
      expect(payload.bomRows).toHaveLength(2);
      expect(payload.source).toBe("wingman");
      expect(payload.generatedAt).toBeTruthy();
    });

    it("attaches the discovery brief HTML when a conversation exists", () => {
      const project = {
        id: "proj-001",
        name: "Boardroom AV Upgrade",
        owner: "Steve",
        stage: "Proposal Builder",
        discoveryBrief: {
          roomModel: { application: "Boardroom" },
          discoveryConversation: [
            {
              stepId: "opportunity",
              question: "What type of opportunity is this?",
              answer: "Meeting room / boardroom",
              note: "The exec boardroom on the top floor.",
              confirmed: true,
            },
          ],
        },
      };

      const payload = buildWebhookPayload(project);
      const attachment = payload.discoveryBriefAttachment;

      expect(attachment).toBeDefined();
      expect(attachment?.filename).toBe("wingman-discovery-brief-boardroom-av-upgrade.html");
      expect(attachment?.mimeType).toBe("text/html;charset=utf-8");
      const html = Buffer.from(attachment?.content ?? "", "base64").toString("utf8");
      expect(html).toContain("What type of opportunity is this?");
      expect(html).toContain("Meeting room / boardroom");
      expect(html).toContain("The exec boardroom on the top floor.");
    });

    it("handles empty product selections", () => {
      const project = {
        id: "proj-002",
        name: "Empty Project",
        owner: "Test",
        stage: "Discovery",
      };

      const payload = buildWebhookPayload(project);
      expect(payload.products).toEqual([]);
      expect(payload.proposalTitle).toBeUndefined();
      expect(payload.bomRows).toBeUndefined();
      expect(payload.discoveryConversation).toBeUndefined();
      // No conversation — nothing to attach.
      expect(payload.discoveryBriefAttachment).toBeUndefined();
    });

    it("falls back to owner when clientName is missing", () => {
      const project = {
        id: "proj-003",
        name: "Fallback Project",
        owner: "Fallback Owner",
        stage: "Discovery",
        discoveryBrief: { roomModel: {} },
      };

      const payload = buildWebhookPayload(project);
      expect(payload.customer).toBe("Fallback Owner");
      expect(payload.site).toBe("");
      // A brief without any conversation rows still attaches nothing.
      expect(payload.discoveryBriefAttachment).toBeUndefined();
    });
  });

  describe("generateCurlSnippet", () => {
    it("generates a valid cURL command", () => {
      const url = "https://hooks.zoho.com/test";
      const payload: CrmWebhookPayload = {
        projectId: "proj-001",
        projectName: "Test Project",
        customer: "Acme",
        site: "HQ",
        stage: "Discovery",
        products: [],
        generatedAt: "2026-01-01T00:00:00Z",
        source: "wingman",
      };

      const curl = generateCurlSnippet(url, payload);

      expect(curl).toContain("curl -X POST");
      expect(curl).toContain(url);
      expect(curl).toContain("Content-Type: application/json");
      expect(curl).toContain('"projectId": "proj-001"');
      expect(curl).toContain('"source": "wingman"');
    });
  });

  describe("recordWebhookHistory / getWebhookHistory", () => {
    it("persists the sent discovery conversation in history entries", () => {
      const conversation = [
        {
          stepId: "opportunity",
          question: "What type of opportunity is this?",
          answer: "Meeting room / boardroom",
          note: "The exec boardroom on the top floor.",
          confirmed: true,
        },
      ];

      recordWebhookHistory({
        id: "wh-1",
        projectId: "proj-001",
        projectName: "Boardroom AV Upgrade",
        sentAt: "2026-08-01T00:00:00.000Z",
        status: "success",
        httpStatus: 200,
        discoveryConversation: conversation,
      });

      const history = getWebhookHistory();
      expect(history).toHaveLength(1);
      expect(history[0].discoveryConversation).toEqual(conversation);
    });

    it("keeps legacy entries without a conversation readable", () => {
      recordWebhookHistory({
        id: "wh-2",
        projectId: "proj-002",
        projectName: "Legacy Send",
        sentAt: "2026-08-01T00:00:00.000Z",
        status: "success",
        httpStatus: 200,
      });

      const history = getWebhookHistory();
      expect(history[0].discoveryConversation).toBeUndefined();
    });

    it("round-trips the payload a failed send stored", () => {
      const payload = failedPayload();
      recordWebhookHistory(failedEntry(payload));

      const history = getWebhookHistory();
      expect(history[0].payload).toEqual(payload);
    });

    it("reports a write the browser refused rather than only not writing it", () => {
      const entry = failedEntry(failedPayload());
      expect(recordWebhookHistory(entry)).toBe(true);

      // A full origin refuses the write. The caller has to be able to say so,
      // because the row that would have shown the send is the row that is gone.
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new DOMException("full", "QuotaExceededError");
      });
      expect(recordWebhookHistory({ ...entry, id: "wh-refused" })).toBe(false);

      // The refusal wrote nothing, so the history is still the send that was kept.
      expect(getWebhookHistory().map((row) => row.id)).toEqual(["wh-failed"]);
    });
  });

  describe("webhook history byte budget", () => {
    /**
     * A failed send holding a body of `bytes`, which is the shape a long
     * discovery takes in the store: the base64 brief is most of the row.
     */
    function heavyEntry(id: string, bytes: number): CrmWebhookHistoryEntry {
      return {
        ...failedEntry({
          ...failedPayload(),
          discoveryBriefAttachment: {
            filename: "wingman-discovery-brief-boardroom.html",
            mimeType: "text/html;charset=utf-8",
            content: "A".repeat(bytes),
          },
        }),
        id,
      };
    }

    it("drops the oldest sends so a few long discoveries cannot fill the store", () => {
      // Half the budget each, so two fit and three do not: a count of twenty
      // would have kept all four of these, which is the store this budget exists
      // to prevent.
      const bytes = Math.floor(CRM_WEBHOOK_HISTORY_BUDGET_BYTES / 2.5);
      for (const id of ["wh-1", "wh-2", "wh-3", "wh-4"]) recordWebhookHistory(heavyEntry(id, bytes));

      const history = getWebhookHistory();
      // The two newest survive, still newest first; the oldest sends are gone.
      expect(history.map((entry) => entry.id)).toEqual(["wh-4", "wh-3"]);
      const stored = localStorageMock.getItem("wingman-crm-webhook-history") ?? "";
      expect(new TextEncoder().encode(stored).length).toBeLessThanOrEqual(CRM_WEBHOOK_HISTORY_BUDGET_BYTES);
    });

    it("keeps the send the rep just made even when it alone is over the budget", () => {
      recordWebhookHistory(heavyEntry("wh-old", 1_000));
      recordWebhookHistory(heavyEntry("wh-huge", CRM_WEBHOOK_HISTORY_BUDGET_BYTES * 2));

      // An empty history would report nothing about the attempt that failed, so
      // the oversized send stays as the whole list and the next one trims it
      // from the old end.
      expect(getWebhookHistory().map((entry) => entry.id)).toEqual(["wh-huge"]);
    });

    it("leaves a run of light sends on the row count", () => {
      for (let index = 0; index < 25; index += 1) {
        recordWebhookHistory({ ...failedEntry(failedPayload()), id: `wh-${index}` });
      }

      // Twenty small failures are far inside the budget, so the count bounds them
      // exactly as it did before the budget existed.
      const history = getWebhookHistory();
      expect(history).toHaveLength(20);
      expect(history[0].id).toBe("wh-24");
    });
  });

  describe("resendHistoryEntry", () => {
    beforeEach(() => {
      setWebhookUrl("https://hooks.zoho.com/example");
    });

    it("POSTs the stored body rather than rebuilding it from the project", async () => {
      const payload = failedPayload();
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: "OK",
      });
      vi.stubGlobal("fetch", fetchMock);

      const result = await resendHistoryEntry(failedEntry(payload));

      expect(result.ok).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      // Byte-identical to what the first attempt sent, generatedAt included:
      // nothing was rebuilt, so nothing drifted.
      const sent = JSON.parse(String(init.body)) as CrmWebhookPayload;
      expect(sent).toEqual(payload);
      expect(sent.generatedAt).toBe("2026-10-26T10:15:00.000Z");

      vi.unstubAllGlobals();
    });

    it("refuses an entry that stored no payload", async () => {
      const entry: CrmWebhookHistoryEntry = {
        id: "wh-legacy",
        projectId: "proj-001",
        projectName: "Boardroom AV Upgrade",
        sentAt: "2026-10-26T10:15:00.000Z",
        status: "error",
        errorMessage: "HTTP 500 Internal Server Error",
      };

      await expect(resendHistoryEntry(entry)).rejects.toThrow(/payload snapshot/i);
    });
  });
  describe("resendableProjectFailures", () => {
    it("picks this project's failures that kept a body, in history order", () => {
      const payload = failedPayload();
      const history: CrmWebhookHistoryEntry[] = [
        { ...failedEntry(payload), id: "wh-newest" },
        { ...failedEntry(payload), id: "wh-ok", status: "success", payload: undefined },
        { ...failedEntry(payload), id: "wh-other", projectId: "proj-002" },
        {
          id: "wh-legacy",
          projectId: "proj-001",
          projectName: "Boardroom AV Upgrade",
          sentAt: "2026-10-26T10:05:00.000Z",
          status: "error",
          errorMessage: "Failed to fetch",
        },
        { ...failedEntry(payload), id: "wh-older" },
      ];

      const failures = resendableProjectFailures(history, "proj-001");

      // Another room's failure and a body-less one are not this action's work.
      expect(failures.map((entry) => entry.id)).toEqual(["wh-newest", "wh-older"]);
      // The body travels with the row, so the caller posts what it selected.
      expect(failures[0].payload).toEqual(payload);
    });
  });

  describe("markWebhookHistoryRetried", () => {
    it("marks the row it resent, and only that row", () => {
      const payload = failedPayload();
      recordWebhookHistory({ ...failedEntry(payload), id: "wh-other", projectId: "proj-002" });
      recordWebhookHistory(failedEntry(payload));

      markWebhookHistoryRetried("wh-failed", "2026-10-26T11:00:00.000Z");

      const [marked, other] = getWebhookHistory();
      expect(marked.retriedAt).toBe("2026-10-26T11:00:00.000Z");
      // The failure and its reason stay: the mark is about the retry, not about
      // erasing what went wrong.
      expect(marked.status).toBe("error");
      expect(marked.errorMessage).toBe("HTTP 500 Internal Server Error");
      expect(marked.httpStatus).toBe(500);
      // The delivered snapshot goes with the mark. It can never be sent again,
      // and it is the largest part of the row.
      expect(marked.payload).toBeUndefined();
      // Another room's failure still holds its own body.
      expect(other.retriedAt).toBeUndefined();
      expect(other.payload).toEqual(payload);
      // The delivered snapshot is no longer the batch's work.
      expect(resendableProjectFailures(getWebhookHistory(), "proj-001")).toEqual([]);
    });

    it("ignores an id the history does not hold", () => {
      recordWebhookHistory(failedEntry(failedPayload()));

      markWebhookHistoryRetried("wh-missing");

      expect(getWebhookHistory()[0].retriedAt).toBeUndefined();
    });
  });

  describe("removeWebhookHistoryEntry", () => {
    it("drops the row it names and keeps every other send in order", () => {
      const payload = failedPayload();
      recordWebhookHistory({ ...failedEntry(payload), id: "wh-other", projectId: "proj-002" });
      recordWebhookHistory(failedEntry(payload));
      recordWebhookHistory({ ...failedEntry(payload), id: "wh-clean", status: "success" });

      // The newest send is the oversized one the ceilings keep even when it alone
      // is over budget, so it is the row a rep has to be able to drop by itself.
      removeWebhookHistoryEntry("wh-failed");

      // Newest first, as the store keeps them: the dropped row was in the middle.
      const history = getWebhookHistory();
      expect(history.map((entry) => entry.id)).toEqual(["wh-clean", "wh-other"]);
      // Another room's failure keeps its own body, and the batch loses only the
      // send that was dropped.
      expect(history.find((entry) => entry.id === "wh-other")?.payload).toEqual(payload);
      expect(resendableProjectFailures(history, "proj-001")).toEqual([]);
    });

    it("leaves an empty history as the absent key when the last row goes", () => {
      recordWebhookHistory(failedEntry(failedPayload()));

      removeWebhookHistoryEntry("wh-failed");

      // The write path cannot store an empty list, so neither does this one: a
      // browser that drops every row one by one ends where clearing ends.
      expect(localStorageMock.getItem("wingman-crm-webhook-history")).toBeNull();
      expect(getWebhookHistory()).toEqual([]);
    });

    it("writes nothing for an id the history does not hold", () => {
      recordWebhookHistory(failedEntry(failedPayload()));

      removeWebhookHistoryEntry("wh-missing");

      expect(getWebhookHistory().map((entry) => entry.id)).toEqual(["wh-failed"]);
    });
  });

  describe("sweepWebhookHistory", () => {
    it("drops a delivered body left on a row marked before the mark cleared it", () => {
      const payload = failedPayload();
      // The shape an older visit wrote: marked, and still holding the snapshot.
      recordWebhookHistory({ ...failedEntry(payload), id: "wh-delivered", retriedAt: "2026-10-26T11:00:00.000Z" });
      // A failure nobody has resent still holds the body a rep can send.
      recordWebhookHistory(failedEntry(payload));

      expect(sweepWebhookHistory()).toEqual({ clearedPayloads: 1, droppedRows: 0 });

      const history = getWebhookHistory();
      const delivered = history.find((entry) => entry.id === "wh-delivered")!;
      expect(delivered.payload).toBeUndefined();
      // The failure, its reason and its time are the record, so they stay.
      expect(delivered.status).toBe("error");
      expect(delivered.errorMessage).toBe("HTTP 500 Internal Server Error");
      expect(delivered.retriedAt).toBe("2026-10-26T11:00:00.000Z");
      // An open failure is untouched, body included.
      expect(history.find((entry) => entry.id === "wh-failed")?.payload).toEqual(payload);
    });

    it("is a no-op once there is nothing left to clean, and writes nothing", () => {
      recordWebhookHistory(failedEntry(failedPayload()));
      // A clean history is the common case, so the sweep has to cost one read and
      // no write; the read is what the seeding above already spent.
      localStorageMock.setItem.mockClear();

      expect(sweepWebhookHistory()).toEqual({ clearedPayloads: 0, droppedRows: 0 });
      expect(sweepWebhookHistory()).toEqual({ clearedPayloads: 0, droppedRows: 0 });
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
      expect(getWebhookHistory()[0].payload).toEqual(failedPayload());
    });

    it("trims a history over the byte budget before a rep sends again", () => {
      // The shape this browser was left in by a build that kept only a row count:
      // written straight to storage, because the write path would have fitted it.
      const heavy = (id: string) => ({
        ...failedEntry({
          ...failedPayload(),
          discoveryBriefAttachment: {
            filename: "brief.html",
            mimeType: "text/html;charset=utf-8",
            content: "A".repeat(Math.floor(CRM_WEBHOOK_HISTORY_BUDGET_BYTES / 2.5)),
          },
        }),
        id,
      });
      localStorageMock.setItem(
        "wingman-crm-webhook-history",
        JSON.stringify([heavy("wh-3"), heavy("wh-2"), heavy("wh-1")]),
      );

      // No send happens: the boot sweep is the only thing that runs.
      expect(sweepWebhookHistory().droppedRows).toBeGreaterThan(0);

      const stored = localStorageMock.getItem("wingman-crm-webhook-history") ?? "";
      expect(new TextEncoder().encode(stored).length).toBeLessThanOrEqual(
        CRM_WEBHOOK_HISTORY_BUDGET_BYTES,
      );
      // The newest sends survive, so the sweep gives up storage rather than the
      // record of what the rep did last.
      expect(getWebhookHistory().map((entry) => entry.id)).toEqual(["wh-3", "wh-2"]);
    });

    it("reports the space it gave back through the boot storage strip's report", () => {
      // A delivered row still holding its body, which is the space a sweep frees
      // without dropping a send.
      recordWebhookHistory({ ...failedEntry(failedPayload()), id: "wh-delivered", retriedAt: "2026-10-26T11:00:00.000Z" });
      const key = "wingman-crm-webhook-history";
      const before = localStorageMock.getItem(key) ?? "";

      expect(sweepWebhookHistory()).toEqual({ clearedPayloads: 1, droppedRows: 0 });

      const after = localStorageMock.getItem(key) ?? "";
      // The entry as a browser accounts for it — key and value as UTF-16 — so the
      // number adds up with the retired copy's rather than being a second unit in
      // the same total.
      const bytes = (key.length + before.length) * 2 - (key.length + after.length) * 2;
      expect(bytes).toBeGreaterThan(0);
      expect(JSON.parse(localStorageMock.getItem("wingman-retired-storage-reclaim-v1") ?? "null"))
        .toEqual({ bytes, webhookBytes: bytes });
    });

    it("adds its share to a report a previous load's sweep already left", () => {
      // One load can give back both kinds of space, and the strip prints one
      // number: the history's part joins what is already waiting rather than
      // replacing it, and stays marked as the history's so the sentence can say so.
      localStorageMock.setItem("wingman-retired-storage-reclaim-v1", JSON.stringify({ bytes: 1000 }));
      recordWebhookHistory({ ...failedEntry(failedPayload()), id: "wh-delivered", retriedAt: "2026-10-26T11:00:00.000Z" });

      sweepWebhookHistory();

      const reported = JSON.parse(localStorageMock.getItem("wingman-retired-storage-reclaim-v1") ?? "null");
      expect(reported.webhookBytes).toBeGreaterThan(0);
      expect(reported.bytes).toBe(1000 + reported.webhookBytes);
    });
  });

  /**
   * A sweep that drops rows leaves the count for the CRM panel, because the rows
   * are the rep's record of what they sent and losing them silently is the one
   * thing the panel must not do. The note is storage rather than an interruption:
   * a load that dropped a send says so once, in the panel, and stops saying it
   * when the rep has read it.
   */
  describe("what a sweep tells the rep", () => {
    const DROPS_KEY = "wingman-crm-webhook-history-drops-v1";

    /** A history left over the byte budget, as a build without the budget wrote it. */
    function leaveOversizedHistory(rows: number) {
      const heavy = (id: string) => ({
        ...failedEntry({
          ...failedPayload(),
          discoveryBriefAttachment: {
            filename: "brief.html",
            mimeType: "text/html;charset=utf-8",
            content: "A".repeat(Math.floor(CRM_WEBHOOK_HISTORY_BUDGET_BYTES / 2.5)),
          },
        }),
        id,
      });
      localStorageMock.setItem(
        "wingman-crm-webhook-history",
        JSON.stringify(Array.from({ length: rows }, (_, index) => heavy(`wh-${rows - index}`))),
      );
    }

    it("says nothing when it had no rows to give up", () => {
      recordWebhookHistory(failedEntry(failedPayload()));

      expect(sweepWebhookHistory().droppedRows).toBe(0);
      expect(readWebhookHistoryDrops()).toBeNull();
    });

    it("leaves the count of the sends it dropped", () => {
      leaveOversizedHistory(3);

      const { droppedRows } = sweepWebhookHistory();
      expect(droppedRows).toBeGreaterThan(0);
      expect(readWebhookHistoryDrops()).toEqual({ droppedRows });
    });

    it("adds to what the rep has not read yet rather than replacing it", () => {
      // A note left by an earlier load the rep has not opened the panel on.
      localStorageMock.setItem(DROPS_KEY, JSON.stringify({ droppedRows: 3 }));
      leaveOversizedHistory(3);

      const { droppedRows } = sweepWebhookHistory();
      expect(droppedRows).toBeGreaterThan(0);
      expect(readWebhookHistoryDrops()).toEqual({ droppedRows: 3 + droppedRows });
    });

    it("stops saying it once the rep acknowledges, and does not come back", () => {
      leaveOversizedHistory(3);
      sweepWebhookHistory();
      expect(readWebhookHistoryDrops()).not.toBeNull();

      acknowledgeWebhookHistoryDrops();
      expect(readWebhookHistoryDrops()).toBeNull();
      expect(localStorageMock.getItem(DROPS_KEY)).toBeNull();

      // The next load has nothing left to trim, so it says nothing again.
      expect(sweepWebhookHistory()).toEqual({ clearedPayloads: 0, droppedRows: 0 });
      expect(readWebhookHistoryDrops()).toBeNull();
    });

    it("still drops the rows when the note itself cannot be stored", () => {
      leaveOversizedHistory(3);
      const write = localStorageMock.setItem.getMockImplementation()!;
      localStorageMock.setItem.mockImplementation((key: string, value: string) => {
        if (key === DROPS_KEY) throw new DOMException("full", "QuotaExceededError");
        write(key, value);
      });

      try {
        // The trim happened, so the sweep reports it: a refused note must not turn
        // a successful cleanup into a sweep that claims it did nothing.
        expect(sweepWebhookHistory().droppedRows).toBeGreaterThan(0);
        expect(getWebhookHistory().length).toBeLessThan(3);
        expect(readWebhookHistoryDrops()).toBeNull();
      } finally {
        localStorageMock.setItem.mockImplementation(write);
      }
    });

    it("reads a stored value that is not a count as nothing to say", () => {
      for (const stored of ["{}", '{"droppedRows":0}', '{"droppedRows":-2}', '"three"']) {
        localStorageMock.setItem(DROPS_KEY, stored);
        expect(readWebhookHistoryDrops()).toBeNull();
      }
      localStorageMock.setItem(DROPS_KEY, "not json");
      expect(readWebhookHistoryDrops()).toBeNull();
    });
  });
});

function failedPayload(): CrmWebhookPayload {
  return {
    projectId: "proj-001",
    projectName: "Boardroom AV Upgrade",
    customer: "Acme Corp",
    site: "London HQ",
    stage: "Proposal Builder",
    products: [{ sku: "NHD-500-TX", title: "NetworkHD TX", quantity: 2 }],
    generatedAt: "2026-10-26T10:15:00.000Z",
    source: "wingman",
  };
}

function failedEntry(payload: CrmWebhookPayload): CrmWebhookHistoryEntry {
  return {
    id: "wh-failed",
    projectId: "proj-001",
    projectName: "Boardroom AV Upgrade",
    sentAt: "2026-10-26T10:15:00.000Z",
    status: "error",
    httpStatus: 500,
    errorMessage: "HTTP 500 Internal Server Error",
    payload,
  };
}
