export const GURU_ACTIVE_PROJECT_KEY = "wingman.currentProject";

export function saveGuruActiveProject(project: unknown): void {
  if (typeof window === "undefined") return;

  try {
    if (project == null) {
      window.sessionStorage.removeItem(GURU_ACTIVE_PROJECT_KEY);
      return;
    }

    window.sessionStorage.setItem(
      GURU_ACTIVE_PROJECT_KEY,
      JSON.stringify(project),
    );
  } catch {
    // ignore storage issues
  }
}

export function clearGuruActiveProject(): void {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.removeItem(GURU_ACTIVE_PROJECT_KEY);
  } catch {
    // ignore storage issues
  }
}