import { useState } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  DiscoveryEntryRail,
  DiscoveryGuidedInterview,
  DiscoveryGuidedInterviewEntry,
} from "./DiscoveryGuidedInterview";
import type { DiscoveryAnswers, DiscoveryQuestion } from "./discoveryTypes";
import { getVisibleDiscoveryQuestions } from "./discoveryQuestions";
import { WINGMAN_CAPTURE_LANGUAGE_STORAGE_KEY } from "../../data/wingmanLanguage";
import {
  isInterviewLanguageLoaded,
  loadInterviewLanguage,
} from "./discoveryGuidedInterviewI18n";

// The non-English stem tables are lazy-loaded (see loadInterviewLanguage);
// tests assert the localized stems synchronously after render, so preload the
// languages those tests use before the suite runs.
beforeAll(async () => {
  await Promise.all(["fr", "de"].map((lang) => loadInterviewLanguage(lang)));
});

afterEach(() => {
  window.localStorage.removeItem(WINGMAN_CAPTURE_LANGUAGE_STORAGE_KEY);
  // @ts-expect-error jsdom-only cleanup
  delete window.speechSynthesis;
  // @ts-expect-error jsdom-only cleanup
  delete window.SpeechSynthesisUtterance;
  delete window.SpeechRecognition;
});

// Makes the browser speech APIs look supported so the header voice controls
// (auto-speak, preview, spoken-language toggle) render, and records what the
// component asks the synthesizer to say.
function stubSpeechSynthesis() {
  class SpeechSynthesisUtteranceStub {
    lang = "";
    rate = 1;
    pitch = 1;
    voice: unknown = null;
    constructor(public text: string) {}
  }
  const speak = vi.fn();
  Object.defineProperty(window, "SpeechSynthesisUtterance", {
    value: SpeechSynthesisUtteranceStub,
    configurable: true,
  });
  Object.defineProperty(window, "speechSynthesis", {
    value: { cancel: vi.fn(), speak, getVoices: () => [] },
    configurable: true,
  });
  return speak;
}

function interviewQuestions() {
  return getVisibleDiscoveryQuestions("meeting-room", {});
}

function renderInterview(answers: DiscoveryAnswers = {}) {
  const questions = interviewQuestions();
  render(
    <DiscoveryGuidedInterview
      questions={questions}
      answers={answers}
      notes={{}}
      onAnswersChange={vi.fn()}
      onNotesChange={vi.fn()}
      onExit={vi.fn()}
      onComplete={vi.fn()}
    />,
  );
  return questions;
}

