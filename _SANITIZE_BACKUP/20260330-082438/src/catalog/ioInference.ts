import { classifyCatalogProduct } from "./classification";
import type { CatalogPortCount, CatalogProduct } from "./types";

export type CatalogIoInference = {
  inputs: CatalogPortCount[];
  outputs: CatalogPortCount[];
  inferred: boolean;
  assumptions: string[];
};

function tidy(value: unknown): string {
  return String(value ?? "").trim();
}

function totalPorts(ports?: CatalogPortCount[]): number {
  return Array.isArray(ports)
    ? ports.reduce((sum, port) => sum + Math.max(0, Number(port.count) || 0), 0)
    : 0;
}

function transportPortType(product: CatalogProduct): string {
  if (product.transport === "HDBaseT") return "HDBaseT";
  if (product.transport === "AVoIP") return "LAN";
  if (product.transport === "USB Extension") return "USB Extension";
  return "HDMI";
}

function buildPorts(type: string, count: number): CatalogPortCount[] {
  const safeCount = Math.max(0, Number(count) || 0);
  return safeCount > 0 ? [{ type, count: safeCount }] : [];
}

function looksLikeMatrix(product: CatalogProduct, text: string): boolean {
  const classification = classifyCatalogProduct(product);
  return (
    classification.group === "matrix" ||
    /\bmatrix\b/.test(text) ||
    /^mx/i.test(product.sku) ||
    /^mmx/i.test(product.sku) ||
    /^vs-/i.test(product.sku) ||
    /md\d*x\d*/i.test(product.sku)
  );
}

function looksLikeSwitcher(product: CatalogProduct, text: string): boolean {
  const classification = classifyCatalogProduct(product);
  return (
    classification.group === "switcher" ||
    /\bswitch(?:er)?\b|\bpresentation\b/.test(text) ||
    /^sw/i.test(product.sku) ||
    /^ms/i.test(product.sku) ||
    /ome-ms/i.test(product.sku) ||
    /md\d+x\d+/i.test(product.sku)
  );
}

function parseExplicitIo(text: string): { inputs: number; outputs: number } | null {
  const explicit = text.match(/\b(\d{1,2})\s*[xX]\s*(\d{1,2})\b/);
  if (!explicit) return null;
  return {
    inputs: Number(explicit[1]),
    outputs: Number(explicit[2]),
  };
}

function parseMatrixDigits(sku: string): { inputs: number; outputs: number } | null {
  const compact = sku.replace(/[^A-Z0-9]/gi, "").toUpperCase();
  const fourDigit = compact.match(/(?:MX|MD|MMX|VS|DMMD|CROSSPOINT)?0?(\d{1,2})0?(\d{1,2})/);
  if (!fourDigit) return null;

  const inputs = Number(fourDigit[1]);
  const outputs = Number(fourDigit[2]);
  if (!inputs || !outputs) return null;
  if (inputs > 32 || outputs > 32) return null;
  return { inputs, outputs };
}

function parseSwitcherDigits(sku: string): { inputs: number; outputs: number } | null {
  const compact = sku.replace(/[^A-Z0-9]/gi, "").toUpperCase();
  const explicitSwitch = compact.match(/(?:SW|MS|HDMD|OMEMS|SWITCH)(\d)(\d)/);
  if (!explicitSwitch) return null;

  const inputs = Number(explicitSwitch[1]);
  const outputs = Number(explicitSwitch[2]);
  if (!inputs || !outputs) return null;
  return { inputs, outputs };
}

function inferFromDirectionalType(product: CatalogProduct, text: string): CatalogIoInference | null {
  const classification = classifyCatalogProduct(product);
  const sku = product.sku.toUpperCase();
  const transportType = transportPortType(product);

  if (classification.group === "control") {
    return null;
  }

  const isTx =
    classification.primaryType.includes("transmitter") ||
    /\btransmitter\b|\bencoder\b|\btx\b/.test(text) ||
    /(?:^|[-_])TX(?:$|[-_0-9])/i.test(sku);
  const isRx =
    classification.primaryType.includes("receiver") ||
    /\breceiver\b|\bdecoder\b|\brx\b/.test(text) ||
    /(?:^|[-_])RX(?:$|[-_0-9])/i.test(sku);

  if (classification.group === "extender" || classification.group === "avoip") {
    if (isTx && !isRx) {
      return {
        inputs: buildPorts("HDMI", 1),
        outputs: buildPorts(transportType, 1),
        inferred: true,
        assumptions: [`Assumed 1x1 TX/encoder pattern from SKU ${product.sku}.`],
      };
    }
    if (isRx && !isTx) {
      return {
        inputs: buildPorts(transportType, 1),
        outputs: buildPorts("HDMI", 1),
        inferred: true,
        assumptions: [`Assumed 1x1 RX/decoder pattern from SKU ${product.sku}.`],
      };
    }
  }

  return null;
}

