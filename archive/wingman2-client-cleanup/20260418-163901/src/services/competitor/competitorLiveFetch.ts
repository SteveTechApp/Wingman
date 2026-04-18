import type { CompetitorLookupInput } from "./competitorLiveTypes";

const LIVE_LOOKUP_PROXY_ENDPOINT = String(
  import.meta.env.VITE_COMPETITOR_LIVE_LOOKUP_ENDPOINT ?? "/api/competitor/liveLookup"
).trim();

type LiveLookupProxyResponse = {
  ok?: boolean;
  text?: string;
  html?: string;
  error?: string;
};

function flattenHtmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

export async function fetchCompetitorProductPageText(input: CompetitorLookupInput): Promise<string> {
  if (!input.productUrl || !input.productUrl.trim()) {
    throw new Error("No live product URL provided.");
  }

  const response = await fetch(LIVE_LOOKUP_PROXY_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      manufacturer: input.manufacturer,
      model: input.model,
      productUrl: input.productUrl,
    }),
  });

  if (!response.ok) {
    throw new Error(`Live lookup proxy failed: ${response.status}`);
  }

  const payload = (await response.json()) as LiveLookupProxyResponse;

  if (!payload.ok) {
    throw new Error(payload.error || "Live lookup proxy returned an error.");
  }

  if (typeof payload.text === "string" && payload.text.trim()) {
    return payload.text.trim();
  }

  if (typeof payload.html === "string" && payload.html.trim()) {
    return flattenHtmlToText(payload.html);
  }

  throw new Error("Live lookup proxy returned no usable page text.");
}