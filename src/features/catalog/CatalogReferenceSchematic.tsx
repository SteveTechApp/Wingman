import * as React from "react";

import type { CatalogPortCount, CatalogProduct } from "@/catalog/types";

type Props = {
  products: CatalogProduct[];
};

type DiagramNodeKind = "source" | "context" | "product" | "output";
type ProductBucketKey = "source-edge" | "core" | "endpoint";

type ProductPlacement = {
  bucket: ProductBucketKey;
  roleLabel: string;
  fitSummary: string;
  priority: number;
};

type DiagramProduct = {
  sku: string;
  name: string;
  roleLabel: string;
  fitSummary: string;
  transport: string;
};

type DiagramNode = {
  id: string;
  kind: DiagramNodeKind;
  title: string;
  subtitle: string;
  lines?: string[];
  products?: DiagramProduct[];
};

type DiagramModel = {
  nodes: DiagramNode[];
  connectors: string[];
  summary: string;
};

function normalizeText(value: string): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function truncateText(value: string, maxLength: number): string {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return "";
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength - 1).trimEnd()}...`;
}

function formatPortType(value: string): string {
  const normalized = String(value ?? "")
    .trim()
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ");

  if (!normalized) return "AV";

  if (/^hdmi$/i.test(normalized)) return "HDMI";
  if (/^usb c$/i.test(normalized)) return "USB-C";
  if (/^usb a$/i.test(normalized)) return "USB-A";
  if (/^dp$/i.test(normalized)) return "DisplayPort";
  if (/^lan$/i.test(normalized)) return "LAN";
  if (/^audio$/i.test(normalized)) return "Audio";
  if (/^ir$/i.test(normalized)) return "IR";
  if (/^rs ?232$/i.test(normalized)) return "RS-232";
  return normalized.replace(/\b\w/g, (match) => match.toUpperCase());
}

function formatTransport(value: string | undefined): string {
  const normalized = String(value ?? "").trim();
  if (!normalized || normalized === "Unknown") return "Signal path";
  return normalized.replace(/[-_/]+/g, " ");
}

function summarizePorts(ports: CatalogPortCount[] | undefined, fallback: string): string {
  const types = Array.from(
    new Set((ports ?? []).map((item) => formatPortType(item.type)).filter(Boolean)),
  ).slice(0, 3);

  if (types.length === 0) return fallback;
  return types.join(" / ");
}

function hasAny(text: string, values: string[]): boolean {
  return values.some((value) => text.includes(value));
}

function classifyProduct(product: CatalogProduct): ProductPlacement {
  const text = ` ${normalizeText(
    [
      product.sku,
      product.name,
      product.family,
      product.category,
      product.subcategory,
      product.summary,
      ...(product.features ?? []),
      ...(product.normalizedTags ?? []),
    ]
      .filter(Boolean)
      .join(" "),
  )} `;

  const isEndpoint = hasAny(text, [" receiver ", " decoder ", " rx ", " endpoint ", " display side "]);
  const isSourceEdge = hasAny(text, [" transmitter ", " encoder ", " tx ", " wallplate ", " input plate "]);
  const isCore = hasAny(text, [
    " matrix ",
    " switcher ",
    " switch ",
    " presentation ",
    " splitter ",
    " distribution ",
    " processor ",
    " scaler ",
    " multiview ",
    " controller ",
  ]);

  if (isEndpoint) {
    return {
      bucket: "endpoint",
      roleLabel: "Display-side receive / output",
      fitSummary:
        product.transport === "AVoIP"
          ? "Decodes the networked AV signal at the display edge and hands it off locally."
          : "Sits near the display edge and turns the transport layer back into local AV outputs.",
      priority: 30,
    };
  }

  if (isSourceEdge) {
    return {
      bucket: "source-edge",
      roleLabel: "Source-side input / transmission",
      fitSummary:
        product.transport === "Local"
          ? "Accepts local inputs and hands them into the room signal chain."
          : "Captures local sources and launches them onto the room transport.",
      priority: 10,
    };
  }

  if (isCore) {
    return {
      bucket: "core",
      roleLabel: "Central routing / distribution",
      fitSummary: "Handles source selection, distribution, or processing in the middle of the signal path.",
      priority: 20,
    };
  }

  return {
    bucket: product.outputs && product.outputs.length > (product.inputs?.length ?? 0) ? "endpoint" : "core",
    roleLabel: "In-system AV node",
    fitSummary: "Fits into the signal chain between source devices and the final room outputs.",
    priority: product.outputs && product.outputs.length > (product.inputs?.length ?? 0) ? 28 : 20,
  };
}

function sourceExamples(products: CatalogProduct[]): string[] {
  const text = ` ${normalizeText(
    products
      .map((product) => [product.name, product.summary, ...(product.features ?? []), ...(product.inputs ?? []).map((port) => port.type)].join(" "))
      .join(" "),
  )} `;

  const lines: string[] = [];

  if (text.includes("usb c")) lines.push("Laptop via USB-C");
  if (text.includes("hdmi")) lines.push("Laptop or media player via HDMI");
  if (hasAny(text, [" wireless ", " airplay ", " miracast ", " presentation "])) {
    lines.push("Wireless presentation source");
  }
  if (hasAny(text, [" camera ", " usb "])) lines.push("Room PC or USB peripherals");

  if (lines.length === 0) {
    lines.push("Laptop or room PC");
    lines.push("Media player or codec");
  }

  if (lines.length === 1) {
    lines.push("Guest source or signage player");
  }

  return lines.slice(0, 3);
}

function outputExamples(products: CatalogProduct[]): string[] {
  const text = ` ${normalizeText(
    products
      .map((product) => [product.name, product.summary, ...(product.features ?? []), ...(product.outputs ?? []).map((port) => port.type)].join(" "))
      .join(" "),
  )} `;

  const lines: string[] = [];

  if (hasAny(text, [" video wall ", " multiview ", " led "])) lines.push("Video wall or LED processing chain");
  if (hasAny(text, [" hdmi ", " displayport ", " display "])) lines.push("Flat panel display or projector");
  if (hasAny(text, [" audio ", " speaker ", " dsp "])) lines.push("Audio breakout, DSP, or speakers");
  if (hasAny(text, [" usb ", " camera ", " touch "])) lines.push("USB peripherals or room control touchpoint");

  if (lines.length === 0) {
    lines.push("Flat panel display or projector");
    lines.push("Secondary display or overflow output");
  }

  return lines.slice(0, 3);
}

function chooseTransport(products: CatalogProduct[]): string {
  const direct = products.find((product) => product.transport && product.transport !== "Unknown");
  return formatTransport(direct?.transport);
}

function combineBucketProducts(products: CatalogProduct[], bucket: ProductBucketKey): DiagramProduct[] {
  return products
    .map((product) => ({ product, placement: classifyProduct(product) }))
    .filter((item) => item.placement.bucket === bucket)
    .sort(
      (left, right) =>
        left.placement.priority - right.placement.priority ||
        left.product.sku.localeCompare(right.product.sku),
    )
    .map(({ product, placement }) => ({
      sku: product.sku,
      name: product.name,
      roleLabel: placement.roleLabel,
      fitSummary: placement.fitSummary,
      transport: formatTransport(product.transport),
    }));
}

function productBucketNode(bucket: ProductBucketKey, products: DiagramProduct[]): DiagramNode {
  if (bucket === "source-edge") {
    return {
      id: "product_source",
      kind: "product",
      title: "Selected WyreStorm source edge",
      subtitle: "Where local room inputs first enter the WyreStorm path.",
      products,
    };
  }

  if (bucket === "endpoint") {
    return {
      id: "product_endpoint",
      kind: "product",
      title: "Selected WyreStorm display edge",
      subtitle: "Where the transport layer resolves into local room outputs.",
      products,
    };
  }

  return {
    id: "product_core",
    kind: "product",
    title: "Selected WyreStorm core layer",
    subtitle: "Where switching, routing, and processing decisions happen.",
    products,
  };
}

function buildDiagramModel(products: CatalogProduct[]): DiagramModel {
  const sourceEdgeProducts = combineBucketProducts(products, "source-edge");
  const coreProducts = combineBucketProducts(products, "core");
  const endpointProducts = combineBucketProducts(products, "endpoint");
  const transport = chooseTransport(products);

  const nodes: DiagramNode[] = [
    {
      id: "sources",
      kind: "source",
      title: "Example source devices",
      subtitle: "Illustrative inputs that typically start the signal path.",
      lines: sourceExamples(products),
    },
  ];
  const connectors: string[] = [];

  const pushNode = (node: DiagramNode, connectorLabel: string) => {
    connectors.push(connectorLabel);
    nodes.push(node);
  };

  if (sourceEdgeProducts.length > 0) {
    pushNode(
      productBucketNode("source-edge", sourceEdgeProducts),
      summarizePorts(products.flatMap((product) => product.inputs ?? []), "HDMI / USB-C"),
    );
  }

  if (coreProducts.length > 0) {
    pushNode(
      productBucketNode("core", coreProducts),
      sourceEdgeProducts.length > 0 ? transport : summarizePorts(products.flatMap((product) => product.inputs ?? []), "AV input"),
    );
  }

  if (endpointProducts.length > 0 && sourceEdgeProducts.length === 0 && coreProducts.length === 0) {
    pushNode(
      {
        id: "context_upstream",
        kind: "context",
        title: transport === "AVoIP" ? "Typical upstream network core" : "Typical upstream source path",
        subtitle: "Reference context added to show what normally feeds the selected endpoint.",
        lines: transport === "AVoIP"
          ? ["AVoIP switch fabric", "Encoder or routed source stream"]
          : ["Matrix, switcher, or transmitter", "Source content already on the transport"],
      },
      "Typical source inputs",
    );
  }

  if (endpointProducts.length > 0) {
    pushNode(
      productBucketNode("endpoint", endpointProducts),
      transport,
    );
  }

  const lastProducts = endpointProducts.length > 0
    ? products.filter((product) => classifyProduct(product).bucket === "endpoint")
    : coreProducts.length > 0
      ? products.filter((product) => classifyProduct(product).bucket === "core")
      : sourceEdgeProducts.length > 0
        ? products.filter((product) => classifyProduct(product).bucket === "source-edge")
        : products;

  const outputFallback =
    endpointProducts.length > 0
      ? "HDMI / USB / audio"
      : sourceEdgeProducts.length > 0 && transport !== "Signal path"
        ? `${transport} to downstream endpoint`
        : "Display output";

  pushNode(
    {
      id: "outputs",
      kind: "output",
      title: "Example displays / outputs",
      subtitle: "Illustrative room destinations or peripheral endpoints.",
      lines: outputExamples(products),
    },
    summarizePorts(lastProducts.flatMap((product) => product.outputs ?? []), outputFallback),
  );

  const selectedSkus = products.map((product) => product.sku).join(", ");
  const summary = `${selectedSkus} shown in a typical ${transport.toLowerCase()} signal path from example sources through the WyreStorm layers to room outputs.`;

  return { nodes, connectors, summary };
}

export default function CatalogReferenceSchematic({ products }: Props) {
  const model = React.useMemo(() => buildDiagramModel(products), [products]);

  return (
    <div className="wm-catalog-page__schematic" aria-label={model.summary}>
      <div className="wm-catalog-page__schematic-flow" role="img" aria-label={model.summary}>
        {model.nodes.map((node, index) => (
          <React.Fragment key={node.id}>
            <article className={`wm-catalog-page__schematic-node wm-catalog-page__schematic-node--${node.kind}`}>
              <div className="wm-catalog-page__schematic-node-head">
                <div className="wm-catalog-page__schematic-node-title">{node.title}</div>
                <div className="wm-catalog-page__schematic-node-subtitle">{node.subtitle}</div>
              </div>

              {node.products ? (
                <div className="wm-catalog-page__schematic-product-list">
                  {node.products.map((product) => (
                    <div key={product.sku} className="wm-catalog-page__schematic-product">
                      <div className="wm-catalog-page__schematic-product-head">
                        <span className="wm-catalog-page__sku-pill">{product.sku}</span>
                        <span className="wm-catalog-page__meta-pill">{product.transport}</span>
                      </div>
                      <div className="wm-catalog-page__schematic-product-name">{product.name}</div>
                      <div className="wm-catalog-page__schematic-product-copy">{product.roleLabel}</div>
                      <div className="wm-catalog-page__schematic-product-copy">
                        {truncateText(product.fitSummary, 120)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <ul className="wm-catalog-page__schematic-list">
                  {(node.lines ?? []).map((line) => (
                    <li key={`${node.id}_${line}`}>{line}</li>
                  ))}
                </ul>
              )}
            </article>

            {index < model.connectors.length ? (
              <div className="wm-catalog-page__schematic-connector" aria-hidden="true">
                <span className="wm-catalog-page__schematic-connector-label">{model.connectors[index]}</span>
                <span className="wm-catalog-page__schematic-connector-arrow">→</span>
              </div>
            ) : null}
          </React.Fragment>
        ))}
      </div>

      <div className="wm-catalog-page__schematic-foot">
        {model.summary} This is an illustrative reference view rather than a design-ready wiring schedule.
      </div>
    </div>
  );
}
