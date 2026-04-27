import { useRef, useState, type ChangeEvent } from "react";
import { Link } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";
import { PageHero } from "../components/PageHero";
import { SectionCard } from "../components/SectionCard";
import { saveIngestAnalysisToProject } from "../data/projectStore";
import { extractDocuments } from "../lib/documentExtract";
import { analyzeRequirementsText } from "../lib/requirementsParser";

type IngestAnalysis = {
  requirements: string[];
  unknowns: string[];
  skippedFiles: string[];
  files: string[];
};

export function IngestPage() {
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [extractState, setExtractState] = useState<"idle" | "extracting" | "complete" | "error">("idle");
  const [analysis, setAnalysis] = useState<IngestAnalysis>({
    requirements: [],
    unknowns: ["Select a readable text file or pasteable brief export to generate structured requirements."],
    skippedFiles: [],
    files: [],
  });
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    setSelectedFiles(files.map((file) => file.name));
    setExtractState("extracting");

    const extracted = await extractDocuments(files);
    const text = extracted.map((item) => item.text).filter(Boolean).join("\n\n");
    const extractionWarnings = extracted.flatMap((item) => item.warnings);
    const parsed = analyzeRequirementsText(text, extractionWarnings);
    const nextAnalysis = {
      ...parsed,
      skippedFiles: extracted.filter((item) => !item.text).map((item) => item.fileName),
      files: files.map((file) => file.name),
    };

    setAnalysis(nextAnalysis);
    saveIngestAnalysisToProject(nextAnalysis, { requireExistingProject: true });
    setExtractState(extractionWarnings.length && !text ? "error" : "complete");
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
              accept=".pdf,.doc,.docx,.txt,.rtf,.md,.csv,.eml"
            />
            <p className="text-lg font-semibold text-slate-900">Drop PDFs, emails, schematics, or tenders here</p>
            <p className="mt-2 text-sm text-slate-600">
              PDF, DOCX, text, markdown, CSV, and email exports are parsed into requirements locally.
            </p>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              If a project is active, extracted requirements are saved there. Otherwise this remains a standalone review.
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={extractState === "extracting"}
              className="mt-5 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {extractState === "extracting" ? "Extracting..." : "Select files"}
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

            {extractState === "complete" ? (
              <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">
                Extraction complete.
              </p>
            ) : extractState === "error" ? (
              <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-900">
                No usable text could be extracted from the selected files.
              </p>
            ) : null}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-semibold text-slate-900">Extracted requirements</p>
            <ul className="mt-4 space-y-3 text-sm text-slate-700">
              {analysis.requirements.map((requirement) => (
                <li key={requirement}>{requirement}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-semibold text-slate-900">Unknowns / next actions</p>
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              {analysis.unknowns.map((unknown) => (
                <li key={unknown}>{unknown}</li>
              ))}
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
