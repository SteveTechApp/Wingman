export type CompetitorCategory = "AVoIP" | "Matrix" | "Switcher" | "Extender" | "VideoWall" | "Control" | "Accessory";
export type CompetitorRole = "TX" | "RX" | "TRX" | "Controller" | "Processor" | "Matrix" | "Switcher" | "Accessory";
export type LatencyClass = "ultra-low" | "low" | "standard" | "unknown";
export type CompetitorVideoCaps = { maxResolution?: "1080p60" | "4K30" | "4K60" | "4K120"; hdmi?: "1.4" | "2.0" | "2.1"; hdr?: boolean; };
export type IOCaps = { inputs?: number; outputs?: number; };
export type CompetitorItem = { brand: string; model: string; name: string; category: CompetitorCategory; role: CompetitorRole; tags?: string[]; features?: string[]; latency?: LatencyClass; io?: IOCaps; video?: CompetitorVideoCaps; notes?: string[]; };
export type MatchResult = { competitor: CompetitorItem; sku: string; name: string; confidence: number; reasons: string[]; };
