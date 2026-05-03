import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dataPath = path.join(root, "data/wyrestorm-product-intelligence.json");
const overridePath = path.join(root, "data/wyrestorm-product-role-overrides.json");

const products = JSON.parse(fs.readFileSync(dataPath, "utf8"));
const overrides = JSON.parse(fs.readFileSync(overridePath, "utf8"));

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function upper(value) {
  return clean(value).toUpperCase();
}

function lower(value) {
  return clean(value).toLowerCase();
}

function includesAny(text, terms) {
  const haystack = lower(text);
  return terms.some((term) => haystack.includes(lower(term)));
}

function addUnique(array, values) {
  const next = Array.isArray(array) ? [...array] : [];

  for (const value of values) {
    const text = clean(value);
    if (!text) continue;
    if (!next.some((item) => lower(item) === lower(text))) {
      next.push(text);
    }
  }

  return next;
}

function roleLabel(productRole, visibility) {
  if (productRole === "primary-hardware") return "Primary hardware";
  if (productRole === "endpoint-hardware") return "Endpoint hardware";
  if (productRole === "system-controller") return "System controller / conditional-default";
  if (productRole === "workflow-endpoint") return "Workflow endpoint / conditional-default";
  if (productRole === "rack-mount") return "Rack mount / request-only";
  if (productRole === "power-accessory") return "Power accessory / request-only";
  if (productRole === "cable") return "Cable / request-only";
  if (productRole === "accessory") return "Accessory / request-only";
  return visibility === "request-only" ? "Accessory / request-only" : "Primary hardware";
}

function familyFor(type) {
  if (type === "AVoIP" || type === "AVoIP Infrastructure") return "NetworkHD AVoIP";
  if (type === "Audio / Control") return "Audio / Control";
  if (type === "Camera / Capture") return "Camera / Capture";
  if (type === "Cable") return "Cable";
  if (type === "Dongle") return "Wireless / Dongle";
  if (type === "Extender / HDBaseT") return "Extender / HDBaseT";
  if (type === "Matrix") return "Matrix Switcher";
  if (type === "Presentation / Room Core") return "Presentation / Room Core";
  if (type === "Room Connectivity") return "Room Connectivity";
  if (type === "Splitter / Distribution") return "Splitter / Distribution";
  if (type === "Switching") return "Switcher";
  if (type === "Unified Comms") return "Unified Comms";
  if (type === "Video Wall / Multiview") return "Video Processor";
  return "Accessory";
}

