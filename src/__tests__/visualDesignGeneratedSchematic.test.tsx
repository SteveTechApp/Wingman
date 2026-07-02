import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import WingmanGeneratedSchematicPanel from "../wingman2/components/visualDesign/WingmanGeneratedSchematicPanel";

describe("Visual Design generated schematic panel", () => {
  it("renders a Wingman-native first-pass schematic with evidence collapsed by default", () => {
    render(<WingmanGeneratedSchematicPanel />);

    expect(screen.getByRole("heading", { name: /first-pass schematic from wingman/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /view schematic evidence/i })).toBeInTheDocument();
    expect(screen.getByText(/devices \/ nodes/i)).toBeInTheDocument();
    expect(screen.getAllByText(/signal paths/i).length).toBeGreaterThan(0);
    expect(screen.queryByRole("heading", { name: /dependencies/i })).not.toBeInTheDocument();
  });
});