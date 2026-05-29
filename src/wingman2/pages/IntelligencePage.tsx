import { useMemo, useState } from "react";
import {
  createIntelligenceRecord,
  type IntelligenceConnection,
  type IntelligenceEvidence,
  type IntelligenceRelationship,
  type ProductIntelligenceRecord,
  useProductIntelligenceAdmin,
} from "../data/productIntelligenceAdmin";

type IntelligenceTab = "review" | "builder" | "classification" | "relationships" | "governance";

const productClassOptions = [
  "unclassified",
  "distribution-amplifier",
  "signal-extender-kit",
  "transmitter",
  "receiver",
  "avoip-encoder",
  "avoip-decoder",
  "avoip-transceiver",
  "matrix-switch",
  "presentation-switcher",
  "hdmi-switcher",
  "uc-room-core",
  "wireless-presentation",
  "camera",
  "camera-bridge",
  "video-wall-processor",
  "multiview-processor",
  "software-capability",
  "audio-amplifier",
  "audio-dsp",
  "control-interface",
  "cable",
  "accessory",
  "competitor-unclassified",
];

function cloneRecord(record: ProductIntelligenceRecord): ProductIntelligenceRecord {
  return JSON.parse(JSON.stringify(record)) as ProductIntelligenceRecord;
}

