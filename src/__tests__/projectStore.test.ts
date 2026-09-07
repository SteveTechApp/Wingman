import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Tests for projectStore.ts - Project state management
 *
 * This test file mocks browser APIs (localStorage, window events) and tests
 * the core state management functions for the Wingman project store.
 */

// Mock the routeCatalog module before importing projectStore
vi.mock("@/wingman2/app/routeCatalog", () => ({
  routeCatalogByKey: {
    discovery: { path: "/wingman/discovery" },
    recommendations: { path: "/wingman/recommendations" },
    compare: { path: "/wingman/compare" },
    proposal: { path: "/wingman/proposal" },
    projects: { path: "/wingman/projects" },
    support: { path: "/wingman/support" },
    productPitch: { path: "/wingman/product-pitch" },
  },
}));

// Import after mocking
import {
  readProjectStore,
  writeProjectStore,
  resetProjectStore,
  copyStoredProject,
  deleteStoredProject,
  copyStoredProposalDraft,
  deleteStoredProposalDraft,
  getActiveProject,
  getCurrentWorkflowProject,
  setActiveProjectId,
  clearActiveProject,
  upsertStoredProject,
  updateStoredProject,
  saveDiscoveryBriefToProject,
  saveProductSelectionToProject,
  saveProductSelectionToCurrentProject,
  createProjectForProductSelection,
  saveIngestAnalysisToProject,
  saveCompareRunToProject,
  saveProjectProposalToProject,
  saveProjectRequirementsToProject,
  saveRecommendationFeedback,
  projectHasWorkflowData,
  getProjectSyncStatus,
  projectBackendSyncEnabled,
  type StoredProject,
  type StoredDiscoveryBrief,
  type StoredProductSelection,
  type StoredIngestAnalysis,
  type StoredCompareRun,
  type StoredProjectProposal,
  type StoredRequirementRecord,
  type ProjectStoreSnapshot,
} from "@/wingman2/data/projectStore";
import { buildHydrationSinceManifest, mergeProjectVersionsForHydration } from "@/wingman2/data/projectHydrationMerge";
import { changedProjectLanes, projectLaneLabel, PROJECT_SYNC_CONFLICT_LANES } from "@/wingman2/data/projectSyncConflict";

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

// Mock window events
const dispatchEventMock = vi.fn();
const addEventListenerMock = vi.fn();
const removeEventListenerMock = vi.fn();

