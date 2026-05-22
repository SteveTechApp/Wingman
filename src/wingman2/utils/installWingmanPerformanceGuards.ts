type PendingMap = Map<string, Promise<Response>>;
type ResponseMap = Map<string, Response>;

const pendingRequests: PendingMap = new Map();
const memoryResponses: ResponseMap = new Map();

const PRODUCT_INDEX_PATH = "/product-intelligence-index.json";

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

function shouldSingleFlight(url: URL): boolean {
  return url.pathname === PRODUCT_INDEX_PATH;
}

function cacheKey(url: URL): string {
  return `${url.origin}${url.pathname}`;
}

function patchImageHints(): void {
  const brandImages = Array.from(document.querySelectorAll<HTMLImageElement>("img.wingman-brand-image"));

  brandImages.forEach((image) => {
    image.width = 280;
    image.height = 92;
    image.decoding = "async";
    image.loading = "eager";
    image.setAttribute("fetchpriority", "high");
  });

  const handoffImages = Array.from(document.querySelectorAll<HTMLImageElement>("img.wingman-expert-handoff-avatar"));

  handoffImages.forEach((image) => {
    image.width = 36;
    image.height = 36;
    image.decoding = "async";
    image.loading = "eager";
  });

  const guruImages = Array.from(document.querySelectorAll<HTMLImageElement>("img.wingman-guru-fab-image"));

  guruImages.forEach((image) => {
    image.width = 64;
    image.height = 64;
    image.decoding = "async";
    image.loading = "eager";
  });
}

export function installWingmanPerformanceGuards(): void {
  if (typeof window === "undefined") {
    return;
  }

  if (document.body.dataset.wmPerformanceGuardsInstalled === "true") {
    patchImageHints();
    return;
  }

  document.body.dataset.wmPerformanceGuardsInstalled = "true";

  const nativeFetch = window.fetch.bind(window);

  window.fetch = async function wingmanPerformanceFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = toUrl(input);

    if (!url) {
      return nativeFetch(input, init);
    }

    if (!shouldSingleFlight(url)) {
      return nativeFetch(input, init);
    }

    const key = cacheKey(url);
    const cached = memoryResponses.get(key);

    if (cached) {
      return cached.clone();
    }

    const pending = pendingRequests.get(key);

    if (pending) {
      const response = await pending;
      return response.clone();
    }

    const requestPromise = nativeFetch(input, init)
      .then((response) => {
        if (response.ok) {
          memoryResponses.set(key, response.clone());
        }

        pendingRequests.delete(key);
        return response;
      })
      .catch((error) => {
        pendingRequests.delete(key);
        throw error;
      });

    pendingRequests.set(key, requestPromise);

    return requestPromise.then((response) => response.clone());
  };

  patchImageHints();

  window.requestAnimationFrame(patchImageHints);
  window.addEventListener("load", patchImageHints);

  const observer = new MutationObserver(() => {
    window.requestAnimationFrame(patchImageHints);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}