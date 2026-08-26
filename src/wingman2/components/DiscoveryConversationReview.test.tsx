import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { DiscoveryConversationReview } from "./DiscoveryConversationReview";

function renderReview(items: Parameters<typeof DiscoveryConversationReview>[0]["items"]) {
  return render(
    <MemoryRouter initialEntries={["/wingman/proposal"]}>
      <DiscoveryConversationReview items={items} />
    </MemoryRouter>,
  );
}

describe("DiscoveryConversationReview", () => {
  it("renders the Q&A trail with governed answer and customer wording per row", () => {
    renderReview([
      {
        stepId: "opportunity",
        question: "What type of opportunity is this?",
        answer: "Meeting room / boardroom",
        note: "The exec boardroom on the top floor.",
      },
      {
        stepId: "usb",
        question: "Is USB transport needed?",
        answer: "No USB transport required",
        note: "",
      },
    ]);

    expect(screen.getByText("Discovery Conversation")).toBeTruthy();
    expect(screen.getByText("What type of opportunity is this?")).toBeTruthy();
    expect(screen.getByText("Meeting room / boardroom — to be confirmed")).toBeTruthy();
    expect(screen.getByText("The exec boardroom on the top floor.")).toBeTruthy();

    // Rows without wording render a dash so the rep can see the gap at a glance.
    expect(screen.getByText("No USB transport required — to be confirmed")).toBeTruthy();
    expect(screen.getByText("—")).toBeTruthy();
  });

  it("shows a settled tone for confirmed rows and 'to be confirmed' for open rows", () => {
    renderReview([
      {
        stepId: "opportunity",
        question: "What type of opportunity is this?",
        answer: "Meeting room / boardroom",
        note: "",
        confirmed: true,
      },
      {
        stepId: "sources",
        question: "How many source positions are likely?",
        answer: "2-4 sources",
        note: "",
      },
    ]);

    // Confirmed row keeps the plain settled answer.
    expect(screen.getByText("Meeting room / boardroom")).toBeTruthy();
    expect(screen.getByText("Confirmed with customer")).toBeTruthy();
    expect(screen.queryByText("Meeting room / boardroom — to be confirmed")).toBeNull();

    // Open row keeps the to-be-confirmed wording.
    expect(screen.getByText("2-4 sources — to be confirmed")).toBeTruthy();
    expect(screen.getByText("To be confirmed")).toBeTruthy();
  });

  it("links each row back to the discovery question that produced it", () => {
    renderReview([
      {
        stepId: "scale",
        question: "What is the approximate room or system scale?",
        answer: "Single large room",
        note: "",
      },
    ]);

    expect(
      screen.getByRole("link", { name: 'Edit "What is the approximate room or system scale?" in Discovery' })
        .getAttribute("href"),
    ).toBe("/wingman/discovery?edit=scale");
  });

  it("shows a guidance message when nothing has been captured", () => {
    renderReview([]);
    expect(screen.getByText("Discovery Conversation")).toBeTruthy();
    expect(screen.getByText(/No discovery answers have been captured yet/i)).toBeTruthy();
  });

  it("carries the capture confidence and flags low-confidence rows for re-verification", () => {
    renderReview([
      {
        stepId: "scale",
        question: "What is the approximate room or system scale?",
        answer: "Single large room",
        note: "",
        confidence: "low",
      },
      {
        stepId: "usb",
        question: "Is USB transport needed?",
        answer: "No USB transport required",
        note: "",
        confidence: "high",
      },
      {
        stepId: "sources",
        question: "How many source positions are likely?",
        answer: "2-4 sources",
        note: "",
        confidence: "matched",
      },
    ]);

    // The low row is the one the rep is told to re-verify before export.
    expect(screen.getByText("Low confidence — verify before quote")).toBeTruthy();
    expect(screen.getByText("High confidence")).toBeTruthy();
    expect(screen.getByText("Matched")).toBeTruthy();
  });

  it("renders rows without a recorded confidence without a badge", () => {
    renderReview([
      {
        stepId: "scale",
        question: "What is the approximate room or system scale?",
        answer: "Single large room",
        note: "",
      },
    ]);
    expect(screen.queryByText("High confidence")).toBeNull();
    expect(screen.queryByText("Low confidence — verify before quote")).toBeNull();
    expect(screen.queryByText("Matched")).toBeNull();
  });

  it("filters the walk to only low-confidence rows for re-verification", () => {
    renderReview([
      {
        stepId: "scale",
        question: "What is the approximate room or system scale?",
        answer: "Single large room",
        note: "",
        confidence: "low",
      },
      {
        stepId: "opportunity",
        question: "What type of opportunity is this?",
        answer: "Meeting room / boardroom",
        note: "",
        confidence: "high",
      },
    ]);

    // Default view shows every row (answers carry the to-be-confirmed suffix).
    expect(screen.getByText(/Single large room — to be confirmed/)).toBeTruthy();
    expect(screen.getByText(/Meeting room \/ boardroom — to be confirmed/)).toBeTruthy();

    // The filter chip reports the amber count and narrows to only those rows.
    const chip = screen.getByRole("button", { name: /Re-verify low confidence/ });
    fireEvent.click(chip);

    expect(screen.getByText(/Single large room — to be confirmed/)).toBeTruthy();
    expect(screen.queryByText(/Meeting room \/ boardroom/)).toBeNull();
  });

  it("shows the all-clear empty state when the low-confidence filter matches nothing", () => {
    renderReview([
      {
        stepId: "opportunity",
        question: "What type of opportunity is this?",
        answer: "Meeting room / boardroom",
        note: "",
        confidence: "high",
      },
    ]);

    fireEvent.click(screen.getByRole("button", { name: /Re-verify low confidence/ }));
    expect(
      screen.getByText(/No low-confidence answers.*nothing left to re-verify/i),
    ).toBeTruthy();
  });
});
