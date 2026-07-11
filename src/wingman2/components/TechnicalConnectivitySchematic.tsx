import { useRef, useState } from "react";
import type {
  VisualDiagramEdge,
  VisualDiagramModel,
  VisualDiagramNode,
} from "../lib/visualStudioTypes";

interface TechnicalConnectivitySchematicProps {
  model: VisualDiagramModel;
}

type ConnectionFamily =
  | "video"
  | "usb"
  | "audio"
  | "network"
  | "control"
  | "unknown";

type DeviceRole =
  | "source"
  | "product"
  | "destination"
  | "service";

interface PositionedDevice {
  node: VisualDiagramNode;
  role: DeviceRole;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface RoutedConnection {
  edge: VisualDiagramEdge;
  source: PositionedDevice;
  target: PositionedDevice;
  family: ConnectionFamily;
  cableId: string;
  sourcePort: string;
  targetPort: string;
  sourcePoint: Point;
  targetPoint: Point;
  path: string;
  labelPoint: Point;
}

interface Point {
  x: number;
  y: number;
}

const CANVAS_WIDTH = 1600;
const CANVAS_HEIGHT = 900;

const PRODUCT_X = 630;
const PRODUCT_Y = 265;
const PRODUCT_WIDTH = 340;
const PRODUCT_HEIGHT = 230;

const EXTERNAL_WIDTH = 260;
const EXTERNAL_HEIGHT = 110;

const SERVICE_WIDTH = 250;
const SERVICE_HEIGHT = 102;

const signalStroke: Record<ConnectionFamily, string> = {
  video: "#2563eb",
  usb: "#7c3aed",
  audio: "#d97706",
  network: "#059669",
  control: "#64748b",
  unknown: "#475569",
};

const signalLabel: Record<ConnectionFamily, string> = {
  video: "VIDEO",
  usb: "USB",
  audio: "AUDIO",
  network: "NETWORK",
  control: "CONTROL",
  unknown: "SIGNAL",
};

function familyFromText(value = ""): ConnectionFamily {
  const normalized = value.toLowerCase();

  if (/usb|host|peripheral|device/.test(normalized)) {
    return "usb";
  }

  if (/audio|speaker|amplifier|dsp|microphone|mic\b|analogue|analog|dante/.test(normalized)) {
    return "audio";
  }

  if (/network|lan|ethernet|rj45|ip\b/.test(normalized)) {
    return "network";
  }

  if (/control|rs-232|rs232|cec|ir\b|gpio|api/.test(normalized)) {
    return "control";
  }

  if (/video|hdmi|display|projector|hdbaset|sdi|dvi|vga/.test(normalized)) {
    return "video";
  }

  return "unknown";
}

function cablePrefix(family: ConnectionFamily): string {
  if (family === "video") {
    return "HD";
  }

  if (family === "usb") {
    return "USB";
  }

  if (family === "audio") {
    return "AUD";
  }

  if (family === "network") {
    return "NET";
  }

  if (family === "control") {
    return "CTL";
  }

  return "SIG";
}

function shortLabel(value: string, maxLength = 34): string {
  const normalized = value.trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1)}…`;
}
function wrapDeviceLabel(
  value: string,
  maximumLineLength = 24,
): string[] {
  const words = value.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return ["Unnamed device"];
  }

  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const candidate = currentLine
      ? `${currentLine} ${word}`
      : word;

    if (
      candidate.length <= maximumLineLength ||
      currentLine.length === 0
    ) {
      currentLine = candidate;
      continue;
    }

    lines.push(currentLine);
    currentLine = word;

    if (lines.length === 2) {
      break;
    }
  }

  if (currentLine && lines.length < 2) {
    lines.push(currentLine);
  }

  const normalized = lines.slice(0, 2);

  if (
    normalized.length === 2 &&
    normalized.join(" ").length < value.trim().length
  ) {
    normalized[1] = shortLabel(
      normalized[1],
      maximumLineLength,
    );
  }

  return normalized;
}

function genericTypeLabel(node: VisualDiagramNode): string {
  if (node.kind === "source") {
    return "GENERIC SOURCE";
  }

  if (node.kind === "display" || node.kind === "output") {
    return "GENERIC DISPLAY";
  }

  if (node.kind === "audio") {
    return "GENERIC AUDIO";
  }

  if (node.kind === "network") {
    return "GENERIC NETWORK";
  }

  if (node.kind === "controller") {
    return "GENERIC CONTROL";
  }

  if (node.kind === "usb") {
    return "GENERIC USB";
  }

  return "GENERIC DEVICE";
}

function sourcePositions(
  nodes: VisualDiagramNode[],
): PositionedDevice[] {
  return nodes.map((node, index) => {
    const family = familyFromText(
      `${node.id} ${node.label} ${node.subtitle ?? ""}`,
    );

    let centreY = 350 + index * 128;

    if (family === "video") {
      centreY = 330;
    }

    if (family === "usb") {
      centreY = 430;
    }

    if (family === "audio") {
      centreY = 505;
    }

    if (family === "network") {
      centreY = 535;
    }

    if (family === "control") {
      centreY = 565;
    }

    return {
      node,
      role: "source",
      x: 80,
      y: centreY - EXTERNAL_HEIGHT / 2,
      width: EXTERNAL_WIDTH,
      height: EXTERNAL_HEIGHT,
    };
  });
}

function destinationPositions(
  nodes: VisualDiagramNode[],
): PositionedDevice[] {
  return nodes.map((node, index) => {
    const family = familyFromText(
      `${node.id} ${node.label} ${node.subtitle ?? ""}`,
    );

    let centreY = 350 + index * 128;

    if (family === "video") {
      centreY = 330;
    }

    if (family === "usb") {
      centreY = 430;
    }

    if (family === "audio") {
      centreY = 505;
    }

    if (family === "network") {
      centreY = 535;
    }

    if (family === "control") {
      centreY = 565;
    }

    return {
      node,
      role: "destination",
      x: 1260,
      y: centreY - EXTERNAL_HEIGHT / 2,
      width: EXTERNAL_WIDTH,
      height: EXTERNAL_HEIGHT,
    };
  });
}

function servicePositions(
  nodes: VisualDiagramNode[],
): PositionedDevice[] {
  const preferredCentres: Record<ConnectionFamily, number> = {
    video: 470,
    usb: 590,
    audio: 570,
    network: 800,
    control: 1030,
    unknown: 800,
  };

  return nodes.map((node, index) => {
    const family = familyFromText(
      `${node.id} ${node.label} ${node.subtitle ?? ""}`,
    );

    const centreX =
      preferredCentres[family] ??
      570 + index * 230;

    return {
      node,
      role: "service",
      x: centreX - SERVICE_WIDTH / 2,
      y: 665,
      width: SERVICE_WIDTH,
      height: SERVICE_HEIGHT,
    };
  });
}

function productPosition(
  node: VisualDiagramNode,
): PositionedDevice {
  return {
    node,
    role: "product",
    x: PRODUCT_X,
    y: PRODUCT_Y,
    width: PRODUCT_WIDTH,
    height: PRODUCT_HEIGHT,
  };
}

function productPortY(
  family: ConnectionFamily,
  direction: "input" | "output",
  sequence: number,
): number {
  const basePosition: Record<ConnectionFamily, number> = {
    video: PRODUCT_Y + 65,
    usb: PRODUCT_Y + 165,
    audio: PRODUCT_Y + 192,
    network: PRODUCT_Y + 205,
    control: PRODUCT_Y + 218,
    unknown: PRODUCT_Y + 115,
  };

  const spacing =
    family === "video" || family === "usb"
      ? 20
      : 13;

  return (
    basePosition[family] +
    Math.max(0, sequence - 1) * spacing
  );
}

function productBottomPortX(
  family: ConnectionFamily,
): number {
  if (family === "audio") {
    return PRODUCT_X + 82;
  }

  if (family === "network") {
    return PRODUCT_X + PRODUCT_WIDTH / 2;
  }

  if (family === "control") {
    return PRODUCT_X + PRODUCT_WIDTH - 82;
  }

  return PRODUCT_X + PRODUCT_WIDTH / 2;
}

function endpointPortLabel(
  family: ConnectionFamily,
  endpoint: PositionedDevice,
): string {
  if (family === "video") {
    return endpoint.role === "source"
      ? "HDMI OUT"
      : "HDMI IN";
  }

  if (family === "usb") {
    return endpoint.role === "source"
      ? "USB HOST"
      : "USB DEVICE";
  }

  if (family === "audio") {
    return "AUDIO IN";
  }

  if (family === "network") {
    return "LAN";
  }

  if (family === "control") {
    return "CONTROL";
  }

  return "PORT TBC";
}

function productPortLabel(
  family: ConnectionFamily,
  direction: "input" | "output",
): string {
  if (family === "video") {
    return direction === "input"
      ? "VIDEO IN"
      : "VIDEO OUT";
  }

  if (family === "usb") {
    return direction === "input"
      ? "USB HOST"
      : "USB DEVICE";
  }

  if (family === "audio") {
    return "AUDIO OUT";
  }

  if (family === "network") {
    return "LAN";
  }

  if (family === "control") {
    return "CONTROL";
  }

  return "PORT TBC";
}

function inputRoute(
  source: PositionedDevice,
  product: PositionedDevice,
  family: ConnectionFamily,
  sequence: number,
): {
  sourcePoint: Point;
  targetPoint: Point;
  path: string;
  labelPoint: Point;
} {
  const sourcePoint = {
    x: source.x + source.width,
    y: source.y + source.height / 2,
  };

  const targetPoint = {
    x: product.x,
    y: productPortY(family, "input", sequence),
  };

  const verticalDifference =
    Math.abs(sourcePoint.y - targetPoint.y);

  if (verticalDifference <= 8) {
    return {
      sourcePoint,
      targetPoint,
      path:
        `M ${sourcePoint.x} ${sourcePoint.y} ` +
        `H ${targetPoint.x}`,
      labelPoint: {
        x: (sourcePoint.x + targetPoint.x) / 2,
        y: sourcePoint.y - 15,
      },
    };
  }

  const laneX =
    product.x -
    90 -
    Math.max(0, sequence - 1) * 28;

  return {
    sourcePoint,
    targetPoint,
    path:
      `M ${sourcePoint.x} ${sourcePoint.y} ` +
      `H ${laneX} ` +
      `V ${targetPoint.y} ` +
      `H ${targetPoint.x}`,
    labelPoint: {
      x: (sourcePoint.x + laneX) / 2,
      y: sourcePoint.y - 15,
    },
  };
}

function outputRoute(
  product: PositionedDevice,
  target: PositionedDevice,
  family: ConnectionFamily,
  sequence: number,
): {
  sourcePoint: Point;
  targetPoint: Point;
  path: string;
  labelPoint: Point;
} {
  const sourcePoint = {
    x: product.x + product.width,
    y: productPortY(family, "output", sequence),
  };

  const targetPoint = {
    x: target.x,
    y: target.y + target.height / 2,
  };

  const verticalDifference =
    Math.abs(sourcePoint.y - targetPoint.y);

  if (verticalDifference <= 8) {
    return {
      sourcePoint,
      targetPoint,
      path:
        `M ${sourcePoint.x} ${sourcePoint.y} ` +
        `H ${targetPoint.x}`,
      labelPoint: {
        x: (sourcePoint.x + targetPoint.x) / 2,
        y: targetPoint.y - 15,
      },
    };
  }

  const laneX =
    product.x +
    product.width +
    90 +
    Math.max(0, sequence - 1) * 28;

  return {
    sourcePoint,
    targetPoint,
    path:
      `M ${sourcePoint.x} ${sourcePoint.y} ` +
      `H ${laneX} ` +
      `V ${targetPoint.y} ` +
      `H ${targetPoint.x}`,
    labelPoint: {
      x: (laneX + targetPoint.x) / 2,
      y: targetPoint.y - 15,
    },
  };
}

function serviceRoute(
  product: PositionedDevice,
  target: PositionedDevice,
  family: ConnectionFamily,
): {
  sourcePoint: Point;
  targetPoint: Point;
  path: string;
  labelPoint: Point;
} {
  const sourcePoint = {
    x: productBottomPortX(family),
    y: product.y + product.height,
  };

  const targetPoint = {
    x: target.x + target.width / 2,
    y: target.y,
  };

  const laneOffsets: Record<ConnectionFamily, number> = {
    video: 42,
    usb: 54,
    audio: 48,
    network: 68,
    control: 88,
    unknown: 58,
  };

  const laneY =
    product.y +
    product.height +
    laneOffsets[family];

  const isVertical =
    Math.abs(sourcePoint.x - targetPoint.x) <= 8;

  if (isVertical) {
    return {
      sourcePoint,
      targetPoint,
      path:
        `M ${sourcePoint.x} ${sourcePoint.y} ` +
        `V ${targetPoint.y}`,
      labelPoint: {
        x: sourcePoint.x + 38,
        y: (sourcePoint.y + targetPoint.y) / 2,
      },
    };
  }

  return {
    sourcePoint,
    targetPoint,
    path:
      `M ${sourcePoint.x} ${sourcePoint.y} ` +
      `V ${laneY} ` +
      `H ${targetPoint.x} ` +
      `V ${targetPoint.y}`,
    labelPoint: {
      x: targetPoint.x,
      y: targetPoint.y - 16,
    },
  };
}

function buildRoutes(
  model: VisualDiagramModel,
  positions: Map<string, PositionedDevice>,
): RoutedConnection[] {
  const cableCounters =
    new Map<string, number>();

  return model.edges
    .map((edge) => {
      const source = positions.get(edge.source);
      const target = positions.get(edge.target);

      if (!source || !target) {
        return null;
      }

      const family = familyFromText(
        `${edge.label ?? ""} ` +
        `${source.node.id} ${source.node.label} ` +
        `${target.node.id} ${target.node.label}`,
      );

      let routeDirection = "other";

      if (target.role === "product") {
        routeDirection = "input";
      }

      if (
        source.role === "product" &&
        target.role === "destination"
      ) {
        routeDirection = "output";
      }

      if (
        source.role === "product" &&
        target.role === "service"
      ) {
        routeDirection = "service";
      }

      const counterKey =
        `${routeDirection}:${family}`;

      const sequence =
        (cableCounters.get(counterKey) ?? 0) + 1;

      cableCounters.set(
        counterKey,
        sequence,
      );

      const cableId =
        `${cablePrefix(family)}-` +
        `${String(sequence).padStart(4, "0")}`;

      if (target.role === "product") {
        const geometry = inputRoute(
          source,
          target,
          family,
          sequence,
        );

        return {
          edge,
          source,
          target,
          family,
          cableId,
          sourcePort: endpointPortLabel(
            family,
            source,
          ),
          targetPort: productPortLabel(
            family,
            "input",
          ),
          ...geometry,
        };
      }

      if (
        source.role === "product" &&
        target.role === "destination"
      ) {
        const geometry = outputRoute(
          source,
          target,
          family,
          sequence,
        );

        return {
          edge,
          source,
          target,
          family,
          cableId,
          sourcePort: productPortLabel(
            family,
            "output",
          ),
          targetPort: endpointPortLabel(
            family,
            target,
          ),
          ...geometry,
        };
      }

      if (
        source.role === "product" &&
        target.role === "service"
      ) {
        const geometry = serviceRoute(
          source,
          target,
          family,
        );

        return {
          edge,
          source,
          target,
          family,
          cableId,
          sourcePort: productPortLabel(
            family,
            "output",
          ),
          targetPort: endpointPortLabel(
            family,
            target,
          ),
          ...geometry,
        };
      }

      return null;
    })
    .filter(
      (
        route,
      ): route is RoutedConnection =>
        route !== null,
    );
}

function deviceIcon(
  node: VisualDiagramNode,
  x: number,
  y: number,
): JSX.Element {
  const iconX = x + 18;
  const iconY = y + 21;

  if (
    node.kind === "display" ||
    node.kind === "output"
  ) {
    return (
      <g aria-hidden="true">
        <rect
          x={iconX}
          y={iconY}
          width="38"
          height="25"
          rx="2"
          className="wm-ts-icon-stroke"
        />
        <line
          x1={iconX + 19}
          y1={iconY + 25}
          x2={iconX + 19}
          y2={iconY + 34}
          className="wm-ts-icon-stroke"
        />
        <line
          x1={iconX + 8}
          y1={iconY + 34}
          x2={iconX + 30}
          y2={iconY + 34}
          className="wm-ts-icon-stroke"
        />
      </g>
    );
  }

  if (node.kind === "audio") {
    return (
      <g aria-hidden="true">
        <rect
          x={iconX + 5}
          y={iconY}
          width="28"
          height="38"
          rx="3"
          className="wm-ts-icon-stroke"
        />
        <circle
          cx={iconX + 19}
          cy={iconY + 12}
          r="5"
          className="wm-ts-icon-stroke"
        />
        <circle
          cx={iconX + 19}
          cy={iconY + 27}
          r="8"
          className="wm-ts-icon-stroke"
        />
      </g>
    );
  }

  if (node.kind === "network") {
    return (
      <g aria-hidden="true">
        <rect
          x={iconX}
          y={iconY + 8}
          width="40"
          height="24"
          rx="3"
          className="wm-ts-icon-stroke"
        />
        {[8, 16, 24, 32].map((offset) => (
          <circle
            key={offset}
            cx={iconX + offset}
            cy={iconY + 20}
            r="2"
            className="wm-ts-icon-fill"
          />
        ))}
      </g>
    );
  }

  if (node.kind === "controller") {
    return (
      <g aria-hidden="true">
        <rect
          x={iconX + 3}
          y={iconY + 2}
          width="34"
          height="35"
          rx="4"
          className="wm-ts-icon-stroke"
        />
        <circle
          cx={iconX + 13}
          cy={iconY + 14}
          r="3"
          className="wm-ts-icon-stroke"
        />
        <circle
          cx={iconX + 27}
          cy={iconY + 14}
          r="3"
          className="wm-ts-icon-stroke"
        />
        <line
          x1={iconX + 11}
          y1={iconY + 27}
          x2={iconX + 29}
          y2={iconY + 27}
          className="wm-ts-icon-stroke"
        />
      </g>
    );
  }

  if (node.kind === "usb") {
    return (
      <g aria-hidden="true">
        <path
          d={
            `M ${iconX + 20} ${iconY + 38} ` +
            `V ${iconY + 9} ` +
            `M ${iconX + 20} ${iconY + 18} ` +
            `L ${iconX + 9} ${iconY + 8} ` +
            `M ${iconX + 20} ${iconY + 23} ` +
            `L ${iconX + 31} ${iconY + 12}`
          }
          className="wm-ts-icon-stroke"
        />
        <circle
          cx={iconX + 20}
          cy={iconY + 38}
          r="3"
          className="wm-ts-icon-fill"
        />
      </g>
    );
  }

  return (
    <g aria-hidden="true">
      <rect
        x={iconX}
        y={iconY}
        width="38"
        height="25"
        rx="2"
        className="wm-ts-icon-stroke"
      />
      <line
        x1={iconX + 5}
        y1={iconY + 30}
        x2={iconX + 33}
        y2={iconY + 30}
        className="wm-ts-icon-stroke"
      />
    </g>
  );
}

function renderExternalDevice(
  positioned: PositionedDevice,
): JSX.Element {
  const {
    node,
    x,
    y,
    width,
    height,
  } = positioned;

  return (
    <g key={node.id}>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx="5"
        className="wm-ts-device-body"
      />

      {deviceIcon(node, x, y)}

      <text
        x={x + 72}
        y={y + 29}
        className="wm-ts-device-title"
      >
        {wrapDeviceLabel(node.label).map((line, index) => (
          <tspan
            key={`${node.id}-title-${index}`}
            x={x + 72}
            dy={index === 0 ? 0 : 16}
          >
            {line}
          </tspan>
        ))}
      </text>

      <text
        x={x + 72}
        y={y + 72}
        className="wm-ts-device-type"
      >
        {genericTypeLabel(node)}
      </text>
    </g>
  );
}

function renderProductDevice(
  positioned: PositionedDevice,
): JSX.Element {
  const {
    node,
    x,
    y,
    width,
    height,
  } = positioned;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx="8"
        className="wm-ts-product-body"
      />

      <rect
        x={x + 18}
        y={y + 18}
        width={width - 36}
        height="32"
        rx="4"
        className="wm-ts-product-brand-strip"
      />

      <text
        x={x + width / 2}
        y={y + 40}
        textAnchor="middle"
        className="wm-ts-product-brand"
      >
        WYRESTORM
      </text>

      <text
        x={x + width / 2}
        y={y + 102}
        textAnchor="middle"
        className="wm-ts-product-sku"
      >
        {node.label}
      </text>

      <text
        x={x + width / 2}
        y={y + 131}
        textAnchor="middle"
        className="wm-ts-product-type"
      >
        SELECTED WYRESTORM PRODUCT
      </text>
    </g>
  );
}

function renderConnection(
  route: RoutedConnection,
): JSX.Element {
  const colour = signalStroke[route.family];

  const sourceLabelAnchor =
    route.source.role === "product"
      ? "start"
      : "end";

  const targetLabelAnchor =
    route.target.role === "product"
      ? "end"
      : "start";

  const sourceLabelX =
    route.source.role === "product"
      ? route.sourcePoint.x + 10
      : route.sourcePoint.x - 10;

  const targetLabelX =
    route.target.role === "product"
      ? route.targetPoint.x - 10
      : route.targetPoint.x + 10;

  return (
    <g key={route.edge.id}>
      <path
        d={route.path}
        fill="none"
        stroke={colour}
        strokeWidth="2.25"
        markerEnd={`url(#wm-ts-arrow-${route.family})`}
        className="wm-ts-cable-path"
      />

      <rect
        x={route.sourcePoint.x - 4}
        y={route.sourcePoint.y - 7}
        width="8"
        height="14"
        rx="1"
        fill="#ffffff"
        stroke={colour}
        strokeWidth="1.5"
      />

      <rect
        x={route.targetPoint.x - 4}
        y={route.targetPoint.y - 7}
        width="8"
        height="14"
        rx="1"
        fill="#ffffff"
        stroke={colour}
        strokeWidth="1.5"
      />

      <rect
        x={route.labelPoint.x - 36}
        y={route.labelPoint.y - 11}
        width="72"
        height="18"
        rx="2"
        className="wm-ts-cable-label-background"
      />

      <text
        x={route.labelPoint.x}
        y={route.labelPoint.y + 2}
        textAnchor="middle"
        className="wm-ts-cable-label"
      >
        {route.cableId}
      </text>

      <text
        x={sourceLabelX}
        y={route.sourcePoint.y - 10}
        textAnchor={sourceLabelAnchor}
        className="wm-ts-port-label"
      >
        {route.sourcePort}
      </text>

      <text
        x={targetLabelX}
        y={route.targetPoint.y - 10}
        textAnchor={targetLabelAnchor}
        className="wm-ts-port-label"
      >
        {route.targetPort}
      </text>
    </g>
  );
}

