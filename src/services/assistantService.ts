
export async function askAssistant(_prompt: string): Promise<string> {
  throw new Error("assistantService is temporarily disabled (stabilisation mode).");
}

/**
 * Shim for pages that expect a Google GenAI Chat-like object.
 * Accepts any argument (model name, user profile, config, etc.) to match call sites during stabilisation.
 */
export function createChatSession(_arg?: any): any {
  return {
    sendMessage: async (_message: string) => {
      throw new Error("Chat is temporarily disabled (stabilisation mode).");
    }
  };
}



