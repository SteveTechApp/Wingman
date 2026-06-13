import fs from "node:fs";

const pagePath = "src/wingman2/pages/ProductCallCardsPage.tsx";

let text = fs.readFileSync(pagePath, "utf8");

function removeUseMemoConst(name) {
  const before = text.length;

  const pattern = new RegExp(
    String.raw`\n\s*const ${name} = useMemo(?:<[^>]+>)?\(\(\) => \{[\s\S]*?\n\s*\}, \[selectedProduct\]\);\s*`,
    "g",
  );

  text = text.replace(pattern, "\n");

  return before !== text.length;
}

function removePlainComputedConst(name) {
  const before = text.length;

  const pattern = new RegExp(
    String.raw`\n\s*const ${name} = \(\(\) => \{[\s\S]*?\n\s*\}\)\(\);\s*`,
    "g",
  );

  text = text.replace(pattern, "\n");

  return before !== text.length;
}

function removeFunction(name) {
  const startToken = `\n  function ${name}`;
  let index = text.indexOf(startToken);
  let removed = false;

  while (index >= 0) {
    const openBrace = text.indexOf("{", index);

    if (openBrace < 0) {
      break;
    }

    let depth = 0;
    let end = -1;

    for (let i = openBrace; i < text.length; i += 1) {
      const char = text[i];

      if (char === "{") {
        depth += 1;
      }

      if (char === "}") {
        depth -= 1;

        if (depth === 0) {
          end = i + 1;
          break;
        }
      }
    }

    if (end < 0) {
      break;
    }

    while (end < text.length && /\s/.test(text[end])) {
      end += 1;
    }

    text = text.slice(0, index) + "\n" + text.slice(end);
    removed = true;
    index = text.indexOf(startToken);
  }

  return removed;
}

function insertBeforeComponentReturn(block) {
  const crlfNeedle = "\r\n  return (";
  const lfNeedle = "\n  return (";

  let index = text.lastIndexOf(crlfNeedle);

  if (index >= 0) {
    text = text.slice(0, index) + block + text.slice(index);
    return;
  }

  index = text.lastIndexOf(lfNeedle);

  if (index >= 0) {
    text = text.slice(0, index) + block + text.slice(index);
    return;
  }

  throw new Error("Could not find the component return statement.");
}

function ensureProductGalleryType() {
  if (text.includes("type ProductGalleryItem")) {
    return;
  }

  const index = text.indexOf("type ProductPanelId");

  if (index < 0) {
    throw new Error("Could not find ProductPanelId type for gallery type insertion.");
  }

  const typeBlock = `type ProductGalleryItem = {
  id: string;
  title: string;
  label: string;
  kind: "device" | "system" | "connection";
  imageUrl?: string;
};

`;

  text = text.slice(0, index) + typeBlock + text.slice(index);
}

