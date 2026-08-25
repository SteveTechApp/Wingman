import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  classifyProductCallCard,
  PRODUCT_CALL_CARD_HEADINGS,
  type ProductCallCardClassificationInput,
} from "./productCallCardClassification";

type ProductIndex = {
  products: Array<ProductCallCardClassificationInput & { sku: string }>;
};

const productIndex = JSON.parse(
  readFileSync(join(process.cwd(), "public/product-intelligence-index.json"), "utf8"),
) as ProductIndex;

function headingsFor(sku: string) {
  const product = productIndex.products.find((candidate) => candidate.sku === sku);
  expect(product, `${sku} should be present in the product index`).toBeTruthy();
  return classifyProductCallCard(product!);
}

describe("Product Call Cards classification", () => {
  it("uses the simplified grouped product headings", () => {
    expect(PRODUCT_CALL_CARD_HEADINGS).toEqual([
      "All",
      "Presentation & UC",
      "AVoIP & Networked",
      "Matrix & Routing",
      "Extenders & Distribution",
      "Video & Processing",
      "Control & Audio",
    ]);
  });

  it("classifies representative products from the real product index into grouped headings", () => {
    expect(headingsFor("AMP-2120")).toContain("Control & Audio");
    expect(headingsFor("AMP-260-DNT")).toContain("Control & Audio");
    expect(headingsFor("EXP-MX-0808-KIT")).toContain("Extenders & Distribution");
    expect(headingsFor("SP-0104-H2")).toContain("Extenders & Distribution");
    expect(headingsFor("SW-0401-H2")).toContain("Presentation & UC");
    expect(headingsFor("MX-0402-MST")).toEqual(expect.arrayContaining(["Presentation & UC", "Matrix & Routing"]));
    expect(headingsFor("APO-DG2-PRO")).toContain("Presentation & UC");
    expect(headingsFor("APO-VX20-UC-V2")).toContain("Presentation & UC");
    expect(headingsFor("CAM-210-NDI-PTZ")).toContain("Presentation & UC");
    expect(headingsFor("NHD-0401-MV")).toEqual(expect.arrayContaining(["AVoIP & Networked", "Video & Processing"]));
    expect(headingsFor("SW-0204-VW")).toContain("Video & Processing");
    expect(headingsFor("SW-0206-VW")).toContain("Video & Processing");
    expect(headingsFor("NHD-CTL-PRO")).toEqual(expect.arrayContaining(["AVoIP & Networked", "Control & Audio"]));
    expect(headingsFor("SYN-TOUCH10")).toContain("Control & Audio");
  });

  it("allows genuinely relevant products in more than one heading", () => {
    const headings = classifyProductCallCard({
      sku: "MX-0808-KIT-V2",
      name: "8x8 HDBaseT matrix kit",
      category: "Matrix",
      productType: "HDBaseT extender kit",
      summary: "Fixed I/O matrix supplied as a transmitter and receiver kit.",
    });

    expect(headings).toEqual(expect.arrayContaining(["Extenders & Distribution", "Matrix & Routing"]));
  });

  it("keeps AVoIP exclusive to NHD SKUs", () => {
    expect(
      classifyProductCallCard({
        sku: "SW-0206-VW",
        name: "Video wall processor",
        description: "Dedicated non-AVoIP video wall processor.",
      }),
    ).not.toContain("AVoIP");

    expect(
      classifyProductCallCard({
        sku: "CAM-420-PTZ",
        name: "PTZ camera",
        applications: ["AV-over-IP and NDI workflows"],
      }),
    ).not.toContain("AVoIP");

    expect(
      classifyProductCallCard({
        sku: "MX-1007-HYB",
        name: "Hybrid matrix switcher",
        summary: "Can be considered alongside an AVoIP design.",
      }),
    ).not.toContain("AVoIP");

    expect(
      classifyProductCallCard({
        sku: "NHD-500-TX",
        name: "NetworkHD 500 encoder",
      }),
    ).toContain("AVoIP & Networked");
  });
});


