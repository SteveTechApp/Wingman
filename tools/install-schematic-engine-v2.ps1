Set-Location C:\Users\steve\wingman
$ErrorActionPreference = "Stop"

function Save-Utf8NoBom {
  param(
    [Parameter(Mandatory = $true)][string]$RelativePath,
    [Parameter(Mandatory = $true)][string]$Content
  )

  $root = (Get-Location).Path
  $fullPath = Join-Path $root $RelativePath
  $dir = Split-Path $fullPath -Parent

  if ($dir -and -not (Test-Path $dir)) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
  }

  $rescueRoot = Join-Path $root "_RESCUE"
  if (-not (Test-Path $rescueRoot)) {
    New-Item -ItemType Directory -Force -Path $rescueRoot | Out-Null
  }

  if (Test-Path $fullPath) {
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $safeName = $RelativePath -replace '[\\/:*?"<>|]', '_'
    Copy-Item $fullPath (Join-Path $rescueRoot "$safeName.$stamp.bak") -Force
  }

  $utf8 = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($fullPath, $Content, $utf8)
  Write-Host "Written:" $fullPath -ForegroundColor Green
}

$tsx = @'
import { useMemo, useState } from "react";
import "./DashboardArchitectureCanvas.css";

type ArchitectureMode = "matrix" | "avoip" | "video-wall";
type DeviceKind = "sources" | "switch" | "core" | "rx" | "display" | "audio" | "control";
type PortSide = "left" | "right" | "top" | "bottom";
type LinkTone = "video" | "network" | "audio" | "control" | "warn";

export type DashboardArchitectureCanvasProps = {
  title?: string;
  mode?: ArchitectureMode;
  sourceCount?: number;
  displayCount?: number;
  distanceLabel?: string;
  primarySku?: string;
  secondarySku?: string;
  status?: string;
};

type PortDef = {
  id: string;
  side: PortSide;
  offset: number;
  label: string;
};

type DeviceDef = {
  id: string;
  kind: DeviceKind;
  x: number;
  y: number;
  w: number;
  h: number;
  eyebrow: string;
  title: string;
  meta: string;
  badges?: string[];
  inspector: {
    summary: string;
    stats: Array<{ label: string; value: string }>;
    notes: string[];
  };
  ports: PortDef[];
};

type LinkDef = {
  id: string;
  from: { deviceId: string; portId: string };
  to: { deviceId: string; portId: string };
  tone: LinkTone;
  label: string;
  status: "ok" | "warn";
};

const VIEWBOX_WIDTH = 1600;
const VIEWBOX_HEIGHT = 900;

