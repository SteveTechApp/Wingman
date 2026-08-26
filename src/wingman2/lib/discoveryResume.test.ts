import { describe, expect, it } from "vitest";
import type { StoredDiscoveryBrief } from "../data/projectStore";
import {
  DISCOVERY_RESUME_INTERVIEW_QUERY,
  discoveryResumeInfo,
  discoveryResumeUrl,
} from "./discoveryResume";

const partialBrief: StoredDiscoveryBrief = {
  savedAt: "2026-08-26T00:00:00.000Z",
  capturedPercent: 42,
  nextBestQuestion: "Confirm the USB host requirement",
  missingInformation: ["Confirm the USB host requirement"],
  discoveryConversation: [
    { stepId: "opportunity", question: "What type of opportunity is this?", answer: "Meeting room / boardroom", note: "", confirmed: true },
    { stepId: "scale", question: "What is the room scale?", answer: "Single large room", note: "" },
  ],
};

describe("discoveryResumeInfo", () => {
  it("summarises a partial discovery with the next question to ask", () => {
    const info = discoveryResumeInfo(partialBrief);
    expect(info).not.toBeNull();
    expect(info!.answeredCount).toBe(2);
    expect(info!.percent).toBe(42);
    expect(info!.nextQuestion).toBe("Confirm the USB host requirement");
    expect(info!.hasContent).toBe(true);
    expect(info!.complete).toBe(false);
  });

  it("ignores note-only rows when counting answered questions", () => {
    const info = discoveryResumeInfo({
      capturedPercent: 20,
      discoveryConversation: [
        { stepId: "opportunity", question: "What type of opportunity is this?", answer: "", note: "The exec boardroom.", confirmed: false },
      ],
    });
    expect(info!.answeredCount).toBe(0);
    expect(info!.hasContent).toBe(false);
  });

  it("reports complete once captured percent reaches 100", () => {
    const info = discoveryResumeInfo({ capturedPercent: 100, discoveryConversation: partialBrief.discoveryConversation });
    expect(info!.complete).toBe(true);
    expect(info!.hasContent).toBe(true);
  });

  it("returns null for no brief and for an empty brief", () => {
    expect(discoveryResumeInfo(null)).toBeNull();
    expect(discoveryResumeInfo(undefined)).toBeNull();
    expect(discoveryResumeInfo({})).toBeNull();
  });

  it("builds the resume URL with the interview auto-start query", () => {
    const url = discoveryResumeUrl();
    expect(url).toContain(DISCOVERY_RESUME_INTERVIEW_QUERY);
    expect(url).toContain("resume=project");
    expect(url).toContain("interview=1");
  });
});
