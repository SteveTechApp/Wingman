import { useEffect, useState } from "react";
import type { CSSProperties, ReactElement } from "react";
import { useNavigate } from "react-router-dom";

const COMPARE_RETURN_KEY = "wingman:compare:lastResultsUrl";

const buttonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  border: "1px solid rgba(102, 224, 224, 0.35)",
  borderRadius: 999,
  padding: "9px 13px",
  background: "rgba(102, 224, 224, 0.10)",
  color: "#66e0e0",
  fontWeight: 800,
  cursor: "pointer",
  marginBottom: 14,
};

export function CompareBackToListButton(): ReactElement | null {
  const navigate = useNavigate();
  const [returnUrl, setReturnUrl] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const fromCompare = params.get("from") === "compare";
    const savedUrl = window.sessionStorage.getItem(COMPARE_RETURN_KEY) || "";

    if (fromCompare || savedUrl) {
      setReturnUrl(savedUrl || "/wingman/compare");
    }
  }, []);

  if (!returnUrl) {
    return null;
  }

  return (
    <button
      type="button"
      style={buttonStyle}
      onClick={() => {
        navigate(returnUrl);
      }}
    >
      ← Back to compare results
    </button>
  );
}

export default CompareBackToListButton;