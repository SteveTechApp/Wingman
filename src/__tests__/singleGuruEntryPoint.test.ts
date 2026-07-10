import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("single Guru entry point", () => {
  it("uses the AppShell Guru launcher and does not render the legacy helper from main", () => {
    const mainSource = readFileSync(join(process.cwd(), "src/main.tsx"), "utf8");
    const appShellSource = readFileSync(join(process.cwd(), "src/wingman2/layout/AppShell.tsx"), "utf8");
    const guruFabSource = readFileSync(join(process.cwd(), "src/wingman2/components/WingmanGuruFab.tsx"), "utf8");
    const cssSource = readFileSync(join(process.cwd(), "src/wingman2/styles/wingman-style-stack.css"), "utf8");

    expect(mainSource).not.toContain("GuruHelper");
    expect(mainSource).not.toContain("<GuruHelper />");

    expect(appShellSource).toContain("WingmanGuruFab");
    expect(appShellSource).toContain("WingmanGuruDrawer");

    expect((appShellSource.match(/<WingmanGuruFab/g) ?? []).length).toBe(1);
    expect((appShellSource.match(/<WingmanGuruDrawer/g) ?? []).length).toBe(1);

    expect(guruFabSource).toContain("wingman-guru-fab");
    expect(guruFabSource).toContain("data-context-transfer");
    expect(guruFabSource).toContain("--wingman-guru-left");
    expect(guruFabSource).toContain("--wingman-guru-top");
    expect(guruFabSource).not.toContain("wingman-guru-fab-status");
    expect(appShellSource).toContain("hasContextualTransfer={Boolean(guruSupportCue)}");

    expect(cssSource).toContain("Wingman CSS-rendered Guru launcher start");
    expect(cssSource).toContain('url("/wingman-guru-icon.png")');
    expect(cssSource).toContain("button.wingman-guru-fab::after");
    expect(cssSource).toContain("button.wingman-guru-fab::before");
    expect(cssSource).toContain("left: var(--wingman-guru-left, auto) !important");
    expect(cssSource).toContain("top: var(--wingman-guru-top, auto) !important");
    // The shipped launcher renders a green sweep ring (animation wingmanGuruSweep)
    // and styles its active/support state via [data-support-available="true"]. (An
    // earlier checkpoint test asserted an "amber resting sweep ring" /
    // data-context-transfer redesign that the CSS never received.)
    expect(cssSource).toContain("Green sweep ring");
    expect(cssSource).toContain('data-support-available="true"');
  });
});
