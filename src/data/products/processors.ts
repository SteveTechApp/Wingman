
import * as React from "react";
import { Product } from '../../utils/types';

export const VIDEO_PROCESSORS: Product[] = [
    {
        sku: 'SW-0204-VW', name: '4K 60Hz 4-Output Video Wall', category: 'Video Processor',
        description: '1x4, 2x2 layout | Ultra-wide resolution support | WEB GUI and RS232 control. A dedicated fixed-I/O processor for driving a single-source video wall.',
        tags: ['Video Wall', 'Processor', '4K60', '2x2', '1x4', 'RS232'],
        videoIO: {
            inputs: [{ type: 'HDMI', count: 1 }, { type: 'DisplayPort', count: 1 }],
            outputs: [{ type: 'HDMI', count: 4 }]
        },
        hdmiVersion: '2.0',
        hdcpVersion: '2.2',
        rs232: true,
        ethernet: true,
    },
    {
        sku: 'SW-0206-VW', name: '4K 60Hz 6-Output Video Wall', category: 'Video Processor',
        description: 'Cascading up to 6 devices | Multi-fast layout and customized layout | Ultra-wide resolution support | WEB GUI and RS232 control. A fixed-I/O wall processor that may need an upstream switcher if many live sources must be selected.',
        tags: ['Video Wall', 'Processor', '4K60', 'Cascading', 'RS232'],
        videoIO: {
            inputs: [{ type: 'HDMI', count: 1 }, { type: 'DisplayPort', count: 1 }],
            outputs: [{ type: 'HDMI', count: 6 }]
        },
        hdmiVersion: '2.0',
        hdcpVersion: '2.2',
        rs232: true,
        ethernet: true,
    },
    {
        sku: 'NHD-0401-MV', name: 'NetworkHD 4-Input Multiview Switcher', category: 'Video Processor',
        description: 'Receives up to 4 compatible AVoIP streams and displays them on a single screen in various layouts (quad, PiP, etc.). Best treated as a dedicated multiview compositor for compatible NetworkHD workflows, not as a generic wall decoder.',
        tags: ['Multiview', 'NetworkHD', 'Processor', '4-input', '4K60', 'Audio De-embed', 'HDR'],
        videoIO: {
            inputs: [{ type: 'RJ45', count: 4 }], // AVoIP streams
            outputs: [{ type: 'HDMI', count: 1 }]
        },
        hdmiVersion: '2.0b',
        hdcpVersion: '2.2',
        ethernet: true,
        poe: true,
        avoip: { codec: 'JPEG-XS' } // Can decode JPEG-XS or JPEG2000 streams
    },
];