function modeLabel(mode: ArchitectureMode) {
  if (mode === "avoip") return "AVoIP";
  if (mode === "matrix") return "Matrix";
  return "Video Wall";
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function deviceRect(device: DeviceDef) {
  return {
    x: (device.x / 100) * VIEWBOX_WIDTH,
    y: (device.y / 100) * VIEWBOX_HEIGHT,
    w: (device.w / 100) * VIEWBOX_WIDTH,
    h: (device.h / 100) * VIEWBOX_HEIGHT,
  };
}

function getPortPoint(device: DeviceDef, port: PortDef) {
  const rect = deviceRect(device);
  const ox = clamp(port.offset, 0, 1);

  switch (port.side) {
    case "left":
      return { x: rect.x, y: rect.y + rect.h * ox };
    case "right":
      return { x: rect.x + rect.w, y: rect.y + rect.h * ox };
    case "top":
      return { x: rect.x + rect.w * ox, y: rect.y };
    case "bottom":
      return { x: rect.x + rect.w * ox, y: rect.y + rect.h };
  }
}

function orthogonalPath(
  start: { x: number; y: number },
  end: { x: number; y: number },
  tone: LinkTone,
) {
  const midX = (start.x + end.x) / 2;
  const offset = tone === "audio" ? 28 : tone === "control" ? -28 : 0;
  return [
    `M ${start.x} ${start.y}`,
    `L ${midX + offset} ${start.y}`,
    `L ${midX + offset} ${end.y}`,
    `L ${end.x} ${end.y}`,
  ].join(" ");
}

function buildDevices(
  sourceCount: number,
  displayCount: number,
  primarySku: string,
  secondarySku: string,
): DeviceDef[] {
  return [
    {
      id: "sources",
      kind: "sources",
      x: 4,
      y: 24,
      w: 17,
      h: 20,
      eyebrow: "Video sources",
      title: `Sources (${sourceCount})`,
      meta: "Blu-ray players, presentation PC, local HDMI inputs",
      badges: ["HDMI", "USB-C"],
      inspector: {
        summary: "Grouped source estate feeding the transport layer.",
        stats: [
          { label: "Active inputs", value: String(sourceCount) },
          { label: "Primary format", value: "4K60" },
          { label: "Signal type", value: "HDMI" },
        ],
        notes: [
          "Best suited when multiple user devices must be normalized into one transport workflow.",
          "Use this block to sanity-check how many concurrent source feeds are really required.",
        ],
      },
      ports: [
        { id: "out-a", side: "right", offset: 0.36, label: "Source video out" },
        { id: "out-b", side: "right", offset: 0.68, label: "Source aux out" },
      ],
    },
    {
      id: "switch",
      kind: "switch",
      x: 28,
      y: 24,
      w: 20,
      h: 18,
      eyebrow: "Core network switch",
      title: "AVoIP Network Switch",
      meta: "Managed switch for multicast, transport, and endpoint control",
      badges: ["LAN", "QoS"],
      inspector: {
        summary: "Distribution core for multicast and endpoint traffic.",
        stats: [
          { label: "Role", value: "Core switch" },
          { label: "Traffic", value: "AV + Control" },
          { label: "Readiness", value: "Managed" },
        ],
        notes: [
          "Confirm multicast handling and uplink budget before final BOM lock.",
          "This is the first place to inspect if the design grows beyond a simple room system.",
        ],
      },
      ports: [
        { id: "in-left", side: "left", offset: 0.5, label: "Uplink in" },
        { id: "to-core", side: "bottom", offset: 0.5, label: "Downlink to transport core" },
        { id: "to-display", side: "right", offset: 0.5, label: "Display network out" },
      ],
    },
    {
      id: "core",
      kind: "core",
      x: 24,
      y: 52,
      w: 30,
      h: 18,
      eyebrow: "AV transport core",
      title: primarySku,
      meta: "Encoding, decoding, switching, and routed AV transport",
      badges: ["LAN", "HDMI", "Control"],
      inspector: {
        summary: "Primary AV transport and routing decision point.",
        stats: [
          { label: "Mode", value: "AVoIP core" },
          { label: "Distance", value: "50m validated" },
          { label: "Status", value: "Proposal ready" },
        ],
        notes: [
          "This is the main recommendation block to explain to the customer.",
          "Use this panel to justify why the architecture is scalable versus direct extension.",
        ],
      },
      ports: [
        { id: "video-in", side: "left", offset: 0.42, label: "Video in" },
        { id: "network-in", side: "top", offset: 0.5, label: "Network in" },
        { id: "rx-out", side: "right", offset: 0.45, label: "RX out" },
        { id: "audio-out", side: "bottom", offset: 0.68, label: "Audio out" },
        { id: "control-out", side: "bottom", offset: 0.34, label: "Control out" },
      ],
    },
    {
      id: "rx",
      kind: "rx",
      x: 63,
      y: 52,
      w: 14,
      h: 14,
      eyebrow: "Receiver layer",
      title: "AVoIP Receivers",
      meta: "Decoding and local display handoff",
      badges: ["LAN", "HDMI"],
      inspector: {
        summary: "Endpoint receiver layer feeding displays.",
        stats: [
          { label: "Endpoints", value: String(displayCount) },
          { label: "Output", value: "HDMI" },
          { label: "Scaling", value: "Local" },
        ],
        notes: [
          "Use this layer to explain how each display receives the selected stream.",
          "Receivers are the cleanest place to discuss endpoint quantity and local handoff.",
        ],
      },
      ports: [
        { id: "network-in", side: "left", offset: 0.5, label: "Network in" },
        { id: "display-out", side: "right", offset: 0.5, label: "Display out" },
      ],
    },
    {
      id: "displays",
      kind: "display",
      x: 80,
      y: 24,
      w: 16,
      h: 24,
      eyebrow: "Display estate",
      title: `Displays (${displayCount})`,
      meta: "Main displays, signage endpoints, wall outputs",
      badges: ["HDMI", "AVoIP"],
      inspector: {
        summary: "Display estate for presentation, signage, or wall outputs.",
        stats: [
          { label: "Displays", value: String(displayCount) },
          { label: "Delivery", value: "Decoded HDMI" },
          { label: "Application", value: "Mixed output" },
        ],
        notes: [
          "This is where the customer usually understands the architecture outcome fastest.",
          "Use display grouping to discuss whether every screen needs the same source or independent routing.",
        ],
      },
      ports: [{ id: "in", side: "left", offset: 0.56, label: "Display in" }],
    },
    {
      id: "control",
      kind: "control",
      x: 28,
      y: 79,
      w: 18,
      h: 12,
      eyebrow: "Control layer",
      title: secondarySku,
      meta: "Automation, presets, routing recall, system control",
      badges: ["LAN", "RS-232", "IR"],
      inspector: {
        summary: "Control and recall layer for user workflow.",
        stats: [
          { label: "Role", value: "Automation" },
          { label: "Control paths", value: "LAN / RS-232" },
          { label: "Use case", value: "Preset recall" },
        ],
        notes: [
          "Use this layer to explain how the customer gets a simple user experience.",
          "Control usually becomes more valuable as the system grows in endpoint count.",
        ],
      },
      ports: [{ id: "in", side: "top", offset: 0.5, label: "Control uplink" }],
    },
    {
      id: "audio",
      kind: "audio",
      x: 56,
      y: 79,
      w: 18,
      h: 12,
      eyebrow: "Audio DSP",
      title: "AMP-240-DNT",
      meta: "De-embedding, DSP, breakout, speaker feed",
      badges: ["Audio Out", "Line"],
      inspector: {
        summary: "Audio breakout and local amplification stage.",
        stats: [
          { label: "Function", value: "Audio extract" },
          { label: "Output", value: "Speaker feed" },
          { label: "Integration", value: "Linked to core" },
        ],
        notes: [
          "This block is useful when the customer expects separate local audio handling.",
          "It also helps explain why the system can remain modular instead of monolithic.",
        ],
      },
      ports: [
        { id: "audio-in", side: "top", offset: 0.5, label: "Audio in" },
        { id: "control-in", side: "left", offset: 0.62, label: "Control in" },
      ],
    },
  ];
}

function buildLinks(): LinkDef[] {
  return [
    {
      id: "sources-to-switch",
      from: { deviceId: "sources", portId: "out-a" },
      to: { deviceId: "switch", portId: "in-left" },
      tone: "network",
      label: "Source uplink",
      status: "ok",
    },
    {
      id: "sources-to-core",
      from: { deviceId: "sources", portId: "out-b" },
      to: { deviceId: "core", portId: "video-in" },
      tone: "warn",
      label: "Direct video handoff",
      status: "warn",
    },
    {
      id: "switch-to-core",
      from: { deviceId: "switch", portId: "to-core" },
      to: { deviceId: "core", portId: "network-in" },
      tone: "network",
      label: "Core network feed",
      status: "ok",
    },
    {
      id: "switch-to-displays",
      from: { deviceId: "switch", portId: "to-display" },
      to: { deviceId: "displays", portId: "in" },
      tone: "network",
      label: "Display distribution",
      status: "ok",
    },
    {
      id: "core-to-rx",
      from: { deviceId: "core", portId: "rx-out" },
      to: { deviceId: "rx", portId: "network-in" },
      tone: "video",
      label: "AV stream out",
      status: "ok",
    },
    {
      id: "rx-to-displays",
      from: { deviceId: "rx", portId: "display-out" },
      to: { deviceId: "displays", portId: "in" },
      tone: "video",
      label: "Decoded HDMI to displays",
      status: "ok",
    },
    {
      id: "core-to-control",
      from: { deviceId: "core", portId: "control-out" },
      to: { deviceId: "control", portId: "in" },
      tone: "control",
      label: "Control handoff",
      status: "ok",
    },
    {
      id: "core-to-audio",
      from: { deviceId: "core", portId: "audio-out" },
      to: { deviceId: "audio", portId: "audio-in" },
      tone: "audio",
      label: "Audio breakout",
      status: "ok",
    },
    {
      id: "control-to-audio",
      from: { deviceId: "control", portId: "in" },
      to: { deviceId: "audio", portId: "control-in" },
      tone: "control",
      label: "Control sync",
      status: "ok",
    },
  ];
}

function validationForLink(link: LinkDef) {
  if (link.status === "warn") {
    return {
      state: "warn" as const,
      title: "Design warning",
      detail: "Direct path should be checked against final transport strategy before BOM lock.",
    };
  }

  return {
    state: "ok" as const,
    title: "Validated path",
    detail: "Signal route aligns with the current topology and recommendation.",
  };
}

function DeviceArt({ kind }: { kind: DeviceKind }) {
  if (kind === "display") {
    return (
      <div className="se-device-art se-device-art--display" aria-hidden="true">
        <div className="se-display-grid">
          <div className="se-display-grid__screen" />
          <div className="se-display-grid__screen" />
          <div className="se-display-grid__screen" />
          <div className="se-display-grid__screen" />
        </div>
      </div>
    );
  }

  if (kind === "control") {
    return (
      <div className="se-device-art se-device-art--control" aria-hidden="true">
        <div className="se-touch-panel">
          <div className="se-touch-panel__ui" />
        </div>
      </div>
    );
  }

  if (kind === "audio") {
    return (
      <div className="se-device-art se-device-art--audio" aria-hidden="true">
        <div className="se-rack se-rack--audio">
          <div className="se-rack__leds" />
          <div className="se-rack__grille" />
          <div className="se-rack__knob" />
        </div>
      </div>
    );
  }

  return (
    <div className="se-device-art" aria-hidden="true">
      <div className={`se-rack ${kind === "sources" ? "se-rack--compact" : ""}`}>
        <div className="se-rack__leds" />
        <div className="se-rack__screen" />
        <div className="se-rack__ports" />
      </div>
    </div>
  );
}

function DeviceNode({
  device,
  active,
  dimmed,
  onSelect,
}: {
  device: DeviceDef;
  active: boolean;
  dimmed: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <article
      className={`se-node se-node--${device.kind}${active ? " is-active" : ""}${dimmed ? " is-dimmed" : ""}`}
      style={{
        left: `${device.x}%`,
        top: `${device.y}%`,
        width: `${device.w}%`,
        height: `${device.h}%`,
      }}
      onClick={() => onSelect(device.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(device.id);
        }
      }}
    >
      <DeviceArt kind={device.kind} />

      <div className="se-node__eyebrow">{device.eyebrow}</div>
      <h4 className="se-node__title">{device.title}</h4>
      <p className="se-node__meta">{device.meta}</p>

      {device.badges?.length ? (
        <div className="se-node__badges">
          {device.badges.map((badge) => (
            <span key={badge} className="se-node__badge">
              {badge}
            </span>
          ))}
        </div>
      ) : null}
    </article>
  );
}