describe("projectStore", () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    localStorageMock.clear();

    // Setup window mocks
    Object.defineProperty(window, "localStorage", {
      value: localStorageMock,
      writable: true,
    });
    window.dispatchEvent = dispatchEventMock;
    window.addEventListener = addEventListenerMock;
    window.removeEventListener = removeEventListenerMock;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("readProjectStore", () => {
    it("should return default store when localStorage is empty", () => {
      const store = readProjectStore();

      expect(store).toBeDefined();
      expect(store.projects).toBeDefined();
      expect(Array.isArray(store.projects)).toBe(true);
      expect(store.proposalDrafts).toBeDefined();
      expect(Array.isArray(store.proposalDrafts)).toBe(true);
    });

    it("should return default store with sample projects", () => {
      const store = readProjectStore();

      // Default store should have sample projects
      expect(store.projects.length).toBeGreaterThan(0);
      expect(store.projects[0]).toHaveProperty("id");
      expect(store.projects[0]).toHaveProperty("name");
      expect(store.projects[0]).toHaveProperty("owner");
      expect(store.projects[0]).toHaveProperty("stage");
      expect(store.projects[0]).toHaveProperty("status");
    });

    it("should parse valid JSON from localStorage", () => {
      const storedData: ProjectStoreSnapshot = {
        projects: [
          {
            id: "test-project-1",
            name: "Test Project",
            owner: "Test User",
            stage: "Discovery",
            status: "recommended",
            updated: "Just now",
            resumeTo: "/wingman/discovery",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        proposalDrafts: [],
        activeProjectId: "test-project-1",
        syncStatus: {
          state: "local",
          message: "Test message",
          updatedAt: new Date().toISOString(),
        },
      };

      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(storedData));

      const store = readProjectStore();

      expect(store.projects).toHaveLength(1);
      expect(store.projects[0].id).toBe("test-project-1");
      expect(store.projects[0].name).toBe("Test Project");
      expect(store.activeProjectId).toBe("test-project-1");
    });

    it("should return default store when localStorage contains invalid JSON", () => {
      localStorageMock.getItem.mockReturnValueOnce("invalid json {{{");

      const store = readProjectStore();

      // Should fall back to default store
      expect(store).toBeDefined();
      expect(store.projects).toBeDefined();
      expect(Array.isArray(store.projects)).toBe(true);
    });

    it("should handle null values gracefully", () => {
      localStorageMock.getItem.mockReturnValueOnce(
        JSON.stringify({
          projects: null,
          proposalDrafts: null,
          activeProjectId: null,
        })
      );

      const store = readProjectStore();

      expect(store.projects).toEqual([]);
      expect(store.proposalDrafts).toEqual([]);
      expect(store.activeProjectId).toBeNull();
    });

    it("should normalize malformed project data", () => {
      const malformedData = {
        projects: [
          {
            id: "partial-project",
            // Missing required fields
          },
          {
            // Completely malformed - should be filtered out
            notAnId: 123,
          },
        ],
        proposalDrafts: [],
      };

      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(malformedData));

      const store = readProjectStore();

      // Malformed projects should be normalized or filtered
      expect(Array.isArray(store.projects)).toBe(true);
    });
  });

  describe("writeProjectStore", () => {
    it("should write snapshot to localStorage", () => {
      const snapshot: ProjectStoreSnapshot = {
        projects: [
          {
            id: "new-project",
            name: "New Project",
            owner: "Owner",
            stage: "Discovery",
            status: "recommended",
            updated: "Now",
            resumeTo: "/wingman/discovery",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        proposalDrafts: [],
        activeProjectId: "new-project",
      };

      writeProjectStore(snapshot);

      expect(localStorageMock.setItem).toHaveBeenCalled();
      expect(dispatchEventMock).toHaveBeenCalled();
    });

    it("should dispatch custom event after writing", () => {
      writeProjectStore({
        projects: [],
        proposalDrafts: [],
        activeProjectId: null,
      });

      expect(dispatchEventMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "wingman:project-store-updated",
        })
      );
    });

    it("should normalize store data before writing", () => {
      const snapshot = {
        projects: [
          {
            id: "test",
            name: "Test",
            owner: "Owner",
            stage: "Invalid Stage" as never, // Invalid stage should be normalized
            status: "invalid-status", // Invalid status should be normalized
            updated: "Now",
            resumeTo: "/wingman/discovery",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        proposalDrafts: [],
        activeProjectId: "test",
      };

      writeProjectStore(snapshot as ProjectStoreSnapshot);

      expect(localStorageMock.setItem).toHaveBeenCalled();
      const writtenData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      // Invalid stage should be normalized to "Discovery"
      expect(writtenData.projects[0].stage).toBe("Discovery");
    });
  });

  describe("resetProjectStore", () => {
    it("should reset store to default state", () => {
      // First write some custom data
      const customSnapshot: ProjectStoreSnapshot = {
        projects: [
          {
            id: "custom-project",
            name: "Custom",
            owner: "User",
            stage: "Proposal Builder",
            status: "caution",
            updated: "Yesterday",
            resumeTo: "/wingman/proposal",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        proposalDrafts: [],
        activeProjectId: "custom-project",
      };
      writeProjectStore(customSnapshot);

      // Reset the store
      resetProjectStore();

      expect(localStorageMock.setItem).toHaveBeenCalled();
    });
  });

  describe("copyStoredProject", () => {
    it("should create a copy of an existing project", () => {
      const originalProject: StoredProject = {
        id: "original-project",
        name: "Original Project",
        owner: "Owner",
        stage: "Discovery",
        status: "recommended",
        updated: "Now",
        resumeTo: "/wingman/discovery",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const snapshot: ProjectStoreSnapshot = {
        projects: [originalProject],
        proposalDrafts: [],
        activeProjectId: null,
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(snapshot));

      copyStoredProject("original-project");

      expect(localStorageMock.setItem).toHaveBeenCalled();
      const writtenData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);

      expect(writtenData.projects.length).toBe(2);
      const copiedProject = writtenData.projects.find(
        (p: StoredProject) => p.name === "Original Project Copy"
      );
      expect(copiedProject).toBeDefined();
      expect(copiedProject.id).not.toBe("original-project");
    });

    it("should do nothing when project does not exist", () => {
      const snapshot: ProjectStoreSnapshot = {
        projects: [],
        proposalDrafts: [],
        activeProjectId: null,
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(snapshot));

      copyStoredProject("non-existent-id");

      // setItem should not be called when project doesn't exist
      // (the function returns early)
    });
  });

  describe("deleteStoredProject", () => {
    it("should remove a project from the store", () => {
      const snapshot: ProjectStoreSnapshot = {
        projects: [
          {
            id: "to-delete",
            name: "Delete Me",
            owner: "Owner",
            stage: "Discovery",
            status: "recommended",
            updated: "Now",
            resumeTo: "/wingman/discovery",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: "to-keep",
            name: "Keep Me",
            owner: "Owner",
            stage: "Discovery",
            status: "recommended",
            updated: "Now",
            resumeTo: "/wingman/discovery",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        proposalDrafts: [],
        activeProjectId: "to-delete",
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(snapshot));

      deleteStoredProject("to-delete");

      expect(localStorageMock.setItem).toHaveBeenCalled();
      const writtenData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);

      expect(writtenData.projects.length).toBe(1);
      expect(writtenData.projects[0].id).toBe("to-keep");
      expect(writtenData.activeProjectId).toBeNull();
    });

    it("should clear activeProjectId when deleting active project", () => {
      const snapshot: ProjectStoreSnapshot = {
        projects: [
          {
            id: "active-project",
            name: "Active",
            owner: "Owner",
            stage: "Discovery",
            status: "recommended",
            updated: "Now",
            resumeTo: "/wingman/discovery",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        proposalDrafts: [],
        activeProjectId: "active-project",
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(snapshot));

      deleteStoredProject("active-project");

      const writtenData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(writtenData.activeProjectId).toBeNull();
    });
  });

  describe("copyStoredProposalDraft", () => {
    it("should create a copy of an existing draft", () => {
      const snapshot: ProjectStoreSnapshot = {
        projects: [],
        proposalDrafts: [
          {
            id: "original-draft",
            name: "Original Draft",
            customer: "Customer",
            state: "Ready",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        activeProjectId: null,
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(snapshot));

      copyStoredProposalDraft("original-draft");

      expect(localStorageMock.setItem).toHaveBeenCalled();
      const writtenData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);

      expect(writtenData.proposalDrafts.length).toBe(2);
    });
  });

  describe("deleteStoredProposalDraft", () => {
    it("should remove a draft from the store", () => {
      const snapshot: ProjectStoreSnapshot = {
        projects: [],
        proposalDrafts: [
          {
            id: "draft-to-delete",
            name: "Delete Draft",
            customer: "Customer",
            state: "Draft",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        activeProjectId: null,
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(snapshot));

      deleteStoredProposalDraft("draft-to-delete");

      expect(localStorageMock.setItem).toHaveBeenCalled();
      const writtenData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);

      expect(writtenData.proposalDrafts.length).toBe(0);
    });
  });

  describe("getActiveProject", () => {
    it("should return the active project when set", () => {
      const activeProject: StoredProject = {
        id: "active-id",
        name: "Active Project",
        owner: "Owner",
        stage: "Discovery",
        status: "recommended",
        updated: "Now",
        resumeTo: "/wingman/discovery",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const snapshot: ProjectStoreSnapshot = {
        projects: [activeProject],
        proposalDrafts: [],
        activeProjectId: "active-id",
      };

      const result = getActiveProject(snapshot);

      expect(result).toEqual(activeProject);
    });

    it("should return null when no active project is set", () => {
      const snapshot: ProjectStoreSnapshot = {
        projects: [
          {
            id: "some-project",
            name: "Some Project",
            owner: "Owner",
            stage: "Discovery",
            status: "recommended",
            updated: "Now",
            resumeTo: "/wingman/discovery",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        proposalDrafts: [],
        activeProjectId: null,
      };

      const result = getActiveProject(snapshot);

      expect(result).toBeNull();
    });

    it("should return null when activeProjectId does not match any project", () => {
      const snapshot: ProjectStoreSnapshot = {
        projects: [
          {
            id: "project-1",
            name: "Project 1",
            owner: "Owner",
            stage: "Discovery",
            status: "recommended",
            updated: "Now",
            resumeTo: "/wingman/discovery",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        proposalDrafts: [],
        activeProjectId: "non-existent-id",
      };

      const result = getActiveProject(snapshot);

      expect(result).toBeNull();
    });
  });

  describe("getCurrentWorkflowProject", () => {
    it("should return active project if set", () => {
      const activeProject: StoredProject = {
        id: "active",
        name: "Active",
        owner: "Owner",
        stage: "Discovery",
        status: "recommended",
        updated: "Now",
        resumeTo: "/wingman/discovery",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        discoveryBrief: { savedAt: new Date().toISOString() },
      };

      const snapshot: ProjectStoreSnapshot = {
        projects: [activeProject],
        proposalDrafts: [],
        activeProjectId: "active",
      };

      const result = getCurrentWorkflowProject(snapshot);

      expect(result?.id).toBe("active");
    });

    it("should return first project with workflow data when no active project", () => {
      const projectWithWorkflow: StoredProject = {
        id: "with-workflow",
        name: "With Workflow",
        owner: "Owner",
        stage: "Discovery",
        status: "recommended",
        updated: "Now",
        resumeTo: "/wingman/discovery",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        discoveryBrief: { savedAt: new Date().toISOString() },
      };

      const projectWithoutWorkflow: StoredProject = {
        id: "without-workflow",
        name: "Without Workflow",
        owner: "Owner",
        stage: "Discovery",
        status: "recommended",
        updated: "Now",
        resumeTo: "/wingman/discovery",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const snapshot: ProjectStoreSnapshot = {
        projects: [projectWithoutWorkflow, projectWithWorkflow],
        proposalDrafts: [],
        activeProjectId: null,
      };

      const result = getCurrentWorkflowProject(snapshot);

      expect(result?.id).toBe("with-workflow");
    });

    it("should return null when no projects have workflow data", () => {
      const snapshot: ProjectStoreSnapshot = {
        projects: [
          {
            id: "no-workflow",
            name: "No Workflow",
            owner: "Owner",
            stage: "Discovery",
            status: "recommended",
            updated: "Now",
            resumeTo: "/wingman/discovery",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        proposalDrafts: [],
        activeProjectId: null,
      };

      const result = getCurrentWorkflowProject(snapshot);

      expect(result).toBeNull();
    });
  });

  describe("setActiveProjectId", () => {
    it("should set active project ID when project exists", () => {
      const snapshot: ProjectStoreSnapshot = {
        projects: [
          {
            id: "project-to-activate",
            name: "Activate Me",
            owner: "Owner",
            stage: "Discovery",
            status: "recommended",
            updated: "Now",
            resumeTo: "/wingman/discovery",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        proposalDrafts: [],
        activeProjectId: null,
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(snapshot));

      setActiveProjectId("project-to-activate");

      const writtenData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(writtenData.activeProjectId).toBe("project-to-activate");
    });

    it("should set activeProjectId to null when project does not exist", () => {
      const snapshot: ProjectStoreSnapshot = {
        projects: [],
        proposalDrafts: [],
        activeProjectId: null,
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(snapshot));

      setActiveProjectId("non-existent");

      const writtenData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(writtenData.activeProjectId).toBeNull();
    });
  });

  describe("clearActiveProject", () => {
    it("should set activeProjectId to null", () => {
      const snapshot: ProjectStoreSnapshot = {
        projects: [
          {
            id: "active",
            name: "Active",
            owner: "Owner",
            stage: "Discovery",
            status: "recommended",
            updated: "Now",
            resumeTo: "/wingman/discovery",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        proposalDrafts: [],
        activeProjectId: "active",
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(snapshot));

      clearActiveProject();

      const writtenData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(writtenData.activeProjectId).toBeNull();
    });
  });

  describe("upsertStoredProject", () => {
    it("should insert a new project when it does not exist", () => {
      const snapshot: ProjectStoreSnapshot = {
        projects: [],
        proposalDrafts: [],
        activeProjectId: null,
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(snapshot));

      const newProject: StoredProject = {
        id: "new-project",
        name: "New Project",
        owner: "Owner",
        stage: "Discovery",
        status: "recommended",
        updated: "Now",
        resumeTo: "/wingman/discovery",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = upsertStoredProject(newProject);

      expect(result.id).toBe("new-project");
      const writtenData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(writtenData.projects.length).toBe(1);
      expect(writtenData.activeProjectId).toBe("new-project");
    });

    it("should update existing project when it exists", () => {
      const existingProject: StoredProject = {
        id: "existing",
        name: "Existing",
        owner: "Owner",
        stage: "Discovery",
        status: "recommended",
        updated: "Yesterday",
        resumeTo: "/wingman/discovery",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const snapshot: ProjectStoreSnapshot = {
        projects: [existingProject],
        proposalDrafts: [],
        activeProjectId: null,
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(snapshot));

      const updatedProject: StoredProject = {
        ...existingProject,
        name: "Updated Name",
        stage: "Proposal Builder",
      };

      upsertStoredProject(updatedProject);

      const writtenData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(writtenData.projects.length).toBe(1);
      expect(writtenData.projects[0].name).toBe("Updated Name");
      expect(writtenData.projects[0].stage).toBe("Proposal Builder");
    });

    it("should move updated project to the front of the list", () => {
      const project1: StoredProject = {
        id: "project-1",
        name: "Project 1",
        owner: "Owner",
        stage: "Discovery",
        status: "recommended",
        updated: "Now",
        resumeTo: "/wingman/discovery",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const project2: StoredProject = {
        id: "project-2",
        name: "Project 2",
        owner: "Owner",
        stage: "Discovery",
        status: "recommended",
        updated: "Now",
        resumeTo: "/wingman/discovery",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const snapshot: ProjectStoreSnapshot = {
        projects: [project1, project2],
        proposalDrafts: [],
        activeProjectId: null,
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(snapshot));

      // Update project2 - it should move to the front
      upsertStoredProject({ ...project2, name: "Updated Project 2" });

      const writtenData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(writtenData.projects[0].id).toBe("project-2");
      expect(writtenData.projects[0].name).toBe("Updated Project 2");
    });
  });

  describe("updateStoredProject", () => {
    it("should update project using updater function", () => {
      const existingProject: StoredProject = {
        id: "to-update",
        name: "Original Name",
        owner: "Owner",
        stage: "Discovery",
        status: "recommended",
        updated: "Now",
        resumeTo: "/wingman/discovery",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const snapshot: ProjectStoreSnapshot = {
        projects: [existingProject],
        proposalDrafts: [],
        activeProjectId: null,
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(snapshot));

      const result = updateStoredProject("to-update", (project) => ({
        ...project,
        name: "Updated Name",
        stage: "Proposal Builder",
      }));

      expect(result).not.toBeNull();
      expect(result?.name).toBe("Updated Name");
      expect(result?.stage).toBe("Proposal Builder");
    });

    it("should return null when project does not exist", () => {
      const snapshot: ProjectStoreSnapshot = {
        projects: [],
        proposalDrafts: [],
        activeProjectId: null,
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(snapshot));

      const result = updateStoredProject("non-existent", (project) => ({
        ...project,
        name: "Updated",
      }));

      expect(result).toBeNull();
    });
  });

  describe("saveDiscoveryBriefToProject", () => {
    it("should create new project with discovery brief when none exists", () => {
      const snapshot: ProjectStoreSnapshot = {
        projects: [],
        proposalDrafts: [],
        activeProjectId: null,
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(snapshot));

      const brief: StoredDiscoveryBrief = {
        savedAt: new Date().toISOString(),
        roomModel: {
          roomType: "Boardroom",
          customer: "Acme Corp",
          outcome: "Video conferencing",
        },
        capturedPercent: 75,
      };

      const result = saveDiscoveryBriefToProject(brief);

      expect(result).not.toBeNull();
      expect(result.discoveryBrief).toMatchObject(brief);
      expect(result.stage).toBe("Discovery");
      expect(result.status).toBe("recommended");
    });

    it("should update existing workflow project with discovery brief", () => {
      const existingProject: StoredProject = {
        id: "existing-project",
        name: "Existing",
        owner: "Owner",
        stage: "Discovery",
        status: "alternative",
        updated: "Yesterday",
        resumeTo: "/wingman/discovery",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        discoveryBrief: { savedAt: new Date().toISOString() },
      };

      const snapshot: ProjectStoreSnapshot = {
        projects: [existingProject],
        proposalDrafts: [],
        activeProjectId: null,
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(snapshot));

      const newBrief: StoredDiscoveryBrief = {
        savedAt: new Date().toISOString(),
        roomModel: { roomType: "Meeting Room" },
        capturedPercent: 90,
      };

      const result = saveDiscoveryBriefToProject(newBrief);

      expect(result.id).toBe("existing-project");
      expect(result.discoveryBrief).toMatchObject(newBrief);
    });
  });

  describe("saveProductSelectionToProject", () => {
    it("should add product selection to project", () => {
      const existingProject: StoredProject = {
        id: "project-1",
        name: "Project",
        owner: "Owner",
        stage: "Discovery",
        status: "recommended",
        updated: "Now",
        resumeTo: "/wingman/discovery",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const snapshot: ProjectStoreSnapshot = {
        projects: [existingProject],
        proposalDrafts: [],
        activeProjectId: null,
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(snapshot));

      const selection: StoredProductSelection = {
        sku: "TEST-SKU-001",
        title: "Test Product",
        family: "Test Family",
        status: "recommended",
        addedAt: new Date().toISOString(),
        source: "Recommendations",
      };

      const result = saveProductSelectionToProject("project-1", selection);

      expect(result.productSelections).toBeDefined();
      expect(result.productSelections?.length).toBe(1);
      expect(result.productSelections?.[0].sku).toBe("TEST-SKU-001");
      expect(result.stage).toBe("Recommendations");
    });

    it("should not duplicate product selections with same SKU", () => {
      const existingProject: StoredProject = {
        id: "project-1",
        name: "Project",
        owner: "Owner",
        stage: "Finder",
        status: "recommended",
        updated: "Now",
        resumeTo: "/wingman/recommendations",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        productSelections: [
          {
            sku: "EXISTING-SKU",
            title: "Existing Product",
            addedAt: new Date().toISOString(),
            source: "Recommendations",
          },
        ],
      };

      const snapshot: ProjectStoreSnapshot = {
        projects: [existingProject],
        proposalDrafts: [],
        activeProjectId: null,
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(snapshot));

      const selection: StoredProductSelection = {
        sku: "EXISTING-SKU",
        title: "Updated Product Title",
        addedAt: new Date().toISOString(),
        source: "Recommendations",
      };

      const result = saveProductSelectionToProject("project-1", selection);

      expect(result.productSelections?.length).toBe(1);
      expect(result.productSelections?.[0].title).toBe("Updated Product Title");
    });
  });

  describe("saveProductSelectionToCurrentProject", () => {
    it("should create new project when no current workflow project exists", () => {
      const snapshot: ProjectStoreSnapshot = {
        projects: [],
        proposalDrafts: [],
        activeProjectId: null,
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(snapshot));

      const selection: StoredProductSelection = {
        sku: "NEW-SKU",
        title: "New Product",
        addedAt: new Date().toISOString(),
        source: "Recommendations",
      };

      const result = saveProductSelectionToCurrentProject(selection);

      expect(result).not.toBeNull();
      expect(result.productSelections?.[0].sku).toBe("NEW-SKU");
    });
  });

  describe("createProjectForProductSelection", () => {
    it("creates a separately named active project instead of reusing an existing workflow", () => {
      const existingProject: StoredProject = {
        id: "existing-project",
        name: "Existing opportunity",
        owner: "Owner",
        stage: "Discovery",
        status: "recommended",
        updated: "Now",
        resumeTo: "/wingman/discovery",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        discoveryBrief: { savedAt: new Date().toISOString() },
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        projects: [existingProject],
        proposalDrafts: [],
        activeProjectId: "existing-project",
      } satisfies ProjectStoreSnapshot));

      const result = createProjectForProductSelection("New boardroom", {
        sku: "MX-0402-MST",
        title: "Matrix switcher",
        source: "Product call cards",
      });

      expect(result.id).not.toBe(existingProject.id);
      expect(result.name).toBe("New boardroom");
      expect(result.resumeTo).toBe("/wingman/proposal");
      expect(result.productSelections?.[0]?.sku).toBe("MX-0402-MST");
    });
  });

  describe("saveIngestAnalysisToProject", () => {
    it("should save ingest analysis to current project", () => {
      const existingProject: StoredProject = {
        id: "ingest-project",
        name: "Ingest Project",
        owner: "Owner",
        stage: "Discovery",
        status: "recommended",
        updated: "Now",
        resumeTo: "/wingman/discovery",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        discoveryBrief: { savedAt: new Date().toISOString() },
      };

      const snapshot: ProjectStoreSnapshot = {
        projects: [existingProject],
        proposalDrafts: [],
        activeProjectId: null,
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(snapshot));

      const ingest: Omit<StoredIngestAnalysis, "updatedAt"> = {
        requirements: ["Requirement 1", "Requirement 2"],
        unknowns: ["Unknown 1"],
        skippedFiles: [],
        files: ["document.pdf"],
      };

      const result = saveIngestAnalysisToProject(ingest);

      expect(result).not.toBeNull();
      expect(result?.ingest).toBeDefined();
      expect(result?.ingest?.requirements).toHaveLength(2);
      expect(result?.ingest?.files).toContain("document.pdf");
    });

    it("should return null when requireExistingProject is true and no active project", () => {
      const snapshot: ProjectStoreSnapshot = {
        projects: [],
        proposalDrafts: [],
        activeProjectId: null,
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(snapshot));

      const ingest: Omit<StoredIngestAnalysis, "updatedAt"> = {
        requirements: [],
        unknowns: [],
        skippedFiles: [],
        files: [],
      };

      const result = saveIngestAnalysisToProject(ingest, { requireExistingProject: true });

      expect(result).toBeNull();
    });
  });

  describe("saveCompareRunToProject", () => {
    it("should save compare run to project", () => {
      const existingProject: StoredProject = {
        id: "compare-project",
        name: "Compare Project",
        owner: "Owner",
        stage: "Discovery",
        status: "recommended",
        updated: "Now",
        resumeTo: "/wingman/discovery",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        discoveryBrief: { savedAt: new Date().toISOString() },
      };

      const snapshot: ProjectStoreSnapshot = {
        projects: [existingProject],
        proposalDrafts: [],
        activeProjectId: null,
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(snapshot));

      const compareRun: Omit<StoredCompareRun, "id" | "createdAt"> = {
        competitorBrand: "Competitor",
        competitorSku: "COMP-SKU",
        wyrestormSku: "WS-SKU",
        wyrestormTitle: "WyreStorm Product",
        matchScore: 85,
        confidence: "high",
      };

      const result = saveCompareRunToProject(compareRun);

      expect(result).not.toBeNull();
      expect(result?.compareRuns).toBeDefined();
      expect(result?.compareRuns?.length).toBe(1);
      expect(result?.compareRuns?.[0].competitorSku).toBe("COMP-SKU");
      expect(result?.stage).toBe("Competitor Compare");
    });

    it("should prepend new compare run to existing runs", () => {
      const existingProject: StoredProject = {
        id: "compare-project",
        name: "Compare Project",
        owner: "Owner",
        stage: "Competitor Compare",
        status: "alternative",
        updated: "Now",
        resumeTo: "/wingman/compare",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        compareRuns: [
          {
            id: "existing-run",
            createdAt: new Date().toISOString(),
            competitorSku: "OLD-COMP",
          },
        ],
      };

      const snapshot: ProjectStoreSnapshot = {
        projects: [existingProject],
        proposalDrafts: [],
        activeProjectId: "compare-project",
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(snapshot));

      const newRun: Omit<StoredCompareRun, "id" | "createdAt"> = {
        competitorSku: "NEW-COMP",
        matchScore: 90,
      };

      const result = saveCompareRunToProject(newRun);

      expect(result?.compareRuns?.length).toBe(2);
      expect(result?.compareRuns?.[0].competitorSku).toBe("NEW-COMP");
      expect(result?.compareRuns?.[1].competitorSku).toBe("OLD-COMP");
    });
  });

  describe("saveProjectProposalToProject", () => {
    it("should save proposal to project", () => {
      const existingProject: StoredProject = {
        id: "proposal-project",
        name: "Proposal Project",
        owner: "Owner",
        stage: "Finder",
        status: "recommended",
        updated: "Now",
        resumeTo: "/wingman/recommendations",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        discoveryBrief: { savedAt: new Date().toISOString() },
      };

      const snapshot: ProjectStoreSnapshot = {
        projects: [existingProject],
        proposalDrafts: [],
        activeProjectId: null,
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(snapshot));

      const proposal: StoredProjectProposal = {
        title: "Test Proposal",
        summary: "A test proposal summary",
        sections: ["Introduction", "Products", "Conclusion"],
        products: [],
        assumptions: [],
        updatedAt: new Date().toISOString(),
      };

      const result = saveProjectProposalToProject(proposal);

      expect(result.proposal).toBeDefined();
      expect(result.proposal?.title).toBe("Test Proposal");
      expect(result.stage).toBe("Proposal Builder");
    });

    it("should set status to alternative when assumptions exist", () => {
      const snapshot: ProjectStoreSnapshot = {
        projects: [],
        proposalDrafts: [],
        activeProjectId: null,
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(snapshot));

      const proposal: StoredProjectProposal = {
        title: "Proposal with Assumptions",
        summary: "Summary",
        sections: [],
        products: [],
        assumptions: ["Assumption 1", "Assumption 2"],
        updatedAt: new Date().toISOString(),
      };

      const result = saveProjectProposalToProject(proposal);

      expect(result.status).toBe("alternative");
    });
  });

  describe("saveProjectRequirementsToProject", () => {
    it("should save requirements to project", () => {
      const existingProject: StoredProject = {
        id: "requirements-project",
        name: "Requirements Project",
        owner: "Owner",
        stage: "Discovery",
        status: "recommended",
        updated: "Now",
        resumeTo: "/wingman/discovery",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const snapshot: ProjectStoreSnapshot = {
        projects: [existingProject],
        proposalDrafts: [],
        activeProjectId: "requirements-project",
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(snapshot));

      const requirements: StoredRequirementRecord[] = [
        {
          id: "req-1",
          label: "Display Count",
          value: "4",
          category: "Displays",
          source: "Discovery",
          status: "confirmed",
          whyItMatters: "Determines matrix size",
          updatedAt: new Date().toISOString(),
        },
      ];

      const result = saveProjectRequirementsToProject("requirements-project", requirements);

      expect(result).not.toBeNull();
      expect(result?.requirements).toHaveLength(1);
      expect(result?.requirements?.[0].label).toBe("Display Count");
    });

    it("should return null when project does not exist", () => {
      const snapshot: ProjectStoreSnapshot = {
        projects: [],
        proposalDrafts: [],
        activeProjectId: null,
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(snapshot));

      const result = saveProjectRequirementsToProject("non-existent", []);

      expect(result).toBeNull();
    });
  });

  describe("saveRecommendationFeedback", () => {
    it("should save feedback to current workflow project", () => {
      const existingProject: StoredProject = {
        id: "feedback-project",
        name: "Feedback Project",
        owner: "Owner",
        stage: "Finder",
        status: "recommended",
        updated: "Now",
        resumeTo: "/wingman/recommendations",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        productSelections: [{ sku: "TEST-SKU", addedAt: new Date().toISOString(), source: "Finder" }],
      };

      const snapshot: ProjectStoreSnapshot = {
        projects: [existingProject],
        proposalDrafts: [],
        activeProjectId: null,
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(snapshot));

      const result = saveRecommendationFeedback({
        scope: "recommendation",
        rating: "accepted",
        label: "Good product fit",
        sku: "TEST-SKU",
      });

      expect(result).not.toBeNull();
      expect(result?.feedback).toBeDefined();
      expect(result?.feedback?.length).toBe(1);
      expect(result?.feedback?.[0].rating).toBe("accepted");
    });

    it("should return null when no workflow project exists", () => {
      const snapshot: ProjectStoreSnapshot = {
        projects: [],
        proposalDrafts: [],
        activeProjectId: null,
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(snapshot));

      const result = saveRecommendationFeedback({
        scope: "recommendation",
        rating: "needs-review",
        label: "Test",
      });

      expect(result).toBeNull();
    });
  });

  describe("projectHasWorkflowData", () => {
    it("should return true when project has discoveryBrief", () => {
      const project: StoredProject = {
        id: "test",
        name: "Test",
        owner: "Owner",
        stage: "Discovery",
        status: "recommended",
        updated: "Now",
        resumeTo: "/wingman/discovery",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        discoveryBrief: { savedAt: new Date().toISOString() },
      };

      expect(projectHasWorkflowData(project)).toBe(true);
    });

    it("should return true when project has productSelections", () => {
      const project: StoredProject = {
        id: "test",
        name: "Test",
        owner: "Owner",
        stage: "Finder",
        status: "recommended",
        updated: "Now",
        resumeTo: "/wingman/recommendations",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        productSelections: [{ sku: "SKU", addedAt: new Date().toISOString(), source: "Finder" }],
      };

      expect(projectHasWorkflowData(project)).toBe(true);
    });

    it("should return true when project has compareRuns", () => {
      const project: StoredProject = {
        id: "test",
        name: "Test",
        owner: "Owner",
        stage: "Competitor Compare",
        status: "alternative",
        updated: "Now",
        resumeTo: "/wingman/compare",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        compareRuns: [{ id: "run-1", createdAt: new Date().toISOString() }],
      };

      expect(projectHasWorkflowData(project)).toBe(true);
    });

    it("should return true when project has ingest", () => {
      const project: StoredProject = {
        id: "test",
        name: "Test",
        owner: "Owner",
        stage: "Discovery",
        status: "recommended",
        updated: "Now",
        resumeTo: "/wingman/discovery",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ingest: {
          requirements: [],
          unknowns: [],
          skippedFiles: [],
          files: ["doc.pdf"],
          updatedAt: new Date().toISOString(),
        },
      };

      expect(projectHasWorkflowData(project)).toBe(true);
    });

    it("should return true when project has proposal", () => {
      const project: StoredProject = {
        id: "test",
        name: "Test",
        owner: "Owner",
        stage: "Proposal Builder",
        status: "recommended",
        updated: "Now",
        resumeTo: "/wingman/proposal",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        proposal: {
          title: "Proposal",
          summary: "",
          sections: [],
          products: [],
          assumptions: [],
          updatedAt: new Date().toISOString(),
        },
      };

      expect(projectHasWorkflowData(project)).toBe(true);
    });

    it("should return true when project has workflow state", () => {
      const project: StoredProject = {
        id: "test",
        name: "Test",
        owner: "Owner",
        stage: "Discovery",
        status: "recommended",
        updated: "Now",
        resumeTo: "/wingman/discovery",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        workflow: {
          source: "Discovery",
          lastStep: "Saved",
          nextRoute: "/wingman/recommendations",
          updatedAt: new Date().toISOString(),
        },
      };

      expect(projectHasWorkflowData(project)).toBe(true);
    });

    it("should return true when project has feedback", () => {
      const project: StoredProject = {
        id: "test",
        name: "Test",
        owner: "Owner",
        stage: "Finder",
        status: "recommended",
        updated: "Now",
        resumeTo: "/wingman/recommendations",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        feedback: [
          {
            id: "fb-1",
            createdAt: new Date().toISOString(),
            scope: "recommendation",
            rating: "accepted",
            label: "Good",
          },
        ],
      };

      expect(projectHasWorkflowData(project)).toBe(true);
    });

    it("should return false when project has no workflow data", () => {
      const project: StoredProject = {
        id: "test",
        name: "Test",
        owner: "Owner",
        stage: "Discovery",
        status: "recommended",
        updated: "Now",
        resumeTo: "/wingman/discovery",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      expect(projectHasWorkflowData(project)).toBe(false);
    });
  });

  describe("getProjectSyncStatus", () => {
    it("should return sync status from snapshot", () => {
      const snapshot: ProjectStoreSnapshot = {
        projects: [],
        proposalDrafts: [],
        activeProjectId: null,
        syncStatus: {
          state: "synced",
          message: "All synced",
          updatedAt: new Date().toISOString(),
        },
      };

      const result = getProjectSyncStatus(snapshot);

      // The function checks storage mode which affects the result
      expect(result).toBeDefined();
      expect(result.state).toBeDefined();
      expect(result.message).toBeDefined();
    });

    it("should return local status when storage mode is local", () => {
      const snapshot: ProjectStoreSnapshot = {
        projects: [],
        proposalDrafts: [],
        activeProjectId: null,
      };

      const result = getProjectSyncStatus(snapshot);

      expect(result.state).toBe("local");
    });
  });

  describe("projectBackendSyncEnabled", () => {
    it("should return a boolean", () => {
      const result = projectBackendSyncEnabled();
      expect(typeof result).toBe("boolean");
    });
  });

  describe("Edge cases", () => {
    it("should handle empty project name", () => {
      const snapshot: ProjectStoreSnapshot = {
        projects: [],
        proposalDrafts: [],
        activeProjectId: null,
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(snapshot));

      const project: StoredProject = {
        id: "empty-name",
        name: "",
        owner: "Owner",
        stage: "Discovery",
        status: "recommended",
        updated: "Now",
        resumeTo: "/wingman/discovery",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = upsertStoredProject(project);

      // Empty name should be normalized to "Untitled Project"
      expect(result.name).toBe("Untitled Project");
    });

    it("should handle undefined values in project", () => {
      const projectWithUndefined = {
        id: "test-undefined",
        name: undefined,
        owner: undefined,
        stage: undefined,
        status: undefined,
        updated: undefined,
        resumeTo: undefined,
        createdAt: undefined,
        updatedAt: undefined,
      };

      const snapshot = {
        projects: [projectWithUndefined],
        proposalDrafts: [],
        activeProjectId: null,
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(snapshot));

      const store = readProjectStore();

      // Should normalize undefined values
      expect(store.projects.length).toBe(1);
      expect(store.projects[0].name).toBe("Untitled Project");
      expect(store.projects[0].stage).toBe("Discovery");
    });

    it("should handle very long project names", () => {
      const snapshot: ProjectStoreSnapshot = {
        projects: [],
        proposalDrafts: [],
        activeProjectId: null,
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(snapshot));

      const longName = "A".repeat(1000);
      const project: StoredProject = {
        id: "long-name",
        name: longName,
        owner: "Owner",
        stage: "Discovery",
        status: "recommended",
        updated: "Now",
        resumeTo: "/wingman/discovery",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = upsertStoredProject(project);

      expect(result.name).toBe(longName);
    });

    it("should handle special characters in project data", () => {
      const snapshot: ProjectStoreSnapshot = {
        projects: [],
        proposalDrafts: [],
        activeProjectId: null,
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(snapshot));

      const project: StoredProject = {
        id: "special-chars",
        name: "Project with <script>alert('xss')</script> & special \"chars\"",
        owner: "O'Brien & Associates",
        stage: "Discovery",
        status: "recommended",
        updated: "Now",
        resumeTo: "/wingman/discovery",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = upsertStoredProject(project);

      expect(result.name).toContain("<script>");
      expect(result.owner).toContain("O'Brien");
    });

    it("should handle maximum compare runs limit", () => {
      // Create a project with 10 compare runs already
      const existingRuns: StoredCompareRun[] = Array.from({ length: 10 }, (_, i) => ({
        id: `run-${i}`,
        createdAt: new Date().toISOString(),
        competitorSku: `COMP-${i}`,
      }));

      const existingProject: StoredProject = {
        id: "max-runs-project",
        name: "Max Runs",
        owner: "Owner",
        stage: "Competitor Compare",
        status: "alternative",
        updated: "Now",
        resumeTo: "/wingman/compare",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        compareRuns: existingRuns,
      };

      const snapshot: ProjectStoreSnapshot = {
        projects: [existingProject],
        proposalDrafts: [],
        activeProjectId: "max-runs-project",
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(snapshot));

      const newRun: Omit<StoredCompareRun, "id" | "createdAt"> = {
        competitorSku: "NEW-COMP",
      };

      const result = saveCompareRunToProject(newRun);

      // Should be limited to 10 runs (oldest should be removed)
      expect(result?.compareRuns?.length).toBeLessThanOrEqual(10);
      // New run should be first
      expect(result?.compareRuns?.[0].competitorSku).toBe("NEW-COMP");
    });

    it("should handle maximum product selections limit", () => {
      // Create a project with 20 product selections already
      const existingSelections: StoredProductSelection[] = Array.from({ length: 20 }, (_, i) => ({
        sku: `SKU-${i}`,
        addedAt: new Date().toISOString(),
        source: "Finder",
      }));

      const existingProject: StoredProject = {
        id: "max-selections-project",
        name: "Max Selections",
        owner: "Owner",
        stage: "Finder",
        status: "recommended",
        updated: "Now",
        resumeTo: "/wingman/recommendations",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        productSelections: existingSelections,
      };

      const snapshot: ProjectStoreSnapshot = {
        projects: [existingProject],
        proposalDrafts: [],
        activeProjectId: "max-selections-project",
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(snapshot));

      const newSelection: StoredProductSelection = {
        sku: "NEW-SKU",
        addedAt: new Date().toISOString(),
        source: "Finder",
      };

      const result = saveProductSelectionToProject("max-selections-project", newSelection);

      // Should be limited to 20 selections
      expect(result.productSelections?.length).toBeLessThanOrEqual(20);
      // New selection should be first
      expect(result.productSelections?.[0].sku).toBe("NEW-SKU");
    });

    it("should handle maximum feedback entries limit", () => {
      // Create project with many feedback entries
      const existingFeedback = Array.from({ length: 50 }, (_, i) => ({
        id: `fb-${i}`,
        createdAt: new Date().toISOString(),
        scope: "recommendation" as const,
        rating: "accepted" as const,
        label: `Feedback ${i}`,
      }));

      const existingProject: StoredProject = {
        id: "feedback-project",
        name: "Feedback Project",
        owner: "Owner",
        stage: "Finder",
        status: "recommended",
        updated: "Now",
        resumeTo: "/wingman/recommendations",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        productSelections: [{ sku: "SKU", addedAt: new Date().toISOString(), source: "Finder" }],
        feedback: existingFeedback,
      };

      const snapshot: ProjectStoreSnapshot = {
        projects: [existingProject],
        proposalDrafts: [],
        activeProjectId: null,
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(snapshot));

      const result = saveRecommendationFeedback({
        scope: "recommendation",
        rating: "needs-review",
        label: "New Feedback",
      });

      // Should be limited to 40 feedback entries
      expect(result?.feedback?.length).toBeLessThanOrEqual(40);
    });
  });
});

describe("mergeProjectVersionsForHydration (per-sub-document hydration merge)", () => {
  const T0 = "2026-09-03T08:00:00.000Z";

  function mergeProject(id: string, at: string, revision?: number): StoredProject {
    return {
      id,
      name: "Merge Test Project",
      owner: "Tester",
      ownerId: "tester-1",
      stage: "Discovery",
      status: "recommended",
      updated: "Just now",
      resumeTo: "/wingman/discovery",
      createdAt: at,
      updatedAt: at,
      syncRevision: revision,
    };
  }

  function mergeBrief(at: string, capturedPercent: number, customer: string): StoredDiscoveryBrief {
    return {
      savedAt: at,
      roomModel: { customer },
      capturedPercent,
      missingInformation: [],
      quoteSafetyStatus: "quote-ready",
    };
  }

  function mergeProposal(at: string, title: string): StoredProjectProposal {
    return { title, summary: `${title} summary`, sections: [], products: [], assumptions: [], updatedAt: at };
  }

  function attachmentsOf(project: StoredProject): Array<{ id?: unknown; name?: unknown }> {
    return (project as unknown as { attachments?: Array<{ id?: unknown; name?: unknown }> }).attachments ?? [];
  }

  it("keeps the offline sub-document edit and adopts the backend's newer sub-document (offline-then-reload)", () => {
    const tOffline = "2026-09-03T08:10:00.000Z";
    const tOther = "2026-09-03T08:20:00.000Z";

    // Local: brief edited offline (never synced), proposal still the baseline.
    const local = mergeProject("p", tOffline, 1);
    local.discoveryBrief = mergeBrief(tOffline, 55, "Acme Corp (offline edit)");
    local.proposal = mergeProposal(T0, "Acme Proposal - base");

    // Backend: whole project NEWER (another session's proposal edit); its brief
    // is still the older baseline.
    const backend = mergeProject("p", tOther, 2);
    backend.discoveryBrief = mergeBrief(T0, 40, "Acme Corp");
    backend.proposal = mergeProposal(tOther, "Acme Proposal - other session rev");

    const { project, conflict } = mergeProjectVersionsForHydration(local, backend);

    expect(project.discoveryBrief?.capturedPercent, "the offline brief edit must survive").toBe(55);
    expect(project.discoveryBrief?.savedAt).toBe(tOffline);
    expect(project.proposal?.title, "the backend's newer proposal must be adopted").toBe("Acme Proposal - other session rev");
    expect(project.updatedAt, "the merged copy carries the newest whole-project time").toBe(tOther);
    expect(project.syncRevision, "backend content was adopted, so its revision is echoed next").toBe(2);
    expect(conflict, "preserving the offline edit over the backend brief is a conflict").toBe(true);
  });

  it("adopts the other tab's newer sub-document when whole-project timestamps tie (two-tab)", () => {
    const tA = "2026-09-03T08:10:00.000Z";
    const tB = "2026-09-03T08:12:00.000Z";

    // Tab B (local) holds the stale baseline brief plus its own proposal edit;
    // the whole-project timestamps TIE because tab B's edit was the last
    // whole-project change on the server too.
    const local = mergeProject("p", tB, 3);
    local.discoveryBrief = mergeBrief(T0, 40, "Acme Corp");
    local.proposal = mergeProposal(tB, "Acme Proposal - tab B rev");

    const backend = mergeProject("p", tB, 3);
    backend.discoveryBrief = mergeBrief(tA, 72, "Acme Corp (tab A)");
    backend.proposal = mergeProposal(tB, "Acme Proposal - tab B rev");

    const { project, conflict } = mergeProjectVersionsForHydration(local, backend);

    expect(project.discoveryBrief?.capturedPercent, "the other tab's newer brief must be adopted by embedded time").toBe(72);
    expect(project.discoveryBrief?.roomModel?.customer).toBe("Acme Corp (tab A)");
    expect(project.proposal?.title, "the reloading tab's own proposal must be kept").toBe("Acme Proposal - tab B rev");
    expect(project.updatedAt).toBe(tB);
    expect(conflict).toBe(false);
  });

  it("keeps the richer local sub-documents when the equal-aged backend row is thin (thin-row defense)", () => {
    // Local: rich, based on revision 3. Backend: same revision and same whole
    // timestamp, but its work-product fields are gone (legacy/allowlist row).
    const local = mergeProject("p", T0, 3);
    local.discoveryBrief = mergeBrief(T0, 55, "Acme Corp");
    local.proposal = mergeProposal(T0, "Acme Proposal - base");

    const backend = mergeProject("p", T0, 3);

    const { project, conflict } = mergeProjectVersionsForHydration(local, backend);

    expect(project.discoveryBrief?.capturedPercent, "the thin backend row must never displace richer local content").toBe(55);
    expect(project.proposal?.title).toBe("Acme Proposal - base");
    expect(conflict).toBe(false);
  });

  it("is a no-op when the reloading copy equals the backend copy (plain reload)", () => {
    const local = mergeProject("p", T0, 2);
    local.discoveryBrief = mergeBrief(T0, 55, "Acme Corp");
    local.proposal = mergeProposal(T0, "Acme Proposal - base");
    const backend = mergeProject("p", T0, 2);
    backend.discoveryBrief = mergeBrief(T0, 55, "Acme Corp");
    backend.proposal = mergeProposal(T0, "Acme Proposal - base");

    const { project, conflict } = mergeProjectVersionsForHydration(local, backend);

    expect(project.discoveryBrief?.capturedPercent).toBe(55);
    expect(project.proposal?.title).toBe("Acme Proposal - base");
    expect(project.updatedAt).toBe(T0);
    expect(conflict).toBe(false);
  });

  it("adopts the backend wholesale when it is newer in every lane (no false conflict)", () => {
    const tNew = "2026-09-03T09:00:00.000Z";
    const local = mergeProject("p", T0, 1);
    local.discoveryBrief = mergeBrief(T0, 40, "Acme Corp");
    local.proposal = mergeProposal(T0, "Acme Proposal - base");

    const backend = mergeProject("p", tNew, 2);
    backend.discoveryBrief = mergeBrief(tNew, 88, "Acme Corp (new)");
    backend.proposal = mergeProposal(tNew, "Acme Proposal - rev 2");

    const { project, conflict } = mergeProjectVersionsForHydration(local, backend);

    expect(project.discoveryBrief?.capturedPercent).toBe(88);
    expect(project.proposal?.title).toBe("Acme Proposal - rev 2");
    expect(project.syncRevision).toBe(2);
    expect(conflict).toBe(false);
  });

  it("unions the append-mostly lanes by id: local-only kept, backend-only added, same id resolved to the backend row", () => {
    const tNew = "2026-09-03T09:00:00.000Z";
    const local = mergeProject("p", T0, 1);
    const backend = mergeProject("p", tNew, 2);
    const localRecord = local as unknown as { attachments: Array<{ id: string; name: string }> };
    const backendRecord = backend as unknown as { attachments: Array<{ id: string; name: string }> };
    localRecord.attachments = [
      { id: "a1", name: "local-only" },
      { id: "a2", name: "local a2" },
    ];
    backendRecord.attachments = [
      { id: "a2", name: "backend a2" },
      { id: "b1", name: "backend-only" },
    ];

    const { project } = mergeProjectVersionsForHydration(local, backend);

    const merged = attachmentsOf(project);
    expect(merged).toHaveLength(3);
    expect(merged.map((item) => item?.name)).toEqual(["local-only", "backend a2", "backend-only"]);
  });
});

describe("sync-conflict lane diffing (changedProjectLanes)", () => {
  const T0 = "2026-09-03T08:00:00.000Z";

  function laneProject(id: string, at: string): StoredProject {
    return {
      id,
      name: "Conflict Test Project",
      owner: "Tester",
      ownerId: "tester-1",
      stage: "Proposal Builder",
      status: "recommended",
      updated: "Just now",
      resumeTo: "/wingman/proposal",
      createdAt: at,
      updatedAt: at,
      syncRevision: 1,
    };
  }

  it("returns [] when the merged document matches what we sent on every tracked lane", () => {
    const sent = laneProject("p", T0);
    sent.proposal = { title: "Acme Proposal", sections: [], products: [], assumptions: [], summary: "s", updatedAt: T0 };
    // The server may reorder keys or bump the whole-project revision/time;
    // neither may look like a team member changed content.
    const returned = JSON.parse(JSON.stringify(sent));
    returned.proposal = { updatedAt: T0, summary: "s", products: [], title: "Acme Proposal", assumptions: [], sections: [] };
    returned.syncRevision = 2;
    returned.updatedAt = "2026-09-03T09:00:00.000Z";
    returned.auditTrail = [{ id: "server-row", action: "updated", detail: "server appended", actorName: "Wingman", severity: "info", createdAt: T0 }];

    expect(changedProjectLanes(sent, returned)).toEqual([]);
  });

  it("flags the lanes whose server-accepted content differs from what we sent", () => {
    const sent = laneProject("p", T0);
    sent.discoveryBrief = { savedAt: T0, roomModel: { customer: "Acme" }, capturedPercent: 40, missingInformation: [], quoteSafetyStatus: "quote-ready" };
    sent.requirements = [{ id: "req-a", updatedAt: T0, label: "ours" }];

    const returned = JSON.parse(JSON.stringify(sent));
    // Another member captured more of the brief and added a requirement.
    returned.discoveryBrief.capturedPercent = 88;
    returned.requirements.push({ id: "req-b", updatedAt: T0, label: "theirs" });

    expect(changedProjectLanes(sent, returned)).toEqual(["discoveryBrief", "requirements"]);
  });

  it("flags a proposal lane where our same-item edit lost the tie to another member's", () => {
    const sent = laneProject("p", T0);
    sent.proposal = { title: "Proposal from us", sections: [], products: [], assumptions: [], summary: "ours", updatedAt: T0 };
    const returned = JSON.parse(JSON.stringify(sent));
    returned.proposal.title = "Proposal from the other member";
    returned.proposal.updatedAt = "2026-09-03T08:30:00.000Z";

    expect(changedProjectLanes(sent, returned)).toEqual(["proposal"]);
  });

  it("ignores lanes the server owns or reshapes (revision, timestamps, auditTrail, attachments)", () => {
    const sent = laneProject("p", T0);
    (sent as unknown as { attachments: unknown[] }).attachments = [{ id: "a1", name: "ours" }];
    const returned = JSON.parse(JSON.stringify(sent));
    returned.updatedAt = "2026-09-03T09:00:00.000Z";
    returned.syncRevision = 5;
    returned.auditTrail = [{ id: "server-row", action: "updated", detail: "x", actorName: "Wingman", severity: "info", createdAt: T0 }];
    (returned as { attachments: unknown[] }).attachments = [{ id: "a1", name: "ours", uploadedBy: "server-user-id" }];

    expect(changedProjectLanes(sent, returned)).toEqual([]);
    expect(PROJECT_SYNC_CONFLICT_LANES).not.toContain("attachments");
    expect(PROJECT_SYNC_CONFLICT_LANES).not.toContain("auditTrail");
    expect(PROJECT_SYNC_CONFLICT_LANES).not.toContain("updatedAt");
  });

  it("ignores present-but-undefined keys a normalizer leaves behind (they never survive a JSON round trip)", () => {
    const sent = laneProject("p", T0);
    sent.discoveryBrief = {
      savedAt: T0,
      roomModel: { customer: "Acme Corp" },
      capturedPercent: 40,
      missingInformation: [],
      quoteSafetyStatus: "quote-ready",
    };
    // normalizeDiscoveryBrief leaves empty-string/undefined keys on the in-
    // memory doc; the server row is a JSON round trip, so those keys vanish.
    const brief = sent.discoveryBrief as unknown as Record<string, unknown>;
    brief.returnRoute = undefined;
    brief.nextBestQuestion = undefined;
    const returned = JSON.parse(JSON.stringify(sent));

    expect(changedProjectLanes(sent, returned)).toEqual([]);

    // Control: a genuinely present value on either side IS a change.
    const returnedWithValue = JSON.parse(JSON.stringify(sent));
    (returnedWithValue.discoveryBrief as Record<string, unknown>).capturedPercent = 88;
    expect(changedProjectLanes(sent, returnedWithValue)).toEqual(["discoveryBrief"]);
  });

  it("returns [] for a missing sent document or malformed returned document", () => {
    expect(changedProjectLanes(undefined, { id: "p" })).toEqual([]);
    expect(changedProjectLanes(laneProject("p", T0), null)).toEqual([]);
  });

  it("maps lane keys to human labels with a prettified fallback", () => {
    expect(projectLaneLabel("proposal")).toBe("Proposal");
    expect(projectLaneLabel("discoveryBrief")).toBe("Discovery brief");
    expect(projectLaneLabel("productSelections")).toBe("Product selections");
    expect(projectLaneLabel("madeUpLane")).toBe("Made Up Lane");
    expect(PROJECT_SYNC_CONFLICT_LANES.length).toBeGreaterThanOrEqual(14);
  });
});

describe("syncConflict persistence and normalization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Earlier tests seed localStorageMock.getItem with canned return values
    // (mockReturnValue) that shadow the real closure store and are NOT cleared
    // by vi.clearAllMocks, so this describe installs hermetic, isolated
    // implementations that only it uses.
    const isolated = new Map<string, string>();
    localStorageMock.getItem.mockImplementation((key: string) => isolated.get(key) ?? null);
    localStorageMock.setItem.mockImplementation((key: string, value: string) => {
      isolated.set(key, value);
    });
    localStorageMock.removeItem.mockImplementation((key: string) => {
      isolated.delete(key);
    });
    localStorageMock.clear.mockImplementation(() => {
      isolated.clear();
    });
    Object.defineProperty(window, "localStorage", { value: localStorageMock, writable: true });
    window.dispatchEvent = dispatchEventMock;
  });

  it("survives a write/read round trip so the badge shows after a reload", () => {
    const project = {
      id: "conflict-proj",
      name: "Conflict Project",
      owner: "Tester",
      ownerId: "tester-1",
      stage: "Discovery",
      status: "recommended",
      updated: "Just now",
      resumeTo: "/wingman/discovery",
      createdAt: "2026-09-03T08:00:00.000Z",
      updatedAt: "2026-09-03T08:00:00.000Z",
      syncRevision: 3,
      syncConflict: { fields: ["proposal", "requirements"], detectedAt: "2026-09-03T08:45:00.000Z" },
    } satisfies StoredProject;
    writeProjectStore({ projects: [project], proposalDrafts: [], activeProjectId: project.id }, { syncBackend: false });

    const reloaded = readProjectStore().projects.find((item) => item.id === project.id);
    expect(reloaded?.syncConflict?.fields).toEqual(["proposal", "requirements"]);
    expect(reloaded?.syncConflict?.detectedAt).toBe("2026-09-03T08:45:00.000Z");
  });

  it("drops malformed or empty conflict records on read", () => {
    const rawProject = {
      id: "junk-proj",
      name: "Junk Project",
      owner: "Tester",
      ownerId: "tester-1",
      stage: "Discovery",
      status: "recommended",
      updated: "Just now",
      resumeTo: "/wingman/discovery",
      createdAt: "2026-09-03T08:00:00.000Z",
      updatedAt: "2026-09-03T08:00:00.000Z",
      syncConflict: { fields: ["proposal", "", "proposal"], detectedAt: "" },
    };
    writeProjectStore(
      { projects: [rawProject as StoredProject], proposalDrafts: [], activeProjectId: rawProject.id },
      { syncBackend: false },
    );

    const reloaded = readProjectStore().projects.find((item) => item.id === rawProject.id);
    expect(reloaded?.syncConflict?.fields).toEqual(["proposal"]);
    expect(reloaded?.syncConflict?.detectedAt).toBeTruthy();

    const emptyConflict = {
      ...rawProject,
      id: "empty-proj",
      syncConflict: { fields: [], detectedAt: "2026-09-03T08:00:00.000Z" },
    };
    writeProjectStore(
      { projects: [emptyConflict as StoredProject], proposalDrafts: [], activeProjectId: emptyConflict.id },
      { syncBackend: false },
    );
    const reloadedEmpty = readProjectStore().projects.find((item) => item.id === emptyConflict.id);
    expect(reloadedEmpty?.syncConflict).toBeUndefined();
  });
});

describe("buildHydrationSinceManifest (incremental pull)", () => {
  it("reports the last syncRevision of every synced, non-flagged project", () => {
    const projects = [
      { id: "current", syncRevision: 3, updatedAt: "2026-09-03T09:00:00.000Z" },
      { id: "member-moved", syncRevision: 1, updatedAt: "2026-09-03T09:00:00.000Z" },
    ] as StoredProject[];
    expect(buildHydrationSinceManifest(projects)).toEqual({ current: 3, "member-moved": 1 });
  });

  it("forces a pull for syncConflict-flagged projects by reporting revision 0", () => {
    const projects = [
      {
        id: "flagged",
        syncRevision: 3,
        syncConflict: { fields: ["proposal"], detectedAt: "2026-09-03T09:00:00.000Z" },
        updatedAt: "2026-09-03T09:00:00.000Z",
      },
    ] as StoredProject[];
    // 0 < any real row revision, so the server always returns the row and the
    // hydration merge can adopt the member's newer content (the flag means the
    // reported 3 was adopted without the row's content).
    expect(buildHydrationSinceManifest(projects)).toEqual({ flagged: 0 });
  });

  it("reports 0 for never-synced local projects (server treats them as unknown or legacy)", () => {
    const projects = [{ id: "pending-upload", updatedAt: "2026-09-03T09:00:00.000Z" }] as StoredProject[];
    expect(buildHydrationSinceManifest(projects)).toEqual({ "pending-upload": 0 });
  });

  it("an empty store yields an empty manifest (a first load pulls everything)", () => {
    expect(buildHydrationSinceManifest([])).toEqual({});
  });
});