describe("Product Call Cards strict filter boundaries", () => {
  it("does not classify by incidental application wording", () => {
    expect(
      classifyProductCallCard({
        sku: "CAM-420-PTZ",
        name: "PTZ camera",
        applications: ["AV-over-IP, BYOD and video-wall workflows"],
        summary: "Can be used with NetworkHD and presentation switchers.",
      }),
    ).toEqual(["Presentation & UC"]);

    expect(
      classifyProductCallCard({
        sku: "NHD-500-DNT-TX",
        name: "NetworkHD 500 encoder with Dante support",
        description: "Includes Dante audio integration.",
      }),
    ).toEqual(["AVoIP & Networked"]);

    expect(
      classifyProductCallCard({
        sku: "MX-1007-HYB",
        name: "Hybrid matrix switcher",
        summary: "Can be considered alongside AVoIP and wireless casting.",
      }),
    ).toEqual(["Matrix & Routing"]);
  });

  it("keeps representative products in their governed groups", () => {
    expect(
      classifyProductCallCard({
        sku: "AMP-260-DNT",
        name: "Network amplifier",
      }),
    ).toContain("Control & Audio");

    expect(
      classifyProductCallCard({
        sku: "EXP-MX-0808-KIT",
        name: "8x8 HDBaseT matrix kit",
      }),
    ).toEqual(
      expect.arrayContaining(["Extenders & Distribution", "Matrix & Routing"]),
    );

    expect(
      classifyProductCallCard({
        sku: "SP-0104-H2",
        name: "1x4 HDMI splitter",
      }),
    ).toContain("Extenders & Distribution");

    expect(
      classifyProductCallCard({
        sku: "SW-0401-H2",
        name: "Presentation switcher",
      }),
    ).toContain("Presentation & UC");

    expect(
      classifyProductCallCard({
        sku: "APO-DG2",
        name: "Wireless casting dongle",
      }),
    ).toEqual(["Presentation & UC"]);

    expect(
      classifyProductCallCard({
        sku: "APO-VX20-UC-V2",
        name: "Video bar for conference rooms",
      }),
    ).toEqual(
      expect.arrayContaining(["Presentation & UC"]),
    );

    expect(
      classifyProductCallCard({
        sku: "NHD-0401-MV",
        name: "NetworkHD multiview processor",
      }),
    ).toEqual(expect.arrayContaining(["AVoIP & Networked", "Video & Processing"]));

    expect(
      classifyProductCallCard({
        sku: "NHD-CTL-PRO-V2",
        name: "NetworkHD controller",
      }),
    ).toEqual(expect.arrayContaining(["AVoIP & Networked", "Control & Audio"]));
  });

  it("keeps every AVoIP & Networked result inside the NHD family", () => {
    const avoipSkus = productIndex.products
      .filter((product) =>
        classifyProductCallCard(product).includes("AVoIP & Networked"),
      )
      .map((product) => product.sku);

    expect(avoipSkus.length).toBeGreaterThan(0);
    expect(
      avoipSkus.every((sku) => String(sku).toUpperCase().startsWith("NHD-")),
    ).toBe(true);
  });

  it("does not leak obvious cross-family products into strict groups", () => {
    for (const product of productIndex.products) {
      const sku = String(product.sku || "").toUpperCase();
      const headings = classifyProductCallCard(product);

      // Control & Audio should only contain audio or control products
      if (headings.includes("Control & Audio")) {
        const identityFields = [
          product.name,
          product.title,
          product.family,
          product.category,
          product.productType,
          product.role,
          product.productRole,
        ]
          .filter(Boolean)
          .join(" ");

        const isAudioOrControl = /^AMP-|^SYN-|^NHD-(?:000-)?CTL|^NHD-TOUCH|^NHD-100$|^TS-280|^NETWORKHDTOUCH/.test(sku) ||
            /audio amplifier|network amplifier|dante amplifier|dsp amplifier|audio processor|audio converter|audio breakout|audio extractor|audio de-?embed(?:der|ding)?|touch panel|touchpad controller|control interface|system-controller|companion control app|touchscreen|control app/i.test(
              identityFields,
            );
        expect(isAudioOrControl, `Unexpected Control & Audio product: ${sku}`).toBe(true);
      }

      // Matrix & Routing should only contain matrix products
      if (headings.includes("Matrix & Routing")) {
        expect(
          /^(?:EXP-)?MX(?:V)?-/.test(sku) ||
            /matrix switcher|seamless matrix|fixed i\/o matrix|routing matrix/i.test(
              [
                product.name,
                product.title,
                product.family,
                product.category,
                product.productType,
                product.role,
                product.productRole,
              ]
                .filter(Boolean)
                .join(" "),
            ),
        ).toBe(true);
      }
    }
  });
});


describe("Product Call Cards current wireless products", () => {
  it("includes the current Apollo and HALO video bars in the correct groups", () => {
    expect(
      classifyProductCallCard({
        sku: "APO-VX20-UC-V2",
        name: "Apollo VX20 Video Bar for Conference Rooms",
        productType: "Video bar / UC switcher",
      }),
    ).toEqual(
      expect.arrayContaining(["Presentation & UC"]),
    );

    expect(
      classifyProductCallCard({
        sku: "HALO-VX10-V2",
        name: "HALO VX10 Video Bar",
        productType: "Video bar",
      }),
    ).toEqual(
      expect.arrayContaining(["Presentation & UC"]),
    );
  });

  it("does not classify retired wireless products as current replacements", () => {
    const retired = [
      "APO-100-UC",
      "APO-200-UC",
      "APO-DG1",
      "APO-DG2-PRO",
      "HALO-VX10-V1",
      "SW-510-TX-W",
    ];

    const adminDb = JSON.parse(
      readFileSync(
        join(
          process.cwd(),
          "data/admin/wingman-product-admin-db.json",
        ),
        "utf8",
      ),
    ) as {
      records: Record<
        string,
        {
          doNotUse?: boolean;
          visibility?: string;
        }
      >;
    };

    retired.forEach((sku) => {
      expect(adminDb.records[sku]?.doNotUse, sku).toBe(true);
      expect(adminDb.records[sku]?.visibility, sku).toBe("hidden");
    });
  });
});
