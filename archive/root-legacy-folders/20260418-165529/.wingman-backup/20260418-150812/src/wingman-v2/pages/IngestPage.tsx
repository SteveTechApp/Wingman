import { PageHero } from "../components/PageHero";
import { SectionCard } from "../components/SectionCard";

export function IngestPage() {
  return (
    <div className="pb-10">
      <PageHero
        eyebrow="Document Ingest"
        title="Convert customer documents into structured sales direction."
        purpose="This page turns emails, tenders, PDFs, and schematics into usable requirements so Wingman can reduce ambiguity, surface missing information, and start the solution story faster."
        nextMove="Upload the source material, review the extracted requirements, then turn the cleaned brief into a proposal draft or matched solution."
      />

      <SectionCard
        title="Upload to insight"
        subtitle="Files are converted into requirements, risks, and recommended next actions."
      >
        <div className="grid gap-6 xl:grid-cols-[1.05fr_1fr_340px]">
          <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <p className="text-lg font-semibold text-slate-900">Drop PDFs, emails, schematics, or tenders here</p>
            <p className="mt-2 text-sm text-slate-600">Supported flows already align with Mammoth and pdfjs usage in the project stack.</p>
            <button className="mt-5 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white">Select files</button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-semibold text-slate-900">Extracted requirements</p>
            <ul className="mt-4 space-y-3 text-sm text-slate-700">
              <li>Meeting room refresh for 8 people</li>
              <li>2 laptop sources + 1 in-room PC</li>
              <li>Single display, possible future dual-display expansion</li>
              <li>USB camera integration likely required</li>
              <li>Client prefers simple operation and minimal cable clutter</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-semibold text-slate-900">Unknowns / next actions</p>
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              <li>Confirm USB host/device topology</li>
              <li>Confirm control expectations</li>
              <li>Confirm expansion path for second display</li>
            </ul>
            <button className="mt-5 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white">
              Create proposal draft
            </button>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
