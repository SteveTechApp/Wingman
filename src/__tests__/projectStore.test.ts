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
