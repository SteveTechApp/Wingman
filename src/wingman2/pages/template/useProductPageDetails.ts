import { useCallback, useEffect, useRef, useState } from "react";
import { postWingmanJson } from "../../api/wingmanApi";
import type { ProductPageDetails } from "../../lib/productPageIntake";
import { searchProducts, type ProductSearchResult } from "../../lib/productSearch";
import type { TemplateBomRow } from "../../lib/roomTemplates";

/**
 * The equipment drawer's product-page reader and catalogue search.
 *
 * Both are about one open row: the page field follows whichever placeholder row
 * is open, and a typed model searches the catalogue so a placeholder can be
 * replaced rather than left unverified. Nothing here decides what a row becomes
 * — the page applies the details — so the reading and its message stay together.
 */
export function useProductPageDetails({
  detailRow,
  onDetails,
}: {
  detailRow: TemplateBomRow | null;
  /** Applies what the manufacturer's page said to the row and its open copy. */
  onDetails: (rowId: string, details: ProductPageDetails) => void;
}) {
  const [productPageUrl, setProductPageUrl] = useState("");
  const [readingProductPage, setReadingProductPage] = useState(false);
  const [productPageMessage, setProductPageMessage] = useState("");
  const [modelSearchResults, setModelSearchResults] = useState<ProductSearchResult[]>([]);
  const lastSyncedRowIdRef = useRef<string | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Keep the product-page field aligned with whichever placeholder row is open. */
  useEffect(() => {
    if (detailRow?.id === lastSyncedRowIdRef.current) return;
    lastSyncedRowIdRef.current = detailRow?.id ?? null;
    setProductPageUrl(detailRow?.sourceUrl ?? "");
    setProductPageMessage("");
  }, [detailRow]);

  /* Product search for a BY-OTHERS replacement. */
  const searchModels = useCallback((query: string) => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (query.length < 2) { setModelSearchResults([]); return; }
    searchTimerRef.current = setTimeout(async () => {
      const results = await searchProducts(query, 6);
      setModelSearchResults(results);
    }, 250);
  }, []);

  const clearSearch = useCallback(() => setModelSearchResults([]), []);

  const readProductPage = useCallback(async (rowId: string) => {
    const url = productPageUrl.trim();
    if (!url) { setProductPageMessage("Paste the manufacturer's product page URL first."); return; }
    setReadingProductPage(true);
    setProductPageMessage("Reading the manufacturer product page…");
    try {
      const details = await postWingmanJson<ProductPageDetails>("/api/wingman/equipment/inspect-product-page", { productUrl: url });
      if (!details.ok) throw new Error("Wingman couldn't read product details from that page.");
      onDetails(rowId, details);
      setProductPageUrl(String(details.resolvedUrl || url));
      setProductPageMessage("Product details added as suggestions. Check the exact model and specifications before issuing.");
    } catch (error) {
      setProductPageMessage(error instanceof Error ? `${error.message} You can still enter the product details yourself.` : "Could not read that page. Enter the product details yourself.");
    } finally {
      setReadingProductPage(false);
    }
  }, [productPageUrl, onDetails]);

  return {
    productPageUrl,
    setProductPageUrl,
    readingProductPage,
    productPageMessage,
    modelSearchResults,
    searchModels,
    clearSearch,
    readProductPage,
  };
}
