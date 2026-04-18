import { useRef, useState, type ChangeEvent } from "react";
import { Link } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";
import { PageHero } from "../components/PageHero";
import { SectionCard } from "../components/SectionCard";

export function IngestPage() {
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFiles = Array.from(event.target.files ?? []).map((file) => file.name);
    setSelectedFiles(nextFiles);
  };

  return (
    <div className="pb-10">
      <PageHero
        eyebrow="Document Ingest"
        title="Convert customer documents into structured sales direction."
        purpose="This page turns emails, tenders, PDFs, and schematics into usable requirements so Wingman can reduce ambiguity, surface missing information, and start the solution story faster."
        nextMove="Upload the source material, review the extracted requirements, then turn the cleaned brief into a proposal draft or matched solution."
        actions={[
          { label: "Open discovery", to: routeCatalogByKey.discovery.path },
          { label: "Open proposal", to: routeCatalogByKey.proposal.path, variant: "secondary" },
        ]}
      />

      <SectionCard
        title="Upload to insight"
        subtitle="Files are converted into requirements, risks, and recommended next actions."
      >
        <div className="grid gap-6 xl:grid-cols-[1.05fr_1fr_340px]">
          <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.txt,.rtf"
            />
            <p className="text-lg font-semibold text-slate-900">Drop PDFs, emails, schematics, or tenders here</p>
            <p className="mt-2 text-sm text-slate-600">
              Supported flows already align with Mammoth and pdfjs usage in the project stack.
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-5 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            >
              Select files
            </button>

            {selectedFiles.length ? (
              <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 text-left">
                <p className="text-sm font-semibold text-slate-900">Selected files</p>
                <ul className="mt-3 space-y-2 text-sm text-slate-700">
                  {selectedFiles.map((fileName) => (
                    <li key={fileName}>{fileName}</li>
                  ))}
                </ul>
              </div>
            ) : null}
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
              <li>Confirm USB host and device topology</li>
              <li>Confirm control expectations</li>
              <li>Confirm expansion path for second display</li>
            </ul>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                to={routeCatalogByKey.discovery.path}
                className="rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-700 transition hover:bg-white"
              >
                Open discovery
              </Link>
              <Link
                to={routeCatalogByKey.proposal.path}
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                Create proposal draft
              </Link>
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
