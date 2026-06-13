import fs from "node:fs/promises";

const root = process.cwd();
const jsonPath = `${root}/public/product-call-card-products.json`;
const auditPath = `${root}/public/product-call-card-accessory-language-audit.json`;

function clean(value) {
  if (typeof value === "string") {
    return value.replace(/\s+/g, " ").trim();
  }

  return "";
}

function normSku(value) {
  return clean(value).toUpperCase();
}

function unique(values) {
  const seen = new Set();
  const output = [];

  for (const value of values) {
    const item = clean(value);

    if (!item) {
      continue;
    }

    const key = item.toLowerCase();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    output.push(item);
  }

  return output;
}

function isAccessory(product) {
  const sku = normSku(product.sku);
  const text = `${sku} ${product.family || ""} ${product.category || ""} ${product.name || ""}`.toLowerCase();

  if (/^(CAB|CBL|ACC|RMK|PSU|BRK|MNT)-/.test(sku)) {
    return true;
  }

  if (text.includes("cable") || text.includes("accessory") || text.includes("mount") || text.includes("bracket")) {
    return true;
  }

  return false;
}

function isCable(product) {
  const sku = normSku(product.sku);
  const text = `${sku} ${product.family || ""} ${product.category || ""} ${product.name || ""} ${product.description || ""}`.toLowerCase();

  if (/^(CAB|CBL)-/.test(sku)) {
    return true;
  }

  return text.includes("cable");
}

function inferAccessoryType(product) {
  const sku = normSku(product.sku);
  const text = `${sku} ${product.name || ""} ${product.description || ""}`.toLowerCase();

  if (text.includes("usb-c") || text.includes("usbc") || sku.includes("USBC")) {
    return "USB-C cable / accessory";
  }

  if (text.includes("hdmi") || sku.includes("HDMI")) {
    return "HDMI cable / accessory";
  }

  if (text.includes("mount") || text.includes("bracket") || sku.includes("MNT")) {
    return "Mounting accessory";
  }

  if (text.includes("power") || sku.includes("PSU")) {
    return "Power accessory";
  }

  return isCable(product) ? "Cable / accessory" : "Accessory";
}

function accessoryDescription(product, accessoryType) {
  const sku = normSku(product.sku);
  const existing = clean(product.description);

  if (existing && existing.length < 180 && !hasTechnologyPollution(existing)) {
    return existing;
  }

  if (accessoryType.includes("USB-C")) {
    return `${sku} is a USB-C cable/accessory used to support a compatible product connection. Treat it as part of the product workflow, not as the main system design.`;
  }

  if (accessoryType.includes("HDMI")) {
    return `${sku} is an HDMI cable/accessory used to complete a compatible AV connection. Confirm length, signal format and device compatibility before specifying it.`;
  }

  if (accessoryType.includes("Mounting")) {
    return `${sku} is a mounting accessory used to physically support a compatible WyreStorm product. Confirm the paired product and installation position before specifying it.`;
  }

  if (accessoryType.includes("Power")) {
    return `${sku} is a power accessory used with a compatible WyreStorm product. Confirm the paired product and power requirement before specifying it.`;
  }

  return `${sku} is an accessory item. Confirm the paired product, installation position and compatibility before adding it to a customer opportunity.`;
}

function hasTechnologyPollution(value) {
  return /dante|aes67|networkhd|av-over-ip|avoip|sdvoe|video wall|multiview|hdbaset|low z|high z|70v|100v|dsp/i.test(clean(value));
}

function accessoryFit(product, accessoryType) {
  const sku = normSku(product.sku);

  if (accessoryType.includes("USB-C")) {
    return `Use ${sku} only where the customer needs a confirmed USB-C connection for a compatible product workflow. Confirm whether the cable is needed for video, USB data, charging, or a specific supported function.`;
  }

  if (accessoryType.includes("HDMI")) {
    return `Use ${sku} where a confirmed HDMI connection is required between known devices. Confirm resolution, refresh rate, cable length and installation route before specifying it.`;
  }

  if (accessoryType.includes("Mounting")) {
    return `Use ${sku} where the compatible product needs a confirmed mounting method. Check fixing location, surface type, orientation and service access.`;
  }

  if (accessoryType.includes("Power")) {
    return `Use ${sku} where a compatible product requires this power accessory. Confirm voltage, current, connector type and whether local power is available.`;
  }

  return `Use ${sku} only as a supporting item for a confirmed product workflow. Confirm the compatible parent product and the practical installation requirement.`;
}

function accessoryOpening(product, accessoryType) {
  const sku = normSku(product.sku);

  if (accessoryType.includes("USB-C")) {
    return `${sku} is a USB-C support item. Start by confirming what the USB-C path needs to carry and which WyreStorm product or device it is being used with.`;
  }

  if (accessoryType.includes("HDMI")) {
    return `${sku} is an HDMI support item. Start by confirming the connected devices, distance and signal format before treating it as suitable.`;
  }

  if (accessoryType.includes("Mounting")) {
    return `${sku} is a mounting support item. Start by confirming the paired product and how it will be physically installed.`;
  }

  if (accessoryType.includes("Power")) {
    return `${sku} is a power support item. Start by confirming the paired product and the power requirement.`;
  }

  return `${sku} is an accessory conversation, not a system architecture conversation. Start by confirming what product it supports and why it is needed.`;
}

