import type { ReactNode } from "react";

type ProductCallStep = "setup" | "select" | "product" | "response";

type ProductCallCardsShellProps = {
  activeStep: ProductCallStep;
  title: string;
  intro: string;
  children: ReactNode;
};

const steps: { key: ProductCallStep; label: string; helper: string }[] = [
  { key: "setup", label: "1. Setup", helper: "Choose voice" },
  { key: "select", label: "2. Select", helper: "Pick SKU" },
  { key: "product", label: "3. Call card", helper: "Use product" },
  { key: "response", label: "4. Response", helper: "Copy wording" }
];

export function ProductCallCardsShell({ activeStep, title, intro, children }: ProductCallCardsShellProps) {
  const activeIndex = steps.findIndex((step) => step.key === activeStep);

  return (
    <main className="wm-pcc-page" data-wingman-product-call-cards-workflow="true">
      <section className="wm-pcc-hero">
        <div>
          <p className="wm-pcc-eyebrow">Product call cards</p>
          <h1>{title}</h1>
          <p>{intro}</p>
        </div>
      </section>

      <section className="wm-pcc-stepper" aria-label="Product Call Cards workflow">
        {steps.map((step, index) => {
          const isActive = step.key === activeStep;
          const isComplete = index < activeIndex;

          return (
            <div
              key={step.key}
              className={`wm-pcc-step ${isActive ? "is-active" : ""} ${isComplete ? "is-complete" : ""}`}
              aria-current={isActive ? "step" : undefined}
            >
              <strong>{step.label}</strong>
              <span>{step.helper}</span>
            </div>
          );
        })}
      </section>

      {children}
    </main>
  );
}