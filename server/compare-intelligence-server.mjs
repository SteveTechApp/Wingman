import http from "node:http";
import { URL } from "node:url";
import { resolveCompetitorIntelligence } from "./competitor/compare-intelligence.mjs";

const port = Number(process.env.COMPARE_INTELLIGENCE_PORT || process.env.PORT || 13000);
const host = process.env.COMPARE_INTELLIGENCE_HOST || "127.0.0.1";

function sendJson(res, statusCode, payload, origin = "*") {
  const body = JSON.stringify(payload, null, 2);

  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "Content-Type,Authorization",
    "vary": "Origin",
  });

  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;

      if (body.length > 1024 * 1024) {
        reject(new Error("Request body is too large"));
        req.destroy();
      }
    });

    req.on("end", () => {
      resolve(body);
    });

    req.on("error", reject);
  });
}

function parseJsonBody(rawBody) {
  const trimmed = String(rawBody || "").trim();

  if (!trimmed) {
    return {};
  }

  return JSON.parse(trimmed);
}

function queryToPayload(url) {
  return {
    brand: url.searchParams.get("brand") || "",
    sku: url.searchParams.get("sku") || "",
    productName: url.searchParams.get("productName") || "",    rawText: url.searchParams.get("rawText") || "",
    productUrl: url.searchParams.get("productUrl") || "",
    allowWeb: url.searchParams.get("allowWeb") !== "false",
  };
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin || "*";
  const url = new URL(req.url || "/", `http://${req.headers.host || `${host}:${port}`}`);

  if (req.method === "OPTIONS") {
    sendJson(res, 204, {}, origin);
    return;
  }

  if (req.method === "GET" && url.pathname === "/health") {
    sendJson(res, 200, {
      ok: true,
      service: "wingman-compare-intelligence",
      port,
      host,
    }, origin);
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/compare/intelligence") {
    try {
      const result = await resolveCompetitorIntelligence(queryToPayload(url));
      sendJson(res, 200, result, origin);
      return;
    } catch (error) {
      sendJson(res, 500, {
        ok: false,
        error: error?.message || String(error),
      }, origin);
      return;
    }
  }

  if (req.method === "POST" && url.pathname === "/api/compare/intelligence") {
    try {
      const rawBody = await readBody(req);
      const payload = parseJsonBody(rawBody);
      const result = await resolveCompetitorIntelligence(payload);
      sendJson(res, 200, result, origin);
      return;
    } catch (error) {
      sendJson(res, 500, {
        ok: false,
        error: error?.message || String(error),
      }, origin);
      return;
    }
  }

  sendJson(res, 404, {
    ok: false,
    error: "Compare intelligence route not found",
    path: url.pathname,
  }, origin);
});

server.listen(port, host, () => {
  console.log(`[compare-intelligence] listening on http://${host}:${port}`);
});