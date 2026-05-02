import { PageHero } from "../components/PageHero";
import { SectionCard } from "../components/SectionCard";

export function ProductPitchPage() {
  return (
    <div className="space-y-4">
      <PageHero
        eyebrow="Product pitch"
        title="One-page WyreStorm product overview"
        purpose="Select any WyreStorm SKU and generate a concise customer-safe product pitch sheet."
        nextMove="Use this page for quick product positioning, proposal text and update checks."
      />
      <SectionCard title="Product pitch" subtitle="The full SKU lookup workflow will load from Wingman product intelligence.">
        <p className="text-sm font-semibold leading-7 text-slate-700">Product pitch workspace.</p>
      </SectionCard>
    </div>
  );
}

export default ProductPitchPage;
