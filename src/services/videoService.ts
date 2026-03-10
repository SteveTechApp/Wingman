export type VideoFallbackResponse = {
  ok: true;
  mode: "deterministic-fallback";
  service: "videoService";
  url: string;
  message: string;
};

function toStableToken(value: unknown): string {
  const text = typeof value === "string" ? value : JSON.stringify(value ?? "");
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) % 2147483647;
  }
  return Math.abs(hash).toString(36);
}

function buildFallbackUrl(seed: unknown): string {
  return `about:blank#wm-video-${toStableToken(seed)}`;
}

export async function generateVideo(input: unknown): Promise<VideoFallbackResponse> {
  return {
    ok: true,
    mode: "deterministic-fallback",
    service: "videoService",
    url: buildFallbackUrl(input),
    message: "Video generation is running in deterministic fallback mode.",
  };
}

/**
 * Shim used by VideoGeneratorPage.
 * Returns a deterministic URL placeholder so setState(string) remains type-safe.
 */
export async function generateProductVideo(prompt: string, options?: unknown): Promise<string> {
  return buildFallbackUrl({ prompt, options });
}
