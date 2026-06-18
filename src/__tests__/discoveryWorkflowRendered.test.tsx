import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { readProjectStore } from "@/wingman2/data/projectStore";
import { DiscoveryPage } from "@/wingman2/pages/DiscoveryPage";

async function chooseOption(name: RegExp, nextQuestion: RegExp) {
  fireEvent.click(screen.getByRole("button", { name }));
  await screen.findByText(nextQuestion);
}

describe("Discovery rendered workflow handoff", () => {
  it("saves structured hospitality evidence for a sports-bar discovery workflow", async () => {
    window.localStorage.clear();
    window.sessionStorage.clear();

    render(
      <MemoryRouter>
        <DiscoveryPage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByRole("textbox"), {
      target: {
        value: "Hospitality sports bar with Sky boxes, signage players, six TVs, staff source control, and local rack routing.",
      },
    });

    await chooseOption(/Hospitality \/ bar \/ venue/i, /What is the approximate room or system scale/i);
    await chooseOption(/Multiple rooms \/ zones/i, /How many source positions are likely/i);
    await chooseOption(/2.*4 sources/i, /How many displays or outputs are needed/i);
    await chooseOption(/3.*8 displays/i, /Is USB, camera or conferencing needed/i);
    await chooseOption(/No USB \/ conferencing/i, /What audio requirement is likely/i);
    await chooseOption(/Room speakers \/ amplifier/i, /How should the user operate the system/i);
    await chooseOption(/Simple \/ automatic/i, /What infrastructure is available/i);
    fireEvent.click(screen.getByRole("button", { name: /Medium distance \/ HDBaseT/i }));

    fireEvent.click(await screen.findByRole("button", { name: /Find matching products/i }));

    const snapshot = readProjectStore();
    const activeProject = snapshot.projects.find((project) => project.id === snapshot.activeProjectId) ?? snapshot.projects[0];
    const evidence = activeProject.discoveryBrief?.recommendationEvidence;

    expect(activeProject.discoveryBrief?.roomModel).toMatchObject({
      roomType: "Hospitality / bar / venue",
      application: "Hospitality / bar / venue",
      usbOwnership: "No USB / conferencing",
      audioPath: "Room speakers / amplifier",
    });
    expect(activeProject.workflow?.source).toBe("Discovery");
    expect(activeProject.workflow?.nextRoute).toBe("/wingman/finder");
    expect(evidence?.customerRequirement.toLowerCase()).toContain("sports bar");
    expect(evidence?.systemShape.toLowerCase()).toMatch(/routing|matrix|networkhd|contained/);
    expect(evidence?.productFamilyScores?.[0]?.family).toMatch(/Matrix|NetworkHD/);
    expect(evidence?.quoteSafetyStatus).toBeDefined();
    expect(Array.isArray(evidence?.missingInformation)).toBe(true);
  });
});
