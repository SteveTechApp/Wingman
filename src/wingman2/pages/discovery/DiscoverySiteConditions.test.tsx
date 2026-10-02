import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { DiscoverySiteConditions, DISCOVERY_SITE_UNKNOWN } from "./DiscoverySiteConditions";

describe("room site conditions", () => {
  it("lets a user record a detail as not known yet", () => {
    const onChange = vi.fn();
    function Harness() {
      const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
      return <DiscoverySiteConditions answers={answers} onChange={updater => { onChange(updater); setAnswers(updater); }} />;
    }
    render(<Harness />);
    fireEvent.click(screen.getAllByRole("button", { name: "Not known yet" })[0]);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]({})).toEqual({ "site-wall-construction": DISCOVERY_SITE_UNKNOWN });
    expect(screen.getByLabelText("Walls and fixing surfaces")).toBeDisabled();
  });
});
