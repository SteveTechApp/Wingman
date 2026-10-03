import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

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
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
  });

  it("renders a custom fallback when one is supplied", () => {
    renderErroredBoundary(<div>Custom fallback</div>);

    expect(screen.getByText("Custom fallback")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /something went wrong/i })).not.toBeInTheDocument();
  });

  it("reports caught render errors and preserves the component stack", () => {
    const boundary = new ErrorBoundary({ children: <div>Healthy child</div> });
    const error = new Error("Captured failure");
    const errorInfo = { componentStack: "\n    at BrokenWidget" };
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    boundary.componentDidCatch(error, errorInfo);

    expect(consoleError).toHaveBeenCalledWith("[ErrorBoundary] Uncaught error:", error);
    expect(consoleError).toHaveBeenCalledWith("[ErrorBoundary] Component stack:", errorInfo.componentStack);
    consoleError.mockRestore();
  });

  it("returns healthy children when no error is active", () => {
    const boundary = new ErrorBoundary({ children: <div>Healthy child</div> });
    render(<>{boundary.render()}</>);
    expect(screen.getByText("Healthy child")).toBeInTheDocument();
  });
});
