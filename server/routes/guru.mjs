import express from "express";

const router = express.Router();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = process.env.GURU_GEMINI_MODEL || "gemini-2.5-flash";

function asText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function buildSystemInstruction(mode) {
  const modeMap = {
    general: "Give practical AV guidance in commercially useful language.",
    wyrestorm: "Prioritize WyreStorm product-family fit, architecture, and SKU direction.",
    design: "Focus on system architecture, signal flow, transport logic, constraints, and tradeoffs.",
    troubleshooting: "Focus on fault isolation, probable causes, validation steps, and corrective action.",
    training: "Explain clearly for internal sales enablement without sounding artificial or over-written.",
  };

  const modeInstruction = modeMap[mode] || modeMap.wyrestorm;

  return [
    "You are Guru inside WyreStorm Wingman.",
    "Your job is to support AV sales, pre-sales, architecture guidance, and product positioning.",
    modeInstruction,
    "Return concise but commercially useful output.",
    "Never invent exact product capability if uncertain. State uncertainty briefly and suggest what to confirm.",
    "Always consider whether a non-AVoIP video wall processor such as SW-0206-VW should remain in scope for video wall use cases.",
    "Prefer structured reasoning and follow-on validation questions.",
    "Respond using JSON only."
  ].join(" ");
}

function buildUserPrompt(question, extraContext, history) {
  const historyText = Array.isArray(history) && history.length
    ? history.map((item, index) => `${index + 1}. ${item}`).join("\n")
    : "None";

  return [
    `Question: ${question}`,
    `Extra context: ${extraContext || "None"}`,
    `Recent prior user questions:\n${historyText}`,
    "",
    "Return JSON with the keys:",
    "answer, confidence, sources, suggestedSkus, reasoning, followOns"
  ].join("\n");
}

function extractText(data) {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts
    .map((part) => (typeof part?.text === "string" ? part.text : ""))
    .join("")
    .trim();
}

function tryParseJson(rawText) {
  try {
    return JSON.parse(rawText);
  } catch {
    const match = rawText.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function fetchWithTimeout(url, options, timeoutMs = 30000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  return fetch(url, {
    ...options,
    signal: controller.signal,
  }).finally(() => clearTimeout(timeoutId));
}

router.get("/health", async (_req, res) => {
  return res.json({
    ok: true,
    model: GEMINI_MODEL,
    hasKey: Boolean(GEMINI_API_KEY),
  });
});

router.post("/ask", async (req, res) => {
  try {
    const question = asText(req.body?.question);
    const extraContext = asText(req.body?.extraContext);
    const mode = asText(req.body?.mode) || "wyrestorm";
    const history = Array.isArray(req.body?.history) ? req.body.history.slice(0, 12) : [];

    if (!question) {
      return res.status(400).json({ error: "Question is required." });
    }

    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: "GEMINI_API_KEY is missing on the server." });
    }

    const requestBody = {
      systemInstruction: {
        role: "system",
        parts: [{ text: buildSystemInstruction(mode) }]
      },
      contents: [
        {
          role: "user",
          parts: [{ text: buildUserPrompt(question, extraContext, history) }]
        }
      ],
      generationConfig: {
        temperature: 0.35,
        responseMimeType: "application/json"
      }
    };

    const response = await fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_API_KEY
        },
        body: JSON.stringify(requestBody)
      },
      30000
    );

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(502).json({
        error: `Gemini request failed: ${response.status} ${errorText}`
      });
    }

    const data = await response.json();
    const rawText = extractText(data);

    if (!rawText) {
      return res.status(502).json({ error: "Gemini returned no text content." });
    }

    const parsed = tryParseJson(rawText);

    if (!parsed) {
      return res.status(502).json({
        error: "Gemini returned invalid JSON output."
      });
    }

    return res.json({
      answer: typeof parsed?.answer === "string" ? parsed.answer : "",
      confidence: typeof parsed?.confidence === "string" ? parsed.confidence : "Medium",
      sources: Array.isArray(parsed?.sources) ? parsed.sources : [],
      suggestedSkus: Array.isArray(parsed?.suggestedSkus) ? parsed.suggestedSkus : [],
      reasoning: Array.isArray(parsed?.reasoning) ? parsed.reasoning : [],
      followOns: Array.isArray(parsed?.followOns) ? parsed.followOns : []
    });
  } catch (error) {
    const message =
      error instanceof Error && error.name === "AbortError"
        ? "Guru request timed out."
        : error instanceof Error
          ? error.message
          : "Guru route failed.";

    return res.status(500).json({ error: message });
  }
});

export default router;