function accessoryQuestions(product, accessoryType) {
  if (accessoryType.includes("USB-C")) {
    return [
      "Which product or device is this USB-C item being used with?",
      "Does the connection need to carry video, USB data, charging, or a specific supported function?",
      "Is the cable length and installation route confirmed?",
      "Is there a compatibility note or supported-product requirement to check?",
    ];
  }

  if (accessoryType.includes("HDMI")) {
    return [
      "Which source and display/device are being connected?",
      "What resolution, refresh rate and signal format need to pass?",
      "What cable length and installation route are required?",
      "Is an active cable, extender or different transport method more appropriate?",
    ];
  }

  if (accessoryType.includes("Mounting")) {
    return [
      "Which product is being mounted?",
      "Where will it be installed?",
      "Is the fixing surface suitable?",
      "Will the installer still have access for cabling and service?",
    ];
  }

  if (accessoryType.includes("Power")) {
    return [
      "Which product requires this power accessory?",
      "Is local power available at the installation position?",
      "Is the voltage/current/connector requirement confirmed?",
      "Is this already included with the main product or required separately?",
    ];
  }

  return [
    "Which WyreStorm product is this accessory being used with?",
    "Is it required for installation, connection, power, mounting or service?",
    "Is compatibility with the parent product confirmed?",
    "Should this be added to a project only as a supporting item?",
  ];
}

function accessoryProofPoints(product, accessoryType) {
  const proof = [];

  if (accessoryType.includes("USB-C")) {
    proof.push("USB-C accessories should be checked against the required function, not just the connector shape.");
    proof.push("Useful when the product workflow needs a confirmed USB-C connection.");
    proof.push("Confirm whether video, USB data, charging or a supported device function is required.");
  }

  if (accessoryType.includes("HDMI")) {
    proof.push("HDMI accessories should be checked against resolution, refresh rate and cable length.");
    proof.push("Useful where the source and display/device connection is already known.");
    proof.push("Longer or higher-bandwidth runs may need an active cable, extender or different transport method.");
  }

  if (accessoryType.includes("Mounting")) {
    proof.push("Mounting accessories help complete the physical installation of a compatible product.");
    proof.push("The paired product and fixing location should be confirmed before specifying.");
  }

  if (accessoryType.includes("Power")) {
    proof.push("Power accessories should be tied to a confirmed compatible product.");
    proof.push("Power requirement and local power availability should be checked before specifying.");
  }

  proof.push("Accessory items should support a confirmed product workflow rather than be positioned as the main solution.");

  return unique(proof).slice(0, 5);
}

function repairAccessory(product) {
  const accessoryType = inferAccessoryType(product);
  const original = {
    family: product.family,
    category: product.category,
    description: product.description,
    fit: product.fit,
    openingLine: product.openingLine,
    questions: product.questions,
    proofPoints: product.proofPoints,
  };

  return {
    product: {
      ...product,
      family: accessoryType,
      category: accessoryType,
      description: accessoryDescription(product, accessoryType),
      fit: accessoryFit(product, accessoryType),
      openingLine: accessoryOpening(product, accessoryType),
      questions: accessoryQuestions(product, accessoryType),
      proofPoints: accessoryProofPoints(product, accessoryType),
      tags: unique([
        ...(Array.isArray(product.tags) ? product.tags : []),
        accessoryType,
        "accessory",
        isCable(product) ? "cable" : "",
      ]),
      technologyProfile: "accessory",
      copyRepairStatus: "accessory-language-normalised",
      copyRepairRule: "Accessory SKUs must use supporting-item language and must not inherit unrelated system technology proof points.",
    },
    audit: {
      sku: product.sku,
      accessoryType,
      before: original,
      after: {
        family: accessoryType,
        description: accessoryDescription(product, accessoryType),
      },
    },
  };
}

const raw = await fs.readFile(jsonPath, "utf8");
const payload = JSON.parse(raw);
const products = Array.isArray(payload) ? payload : Array.isArray(payload.products) ? payload.products : [];

if (products.length === 0) {
  throw new Error("No products found in product-call-card-products.json");
}

const audit = [];
const repairedProducts = products.map((product) => {
  if (!isAccessory(product)) {
    return product;
  }

  const repaired = repairAccessory(product);
  audit.push(repaired.audit);
  return repaired.product;
});

const output = Array.isArray(payload)
  ? repairedProducts
  : {
      ...payload,
      generatedAt: new Date().toISOString(),
      accessoryLanguageRepairGeneratedAt: new Date().toISOString(),
      accessoryLanguageRule: "Accessory SKUs must use supporting-item language and must not inherit unrelated system technology proof points.",
      products: repairedProducts,
    };

await fs.writeFile(jsonPath, JSON.stringify(output, null, 2), "utf8");
await fs.writeFile(
  auditPath,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      repairedAccessoryCount: audit.length,
      audit,
    },
    null,
    2,
  ),
  "utf8",
);

console.log(`Repaired ${audit.length} accessory/cable records.`);
console.log(auditPath);