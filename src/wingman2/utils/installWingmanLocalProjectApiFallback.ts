type JsonRecord = Record<string, unknown>;

type LocalProject = JsonRecord & {
  id: string;
  name: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

const STORAGE_KEY = "wingman.local.projects.v1";

function isLocalWingmanDev(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const host = window.location.hostname;

  if (host === "127.0.0.1") {
    return true;
  }

  if (host === "localhost") {
    return true;
  }

  return false;
}

function toUrl(input: RequestInfo | URL): URL | null {
  try {
    if (input instanceof URL) {
      return input;
    }

    if (input instanceof Request) {
      return new URL(input.url, window.location.origin);
    }

    return new URL(String(input), window.location.origin);
  } catch {
    return null;
  }
}

function isWingmanProjectsApi(url: URL): boolean {
  if (url.pathname === "/api/wingman/projects") {
    return true;
  }

  if (url.pathname.startsWith("/api/wingman/projects/")) {
    return true;
  }

  return false;
}

function getRequestMethod(input: RequestInfo | URL, init?: RequestInit): string {
  if (init?.method) {
    return init.method.toUpperCase();
  }

  if (input instanceof Request) {
    return input.method.toUpperCase();
  }

  return "GET";
}

function makeId(): string {
  const cryptoObject = window.crypto;

  if (cryptoObject && "randomUUID" in cryptoObject) {
    return cryptoObject.randomUUID();
  }

  return `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readProjects(): LocalProject[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is LocalProject => {
        return Boolean(item && typeof item === "object" && typeof item.id === "string");
      });
    }

    return [];
  } catch {
    return [];
  }
}

function writeProjects(projects: LocalProject[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-wingman-local-fallback": "true"
    }
  });
}

function projectIdFromUrl(url: URL): string | null {
  const prefix = "/api/wingman/projects/";
  const pathname = url.pathname;

  if (!pathname.startsWith(prefix)) {
    return null;
  }

  const id = decodeURIComponent(pathname.slice(prefix.length)).trim();

  if (!id) {
    return null;
  }

  return id;
}

async function readJsonBody(input: RequestInfo | URL, init?: RequestInit): Promise<JsonRecord> {
  const initBody = init?.body;

  if (typeof initBody === "string" && initBody.trim().length > 0) {
    try {
      const parsed = JSON.parse(initBody);

      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as JsonRecord;
      }
    } catch {
      return {};
    }
  }

  if (input instanceof Request) {
    try {
      const text = await input.clone().text();

      if (text.trim().length === 0) {
        return {};
      }

      const parsed = JSON.parse(text);

      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as JsonRecord;
      }
    } catch {
      return {};
    }
  }

  return {};
}

function listPayload(projects: LocalProject[]): JsonRecord {
  return {
    ok: true,
    source: "local-dev-fallback",
    projects,
    items: projects,
    data: projects
  };
}

function projectPayload(project: LocalProject | null, status = 200): Response {
  if (!project) {
    return jsonResponse(
      {
        ok: false,
        source: "local-dev-fallback",
        error: "Project not found",
        project: null,
        item: null,
        data: null
      },
      status
    );
  }

  return jsonResponse({
    ok: true,
    source: "local-dev-fallback",
    project,
    item: project,
    data: project
  });
}

async function handleProjectsApi(input: RequestInfo | URL, init: RequestInit | undefined, url: URL): Promise<Response> {
  const method = getRequestMethod(input, init);
  const id = projectIdFromUrl(url);
  const now = new Date().toISOString();
  const projects = readProjects();

  if (method === "GET" && !id) {
    return jsonResponse(listPayload(projects));
  }

  if (method === "GET" && id) {
    const project = projects.find((item) => item.id === id) ?? null;
    return projectPayload(project, project ? 200 : 404);
  }

  if (method === "POST") {
    const body = await readJsonBody(input, init);
    const name = String(body.name ?? body.title ?? "Untitled Wingman Project");

    const project: LocalProject = {
      ...body,
      id: String(body.id ?? makeId()),
      name,
      title: String(body.title ?? name),
      createdAt: String(body.createdAt ?? now),
      updatedAt: now
    };

    const nextProjects = [project, ...projects.filter((item) => item.id !== project.id)];
    writeProjects(nextProjects);

    return projectPayload(project, 201);
  }

  if ((method === "PUT" || method === "PATCH") && id) {
    const body = await readJsonBody(input, init);
    const existing = projects.find((item) => item.id === id) ?? null;

    if (!existing) {
      return projectPayload(null, 404);
    }

    const updated: LocalProject = {
      ...existing,
      ...body,
      id,
      name: String(body.name ?? existing.name ?? existing.title ?? "Untitled Wingman Project"),
      title: String(body.title ?? body.name ?? existing.title ?? existing.name ?? "Untitled Wingman Project"),
      updatedAt: now
    };

    const nextProjects = projects.map((item) => {
      if (item.id === id) {
        return updated;
      }

      return item;
    });

    writeProjects(nextProjects);

    return projectPayload(updated);
  }

  if (method === "DELETE" && id) {
    const nextProjects = projects.filter((item) => item.id !== id);
    writeProjects(nextProjects);

    return jsonResponse({
      ok: true,
      source: "local-dev-fallback",
      deleted: true,
      id
    });
  }

  return jsonResponse({
    ok: true,
    source: "local-dev-fallback",
    projects,
    items: projects,
    data: projects
  });
}

export function installWingmanLocalProjectApiFallback(): void {
  if (typeof window === "undefined") {
    return;
  }

  if (!isLocalWingmanDev()) {
    return;
  }

  if (window.sessionStorage.getItem("wingman.local.projectApiFallback.disabled") === "true") {
    return;
  }

  if (document.body.dataset.wmLocalProjectApiFallbackInstalled === "true") {
    return;
  }

  document.body.dataset.wmLocalProjectApiFallbackInstalled = "true";

  const nativeFetch = window.fetch.bind(window);

  window.fetch = async function wingmanLocalProjectFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = toUrl(input);

    if (url && isWingmanProjectsApi(url)) {
      return handleProjectsApi(input, init, url);
    }

    return nativeFetch(input, init);
  };
}
