import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { SolutionDocumentDefaults } from "./SolutionDocumentDefaults";
import { roomTemplates } from "../lib/roomTemplates";
import {
  HOUSE_DOCUMENT_BRAND,
  defaultPersonalisation,
  loadOrganisationDocumentSettings,
  saveOrganisationDocumentSettings,
  toSolutionTemplate,
} from "../lib/solutionTemplates";

function field(name: string) {
  return screen.getByLabelText(name) as HTMLInputElement;
}

describe("solution document defaults settings", () => {
  beforeEach(() => localStorage.clear());

  it("opens on the house brand a new document would use", () => {
    render(<SolutionDocumentDefaults />);

    // What a document seeds today, before this organisation has set anything.
    expect(field("Organisation logo URL").value).toBe("");
    expect(field("Font").value).toBe("Geist");
    expect(field("Primary colour").value).toBe("#e85d04");
    expect(field("Secondary colour").value).toBe("#263238");
    expect(field("Document footer").value).toBe("Prepared with Wingman");
    expect(field("Document audience").value).toBe("Customer");
    expect(field("Document detail").value).toBe("Standard");

    // The section says how a draft already being personalised can take these,
    // because saving here deliberately does not rewrite one.
    expect(screen.getByText(/choose Use document defaults in its personalisation panel/)).toBeTruthy();
  });

  it("opens on the values this organisation already saved", () => {
    saveOrganisationDocumentSettings({
      organisationLogo: "https://cdn.example.com/logo.svg",
      primaryColour: "#123456",
      footer: "Acme AV · acme.example",
    });

    render(<SolutionDocumentDefaults />);

    expect(field("Organisation logo URL").value).toBe("https://cdn.example.com/logo.svg");
    expect(field("Primary colour").value).toBe("#123456");
    expect(field("Document footer").value).toBe("Acme AV · acme.example");
    // A setting this organisation never touched still reads as the house value.
    expect(field("Secondary colour").value).toBe("#263238");
  });

  it("saves the brand, and a new solution document then starts from it", () => {
    render(<SolutionDocumentDefaults />);

    fireEvent.change(field("Organisation logo URL"), {
      target: { value: "https://cdn.example.com/logo.svg" },
    });
    fireEvent.change(field("Primary colour"), { target: { value: "#123456" } });
    fireEvent.change(field("Document footer"), { target: { value: "Acme AV · acme.example" } });
    fireEvent.change(field("Document audience"), { target: { value: "Consultant" } });
    fireEvent.change(field("Document detail"), { target: { value: "Technical" } });
    fireEvent.click(screen.getByTestId("settings-document-defaults-save"));

    expect(loadOrganisationDocumentSettings()).toMatchObject({
      organisationLogo: "https://cdn.example.com/logo.svg",
      primaryColour: "#123456",
      footer: "Acme AV · acme.example",
      audience: "Consultant",
      detail: "Technical",
    });
    expect(screen.getByRole("status").textContent).toContain(
      "New solution documents will start from these values",
    );
    expect(screen.getByRole("status").textContent).toContain("Use document defaults");

    // The point of the surface: the next document is seeded from what it saved.
    const document = defaultPersonalisation(toSolutionTemplate(roomTemplates[0]));
    expect(document.organisationLogo).toBe("https://cdn.example.com/logo.svg");
    expect(document.primaryColour).toBe("#123456");
    expect(document.footer).toBe("Acme AV · acme.example");
    expect(document.audience).toBe("Consultant");
    expect(document.detail).toBe("Technical");
  });

  it("puts the house brand back and stops claiming this organisation chose one", () => {
    saveOrganisationDocumentSettings({
      organisationLogo: "https://cdn.example.com/logo.svg",
      primaryColour: "#123456",
      footer: "Acme AV · acme.example",
      audience: "Consultant",
    });

    render(<SolutionDocumentDefaults />);
    expect(field("Primary colour").value).toBe("#123456");

    fireEvent.click(screen.getByTestId("settings-document-defaults-reset"));

    // The form shows the house brand again, field by field.
    expect(field("Organisation logo URL").value).toBe(HOUSE_DOCUMENT_BRAND.organisationLogo);
    expect(field("Font").value).toBe(HOUSE_DOCUMENT_BRAND.font);
    expect(field("Primary colour").value).toBe(HOUSE_DOCUMENT_BRAND.primaryColour);
    expect(field("Secondary colour").value).toBe(HOUSE_DOCUMENT_BRAND.secondaryColour);
    expect(field("Document footer").value).toBe(HOUSE_DOCUMENT_BRAND.footer);
    expect(field("Document audience").value).toBe(HOUSE_DOCUMENT_BRAND.audience);
    expect(field("Document detail").value).toBe(HOUSE_DOCUMENT_BRAND.detail);
    expect(screen.getByRole("status").textContent).toContain("house values again");

    // The record goes with it rather than being rewritten with the fallbacks.
    expect(loadOrganisationDocumentSettings()).toEqual({});
    const document = defaultPersonalisation(toSolutionTemplate(roomTemplates[0]));
    expect(document.primaryColour).toBe(HOUSE_DOCUMENT_BRAND.primaryColour);
    expect(document.footer).toBe(HOUSE_DOCUMENT_BRAND.footer);
  });
});
