import { useEffect } from "react";

export function IntelligencePage() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const targetPath = "/wingman/products";

    if (window.location.pathname !== targetPath) {
      window.location.replace(targetPath);
    }
  }, []);

  return null;
}

export const ProductIntelligencePage = IntelligencePage;

export default IntelligencePage;
