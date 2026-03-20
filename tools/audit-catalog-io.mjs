import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function readJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(root, relPath), "utf8"));
}

function tidy(value) {
  return String(value ?? "").trim();
}

function totalPorts(ports) {
  return Array.isArray(ports)
    ? ports.reduce((sum, port) => sum + Math.max(0, Number(port?.count) || 0), 0)
    : 0;
}

function isComparableSignalPort(type, product) {
  const value = tidy(type).toLowerCase();
  if (!value) return false;
  const transport = tidy(product.transport).toLowerCase();
  if (transport.includes("usb")) {
    return /usb/.test(value);
  }
  if (value === "lan") {
    return transport.includes("avoip") || transport.includes("usb");
  }
  return [
    "hdmi",
    "hdbaset",
    "dtp",
    "dm",
    "lan",
    "displayport",
    "usb-c",
    "vga",
    "rgb",
    "wireless presentation",
    "wireless",
    "digitalmedia",
  ].includes(value);
}

function comparablePortTotal(ports, product) {
  return Array.isArray(ports)
    ? ports
        .filter((port) => isComparableSignalPort(port?.type, product))
        .reduce((sum, port) => sum + Math.max(0, Number(port?.count) || 0), 0)
    : 0;
}

function comparableOutputTotal(product, outputBehavior) {
  const outputs = Array.isArray(product.outputs) ? product.outputs : [];
  const comparable = outputs.filter((port) => isComparableSignalPort(port?.type, product));
  if (!comparable.length) return 0;
  const mode = tidy(outputBehavior).toLowerCase();
  if (mode.includes("mirrored") && !mode.includes("matrix")) {
    return Math.max(...comparable.map((port) => Math.max(0, Number(port.count) || 0)));
  }
  return comparable.reduce((sum, port) => sum + Math.max(0, Number(port.count) || 0), 0);
}

function firstNonEmpty(...values) {
  for (const value of values) {
    if (value != null && tidy(value)) return value;
  }
  return undefined;
}

function transportPortType(product) {
  const transport = tidy(product.transport).toLowerCase();
  if (transport.includes("hdbaset")) return "HDBaseT";
  if (transport.includes("avoip") || transport.includes("ip")) return "LAN";
  if (transport.includes("usb")) return "USB Extension";
  return "HDMI";
}

function parseExplicitIo(text) {
  const match = text.match(/\b(\d{1,2})\s*[xX]\s*(\d{1,2})\b/);
  if (!match) return null;
  return { inputs: Number(match[1]), outputs: Number(match[2]) };
}

function parseMatrixDigits(sku) {
  const compact = tidy(sku).replace(/[^A-Z0-9]/gi, "").toUpperCase();
  const match = compact.match(/(?:MX|MD|MMX|VS|DMMD|CROSSPOINT)?0?(\d{1,2})0?(\d{1,2})/);
  if (!match) return null;
  const inputs = Number(match[1]);
  const outputs = Number(match[2]);
  if (!inputs || !outputs || inputs > 32 || outputs > 32) return null;
  return { inputs, outputs };
}

function parseSwitcherDigits(sku) {
  const compact = tidy(sku).replace(/[^A-Z0-9]/gi, "").toUpperCase();
  const match = compact.match(/(?:SW|MS|HDMD|OMEMS|SWITCH)(\d)(\d)/);
  if (!match) return null;
  return { inputs: Number(match[1]), outputs: Number(match[2]) };
}

