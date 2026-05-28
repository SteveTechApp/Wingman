import { Fragment, useMemo } from "react";
import type { RoomTemplate, TemplateBomRow } from "../lib/roomTemplates";

type CableRow = {
  label: string;
  cable: string;
  appliesTo: string;
  reminder: string;
  type: "video" | "network" | "usb" | "audio" | "control" | "other";
};

type SchematicNode = {
  label: string;
  title: string;
  detail: string;
  count?: string;
  tone: "source" | "core" | "network" | "display" | "usb" | "audio" | "other";
};

function activeRows(rows: TemplateBomRow[]) {
  return rows.filter((row) => row.qty > 0 && row.status !== "excluded");
}

function skuBlob(rows: TemplateBomRow[]) {
  return rows.map((row) => `${row.sku} ${row.role} ${row.description}`).join(" ").toLowerCase();
}

function countMatching(rows: TemplateBomRow[], matcher: (row: TemplateBomRow) => boolean) {
  return rows.filter(matcher).reduce((sum, row) => sum + row.qty, 0);
}

function hasAny(blob: string, terms: string[]) {
  return terms.some((term) => blob.includes(term));
}

function inferArchitecture(template: RoomTemplate, rows: TemplateBomRow[]) {
  const blob = `${template.name} ${template.application} ${template.architecture} ${skuBlob(rows)}`.toLowerCase();

  return {
    isNhd600: blob.includes("nhd-600") || blob.includes("networkhd 600") || blob.includes("10g"),
    isNhd500: blob.includes("nhd-500") || blob.includes("networkhd 500"),
    isNhd100: blob.includes("nhd-120") || blob.includes("nhd-110") || blob.includes("networkhd 100") || blob.includes("nhd-150"),
    isMatrix: hasAny(blob, ["mx-", "matrix", "mxv", "mx-1007"]),
    isHdbaset: hasAny(blob, ["hdbaset", "sw-130", "sw-120", "rx-500", "rx-700", "rx3-100"]),
    isApollo: blob.includes("apo-vx") || blob.includes("apollo"),
    hasVideoWall: hasAny(blob, ["video wall", "sw-0204", "sw-0206", "led wall"]),
    hasMultiview: hasAny(blob, ["multiview", "nhd-150", "nhd-0401-mv"]),
    hasCamera: hasAny(blob, ["camera", "ptz", "cam-"]),
    hasUsb: hasAny(blob, ["usb", "byom", "uc", "conference", "conferencing"]),
    hasDanteAudio: hasAny(blob, ["dante", "amp-260-dnt"]),
    hasByOthers: blob.includes("by-others"),
  };
}

