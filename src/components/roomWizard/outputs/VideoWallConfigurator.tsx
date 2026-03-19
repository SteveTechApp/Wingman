import * as React from "react";
import { RoomWizardAnswers, VideoWallConfig } from "../../../utils/types";
import WizardToggleOption from "../common/WizardToggleOption";
import WallLayoutDisplay from "../../WallLayoutDisplay";

interface VideoWallConfiguratorProps {
  answers: RoomWizardAnswers;
  updateAnswers: (newAnswers: Partial<RoomWizardAnswers>) => void;
}

interface ProductRecommendation {
  sku: string;
  name: string;
  quantity: number;
  role: string;
  tier: "Bronze" | "Silver" | "Gold";
}

const TECHNOLOGY_OPTIONS = [
  {
    id: "avoip",
    name: "AVoIP (Decoder per Screen)",
    description:
      "Maximum flexibility. One decoder per panel is best for multi-source walls, grouped layouts, and future expansion.",
    pros: ["Individual panel control", "Bezel compensation", "Scalable"],
    cons: ["Higher cost", "Requires network infrastructure"],
  },
  {
    id: "processor",
    name: "Dedicated Processor",
    description:
      "Single hardware device drives the wall. Best for simpler single-source walls where flexibility is less important.",
    pros: ["Simple setup", "Lower cost", "No network required"],
    cons: ["Limited source flexibility", "Fixed layout approach"],
  },
] as const;

