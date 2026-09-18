import { runCompareRuntimePipeline } from "../../../lib/compareRuntimePipeline";

export type GovernedCompareInput = {
  inputText: string;
  products: unknown;
  brand?: string;
  limit?: number;
  productUrl?: string;
};

export type GovernedCompareResult = ReturnType<typeof runCompareRuntimePipeline>;

export type GovernedCompareDependencies = {
  runPipeline: typeof runCompareRuntimePipeline;
};

const defaultDependencies: GovernedCompareDependencies = {
  runPipeline: runCompareRuntimePipeline,
};

/**
 * Application boundary for governed Compare execution. Keeping dependency
 * injection here lets route code render a result without owning engine wiring.
 */
export function runGovernedCompareSync(
  input: GovernedCompareInput,
  dependencies: GovernedCompareDependencies = defaultDependencies,
): GovernedCompareResult {
  return dependencies.runPipeline(
    input.inputText,
    input.products,
    input.brand,
    input.limit ?? 10,
    input.productUrl ?? "",
  );
}

export async function runGovernedCompare(
  input: GovernedCompareInput,
  dependencies: GovernedCompareDependencies = defaultDependencies,
): Promise<GovernedCompareResult> {
  return runGovernedCompareSync(input, dependencies);
}
