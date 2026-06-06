import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { ErrorBoundary } from "../components/ErrorBoundary";

function renderErroredBoundary(fallback?: ReactNode) {
  const boundary = new ErrorBoundary({
    children: <div>Healthy child</div>,
    fallback,
  });

  boundary.state = {
    hasError: true,
    error: new Error("Test render failure"),
    errorInfo: null,
  };

  render(<>{boundary.render()}</>);
}

describe("ErrorBoundary", () => {
  it("derives error state when a child throws", () => {
    expect(ErrorBoundary.getDerivedStateFromError(new Error("Test render failure"))).toEqual({
      hasError: true,
      error: expect.any(Error),
    });
  });

  it("renders the default recovery UI for an error state", () => {
    renderErroredBoundary();

    expect(screen.getByRole("heading", { name: /something went wrong/i })).toBeInTheDocument();
    expect(screen.getByText("Test render failure")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reload page/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("renders a custom fallback when one is supplied", () => {
    renderErroredBoundary(<div>Custom fallback</div>);

    expect(screen.getByText("Custom fallback")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /something went wrong/i })).not.toBeInTheDocument();
  });
});