function buildNodes(template: RoomTemplate, rows: TemplateBomRow[]): SchematicNode[] {
  const active = activeRows(rows);
  const architecture = inferArchitecture(template, active);

  const sourceCount = countMatching(active, (row) =>
    /tx|trx|source|input|player|pc|laptop|camera|apollo|switcher/i.test(`${row.sku} ${row.role}`),
  );

  const displayCount = countMatching(active, (row) =>
    /rx|display|decoder|screen|monitor|wall|projector/i.test(`${row.sku} ${row.role}`),
  );

  const sourceDetail = architecture.isApollo
    ? "Laptop, USB-C, HDMI, wireless presentation or room UC source."
    : "Customer sources such as PCs, media players, cameras, signage players, IPTV, laptops or local inputs.";

  const coreDetail = architecture.isNhd600
    ? "NetworkHD 600 transceivers provide the high-performance 10G routed AV layer."
    : architecture.isNhd500
      ? "NetworkHD 500 provides the routed AV layer for premium 4K distribution."
      : architecture.isNhd100
        ? "NetworkHD 100 provides the cost-effective routed AV-over-IP layer."
        : architecture.isMatrix
          ? "WyreStorm matrix / seamless matrix provides the main fixed-I/O routing core."
          : architecture.isApollo
            ? "Apollo provides the local room UC, audio, camera and presentation core."
            : architecture.isHdbaset
              ? "HDBaseT transmitter / receiver path extends the local presentation signal."
              : "WyreStorm connectivity layer routes the confirmed source signals to the required displays.";

  const transportDetail = architecture.isNhd600
    ? "10G managed AV switch infrastructure, fibre/copper uplinks and approved network configuration."
    : architecture.isNhd500 || architecture.isNhd100
      ? "Managed AV network, VLAN/multicast policy, endpoint power and commissioning access."
      : architecture.isHdbaset
        ? "Certified category cable path between transmitter/matrix and receiver/display."
        : "Local HDMI, HDBaseT, USB, control and network cabling as required by the design.";

  const displayDetail = architecture.hasVideoWall
    ? "Displays, wall processor/LED processor, mounting, calibration and content canvas behaviour."
    : "Flat panels, projectors, confidence monitors, preview displays or customer-facing display zones.";

  const nodes: SchematicNode[] = [
    {
      label: "1",
      title: "Sources",
      detail: sourceDetail,
      count: sourceCount > 0 ? `${sourceCount} assumed source paths` : "Validate source count",
      tone: "source",
    },
    {
      label: "2",
      title: "WyreStorm core",
      detail: coreDetail,
      count: `${active.filter((row) => !row.sku.startsWith("BY-OTHERS")).length} WyreStorm BOM rows`,
      tone: "core",
    },
    {
      label: "3",
      title: "Transport",
      detail: transportDetail,
      count: architecture.isNhd600 ? "10G AV network" : architecture.isNhd500 || architecture.isNhd100 ? "AV network" : "Cable path",
      tone: "network",
    },
    {
      label: "4",
      title: "Displays / outputs",
      detail: displayDetail,
      count: displayCount > 0 ? `${displayCount} assumed output paths` : "Validate display count",
      tone: "display",
    },
  ];

  if (architecture.hasCamera || architecture.hasUsb || architecture.isApollo) {
    nodes.push({
      label: "5",
      title: "USB / camera / UC",
      detail: "Camera, USB host, microphone, BYOM/BYOD, room PC or conferencing appliance path.",
      count: "Validate USB topology",
      tone: "usb",
    });
  }

  if (architecture.hasDanteAudio || hasAny(template.application.toLowerCase(), ["audio", "conference", "training", "lecture", "room", "bar", "venue"])) {
    nodes.push({
      label: "6",
      title: "Audio",
      detail: "DSP, microphones, loudspeakers, amplification, assistive listening, venue audio or Dante handoff.",
      count: "Usually by others",
      tone: "audio",
    });
  }

  nodes.push({
    label: "7",
    title: "Other required scope",
    detail: "Displays, mounts, rack, UPS, power, cable containment, network switch, programming, labour and customer source equipment.",
    count: architecture.hasByOthers ? "Placeholder BOM rows included" : "Add placeholders",
    tone: "other",
  });

  return nodes;
}

function buildCableRows(template: RoomTemplate, rows: TemplateBomRow[]): CableRow[] {
  const active = activeRows(rows);
  const architecture = inferArchitecture(template, active);
  const schedule: CableRow[] = [];

  schedule.push({
    label: "Source to WyreStorm input",
    cable: "HDMI / USB-C / DisplayPort adapter / SDI or NDI handoff as required",
    appliesTo: "Laptop, PC, signage player, camera, IPTV, local source or presentation input",
    reminder: "Confirm source connector, resolution, HDCP/content rights, local power and physical source location.",
    type: "video",
  });

  if (architecture.isNhd600) {
    schedule.push({
      label: "NetworkHD 600 endpoint to AV network",
      cable: "10G copper or fibre as approved by the network design",
      appliesTo: "NHD-600-TRX / NHD-600-TRXF endpoint paths",
      reminder: "Validate switch model, optics, fibre/copper distance, VLANs, multicast and commissioning access.",
      type: "network",
    });
  }

  if (architecture.isNhd500 || architecture.isNhd100) {
    schedule.push({
      label: "NetworkHD endpoint to AV network",
      cable: "Certified category cabling to managed AV network switch",
      appliesTo: "NetworkHD encoders, decoders, controllers and multiview processors",
      reminder: "Confirm VLAN, multicast handling, PoE/power requirements, endpoint locations and IT approval.",
      type: "network",
    });
  }

  if (architecture.isHdbaset || architecture.isMatrix) {
    schedule.push({
      label: "HDBaseT / matrix extension path",
      cable: "Certified category cable between transmitter/matrix and receiver/display",
      appliesTo: "SW-130, SW-120, RX-500, RX-700, RX3-100 and matrix extension paths",
      reminder: "Confirm installed cable length, category, termination quality, patching and required USB/control support.",
      type: "video",
    });
  }

  if (architecture.hasUsb || architecture.isApollo) {
    schedule.push({
      label: "USB / UC path",
      cable: "USB-C / USB-A / USB over IP / USB extension as validated",
      appliesTo: "Laptop host, room PC, camera, speakerphone, touch display or conferencing device",
      reminder: "Confirm host location, USB speed, camera bandwidth, touch requirement and BYOM/BYOD workflow.",
      type: "usb",
    });
  }

  if (architecture.hasCamera) {
    schedule.push({
      label: "Camera path",
      cable: "HDMI / USB / LAN / NDI depending on camera and workflow",
      appliesTo: "PTZ, NDI camera, camera bridge, recording appliance or conferencing platform",
      reminder: "Confirm camera control, power, mounting height, field of view, privacy and capture platform input.",
      type: "usb",
    });
  }

  schedule.push({
    label: "Display output path",
    cable: "HDMI / HDBaseT receive / NetworkHD decoder HDMI output",
    appliesTo: "Flat panel, projector, LED processor, video wall processor or confidence monitor",
    reminder: "Confirm display input, EDID, resolution, local power, mounting and service access.",
    type: "video",
  });

  if (architecture.hasDanteAudio || hasAny(template.application.toLowerCase(), ["audio", "conference", "training", "lecture", "bar", "venue", "hearing"])) {
    schedule.push({
      label: "Audio path",
      cable: "Balanced audio / Dante network / speaker cable / mic cable as designed",
      appliesTo: "DSP, microphones, amplifiers, speakers, hearing loop, venue PA or conferencing audio",
      reminder: "Confirm whether audio follows video, is fixed by zone, or is handled by a separate DSP/PA system.",
      type: "audio",
    });
  }

  schedule.push({
    label: "Control and management",
    cable: "LAN / RS-232 / IR / relay / GPIO as required",
    appliesTo: "Display power, source control, presets, touch panel, keypad, control processor and monitoring",
    reminder: "Define who operates the room and convert engineering routes into user-friendly presets.",
    type: "control",
  });

  schedule.push({
    label: "Infrastructure by others",
    cable: "Rack cabling, power, UPS, containment, patching and labelled cable schedule",
    appliesTo: "Complete installed system around the WyreStorm signal path",
    reminder: "Use the BY-OTHERS rows as a checklist before the proposal is issued.",
    type: "other",
  });

  return schedule;
}