function buildBlob(product) {
  return [
    product.brand,
    product.sku,
    product.name,
    product.family,
    product.category,
    product.subcategory,
    product.summary,
    product.transport,
    product.technology,
    product.topology,
    product.role,
    product.directionality,
    product.outputBehavior,
    ...(Array.isArray(product.features) ? product.features : []),
    ...(Array.isArray(product.control) ? product.control : []),
    ...(Array.isArray(product.audio) ? product.audio : []),
  ]
    .map(tidy)
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function hasPort(product, type) {
  const target = String(type).toLowerCase();
  return [...(Array.isArray(product.inputs) ? product.inputs : []), ...(Array.isArray(product.outputs) ? product.outputs : [])]
    .some((port) => tidy(port.type).toLowerCase() === target && Number(port.count) > 0);
}

function inferMetadata(product) {
  const text = buildBlob(product);
  const outputPorts = Array.isArray(product.outputs) ? product.outputs : [];
  const videoOutputTypes = outputPorts
    .filter((port) => ["hdmi", "hdbaset", "lan", "displayport"].includes(tidy(port.type).toLowerCase()) && Number(port.count) > 0)
    .map((port) => tidy(port.type).toLowerCase());

  let technology = tidy(product.technology);
  if (!technology) {
    if (/\bairplay\b|\bmiracast\b|\bwireless presentation\b/.test(text)) technology = "Wireless Presentation";
    else if (tidy(product.transport) === "AVoIP") technology = "AVoIP";
    else if (tidy(product.transport) === "HDBaseT") technology = "HDBaseT";
    else if (/\bmatrix\b/.test(text)) technology = "Matrix";
    else if (/\bdistribution amplifier\b|\bsplitter\b|\bdistribution\b/.test(text) || tidy(product.category).toLowerCase() === "distribution") technology = "Distribution";
    else if (/\bpresentation\b|\bswitcher\b|\buc\b/.test(text)) technology = "Local Switcher";
  }

  let topology = tidy(product.topology);
  let role = tidy(product.role);
  let directionality = tidy(product.directionality);
  if (/\bdistribution amplifier\b|\bsplitter\b|\bdistribution\b/.test(text) || tidy(product.category).toLowerCase() === "distribution") {
    topology ||= "splitter";
    role ||= "distribution-amplifier";
    directionality ||= "one-to-many";
  } else if (looksLikeMatrix(product, text)) {
    topology ||= "matrix";
    role ||= /\bkit\b/.test(text) ? "matrix-kit" : "matrix";
    directionality ||= "bidirectional";
  } else if (/\bextender\b|\bhdbaset\b/.test(text)) {
    topology ||= "1:1 extender";
    if (!role) {
      if (/\bkit\b|\bset\b/.test(text)) role = "extender-kit";
      else if (/\btransmitter\b|\btx\b/.test(text)) role = "tx";
      else if (/\breceiver\b|\brx\b/.test(text)) role = "rx";
      else role = "extender";
    }
    if (!directionality) {
      if (role === "tx") directionality = "tx";
      else if (role === "rx") directionality = "rx";
      else if (role === "extender-kit") directionality = "kit";
    }
  } else if (/\bnetworkhd\b|\bavoip\b|\bav over ip\b/.test(text)) {
    const isControlCategory = tidy(product.category).toLowerCase() === "control" || /\bcontroller\b|\bmanagement appliance\b|\bsystem manager\b/.test(text);
    topology ||= isControlCategory ? "controller" : "endpoint";
    role ||= isControlCategory ? "controller" : /\bencoder\b/.test(text) ? "encoder" : /\bdecoder\b/.test(text) ? "decoder" : "endpoint";
  } else if (/\bcontroller\b|\bmanagement appliance\b|\bsystem manager\b/.test(text) || tidy(product.category).toLowerCase() === "control") {
    topology ||= "controller";
    role ||= "controller";
  } else if (looksLikeSwitcher(product, text) || /\bpresentation\b/.test(text)) {
    topology ||= "local switcher";
    role ||= /\bpresentation\b/.test(text) ? "presentation-switcher" : "switcher";
    directionality ||= "bidirectional";
  }

  let outputBehavior = tidy(product.outputBehavior);
  if (!outputBehavior) {
    if (looksLikeMatrix(product, text)) {
      outputBehavior = /\bmirror(?:ed)?\b/.test(text) || (hasPort(product, "HDBaseT") && hasPort(product, "HDMI"))
        ? "mirrored + local"
        : "matrixed";
    } else if (videoOutputTypes.length <= 1 && hasPort(product, "HDMI")) {
      outputBehavior = "single display only";
    } else if (hasPort(product, "HDBaseT") && hasPort(product, "HDMI")) {
      outputBehavior = "mirrored + local";
    }
  }

  const distance = { ...(product.distance || {}) };
  if (!distance.networkSpeed && tidy(product.transport) === "AVoIP") {
    if (/\b10g(?:be)?\b|\b10-gig\b/.test(text)) distance.networkSpeed = "10G";
    else if (/\b1g(?:be)?\b|\bgigabit\b|\bone-gigabit\b/.test(text)) distance.networkSpeed = "1G";
  }
  if (!distance.codec && tidy(product.transport) === "AVoIP") {
    if (/\bsdvoe\b/.test(text)) distance.codec = "SDVoE";
    else if (/\bjpeg[- ]?2000\b/.test(text)) distance.codec = "JPEG2000";
    else if (/\baes67\b/.test(text)) distance.codec = "AES67";
  }
  if (!distance.hdbasetClass && tidy(product.transport) === "HDBaseT") {
    if (/\bclass a\b|\b70m\b/.test(text)) distance.hdbasetClass = "Class A";
    else if (/\bclass b\b|\b35m\b/.test(text)) distance.hdbasetClass = "Class B";
  }
  if (!distance.meters4k && tidy(product.transport) === "HDBaseT") {
    if (distance.hdbasetClass === "Class A") distance.meters4k = 70;
    if (distance.hdbasetClass === "Class B") distance.meters4k = 35;
  }

  return { technology, topology, role, directionality, outputBehavior, distance };
}

function looksLikeMatrix(product, text) {
  return (
    /^mx/i.test(product.sku) ||
    /^mmx/i.test(product.sku) ||
    /^vs-/i.test(product.sku) ||
    /md\d*x\d*/i.test(product.sku) ||
    /\bmatrix\b/.test(text)
  );
}

function looksLikeSwitcher(product, text) {
  return (
    /^sw/i.test(product.sku) ||
    /^ms/i.test(product.sku) ||
    /ome-ms/i.test(product.sku) ||
    /\bswitch(?:er)?\b|\bpresentation\b/.test(text)
  );
}

function inferIo(product) {
  const sku = tidy(product.sku).toUpperCase();
  const text = buildBlob(product);

  const explicit = parseExplicitIo(text);
  if (explicit && looksLikeMatrix(product, text)) {
    return {
      inputs: explicit.inputs,
      outputs: explicit.outputs,
      outputType: transportPortType(product),
      reason: `explicit ${explicit.inputs}x${explicit.outputs}`,
    };
  }

  if (looksLikeMatrix(product, text)) {
    const parsed = parseMatrixDigits(sku);
    if (parsed) {
      return {
        inputs: parsed.inputs,
        outputs: parsed.outputs,
        outputType: transportPortType(product),
        reason: "matrix SKU pattern",
      };
    }
  }

  if (looksLikeSwitcher(product, text)) {
    const parsed = explicit || parseSwitcherDigits(sku);
    if (parsed) {
      return {
        inputs: parsed.inputs,
        outputs: parsed.outputs,
        outputType: "HDMI",
        reason: "switcher SKU pattern",
      };
    }
  }

  const transportType = transportPortType(product);
  if (/(^|[-_])TX($|[-_0-9])|\btransmitter\b|\bencoder\b/.test(sku) || /\btransmitter\b|\bencoder\b/.test(text)) {
    return { inputs: 1, outputs: 1, outputType: transportType, reason: "TX / encoder heuristic" };
  }
  if (/(^|[-_])RX($|[-_0-9])|\breceiver\b|\bdecoder\b/.test(sku) || /\breceiver\b|\bdecoder\b/.test(text)) {
    return { inputs: 1, outputs: 1, outputType: transportType, reason: "RX / decoder heuristic" };
  }

  return null;
}

function needsDistanceProfile(product, text) {
  return (
    /\bhdbaset\b/.test(text) ||
    /\bavoip\b/.test(text) ||
    /\bencoder\b/.test(text) ||
    /\bdecoder\b/.test(text) ||
    /\btransmitter\b/.test(text) ||
    /\breceiver\b/.test(text) ||
    /\bextender\b/.test(text)
  );
}

function hasDistanceProfile(product) {
  const distance = product.distance || {};
  return Boolean(
    Number(distance.meters) ||
    Number(distance.meters4k) ||
    Number(distance.meters1080p) ||
    tidy(distance.hdbasetClass) ||
    tidy(distance.networkSpeed) ||
    tidy(distance.codec) ||
    /\bdepends on paired\b|\bnetwork dependent\b/.test(tidy(distance.notes).toLowerCase()) ||
    Number(product.distanceMeters)
  );
}

function hasStructuredVideo(product) {
  const video = product.video || {};
  return Boolean(
    tidy(video.maxResolution) ||
    tidy(video.maxFramerate) ||
    tidy(video.chroma) ||
    tidy(video.hdmi) ||
    tidy(video.hdmiVersion) ||
    tidy(video.hdcpVersion) ||
    Number(video.bandwidthGbps) ||
    typeof video.hdr === "boolean" ||
    typeof video.dolbyVision === "boolean"
  );
}

function needsVideoProfile(product) {
  return tidy(product.category).toLowerCase() !== "control" && tidy(product.transport).toLowerCase() !== "usb extension";
}

function hasCoreTaxonomy(product) {
  return Boolean(
    tidy(product.technology) ||
    tidy(product.topology) ||
    tidy(product.role) ||
    tidy(product.directionality)
  );
}

function auditProduct(product) {
  const findings = [];
  const text = buildBlob(product);
  const inputTotal = totalPorts(product.inputs);
  const outputTotal = totalPorts(product.outputs);
  const inference = inferIo(product);
  const metadata = inferMetadata(product);
  const outputBehavior = tidy(firstNonEmpty(product.outputBehavior, metadata.outputBehavior, product.topology, metadata.topology));
  const comparableInputTotal = comparablePortTotal(product.inputs, product);
  const comparableOutputCount = comparableOutputTotal(product, outputBehavior);
  const isController =
    tidy(metadata.role).toLowerCase() === "controller" ||
    tidy(metadata.topology).toLowerCase() === "controller" ||
    tidy(product.category).toLowerCase() === "control";

  if (!isController && (inputTotal === 0 || outputTotal === 0)) {
    findings.push({
      sku: product.sku,
      brand: product.brand || "WyreStorm",
      issue: "missing-io",
      detail: `${inputTotal === 0 ? "inputs" : "outputs"} missing`,
    });
  }

  if (inference && (inputTotal === 0 || outputTotal === 0)) {
    findings.push({
      sku: product.sku,
      brand: product.brand || "WyreStorm",
      issue: "inference",
      detail: `${inference.reason} => ${inference.inputs} in / ${inference.outputs} out`,
    });
  }

  const explicit = parseExplicitIo([product.sku, product.name, product.summary].map(tidy).join(" "));
  if (explicit && comparableInputTotal > 0 && comparableOutputCount > 0 && (explicit.inputs !== comparableInputTotal || explicit.outputs !== comparableOutputCount)) {
    findings.push({
      sku: product.sku,
      brand: product.brand || "WyreStorm",
      issue: "pattern-mismatch",
      detail: `pattern ${explicit.inputs}x${explicit.outputs}, current ${comparableInputTotal}x${comparableOutputCount}`,
    });
  }

  if (!hasCoreTaxonomy({ ...product, ...metadata })) {
    findings.push({
      sku: product.sku,
      brand: product.brand || "WyreStorm",
      issue: "missing-taxonomy",
      detail: "technology/topology/role not captured",
    });
  }

  if (!isController && needsVideoProfile(product) && !hasStructuredVideo(product)) {
    findings.push({
      sku: product.sku,
      brand: product.brand || "WyreStorm",
      issue: "missing-video",
      detail: "video ceiling not captured",
    });
  }

  if (!isController && needsDistanceProfile(product, text) && !hasDistanceProfile({ ...product, distance: metadata.distance || product.distance })) {
    findings.push({
      sku: product.sku,
      brand: product.brand || "WyreStorm",
      issue: "missing-distance",
      detail: "distance / transport profile missing",
    });
  }

  if (outputTotal > 1 && !outputBehavior) {
    findings.push({
      sku: product.sku,
      brand: product.brand || "WyreStorm",
      issue: "missing-output-behavior",
      detail: `multi-output device (${outputTotal} outputs) has no output behavior`,
    });
  }

  return findings;
}

function countByIssue(findings, issue) {
  return findings.filter((item) => item.issue === issue);
}

function auditCatalog(label, rows) {
  const findings = rows.flatMap((row) => auditProduct(row));
  const missing = countByIssue(findings, "missing-io");
  const inferred = countByIssue(findings, "inference");
  const mismatches = countByIssue(findings, "pattern-mismatch");
  const taxonomy = countByIssue(findings, "missing-taxonomy");
  const video = countByIssue(findings, "missing-video");
  const distance = countByIssue(findings, "missing-distance");
  const outputBehavior = countByIssue(findings, "missing-output-behavior");

  console.log(`\n${label}`);
  console.log(`  rows: ${rows.length}`);
  console.log(`  missing I/O rows: ${missing.length}`);
  console.log(`  inferable rows: ${inferred.length}`);
  console.log(`  pattern mismatches: ${mismatches.length}`);
  console.log(`  missing taxonomy rows: ${taxonomy.length}`);
  console.log(`  missing video rows: ${video.length}`);
  console.log(`  missing distance rows: ${distance.length}`);
  console.log(`  missing output behavior rows: ${outputBehavior.length}`);

  const sample = [
    ...missing,
    ...mismatches,
    ...distance,
    ...video,
    ...taxonomy,
    ...outputBehavior,
  ].slice(0, 16);

  for (const item of sample) {
    console.log(`  - ${item.brand} ${item.sku}: ${item.issue} (${item.detail})`);
  }
}

auditCatalog("Competitor catalog", readJson("src/data/catalog/competitor-catalog.phase4.json"));
auditCatalog("WyreStorm catalog", readJson("src/data/catalog/wyrestorm-catalog.phase1.json"));