function inferFromSku(product: CatalogProduct): CatalogIoInference | null {
  const sku = tidy(product.sku).toUpperCase();
  const text = [sku, product.name, product.family, product.category, product.subcategory, product.summary]
    .map((value) => tidy(value))
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const explicit = parseExplicitIo(text);
  if (explicit && looksLikeMatrix(product, text)) {
    return {
      inputs: buildPorts("HDMI", explicit.inputs),
      outputs: buildPorts(transportPortType(product), explicit.outputs),
      inferred: true,
      assumptions: [`Parsed explicit ${explicit.inputs}x${explicit.outputs} matrix pattern from ${product.sku}.`],
    };
  }

  if (looksLikeMatrix(product, text)) {
    const matrixDigits = parseMatrixDigits(sku);
    if (matrixDigits) {
      const outputs =
        product.transport === "HDBaseT"
          ? [{ type: "HDBaseT", count: matrixDigits.outputs }]
          : [{ type: "HDMI", count: matrixDigits.outputs }];
      return {
        inputs: buildPorts("HDMI", matrixDigits.inputs),
        outputs,
        inferred: true,
        assumptions: [`Parsed matrix-style I/O from SKU ${product.sku}.`],
      };
    }
  }

  if (looksLikeSwitcher(product, text)) {
    const switcherDigits = explicit || parseSwitcherDigits(sku);
    if (switcherDigits) {
      return {
        inputs: buildPorts("HDMI", switcherDigits.inputs),
        outputs: buildPorts("HDMI", switcherDigits.outputs),
        inferred: true,
        assumptions: [`Parsed switcher-style I/O from SKU ${product.sku}.`],
      };
    }
  }

  return inferFromDirectionalType(product, text);
}

export function inferCatalogIo(product: CatalogProduct): CatalogIoInference {
  const inputs = Array.isArray(product.inputs) ? product.inputs : [];
  const outputs = Array.isArray(product.outputs) ? product.outputs : [];
  const hasInputs = totalPorts(inputs) > 0;
  const hasOutputs = totalPorts(outputs) > 0;

  if (hasInputs && hasOutputs) {
    return {
      inputs,
      outputs,
      inferred: false,
      assumptions: [],
    };
  }

  const inferred = inferFromSku(product);
  if (!inferred) {
    return {
      inputs,
      outputs,
      inferred: false,
      assumptions: [],
    };
  }

  return {
    inputs: hasInputs ? inputs : inferred.inputs,
    outputs: hasOutputs ? outputs : inferred.outputs,
    inferred: true,
    assumptions: inferred.assumptions,
  };
}

export type CatalogIoAuditFinding = {
  code: "missing-io" | "inferred-io" | "suspicious-io-pattern";
  sku: string;
  brand?: string;
  message: string;
};

export function auditCatalogIo(product: CatalogProduct & { brand?: string }): CatalogIoAuditFinding[] {
  const findings: CatalogIoAuditFinding[] = [];
  const inference = inferCatalogIo(product);
  const inputs = totalPorts(product.inputs);
  const outputs = totalPorts(product.outputs);

  if (inputs === 0 || outputs === 0) {
    findings.push({
      code: "missing-io",
      sku: product.sku,
      brand: product.brand,
      message: `${product.sku} is missing ${inputs === 0 ? "input" : "output"} I/O data.`,
    });
  }

  if (inference.inferred) {
    findings.push({
      code: "inferred-io",
      sku: product.sku,
      brand: product.brand,
      message: inference.assumptions[0] || `${product.sku} used inferred I/O.`,
    });
  }

  const explicit = parseExplicitIo([product.sku, product.name, product.summary].join(" "));
  if (explicit && inputs > 0 && outputs > 0) {
    const inputMismatch = inputs !== explicit.inputs;
    const outputMismatch = outputs !== explicit.outputs;
    if (inputMismatch || outputMismatch) {
      findings.push({
        code: "suspicious-io-pattern",
        sku: product.sku,
        brand: product.brand,
        message: `${product.sku} carries ${explicit.inputs}x${explicit.outputs} pattern but current I/O totals are ${inputs}x${outputs}.`,
      });
    }
  }

  return findings;
}
