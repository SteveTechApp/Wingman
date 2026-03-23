import React from "react";
import { WM } from "./wmTokens";

type WmProgressProps = {
  steps: string[];
  activeStep: string;
};

export default function WmProgress(props: WmProgressProps) {
  const { steps, activeStep } = props;
  const activeIndex = Math.max(0, steps.findIndex((step) => step === activeStep));

  return (
    <div
      style={{
        display: "grid",
        gap: 12,
        padding: WM.spacing.lg,
        borderRadius: WM.radius.lg,
        border: `1px solid ${WM.color.line}`,
        background: "linear-gradient(180deg, rgba(16,28,49,0.92), rgba(10,17,31,0.92))",
        boxShadow: WM.shadow.soft
      }}
    >
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {steps.map((step, index) => {
          const isActive = index === activeIndex;
          const isDone = index < activeIndex;

          return (
            <div
              key={step}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8
              }}
            >
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: WM.radius.pill,
                  display: "grid",
                  placeItems: "center",
                  fontSize: 12,
                  fontWeight: 800,
                  border: `1px solid ${
                    isActive || isDone ? WM.color.lineStrong : WM.color.line
                  }`,
                  background: isActive
                    ? WM.color.primarySoft
                    : isDone
                    ? "rgba(61,220,151,0.14)"
                    : "rgba(255,255,255,0.03)",
                  color: WM.color.text
                }}
              >
                {isDone ? "✓" : index + 1}
              </div>

              <div
                style={{
                  fontSize: 13,
                  fontWeight: isActive ? 800 : 700,
                  color: isActive ? WM.color.text : WM.color.textSoft
                }}
              >
                {step}
              </div>

              {index < steps.length - 1 ? (
                <div
                  style={{
                    width: 28,
                    height: 1,
                    background: isDone ? WM.color.lineStrong : WM.color.line
                  }}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}