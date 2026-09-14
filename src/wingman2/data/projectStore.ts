// Compatibility facade. New production code imports the Project Workspace public interface.
export * from "../features/projects";
import { createDesignProjectCommands } from "../features/design-project";
import { projectCommandContext, projectLifecycle } from "../features/projects/useProjects";
export const { refreshDesignProject } = createDesignProjectCommands(projectCommandContext, projectLifecycle);
