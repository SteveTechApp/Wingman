import * as React from "react";

export type TemplateLine = {
  sku: string;
  name: string;
  qty: number;
  role: string;
};

export type RoomTemplate = {
  id: string;
  name: string;
  tier: "Bronze" | "Silver" | "Gold";
  summary: string;
  notes?: string;
  lines: TemplateLine[];
};

export type RoomType = {
  id: string;
  name: string;
  summary: string;
  templates: RoomTemplate[];
};

export type VerticalMarket = {
  id: string;
  name: string;
  summary: string;
  roomTypes: RoomType[];
};

export const TEMPLATE_MARKETS: VerticalMarket[] = [
  {
    id: "corporate",
    name: "Corporate",
    summary: "Meeting rooms, boardrooms, hybrid spaces.",
    roomTypes: [
      {
        id: "huddle",
        name: "Huddle Room",
        summary: "Small collaboration room.",
        templates: [
          {
            id: "corp-huddle-bronze",
            name: "Bronze – Wired Presentation",
            tier: "Bronze",
            summary: "Single display, wired BYOD switching, cost-conscious baseline.",
            lines: [
              { sku: "SW-0201-HDBT", name: "2x1 HDMI / HDBaseT switcher", qty: 1, role: "switcher" },
              { sku: "RX-70-4K-G2", name: "HDBaseT receiver", qty: 1, role: "display endpoint" },
              { sku: "EXP-CON-KIT", name: "Control / connection pack", qty: 1, role: "ancillary" }
            ]
          },
          {
            id: "corp-huddle-silver",
            name: "Silver – BYOD / Hybrid",
            tier: "Silver",
            summary: "Wireless + wired input path with integrated collaboration flexibility.",
            lines: [
              { sku: "SW-640L-TX-W", name: "Presentation switcher / transmitter", qty: 1, role: "switcher" },
              { sku: "APO-DG2", name: "Apollo display interface", qty: 1, role: "dongle" },
              { sku: "RXV-70-4K", name: "4K receiver", qty: 1, role: "display endpoint" }
            ]
          },
          {
            id: "corp-huddle-gold",
            name: "Gold – Premium UC Ready",
            tier: "Gold",
            summary: "Enhanced user workflow, simplified room handoff and polished finish.",
            lines: [
              { sku: "APO-210-UC", name: "Apollo UC switcher", qty: 1, role: "switcher" },
              { sku: "APO-DG2", name: "Apollo device gateway", qty: 2, role: "dongle" },
              { sku: "CAB-CON-BUNDLE", name: "Connection bundle", qty: 1, role: "ancillary" }
            ]
          }
        ]
      },
      {
        id: "boardroom",
        name: "Boardroom",
        summary: "Premium multi-source room.",
        templates: [
          {
            id: "corp-board-bronze",
            name: "Bronze – Classic Boardroom",
            tier: "Bronze",
            summary: "Reliable switched presentation for traditional boardroom deployments.",
            lines: [
              { sku: "MX-0808-H2A", name: "8x8 HDMI matrix", qty: 1, role: "matrix" },
              { sku: "RX-70-4K-G2", name: "HDBaseT receiver", qty: 2, role: "display endpoint" },
              { sku: "SP-0104-H2", name: "1x4 splitter", qty: 1, role: "distribution" }
            ]
          },
          {
            id: "corp-board-silver",
            name: "Silver – Hybrid Boardroom",
            tier: "Silver",
            summary: "Dual display hybrid room with simplified switching and flexible source access.",
            lines: [
              { sku: "SW-640L-TX-W", name: "Presentation switcher / transmitter", qty: 1, role: "switcher" },
              { sku: "APO-DG2", name: "Apollo device gateway", qty: 2, role: "dongle" },
              { sku: "RXV-70-4K", name: "4K receiver", qty: 2, role: "display endpoint" }
            ]
          },
          {
            id: "corp-board-gold",
            name: "Gold – Executive Boardroom",
            tier: "Gold",
            summary: "Premium multi-source workflow with cleaner user interaction and BOM completeness.",
            lines: [
              { sku: "NHD-400-TX", name: "NetworkHD encoder", qty: 3, role: "AVoIP source" },
              { sku: "NHD-400-RX", name: "NetworkHD decoder", qty: 2, role: "AVoIP display" },
              { sku: "NHD-CTL-PRO", name: "NetworkHD control processor", qty: 1, role: "control" }
            ]
          }
        ]
      }
    ]
  },
  {
    id: "education",
    name: "Education",
    summary: "Teaching rooms and training spaces.",
    roomTypes: [
      {
        id: "classroom",
        name: "Classroom",
        summary: "Teacher-led display room.",
        templates: [
          {
            id: "edu-classroom-bronze",
            name: "Bronze – Standard Classroom",
            tier: "Bronze",
            summary: "Simple teacher-podium switching with one main display path.",
            lines: [
              { sku: "SW-0402-MV-HDMI", name: "4x2 HDMI switcher", qty: 1, role: "switcher" },
              { sku: "RX-70-4K-G2", name: "HDBaseT receiver", qty: 1, role: "display endpoint" },
              { sku: "USB-EXT-100", name: "USB extension set", qty: 1, role: "USB" }
            ]
          },
          {
            id: "edu-classroom-silver",
            name: "Silver – Hybrid Classroom",
            tier: "Silver",
            summary: "Better instructor flexibility and room-sharing workflow.",
            lines: [
              { sku: "APO-210-UC", name: "Apollo UC switcher", qty: 1, role: "switcher" },
              { sku: "APO-DG2", name: "Apollo device gateway", qty: 1, role: "dongle" },
              { sku: "RXV-70-4K", name: "4K receiver", qty: 1, role: "display endpoint" }
            ]
          },
          {
            id: "edu-classroom-gold",
            name: "Gold – Flexible Teaching Space",
            tier: "Gold",
            summary: "Higher-end room prepared for mixed teaching and presentation modes.",
            lines: [
              { sku: "NHD-200-TX", name: "NetworkHD encoder", qty: 2, role: "AVoIP source" },
              { sku: "NHD-200-RX", name: "NetworkHD decoder", qty: 2, role: "AVoIP display" },
              { sku: "NHD-CTL-LITE", name: "NetworkHD controller", qty: 1, role: "control" }
            ]
          }
        ]
      },
      {
        id: "training",
        name: "Training Room",
        summary: "Multi-source training space.",
        templates: [
          {
            id: "edu-training-bronze",
            name: "Bronze – Trainer Display Room",
            tier: "Bronze",
            summary: "One instructor display with straightforward switching.",
            lines: [
              { sku: "SW-0402-MV-HDMI", name: "4x2 HDMI switcher", qty: 1, role: "switcher" },
              { sku: "SP-0102-H2", name: "1x2 splitter", qty: 1, role: "distribution" },
              { sku: "RX-70-4K-G2", name: "HDBaseT receiver", qty: 2, role: "display endpoint" }
            ]
          },
          {
            id: "edu-training-silver",
            name: "Silver – Dual Display Training",
            tier: "Silver",
            summary: "Dual-screen session room with better presenter flexibility.",
            lines: [
              { sku: "SW-640L-TX-W", name: "Presentation switcher / transmitter", qty: 1, role: "switcher" },
              { sku: "RXV-70-4K", name: "4K receiver", qty: 2, role: "display endpoint" },
              { sku: "CAB-CON-BUNDLE", name: "Connection bundle", qty: 1, role: "ancillary" }
            ]
          },
          {
            id: "edu-training-gold",
            name: "Gold – Advanced Training Space",
            tier: "Gold",
            summary: "Scalable room with cleaner expansion path for larger rollouts.",
            lines: [
              { sku: "NHD-400-TX", name: "NetworkHD encoder", qty: 3, role: "AVoIP source" },
              { sku: "NHD-400-RX", name: "NetworkHD decoder", qty: 3, role: "AVoIP display" },
              { sku: "NHD-CTL-PRO", name: "NetworkHD control processor", qty: 1, role: "control" }
            ]
          }
        ]
      }
    ]
  },
  {
    id: "hospitality",
    name: "Hospitality",
    summary: "Suites, bars and guest-facing AV.",
    roomTypes: [
      {
        id: "suite",
        name: "Executive Suite",
        summary: "Premium hospitality AV room.",
        templates: [
          {
            id: "hosp-suite-bronze",
            name: "Bronze – Suite Display Package",
            tier: "Bronze",
            summary: "Simple suite display routing and source management.",
            lines: [
              { sku: "SW-0201-HDBT", name: "2x1 HDMI / HDBaseT switcher", qty: 1, role: "switcher" },
              { sku: "RX-70-4K-G2", name: "HDBaseT receiver", qty: 1, role: "display endpoint" },
              { sku: "IR-KIT", name: "IR kit", qty: 1, role: "control" }
            ]
          },
          {
            id: "hosp-suite-silver",
            name: "Silver – Premium Suite",
            tier: "Silver",
            summary: "Enhanced flexibility with improved input handling and cleaner user experience.",
            lines: [
              { sku: "SW-640L-TX-W", name: "Presentation switcher / transmitter", qty: 1, role: "switcher" },
              { sku: "RXV-70-4K", name: "4K receiver", qty: 1, role: "display endpoint" },
              { sku: "USB-EXT-100", name: "USB extension set", qty: 1, role: "USB" }
            ]
          },
          {
            id: "hosp-suite-gold",
            name: "Gold – Luxury Suite",
            tier: "Gold",
            summary: "Higher-tier hospitality package with stronger expansion path.",
            lines: [
              { sku: "NHD-200-TX", name: "NetworkHD encoder", qty: 2, role: "AVoIP source" },
              { sku: "NHD-200-RX", name: "NetworkHD decoder", qty: 2, role: "AVoIP display" },
              { sku: "NHD-CTL-LITE", name: "NetworkHD controller", qty: 1, role: "control" }
            ]
          }
        ]
      }
    ]
  },
  {
    id: "retail",
    name: "Retail",
    summary: "Signage and showroom display spaces.",
    roomTypes: [
      {
        id: "showroom",
        name: "Showroom Display Area",
        summary: "Multi-display retail signage zone.",
        templates: [
          {
            id: "retail-showroom-bronze",
            name: "Bronze – Dual Display Signage",
            tier: "Bronze",
            summary: "Entry signage package for simple content distribution.",
            lines: [
              { sku: "SP-0102-H2", name: "1x2 splitter", qty: 1, role: "distribution" },
              { sku: "RX-70-4K-G2", name: "HDBaseT receiver", qty: 2, role: "display endpoint" },
              { sku: "TX-70-4K", name: "HDBaseT transmitter", qty: 1, role: "source" }
            ]
          },
          {
            id: "retail-showroom-silver",
            name: "Silver – Multi-Zone Showroom",
            tier: "Silver",
            summary: "More flexible source routing for zones and promo loops.",
            lines: [
              { sku: "MX-0808-H2A", name: "8x8 HDMI matrix", qty: 1, role: "matrix" },
              { sku: "RX-70-4K-G2", name: "HDBaseT receiver", qty: 4, role: "display endpoint" },
              { sku: "EXP-CON-KIT", name: "Control / connection pack", qty: 1, role: "ancillary" }
            ]
          },
          {
            id: "retail-showroom-gold",
            name: "Gold – Dynamic Signage Platform",
            tier: "Gold",
            summary: "Scalable multi-display retail platform with future growth in mind.",
            lines: [
              { sku: "NHD-400-TX", name: "NetworkHD encoder", qty: 2, role: "AVoIP source" },
              { sku: "NHD-400-RX", name: "NetworkHD decoder", qty: 4, role: "AVoIP display" },
              { sku: "NHD-CTL-PRO", name: "NetworkHD control processor", qty: 1, role: "control" }
            ]
          }
        ]
      }
    ]
  }
];