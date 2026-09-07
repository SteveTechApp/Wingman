export function buildProjectApiRequest(init: RequestInit, storageMode: { authToken?: string }): RequestInit {
  const headers = new Headers(init.headers);
  if (storageMode.authToken) headers.set("Authorization", `Bearer ${storageMode.authToken}`);
  return { ...init, credentials: "include", headers };
}

export async function fetchProjectHydration(endpoint: string, init: RequestInit): Promise<{ status: number; projects: unknown[] | null }> {
  try {
    const response = await fetch(endpoint, init);
    if (!response.ok) return { status: response.status, projects: null };
    const payload = await response.json() as { projects?: unknown[] };
    return { status: response.status, projects: Array.isArray(payload.projects) ? payload.projects : null };
  } catch (error) {
    console.error("[wingman] projectStore: project hydration failed", error);
    return { status: 0, projects: null };
  }
}
