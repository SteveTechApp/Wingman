import { Product } from '../../utils/types';

export const EXTENDERS: Product[] = [
    {
        sku: 'EX-40-G3', name: '1080p60 UTP Extender Set', category: 'Extender',
        description: 'IR Passthrough | PoC (1080p: 40m 131ft)',
        tags: ['Extender', '1080p', 'UTP', 'IR'],
        videoIO: { inputs: [{ type: 'HDMI', count: 1 }], outputs: [{ type: 'RJ45', count: 1 }] }, // on TX
        hdmiVersion: '1.4',
        hdcpVersion: '1.4',
        hdbaset: { version: 'UTP', poh: true },
    },
    {
        sku: 'EX-70-G2', name: '4K60Hz 4:2:0 HDBaseT Extender', category: 'Extender',
        description: 'PoH | CEC | IR | RS232 (4K: 35m/115ft, 1080p: 70m/230ft)',
        tags: ['Extender', 'HDBaseT', 'Class B', '4K30', '4:2:0', 'CEC', 'IR', 'RS232'],
        status: 'legacy',
        legacyReason: 'This extender uses older HDBaseT technology limited to 4K 4:2:0 chroma subsampling. For full 4K60 4:4:4, consider newer HDBaseT 3.0 or AVoIP solutions.',
        videoIO: { inputs: [{ type: 'HDMI', count: 1 }], outputs: [{ type: 'HDBaseT', count: 1 }] }, // on TX
        hdmiVersion: '2.0',
        hdcpVersion: '2.2',
        rs232: true,
        hdbaset: { version: '2.0 Class B', poh: true },
    },
];