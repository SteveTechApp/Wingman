import type { TemplateSeed } from "@/features/systemDesign/designTypes";

export const TEMPLATE_STORAGE_KEY = "wm_template_seed";

export const TEMPLATE_SEEDS: TemplateSeed[] = [
  {
    id: "small-meeting-room",
    name: "Small Meeting Room",
    vertical: "Corporate",
    roomType: "Meeting Room",
    defaultFamilies: ["Apollo"],
    assumptions: [
      "Single primary display",
      "USB-C BYOD expected",
      "Compact collaboration workflow",
      "Basic room control"
    ],
    starterDevices: [
      { id: "src-1", name: "Laptop / BYOD Source", role: "source", location: "Table" },
      { id: "disp-1", name: "Main Display", role: "display", location: "Front Wall" },
      { id: "switch-1", name: "Apollo / Collaboration Core", role: "switcher", manufacturer: "WyreStorm", family: "Apollo", location: "Display / Rack" }
    ],
  },
  {
    id: "boardroom-dual-display",
    name: "Boardroom Dual Display",
    vertical: "Corporate",
    roomType: "Boardroom",
    defaultFamilies: ["Apollo", "HDBaseT"],
    assumptions: [
      "Two main displays",
      "Table connectivity and rack integration",
      "USB peripherals and control expected",
      "Professional finish with longer installed routes"
    ],
    starterDevices: [
      { id: "src-1", name: "Table Source / BYOD", role: "source", location: "Table" },
      { id: "src-2", name: "In-room PC", role: "source", location: "Rack" },
      { id: "disp-1", name: "Display Left", role: "display", location: "Front Wall" },
      { id: "disp-2", name: "Display Right", role: "display", location: "Front Wall" },
      { id: "switch-1", name: "Switching Core", role: "switcher", manufacturer: "WyreStorm", family: "Apollo / Matrix", location: "Rack" }
    ],
  },
  {
    id: "training-room-divisible",
    name: "Training Room / Divisible Space",
    vertical: "Corporate / Education",
    roomType: "Training Room",
    defaultFamilies: ["HDBaseT", "Matrix"],
    assumptions: [
      "Multiple displays or divisible zones",
      "Longer routes likely",
      "Control and audio integration expected",
      "Flexible source routing required"
    ],
    starterDevices: [
      { id: "src-1", name: "Presenter Source", role: "source", location: "Lectern" },
      { id: "src-2", name: "In-room PC", role: "source", location: "Rack" },
      { id: "disp-1", name: "Display Zone A", role: "display", location: "Front Wall" },
      { id: "disp-2", name: "Display Zone B", role: "display", location: "Side Wall" },
      { id: "switch-1", name: "Matrix / Distribution Core", role: "switcher", manufacturer: "WyreStorm", family: "Matrix", location: "Rack" }
    ],
  },
  {
    id: "video-wall-lobby",
    name: "Lobby Video Wall",
    vertical: "Corporate / Retail",
    roomType: "Video Wall",
    defaultFamilies: ["Video Wall", "AVoIP"],
    assumptions: [
      "Multiple display surfaces",
      "Video wall or processor-driven layout",
      "Centralised source and control",
      "High visual impact environment"
    ],
    starterDevices: [
      { id: "src-1", name: "Media Player", role: "source", location: "Rack" },
      { id: "proc-1", name: "Wall Processor", role: "processor", location: "Rack" },
      { id: "disp-1", name: "Video Wall Display Array", role: "display", location: "Front Wall" }
    ],
  },
];

export function readTemplateSeed(): TemplateSeed | null {
  try {
    const raw = localStorage.getItem(TEMPLATE_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as TemplateSeed;
  } catch {
    return null;
  }
}

export function writeTemplateSeed(seed: TemplateSeed) {
  try {
    localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(seed));
  } catch {
  }
}