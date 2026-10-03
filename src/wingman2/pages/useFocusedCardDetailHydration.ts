import { useEffect } from "react";
import { loadProductIntelligenceDetail } from "../lib/productIntelligenceIndexCache";

type DetailHydratableCard = {
  sku: string;
  technicalProfile?: unknown;
  sourceCatalog?: unknown;
};

/**
 * Hydrate the focused card's deferred technical detail (technicalProfile /
 * sourceCatalog) on demand, instead of shipping detail for all ~300 products
 * up front with the summary payload.
 *
 * Re-runs while the card is absent from the still-loading list and no-ops
 * once hydrated, so the initial-load race self-heals without looping.
 */
export function useFocusedCardDetailHydration<T extends DetailHydratableCard>(
  selectedSku: string | null,
  setProducts: (update: (current: T[]) => T[]) => void,
): void {
  useEffect(() => {
    if (!selectedSku) return;
    let cancelled = false;
    loadProductIntelligenceDetail(selectedSku)
      .then((hydrated) => {
        if (cancelled || !hydrated) return;
        setProducts((current) => {
          const index = current.findIndex((product) => product.sku === selectedSku);
          if (index === -1) return current;
          const target = current[index];
          if (target.technicalProfile) return current;
          const next = [...current];
          next[index] = {
            ...target,
            technicalProfile: hydrated.technicalProfile ?? target.technicalProfile,
            sourceCatalog: hydrated.sourceCatalog ?? target.sourceCatalog,
          };
          return next;
        });
      })
      .catch(() => { /* detail stays absent; the card renders its base fields */ });
    return () => { cancelled = true; };
  }, [selectedSku, setProducts]);
}
