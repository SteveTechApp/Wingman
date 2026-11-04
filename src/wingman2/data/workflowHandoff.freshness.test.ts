import { beforeEach, describe, expect, it } from "vitest";
import { PROJECT_STORE_KEY } from "../features/projects/persistence/projectRepository";
import { DISCOVERY_SNAPSHOT_KEY, readLatestDiscoveryBrief } from "./workflowHandoff";

const projectRecord = (savedAt: string) => ({
  projects: [{
    id: "room-a",
    name: "Room A",
    owner: "Customer",
    stage: "Discovery",
    status: "recommended",
    updated: "Today",
    resumeTo: "/wingman/recommendations",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: savedAt,
    discoveryBrief: { savedAt, roomModel: { customer: "Room A", sourceCount: "One source" } },
  }],
  proposalDrafts: [],
  activeProjectId: "room-a",
});

describe("latest Discovery brief selection", () => {
  beforeEach(() => window.localStorage.clear());

  it("uses a newer autosaved Discovery draft instead of the older project brief", () => {
    window.localStorage.setItem(PROJECT_STORE_KEY, JSON.stringify(projectRecord("2026-11-04T10:00:00.000Z")));
    window.localStorage.setItem(DISCOVERY_SNAPSHOT_KEY, JSON.stringify({
      projectId: "room-a",
      activeStepIndex: 4,
      state: { answers: { sources: "five-eight-sources" } },
      brief: { savedAt: "2026-11-04T10:05:00.000Z", roomModel: { sourceCount: "5-8 sources" } },
      savedAt: "",
    }));

    expect(readLatestDiscoveryBrief()?.roomModel?.sourceCount).toBe("5-8 sources");
  });

  it("keeps the saved project brief when the browser draft is older", () => {
    window.localStorage.setItem(PROJECT_STORE_KEY, JSON.stringify(projectRecord("2026-11-04T10:05:00.000Z")));
    window.localStorage.setItem(DISCOVERY_SNAPSHOT_KEY, JSON.stringify({
      projectId: "room-a",
      activeStepIndex: 4,
      state: {},
      brief: { savedAt: "2026-11-04T10:00:00.000Z", roomModel: { sourceCount: "One source" } },
      savedAt: "",
    }));

    expect(readLatestDiscoveryBrief()?.roomModel?.sourceCount).toBe("One source");
  });
});
