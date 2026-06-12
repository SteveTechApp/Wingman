let productIntelligenceIndexPromise: Promise<unknown> | null = null;

export async function loadProductIntelligenceIndex(): Promise<unknown> {
  if (!productIntelligenceIndexPromise) {
    productIntelligenceIndexPromise = fetch("/product-intelligence-index.json", {
      cache: "force-cache",
    })
      .then((response) => {
        if (!response.ok) {
          productIntelligenceIndexPromise = null;
          throw new Error(`Product intelligence index unavailable: ${response.status}`);
        }

        return response.json();
      })
      .catch((error) => {
        productIntelligenceIndexPromise = null;
        throw error;
      });
  }

  return productIntelligenceIndexPromise;
}

export function clearProductIntelligenceIndexCache(): void {
  productIntelligenceIndexPromise = null;
}