export default function TechnicalConnectivitySchematic({
  model,
}: TechnicalConnectivitySchematicProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const sheetRef = useRef<SVGSVGElement | null>(null);
  const [zoom, setZoom] = useState(0.35);

  const changeZoom = (nextZoom: number) => {
    setZoom(Math.min(2, Math.max(0.45, nextZoom)));
  };

  const openFullscreen = async () => {
    const wrapper = wrapperRef.current;

    if (!wrapper) {
      return;
    }

    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }

    await wrapper.requestFullscreen();
  };

  const printSchematic = (
    paperSize: "A4" | "A3",
  ) => {
    const svg = sheetRef.current;

    if (!svg) {
      return;
    }

    const printWindow = window.open(
      "",
      "_blank",
      "noopener,noreferrer",
    );

    if (!printWindow) {
      return;
    }

    const pageSize =
      paperSize === "A3"
        ? "A3 landscape"
        : "A4 landscape";

    const pageTitle =
      `${model.title} — ${paperSize} landscape`;

    printWindow.document.open();

    printWindow.document.write(`
      <!doctype html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <title>${pageTitle}</title>
          <style>
            @page {
              size: ${pageSize};
              margin: 8mm;
            }

            html,
            body {
              width: Fit;
              min-height: Fit;
              margin: 0;
              padding: 0;
              background: #ffffff;
            }

            body {
              display: grid;
              place-items: center;
              font-family: Arial, Helvetica, sans-serif;
            }

            svg {
              width: Fit;
              height: auto;
              max-height: calc(100vh - 8mm);
              display: block;
            }

            @media print {
              body {
                display: block;
              }

              svg {
                width: Fit;
                height: auto;
                max-height: none;
                break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          ${svg.outerHTML}
          <script>
            window.addEventListener("load", function () {
              window.focus();
              window.print();
            });
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };
  const productNode =
    model.nodes.find(
      (node) => node.id === "wyrestorm-product",
    ) ??
    model.nodes.find(
      (node) => node.emphasis === "primary",
    );

  if (!productNode) {
    return (
      <div className="wm-ts-unavailable">
        Detailed product connectivity is not available for this SKU.
      </div>
    );
  }

  const sourceNodes = model.nodes.filter((node) =>
    [
      "generic-video-sources",
      "generic-usb-host",
      "generic-source-tbc",
    ].includes(node.id),
  );

  const destinationNodes = model.nodes.filter((node) =>
    [
      "generic-video-destinations",
      "generic-usb-device",
      "generic-destination-tbc",
    ].includes(node.id),
  );

  const serviceNodes = model.nodes.filter((node) =>
    [
      "generic-audio-system",
      "generic-network",
      "generic-control-system",
    ].includes(node.id),
  );

  const product = productPosition(productNode);

  // A camera is a source endpoint rather than a central switching processor.
  if (productNode.kind === "camera") {
    product.x = 150;
    product.y = 265;
  }

  const sources = sourcePositions(sourceNodes);
  const destinations = destinationPositions(destinationNodes);
  const services = servicePositions(serviceNodes);

  const allDevices = [
    ...sources,
    product,
    ...destinations,
    ...services,
  ];

  const positions = new Map(
    allDevices.map((device) => [
      device.node.id,
      device,
    ]),
  );

  const routes = buildRoutes(
    model,
    positions,
  );

  return (
    <section
      ref={wrapperRef}
      className="wm-ts-workspace"
    >
      <div className="wm-ts-toolbar">
        <div className="wm-ts-toolbar-group">
          <button
            type="button"
            onClick={() => changeZoom(zoom - 0.1)}
            aria-label="Zoom out"
          >
            −
          </button>

          <output>
            {Math.round(zoom * 100)}%
          </output>

          <button
            type="button"
            onClick={() => changeZoom(zoom + 0.1)}
            aria-label="Zoom in"
          >
            +
          </button>

          <button
            type="button"
            onClick={() => changeZoom(0.35)}
          >
            Fit
          </button>
        </div>

        <div className="wm-ts-toolbar-group">
          <button
            type="button"
            onClick={openFullscreen}
          >
            Full screen
          </button>

          <button
            type="button"
            onClick={() => printSchematic("A4")}
          >
            Print A4
          </button>

          <button
            type="button"
            onClick={() => printSchematic("A3")}
          >
            Print A3
          </button>
        </div>
      </div>

      <div className="wm-ts-scroll-area">
        <div
          className="wm-ts-zoom-surface"
          style={{
            width: `${CANVAS_WIDTH * zoom}px`,
            height: `${CANVAS_HEIGHT * zoom}px`,
          }}
        >
          <svg
            ref={sheetRef}
            className="wm-ts-sheet"
            viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
        role="img"
        aria-label={`${model.title} technical connectivity schematic`}
      >
        <defs>
          {Object.entries(signalStroke).map(
            ([family, colour]) => (
              <marker
                key={family}
                id={`wm-ts-arrow-${family}`}
                markerWidth="8"
                markerHeight="8"
                refX="7"
                refY="4"
                orient="auto"
              >
                <path
                  d="M 0 0 L 8 4 L 0 8 Z"
                  fill={colour}
                />
              </marker>
            ),
          )}

          <pattern
            id="wm-ts-grid"
            width="25"
            height="25"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 25 0 L 0 0 0 25"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="0.6"
            />
          </pattern>
        </defs>

        <rect
          x="0"
          y="0"
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="wm-ts-sheet-background"
        />

        <rect
          x="0"
          y="0"
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          fill="url(#wm-ts-grid)"
        />

        <text
          x="36"
          y="46"
          className="wm-ts-heading-title"
        >
          {model.title}
        </text>

        <text
          x="36"
          y="72"
          className="wm-ts-heading-subtitle"
        >
          TECHNICAL CONNECTIVITY SCHEMATIC
        </text>

        <line
          x1="36"
          y1="91"
          x2="1364"
          y2="91"
          className="wm-ts-heading-rule"
        />

        <text
          x="70"
          y="126"
          className="wm-ts-zone-label"
        >
          {productNode.kind === "camera"
            ? "WYRESTORM CAMERA SOURCE"
            : "SOURCE DEVICES"}
        </text>

        <text
          x={PRODUCT_X + PRODUCT_WIDTH / 2}
          y="126"
          textAnchor="middle"
          className="wm-ts-zone-label"
        >
          {productNode.kind === "camera"
            ? "CAMERA CONNECTION PATHS"
            : "WYRESTORM PROCESSING"}
        </text>

        <text
          x="1120"
          y="126"
          className="wm-ts-zone-label"
        >
          DESTINATION DEVICES
        </text>

        {services.length > 0 ? (
          <text
            x={PRODUCT_X + PRODUCT_WIDTH / 2}
            y="560"
            textAnchor="middle"
            className="wm-ts-zone-label"
          >
            SUPPORTING CONNECTIONS
          </text>
        ) : null}

        <g className="wm-ts-cables">
          {routes.map(renderConnection)}
        </g>

        <g className="wm-ts-devices">
          {sources.map(renderExternalDevice)}
          {renderProductDevice(product)}
          {destinations.map(renderExternalDevice)}
          {services.map(renderExternalDevice)}
        </g>

        <g className="wm-ts-signal-key">
          {(
            [
              "video",
              "usb",
              "audio",
              "network",
              "control",
            ] as ConnectionFamily[]
          ).map((family, index) => (
            <g
              key={family}
              transform={`translate(${100 + index * 155}, 785)`}
            >
              <line
                x1="0"
                y1="0"
                x2="30"
                y2="0"
                stroke={signalStroke[family]}
                strokeWidth="3"
              />

              <text
                x="40"
                y="4"
                className="wm-ts-zone-label"
              >
                {signalLabel[family]}
              </text>
            </g>
          ))}
        </g>

        <g className="wm-ts-title-block">
          <rect
            x="36"
            y="820"
            width="1328"
            height="48"
            className="wm-ts-title-block-outline"
          />

          <line
            x1="250"
            y1="820"
            x2="250"
            y2="868"
            className="wm-ts-title-block-line"
          />

          <line
            x1="555"
            y1="820"
            x2="555"
            y2="868"
            className="wm-ts-title-block-line"
          />

          <line
            x1="920"
            y1="820"
            x2="920"
            y2="868"
            className="wm-ts-title-block-line"
          />

          <line
            x1="1130"
            y1="820"
            x2="1130"
            y2="868"
            className="wm-ts-title-block-line"
          />

          <text
            x="48"
            y="837"
            className="wm-ts-title-block-label"
          >
            PREPARED BY
          </text>

          <text
            x="48"
            y="855"
            className="wm-ts-title-block-value"
          >
            WYRESTORM WINGMAN
          </text>

          <text
            x="262"
            y="837"
            className="wm-ts-title-block-label"
          >
            CLIENT
          </text>

          <text
            x="262"
            y="855"
            className="wm-ts-title-block-value"
          >
            TO BE CONFIRMED
          </text>

          <text
            x="567"
            y="837"
            className="wm-ts-title-block-label"
          >
            PROJECT
          </text>

          <text
            x="567"
            y="855"
            className="wm-ts-title-block-value"
          >
            {shortLabel(model.title, 42)}
          </text>

          <text
            x="932"
            y="837"
            className="wm-ts-title-block-label"
          >
            DRAWING
          </text>

          <text
            x="932"
            y="855"
            className="wm-ts-title-block-value"
          >
            WM-CONNECTIVITY
          </text>

          <text
            x="1142"
            y="837"
            className="wm-ts-title-block-label"
          >
            STATUS
          </text>

          <text
            x="1142"
            y="855"
            className="wm-ts-title-block-value"
          >
            REVIEW BEFORE QUOTE
          </text>
        </g>
          </svg>
        </div>
      </div>
    </section>
  );
}
