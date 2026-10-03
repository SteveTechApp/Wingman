import fs from "node:fs";

const pagePath = "src/wingman2/pages/ProductCallCardsPage.tsx";
let text = fs.readFileSync(pagePath, "utf8");

function isWordChar(char) {
  return /[A-Za-z0-9_$]/.test(char || "");
}

function removeFunctionByName(name) {
  let removed = 0;
  let searchFrom = 0;

  while (true) {
    const token = `function ${name}`;
    const found = text.indexOf(token, searchFrom);

    if (found < 0) {
      break;
    }

    const before = text[found - 1] || "";
    const after = text[found + token.length] || "";

    if (isWordChar(before) || isWordChar(after)) {
      searchFrom = found + token.length;
      continue;
    }

    let start = found;

    while (start > 0 && text[start - 1] !== "\n") {
      start -= 1;
    }

    const openBrace = text.indexOf("{", found);

    if (openBrace < 0) {
      throw new Error(`Could not find opening brace for ${name}`);
    }

    let depth = 0;
    let end = -1;
    let quote = "";
    let escaping = false;

    for (let i = openBrace; i < text.length; i += 1) {
      const char = text[i];

      if (quote) {
        if (escaping) {
          escaping = false;
          continue;
        }

        if (char === "\\") {
          escaping = true;
          continue;
        }

        if (char === quote) {
          quote = "";
        }

        continue;
      }

      if (char === '"' || char === "'" || char === "`") {
        quote = char;
        continue;
      }

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
      throw new Error(`Could not find closing brace for ${name}`);
    }

    while (end < text.length && /\s/.test(text[end])) {
      end += 1;
    }

    text = text.slice(0, start) + "\n" + text.slice(end);
    removed += 1;
    searchFrom = start;
  }

  return removed;
}

function removeConstByName(name) {
  let removed = 0;
  let searchFrom = 0;

  while (true) {
    const token = `const ${name}`;
    const found = text.indexOf(token, searchFrom);

    if (found < 0) {
      break;
    }

    const before = text[found - 1] || "";
    const after = text[found + token.length] || "";

    if (isWordChar(before) || isWordChar(after)) {
      searchFrom = found + token.length;
      continue;
    }

    let start = found;

    while (start > 0 && text[start - 1] !== "\n") {
      start -= 1;
    }

    let paren = 0;
    let brace = 0;
    let bracket = 0;
    let quote = "";
    let escaping = false;
    let end = -1;

    for (let i = found; i < text.length; i += 1) {
      const char = text[i];

      if (quote) {
        if (escaping) {
          escaping = false;
          continue;
        }

        if (char === "\\") {
          escaping = true;
          continue;
        }

        if (char === quote) {
          quote = "";
        }

        continue;
      }

      if (char === '"' || char === "'" || char === "`") {
        quote = char;
        continue;
      }

      if (char === "(") paren += 1;
      if (char === ")") paren -= 1;
      if (char === "{") brace += 1;
      if (char === "}") brace -= 1;
      if (char === "[") bracket += 1;
      if (char === "]") bracket -= 1;

      if (char === ";" && paren === 0 && brace === 0 && bracket === 0) {
        end = i + 1;
        break;
      }
    }

    if (end < 0) {
      throw new Error(`Could not safely remove const ${name}`);
    }

    while (end < text.length && /\s/.test(text[end])) {
      end += 1;
    }

    text = text.slice(0, start) + "\n" + text.slice(end);
    removed += 1;
    searchFrom = start;
  }

  return removed;
}

const removedVisualStudioFunctions = removeFunctionByName("openVisualStudioForProduct");
const removedApplicationExamples = removeConstByName("productApplicationExamples");
const removedGalleryItems = removeConstByName("productGalleryItems");

const amplifierCondition = `(selectedProduct.sku.toUpperCase().startsWith("AMP-") ||
                    \`\${selectedProduct.family} \${selectedProduct.category}\`.toLowerCase().includes("audio") ||
                    \`\${selectedProduct.family} \${selectedProduct.category}\`.toLowerCase().includes("amplifier"))`;

const amplifierExamplesInline = `[
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
                      ]`;

text = text.replace(
  /\{productApplicationExamples\.length > 0 && \(/g,
  `{${amplifierCondition} && (`,
);

text = text.replace(
  /\{productApplicationExamples\.map\(\(example\) => \(/g,
  `{${amplifierExamplesInline}.map((example) => (`,
);

const galleryInline = `[
                {
                  id: "device",
                  title: selectedProduct.sku,
                  label: "Product identity",
                  kind: "device" as const,
                  imageUrl:
                    ((selectedProduct as ProductCard & {
                      imageUrl?: string;
                      image?: string;
                      heroImage?: string;
                      thumbnailUrl?: string;
                      productImage?: string;
                    }).imageUrl ||
                      (selectedProduct as ProductCard & {
                        imageUrl?: string;
                        image?: string;
                        heroImage?: string;
                        thumbnailUrl?: string;
                        productImage?: string;
                      }).productImage ||
                      (selectedProduct as ProductCard & {
                        imageUrl?: string;
                        image?: string;
                        heroImage?: string;
                        thumbnailUrl?: string;
                        productImage?: string;
                      }).heroImage ||
                      (selectedProduct as ProductCard & {
                        imageUrl?: string;
                        image?: string;
                        heroImage?: string;
                        thumbnailUrl?: string;
                        productImage?: string;
                      }).thumbnailUrl ||
                      (selectedProduct as ProductCard & {
                        imageUrl?: string;
                        image?: string;
                        heroImage?: string;
                        thumbnailUrl?: string;
                        productImage?: string;
                      }).image ||
                      ""),
                },
                {
                  id: "system",
                  title: "Typical use",
                  label: selectedProduct.family,
                  kind: "system" as const,
                },
                {
                  id: "connection",
                  title: "Connection focus",
                  label: selectedProduct.category,
                  kind: "connection" as const,
                },
              ]`;

text = text.replace(
  /\{productGalleryItems\.map\(\(item\) => \(/g,
  `{${galleryInline}.map((item) => (`,
);

const visualStudioInlineHandler = `onClick={() => {
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
                }}`;

text = text.replace(/onClick=\{openVisualStudioForProduct\}/g, visualStudioInlineHandler);

if (text.includes("function openVisualStudioForProduct")) {
  throw new Error("Repair failed: openVisualStudioForProduct still exists.");
}

if (text.includes("productApplicationExamples")) {
  throw new Error("Repair failed: productApplicationExamples still exists.");
}

if (text.includes("productGalleryItems")) {
  throw new Error("Repair failed: productGalleryItems still exists.");
}

fs.writeFileSync(pagePath, text, "utf8");

console.log("Stabilised ProductCallCardsPage.");
console.log(`Removed openVisualStudioForProduct functions: ${removedVisualStudioFunctions}`);
console.log(`Removed productApplicationExamples const blocks: ${removedApplicationExamples}`);
console.log(`Removed productGalleryItems const blocks: ${removedGalleryItems}`);