function cableToneLabel(type: CableRow["type"]) {
  if (type === "video") return "Video";
  if (type === "network") return "Network / AVoIP";
  if (type === "usb") return "USB / camera";
  if (type === "audio") return "Audio";
  if (type === "control") return "Control";
  return "By others";
}

export function TemplateSchematic({ template, rows }: { template: RoomTemplate; rows: TemplateBomRow[] }) {
  const nodes = useMemo(() => buildNodes(template, rows), [template, rows]);
  const cableRows = useMemo(() => buildCableRows(template, rows), [template, rows]);

  return (
    <section className="wm-template-schematic mt-5">
      <div className="wm-template-schematic-header">
        <div>
          <p className="wingman-kicker">Room schematic</p>
          <h3>Example connectivity view</h3>
          <span>
            Use this as a sales design aid. It shows the assumed signal flow, then the cable schedule reminds the user what still needs validating.
          </span>
        </div>
      </div>

      <div className="wm-template-schematic-flow" aria-label={`Example schematic for ${template.name}`}>
        {nodes.map((node, index) => (
          <Fragment key={node.label}>
            <article className={`wm-template-schematic-node wm-template-schematic-node-${node.tone}`}>
              <small>{node.label}</small>
              <strong>{node.title}</strong>
              <p>{node.detail}</p>
              {node.count ? <span>{node.count}</span> : null}
            </article>

            {index < nodes.length - 1 ? (
              <div className="wm-template-schematic-connector" aria-hidden="true">
                <span />
              </div>
            ) : null}
          </Fragment>
        ))}
      </div>

      <div className="wm-template-cable-legend">
        <span className="wm-cable-video">Video</span>
        <span className="wm-cable-network">Network / AVoIP</span>
        <span className="wm-cable-usb">USB / camera</span>
        <span className="wm-cable-audio">Audio</span>
        <span className="wm-cable-control">Control</span>
        <span className="wm-cable-other">By others</span>
      </div>

      <div className="wm-template-cable-table-wrap">
        <table className="wm-template-cable-table">
          <thead>
            <tr>
              <th>Path</th>
              <th>Example cable / transport</th>
              <th>Applies to</th>
              <th>Sales validation reminder</th>
              <th>Type</th>
            </tr>
          </thead>
          <tbody>
            {cableRows.map((row) => (
              <tr key={`${row.label}-${row.cable}`}>
                <td>{row.label}</td>
                <td>{row.cable}</td>
                <td>{row.appliesTo}</td>
                <td>{row.reminder}</td>
                <td>
                  <span className={`wm-cable-${row.type}`}>{cableToneLabel(row.type)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}