describe("DiscoveryGuidedInterview resume", () => {
  it("starts at the first unanswered question when a discovery is partially complete", () => {
    const questions = renderInterview({ opportunity: "meeting-room" });

    // The interview skips the answered first question and lands on question 2.
    expect(screen.getByText(`Question 2 of ${questions.length}`)).toBeTruthy();
    expect(screen.getByText(questions[1].question)).toBeTruthy();
    expect(screen.queryByText(questions[0].question)).toBeNull();

    // A banner tells the rep the interview resumed rather than restarted.
    expect(
      screen.getByText(/Resumed — continuing at the first open question/),
    ).toBeTruthy();
  });

  it("starts at question one with no banner when nothing has been answered", () => {
    const questions = renderInterview({});

    expect(screen.getByText(`Question 1 of ${questions.length}`)).toBeTruthy();
    expect(
      screen.queryByText(/Resumed — continuing at the first open question/),
    ).toBeNull();
  });

  it("opens a fully-captured discovery in review mode at question one", () => {
    const questions = interviewQuestions();
    const all = Object.fromEntries(
      questions.map((q) => [q.id, q.options[0]?.value ?? "unknown"]),
    );
    renderInterview(all);

    expect(screen.getByText("Reviewing conversation — every question is captured. Answers stay saved; change anything before sign-off.")).toBeTruthy();
    expect(screen.getByText(`Question 1 of ${questions.length}`)).toBeTruthy();
    expect(screen.getByText(questions[0].question)).toBeTruthy();
    // The captured answer is pre-selected — changing it does not reset anything.
    expect(screen.getByRole("button", { name: questions[0].options[0].label }).getAttribute("aria-pressed")).toBe("true");
  });

  it("shows what was captured for the current question while re-walking in review mode", () => {
    const questions = interviewQuestions();
    const answers: DiscoveryAnswers = {};
    for (const q of questions) answers[q.id] = q.options[0]?.value ?? "unknown";
    render(
      <DiscoveryGuidedInterview
        questions={questions}
        answers={answers}
        notes={{ [questions[0].id]: "The exec boardroom on the top floor." }}
        confirmed={{ [questions[0].id]: true }}
        onAnswersChange={vi.fn()}
        onNotesChange={vi.fn()}
        onExit={vi.fn()}
        onComplete={vi.fn()}
      />,
    );

    // The banner summarises the captured governed answer, the customer's own
    // wording and the settled status — no hunting through the options.
    const banner = document.querySelector('[data-guided-captured="true"]');
    expect(banner).toBeTruthy();
    expect(banner?.textContent).toContain("Currently captured");
    expect(banner?.textContent).toContain(questions[0].options[0].label);
    expect(banner?.textContent).toContain("The exec boardroom on the top floor.");
    expect(banner?.textContent).toContain("Confirmed with customer");
    expect(banner?.textContent).toContain("Nothing else in the discovery is reset");

    // The banner tracks the walk: answering moves on and the next question's
    // captured answer is shown the same way — earlier answers stay saved.
    fireEvent.click(screen.getByRole("button", { name: questions[0].options[1].label }));
    const nextBanner = document.querySelector('[data-guided-captured="true"]');
    expect(nextBanner?.textContent).toContain(questions[1].options[0].label);
  });

  it("shows the same 3-tier interpretation confidence as the capture chip in the 'You said' panel", () => {
    // Drive the real speech pipeline: a fake recogniser whose onresult fires
    // the transcript through matchSpokenAnswer, exactly as a browser would.
    const instances: Array<{
      onresult: ((event: unknown) => void) | null;
    }> = [];
    class FakeSpeechRecognition {
      continuous = false;
      interimResults = false;
      lang = "";
      onresult: ((event: unknown) => void) | null = null;
      onerror: (() => void) | null = null;
      onend: (() => void) | null = null;
      start() {}
      stop() {}
      constructor() {
        instances.push(this);
      }
    }
    Object.defineProperty(window, "SpeechRecognition", {
      value: FakeSpeechRecognition,
      configurable: true,
    });

    const questions = interviewQuestions();
    render(
      <DiscoveryGuidedInterview
        questions={questions}
        answers={{}}
        notes={{}}
        onAnswersChange={vi.fn()}
        onNotesChange={vi.fn()}
        onExit={vi.fn()}
        onComplete={vi.fn()}
      />,
    );

    const answer = (transcript: string) => {
      fireEvent.click(screen.getByRole("button", { name: /Open mic/ }));
      // The recogniser's onresult fires outside React's event system, so the
      // state updates it triggers need an act() wrap to flush synchronously.
      act(() => {
        instances.at(-1)?.onresult?.({
          results: { length: 1, 0: { isFinal: true, 0: { transcript } } },
        });
      });
    };

    // Strong phrase match (two curated phrases) → High confidence, 3 bars.
    answer("a meeting room in the boardroom");
    let panel = document.querySelector('[data-guided-heard="true"]');
    expect(panel?.textContent).toContain("You said");
    expect(screen.getByText("High confidence")).toBeTruthy();
    expect(screen.getByLabelText("Confidence 3 of 3")).toBeTruthy();
    expect(panel?.textContent).toContain("Meeting room / boardroom");

    // Single curated phrase → Matched, 2 bars — same tier the capture chip
    // would show for the same wording.
    answer("a conference room");
    panel = document.querySelector('[data-guided-heard="true"]');
    expect(screen.getByText("Matched")).toBeTruthy();
    expect(screen.getByLabelText("Confidence 2 of 3")).toBeTruthy();
    expect(panel?.textContent).toContain("Meeting room / boardroom");

    // Keyword-only hit → Low confidence — verify, 1 bar.
    answer("we need a wall");
    panel = document.querySelector('[data-guided-heard="true"]');
    expect(screen.getByText("Low confidence — verify")).toBeTruthy();
    expect(screen.getByLabelText("Confidence 1 of 3")).toBeTruthy();
    expect(panel?.textContent).toContain("Video wall / LED wall");
  });

  it("lists low-confidence captured answers in the one-line completion summary", () => {
    const instances: Array<{ onresult: ((e: unknown) => void) | null }> = [];
    class FakeSpeechRecognition {
      continuous = false;
      interimResults = false;
      lang = "";
      onresult: ((e: unknown) => void) | null = null;
      onerror: (() => void) | null = null;
      onend: (() => void) | null = null;
      start() {}
      stop() {}
      constructor() {
        instances.push(this);
      }
    }
    Object.defineProperty(window, "SpeechRecognition", {
      value: FakeSpeechRecognition,
      configurable: true,
    });

    const questions: DiscoveryQuestion[] = [
      {
        id: "opportunity", shortLabel: "Opportunity", section: "Test", question: "What type of opportunity is this?", prompt: "Prompt one", why: "", required: true, capturePlaceholder: "",
        options: [{ value: "meeting-room", label: "Meeting room / boardroom" }, { value: "video-wall", label: "Video wall / LED wall" }],
      },
      {
        id: "scale", shortLabel: "Scale", section: "Test", question: "What is the room scale?", prompt: "Prompt two", why: "", required: true, capturePlaceholder: "",
        options: [{ value: "single-large-room", label: "Single large room" }],
      },
    ];
    // `answers` is a controlled prop: the parent must reflect what the mic
    // confirms, otherwise the completion summary would treat every row as
    // unanswered. A tiny stateful harness keeps the map in sync the way
    // DiscoveryPage does.
    const AnswersHarness = ({ questions }: { questions: DiscoveryQuestion[] }) => {
      const [answers, setAnswers] = useState<DiscoveryAnswers>({});
      return (
        <DiscoveryGuidedInterview
          questions={questions}
          answers={answers}
          notes={{}}
          onAnswersChange={setAnswers}
          onNotesChange={() => {}}
          onExit={() => {}}
          onComplete={() => {}}
        />
      );
    };
    render(<AnswersHarness questions={questions} />);

    const answer = (transcript: string) => {
      fireEvent.click(screen.getByRole("button", { name: /Open mic/ }));
      act(() => {
        instances.at(-1)?.onresult?.({
          results: { length: 1, 0: { isFinal: true, 0: { transcript } } },
        });
      });
      // Confirm the interpretation — this applies the answer, records the
      // confidence, and advances to the next question.
      fireEvent.click(screen.getByRole("button", { name: /That's right/ }));
    };

    // q1 answered via a keyword-only partial match → low confidence
    // (that's what makes it a guess rather than a settled pick).
    answer("we need a wall");
    // q2 answered → advancing past the last question lands on the summary.
    answer("single large room");
    expect(screen.getByText("Interview complete")).toBeTruthy();

    // The one-line summary names exactly the low-confidence captured answer
    // (q1 "video-wall", answered on a partial match).
    expect(
      screen.getByText(
        /1 low-confidence answer was captured on partial matches — re-verify before generating recommendations: Video wall \/ LED wall/,
      ),
    ).toBeTruthy();
  });

  it("resumes review mode at the persisted position instead of question one", () => {
    const questions = interviewQuestions();
    const all = Object.fromEntries(
      questions.map((q) => [q.id, q.options[0]?.value ?? "unknown"]),
    );
    render(
      <DiscoveryGuidedInterview
        questions={questions}
        answers={all}
        notes={{}}
        onAnswersChange={vi.fn()}
        onNotesChange={vi.fn()}
        onExit={vi.fn()}
        onComplete={vi.fn()}
        reviewPosition={4}
        onReviewPositionChange={vi.fn()}
      />,
    );

    expect(screen.getByText("Reviewing conversation — every question is captured. Answers stay saved; change anything before sign-off.")).toBeTruthy();
    expect(screen.getByText(`Question 5 of ${questions.length}`)).toBeTruthy();
    expect(screen.getByText(questions[4].question)).toBeTruthy();
    expect(screen.queryByText(questions[0].question)).toBeNull();
  });

  it("jumps straight to a section from the review stepper", () => {
    const questions = interviewQuestions();
    const all = Object.fromEntries(
      questions.map((q) => [q.id, q.options[0]?.value ?? "unknown"]),
    );
    renderInterview(all);

    expect(screen.getByText("Jump to section:")).toBeTruthy();
    const firstUc = questions.findIndex((q) => q.section === "Unified Communications");
    fireEvent.click(screen.getByRole("button", { name: "Unified Communications" }));
    expect(screen.getByText(`Question ${firstUc + 1} of ${questions.length}`)).toBeTruthy();
    expect(screen.getByText(questions[firstUc].question)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Unified Communications" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("shows only the sections with open rows in the focused re-verify stepper", () => {
    const questions: DiscoveryQuestion[] = [
      {
        id: "q1", shortLabel: "First", section: "Sources", question: "First question", prompt: "Prompt one", why: "", required: true, capturePlaceholder: "",
        options: [{ value: "a", label: "Option A" }],
      },
      {
        id: "q2", shortLabel: "Second", section: "Unified", question: "Second question", prompt: "Prompt two", why: "", required: true, capturePlaceholder: "",
        options: [{ value: "c", label: "Option C" }],
      },
      {
        id: "q3", shortLabel: "Third", section: "Positions", question: "Third question", prompt: "Prompt three", why: "", required: true, capturePlaceholder: "",
        options: [{ value: "d", label: "Option D" }],
      },
    ];
    render(
      <DiscoveryGuidedInterview
        questions={questions}
        answers={{ q1: "a", q2: "c", q3: "d" }}
        notes={{}}
        confirmed={{ q2: true }}
        onAnswersChange={vi.fn()}
        onNotesChange={vi.fn()}
        onExit={vi.fn()}
        onComplete={vi.fn()}
        initialReviewOpen
      />,
    );

    // The confirmed "Unified" question drops its whole section from the stepper.
    expect(screen.getByRole("button", { name: "Sources" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Positions" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Unified" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Positions" }));
    expect(screen.getByText("Open question 2 of 2")).toBeTruthy();
    expect(screen.getByText("Third question")).toBeTruthy();
  });

  it("persists the review position as the walk moves", () => {
    const questions: DiscoveryQuestion[] = [
      {
        id: "q1", shortLabel: "First", section: "Test", question: "First question", prompt: "Prompt one", why: "", required: true, capturePlaceholder: "",
        options: [{ value: "a", label: "Option A" }, { value: "b", label: "Option B" }],
      },
      {
        id: "q2", shortLabel: "Second", section: "Test", question: "Second question", prompt: "Prompt two", why: "", required: true, capturePlaceholder: "",
        options: [{ value: "c", label: "Option C" }],
      },
    ];
    const onReviewPositionChange = vi.fn();
    render(
      <DiscoveryGuidedInterview
        questions={questions}
        answers={{ q1: "a", q2: "c" }}
        notes={{}}
        onAnswersChange={vi.fn()}
        onNotesChange={vi.fn()}
        onExit={vi.fn()}
        onComplete={vi.fn()}
        reviewPosition={1}
        onReviewPositionChange={onReviewPositionChange}
      />,
    );

    // Mounting in review mode reports the restored position.
    expect(onReviewPositionChange).toHaveBeenCalledWith(1);

    fireEvent.click(screen.getByRole("button", { name: /Previous question/ }));
    expect(onReviewPositionChange).toHaveBeenLastCalledWith(0);

    fireEvent.click(screen.getByRole("button", { name: /Next question/ }));
    expect(onReviewPositionChange).toHaveBeenLastCalledWith(1);
  });

  it("lets the rep walk back to a previous question in review mode", () => {
    const questions: DiscoveryQuestion[] = [
      {
        id: "q1", shortLabel: "First", section: "Test", question: "First question", prompt: "Prompt one", why: "", required: true, capturePlaceholder: "",
        options: [{ value: "a", label: "Option A" }, { value: "b", label: "Option B" }],
      },
      {
        id: "q2", shortLabel: "Second", section: "Test", question: "Second question", prompt: "Prompt two", why: "", required: true, capturePlaceholder: "",
        options: [{ value: "c", label: "Option C" }],
      },
    ];
    render(
      <DiscoveryGuidedInterview
        questions={questions}
        answers={{ q1: "a", q2: "c" }}
        notes={{}}
        onAnswersChange={vi.fn()}
        onNotesChange={vi.fn()}
        onExit={vi.fn()}
        onComplete={vi.fn()}
      />,
    );

    expect(screen.getByText("Reviewing conversation — every question is captured. Answers stay saved; change anything before sign-off.")).toBeTruthy();
    expect(screen.getByText("Question 1 of 2")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Next question/ }));
    expect(screen.getByText("Question 2 of 2")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Previous question/ }));
    expect(screen.getByText("Question 1 of 2")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Option A" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("re-verifies only the to-be-confirmed questions in focused review mode", () => {
    const questions: DiscoveryQuestion[] = [
      {
        id: "q1", shortLabel: "First", section: "Test", question: "First question", prompt: "Prompt one", why: "", required: true, capturePlaceholder: "",
        options: [{ value: "a", label: "Option A" }],
      },
      {
        id: "q2", shortLabel: "Second", section: "Test", question: "Second question", prompt: "Prompt two", why: "", required: true, capturePlaceholder: "",
        options: [{ value: "c", label: "Option C" }],
      },
      {
        id: "q3", shortLabel: "Third", section: "Test", question: "Third question", prompt: "Prompt three", why: "", required: true, capturePlaceholder: "",
        options: [{ value: "d", label: "Option D" }],
      },
    ];
    render(
      <DiscoveryGuidedInterview
        questions={questions}
        answers={{ q1: "a", q2: "c", q3: "d" }}
        notes={{}}
        confirmed={{ q2: true }}
        onAnswersChange={vi.fn()}
        onNotesChange={vi.fn()}
        onExit={vi.fn()}
        onComplete={vi.fn()}
        initialReviewOpen
      />,
    );

    // The confirmed question is skipped; the walk covers only the open rows.
    expect(screen.getByText("Re-verifying 2 open questions still marked “to be confirmed” — confirm with the customer to settle each row before sign-off.")).toBeTruthy();
    expect(screen.getByText("Open question 1 of 2")).toBeTruthy();
    expect(screen.getByText("First question")).toBeTruthy();
    expect(screen.queryByText("Second question")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Next question/ }));
    expect(screen.getByText("Open question 2 of 2")).toBeTruthy();
    expect(screen.getByText("Third question")).toBeTruthy();
    expect(screen.queryByText("Second question")).toBeNull();
  });

  it("offers the re-verify walk from the summary for the open rows", () => {
    const questions: DiscoveryQuestion[] = [
      {
        id: "q1", shortLabel: "First", section: "Test", question: "First question", prompt: "Prompt one", why: "", required: true, capturePlaceholder: "",
        options: [{ value: "a", label: "Option A" }],
      },
      {
        id: "q2", shortLabel: "Second", section: "Test", question: "Second question", prompt: "Prompt two", why: "", required: true, capturePlaceholder: "",
        options: [{ value: "c", label: "Option C" }],
      },
    ];
    render(
      <DiscoveryGuidedInterview
        questions={questions}
        answers={{ q1: "a", q2: "c" }}
        notes={{}}
        confirmed={{ q2: true }}
        onAnswersChange={vi.fn()}
        onNotesChange={vi.fn()}
        onExit={vi.fn()}
        onComplete={vi.fn()}
        initialReviewOpen
      />,
    );

    // One open question — walking to the end lands on the summary.
    expect(screen.getByText("Open question 1 of 1")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Next question/ }));
    expect(screen.getByText("Interview complete")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Re-verify 1 open question" }));
    expect(screen.getByText("Open question 1 of 1")).toBeTruthy();
    expect(screen.getByText("First question")).toBeTruthy();
  });

  it("shows the re-verify open-questions entry on the rail when rows are open", () => {
    const onStartReviewOpen = vi.fn();
    render(
      <DiscoveryEntryRail
        onStart={vi.fn()}
        onStartReviewOpen={onStartReviewOpen}
        onQuickStart={vi.fn()}
        answeredCount={2}
        total={2}
        openCount={1}
      />,
    );
    expect(screen.getByText("Re-verify open questions — voice Q&A")).toBeTruthy();
    expect(screen.getByText(/1 question is still marked “to be confirmed”/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Re-verify open questions/ }));
    expect(onStartReviewOpen).toHaveBeenCalled();
  });

  it("hides the re-verify open-questions entry when everything is confirmed", () => {
    render(
      <DiscoveryEntryRail
        onStart={vi.fn()}
        onStartReviewOpen={vi.fn()}
        onQuickStart={vi.fn()}
        answeredCount={2}
        total={2}
        openCount={0}
      />,
    );
    expect(screen.queryByText("Re-verify open questions — voice Q&A")).toBeNull();
  });

  it("returns to question one from the summary via Review all questions", () => {
    const questions: DiscoveryQuestion[] = [
      {
        id: "q1", shortLabel: "First", section: "Test", question: "First question", prompt: "Prompt one", why: "", required: true, capturePlaceholder: "",
        options: [{ value: "a", label: "Option A" }],
      },
    ];
    render(
      <DiscoveryGuidedInterview
        questions={questions}
        answers={{ q1: "a" }}
        notes={{}}
        onAnswersChange={vi.fn()}
        onNotesChange={vi.fn()}
        onExit={vi.fn()}
        onComplete={vi.fn()}
      />,
    );

    // Walk to the summary (single question, already answered).
    fireEvent.click(screen.getByRole("button", { name: /Next question/ }));
    expect(screen.getByText("Interview complete")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Review all questions/ }));
    expect(screen.getByText("Question 1 of 1")).toBeTruthy();
    expect(screen.queryByText("Interview complete")).toBeNull();
  });

  it("reads and shows the question in the capture language when it is not English", () => {
    window.localStorage.setItem(WINGMAN_CAPTURE_LANGUAGE_STORAGE_KEY, "fr-FR");
    const questions = renderInterview({});

    // The English heading stays, with the French stem shown beneath it.
    expect(screen.getByText(questions[0].question)).toBeTruthy();
    expect(screen.getByText("Quel type de projet est-ce ?")).toBeTruthy();
  });

  it("lets the rep switch the spoken language mid-call without changing the profile", () => {
    window.localStorage.setItem(WINGMAN_CAPTURE_LANGUAGE_STORAGE_KEY, "fr-FR");
    stubSpeechSynthesis();
    renderInterview({});

    // Default: the question is read (and shown) in the profile language.
    expect(screen.getByText("Quel type de projet est-ce ?")).toBeTruthy();

    // Switch the spoken language to English — the localized stem flips.
    fireEvent.change(screen.getByLabelText("Spoken language"), {
      target: { value: "en" },
    });
    expect(screen.queryByText("Quel type de projet est-ce ?")).toBeNull();

    // The stored profile capture language is untouched.
    expect(window.localStorage.getItem(WINGMAN_CAPTURE_LANGUAGE_STORAGE_KEY)).toBe("fr-FR");
  });

  it("previews the voice in the selected spoken language from the header", () => {
    window.localStorage.setItem(WINGMAN_CAPTURE_LANGUAGE_STORAGE_KEY, "de-DE");
    const speak = stubSpeechSynthesis();
    renderInterview({});

    fireEvent.click(screen.getByRole("button", { name: "Preview voice" }));

    const utterance = speak.mock.calls.at(-1)?.[0] as
      | { text: string; lang: string }
      | undefined;
    expect(utterance?.lang.startsWith("de")).toBe(true);
    expect(utterance?.text).toContain("Hallo");
  });

  it("pairs the localized stem with the English wording in the notes trail", () => {
    window.localStorage.setItem(WINGMAN_CAPTURE_LANGUAGE_STORAGE_KEY, "fr-FR");
    const questions = interviewQuestions();
    render(
      <DiscoveryGuidedInterview
        questions={questions}
        answers={{ opportunity: "meeting-room" }}
        notes={{}}
        onAnswersChange={vi.fn()}
        onNotesChange={vi.fn()}
        onExit={vi.fn()}
        onComplete={vi.fn()}
      />,
    );

    // The captured row keeps the English stem and adds the French stem.
    fireEvent.click(screen.getByRole("button", { name: /Notes captured so far/ }));
    expect(
      screen.getByText("What type of opportunity is this? — Quel type de projet est-ce ?"),
    ).toBeTruthy();
  });

  it("shows an inline loading indicator on the stem until the capture language's tables arrive", async () => {
    // es is not preloaded by this suite (only fr/de/pt are), so the registry
    // is cold — the stem starts as the English fallback with a loading note.
    window.localStorage.setItem(WINGMAN_CAPTURE_LANGUAGE_STORAGE_KEY, "es-ES");
    expect(isInterviewLanguageLoaded("es")).toBe(false);

    const questions = interviewQuestions();
    render(
      <DiscoveryGuidedInterview
        questions={questions}
        answers={{}}
        notes={{}}
        onAnswersChange={vi.fn()}
        onNotesChange={vi.fn()}
        onExit={vi.fn()}
        onComplete={vi.fn()}
      />,
    );

    // While the tables are still being fetched, the stem shows the small
    // inline loading indicator so the fallback isn't mistaken for final copy.
    expect(screen.getByRole("status", { name: /Loading language tables/ })).toBeTruthy();

    // Once the tables land the indicator disappears (the localized stem is final).
    await waitFor(() =>
      expect(screen.queryByRole("status", { name: /Loading language tables/ })).toBeNull(),
    );
    expect(isInterviewLanguageLoaded("es")).toBe(true);
  });

  it("shows the localized stem alongside the English wording in the completion summary", () => {
    window.localStorage.setItem(WINGMAN_CAPTURE_LANGUAGE_STORAGE_KEY, "fr-FR");
    const questions: DiscoveryQuestion[] = [
      {
        id: "opportunity", shortLabel: "Opportunity", section: "Test", question: "What type of opportunity is this?", prompt: "Prompt one", why: "", required: true, capturePlaceholder: "",
        options: [{ value: "meeting-room", label: "Meeting room" }],
      },
    ];
    render(
      <DiscoveryGuidedInterview
        questions={questions}
        answers={{ opportunity: "meeting-room" }}
        notes={{}}
        onAnswersChange={vi.fn()}
        onNotesChange={vi.fn()}
        onExit={vi.fn()}
        onComplete={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Next question/ }));
    expect(screen.getByText("Interview complete")).toBeTruthy();
    // English stem stays, French stem shown alongside it.
    expect(screen.getByText("What type of opportunity is this?")).toBeTruthy();
    expect(screen.getByText("Quel type de projet est-ce ?")).toBeTruthy();
  });

  it("lets the rep mark a captured row as confirmed with the customer from the notes trail", () => {
    const questions = interviewQuestions();
    const onConfirmedChange = vi.fn();
    render(
      <DiscoveryGuidedInterview
        questions={questions}
        answers={{ opportunity: "meeting-room", scale: "single-large-room" }}
        notes={{}}
        confirmed={{ opportunity: true }}
        onConfirmedChange={onConfirmedChange}
        onAnswersChange={vi.fn()}
        onNotesChange={vi.fn()}
        onExit={vi.fn()}
        onComplete={vi.fn()}
      />,
    );

    // The notes trail lists captured rows with their confirmation status.
    fireEvent.click(screen.getByRole("button", { name: /Notes captured so far/ }));
    const confirmedButton = screen.getByRole("button", { name: "Confirmed" });
    expect(confirmedButton.getAttribute("aria-pressed")).toBe("true");

    // Toggling the open scale row flips it to confirmed.
    fireEvent.click(screen.getByRole("button", { name: "Confirm with customer" }));
    expect(onConfirmedChange).toHaveBeenCalled();
    const updater = onConfirmedChange.mock.calls[0][0] as (previous: Record<string, boolean>) => Record<string, boolean>;
    expect(updater({ scale: false })).toEqual({ scale: true });
  });

  it("confirms every captured row in bulk from the summary, leaving open rows untouched", () => {
    const questions: DiscoveryQuestion[] = [
      {
        id: "q1", shortLabel: "First", section: "Test", question: "First question", prompt: "Prompt one", why: "", required: true, capturePlaceholder: "",
        options: [{ value: "a", label: "Option A" }],
      },
      {
        id: "q2", shortLabel: "Second", section: "Test", question: "Second question", prompt: "Prompt two", why: "", required: true, capturePlaceholder: "",
        options: [{ value: "c", label: "Option C" }],
      },
      {
        id: "q3", shortLabel: "Third", section: "Test", question: "Third question", prompt: "Prompt three", why: "", required: true, capturePlaceholder: "",
        options: [{ value: "d", label: "Option D" }],
      },
    ];
    const onConfirmedChange = vi.fn();
    render(
      <DiscoveryGuidedInterview
        questions={questions}
        answers={{ q1: "a", q2: "c" }}
        notes={{}}
        confirmed={{ q1: true }}
        onConfirmedChange={onConfirmedChange}
        onAnswersChange={vi.fn()}
        onNotesChange={vi.fn()}
        onExit={vi.fn()}
        onComplete={vi.fn()}
      />,
    );

    // The interview resumes at the first open question (q3) — skipping it
    // lands on the summary. The bulk action targets only captured rows still
    // open (q2); q1 is already confirmed and q3 was left unanswered.
    expect(screen.getByText("Question 3 of 3")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Skip for now/ }));
    expect(screen.getByText("Interview complete")).toBeTruthy();

    fireEvent.click(
      screen.getByRole("button", { name: /Confirm all captured \(1\)/ }),
    );
    const updater = onConfirmedChange.mock.calls[0][0] as (previous: Record<string, boolean>) => Record<string, boolean>;
    // The already-confirmed row stays confirmed and the captured row joins it.
    expect(updater({ q1: true })).toEqual({ q1: true, q2: true });
    // The unanswered row is never assumed confirmed.
    expect(updater({ q1: true, q2: true }).q3).toBeUndefined();
  });
});

