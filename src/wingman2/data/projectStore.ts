// Compatibility facade. New production code imports the Project Workspace public interface.
export * from "../features/projects";
export {
  projectBackendSyncEnabled,
  resetProjectBackendSyncSessionState,
} from "../features/projects/useProjects";
export { projectSyncService } from "../features/projects/persistence/projectSyncService";
import { createDesignProjectCommands } from "../features/design-project";
import { projectCommandContext, projectLifecycle } from "../features/projects/useProjects";
export const { refreshDesignProject } = createDesignProjectCommands(projectCommandContext, projectLifecycle);
