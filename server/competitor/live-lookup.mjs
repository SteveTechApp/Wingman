
function extractProductTitle(html){
  const m = html.match(/<title>(.*?)<\/title>/i)
  if(!m) return ""
  return m[1].replace(/\s+/g," ").trim()
}

function extractKeySpecs(text){
  const tokens = [
    "4k","8k","hdcp","hdmi","hdbaset",
    "10gbe","1gbe","usb","matrix",
    "encoder","decoder","scaler",
    "inputs","outputs","multiview",
    "hdr","dolby","audio"
  ]

  const specs = []

  for(const t of tokens){
    const re = new RegExp(`\\b.{0,20}${t}.{0,20}\\b`,"ig")
    const matches = text.match(re)
    if(matches){
      specs.push(...matches.slice(0,2))
    }
  }

  return specs.slice(0,10)
}

function summariseProductPage(html,text,manufacturer,model,url){
  const title = extractProductTitle(html)

  const summary = text
    .replace(/\s+/g," ")
    .slice(0,400)

  const specs = extractKeySpecs(text)

  return {
    ok:true,
    manufacturer,
    model,
    resolvedUrl:url,
    title,
    summary,
    keySpecs:specs,
    fetchedAt:new Date().toISOString()
  }
}

function resolveManufacturerProductUrl(manufacturer, model, productUrl) {
  const m = String(manufacturer || "").toLowerCase().trim();
  const sku = String(model || "").trim();

  if (!sku) return productUrl;

  if (m === "extron") return `https://www.extron.com/product/${sku.toLowerCase()}`;
  if (m === "atlona") return `https://atlona.com/product/${sku}`;
  if (m === "blustream") return `https://www.blustream.co.uk/product/${sku}`;
  if (m === "kramer") return `https://www1.kramerav.com/Product/${sku}`;
  if (m === "crestron") return `https://www.crestron.com/Products/Model/${sku}`;

  return productUrl;
}
const LIVE_LOOKUP_CACHE = new Map();

function cacheKey(payload) {
  return JSON.stringify({
    manufacturer: String(payload?.manufacturer || "").trim().toLowerCase(),
    model: String(payload?.model || "").trim().toLowerCase(),
    productUrl: String(payload?.productUrl || "").trim(),
  });
}

function flattenHtmlToText(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}


function isBlockedVendorPage(text, html) {
  const blob = `${html || ""} ${text || ""}`.toLowerCase();
  return (
    blob.includes("request rejected") ||
    blob.includes("bot defense") ||
    blob.includes("your support id is") ||
    blob.includes("access denied") ||
    blob.includes("forbidden") ||
    blob.includes("temporarily unavailable")
  );
}
async function fetchWithTimeout(url, options = {}, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "WingmanLiveLookup/1.0",
        Accept: "text/html, text/plain, application/xhtml+xml",
        ...(options.headers || {}),
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function resolveCompetitorLiveLookup(payload) {
  const manufacturer = String(payload?.manufacturer || "").trim();
  const model = String(payload?.model || "").trim();
  let productUrl = String(payload?.productUrl || "").trim();
  productUrl = resolveManufacturerProductUrl(payload?.manufacturer, payload?.model, productUrl);

  if (!productUrl) {
    return {
      ok: false,
      error: "No productUrl supplied.",
      cacheHit: false,
    };
  }

  const key = cacheKey({ manufacturer, model, productUrl });
  const cached = LIVE_LOOKUP_CACHE.get(key);
  if (cached) {
    return {
      ok: true,
      html: cached.html,
      text: cached.text,
      cacheHit: true,
      fetchedAt: cached.fetchedAt,
    };
  }

  const response = await fetchWithTimeout(productUrl, {}, 12000);
  if (!response.ok) {
    return {
      ok: false,
      error: `Vendor page fetch failed: ${response.status}`,
      cacheHit: false,
    };
  }

  const html = await response.text();
  const text = flattenHtmlToText(html);

  if (isBlockedVendorPage(text, html)) {
    return {
      ok: false,
      error: "Vendor site blocked automated lookup.",
      cacheHit: false,
    };
  }

  const record = {
    html,
    text,
    fetchedAt: new Date().toISOString(),
  };

  LIVE_LOOKUP_CACHE.set(key, record);

  return {
    ok: true,
    html,
    text,
    cacheHit: false,
    fetchedAt: record.fetchedAt,
  };
}