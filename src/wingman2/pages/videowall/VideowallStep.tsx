import type { ReactNode } from "react";

export function VideowallStep({ index, question, hint, children }: {
  index: number;
  question: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <li className="vw-builder-step">
      <span className="vw-builder-step-number" aria-hidden="true">{index}</span>
      <div className="vw-builder-step-body">
        <h3>{question}</h3>
        <p className="vw-builder-step-hint">{hint}</p>
        {children}
      </div>
    </li>
  );
}
