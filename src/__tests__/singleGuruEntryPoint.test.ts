import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("single Guru entry point", () => {
  it("uses the AppShell Guru launcher and does not render the legacy helper from main", () => {
    const mainSource = readFileSync(join(process.cwd(), "src/main.tsx"), "utf8");
    const appShellSource = readFileSync(join(process.cwd(), "src/wingman2/layout/AppShell.tsx"), "utf8");

    expect(mainSource).not.toContain("GuruHelper");
    expect(mainSource).not.toContain("<GuruHelper />");

    expect(appShellSource).toContain("WingmanGuruFab");
    expect(appShellSource).toContain("WingmanGuruDrawer");

    expect((appShellSource.match(/<WingmanGuruFab/g) ?? []).length).toBe(1);
    expect((appShellSource.match(/<WingmanGuruDrawer/g) ?? []).length).toBe(1);
  });
});
