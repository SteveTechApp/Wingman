import { useMemo, useState } from "react";

const PROPOSAL_SEED_KEY = "wingman:proposal-seed-from-template";
const TEMPLATE_PACK_KEY = "wingman:template-solution-pack";

type BomLine = {
  qty: string;
  item: string;
  role: string;
  notes: string;
};

type TemplateProposalPack = {
  source?: string;
  templateId?: string;
  application?: string;
  vertical?: string;
  roomType?: string;
  executiveSummary?: string;
  technicalSummary?: string;
  equipmentOverview?: string;
  schematicText?: string;
  wyrestormBom?: BomLine[];
  projectScopeItems?: BomLine[];
  projectDependencies?: BomLine[];
};

function readTemplateProposalPack(): TemplateProposalPack | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.sessionStorage.getItem(PROPOSAL_SEED_KEY) ?? window.sessionStorage.getItem(TEMPLATE_PACK_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as TemplateProposalPack;
  } catch {
    return null;
  }
}

export function hasTemplateProposalSeed(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return Boolean(window.sessionStorage.getItem(PROPOSAL_SEED_KEY) ?? window.sessionStorage.getItem(TEMPLATE_PACK_KEY));
}

function valueText(value: string | undefined, fallback: string): string {
  if (!value || !value.trim()) {
    return fallback;
  }

  return value;
}

function linesToParagraphs(value: string): string[] {
  return value
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function TemplateProposalSeedPanel() {
  const [pack, setPack] = useState<TemplateProposalPack | null>(() => readTemplateProposalPack());
  const [copied, setCopied] = useState<string | null>(null);

  const projectScopeItems = useMemo(() => {
    return pack?.projectScopeItems ?? pack?.projectDependencies ?? [];
  }, [pack]);

  const proposalBody = useMemo(() => {
    if (!pack) {
      return "";
    }

    const sections = [
      "Executive summary",
      valueText(pack.executiveSummary, ""),
      "",
      "Technical summary",
      valueText(pack.technicalSummary, ""),
      "",
      "Equipment overview",
      valueText(pack.equipmentOverview, ""),
      "",
      "Schematic / visual brief",
      valueText(pack.schematicText, "")
    ];

    return sections.join("\n");
  }, [pack]);

  if (!pack) {
    return (
      <main className="wm-template-proposal-page wingman-page-host" data-wingman-page="proposal">
        <section className="wingman-surface wm-template-proposal-empty">
          <p className="wm-template-seed-kicker">Proposal support</p>
          <h1>No template proposal pack is available.</h1>
          <p>Return to Templates, select a template, review the solution builder, then choose Send to proposal.</p>
          <a href="/wingman/templates">Open templates</a>
        </section>
      </main>
    );
  }

  const copyText = async (label: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    window.setTimeout(() => setCopied(null), 1400);
  };

  const clearPack = () => {
    window.sessionStorage.removeItem(PROPOSAL_SEED_KEY);
    window.sessionStorage.removeItem(TEMPLATE_PACK_KEY);
    setPack(null);
  };

  return (
    <main className="wm-template-proposal-page wingman-page-host" data-wingman-page="proposal">
      <section className="wm-template-proposal-hero wingman-surface">
        <div>
          <p className="wm-template-seed-kicker">Customer proposal builder</p>
          <h1>{valueText(pack.application, "Template-based AV proposal")}</h1>
          <p>
            Proposal-ready content has been generated from the reviewed template solution.
            The WyreStorm section can be copied into a wider customer proposal, with project scope items retained for coordination by the delivery team.
          </p>
        </div>

        <div className="wm-template-proposal-actions">
          <button type="button" onClick={() => copyText("Full proposal text", proposalBody)}>
            {copied === "Full proposal text" ? "Copied" : "Copy proposal text"}
          </button>
          <button type="button" onClick={clearPack}>Clear pack</button>
          <a href="/wingman/discovery">Edit solution</a>
        </div>
      </section>

      <section className="wm-template-proposal-meta wingman-surface">
        <div>
          <span>Vertical</span>
          <strong>{valueText(pack.vertical, "Commercial AV")}</strong>
        </div>
        <div>
          <span>Room type</span>
          <strong>{valueText(pack.roomType, "Project space")}</strong>
        </div>
        <div>
          <span>Source</span>
          <strong>{valueText(pack.source, "Template Solution Builder")}</strong>
        </div>
      </section>

      <section className="wm-template-proposal-grid">
        <article className="wingman-surface">
          <h2>Executive summary</h2>
          {linesToParagraphs(valueText(pack.executiveSummary, "Executive summary content will appear here.")).map((line) => (
            <p key={line}>{line}</p>
          ))}
          <button type="button" onClick={() => copyText("Executive summary", valueText(pack.executiveSummary, ""))}>
            {copied === "Executive summary" ? "Copied" : "Copy"}
          </button>
        </article>

        <article className="wingman-surface">
          <h2>Technical summary</h2>
          <pre>{valueText(pack.technicalSummary, "Technical summary content will appear here.")}</pre>
          <button type="button" onClick={() => copyText("Technical summary", valueText(pack.technicalSummary, ""))}>
            {copied === "Technical summary" ? "Copied" : "Copy"}
          </button>
        </article>

        <article className="wingman-surface">
          <h2>Equipment overview</h2>
          <pre>{valueText(pack.equipmentOverview, "Equipment overview content will appear here.")}</pre>
          <button type="button" onClick={() => copyText("Equipment overview", valueText(pack.equipmentOverview, ""))}>
            {copied === "Equipment overview" ? "Copied" : "Copy"}
          </button>
        </article>

        <article className="wingman-surface">
          <h2>Schematic / visual brief</h2>
          <pre>{valueText(pack.schematicText, "Schematic brief content will appear here.")}</pre>
          <button type="button" onClick={() => copyText("Schematic", valueText(pack.schematicText, ""))}>
            {copied === "Schematic" ? "Copied" : "Copy"}
          </button>
        </article>
      </section>

      <section className="wm-template-proposal-table wingman-surface">
        <div>
          <p className="wm-template-seed-kicker">WyreStorm equipment section</p>
          <h2>BoM direction</h2>
        </div>

        <table>
          <thead>
            <tr>
              <th>Qty</th>
              <th>Item</th>
              <th>Role in solution</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {(pack.wyrestormBom ?? []).map((line) => (
              <tr key={`${line.qty}-${line.item}-${line.role}`}>
                <td>{line.qty}</td>
                <td>{line.item}</td>
                <td>{line.role}</td>
                <td>{line.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="wm-template-proposal-table wm-template-proposal-scope wingman-surface">
        <div>
          <p className="wm-template-seed-kicker">Project scope coordination</p>
          <h2>Items outside the WyreStorm equipment section</h2>
          <p>
            These items are retained so the WyreStorm proposal section can sit inside a wider project document without pretending to supply the full AV, IT, building or display package.
          </p>
        </div>

        <table>
          <thead>
            <tr>
              <th>Qty</th>
              <th>Item</th>
              <th>Role in project</th>
              <th>Delivery notes</th>
            </tr>
          </thead>
          <tbody>
            {projectScopeItems.map((line) => (
              <tr key={`${line.qty}-${line.item}-${line.role}`}>
                <td>{line.qty}</td>
                <td>{line.item}</td>
                <td>{line.role}</td>
                <td>{line.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}

export { TemplateProposalSeedPanel };
export default TemplateProposalSeedPanel;