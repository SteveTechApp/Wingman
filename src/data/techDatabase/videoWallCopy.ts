import type { SolutionRecommendationTier } from "@/catalog/serviceRecommendations";

export type SourceProfile = "player" | "matrix-feed" | "direct-hdmi" | "camera" | "mixed";
export type SourceLandingStyle = "standard" | "wallplate";

export const tierCopy: Record<
  SolutionRecommendationTier,
  { label: string; sublabel: string }
> = {
  Bronze: {
    label: "Bronze",
    sublabel: "Lean wall design using the entry-level processor or NetworkHD path.",
  },
  Silver: {
    label: "Silver",
    sublabel: "Balanced wall design for day-to-day commercial installs.",
  },
  Gold: {
    label: "Gold",
    sublabel: "Highest flexibility for demanding walls, multiview, and premium control.",
  },
};

export const sourceProfileCopy: Record<
  SourceProfile,
  { label: string; sublabel: string }
> = {
  player: {
    label: "Signage player / media server",
    sublabel: "One or more dedicated playback devices feeding the wall.",
  },
  "matrix-feed": {
    label: "One feed from matrix or processor",
    sublabel: "The wall receives a prepared feed from upstream switching.",
  },
  "direct-hdmi": {
    label: "Direct HDMI sources",
    sublabel: "Laptops, players, or boxes need to land in the wall workflow directly.",
  },
  camera: {
    label: "Camera / vision sources",
    sublabel: "Live camera chains or vision-mixed feeds are driving the wall outcome.",
  },
  mixed: {
    label: "Mixed source set",
    sublabel: "A blend of source types with more flexible staging or switching.",
  },
};

export const sourceLandingCopy: Record<
  SourceLandingStyle,
  { label: string; sublabel: string }
> = {
  standard: {
    label: "Rack / standard encoder landing",
    sublabel: "Use standard source encoders where the sources land in a rack or equipment area.",
  },
  wallplate: {
    label: "Wallplate / in-wall source landing",
    sublabel: "Use in-wall encoder variants where the sources land at the table, wall, or lectern.",
  },
};
