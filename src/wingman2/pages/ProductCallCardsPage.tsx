import { useEffect, useState } from "react";
import { ProductCallCardsProductPage } from "./productCallCards/ProductCallCardsProductPage";
import { ProductCallCardsResponsePage } from "./productCallCards/ProductCallCardsResponsePage";
import { ProductCallCardsSelectPage } from "./productCallCards/ProductCallCardsSelectPage";
import { ProductCallCardsSetupPage } from "./productCallCards/ProductCallCardsSetupPage";
import {
  PRODUCT_CALL_CARDS_BASE,
  PRODUCT_CALL_CARDS_CONTEXT_EVENT,
  PRODUCT_CALL_CARDS_ROUTE_EVENT
} from "./productCallCards/store";

function getCurrentPath() {
  if (typeof window === "undefined") {
    return PRODUCT_CALL_CARDS_BASE;
  }

  return window.location.pathname.replace(/\/+$/, "");
}

export function ProductCallCardsPage() {
  const [path, setPath] = useState(() => getCurrentPath());
  const [, setRefreshKey] = useState(0);

  useEffect(() => {
    const syncPath = () => setPath(getCurrentPath());
    const syncContext = () => setRefreshKey((value) => value + 1);

    window.addEventListener("popstate", syncPath);
    window.addEventListener(PRODUCT_CALL_CARDS_ROUTE_EVENT, syncPath);
    window.addEventListener(PRODUCT_CALL_CARDS_CONTEXT_EVENT, syncContext);

    return () => {
      window.removeEventListener("popstate", syncPath);
      window.removeEventListener(PRODUCT_CALL_CARDS_ROUTE_EVENT, syncPath);
      window.removeEventListener(PRODUCT_CALL_CARDS_CONTEXT_EVENT, syncContext);
    };
  }, []);

  const productMatch = path.match(/\/product-call-cards\/product\/([^/]+)$/);
  const responseMatch = path.match(/\/product-call-cards\/response\/([^/]+)$/);

  if (path.endsWith("/setup")) {
    return <ProductCallCardsSetupPage />;
  }

  if (path.endsWith("/select")) {
    return <ProductCallCardsSelectPage />;
  }

  if (productMatch) {
    return <ProductCallCardsProductPage sku={decodeURIComponent(productMatch[1])} />;
  }

  if (path.endsWith("/card")) {
    return <ProductCallCardsProductPage />;
  }

  if (responseMatch) {
    return <ProductCallCardsResponsePage sku={decodeURIComponent(responseMatch[1])} />;
  }

  if (path.endsWith("/response")) {
    return <ProductCallCardsResponsePage />;
  }

  return <ProductCallCardsSetupPage />;
}

export default ProductCallCardsPage;