const VideoWallConfigurator: React.FC<VideoWallConfiguratorProps> = ({
  answers,
  updateAnswers,
}) => {
  const config = answers.videoWallConfig;
  const designTier = answers.designTier || "Silver";

  const updateConfig = (newConfig: Partial<VideoWallConfig>) => {
    if (!config) return;
    const updatedConfig: VideoWallConfig = { ...config, ...newConfig };
    updateAnswers({ videoWallConfig: updatedConfig });
  };

  const panelCount = config ? config.layout.rows * config.layout.cols : 0;

  const isFourByTwoLayout = Boolean(
    config &&
      config.type === "lcd" &&
      config.layout.rows === 2 &&
      config.layout.cols === 4,
  );

  const designWarnings = React.useMemo(() => {
    if (!config) return [] as string[];

    const warnings: string[] = [];

    if (config.type === "led") {
      warnings.push(
        "LED walls should normally be treated as a single 1x1 signal output feeding the LED processor.",
      );
    }

    if (isFourByTwoLayout && config.type === "lcd") {
      warnings.push(
        "4x2 LCD layouts are non-standard for single-source content and can stretch 16:10 or 16:9 content awkwardly.",
      );
      warnings.push(
        "Prefer decoder-per-screen driving for grouped content zones unless the content is authored to the final wall resolution.",
      );
    }

    if (config.type === "lcd" && config.technology === "avoip") {
      warnings.push(
        "Avoid entry-level decoder choices for bezel-critical LCD wall designs. NHD-500 and NHD-600 families are safer choices.",
      );
    }

    return warnings;
  }, [config, isFourByTwoLayout]);

  const recommendations = React.useMemo((): ProductRecommendation[] => {
    const products: ProductRecommendation[] = [];
    if (!config) return products;

    if (config.type === "lcd") {
      if (config.technology === "avoip") {
        if (designTier === "Gold") {
          products.push({
            sku: "NHD-600-TRX",
            name: "NetworkHD 600 10GbE Transceiver",
            quantity: panelCount,
            role: "One per panel for premium uncompressed 4K60 wall driving",
            tier: "Gold",
          });
        } else if (designTier === "Silver") {
          products.push({
            sku: "NHD-500-E-RX",
            name: "NetworkHD 500 Economy JPEG-XS Decoder",
            quantity: panelCount,
            role: "One per panel for visually lossless 4K60 wall driving",
            tier: "Silver",
          });
        } else {
          products.push({
            sku: "NHD-500-E-RX",
            name: "NetworkHD 500 Economy JPEG-XS Decoder",
            quantity: panelCount,
            role: "Entry decoder-per-panel option without dropping to NHD-120",
            tier: "Bronze",
          });
        }

        if (designTier === "Gold") {
          products.push({
            sku: "NHD-610-TX",
            name: "NetworkHD 600 Multi-Input Encoder",
            quantity: 1,
            role: "Primary source encoder with richer input flexibility",
            tier: "Gold",
          });
        } else {
          products.push({
            sku: "NHD-500-TX",
            name: "NetworkHD 500 JPEG-XS Encoder",
            quantity: 1,
            role: "Primary source encoder for the wall feed",
            tier: designTier as "Bronze" | "Silver" | "Gold",
          });
        }

        products.push({
          sku: "NHD-CTL-PRO",
          name: "NetworkHD Controller",
          quantity: 1,
          role: "Required for system control, routing, and wall management",
          tier: designTier as "Bronze" | "Silver" | "Gold",
        });
      } else {
        if (panelCount <= 4) {
          products.push({
            sku: "SW-0204-VW",
            name: "4K60 4-Output Video Wall Processor",
            quantity: 1,
            role: "Suitable for up to 4 displays such as 2x2 or 1x4 layouts",
            tier: "Silver",
          });
        } else {
          products.push({
            sku: "SW-0206-VW",
            name: "4K60 6-Output Video Wall Processor",
            quantity: Math.ceil(panelCount / 6),
            role: "Suitable for larger LCD walls, cascaded where required",
            tier: "Silver",
          });
        }
      }
    } else {
      if (config.multiviewRequired) {
        if (designTier === "Gold") {
          products.push({
            sku: "NHD-600-TRX",
            name: "NetworkHD 600 Transceiver",
            quantity: 1,
            role: "Premium multiview feed to the LED processor",
            tier: "Gold",
          });
        } else {
          products.push({
            sku: "NHD-150-RX",
            name: "NetworkHD 150 Multiview Decoder",
            quantity: 1,
            role: "Multiview output feeding a single LED processor input",
            tier: designTier === "Silver" ? "Silver" : "Bronze",
          });
        }
      } else {
        if (designTier === "Gold") {
          products.push({
            sku: "NHD-600-TRX",
            name: "NetworkHD 600 Transceiver",
            quantity: 1,
            role: "Premium single-canvas feed to the LED processor",
            tier: "Gold",
          });
        } else if (designTier === "Silver") {
          products.push({
            sku: "NHD-500-RX",
            name: "NetworkHD 500 Decoder",
            quantity: 1,
            role: "Single-canvas AVoIP decoder feed to the LED processor",
            tier: "Silver",
          });
        } else {
          products.push({
            sku: "NHD-500-E-RX",
            name: "NetworkHD 500 Economy Decoder",
            quantity: 1,
            role: "Entry single-canvas AVoIP decoder feed to the LED processor",
            tier: "Bronze",
          });
        }
      }
    }

    return products;
  }, [config, designTier, panelCount]);

  if (!config) return null;

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "Gold":
        return "text-yellow-700 bg-yellow-50 border-yellow-200";
      case "Silver":
        return "text-slate-700 bg-slate-50 border-slate-200";
      case "Bronze":
        return "text-amber-700 bg-amber-50 border-amber-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold">Video Wall Configuration</h3>
        <span className="text-sm text-text-secondary">
          Design Tier: <span className="font-semibold">{designTier}</span>
        </span>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">
          Wall Type
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => updateConfig({ type: "lcd" })}
            className={`p-4 border-2 rounded-lg text-left transition-all duration-200 ${
              config.type === "lcd"
                ? "bg-accent text-white border-accent shadow-md"
                : "bg-gray-50 text-text-primary border-gray-200 hover:bg-gray-100 hover:border-gray-300"
            }`}
          >
            <p className="font-bold">LCD Video Wall</p>
            <p
              className={`text-xs mt-1 ${
                config.type === "lcd" ? "text-green-100" : "text-text-secondary"
              }`}
            >
              Tiled commercial displays with visible bezels
            </p>
            <ul
              className={`text-xs mt-2 space-y-0.5 ${
                config.type === "lcd" ? "text-green-100" : "text-text-secondary"
              }`}
            >
              <li>Commercial display panels</li>
              <li>Thin bezels but still segmented</li>
              <li>Strong value for larger display canvases</li>
            </ul>
          </button>

          <button
            onClick={() => updateConfig({ type: "led" })}
            className={`p-4 border-2 rounded-lg text-left transition-all duration-200 ${
              config.type === "led"
                ? "bg-accent text-white border-accent shadow-md"
                : "bg-gray-50 text-text-primary border-gray-200 hover:bg-gray-100 hover:border-gray-300"
            }`}
          >
            <p className="font-bold">Direct-View LED</p>
            <p
              className={`text-xs mt-1 ${
                config.type === "led" ? "text-green-100" : "text-text-secondary"
              }`}
            >
              Seamless modular LED driven from its own processor
            </p>
            <ul
              className={`text-xs mt-2 space-y-0.5 ${
                config.type === "led" ? "text-green-100" : "text-text-secondary"
              }`}
            >
              <li>Seamless image with no bezels</li>
              <li>Normally one processor input feed</li>
              <li>Premium visual impact</li>
            </ul>
          </button>
        </div>
      </div>

      {config.type === "lcd" && (
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <label className="block text-sm font-medium mb-3">Panel Layout</label>
          <div className="grid grid-cols-2 gap-6 items-center">
            <div className="space-y-3">
              <div>
                <label
                  htmlFor="wall-cols"
                  className="block text-xs font-medium text-text-secondary"
                >
                  Columns
                </label>
                <input
                  type="number"
                  id="wall-cols"
                  min="1"
                  max="8"
                  value={config.layout.cols}
                  onChange={(e) =>
                    updateConfig({
                      layout: {
                        ...config.layout,
                        cols: parseInt(e.target.value, 10) || 1,
                      },
                    })
                  }
                  className="w-full p-2 border rounded-md bg-white mt-1"
                />
              </div>

              <div>
                <label
                  htmlFor="wall-rows"
                  className="block text-xs font-medium text-text-secondary"
                >
                  Rows
                </label>
                <input
                  type="number"
                  id="wall-rows"
                  min="1"
                  max="8"
                  value={config.layout.rows}
                  onChange={(e) =>
                    updateConfig({
                      layout: {
                        ...config.layout,
                        rows: parseInt(e.target.value, 10) || 1,
                      },
                    })
                  }
                  className="w-full p-2 border rounded-md bg-white mt-1"
                />
              </div>

              <div className="pt-2 border-t border-gray-200">
                <p className="text-sm">
                  <span className="text-text-secondary">Total panels:</span>{" "}
                  <span className="font-bold text-accent">{panelCount}</span>
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-text-secondary text-center mb-2">
                Preview
              </p>
              <WallLayoutDisplay
                rows={config.layout.rows}
                cols={config.layout.cols}
              />
            </div>
          </div>
        </div>
      )}

      {config.type === "lcd" && (
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Driving Technology
          </label>
          <div className="space-y-3">
            {TECHNOLOGY_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() =>
                  updateConfig({ technology: opt.id as "avoip" | "processor" })
                }
                className={`w-full text-left p-4 border-2 rounded-lg transition-all duration-200 ${
                  config.technology === opt.id
                    ? "bg-accent text-white border-accent shadow-md"
                    : "bg-gray-50 text-text-primary border-gray-200 hover:bg-gray-100 hover:border-gray-300"
                }`}
              >
                <p className="font-bold">{opt.name}</p>
                <p
                  className={`text-sm mt-1 ${
                    config.technology === opt.id
                      ? "text-green-100"
                      : "text-text-secondary"
                  }`}
                >
                  {opt.description}
                </p>
                <div className="flex gap-4 mt-2 text-xs">
                  <div>
                    <span
                      className={
                        config.technology === opt.id
                          ? "text-green-200"
                          : "text-green-600"
                      }
                    >
                      Pros:
                    </span>{" "}
                    {opt.pros.join(", ")}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <WizardToggleOption
        label="Multiview Required"
        description={
          config.type === "led"
            ? "Display multiple sources simultaneously on the LED wall"
            : "Display multiple sources across the video wall panels"
        }
        checked={config.multiviewRequired}
        onChange={(isChecked) => updateConfig({ multiviewRequired: isChecked })}
      />

      {designWarnings.length > 0 && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <h4 className="text-sm font-semibold text-amber-900 mb-2">
            Design advisories
          </h4>
          <ul className="text-xs text-amber-800 space-y-1">
            {designWarnings.map((warning) => (
              <li key={warning}>- {warning}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
        <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
          <svg
            className="w-4 h-4 text-accent"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          Recommended Products
        </h4>

        <div className="space-y-2">
          {recommendations.map((product, index) => (
            <div
              key={`${product.sku}-${index}`}
              className="flex items-center justify-between p-2 bg-white rounded border border-slate-200"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-accent">
                    {product.sku}
                  </span>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded border ${getTierColor(product.tier)}`}
                  >
                    {product.tier}
                  </span>
                </div>
                <p className="text-sm text-text-primary">{product.name}</p>
                <p className="text-xs text-text-secondary">{product.role}</p>
              </div>

              <div className="text-right">
                <span className="text-lg font-bold text-slate-700">
                  x{product.quantity}
                </span>
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-text-secondary mt-3 italic">
          Recommendations based on {designTier} tier design.
          {config.type === "lcd" ? ` ${panelCount} panels configured.` : ""}
        </p>
      </div>
    </div>
  );
};

export default VideoWallConfigurator;