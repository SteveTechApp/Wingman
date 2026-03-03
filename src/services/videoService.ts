
export async function generateVideo(_input: unknown): Promise<unknown> {
  throw new Error("videoService is temporarily disabled (stabilisation mode).");
}

/**
 * Shim used by VideoGeneratorPage.
 * Returns a string URL placeholder so setState(string) remains type-safe.
 */
export async function generateProductVideo(_prompt: string, _options?: any): Promise<string> {
  // In stabilisation mode we return a deterministic placeholder.
  return "about:blank";
}



