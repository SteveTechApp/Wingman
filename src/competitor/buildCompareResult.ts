import { CompareResult } from "./compareModel";
import { scoreToBand, scoreToConfidence } from "./CompetitorMatchService";

export function buildCompareResult(input: any): CompareResult {
  const score = Math.round(input.score ?? 0);

  return {
    competitorName: input.competitor?.name ?? "Unknown",
    competitorSku: input.competitor?.sku ?? "",

    wyrestormSku: input.product?.sku ?? "",
    wyrestormName: input.product?.name ?? "",

    score,
    band: scoreToBand(score),
    confidence: scoreToConfidence(score),

    transport: input.transport,

    io: {
      competitor: {
        inputs: input.competitor?.inputs ?? 0,
        outputs: input.competitor?.outputs ?? 0
      },
      wyrestorm: {
        inputs: input.product?.inputs ?? 0,
        outputs: input.product?.outputs ?? 0
      }
    },

    features: {
      competitor: {
        usb: input.competitor?.usb,
        audio: input.competitor?.audio,
        control: input.competitor?.control
      },
      wyrestorm: {
        usb: input.product?.usb,
        audio: input.product?.audio,
        control: input.product?.control
      }
    },

    notes: input.notes ?? []
  };
}