describe("DiscoveryGuidedInterviewEntry", () => {
  it("reads as 'Continue' with progress when a discovery is partially complete", () => {
    render(
      <DiscoveryGuidedInterviewEntry
        onStart={vi.fn()}
        answeredCount={2}
        total={10}
      />,
    );

    expect(screen.getByText("Continue guided interview — voice Q&A")).toBeTruthy();
    expect(screen.getByText(/2 of 10 captured/)).toBeTruthy();
  });

  it("reads as 'Start' when nothing has been captured", () => {
    render(<DiscoveryGuidedInterviewEntry onStart={vi.fn()} />);

    expect(screen.getByText("Guided interview — voice Q&A")).toBeTruthy();
    expect(screen.queryByText(/Continue guided interview/)).toBeNull();
  });

  it("preloads the stored capture language's tables so the first question never flashes English", async () => {
    // pt-PT is not preloaded by the suite (only fr/de are), so the registry is
    // cold for it — rendering the entry card must kick off the load.
    window.localStorage.setItem(WINGMAN_CAPTURE_LANGUAGE_STORAGE_KEY, "pt-PT");
    expect(isInterviewLanguageLoaded("pt")).toBe(false);

    render(<DiscoveryGuidedInterviewEntry onStart={vi.fn()} />);

    // The preload effect fetches the pt tables; wait for the registry to warm.
    await waitFor(() => expect(isInterviewLanguageLoaded("pt")).toBe(true));
  });
});

