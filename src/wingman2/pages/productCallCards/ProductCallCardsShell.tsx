import type { ReactNode } from "react";
import { useState } from "react";
import {
  PRODUCT_CALL_LANGUAGE_LEVELS,
  PRODUCT_CALL_PRODUCTS,
  loadCallContext,
  navigateCallCardPage,
  saveCallContext
} from "./store";
import type { ProductCallContext } from "./store";

type ProductCallStep = "setup" | "select" | "product" | "response";

type ProductCallCardsShellProps = {
  activeStep: ProductCallStep;
  title: string;
  intro: string;
  children: ReactNode;
};

const steps: { key: ProductCallStep; label: string; path: string }[] = [
  { key: "setup", label: "1. Setup", path: "/setup" },
  { key: "select", label: "2. Product", path: "/select" },
  { key: "product", label: "3. Dashboard", path: "/product" },
  { key: "response", label: "4. Response", path: "/response" }
];

const applicationOptions = [
  "Meeting room / UC",
  "Presentation switching",
  "Classroom AV",
  "Hospitality",
  "Video wall",
  "AVoIP / distribution"
];

type ControlConfig = {
  label: string;
  field: keyof ProductCallContext;
  value: string;
  options: string[];
  placeholder: string;
};

export function ProductCallCardsShell({ activeStep, title, intro, children }: ProductCallCardsShellProps) {
  const [context, setContext] = useState<ProductCallContext>(() => loadCallContext());

  const selectedSku = context.selectedSku || PRODUCT_CALL_PRODUCTS[0]?.sku || "APO-VX20-UC";
  const languageValue = context.salespersonConfidence || "Normal";

  const controls: ControlConfig[] = [
    {
      label: "Language",
      field: "salespersonConfidence",
      value: languageValue,
      options: PRODUCT_CALL_LANGUAGE_LEVELS.map((profile) => profile.level),
      placeholder: "Normal"
    },
    {
      label: "Environment / use case",
      field: "application",
      value: context.application || "",
      options: applicationOptions,
      placeholder: "Not set"
    },
    {
      label: "SKU",
      field: "selectedSku",
      value: selectedSku,
      options: PRODUCT_CALL_PRODUCTS.map((product) => product.sku),
      placeholder: selectedSku
    }
  ];

  const updateContext = (field: keyof ProductCallContext, value: string) => {
    const patch: Partial<ProductCallContext> = {
      [field]: value || undefined
    };

    if (field === "selectedSku") {
      const product = PRODUCT_CALL_PRODUCTS.find((item) => item.sku === value);

      if (product) {
        patch.selectedName = product.name;
      }
    }

    const next = saveCallContext(patch);
    setContext(next);

    if (field === "selectedSku" && value) {
      if (activeStep === "product") {
        navigateCallCardPage(`/product/${encodeURIComponent(value)}`);
      }

      if (activeStep === "response") {
        navigateCallCardPage(`/response/${encodeURIComponent(value)}`);
      }
    }
  };

  const resolveStepPath = (path: string) => {
    const sku = context.selectedSku || selectedSku;

    if (path === "/product") {
      return `/product/${encodeURIComponent(sku)}`;
    }

    if (path === "/response") {
      return `/response/${encodeURIComponent(sku)}`;
    }

    return path;
  };

  return (
    <main className="wm-pcc-page">
      <section className="wm-pcc-hero">
        <div>
          <p className="wm-pcc-eyebrow">Product call cards</p>
          <h1>{title}</h1>
          <p>{intro}</p>
        </div>
      </section>

      <section className="wm-pcc-stepper" aria-label="Product Call Cards workflow">
        {steps.map((step) => (
          <button
            key={step.key}
            type="button"
            className={`wm-pcc-step ${step.key === activeStep ? "is-active" : ""}`}
            onClick={() => navigateCallCardPage(resolveStepPath(step.path))}
          >
            {step.label}
          </button>
        ))}
      </section>

      <section className="wm-pcc-context-strip wm-pcc-context-controls wm-pcc-context-controls-compact" aria-label="Product dashboard controls">
        {controls.map((control) => (
          <label key={control.field} className="wm-pcc-context-control">
            <span>{control.label}</span>
            <select value={control.value} onChange={(event) => updateContext(control.field, event.target.value)}>
              <option value="">{control.placeholder}</option>
              {control.options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        ))}
      </section>

      {children}
    </main>
  );
}