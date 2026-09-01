/**
 * Site Survey Checklist — generates a printable checklist from project topology.
 *
 * Extracts cable distances, port counts, and equipment positions so the
 * integrator can verify everything on-site before installation.
 */

import {
  normaliseProjectTopology,
  type ProjectLocation,
  type ProjectDevice,
} from "./projectTopology";
import type { StoredProject, StoredProductSelection } from "../data/projectStore";
import { generateQrCodeSvg, generateTopologyUrl } from "./qrCodeSvg";

/* ──────────────────────────────────────────────
   Types
   ────────────────────────────────────────────── */

export type SurveyLocation = {
  id: string;
  name: string;
  type: string;
  notes: string;
  devices: SurveyDevice[];
  portCount: number;
};

export type SurveyDevice = {
  id: string;
  name: string;
  category: string;
  sku?: string;
  quantity: number;
  manufacturer?: string;
  thirdParty: boolean;
  status: string;
  notes: string;
  ports: string[];
};

export type SurveyCable = {
  id: string;
  fromDevice: string;
  fromLocation: string;
  toDevice: string;
  toLocation: string;
  transport: string;
  services: string[];
  lengthMetres?: number;
  lengthMode: string;
  estimateReason?: string;
  confirmedByIntegrator: boolean;
  actualLengthMetres?: number;
};

export type SurveyPortSummary = {
  transport: string;
  count: number;
  locations: string[];
};

/**
 * One installation-detail item confirmed on site. These are deliberately NOT
 * discovery questions: they do not change the WyreStorm hardware selection
 * (unlike reach, USB generation and transport), so they belong to the site
 * survey, not the pre-sales brief.
 */
export type SurveyInstallItem = {
  id: string;
  label: string;
  /** Location or device the item applies to, when derivable from topology. */
  appliesTo?: string;
  /** Guidance for the surveyor — what exactly to confirm. */
  hint: string;
};

export type SurveyChecklist = {
  projectId: string;
  projectName: string;
  customer: string;
  site: string;
  generatedAt: string;
  locations: SurveyLocation[];
  cables: SurveyCable[];
  portSummary: SurveyPortSummary[];
  /** Optional so pre-existing stored/legacy checklist data keeps loading. */
  installItems?: SurveyInstallItem[];
  totalDevices: number;
  totalCables: number;
  estimatedCableMetres: number;
  confirmedCableMetres: number;
  unknownCableCount: number;
  thirdPartyDevices: number;
};

/* ──────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────── */

function locationLabel(loc: ProjectLocation): string {
  const typeLabels: Record<string, string> = {
    table: "Table",
    lectern: "Lectern",
    "floor-box": "Floor Box",
    "display-wall": "Display Wall",
    ceiling: "Ceiling",
    "projector-position": "Projector Position",
    "room-rack": "Room Rack",
    "local-cupboard": "Equipment Cupboard",
    "central-rack": "Central Rack",
    "other-room": "Other Room",
    "other-floor": "Other Floor",
    "other-building": "Other Building",
    network: "Network",
    custom: "Custom",
    unknown: "Unknown",
  };
  return `${loc.name} (${typeLabels[loc.type] ?? loc.type})`;
}

function transportLabel(transport: string): string {
  const labels: Record<string, string> = {
    hdmi: "HDMI",
    "usb-c": "USB-C",
    displayport: "DisplayPort",
    "hdbaset-2": "HDBaseT 2.0",
    "hdbaset-3": "HDBaseT 3.0",
    "fibre-mm": "Fibre (MM)",
    "fibre-sm": "Fibre (SM)",
    "ip-av-vlan": "AVoIP (VLAN)",
    "shared-ip-network": "AVoIP (Shared)",
    "point-to-point-network": "AVoIP (P2P)",
    "usb-data": "USB Data",
    "usb-extender": "USB Extender",
    rs232: "RS-232",
    ir: "IR",
    "analogue-audio": "Analogue Audio",
    "dante-aes67": "Dante/AES67",
    other: "Other",
    unknown: "Unknown",
  };
  return labels[transport] ?? transport;
}