function ensureActiveGalleryState() {
  if (text.includes("const [activeGalleryItem, setActiveGalleryItem]")) {
    return;
  }

  const pattern = /(\n\s*const \[activeProductPanel, setActiveProductPanel\] = useState<ProductPanelId>\("[^"]+"\);\s*)/;
  const match = text.match(pattern);

  if (!match) {
    throw new Error("Could not find activeProductPanel state.");
  }

  text = text.replace(
    pattern,
    `${match[1]}  const [activeGalleryItem, setActiveGalleryItem] = useState<ProductGalleryItem | null>(null);\n`,
  );
}

const removedExamplesHook = removeUseMemoConst("productApplicationExamples");
const removedGalleryHook = removeUseMemoConst("productGalleryItems");

removePlainComputedConst("productApplicationExamples");
removePlainComputedConst("productGalleryItems");
removeFunction("openVisualStudioForProduct");

const needsExamples = text.includes("productApplicationExamples.length") || text.includes("productApplicationExamples.map");
const needsGalleryItems = text.includes("productGalleryItems.map");
const needsVisualStudioFunction = text.includes("openVisualStudioForProduct");

if (text.includes("activeGalleryItem") || needsGalleryItems) {
  ensureProductGalleryType();
  ensureActiveGalleryState();
}

let safeComputedBlock = "";

if (needsExamples) {
  safeComputedBlock += `

  const productApplicationExamples = (() => {
    if (!selectedProduct) {
      return [];
    }

    const sku = selectedProduct.sku.toUpperCase();
    const family = \`\${selectedProduct.family} \${selectedProduct.category}\`.toLowerCase();

    if (sku.startsWith("AMP-") || family.includes("audio") || family.includes("amplifier")) {
      return [
        {
          title: "100V / High Z distributed speaker zone",
          body:
            "One amplifier channel can feed several 100V ceiling or wall speakers across a zone. Each speaker is set to a wattage tap, for example 3W, 6W or 10W. Add the taps together and leave amplifier headroom. This suits background audio, classrooms, corridors, retail areas and larger distributed zones.",
        },
        {
          title: "Low impedance stereo room",
          body:
            "Two amplifier channels can drive left and right low-impedance speakers, typically 4Ω or 8Ω. This suits a local room where stereo playback, clearer music reproduction or a pair of front speakers is required. Check speaker impedance, cable run, channel load and amplifier power per channel.",
        },
      ];
    }

    return [];
  })();
`;
}

if (needsGalleryItems) {
  safeComputedBlock += `

  const productGalleryItems: ProductGalleryItem[] = (() => {
    if (!selectedProduct) {
      return [];
    }

    const productWithImages = selectedProduct as ProductCard & {
      imageUrl?: string;
      image?: string;
      heroImage?: string;
      thumbnailUrl?: string;
      productImage?: string;
    };

    const imageUrl =
      productWithImages.imageUrl ||
      productWithImages.productImage ||
      productWithImages.heroImage ||
      productWithImages.thumbnailUrl ||
      productWithImages.image ||
      "";

    return [
      {
        id: "device",
        title: selectedProduct.sku,
        label: imageUrl ? "Product image" : "Product identity",
        kind: "device",
        imageUrl,
      },
      {
        id: "system",
        title: "Typical use",
        label: selectedProduct.family,
        kind: "system",
      },
      {
        id: "connection",
        title: "Connection focus",
        label: selectedProduct.category,
        kind: "connection",
      },
    ];
  })();
`;
}

if (needsVisualStudioFunction) {
  safeComputedBlock += `

  function openVisualStudioForProduct(): void {
    if (!selectedProduct) {
      return;
    }

    try {
      window.sessionStorage.setItem(
        "wingman.visualStudio.productSeed",
        JSON.stringify({
          source: "product-discussion",
          sku: selectedProduct.sku,
          family: selectedProduct.family,
          category: selectedProduct.category,
          description: selectedProduct.description,
          questions: selectedProduct.questions,
          proofPoints: selectedProduct.proofPoints,
        }),
      );
    } catch {
      // Continue with navigation even if storage is unavailable.
    }

    const params = new URLSearchParams();
    params.set("seedSku", selectedProduct.sku);
    params.set("source", "product-discussion");

    goTo(\`/wingman/visual-design-studio?\${params.toString()}\`);
  }
`;
}

if (safeComputedBlock) {
  insertBeforeComponentReturn(safeComputedBlock);
}

if (text.includes("const productApplicationExamples = useMemo")) {
  throw new Error("Invalid hook repair failed: productApplicationExamples still uses useMemo.");
}

if (text.includes("const productGalleryItems = useMemo")) {
  throw new Error("Invalid hook repair failed: productGalleryItems still uses useMemo.");
}

fs.writeFileSync(pagePath, text, "utf8");

console.log("Invalid hook repair complete.");
console.log(`Removed misplaced productApplicationExamples useMemo: ${removedExamplesHook}`);
console.log(`Removed misplaced productGalleryItems useMemo: ${removedGalleryHook}`);