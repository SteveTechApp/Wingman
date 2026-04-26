import { useCallback, useEffect, useState } from "react";
import { routeCatalogByKey } from "../app/routeCatalog";
import type { StatusVariant } from "../types";

export type ProjectStage =
  | "Discovery"
  | "Competitor Compare"
  | "Proposal Builder"
  | "Finder"
  | "Templates"
  | "Support";

export type StoredProject = {
  id: string;
  name: string;
  owner: string;
  stage: ProjectStage;
  status: StatusVariant;
  updated: string;
  resumeTo: string;
  createdAt: string;
  updatedAt: string;
};

export type StoredProposalDraft = {
  id: string;
  name: string;
  customer: string;
  state: string;
  createdAt: string;
  updatedAt: string;
};

export type ProjectStoreSnapshot = {
  projects: StoredProject[];
  proposalDrafts: StoredProposalDraft[];
};

const PROJECT_STORE_KEY = "wingman-project-store-v1";
const PROJECT_STORE_EVENT = "wingman:project-store-updated";

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function defaultStore(): ProjectStoreSnapshot {
  const timestamp = nowIso();

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
      },
    ],
    proposalDrafts: [
      {
        id: "boardroom-av-upgrade-proposal",
        name: "Boardroom AV Upgrade Proposal",
        customer: "Apex Group",
        state: "Ready for review",
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: "meeting-room-standard-bundle",
        name: "Meeting Room Standard Bundle",
        customer: "Northbridge",
        state: "Waiting on assumptions",
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: "retail-display-distribution-pack",
        name: "Retail Display Distribution Pack",
        customer: "Harbour Retail",
        state: "Ready for export",
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
  };
}

function safeStore(candidate: Partial<ProjectStoreSnapshot> | null | undefined): ProjectStoreSnapshot {
  return {
    projects: Array.isArray(candidate?.projects) ? candidate.projects : [],
    proposalDrafts: Array.isArray(candidate?.proposalDrafts) ? candidate.proposalDrafts : [],
  };
}

export function readProjectStore(): ProjectStoreSnapshot {
  if (typeof window === "undefined") {
    return defaultStore();
  }

  const raw = window.localStorage.getItem(PROJECT_STORE_KEY);

  if (!raw) {
    return defaultStore();
  }

  try {
    const parsed = JSON.parse(raw) as Partial<ProjectStoreSnapshot>;
    return safeStore(parsed);
  } catch {
    return defaultStore();
  }
}

export function writeProjectStore(snapshot: ProjectStoreSnapshot) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(PROJECT_STORE_KEY, JSON.stringify(safeStore(snapshot)));
  window.dispatchEvent(new CustomEvent(PROJECT_STORE_EVENT));
}

export function resetProjectStore() {
  writeProjectStore(defaultStore());
}

export function copyStoredProject(projectId: string) {
  const snapshot = readProjectStore();
  const project = snapshot.projects.find((item) => item.id === projectId);

  if (!project) {
    return;
  }

  const copy: StoredProject = {
    ...project,
    id: createId(project.id),
    name: `${project.name} Copy`,
    updated: "Just now",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  const index = snapshot.projects.findIndex((item) => item.id === projectId);
  const projects = [...snapshot.projects];
  projects.splice(index + 1, 0, copy);

  writeProjectStore({
    ...snapshot,
    projects,
  });
}

export function deleteStoredProject(projectId: string) {
  const snapshot = readProjectStore();

  writeProjectStore({
    ...snapshot,
    projects: snapshot.projects.filter((project) => project.id !== projectId),
  });
}

export function copyStoredProposalDraft(draftId: string) {
  const snapshot = readProjectStore();
  const draft = snapshot.proposalDrafts.find((item) => item.id === draftId);

  if (!draft) {
    return;
  }

  const copy: StoredProposalDraft = {
    ...draft,
    id: createId(draft.id),
    name: `${draft.name} Copy`,
    state: "Copied draft",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  const index = snapshot.proposalDrafts.findIndex((item) => item.id === draftId);
  const proposalDrafts = [...snapshot.proposalDrafts];
  proposalDrafts.splice(index + 1, 0, copy);

  writeProjectStore({
    ...snapshot,
    proposalDrafts,
  });
}

export function deleteStoredProposalDraft(draftId: string) {
  const snapshot = readProjectStore();

  writeProjectStore({
    ...snapshot,
    proposalDrafts: snapshot.proposalDrafts.filter((draft) => draft.id !== draftId),
  });
}

export function useProjectStore() {
  const [snapshot, setSnapshot] = useState<ProjectStoreSnapshot>(() => readProjectStore());

  useEffect(() => {
    function refresh() {
      setSnapshot(readProjectStore());
    }

    window.addEventListener(PROJECT_STORE_EVENT, refresh);
    window.addEventListener("storage", refresh);

    return () => {
      window.removeEventListener(PROJECT_STORE_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const copyProject = useCallback((projectId: string) => {
    copyStoredProject(projectId);
  }, []);

  const deleteProject = useCallback((projectId: string) => {
    deleteStoredProject(projectId);
  }, []);

  const copyProposalDraft = useCallback((draftId: string) => {
    copyStoredProposalDraft(draftId);
  }, []);

  const deleteProposalDraft = useCallback((draftId: string) => {
    deleteStoredProposalDraft(draftId);
  }, []);

  const resetStore = useCallback(() => {
    resetProjectStore();
  }, []);

  return {
    projects: snapshot.projects,
    proposalDrafts: snapshot.proposalDrafts,
    copyProject,
    deleteProject,
    copyProposalDraft,
    deleteProposalDraft,
    resetStore,
  };
}