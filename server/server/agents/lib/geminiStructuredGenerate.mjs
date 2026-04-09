import { safeParseJson, stringifyPretty } from "./json.mjs";

export async function geminiStructuredGenerate({
  apiKey,
  baseUrl,
  model,
  timeoutMs = 45000,
  systemPrompt,
  userPayload,
  responseJsonSchema,
  temperature = 0.2,
}) {
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY for structured generation.");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}/${model}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: stringifyPretty(userPayload) }],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseJsonSchema,
          temperature,
        },
      }),
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(`Gemini request failed: ${response.status} ${JSON.stringify(payload)}`);
    }

    const text =
      payload?.candidates?.[0]?.content?.parts
        ?.map((part) => part?.text)
        .filter(Boolean)
        .join("\n") || "";

    const parsed = safeParseJson(text);

    if (!parsed) {
      throw new Error(`Gemini returned non-JSON content: ${text}`);
    }

    return parsed;
  } finally {
    clearTimeout(timer);
  }
}
