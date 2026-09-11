import { routeCatalogByKey } from "../../../app/routeCatalog";
import type { ProjectStoreSnapshot } from "./projectTypes";

const LOCAL_PROJECT_MODE_MESSAGE = "Project backend sync is enabled, but Wingman is not signed in. Local changes are preserved.";

export function createDefaultProjectStore(now: () => string = () => new Date().toISOString()): ProjectStoreSnapshot {
  const timestamp = now();

  return {
    projects: [
      {
        id: "northbridge-meeting-room-refresh",
        name: "Northbridge Meeting Room Refresh",
        owner: "Steve",
        stage: "Discovery",
        status: "recommended",
        updated: "2 hours ago",
        resumeTo: routeCatalogByKey.discovery.path,
        createdAt: timestamp,
        updatedAt: timestamp,
        isDemo: true,
      },
      {
        id: "harbour-retail-signage-rollout",
        name: "Harbour Retail Signage Rollout",
        owner: "Channel Sales",
        stage: "Competitor Compare",
        status: "alternative",
        updated: "Today",
        resumeTo: routeCatalogByKey.compare.path,
        createdAt: timestamp,
        updatedAt: timestamp,
        isDemo: true,
      },
      {
        id: "westbrook-classroom-standard",
        name: "Westbrook Classroom Standard",
        owner: "Pre-sales",
        stage: "Proposal Builder",
        status: "recommended",
        updated: "Yesterday",
        resumeTo: routeCatalogByKey.proposal.path,
        createdAt: timestamp,
        updatedAt: timestamp,
        isDemo: true,
      },
    ],
    activeProjectId: null,
    syncStatus: {
      state: "local",
      message: LOCAL_PROJECT_MODE_MESSAGE,
      updatedAt: timestamp,
    },
    proposalDrafts: [
      {
        id: "boardroom-av-upgrade-proposal",
        name: "Boardroom AV Upgrade Proposal",
        customer: "Apex Group",
        state: "Ready for review",
        createdAt: timestamp,
        updatedAt: timestamp,
        isDemo: true,
      },
      {
        id: "meeting-room-standard-bundle",
        name: "Meeting Room Standard Bundle",
        customer: "Northbridge",
        state: "Waiting on assumptions",
        createdAt: timestamp,
        updatedAt: timestamp,
        isDemo: true,
      },
      {
        id: "retail-display-distribution-pack",
        name: "Retail Display Distribution Pack",
        customer: "Harbour Retail",
        state: "Ready for export",
        createdAt: timestamp,
        updatedAt: timestamp,
        isDemo: true,
      },
    ],
  };
}