export default function DashboardArchitectureCanvas({
  title = "AVoIP Network Layout",
  mode = "avoip",
  sourceCount = 4,
  displayCount = 6,
  distanceLabel = "50m validated",
  primarySku = "NHD-400-TX / RX",
  secondarySku = "NHD-CTL-PRO",
  status = "Ready for proposal",
}: DashboardArchitectureCanvasProps) {
  const devices = useMemo(
    () => buildDevices(sourceCount, displayCount, primarySku, secondarySku),
    [sourceCount, displayCount, primarySku, secondarySku],
  );
  const links = useMemo(() => buildLinks(), []);

  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("core");
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);

  const deviceMap = useMemo(
    () => Object.fromEntries(devices.map((d) => [d.id, d])),
    [devices],
  );

  const resolvedLinks = useMemo(() => {
    return links
      .map((link) => {
        const fromDevice = deviceMap[link.from.deviceId];
        const toDevice = deviceMap[link.to.deviceId];
        if (!fromDevice || !toDevice) return null;

        const fromPort = fromDevice.ports.find((p) => p.id === link.from.portId);
        const toPort = toDevice.ports.find((p) => p.id === link.to.portId);
        if (!fromPort || !toPort) return null;

        const start = getPortPoint(fromDevice, fromPort);
        const end = getPortPoint(toDevice, toPort);

        return {
          ...link,
          start,
          end,
          path: orthogonalPath(start, end, link.tone),
        };
      })
      .filter(Boolean) as Array<
      LinkDef & {
        start: { x: number; y: number };
        end: { x: number; y: number };
        path: string;
      }
    >;
  }, [deviceMap, links]);

  const selectedDevice = deviceMap[selectedDeviceId] ?? devices[0];
  const selectedLink = resolvedLinks.find((link) => link.id === selectedLinkId) ?? null;

  function selectDevice(id: string) {
    setSelectedLinkId(null);
    setSelectedDeviceId(id);
  }

  function selectLink(id: string) {
    setSelectedLinkId(id);
  }

  return (
    <section className="se-shell">
      <header className="se-header">
        <div className="se-header__copy">
          <div className="se-header__eyebrow">{title}</div>
          <h3 className="se-header__title">Recommended: AVoIP Network Configuration</h3>
        </div>

        <div className="se-header__meta">
          <span className={`se-pill se-pill--mode se-pill--${mode}`}>{modeLabel(mode)}</span>
          <span className="se-pill">{distanceLabel}</span>
          <span className="se-pill se-pill--ok">{status}</span>
        </div>
      </header>

      <div className="se-workspace">
        <div className="se-board">
          <svg
            className="se-board__routes"
            viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {resolvedLinks.map((link) => {
              const active = selectedLinkId === link.id;
              const dimmed = selectedLinkId !== null && !active;
              return (
                <g key={link.id}>
                  <path
                    className={`se-route se-route--${link.tone}${active ? " is-active" : ""}${dimmed ? " is-dimmed" : ""}`}
                    d={link.path}
                    onClick={() => selectLink(link.id)}
                  />
                  <circle
                    className={`se-route-dot se-route-dot--${link.tone}${active ? " is-active" : ""}${dimmed ? " is-dimmed" : ""}`}
                    cx={link.start.x}
                    cy={link.start.y}
                    r="5"
                  />
                  <circle
                    className={`se-route-dot se-route-dot--${link.tone}${active ? " is-active" : ""}${dimmed ? " is-dimmed" : ""}`}
                    cx={link.end.x}
                    cy={link.end.y}
                    r="5"
                  />
                </g>
              );
            })}
          </svg>

          <div className="se-board__grid">
            {devices.map((device) => (
              <DeviceNode
                key={device.id}
                device={device}
                active={selectedDeviceId === device.id && selectedLinkId === null}
                dimmed={selectedDeviceId !== device.id && selectedLinkId === null && !!selectedDeviceId}
                onSelect={selectDevice}
              />
            ))}
          </div>
        </div>

        <aside className="se-inspector">
          {selectedLink ? (
            <>
              <div className="se-inspector__eyebrow">Route inspector</div>
              <h4 className="se-inspector__title">{selectedLink.label}</h4>
              <p className="se-inspector__summary">
                {validationForLink(selectedLink).detail}
              </p>

              <div className="se-inspector__stats">
                <div className="se-stat">
                  <span>Status</span>
                  <strong>{validationForLink(selectedLink).state === "warn" ? "Warning" : "OK"}</strong>
                </div>
                <div className="se-stat">
                  <span>From</span>
                  <strong>{deviceMap[selectedLink.from.deviceId]?.title}</strong>
                </div>
                <div className="se-stat">
                  <span>To</span>
                  <strong>{deviceMap[selectedLink.to.deviceId]?.title}</strong>
                </div>
              </div>

              <div className={`se-validation se-validation--${validationForLink(selectedLink).state}`}>
                <strong>{validationForLink(selectedLink).title}</strong>
                <p>{validationForLink(selectedLink).detail}</p>
              </div>
            </>
          ) : (
            <>
              <div className="se-inspector__eyebrow">System inspector</div>
              <h4 className="se-inspector__title">{selectedDevice.title}</h4>
              <p className="se-inspector__summary">{selectedDevice.inspector.summary}</p>

              <div className="se-inspector__stats">
                {selectedDevice.inspector.stats.map((item) => (
                  <div key={item.label} className="se-stat">
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>

              <div className="se-inspector__notes">
                {selectedDevice.inspector.notes.map((note) => (
                  <div key={note} className="se-note">
                    {note}
                  </div>
                ))}
              </div>
            </>
          )}
        </aside>
      </div>

      <footer className="se-footer">
        <button type="button" className="se-button se-button--primary">
          Generate Bill of Materials
        </button>
      </footer>
    </section>
  );
}
'@

$css = @'
.se-shell {
  display: grid;
  gap: 16px;
  width: 100%;
  min-height: 680px;
  color: #eaf1ff;
}

.se-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.se-header__copy {
  display: grid;
  gap: 6px;
}

.se-header__eyebrow {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #7fb2ff;
}

.se-header__title {
  margin: 0;
  font-size: 28px;
  line-height: 1.05;
  letter-spacing: -0.04em;
  color: #f8fbff;
}

.se-header__meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.se-pill {
  min-height: 28px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
  display: inline-flex;
  align-items: center;
  font-size: 12px;
  font-weight: 800;
  color: #dfeaff;
}

.se-pill--ok {
  border-color: rgba(16, 185, 129, 0.22);
  background: rgba(16, 185, 129, 0.12);
  color: #b7f5d5;
}

.se-pill--mode.se-pill--avoip {
  border-color: rgba(59, 130, 246, 0.22);
  background: rgba(59, 130, 246, 0.12);
}

.se-pill--mode.se-pill--matrix {
  border-color: rgba(99, 102, 241, 0.22);
  background: rgba(99, 102, 241, 0.12);
}

.se-pill--mode.se-pill--video-wall {
  border-color: rgba(168, 85, 247, 0.22);
  background: rgba(168, 85, 247, 0.12);
}

.se-workspace {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 16px;
  align-items: stretch;
}

.se-board {
  position: relative;
  min-height: 640px;
  width: 100%;
  border-radius: 26px;
  border: 1px solid rgba(255, 255, 255, 0.07);
  background:
    radial-gradient(circle at 28% 22%, rgba(37, 99, 235, 0.12), transparent 22%),
    radial-gradient(circle at 78% 24%, rgba(124, 58, 237, 0.1), transparent 22%),
    linear-gradient(180deg, rgba(6, 13, 26, 0.96), rgba(3, 9, 21, 0.99));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.03),
    0 20px 40px rgba(0, 0, 0, 0.22);
  overflow: hidden;
}

.se-board::before {
  content: "";
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255,255,255,0.022) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.022) 1px, transparent 1px);
  background-size: 28px 28px;
  opacity: 0.28;
  pointer-events: none;
}

