import { pathToFileURL } from "node:url";

export const CSS_ROUTE = "/src/wingman2/styles/wingman-layer-layout.css?direct";

export async function checkDevPairHealth(uiBase, apiBase, request = fetch) {
  for (const base of [apiBase, uiBase]) {
    const response = await request(`${base}/api/health`, { signal: AbortSignal.timeout(10_000) });
    if (!response.ok || (await response.json()).status !== "ok") {
      throw new Error(`API health failed: ${base}`);
    }
  }
  const response = await request(`${uiBase}${CSS_ROUTE}`, { signal: AbortSignal.timeout(60_000) });
  const css = await response.text();
  if (!response.ok || !response.headers.get("content-type")?.includes("text/css") || !css.includes(".wm-layout") || /@(?:tailwind|source)\b/.test(css)) {
    throw new Error(`CSS pipeline failed: ${CSS_ROUTE} (HTTP ${response.status})`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  checkDevPairHealth(process.env.WINGMAN_UI_BASE || "http://127.0.0.1:3000", process.env.WINGMAN_API_BASE || "http://127.0.0.1:8787")
    .then(() => console.log("Dev pair healthy: API, proxy and compiled CSS"))
    .catch(error => { console.error(error.message); process.exitCode = 1; });
}
