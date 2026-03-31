export type DesignBomItem = {
  sku: string;
  quantity: number;
  role: string;
  description: string;
  notes?: string;
};

type DesignBomInput = {
  families: string[];
  tier: "Bronze" | "Silver" | "Gold";
  sourceCount: number;
  displayCount: number;
  applicationType?: string;
  roomTypeId?: string;
  usbNeeds?: string;
  audioNeeds?: string;
  controlNeeds?: string;
};

type FamilySkuProfile = {
  Bronze: {
    core?: string;
    tx?: string;
    rx?: string;
    control?: string;
  };
  Silver: {
    core?: string;
    tx?: string;
    rx?: string;
    control?: string;
  };
  Gold: {
    core?: string;
    tx?: string;
    rx?: string;
    control?: string;
  };
};

const FAMILY_SKUS: Record<string, FamilySkuProfile> = {
  Apollo: {
    Bronze: { core: "APO-210-UC" },
    Silver: { core: "SW-220-TX-W" },
    Gold: { core: "SW-640L-TX-W", control: "APO-DG2" },
  },
  HDBaseT: {
    Bronze: { tx: "EX-70-H2" },
    Silver: { tx: "EX-100-H2" },
    Gold: { tx: "SW-510-TX" },
  },
  AVoIP: {
    Bronze: { tx: "NHD-120-TX", rx: "NHD-120-RX", control: "NHD-CTL-PRO-V2" },
    Silver: { tx: "NHD-500-TX", rx: "NHD-500-RX", control: "NHD-CTL-PRO-V2" },
    Gold: { tx: "NHD-600-TRX", rx: "NHD-610-RX", control: "NHD-CTL-PRO-V2" },
  },
  Matrix: {
    Bronze: { core: "MX-0404-HDMI" },
    Silver: { core: "MX-0808-H2A-MK2" },
    Gold: { core: "MX-1616-SCL" },
  },
  "USB Extension": {
    Bronze: { core: "EX-60-USB2" },
    Silver: { core: "EX-100-USB3" },
    Gold: { core: "NHD-USB-TRX" },
  },
  "Video Wall": {
    Bronze: { core: "SW-0204-VW" },
    Silver: { core: "SW-0206-VW" },
    Gold: { core: "SW-0206-VW", control: "NHD-0401-MV" },
  },
};

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeBlob(input: DesignBomInput): string {
  return [
    input.applicationType,
    input.roomTypeId,
    input.usbNeeds,
    input.audioNeeds,
    input.controlNeeds,
    input.families.join(" "),
  ]
    .join(" ")
    .toLowerCase();
}

function addLine(
  lines: Map<string, DesignBomItem>,
  item: DesignBomItem,
): void {
  const sku = text(item.sku).toUpperCase();
  const role = text(item.role);
  const description = text(item.description);
  if (!sku || !role || !description) return;

  const key = `${sku}|${role}|${description}|${text(item.notes)}`;
  const existing = lines.get(key);
  if (existing) {
    existing.quantity += Math.max(1, item.quantity || 1);
    return;
  }

  lines.set(key, {
    sku,
    quantity: Math.max(1, item.quantity || 1),
    role,
    description,
    notes: text(item.notes) || undefined,
  });
}

function hasWord(blob: string, words: string[]): boolean {
  return words.some((word) => blob.includes(word));
}

function thirdPartyDisplaySku(blob: string, displayCount: number): { sku: string; description: string } {
  if (blob.includes("cinema")) {
    return {
      sku: "3P-CINEMA-DISPLAY",
      description: "Primary cinema projector or large-format display package",
    };
  }
  if (blob.includes("outdoor")) {
    return {
      sku: "3P-OUTDOOR-DISPLAY",
      description: "Weather-rated outdoor display",
    };
  }
  if (blob.includes("video wall") || blob.includes("sports-bar") || blob.includes("window") || displayCount >= 4) {
    return {
      sku: "3P-COMMERCIAL-DISPLAY",
      description: "Commercial display panel",
    };
  }
  return {
    sku: "3P-PRO-DISPLAY",
    description: "Professional display panel",
  };
}

