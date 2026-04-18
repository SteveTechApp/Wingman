import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY || "";
const client = apiKey ? new OpenAI({ apiKey }) : null;

export function hasOpenAI() {
  return Boolean(client);
}

export async function runAI(systemPrompt, userPrompt) {
  if (!client) {
    return null;
  }

  const response = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    temperature: 0.3,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ]
  });

  return response.choices?.[0]?.message?.content?.trim() || "";
}