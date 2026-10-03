const LOCAL_SESSION_PATH = "/api/wingman/auth/session";

function isLocalWingmanDev(): boolean {
  if (!import.meta.env.DEV || typeof window === "undefined") {
    return false;
  }

  return (
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "localhost"
  );
}

function requestUrl(input: RequestInfo | URL): URL | null {
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

export function installWingmanLocalSessionFallback(): void {
  if (!isLocalWingmanDev()) {
    return;
  }

  const marker = "__wingmanLocalSessionFallbackInstalled";

  if ((window as unknown as Record<string, unknown>)[marker]) {
    return;
  }

  (window as unknown as Record<string, unknown>)[marker] = true;

  const nativeFetch = window.fetch.bind(window);

  window.fetch = async function wingmanLocalSessionFetch(
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    const url = requestUrl(input);

    if (
      url &&
      url.pathname === LOCAL_SESSION_PATH &&
      (!init?.method || init.method.toUpperCase() === "GET")
    ) {
      return new Response(
        JSON.stringify({
          ok: true,
          session: {
            id: "local-wingman-admin-session",
            workspaceRole: "admin",
            permissions: {
              canManageWorkspace: true,
            },
            user: {
              id: "local-wingman-admin",
              name: "Local Wingman Admin",
              email: "local-admin@wingman.dev",
              role: "admin",
            },
          },
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "x-wingman-local-session": "true",
          },
        },
      );
    }

    return nativeFetch(input, init);
  };
}