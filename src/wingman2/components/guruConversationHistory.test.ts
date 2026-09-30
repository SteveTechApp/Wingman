import { beforeEach, describe, expect, it } from "vitest";
import { createGuruConversation, guruConversationTitle, loadGuruHistory, saveGuruHistory, type GuruStoredMessage } from "./guruConversationHistory";

const opening: GuruStoredMessage = { id: "opening", role: "assistant", content: "Ask Guru", time: "09:00" };

describe("Guru conversation history", () => {
  beforeEach(() => window.localStorage.clear());

  it("starts a fresh chat when no history exists", () => {
    const history = loadGuruHistory(opening);
    expect(history.conversations).toHaveLength(1);
    expect(history.conversations[0].messages).toEqual([opening]);
  });

  it("restores a saved conversation and derives a title from its first question", () => {
    const conversation = createGuruConversation(opening);
    conversation.messages.push({ id: "question", role: "user", content: "  Which   AV-over-IP path? ", time: "09:01" });
    saveGuruHistory({ activeId: conversation.id, conversations: [conversation] });
    const restored = loadGuruHistory(opening);
    expect(restored.activeId).toBe(conversation.id);
    expect(guruConversationTitle(restored.conversations[0])).toBe("Which AV-over-IP path?");
  });

  it("replaces an interrupted pending answer after reload", () => {
    const conversation = createGuruConversation(opening);
    conversation.messages.push({ id: "question", role: "user", content: "EDID?", time: "09:01" });
    conversation.messages.push({ id: "pending", role: "assistant", content: "Checking Guru knowledge...", time: "09:01" });
    saveGuruHistory({ activeId: conversation.id, conversations: [conversation] });
    expect(loadGuruHistory(opening).conversations[0].messages.at(-1)?.content).toContain("interrupted");
  });
});
