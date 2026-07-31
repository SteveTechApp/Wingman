import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const drawerSource = readFileSync(
  resolve(process.cwd(), "src/wingman2/components/WingmanGuruDrawer.tsx"),
  "utf8",
);

const cssSource = readFileSync(
  resolve(process.cwd(), "src/wingman2/styles/wingman-style-stack.css"),
  "utf8",
);

describe("Guru structured conversation UI", () => {
  it("renders structured message blocks rather than raw transcript text", () => {
    expect(drawerSource).toContain("GuruMessageContent");
    expect(drawerSource).toContain("buildGuruContentBlocks");
    expect(drawerSource).not.toContain(
      '<div className="wingman-guru-message-bubble">{message.content}</div>',
    );
  });

  it("keeps the interface decluttered - no quick-ask rail or embedded tool drawers", () => {
    expect(drawerSource).not.toContain('className="wingman-guru-quick-section"');
    expect(drawerSource).not.toContain('className="wingman-guru-support-drawer"');
    expect(drawerSource).not.toContain('className="wingman-guru-tool-drawer"');
  });

  it("provides a scrollable conversation and persistent composer contract", () => {
    expect(drawerSource).toContain('className="wingman-guru-conversation"');
    expect(drawerSource).toContain('className="wingman-guru-composer"');
    expect(drawerSource).toContain("Enter to send - Shift+Enter for a new line");
    expect(cssSource).toContain("flex: 1 1 auto");
    expect(cssSource).toContain("overflow-y: auto !important");
  });

  it("prevents duplicate compare seed prompts", () => {
    expect(drawerSource).toContain("handledSeedPromptRef");
    expect(drawerSource).toContain("handledSeedPromptRef.current === prompt");
  });

  it("styles user and Guru messages as distinct cards", () => {
    expect(cssSource).toContain("Wingman Guru structured conversation UI v2 start");
    expect(cssSource).toContain(".wingman-guru-message-user .wingman-guru-message-bubble");
    expect(cssSource).toContain('.wingman-guru-message[data-message-tone="caution"]');
  });
});
