import type { ReactNode } from "react";

/**
 * One answer of the design pass, read as a line until it is opened.
 *
 * The pass holds the wall, the questions and the verdict. Opened all at once
 * the questions read as forty choices of equal weight beside the picker, so a
 * rep cannot tell which block decides the design. The line keeps the question,
 * the answer the design is using and the step number, so the brief can be read
 * without opening anything, and opens the same controls the step always had
 * when an answer is wrong.
 */
export function VideowallStep({ index, question, answer, hint, children }: {
  index: number;
  /** The question in the builder's own words. */
  question: string;
  /** The answer the design currently uses, so the closed line is readable. */
  answer: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <li className="vw-builder-step">
      <details className="vw-builder-step-details" data-testid={`videowall-step-${index}`}>
        <summary>
          <span className="vw-builder-step-number" aria-hidden="true">{index}</span>
          <span className="vw-builder-step-copy">
            <strong>{question}</strong>
            <span>{answer}</span>
          </span>
        </summary>
        <div className="vw-builder-step-body">
          <p className="vw-builder-step-hint">{hint}</p>
          {children}
        </div>
      </details>
    </li>
  );
}