function buildThirdPartyLines(input: DesignBomInput, lines: Map<string, DesignBomItem>): void {
  const blob = normalizeBlob(input);
  const displayCount = Math.max(1, input.displayCount || 1);
  const sourceCount = Math.max(1, input.sourceCount || 1);

  const displayLine = thirdPartyDisplaySku(blob, displayCount);
  addLine(lines, {
    sku: displayLine.sku,
    quantity: displayCount,
    role: "Display endpoint",
    description: displayLine.description,
    notes: displayCount > 1 ? "One line per required display endpoint." : "Primary display endpoint.",
  });

  if (hasWord(blob, ["meeting", "boardroom", "huddle", "seminar", "consultation", "operations", "training", "classroom", "lecture", "townhall", "telemedicine", "home-office", "hearing", "courtroom"]) || blob.includes("usb")) {
    addLine(lines, {
      sku: "3P-UC-CAMERA",
      quantity: 1,
      role: "Room camera",
      description: "USB or network conferencing camera",
      notes: "Third-party camera sized to the room coverage requirement.",
    });
  }

  const wantsSpeechAudio =
    hasWord(blob, ["boardroom", "training", "classroom", "lecture", "townhall", "operations", "mdt", "chamber", "hearing", "courtroom", "telemedicine"]) ||
    blob.includes("micro") ||
    blob.includes("audio");
  const wantsImpactAudio =
    hasWord(blob, ["cinema", "bar", "ballroom", "event", "lounge", "suite", "studio", "gym", "outdoor"]);

  if (wantsSpeechAudio || wantsImpactAudio) {
    addLine(lines, {
      sku: "3P-AUDIO-DSP",
      quantity: 1,
      role: "Audio DSP",
      description: wantsImpactAudio
        ? "Audio DSP and amplification package"
        : "Speech reinforcement DSP package",
      notes: "Third-party audio processing sized to the microphone and speaker scope.",
    });

    addLine(lines, {
      sku: wantsImpactAudio ? "3P-ROOM-SPEAKER" : "3P-CEILING-SPEAKER",
      quantity: wantsImpactAudio ? Math.max(2, Math.min(8, displayCount * 2)) : Math.max(2, Math.min(6, displayCount + 1)),
      role: "Room loudspeaker",
      description: wantsImpactAudio
        ? "Program and room loudspeaker package"
        : "Ceiling or wall speaker package",
      notes: "Final model depends on acoustic design and coverage validation.",
    });
  }

  if (wantsSpeechAudio) {
    const micQty = hasWord(blob, ["townhall", "lecture", "operations", "mdt", "chamber", "hearing", "courtroom"])
      ? 4
      : hasWord(blob, ["training", "classroom", "telemedicine"])
        ? 2
        : 1;
    addLine(lines, {
      sku: "3P-MICROPHONE",
      quantity: micQty,
      role: "Microphone",
      description: "Microphone package",
      notes: "Final microphone style depends on table layout, coverage, and room acoustics.",
    });
  }

  if (text(input.controlNeeds) && !input.families.includes("Apollo")) {
    addLine(lines, {
      sku: "3P-TOUCH-CONTROL",
      quantity: 1,
      role: "User control interface",
      description: "Touch panel or wall control interface",
      notes: "Third-party control surface for room presets and daily operation.",
    });
  }

  if (hasWord(blob, ["outdoor", "cinema", "ballroom", "sports-bar", "window", "reception"]) || sourceCount > 2) {
    addLine(lines, {
      sku: "3P-DISPLAY-MOUNT",
      quantity: displayCount,
      role: "Display mounting",
      description: "Display mounting bracket or mounting package",
      notes: "Final mount type depends on structural survey and display selection.",
    });
  }
}

export function buildDesignBom(input: DesignBomInput): DesignBomItem[] {
  const normalizedFamilies = Array.from(new Set(input.families.map(text).filter(Boolean)));
  const lines = new Map<string, DesignBomItem>();
  const tier = input.tier;
  const sourceCount = Math.max(1, input.sourceCount || 1);
  const displayCount = Math.max(1, input.displayCount || 1);

  for (const family of normalizedFamilies) {
    const profile = FAMILY_SKUS[family];
    if (!profile) continue;
    const tierProfile = profile[tier];

    if (tierProfile.core) {
      addLine(lines, {
        sku: tierProfile.core,
        quantity: 1,
        role:
          family === "Apollo"
            ? "Presentation core"
            : family === "Matrix"
              ? "Matrix core"
              : family === "Video Wall"
                ? "Video wall processor"
                : family === "USB Extension"
                  ? "USB extension core"
                  : "Core device",
        description:
          family === "Apollo"
            ? "WyreStorm presentation and collaboration core"
            : family === "Matrix"
              ? "WyreStorm matrix switching chassis"
              : family === "Video Wall"
                ? "WyreStorm video wall processor"
                : family === "USB Extension"
                  ? "WyreStorm USB extension endpoint"
                  : `WyreStorm ${family} core`,
      });
    }

    if (tierProfile.tx) {
      addLine(lines, {
        sku: tierProfile.tx,
        quantity: family === "AVoIP" ? sourceCount : Math.max(1, displayCount),
        role:
          family === "AVoIP"
            ? "AV encoder"
            : family === "HDBaseT"
              ? "Extension endpoint"
              : "Signal endpoint",
        description:
          family === "AVoIP"
            ? "WyreStorm source-side AV over IP encoder"
            : family === "HDBaseT"
              ? "WyreStorm HDBaseT extension endpoint or wallplate"
              : `WyreStorm ${family} transport endpoint`,
        notes:
          family === "AVoIP"
            ? "Quantity follows the active source count."
            : "Quantity follows the required display or endpoint count.",
      });
    }

    if (tierProfile.rx) {
      addLine(lines, {
        sku: tierProfile.rx,
        quantity: displayCount,
        role: "AV decoder",
        description: "WyreStorm display-side AV over IP decoder",
        notes: "Quantity follows the active display count.",
      });
    }

    if (tierProfile.control) {
      addLine(lines, {
        sku: tierProfile.control,
        quantity: 1,
        role:
          family === "AVoIP"
            ? "AV system controller"
            : family === "Apollo"
              ? "Touch panel"
              : family === "Video Wall"
                ? "Multiview controller"
                : "System controller",
        description:
          family === "Apollo"
            ? "WyreStorm touch panel or room control surface"
            : family === "Video Wall"
              ? "WyreStorm multiview or video wall control processor"
              : "WyreStorm system control processor",
      });
    }
  }

  buildThirdPartyLines(input, lines);
  return Array.from(lines.values());
}
