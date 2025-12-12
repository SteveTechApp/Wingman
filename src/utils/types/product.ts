export interface Product {
    sku: string;
    name: string;
    category: string;
    description: string;
    tags: string[];

    msrp?: number;
    dealerPrice?: number;
    
    // Detailed Specifications
    videoIO?: {
        inputs: { type: string; count: number }[];
        outputs: { type: string; count: number }[];
    };
    hdmiVersion?: string;
    hdcpVersion?: string;
    rs232?: boolean;
    ethernet?: boolean;
    hdbaset?: {
        version: string; // e.g. "3.0", "2.0 Class A", "2.0 Class B"
        poh?: boolean;
    };
    usb?: {
        ports: { type: string; count: number }[]; // e.g. { type: 'USB-B Host', count: 1 }, { type: 'USB-A Device', count: 4 }
        bandwidth?: string; // e.g. "2.0 (480Mbps)", "3.2 Gen 1"
    };
    poe?: boolean;
    avoip?: {
        codec: 'H.264' | 'H.265' | 'JPEG-2000' | 'JPEG-XS' | 'SDVoE' | 'Uncompressed';
    };

    audio?: {
        inputs?: { type: string; count: number }[];
        outputs?: { type: string; count: number }[];
        dsp?: boolean;
        speakerphone?: boolean;
    };
    status?: 'active' | 'legacy' | 'eol';
    legacyReason?: string;
}