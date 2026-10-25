/**
 * The product ranges a video wall design can be built from, and the job each
 * one is the right answer for.
 *
 * A rep chooses between WyreStorm ranges, not between part numbers: the 100,
 * 500 and 600 series carry different transports and different amounts of
 * processing, and a local matrix or wall processor carries none of the network
 * at all. The catalogue answers "which design fits these answers"; these lines
 * answer the question a rep is asked next — why that range rather than the next
 * one up.
 *
 * The copy is deliberately about function, not marketing: a range earns its
 * place by what it can carry, so the same sentence is true on a wall or in a
 * comparison.
 */
export type WallRangeKey = "local" | "100" | "500" | "600";

export type WallProductRange = {
  key: WallRangeKey;
  label: string;
  /** One sentence: when this range is the right answer. */
  suits: string;
};

export const wallProductRanges: WallProductRange[] = [
  {
    key: "local",
    label: "Local HDMI",
    suits: "No AV network in the design: a matrix, wall processor or HDMI multiviewer in the rack, with short HDMI runs to the screens.",
  },
  {
    key: "100",
    label: "100 series",
    suits: "Many windows on a 1GbE network from low-bandwidth H.264/H.265 encoders, where a multiview processor can build the canvas and codec latency is acceptable.",
  },
  {
    key: "500",
    label: "500 series",
    suits: "1GbE AV over IP at 4K60 4:4:4, with an encoder per source and a decoder per screen or group; the Lite (-E) build covers the same design with a smaller connector set.",
  },
  {
    key: "600",
    label: "600 series",
    suits: "10GbE SDVoE: uncompressed 4K60 4:4:4 on dedicated transceivers, copper or fibre, where the network can carry 10GbE and the wall needs it.",
  },
];

/**
 * Which range a catalogue design belongs to. The two composition designs sit
 * beside their transport: the 500 + multiview stage is still a 500-series
 * source network, only with a local compositor after it.
 */
export function wallOptionRangeKey(optionId: string): WallRangeKey {
  if (optionId === "nhd150") return "100";
  if (optionId === "nhd600") return "600";
  if (optionId === "nhd500" || optionId === "nhd500-multiview") return "500";
  return "local";
}

export function wallOptionRange(optionId: string): WallProductRange {
  const key = wallOptionRangeKey(optionId);
  return wallProductRanges.find((range) => range.key === key) ?? wallProductRanges[0];
}

/** The ranges the catalogue in front of the rep actually covers, in key order. */
export function wallRangesInPlay(optionIds: readonly string[]): WallProductRange[] {
  const present = new Set(optionIds.map(wallOptionRangeKey));
  return wallProductRanges.filter((range) => present.has(range.key));
}