.se-board__routes {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

.se-route {
  fill: none;
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
  cursor: pointer;
  transition: opacity 140ms ease, stroke-width 140ms ease, filter 140ms ease;
}

.se-route.is-active {
  stroke-width: 4;
}

.se-route.is-dimmed,
.se-route-dot.is-dimmed {
  opacity: 0.18;
}

.se-route--video {
  stroke: #60a5fa;
  filter: drop-shadow(0 0 8px rgba(96, 165, 250, 0.34));
}

.se-route--network {
  stroke: #8b5cf6;
  filter: drop-shadow(0 0 8px rgba(139, 92, 246, 0.28));
}

.se-route--audio {
  stroke: #22c55e;
  filter: drop-shadow(0 0 8px rgba(34, 197, 94, 0.3));
}

.se-route--control {
  stroke: #22d3ee;
  filter: drop-shadow(0 0 8px rgba(34, 211, 238, 0.28));
}

.se-route--warn {
  stroke: #f59e0b;
  filter: drop-shadow(0 0 8px rgba(245, 158, 11, 0.3));
}

.se-route-dot {
  transition: opacity 140ms ease, r 140ms ease;
}

.se-route-dot.is-active {
  r: 6;
}

.se-route-dot--video { fill: #93c5fd; }
.se-route-dot--network { fill: #c4b5fd; }
.se-route-dot--audio { fill: #86efac; }
.se-route-dot--control { fill: #67e8f9; }
.se-route-dot--warn { fill: #fdba74; }

.se-board__grid {
  position: absolute;
  inset: 0;
  z-index: 2;
}

.se-node {
  position: absolute;
  display: grid;
  gap: 8px;
  padding: 14px;
  border-radius: 18px;
  border: 1px solid rgba(194, 208, 229, 0.14);
  background:
    linear-gradient(180deg, rgba(71, 81, 97, 0.9), rgba(23, 30, 39, 0.98)),
    linear-gradient(90deg, rgba(255,255,255,0.05), transparent 42%);
  box-shadow:
    0 14px 24px rgba(0,0,0,0.25),
    inset 0 1px 0 rgba(255,255,255,0.08),
    inset 0 -1px 0 rgba(0,0,0,0.36);
  backdrop-filter: blur(10px);
  cursor: pointer;
  transition: transform 140ms ease, opacity 140ms ease, box-shadow 140ms ease, border-color 140ms ease;
}

.se-node:hover {
  transform: translateY(-1px);
}

.se-node.is-active {
  border-color: rgba(96, 165, 250, 0.42);
  box-shadow:
    0 0 0 1px rgba(96, 165, 250, 0.18),
    0 18px 32px rgba(0,0,0,0.28),
    0 0 28px rgba(37, 99, 235, 0.18);
}

.se-node.is-dimmed {
  opacity: 0.34;
}

.se-node--sources,
.se-node--display {
  background:
    linear-gradient(180deg, rgba(67, 77, 94, 0.92), rgba(20, 27, 36, 0.98)),
    linear-gradient(90deg, rgba(255,255,255,0.05), transparent 42%);
}

.se-node__eyebrow {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #9bb7df;
}

.se-node__title {
  margin: 0;
  font-size: 18px;
  line-height: 1.05;
  color: #f8fbff;
  letter-spacing: -0.03em;
}

.se-node__meta {
  margin: 0;
  font-size: 13px;
  line-height: 1.45;
  color: #b7cae6;
}

.se-node__badges {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: auto;
}

.se-node__badge {
  min-height: 22px;
  padding: 0 8px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.07);
  background: rgba(255,255,255,0.04);
  display: inline-flex;
  align-items: center;
  font-size: 10px;
  font-weight: 800;
  color: #dce8ff;
}

.se-device-art {
  display: grid;
  place-items: center;
  margin-bottom: 4px;
}

.se-rack {
  position: relative;
  width: 100%;
  height: 42px;
  border-radius: 8px;
  background:
    linear-gradient(180deg, #626d7c 0%, #394351 42%, #202733 100%);
  border: 1px solid rgba(206, 218, 235, 0.14);
  box-shadow:
    0 10px 18px rgba(0,0,0,0.24),
    inset 0 1px 0 rgba(255,255,255,0.08);
  overflow: hidden;
}

.se-rack--compact {
  height: 34px;
}

.se-rack--audio {
  height: 36px;
}

.se-rack__leds {
  position: absolute;
  left: 10px;
  top: 50%;
  width: 34px;
  height: 8px;
  transform: translateY(-50%);
  background:
    radial-gradient(circle, #7dd3fc 0 26%, transparent 28%) 0 50% / 12px 8px repeat-x,
    radial-gradient(circle, #86efac 0 26%, transparent 28%) 6px 50% / 12px 8px repeat-x,
    radial-gradient(circle, #fdba74 0 26%, transparent 28%) 12px 50% / 12px 8px repeat-x;
}

.se-rack__screen {
  position: absolute;
  left: 56px;
  top: 50%;
  width: 46px;
  height: 12px;
  transform: translateY(-50%);
  border-radius: 3px;
  background: linear-gradient(180deg, #18416a, #0d1f34);
  box-shadow: inset 0 0 8px rgba(125, 211, 252, 0.14);
}

.se-rack__ports {
  position: absolute;
  right: 10px;
  top: 50%;
  width: 60px;
  height: 10px;
  transform: translateY(-50%);
  background:
    repeating-linear-gradient(
      90deg,
      rgba(226,232,240,0.22) 0,
      rgba(226,232,240,0.22) 5px,
      transparent 5px,
      transparent 9px
    );
}

.se-rack__grille {
  position: absolute;
  left: 58px;
  right: 30px;
  top: 50%;
  height: 10px;
  transform: translateY(-50%);
  background:
    repeating-linear-gradient(
      90deg,
      rgba(226,232,240,0.16) 0,
      rgba(226,232,240,0.16) 4px,
      transparent 4px,
      transparent 8px
    );
}

.se-rack__knob {
  position: absolute;
  right: 10px;
  top: 50%;
  width: 12px;
  height: 12px;
  transform: translateY(-50%);
  border-radius: 999px;
  background: radial-gradient(circle at 35% 35%, #d8e5f7, #64748b 70%, #1e293b 100%);
}

.se-touch-panel {
  width: 78px;
  height: 52px;
  border-radius: 10px;
  background:
    linear-gradient(180deg, #697586 0%, #2d3744 100%);
  box-shadow:
    0 10px 18px rgba(0,0,0,0.24),
    inset 0 1px 0 rgba(255,255,255,0.08);
  display: grid;
  place-items: center;
}

.se-touch-panel__ui {
  width: 56px;
  height: 32px;
  border-radius: 6px;
  background:
    radial-gradient(circle at 30% 30%, rgba(96,165,250,0.32), transparent 42%),
    linear-gradient(180deg, #1e3a5f, #0f172a);
}

.se-display-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  width: 100%;
}

.se-display-grid__screen {
  aspect-ratio: 1.45;
  border-radius: 8px;
  background:
    linear-gradient(180deg, rgba(67,77,92,0.96), rgba(24,30,39,1));
  box-shadow:
    0 8px 14px rgba(0,0,0,0.18),
    inset 0 1px 0 rgba(255,255,255,0.05);
  position: relative;
}

.se-display-grid__screen::before {
  content: "";
  position: absolute;
  inset: 4px;
  border-radius: 5px;
  background:
    radial-gradient(circle at 30% 30%, rgba(125,211,252,0.24), transparent 40%),
    linear-gradient(135deg, #173152, #08111f 55%, #1d4ed8);
}

.se-inspector {
  border-radius: 22px;
  border: 1px solid rgba(255,255,255,0.07);
  background:
    radial-gradient(circle at 82% 18%, rgba(56,189,248,0.08), transparent 26%),
    linear-gradient(180deg, rgba(8,13,25,0.96), rgba(4,8,18,0.99));
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.03),
    0 18px 34px rgba(0,0,0,0.22);
  padding: 18px;
  display: grid;
  align-content: start;
  gap: 14px;
}

.se-inspector__eyebrow {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #87b7ff;
}

.se-inspector__title {
  margin: 0;
  font-size: 22px;
  line-height: 1.05;
  color: #f8fbff;
  letter-spacing: -0.03em;
}

.se-inspector__summary {
  margin: 0;
  font-size: 14px;
  line-height: 1.55;
  color: #acc0db;
}

.se-inspector__stats {
  display: grid;
  gap: 10px;
}

.se-stat {
  padding: 12px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.06);
  background: rgba(255,255,255,0.03);
  display: grid;
  gap: 4px;
}

.se-stat span {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #8faad0;
}

.se-stat strong {
  font-size: 15px;
  color: #f4f8ff;
}

.se-inspector__notes {
  display: grid;
  gap: 10px;
}

.se-note {
  padding: 12px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.05);
  background: rgba(255,255,255,0.025);
  font-size: 13px;
  line-height: 1.5;
  color: #b8cbe5;
}

.se-validation {
  padding: 14px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.08);
  display: grid;
  gap: 6px;
}

.se-validation strong {
  color: #f8fbff;
}

.se-validation p {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
}

.se-validation--ok {
  border-color: rgba(16,185,129,0.18);
  background: rgba(16,185,129,0.08);
  color: #bbf7d0;
}

.se-validation--warn {
  border-color: rgba(245,158,11,0.2);
  background: rgba(245,158,11,0.08);
  color: #fde68a;
}

.se-footer {
  display: flex;
  justify-content: center;
}

.se-button {
  min-height: 46px;
  padding: 0 22px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.03);
  color: #eef5ff;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
}

.se-button--primary {
  border-color: rgba(59, 130, 246, 0.22);
  background: linear-gradient(180deg, #3b82f6 0%, #2563eb 100%);
  box-shadow: 0 14px 24px rgba(37, 99, 235, 0.22);
}

@media (max-width: 1320px) {
  .se-workspace {
    grid-template-columns: 1fr;
  }

  .se-inspector {
    order: -1;
  }
}

@media (max-width: 1200px) {
  .se-header {
    flex-direction: column;
  }

  .se-board {
    min-height: 780px;
  }
}
'@

Save-Utf8NoBom -RelativePath "src\features\dashboard\components\DashboardArchitectureCanvas.tsx" -Content $tsx
Save-Utf8NoBom -RelativePath "src\features\dashboard\components\DashboardArchitectureCanvas.css" -Content $css

npm run typecheck