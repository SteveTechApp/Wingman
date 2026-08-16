import { beforeEach, describe, expect, it } from "vitest";
import {
  createProposalWizardDefaults,
  loadProposalWizardDraft,
  saveProposalWizardDraft,
} from "./proposalWizard";

function defaults(projectName: string, preparedBy: string, fingerprint: string) {
  return createProposalWizardDefaults({
    projectId: "project-live-data",
    projectName,
    customerName: "Live customer",
    contactName: "Live contact",
    preparedBy,
    discoveryFingerprint: fingerprint,
    executiveSummary: "Live summary",
    architectureNarrative: "Live architecture",
  });
}

describe("Proposal wizard live project identity", () => {
  beforeEach(() => window.localStorage.clear());

  it("refreshes all Step 1 fields from live sources instead of a cached draft", () => {
    const oldDraft = {
      ...defaults("Old project", "Old owner", "old-source"),
      proposalReference: "CUSTOM-REFERENCE",
      proposalDate: "2026-08-07",
    };
    saveProposalWizardDraft(oldDraft);

    const loaded = loadProposalWizardDraft(
      oldDraft.projectId,
      defaults("Live project", "Live owner", "new-source"),
    );

    expect(loaded.projectName).toBe("Live project");
    expect(loaded.preparedBy).toBe("Live owner");
    expect(loaded.customerName).toBe("Live customer");
    expect(loaded.contactName).toBe("Live contact");
    expect(loaded.proposalReference).not.toBe("CUSTOM-REFERENCE");
    expect(loaded.proposalReference).toMatch(/^WM-/);
    expect(loaded.proposalDate).not.toBe("2026-08-07");
  });
});
