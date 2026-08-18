export type WirelessCastingRoomCategory =
  | "small-huddle"
  | "standard-meeting-room"
  | "classroom"
  | "boardroom"
  | "training-room"
  | "hospitality"
  | "general";

export type WirelessCastingRecommendationInput = {
  roomCategory?: WirelessCastingRoomCategory | string;
  roomType?: string;
  participantCount?: number;
  sourceCount?: number;
  displayCount?: number;
  deskConnection?: boolean;
  usesDeskConnection?: boolean;
  requiresDeskConnection?: boolean;
  connectionLocation?: string;
};

export type WirelessCastingRecommendation = {
  primarySkus: string[];
  optionalSkus: string[];
  rationale: string;
};

function textIncludesAny(value: string | undefined, markers: string[]): boolean {
  const text = String(value ?? "").toLowerCase();
  return markers.some((marker) => text.includes(marker));
}

export function isSmallHuddleWirelessCastingRoom(input: WirelessCastingRecommendationInput): boolean {
  const roomText = `${input.roomCategory ?? ""} ${input.roomType ?? ""}`;

  if (textIncludesAny(roomText, ["huddle", "small meeting", "small room", "pod", "focus room"])) {
    return true;
  }

  if (typeof input.participantCount === "number" && input.participantCount > 0 && input.participantCount <= 6) {
    return true;
  }

  return false;
}

export function hasDeskConnection(input: WirelessCastingRecommendationInput): boolean {
  if (input.deskConnection || input.usesDeskConnection || input.requiresDeskConnection) {
    return true;
  }

  return textIncludesAny(input.connectionLocation, ["desk", "table", "lectern", "in-desk", "cubby"]);
}

export function recommendWirelessCastingSkus(input: WirelessCastingRecommendationInput): WirelessCastingRecommendation {
  const optionalSkus = hasDeskConnection(input) ? ["IDB-300"] : [];

  if (isSmallHuddleWirelessCastingRoom(input)) {
    return {
      primarySkus: ["APO-VX20-UC-V2"],
      optionalSkus,
      rationale:
        "Small and huddle meeting rooms should lead with APO-VX20-UC-V2 for the compact wireless/UC room workflow. APO-DG2 is added only when the comparison explicitly calls for a casting dongle; it must not be forced into every wireless opportunity.",
    };
  }

  const switcherSku = typeof input.sourceCount === "number" && input.sourceCount >= 4
    ? "SW-640L-TX-W"
    : "SW-620-TX-W";

  return {
    primarySkus: [switcherSku],
    optionalSkus,
    rationale:
      "Standard wireless casting opportunities should lead with the appropriate wireless presentation switcher. APO-DG2 is added only when the comparison explicitly calls for a casting dongle, rather than being recommended for every wireless opportunity.",
  };
}

export function recommendDeskConnectionOptions(input: WirelessCastingRecommendationInput): string[] {
  return hasDeskConnection(input) ? ["IDB-300"] : [];
}
