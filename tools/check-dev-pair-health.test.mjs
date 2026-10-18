import { describe, expect, it } from "vitest";
import { checkDevPairHealth } from "./check-dev-pair-health.mjs";

describe("dev pair CSS probe", () => {
  for (const [name, status, type, body, passes] of [
    ["compiled CSS", 200, "text/css", ".wm-layout{display:grid}", true],
    ["PostCSS error", 500, "text/plain", "PostCSS failed", false],
    ["SPA fallback", 200, "text/html", "<html>healthy shell</html>", false],
    ["uncompiled directives", 200, "text/css", ".wm-layout{} @tailwind utilities;", false],
  ]) it(name, async () => {
    const request = async url => url.includes("/api/health")
      ? Response.json({ status: "ok" }) : new Response(body, { status, headers: { "content-type": type } });
    const result = checkDevPairHealth("http://ui", "http://api", request);
    if (passes) await expect(result).resolves.toBeUndefined();
    else await expect(result).rejects.toThrow("CSS pipeline failed");
  });
});