describe("DiscoveryGuidedInterview stranded defaults in the review trail", () => {
  const twoQuestionFixture = (): DiscoveryQuestion[] => [
    {
      id: "q1", shortLabel: "First", section: "Test", question: "First question", prompt: "Prompt one", why: "", required: true, capturePlaceholder: "",
      options: [{ value: "a", label: "Option A" }, { value: "b", label: "Option B" }],
    },
    {
      id: "q2", shortLabel: "Second", section: "Test", question: "Second question", prompt: "Prompt two", why: "", required: true, capturePlaceholder: "",
      options: [{ value: "c", label: "Option C" }],
    },
  ];

  // Fully-captured interviews open in review mode; two "Next question" clicks
  // walk past the last question into the completion summary (the review trail).
  function walkToSummary(questions: DiscoveryQuestion[]) {
    fireEvent.click(screen.getByRole("button", { name: /Next question/ }));
    fireEvent.click(screen.getByRole("button", { name: /Next question/ }));
    expect(screen.getByText("Interview complete")).toBeTruthy();
  }

  it("shows the remove-stranded action inside the review trail and stays there", () => {
    const questions = twoQuestionFixture();
    const onRemoveStranded = vi.fn();
    render(
      <DiscoveryGuidedInterview
        questions={questions}
        answers={{ q1: "a", q2: "b" }}
        notes={{}}
        onAnswersChange={vi.fn()}
        onNotesChange={vi.fn()}
        onExit={vi.fn()}
        onComplete={vi.fn()}
        strandedQuickStart={[
          { questionId: "q2", questionLabel: "Second question", optionValue: "b", optionLabel: "Option B", origin: "quick-start" },
        ]}
        onRemoveStranded={onRemoveStranded}
      />,
    );

    walkToSummary(questions);

    // The hidden default is flagged inside the trail with the bulk action.
    expect(screen.getByText("Pre-filled answer no longer fits your current answers")).toBeTruthy();
    expect(screen.getByText("Option B")).toBeTruthy();
    const removeButton = screen.getByTestId("remove-stranded-answers");

    // Triggering the action clears the hidden defaults without leaving the
    // review — the completion summary is still the surface on screen.
    fireEvent.click(removeButton);
    expect(onRemoveStranded).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Interview complete")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Generate product recommendations/ })).toBeTruthy();
  });

  it("opens the owning question from the review trail without exiting the interview", () => {
    const questions = twoQuestionFixture();
    const onOpenStrandedStep = vi.fn();
    render(
      <DiscoveryGuidedInterview
        questions={questions}
        answers={{ q1: "a", q2: "b" }}
        notes={{}}
        onAnswersChange={vi.fn()}
        onNotesChange={vi.fn()}
        onExit={vi.fn()}
        onComplete={vi.fn()}
        strandedQuickStart={[
          { questionId: "q2", questionLabel: "Second question", optionValue: "b", optionLabel: "Option B", origin: "quick-start" },
        ]}
        onOpenStrandedStep={onOpenStrandedStep}
      />,
    );

    walkToSummary(questions);

    // The jump stays inside the guided walk: summary closes, question two opens.
    fireEvent.click(screen.getByRole("button", { name: "Open Second question" }));
    expect(onOpenStrandedStep).not.toHaveBeenCalled();
    expect(screen.queryByText("Interview complete")).toBeNull();
    expect(screen.getByText("Question 2 of 2")).toBeTruthy();
    expect(screen.getByText("Second question")).toBeTruthy();
  });

  it("delegates rows outside the guided walk to the page-level step opener", () => {
    const questions = twoQuestionFixture();
    const onOpenStrandedStep = vi.fn();
    render(
      <DiscoveryGuidedInterview
        questions={questions}
        answers={{ q1: "a", q2: "c" }}
        notes={{}}
        onAnswersChange={vi.fn()}
        onNotesChange={vi.fn()}
        onExit={vi.fn()}
        onComplete={vi.fn()}
        strandedQuickStart={[
          { questionId: "q-missing", questionLabel: "Hidden question", optionValue: "x", optionLabel: "Option X", origin: "quick-start" },
        ]}
        onOpenStrandedStep={onOpenStrandedStep}
      />,
    );

    walkToSummary(questions);

    fireEvent.click(screen.getByRole("button", { name: "Open Hidden question" }));
    expect(onOpenStrandedStep).toHaveBeenCalledWith("q-missing");
    expect(screen.getByText("Interview complete")).toBeTruthy();
  });
});

describe("DiscoveryEntryRail", () => {
  it("offers a review entry once every question is answered, without hiding", () => {
    render(
      <DiscoveryEntryRail
        onStart={vi.fn()}
        onQuickStart={vi.fn()}
        answeredCount={5}
        total={5}
      />,
    );
    expect(screen.getByText("Review conversation — voice Q&A")).toBeTruthy();
    expect(screen.getByText(/Re-walk every question/)).toBeTruthy();
  });

  it("shows a resume entry for a partially complete discovery", () => {
    render(
      <DiscoveryEntryRail
        onStart={vi.fn()}
        onQuickStart={vi.fn()}
        answeredCount={3}
        total={10}
      />,
    );
    expect(screen.getByText("Continue guided interview — voice Q&A")).toBeTruthy();
  });
});