function serviceLabel(service: string): string {
  const labels: Record<string, string> = {
    video: "Video",
    "embedded-audio": "Embedded Audio",
    "analogue-audio": "Analogue Audio",
    "usb-2": "USB 2.0",
    "usb-3": "USB 3.x",
    "usb-kvm": "USB KVM",
    ethernet: "Ethernet",
    "av-over-ip": "AV-over-IP",
    rs232: "RS-232",
    ir: "IR",
    "gpio-relay": "GPIO/Relay",
    "dante-aes67": "Dante/AES67",
    power: "Power/PoH",
  };
  return labels[service] ?? service;
}

/* ──────────────────────────────────────────────
   Build checklist from topology
   ────────────────────────────────────────────── */

export function buildSiteSurveyChecklist(
  project: StoredProject,
  productSelections?: StoredProductSelection[],
): SurveyChecklist {
  const topology = normaliseProjectTopology(project.discoveryBrief?.topology);
  const brief = project.discoveryBrief;
  const roomModel = (brief?.roomModel ?? {}) as Record<string, unknown>;
  const getString = (key: string) =>
    typeof roomModel[key] === "string" ? String(roomModel[key]) : "";

  // Build device lookup
  const deviceById = new Map<string, ProjectDevice>();
  for (const device of topology.devices) {
    deviceById.set(device.id, device);
  }

  // Build location lookup
  const locationById = new Map<string, ProjectLocation>();
  for (const loc of topology.locations) {
    locationById.set(loc.id, loc);
  }

  // Build locations with devices
  const locations: SurveyLocation[] = topology.locations.map((loc) => {
    const devices = topology.devices
      .filter((d) => d.locationId === loc.id)
      .map((d): SurveyDevice => {
        // Count ports from connections
        const ports: string[] = [];
        for (const conn of topology.connections) {
          if (conn.fromDeviceId === d.id && conn.fromPort) {
            ports.push(conn.fromPort);
          }
          if (conn.toDeviceId === d.id && conn.toPort) {
            ports.push(conn.toPort);
          }
        }

        return {
          id: d.id,
          name: d.name,
          category: d.category,
          sku: d.sku,
          quantity: d.quantity,
          manufacturer: d.manufacturer,
          thirdParty: d.thirdParty,
          status: d.status,
          notes: d.notes ?? "",
          ports: [...new Set(ports)],
        };
      });

    const portCount = devices.reduce((sum, d) => sum + d.ports.length, 0);

    return {
      id: loc.id,
      name: locationLabel(loc),
      type: loc.type,
      notes: loc.notes ?? "",
      devices,
      portCount,
    };
  });

  // Build cables
  const cables: SurveyCable[] = topology.connections.map((conn) => {
    const fromDevice = deviceById.get(conn.fromDeviceId);
    const toDevice = deviceById.get(conn.toDeviceId);
    const fromLoc = fromDevice ? locationById.get(fromDevice.locationId) : undefined;
    const toLoc = toDevice ? locationById.get(toDevice.locationId) : undefined;

    return {
      id: conn.id,
      fromDevice: fromDevice?.name ?? "Unknown Device",
      fromLocation: fromLoc ? locationLabel(fromLoc) : "Unknown Location",
      toDevice: toDevice?.name ?? "Unknown Device",
      toLocation: toLoc ? locationLabel(toLoc) : "Unknown Location",
      transport: transportLabel(conn.transport),
      services: conn.services.map(serviceLabel),
      lengthMetres: conn.lengthMetres,
      lengthMode: conn.lengthMode,
      estimateReason: conn.estimateReason,
      confirmedByIntegrator: false,
    };
  });

  // Port summary by transport type
  const portCounts = new Map<string, { count: number; locations: Set<string> }>();
  for (const conn of topology.connections) {
    const key = transportLabel(conn.transport);
    const existing = portCounts.get(key) ?? { count: 0, locations: new Set() };
    existing.count += 1;
    const fromDevice = deviceById.get(conn.fromDeviceId);
    const toDevice = deviceById.get(conn.toDeviceId);
    if (fromDevice) {
      const loc = locationById.get(fromDevice.locationId);
      if (loc) existing.locations.add(loc.name);
    }
    if (toDevice) {
      const loc = locationById.get(toDevice.locationId);
      if (loc) existing.locations.add(loc.name);
    }
    portCounts.set(key, existing);
  }

  const portSummary: SurveyPortSummary[] = [...portCounts.entries()]
    .map(([transport, data]) => ({
      transport,
      count: data.count,
      locations: [...data.locations],
    }))
    .sort((a, b) => b.count - a.count);

  // Cable statistics
  let estimatedCableMetres = 0;
  let confirmedCableMetres = 0;
  let unknownCableCount = 0;
  for (const cable of cables) {
    if (cable.lengthMode === "confirmed" && cable.lengthMetres) {
      confirmedCableMetres += cable.lengthMetres;
    } else if (cable.lengthMode === "estimated" && cable.lengthMetres) {
      estimatedCableMetres += cable.lengthMetres;
    } else {
      unknownCableCount += 1;
    }
  }

  // Third-party device count
  const thirdPartyDevices = topology.devices.filter((d) => d.thirdParty).length;

  // Installation details — confirmed on site, not during discovery. Only the
  // presence of projector / rack / network equipment changes the list.
  const hasProjector = topology.devices.some((device) => /projector/i.test(device.name));
  const hasRack = topology.locations.some(
    (loc) => loc.type === "room-rack" || loc.type === "central-rack",
  );
  const networkDependent = topology.connections.some(
    (conn) =>
      conn.transport === "ip-av-vlan" ||
      conn.transport === "shared-ip-network" ||
      conn.transport === "point-to-point-network" ||
      conn.services.includes("ethernet"),
  );

  const installItems: SurveyInstallItem[] = [
    {
      id: "display-mount-height",
      label: "Display mounting height and position",
      hint: "Confirm centre-line height, tilt and the wall position for each display.",
    },
    {
      id: "cable-containment",
      label: "Cable containment and route",
      hint: "Confirm trunking, floor boxes, ceiling runs and access points for each cable.",
    },
    {
      id: "power-at-position",
      label: "Power outlet at each equipment position",
      hint: "Confirm the circuit, outlet type and whether the local PSU budget covers the equipment there.",
    },
    {
      id: "mounting-hardware",
      label: "Mounting hardware and fixing surface",
      hint: "Confirm brackets, rack units and whether the wall/ceiling surface supports the equipment.",
    },
    ...(hasProjector
      ? [{
          id: "projector-position",
          label: "Projector position and mounting",
          hint: "Confirm throw distance, mount type, lens shift and power at the projector position.",
        } as SurveyInstallItem]
      : []),
    ...(hasRack
      ? [{
          id: "rack-position",
          label: "Equipment rack position and rack space",
          hint: "Confirm rack location, rack-unit allocation and ventilation for each rack.",
        } as SurveyInstallItem]
      : []),
    ...(networkDependent
      ? [{
          id: "network-point",
          label: "Network point at each equipment position",
          hint: "Confirm the physical drop, switch port and VLAN assignment with IT.",
        } as SurveyInstallItem]
      : []),
  ];

  return {
    projectId: project.id,
    projectName: project.name || "Untitled Project",
    customer: getString("clientName") || project.owner || "",
    site: getString("siteName") || "",
    generatedAt: new Date().toISOString(),
    locations,
    cables,
    portSummary,
    installItems,
    totalDevices: topology.devices.length,
    totalCables: topology.connections.length,
    estimatedCableMetres,
    confirmedCableMetres,
    unknownCableCount,
    thirdPartyDevices,
  };
}

