import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ProjectAuditEntry } from "../data/projectStore";
import { AUDIT_SCOPES, SCOPE_CONFIG, AuditLogPanel } from "./AuditLogPanel";

function entry(overrides: Partial<ProjectAuditEntry>): ProjectAuditEntry {
  return {
    id: "audit-1",
    action: "discovery-save",
    detail: "Discovery created — 40% captured",
    scope: "discovery",
    severity: "info",
    actorName: "Wingman user",
    createdAt: "2026-10-20T14:12:00.000Z",
    ...overrides,
  };
}

const review = entry({
  id: "audit-wall-review",
  action: "wall-survey-review",
  detail: "Worksheet photo review — 2 rows accepted, 1 rejected, 1 photo, 72% confidence",
  scope: "videowall",
});

describe("AuditLogPanel scopes", () => {
  it("gives a wall survey its own label and icon", () => {
    const { container } = render(<AuditLogPanel entries={[review]} />);

    // The scope key is not the label: an unconfigured scope would print it raw.
    expect(screen.getByText("Video wall")).toBeTruthy();
    expect(screen.queryByText("videowall")).toBeNull();
    expect(container.querySelector(".wm-audit-entry-icon svg.lucide-monitor")).not.toBeNull();
  });

  it("names every scope the app writes, each with an icon of its own", () => {
    const icons = new Set<string>();

    for (const scope of AUDIT_SCOPES) {
      const { container, unmount } = render(
        <AuditLogPanel entries={[entry({ id: `audit-${scope}`, scope })]} />,
      );
      const label = SCOPE_CONFIG[scope].label;

      // The stored key is never what a reader sees, and the label is the one the
      // config names rather than a capitalised key.
      expect(within(screen.getByRole("list", { name: "Project audit trail" })).getByText(label)).toBeTruthy();
      expect(screen.queryByText(scope)).toBeNull();
      // Every scope is also a filter chip under its own name.
      expect(screen.getByRole("button", { name: `${label} (1)` })).toBeTruthy();

      const icon = container.querySelector(".wm-audit-entry-icon svg");
      expect(icon, scope).not.toBeNull();
      icons.add(icon!.getAttribute("class") ?? "");
      unmount();
    }

    // Distinct icons, so two scopes are told apart before either label is read.
    expect(icons.size).toBe(AUDIT_SCOPES.length);
  });

  it("offers the wall as its own filter", () => {
    render(<AuditLogPanel entries={[review, entry({ id: "audit-discovery" })]} />);

    const chip = screen.getByRole("button", { name: "Video wall (1)" });
    fireEvent.click(chip);

    const trail = screen.getByRole("list", { name: "Project audit trail" });
    const rows = within(trail).getAllByRole("listitem");
    expect(rows).toHaveLength(1);
    expect(within(rows[0]).getByText(review.detail)).toBeTruthy();
    expect(within(trail).queryByText("Discovery")).toBeNull();
  });
});