function infer(product) {
  const sku = upper(product.sku || product.id || product.model);
  const text = `${sku} ${product.title ?? ""} ${product.name ?? ""} ${product.description ?? ""} ${(product.features ?? []).join(" ")} ${(product.tags ?? []).join(" ")}`;
  const exact = overrides.exactSkuOverrides[sku];

  if (exact) {
    return { ...exact, reason: "exact-sku-override" };
  }

  if (/^(CAB-|CBL-|EXP-CAB-|EXP-HDMI-|EXP-8KUHD-|EXP-4KUHD-)/.test(sku)) {
    return { technologyType: "Cable", productRole: "cable", catalogVisibility: "request-only", reason: "cable-prefix" };
  }

  if (/^PSU-/.test(sku)) {
    return { technologyType: "Accessory", productRole: "power-accessory", catalogVisibility: "request-only", reason: "power-prefix" };
  }

  if (/^(SR-|NHD-.*RACK|APO-.*MNT|.*-MNT$)/.test(sku)) {
    return { technologyType: "Accessory", productRole: "accessory", catalogVisibility: "request-only", reason: "accessory-prefix" };
  }

  if (/^CAM-/.test(sku) || /^FOCUS-/.test(sku) || includesAny(text, ["ptz camera", "webcam", "camera bridge", "ndi camera"])) {
    return { technologyType: "Camera / Capture", productRole: "primary-hardware", catalogVisibility: "default", reason: "camera-rule" };
  }

  if (/^NHD-/.test(sku)) {
    if (includesAny(text, ["multiview processor", "multiview switcher", "multi view processor"])) {
      return { technologyType: "Video Wall / Multiview", productRole: "primary-hardware", catalogVisibility: "default", reason: "nhd-multiview-rule" };
    }

    if (includesAny(text, ["controller", "touchscreen", "touchscreen control", "control application"])) {
      return { technologyType: "AVoIP Infrastructure", productRole: "system-controller", catalogVisibility: "conditional-default", reason: "nhd-control-rule" };
    }

    return { technologyType: "AVoIP", productRole: "endpoint-hardware", catalogVisibility: "default", reason: "nhd-endpoint-rule" };
  }

  if (/^M42|^M43/.test(sku) || includesAny(text, ["pre-configured", "netgear", "network switch"])) {
    return { technologyType: "AVoIP Infrastructure", productRole: "system-controller", catalogVisibility: "conditional-default", reason: "network-switch-rule" };
  }

  if (/^(EX-|EX3-|EXA-|EXF-|RX-|RX3-|RXF-|RXV-|TX-)/.test(sku)) {
    return { technologyType: "Extender / HDBaseT", productRole: "endpoint-hardware", catalogVisibility: "default", reason: "extender-endpoint-rule" };
  }

  if (/^(MX-|MXV-|TX-H2X-)/.test(sku)) {
    if (includesAny(text, ["mst", "conference room", "usb-c integration", "presentation"])) {
      return { technologyType: "Presentation / Room Core", productRole: "primary-hardware", catalogVisibility: "default", reason: "presentation-matrix-rule" };
    }

    if (includesAny(text, ["seamless", "scaling matrix", "scl"])) {
      return { technologyType: "Video Wall / Multiview", productRole: "primary-hardware", catalogVisibility: "default", reason: "seamless-multiview-matrix-rule" };
    }

    return { technologyType: "Matrix", productRole: "primary-hardware", catalogVisibility: "default", reason: "matrix-rule" };
  }

  if (/^SP-/.test(sku) || /^EXP-SP-/.test(sku) || includesAny(text, ["splitter", "distribution amplifier"])) {
    return { technologyType: "Splitter / Distribution", productRole: "primary-hardware", catalogVisibility: "default", reason: "splitter-rule" };
  }

  if (/^SW-020/.test(sku)) {
    return { technologyType: "Video Wall / Multiview", productRole: "primary-hardware", catalogVisibility: "default", reason: "video-wall-rule" };
  }

  if (/^SW-/.test(sku) || /^SYN-KIT/.test(sku)) {
    if (includesAny(text, ["wireless conferencing", "speakerphone", "video bar"])) {
      return { technologyType: "Unified Comms", productRole: "primary-hardware", catalogVisibility: "default", reason: "uc-switcher-rule" };
    }

    return { technologyType: "Presentation / Room Core", productRole: "primary-hardware", catalogVisibility: "default", reason: "presentation-switcher-rule" };
  }

  if (/^(APO-|HALO-|OFFICE-KIT)/.test(sku) || includesAny(text, ["speakerphone", "video bar", "conference", "unified communication", "webcam"])) {
    return { technologyType: "Unified Comms", productRole: "primary-hardware", catalogVisibility: "default", reason: "uc-rule" };
  }

  if (/^(SYN-|TS-)/.test(sku) || includesAny(text, ["touchscreen", "touchpad", "keypad", "control", "rs232", "relay", "ir protocol"])) {
    return { technologyType: "Audio / Control", productRole: "system-controller", catalogVisibility: "conditional-default", reason: "control-rule" };
  }

  if (includesAny(text, ["amplifier", "dante", "audio extractor", "downmixer", "microphone"])) {
    return { technologyType: "Audio / Control", productRole: "primary-hardware", catalogVisibility: "default", reason: "audio-rule" };
  }

  if (includesAny(text, ["dongle", "adapter ring", "adapter"])) {
    return { technologyType: "Accessory", productRole: "accessory", catalogVisibility: "request-only", reason: "accessory-text-rule" };
  }

  return {
    technologyType: product.technologyType || "Accessory",
    productRole: product.productRole || "accessory",
    catalogVisibility: product.catalogVisibility || "request-only",
    reason: "fallback",
  };
}

let changed = 0;
const summary = {};

for (const product of products) {
  const before = JSON.stringify({
    family: product.family,
    role: product.role,
    productRole: product.productRole,
    catalogVisibility: product.catalogVisibility,
    technologyType: product.technologyType,
  });

  const role = infer(product);
  const type = role.technologyType;

  product.technologyType = type;
  product.hardwareType = type;
  product.productRole = role.productRole;
  product.catalogVisibility = role.catalogVisibility;
  product.family = familyFor(type);
  product.role = roleLabel(role.productRole, role.catalogVisibility);
  product.roleCorrectionSource = role.reason;

  product.features = addUnique(product.features, [type]);
  product.featureTags = addUnique(product.featureTags, [type]);
  product.tags = addUnique(product.tags, [type]);
  product.capabilities = addUnique(product.capabilities, [type]);

  product.searchTerms = addUnique(product.searchTerms, [
    product.sku,
    product.name,
    product.title,
    product.family,
    product.role,
    product.technologyType,
    ...(product.features ?? []),
  ]);

  const after = JSON.stringify({
    family: product.family,
    role: product.role,
    productRole: product.productRole,
    catalogVisibility: product.catalogVisibility,
    technologyType: product.technologyType,
  });

  if (before !== after) changed++;

  summary[type] = (summary[type] ?? 0) + 1;
}

fs.writeFileSync(dataPath, JSON.stringify(products, null, 2) + "\n");

console.log(`[product-intelligence] Updated ${changed} product role records.`);
console.log("[product-intelligence] Technology summary:");
console.log(JSON.stringify(summary, null, 2));