function uid(prefix = "row") {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}-${Date.now().toString(36)}`;
}

function SurfaceToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="wm-intel-toggle">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="wm-intel-field">
      <span>{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="wm-intel-field wm-intel-field-wide">
      <span>{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  );
}

function RecordStatusPill({ record }: { record: ProductIntelligenceRecord }) {
  return (
    <span className="wm-intel-status-pill" data-status={record.reviewStatus}>
      {record.reviewStatus.replace("-", " ")}
    </span>
  );
}

function ConnectionEditor({
  connections,
  onChange,
}: {
  connections: IntelligenceConnection[];
  onChange: (connections: IntelligenceConnection[]) => void;
}) {
  const update = (id: string, patch: Partial<IntelligenceConnection>) => {
    onChange(connections.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const add = () => {
    onChange([
      ...connections,
      {
        id: uid("conn"),
        side: "input",
        label: "New connection",
        connector: "HDMI",
        count: 1,
        notes: "",
      },
    ]);
  };

  return (
    <section className="wm-intel-subsection">
      <div className="wm-intel-subsection-head">
        <div>
          <h3>Physical connections</h3>
          <p>Model the real connectors, direction and count. This is what stops Finder showing the wrong product class.</p>
        </div>
        <button type="button" onClick={add}>Add connection</button>
      </div>

      <div className="wm-intel-connection-list">
        {connections.map((connection) => (
          <article key={connection.id}>
            <select value={connection.side} onChange={(event) => update(connection.id, { side: event.target.value as IntelligenceConnection["side"] })}>
              <option value="input">Input</option>
              <option value="output">Output</option>
              <option value="bidirectional">Bidirectional</option>
              <option value="usb">USB</option>
              <option value="audio">Audio</option>
              <option value="control">Control</option>
              <option value="network">Network</option>
            </select>

            <input value={connection.label} onChange={(event) => update(connection.id, { label: event.target.value })} placeholder="Label" />
            <input value={connection.connector} onChange={(event) => update(connection.id, { connector: event.target.value })} placeholder="Connector" />
            <input
              type="number"
              min={0}
              value={connection.count}
              onChange={(event) => update(connection.id, { count: Number(event.target.value || 0) })}
              placeholder="Count"
            />
            <input value={connection.notes} onChange={(event) => update(connection.id, { notes: event.target.value })} placeholder="Notes" />

            <button type="button" onClick={() => onChange(connections.filter((item) => item.id !== connection.id))}>Remove</button>
          </article>
        ))}
      </div>
    </section>
  );
}

function RelationshipEditor({
  relationships,
  onChange,
}: {
  relationships: IntelligenceRelationship[];
  onChange: (relationships: IntelligenceRelationship[]) => void;
}) {
  const update = (id: string, patch: Partial<IntelligenceRelationship>) => {
    onChange(relationships.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const add = () => {
    onChange([
      ...relationships,
      {
        id: uid("rel"),
        relationshipType: "works-with",
        brand: "",
        sku: "",
        notes: "",
      },
    ]);
  };

  return (
    <section className="wm-intel-subsection">
      <div className="wm-intel-subsection-head">
        <div>
          <h3>Compatibility relationships</h3>
          <p>Capture products that work together, require each other, replace each other or should be compared.</p>
        </div>
        <button type="button" onClick={add}>Add relationship</button>
      </div>

      <div className="wm-intel-relationship-list">
        {relationships.map((relationship) => (
          <article key={relationship.id}>
            <select value={relationship.relationshipType} onChange={(event) => update(relationship.id, { relationshipType: event.target.value as IntelligenceRelationship["relationshipType"] })}>
              <option value="works-with">Works with</option>
              <option value="requires">Requires</option>
              <option value="alternative-to">Alternative to</option>
              <option value="replaced-by">Replaced by</option>
              <option value="accessory-for">Accessory for</option>
              <option value="source-side">Source side</option>
              <option value="display-side">Display side</option>
            </select>

            <input value={relationship.brand} onChange={(event) => update(relationship.id, { brand: event.target.value })} placeholder="Brand" />
            <input value={relationship.sku} onChange={(event) => update(relationship.id, { sku: event.target.value })} placeholder="SKU / product" />
            <input value={relationship.notes} onChange={(event) => update(relationship.id, { notes: event.target.value })} placeholder="Notes" />

            <button type="button" onClick={() => onChange(relationships.filter((item) => item.id !== relationship.id))}>Remove</button>
          </article>
        ))}
      </div>
    </section>
  );
}

function EvidenceEditor({
  evidence,
  onChange,
}: {
  evidence: IntelligenceEvidence[];
  onChange: (evidence: IntelligenceEvidence[]) => void;
}) {
  const update = (id: string, patch: Partial<IntelligenceEvidence>) => {
    onChange(evidence.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const add = () => {
    onChange([
      ...evidence,
      {
        id: uid("ev"),
        sourceType: "user-note",
        title: "",
        url: "",
        notes: "",
      },
    ]);
  };

  return (
    <section className="wm-intel-subsection">
      <div className="wm-intel-subsection-head">
        <div>
          <h3>Evidence and source notes</h3>
          <p>Trusted product intelligence should have a source trail before it is approved for customer-facing use.</p>
        </div>
        <button type="button" onClick={add}>Add evidence</button>
      </div>

      <div className="wm-intel-evidence-list">
        {evidence.map((item) => (
          <article key={item.id}>
            <select value={item.sourceType} onChange={(event) => update(item.id, { sourceType: event.target.value as IntelligenceEvidence["sourceType"] })}>
              <option value="manual-entry">Manual entry</option>
              <option value="manufacturer-page">Manufacturer page</option>
              <option value="datasheet">Datasheet</option>
              <option value="manual">Manual</option>
              <option value="distributor-page">Distributor page</option>
              <option value="search-result">Search result</option>
              <option value="user-note">User note</option>
            </select>

            <input value={item.title} onChange={(event) => update(item.id, { title: event.target.value })} placeholder="Evidence title" />
            <input value={item.url} onChange={(event) => update(item.id, { url: event.target.value })} placeholder="URL / source reference" />
            <textarea value={item.notes} onChange={(event) => update(item.id, { notes: event.target.value })} placeholder="Evidence notes" />

            <button type="button" onClick={() => onChange(evidence.filter((entry) => entry.id !== item.id))}>Remove</button>
          </article>
        ))}
      </div>
    </section>
  );
}

function FeatureEditor({
  record,
  onChange,
}: {
  record: ProductIntelligenceRecord;
  onChange: (record: ProductIntelligenceRecord) => void;
}) {
  const updateFeature = <K extends keyof ProductIntelligenceRecord["features"]>(key: K, value: ProductIntelligenceRecord["features"][K]) => {
    onChange({
      ...record,
      features: {
        ...record.features,
        [key]: value,
      },
    });
  };

  const booleanFeatures: Array<[keyof ProductIntelligenceRecord["features"], string]> = [
    ["mst", "MST / dual display"],
    ["wirelessCasting", "Wireless casting"],
    ["ndi", "NDI"],
    ["dante", "Dante / AES67"],
    ["multiview", "Multiview"],
    ["videoWall", "Video wall"],
    ["scaling", "Scaling"],
    ["seamless", "Seamless"],
    ["hdbaset", "HDBaseT"],
    ["avoip", "AV-over-IP"],
    ["usb2", "USB 2.0"],
    ["usb3", "USB 3.x"],
    ["kvm", "KVM"],
    ["audioDeEmbed", "Audio de-embed"],
    ["audioEmbed", "Audio embed"],
    ["audioDsp", "Audio DSP"],
    ["phantomPower", "Phantom power"],
    ["ir", "IR"],
    ["rs232", "RS-232"],
    ["telnet", "Telnet"],
    ["ipControl", "IP control"],
  ];

  return (
    <section className="wm-intel-subsection">
      <div className="wm-intel-subsection-head">
        <div>
          <h3>Feature flags</h3>
          <p>Use these flags to describe capabilities that are not obvious from the SKU alone.</p>
        </div>
      </div>

      <div className="wm-intel-feature-grid">
        {booleanFeatures.map(([key, label]) => (
          <SurfaceToggle
            key={String(key)}
            label={label}
            checked={Boolean(record.features[key])}
            onChange={(checked) => updateFeature(key, checked as never)}
          />
        ))}
      </div>

      <div className="wm-intel-form-grid">
        <Field label="HDBaseT class" value={record.features.hdbasetClass} onChange={(value) => updateFeature("hdbasetClass", value)} />
        <Field label="Network speed" value={record.features.networkSpeed} onChange={(value) => updateFeature("networkSpeed", value)} />
        <Field label="USB host count" value={String(record.features.usbHostCount)} onChange={(value) => updateFeature("usbHostCount", Number(value || 0))} />
        <Field label="USB peripheral count" value={String(record.features.usbPeripheralCount)} onChange={(value) => updateFeature("usbPeripheralCount", Number(value || 0))} />
        <Field label="Mic inputs" value={String(record.features.micInputs)} onChange={(value) => updateFeature("micInputs", Number(value || 0))} />
        <Field label="Relays" value={String(record.features.relays)} onChange={(value) => updateFeature("relays", Number(value || 0))} />
      </div>
    </section>
  );
}

export function IntelligencePage() {
  const { records, stats, upsert, addDraft, remove } = useProductIntelligenceAdmin();
  const [activeTab, setActiveTab] = useState<IntelligenceTab>("review");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(records[0]?.id ?? "");
  const [draftBrand, setDraftBrand] = useState("");
  const [draftSku, setDraftSku] = useState("");
  const [draftName, setDraftName] = useState("");
  const [draftSourceType, setDraftSourceType] = useState<"wyrestorm" | "competitor">("competitor");

  const selectedRecord = useMemo(() => {
    const match = records.find((item) => item.id === selectedId);
    return match ? cloneRecord(match) : records[0] ? cloneRecord(records[0]) : null;
  }, [records, selectedId]);

  const filteredRecords = useMemo(() => {
    const normalisedQuery = query.trim().toLowerCase();

    if (!normalisedQuery) {
      return records;
    }

    return records.filter((record) =>
      [
        record.brand,
        record.sku,
        record.productName,
        record.productClass,
        record.productRole,
        record.purpose,
        record.reviewStatus,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalisedQuery),
    );
  }, [records, query]);

  const saveSelected = (record: ProductIntelligenceRecord) => {
    const saved = upsert(record);
    setSelectedId(saved.id);
  };

  const createDraft = () => {
    if (!draftSku.trim()) {
      return;
    }

    const created = addDraft({
      sourceType: draftSourceType,
      brand: draftBrand.trim() || (draftSourceType === "wyrestorm" ? "WyreStorm" : ""),
      sku: draftSku.trim(),
      productName: draftName.trim(),
    });

    setDraftSku("");
    setDraftName("");
    setSelectedId(created.id);
    setActiveTab("classification");
  };

  const stageWyreStormSweepItems = () => {
    const seeds = [
      createIntelligenceRecord({ sourceType: "wyrestorm", brand: "WyreStorm", sku: "MX-0402-MST", productName: "MST presentation switcher" }),
      createIntelligenceRecord({ sourceType: "wyrestorm", brand: "WyreStorm", sku: "MX-0403-H3-MST", productName: "MST presentation switcher / MTR feed workflow" }),
      createIntelligenceRecord({ sourceType: "wyrestorm", brand: "WyreStorm", sku: "Teams Camera Control App", productName: "Teams-certified camera control app" }),
    ];

    seeds.forEach((seed) => {
      if (!records.some((record) => record.sku.toLowerCase() === seed.sku.toLowerCase())) {
        upsert({
          ...seed,
          reviewStatus: "needs-review",
          confidence: seed.sku.includes("Teams") ? 45 : 70,
          reviewNotes: "Staged from Wingman sweep seed. Add trusted evidence before approval.",
        });
      }
    });
  };

  return (
    <main className="wm-intel-page">
      <section className="wm-intel-hero">
        <div>
          <p>Wingman intelligence</p>
          <h1>Product Intelligence Admin</h1>
          <span>
            Review WyreStorm and competitor product data before Finder, Compare, Product Pitch or Proposal use it as trusted intelligence.
          </span>
        </div>

        <button type="button" onClick={stageWyreStormSweepItems}>
          Stage WyreStorm sweep seeds
        </button>
      </section>

      <section className="wm-intel-stats">
        <article>
          <span>Total records</span>
          <strong>{stats.total}</strong>
        </article>
        <article>
          <span>Needs review</span>
          <strong>{stats.needsReview}</strong>
        </article>
        <article>
          <span>Approved</span>
          <strong>{stats.approved}</strong>
        </article>
        <article>
          <span>Competitor records</span>
          <strong>{stats.competitors}</strong>
        </article>
        <article>
          <span>WyreStorm records</span>
          <strong>{stats.wyrestorm}</strong>
        </article>
      </section>

      <section className="wm-intel-tabs">
        {[
          ["review", "Review queue"],
          ["builder", "Competitor builder"],
          ["classification", "Classification editor"],
          ["relationships", "Relationships"],
          ["governance", "Governance"],
        ].map(([id, label]) => (
          <button key={id} type="button" className={activeTab === id ? "is-active" : ""} onClick={() => setActiveTab(id as IntelligenceTab)}>
            {label}
          </button>
        ))}
      </section>

      <section className="wm-intel-workspace">
        <aside className="wm-intel-record-list">
          <label>
            Search records
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Brand, SKU, class, status..." />
          </label>

          <div>
            {filteredRecords.map((record) => (
              <button
                key={record.id}
                type="button"
                className={record.id === selectedId ? "is-selected" : ""}
                onClick={() => setSelectedId(record.id)}
              >
                <span>{record.brand || "Unknown brand"}</span>
                <strong>{record.sku}</strong>
                <small>{record.productClass}</small>
                <RecordStatusPill record={record} />
              </button>
            ))}
          </div>
        </aside>

        <section className="wm-intel-editor">
          {activeTab === "builder" ? (
            <section className="wm-intel-panel">
              <div className="wm-intel-panel-head">
                <div>
                  <p>Builder</p>
                  <h2>Create competitor or WyreStorm draft</h2>
                  <span>Start with brand and SKU. Wingman creates a structured draft that must be reviewed before approval.</span>
                </div>
              </div>

              <div className="wm-intel-form-grid">
                <label className="wm-intel-field">
                  <span>Source type</span>
                  <select value={draftSourceType} onChange={(event) => setDraftSourceType(event.target.value as "wyrestorm" | "competitor")}>
                    <option value="competitor">Competitor</option>
                    <option value="wyrestorm">WyreStorm</option>
                  </select>
                </label>

                <Field label="Brand" value={draftBrand} onChange={setDraftBrand} placeholder="e.g. Kramer, Blustream, Just Add Power" />
                <Field label="SKU" value={draftSku} onChange={setDraftSku} placeholder="Exact competitor or WyreStorm SKU" />
                <Field label="Product name" value={draftName} onChange={setDraftName} placeholder="Optional" />
              </div>

              <button type="button" className="wm-intel-primary-button" onClick={createDraft}>
                Create intelligence draft
              </button>

              <article className="wm-intel-guidance">
                <h3>Competitor record rule</h3>
                <p>
                  Do not approve a competitor record from brand and SKU alone. Add evidence from datasheets, manuals, manufacturer pages, distributor pages or user-supplied documents first.
                </p>
              </article>
            </section>
          ) : null}

          {selectedRecord && activeTab !== "builder" ? (
            <section className="wm-intel-panel">
              <div className="wm-intel-panel-head">
                <div>
                  <p>{selectedRecord.sourceType === "wyrestorm" ? "WyreStorm record" : "Competitor record"}</p>
                  <h2>{selectedRecord.sku || "New product intelligence"}</h2>
                  <span>{selectedRecord.brand} - {selectedRecord.productClass}</span>
                </div>

                <RecordStatusPill record={selectedRecord} />
              </div>

              {activeTab === "review" ? (
                <>
                  <div className="wm-intel-form-grid">
                    <Field label="Brand" value={selectedRecord.brand} onChange={(value) => saveSelected({ ...selectedRecord, brand: value })} />
                    <Field label="SKU" value={selectedRecord.sku} onChange={(value) => saveSelected({ ...selectedRecord, sku: value })} />
                    <Field label="Product name" value={selectedRecord.productName} onChange={(value) => saveSelected({ ...selectedRecord, productName: value })} />

                    <label className="wm-intel-field">
                      <span>Review status</span>
                      <select value={selectedRecord.reviewStatus} onChange={(event) => saveSelected({ ...selectedRecord, reviewStatus: event.target.value as ProductIntelligenceRecord["reviewStatus"] })}>
                        <option value="draft">Draft</option>
                        <option value="needs-review">Needs review</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </label>

                    <label className="wm-intel-field">
                      <span>Confidence</span>
                      <input type="number" min={0} max={100} value={selectedRecord.confidence} onChange={(event) => saveSelected({ ...selectedRecord, confidence: Number(event.target.value || 0) })} />
                    </label>
                  </div>

                  <TextAreaField label="Purpose" value={selectedRecord.purpose} onChange={(value) => saveSelected({ ...selectedRecord, purpose: value })} />
                  <TextAreaField label="Review notes" value={selectedRecord.reviewNotes} onChange={(value) => saveSelected({ ...selectedRecord, reviewNotes: value })} />

                  <section className="wm-intel-approval-box">
                    <h3>Approved for customer-facing use</h3>
                    <div className="wm-intel-feature-grid">
                      <SurfaceToggle label="Finder" checked={selectedRecord.approvedFor.finder} onChange={(checked) => saveSelected({ ...selectedRecord, approvedFor: { ...selectedRecord.approvedFor, finder: checked } })} />
                      <SurfaceToggle label="Compare" checked={selectedRecord.approvedFor.compare} onChange={(checked) => saveSelected({ ...selectedRecord, approvedFor: { ...selectedRecord.approvedFor, compare: checked } })} />
                      <SurfaceToggle label="Proposal" checked={selectedRecord.approvedFor.proposal} onChange={(checked) => saveSelected({ ...selectedRecord, approvedFor: { ...selectedRecord.approvedFor, proposal: checked } })} />
                      <SurfaceToggle label="Product Pitch" checked={selectedRecord.approvedFor.pitch} onChange={(checked) => saveSelected({ ...selectedRecord, approvedFor: { ...selectedRecord.approvedFor, pitch: checked } })} />
                    </div>
                  </section>

                  <EvidenceEditor evidence={selectedRecord.evidence} onChange={(evidence) => saveSelected({ ...selectedRecord, evidence })} />
                </>
              ) : null}

              {activeTab === "classification" ? (
                <>
                  <div className="wm-intel-form-grid">
                    <label className="wm-intel-field">
                      <span>Product class</span>
                      <select value={selectedRecord.productClass} onChange={(event) => saveSelected({ ...selectedRecord, productClass: event.target.value })}>
                        {productClassOptions.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </label>

                    <Field label="Product role" value={selectedRecord.productRole} onChange={(value) => saveSelected({ ...selectedRecord, productRole: value })} />
                    <Field label="Family" value={selectedRecord.family} onChange={(value) => saveSelected({ ...selectedRecord, family: value })} />
                    <Field
                      label="Software / built-in connections"
                      value={selectedRecord.softwareConnections.join(", ")}
                      onChange={(value) => saveSelected({ ...selectedRecord, softwareConnections: value.split(",").map((item) => item.trim()).filter(Boolean) })}
                      placeholder="NDI, AirPlay, Miracast, Teams, Dante..."
                    />
                  </div>

                  <ConnectionEditor connections={selectedRecord.physicalConnections} onChange={(physicalConnections) => saveSelected({ ...selectedRecord, physicalConnections })} />
                  <FeatureEditor record={selectedRecord} onChange={saveSelected} />
                </>
              ) : null}

              {activeTab === "relationships" ? (
                <RelationshipEditor relationships={selectedRecord.relationships} onChange={(relationships) => saveSelected({ ...selectedRecord, relationships })} />
              ) : null}

              {activeTab === "governance" ? (
                <section className="wm-intel-governance">
                  <article>
                    <h3>Approval rule</h3>
                    <p>Draft or needs-review records must not influence Finder, Compare or Proposal as trusted results. They can be visible only inside this admin workspace.</p>
                  </article>

                  <article>
                    <h3>Evidence rule</h3>
                    <p>Competitor data should be supported by at least one useful evidence source. Manufacturer pages are best, but manuals, datasheets, distributor pages and user-supplied files are also valuable.</p>
                  </article>

                  <article>
                    <h3>Classification rule</h3>
                    <p>Classify by product purpose first, not shared connector words. HDMI presence alone must never make a cable, extender, switcher and matrix equivalent.</p>
                  </article>

                  <article>
                    <h3>USB rule</h3>
                    <p>Track host side, peripheral side, USB speed and device count. A viable USB design must work end-to-end, especially for BYOD, cameras, speakerphones and touch displays.</p>
                  </article>
                </section>
              ) : null}

              <div className="wm-intel-danger-row">
                <button type="button" onClick={() => remove(selectedRecord.id)}>Delete record</button>
              </div>
            </section>
          ) : null}
        </section>
      </section>
    </main>
  );
}

export default IntelligencePage;