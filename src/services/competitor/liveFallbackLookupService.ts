import { lookupCompetitorProduct } from "./lookupService";

export type LiveFallbackArgs = {
  sku: string;
  manufacturer?: string;
};

export async function fetchCompetitorLiveFallback(args: LiveFallbackArgs) {
  const sku = String(args.sku ?? "").trim();
  const manufacturer = String(args.manufacturer ?? "").trim();

  if (!sku) {
    return {
      ok: false as const,
      message: "Please enter a competitor SKU.",
      record: null,
    };
  }

  try {
    const result = await lookupCompetitorProduct(
      manufacturer ? `${manufacturer} ${sku}` : sku
    );

    if (result?.record) {
      return {
        ok: true as const,
        message: "",
        record: result.record,
      };
    }

    return {
      ok: false as const,
      message: manufacturer
        ? `No result found from ${manufacturer}. Please double-check manufacturer and SKU details.`
        : "No result found. Please double-check manufacturer and SKU details.",
      record: null,
    };
  } catch {
    return {
      ok: false as const,
      message: manufacturer
        ? `Unable to fetch live data from ${manufacturer}. Please double-check manufacturer and SKU details.`
        : "Unable to fetch live data. Please double-check manufacturer and SKU details.",
      record: null,
    };
  }
}