/* ──────────────────────────────────────────────
   Generate printable HTML
   ────────────────────────────────────────────── */

export function generateSiteSurveyHtml(checklist: SurveyChecklist): string {
  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return iso;
    }
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Site Survey Checklist — ${escapeHtml(checklist.projectName)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11pt; color: #1a1a1a; line-height: 1.4; padding: 20mm; }
    h1 { font-size: 18pt; margin-bottom: 4pt; }
    .subtitle { font-size: 10pt; color: #666; margin-bottom: 16pt; }
    .meta { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8pt; margin-bottom: 16pt; padding: 8pt; background: #f5f5f5; border-radius: 4pt; }
    .meta-item { font-size: 9pt; }
    .meta-label { font-weight: 600; color: #333; }
    .meta-value { color: #1a1a1a; }
    h2 { font-size: 13pt; margin: 16pt 0 8pt; padding-bottom: 4pt; border-bottom: 1px solid #ddd; }
    h3 { font-size: 11pt; margin: 12pt 0 6pt; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 12pt; font-size: 9pt; }
    th { background: #1a1a2e; color: white; padding: 6pt 8pt; text-align: left; font-weight: 600; }
    td { padding: 5pt 8pt; border-bottom: 1px solid #e0e0e0; vertical-align: top; }
    tr:nth-child(even) { background: #fafafa; }
    .checkbox { width: 14pt; height: 14pt; border: 1px solid #999; display: inline-block; border-radius: 2pt; vertical-align: middle; margin-right: 4pt; }
    .status-confirmed { color: #16a34a; font-weight: 600; }
    .status-estimated { color: #d97706; font-weight: 600; }
    .status-unknown { color: #dc2626; font-weight: 600; }
    .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8pt; margin-bottom: 16pt; }
    .summary-card { padding: 8pt; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 4pt; text-align: center; }
    .summary-number { font-size: 20pt; font-weight: 700; color: #0369a1; }
    .summary-label { font-size: 8pt; color: #666; text-transform: uppercase; }
    .notes-box { border: 1px solid #ddd; border-radius: 4pt; padding: 8pt; min-height: 60pt; margin-bottom: 8pt; background: #fefce8; }
    .footer { margin-top: 24pt; padding-top: 8pt; border-top: 1px solid #ddd; font-size: 8pt; color: #999; text-align: center; }
    .qr-section { display: flex; align-items: center; gap: 16pt; margin: 16pt 0; padding: 12pt; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 6pt; }
    .qr-code { flex-shrink: 0; }
    .qr-code svg { border: 1px solid #ddd; border-radius: 4pt; }
    .qr-text { font-size: 9pt; line-height: 1.5; }
    .qr-text strong { font-size: 10pt; color: #1a1a2e; }
    .qr-url { font-size: 7pt; color: #666; word-break: break-all; }
    @media print { body { padding: 15mm; } .no-print { display: none; } }
  </style>
</head>
<body>
  <h1>Site Survey Checklist</h1>
  <p class="subtitle">WyreStorm Wingman — Pre-Installation Verification</p>

  <div class="meta">
    <div class="meta-item"><span class="meta-label">Project:</span> <span class="meta-value">${escapeHtml(checklist.projectName)}</span></div>
    <div class="meta-item"><span class="meta-label">Customer:</span> <span class="meta-value">${escapeHtml(checklist.customer || "Not specified")}</span></div>
    <div class="meta-item"><span class="meta-label">Site:</span> <span class="meta-value">${escapeHtml(checklist.site || "Not specified")}</span></div>
    <div class="meta-item"><span class="meta-label">Generated:</span> <span class="meta-value">${formatDate(checklist.generatedAt)}</span></div>
    <div class="meta-item"><span class="meta-label">Total Devices:</span> <span class="meta-value">${checklist.totalDevices}</span></div>
    <div class="meta-item"><span class="meta-label">Total Cables:</span> <span class="meta-value">${checklist.totalCables}</span></div>
  </div>

  <div class="summary-grid">
    <div class="summary-card">
      <div class="summary-number">${checklist.locations.length}</div>
      <div class="summary-label">Locations</div>
    </div>
    <div class="summary-card">
      <div class="summary-number">${checklist.totalDevices}</div>
      <div class="summary-label">Devices</div>
    </div>
    <div class="summary-card">
      <div class="summary-number">${checklist.totalCables}</div>
      <div class="summary-label">Cable Runs</div>
    </div>
  </div>

  <!-- Port Summary -->
  <h2>Port Summary by Transport</h2>
  <table>
    <thead>
      <tr><th>Transport</th><th>Count</th><th>Locations</th><th class="no-print" style="width:80pt">Verified</th></tr>
    </thead>
    <tbody>
      ${checklist.portSummary.map((p) => `
        <tr>
          <td>${escapeHtml(p.transport)}</td>
          <td>${p.count}</td>
          <td>${escapeHtml(p.locations.join(", "))}</td>
          <td class="no-print"><span class="checkbox"></span></td>
        </tr>
      `).join("")}
      ${checklist.portSummary.length === 0 ? '<tr><td colspan="4" style="text-align:center;color:#999;">No cable runs recorded in topology</td></tr>' : ""}
    </tbody>
  </table>

  <!-- Locations & Equipment -->
  <h2>Locations & Equipment Positions</h2>
  ${checklist.locations.map((loc) => `
    <h3>${escapeHtml(loc.name)}</h3>
    ${loc.devices.length > 0 ? `
      <table>
        <thead>
          <tr><th>Device</th><th>Category</th><th>SKU</th><th>Qty</th><th>Ports</th><th>Status</th><th class="no-print" style="width:80pt">On-site</th></tr>
        </thead>
        <tbody>
          ${loc.devices.map((d) => `
            <tr>
              <td>${escapeHtml(d.name)}${d.thirdParty ? ' <em style="color:#999;">(3rd party)</em>' : ""}</td>
              <td>${escapeHtml(d.category)}</td>
              <td>${escapeHtml(d.sku ?? "—")}</td>
              <td>${d.quantity}</td>
              <td>${d.ports.length > 0 ? escapeHtml(d.ports.join(", ")) : '<span style="color:#999;">—</span>'}</td>
              <td class="status-${d.status}">${d.status}</td>
              <td class="no-print"><span class="checkbox"></span></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    ` : '<p style="font-size:9pt;color:#999;margin-bottom:8pt;">No devices at this location.</p>'}
    ${loc.notes ? `<p style="font-size:9pt;color:#666;margin-bottom:8pt;"><strong>Notes:</strong> ${escapeHtml(loc.notes)}</p>` : ""}
    <div class="notes-box no-print" style="margin-bottom:12pt;"><strong>Integrator notes:</strong></div>
  `).join("")}

  <!-- Cable Runs -->
  <h2>Cable Runs</h2>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>From</th>
        <th>To</th>
        <th>Transport</th>
        <th>Services</th>
        <th>Length</th>
        <th>Mode</th>
        <th class="no-print" style="width:50pt">Actual (m)</th>
        <th class="no-print" style="width:60pt">Confirmed</th>
      </tr>
    </thead>
    <tbody>
      ${checklist.cables.map((c, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${escapeHtml(c.fromDevice)}<br/><small style="color:#999;">${escapeHtml(c.fromLocation)}</small></td>
          <td>${escapeHtml(c.toDevice)}<br/><small style="color:#999;">${escapeHtml(c.toLocation)}</small></td>
          <td>${escapeHtml(c.transport)}</td>
          <td>${escapeHtml(c.services.join(", "))}</td>
          <td>${c.lengthMetres ? `${c.lengthMetres}m` : '<span style="color:#999;">TBC</span>'}</td>
          <td class="status-${c.lengthMode}">${c.lengthMode}${c.estimateReason ? `<br/><small style="color:#999;">${escapeHtml(c.estimateReason)}</small>` : ""}</td>
          <td class="no-print" style="border-bottom:1px solid #ccc;"><div style="min-height:20pt;"></div></td>
          <td class="no-print"><span class="checkbox"></span></td>
        </tr>
      `).join("")}
      ${checklist.cables.length === 0 ? '<tr><td colspan="9" style="text-align:center;color:#999;">No cable runs recorded in topology</td></tr>' : ""}
    </tbody>
  </table>

  <!-- Cable Statistics -->
  <div class="summary-grid">
    <div class="summary-card">
      <div class="summary-number">${checklist.confirmedCableMetres}m</div>
      <div class="summary-label">Confirmed Length</div>
    </div>
    <div class="summary-card">
      <div class="summary-number">${checklist.estimatedCableMetres}m</div>
      <div class="summary-label">Estimated Length</div>
    </div>
    <div class="summary-card">
      <div class="summary-number">${checklist.unknownCableCount}</div>
      <div class="summary-label">Length TBC</div>
    </div>
  </div>

  <!-- Installation Details -->
  <h2>Installation Details</h2>
  <p style="font-size:9pt;color:#555;margin-bottom:8pt;">These items are confirmed on site during the survey, not during discovery — they do not change the WyreStorm hardware selection but are required before installation.</p>
  <table>
    <thead>
      <tr><th>Item</th><th>Applies to</th><th>Guidance</th><th class="no-print" style="width:70pt">Confirmed</th></tr>
    </thead>
    <tbody>
      ${(checklist.installItems ?? []).map((item) => `
        <tr>
          <td>${escapeHtml(item.label)}</td>
          <td>${escapeHtml(item.appliesTo ?? "All positions")}</td>
          <td style="font-size:8.5pt;color:#555;">${escapeHtml(item.hint)}</td>
          <td class="no-print"><span class="checkbox"></span></td>
        </tr>
      `).join("")}
      ${(checklist.installItems ?? []).length === 0 ? '<tr><td colspan="4" style="text-align:center;color:#999;">No installation-detail items generated — add a topology to plan the survey.</td></tr>' : ""}
    </tbody>
  </table>

  <!-- Surveyor Notes -->
  <h2>Surveyor Notes</h2>
  <div class="notes-box"><strong>General observations:</strong></div>
  <div class="notes-box"><strong>Access & logistics:</strong></div>
  <div class="notes-box"><strong>Power availability:</strong></div>
  <div class="notes-box"><strong>Network infrastructure:</strong></div>
  <div class="notes-box"><strong>Issues / risks:</strong></div>

  <div class="qr-section">
    <div class="qr-code">
      ${generateQrCodeSvg(generateTopologyUrl(checklist.projectId), 100, 4)}
    </div>
    <div class="qr-text">
      <strong>Scan to update topology</strong><br/>
      <span>Open the digital checklist on your phone to update cable lengths and verify equipment on-site.</span><br/>
      <span class="qr-url">${escapeHtml(generateTopologyUrl(checklist.projectId))}</span>
    </div>
  </div>

  <div class="footer">
    Generated by WyreStorm Wingman — ${formatDate(checklist.generatedAt)} — Best-efforts planning document. Verify all specifications on-site.
  </div>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ──────────────────────────────────────────────
   Export / print
   ────────────────────────────────────────────── */

export function printSiteSurveyChecklist(checklist: SurveyChecklist): void {
  const html = generateSiteSurveyHtml(checklist);
  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (!printWindow) {
    throw new Error("Pop-up blocked. Allow pop-ups for this site to print the site survey.");
  }
  printWindow.document.write(html);
  printWindow.document.close();
  // Short delay to ensure rendering before print
  setTimeout(() => {
    printWindow.print();
  }, 300);
}

export function downloadSiteSurveyHtml(checklist: SurveyChecklist): void {
  const html = generateSiteSurveyHtml(checklist);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `site-survey-${checklist.projectName.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
