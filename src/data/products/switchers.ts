
import { Product } from '../../utils/types';

export const SWITCHERS_PRESENTATION: Product[] = [
    {
        sku: 'SW-220-TX-W',
        name: '2x1 4K Wireless Presentation Switcher',
        category: 'Presentation Switcher',
        description: 'A cost-effective 2x1 switcher (HDMI, USB-C) with native wireless casting (AirPlay/Miracast). Ideal for huddle spaces requiring simple screen sharing. Compatible with APO-DG1 dongles.',
        tags: ['Switcher', 'Wireless', 'Casting', '4K', 'Bronze', '2x1', 'HDMI', 'USB-C', 'AirPlay', 'Miracast']
    },
    {
        sku: 'SW-0201-4K',
        name: '2x1 USB-C & HDMI Switcher',
        category: 'Presentation Switcher',
        description: 'A compact 2x1 presentation switcher with HDMI and USB-C inputs, featuring auto-switching.',
        tags: ['Switcher', 'USB-C', '4K', 'Bronze', 'HDMI', 'Auto-switching', '2x1'],
        status: 'legacy',
        legacyReason: 'Consider the SW-220-TX-W for integrated wireless capabilities.',
        videoIO: {
            inputs: [{ type: 'HDMI', count: 1 }, { type: 'USB-C', count: 1 }],
            outputs: [{ type: 'HDMI', count: 1 }]
        },
        hdmiVersion: '2.0',
        hdcpVersion: '2.2',
        usb: { ports: [{ type: 'USB-C', count: 1 }] }
    },
    {
        sku: 'SW-0401-H2',
        name: '4x1 4K/60Hz 4:2:0 HDMI Switcher',
        category: 'Presentation Switcher',
        description: 'A simple and reliable 4-input HDMI switcher with auto-switching functionality. Ideal for basic meeting rooms.',
        tags: ['Switcher', 'HDMI', '4K', 'Bronze', '4x1', '4K30', '4:2:0', 'Auto-switching'],
        videoIO: {
            inputs: [{ type: 'HDMI', count: 4 }],
            outputs: [{ type: 'HDMI', count: 1 }]
        },
        hdmiVersion: '2.0',
        hdcpVersion: '2.2',
        rs232: true,
    },
    {
        sku: 'SW-340-TX',
        name: '3-Input HDBaseT Presentation Switcher with USB-C',
        category: 'Presentation Switcher',
        description: 'A versatile 3-input presentation switcher with 2x HDMI and 1x USB-C inputs. Features an HDBaseT output for long-distance transmission to a display, USB host, and auto-switching.',
        tags: ['Switcher', 'HDBaseT', 'USB-C', '4K', 'Silver', '3x1', 'USB Host', 'Auto-switching'] },
    {
        sku: 'SW-510-TX',
        name: '5-Input 4K HDBaseT Presentation Switcher',
        category: 'Presentation Switcher',
        description: '5-input HDBaseT/HDMI/VGA/DP switcher with scaling and CEC control. A workhorse for any modern meeting room.',
        tags: ['HDBaseT', '4K', 'Switcher', 'CEC', 'Silver', '5x1', 'HDMI', 'VGA', 'DisplayPort', 'Scaling'],
        videoIO: {
            inputs: [{ type: 'HDMI', count: 3 }, { type: 'VGA', count: 1 }, { type: 'DisplayPort', count: 1 }],
            outputs: [{ type: 'HDBaseT', count: 1 }, { type: 'HDMI', count: 1 }] // Mirrored
        },
        hdmiVersion: '2.0',
        hdcpVersion: '2.2',
        rs232: true,
        ethernet: true,
        hdbaset: { version: '2.0 Class A', poh: true }
    },
    {
        sku: 'SW-620-TX-W',
        name: '4-Input 4K Wireless Presentation Switcher',
        category: 'Presentation Switcher',
        description: 'Advanced 4-input switcher (HDMI/USB-C) with native wireless casting and Dual-View. Compatible with APO-DG2 for full Wireless BYOM (USB peripheral) support.',
        tags: ['Switcher', 'Wireless', 'BYOM', 'Casting', '4K', 'Silver', '4x1', 'Dual-View', 'USB-C', 'DG2', 'USB Host'],
        videoIO: {
            inputs: [{ type: 'HDMI', count: 2 }, { type: 'USB-C', count: 1 }],
            outputs: [{ type: 'HDMI', count: 2 }]
        },
        hdmiVersion: '2.0',
        usb: { ports: [{ type: 'USB-C', count: 1 }, { type: 'USB-B Host', count: 1 }] }
    },
    {
        sku: 'SW-640L-TX-W',
        name: '6-Input 4K/60Hz Presentation Switcher with USB-C & Wireless Casting',
        category: 'Presentation Switcher',
        description: 'A high-performance dual-output 4K presentation switcher. Features multiple wired inputs (HDMI, DP, USB-C) and native wireless casting compatible with the APO-DG2 dongle for a full Wireless BYOM experience. Supports up to 4 simultaneous wireless devices.',
        tags: ['Switcher', 'USB-C', 'Casting', '4K', 'Gold', '6x2', 'Dual Output', 'USB Host', 'BYOM', 'Wireless', 'DG2'],
        videoIO: {
            inputs: [{ type: 'HDMI', count: 3 }, { type: 'USB-C', count: 2 }, { type: 'DisplayPort', count: 1}],
            outputs: [{ type: 'HDMI', count: 2 }] // Independent outputs
        },
        hdmiVersion: '2.0b',
        hdcpVersion: '2.2',
        rs232: true,
        ethernet: true,
        usb: { ports: [{ type: 'USB-C', count: 2 }, { type: 'USB-B Host', count: 2 }, { type: 'USB-A Device', count: 2 }], bandwidth: '3.0' }
    },
];

export const SWITCHERS_MATRIX: Product[] = [
     {
        sku: 'MX-0402-H2-MST',
        name: '4x2 4K Matrix with MST Dual-Screen Extension',
        category: 'Matrix Switcher',
        description: '4x2 4K matrix switcher featuring MST (Multi-Stream Transport) technology. This allows a user to connect a SINGLE USB-C cable and extend their desktop to TWO independent displays. Perfect for medium conference rooms with dual displays requiring simple laptop connectivity.',
        tags: ['Matrix', 'Multiview', '4K', 'Silver', '4x2', 'Scaling', 'MST', 'Dual Display', 'USB-C'],
        videoIO: {
            inputs: [{ type: 'HDMI', count: 4 }],
            outputs: [{ type: 'HDMI', count: 2 }]
        },
        hdmiVersion: '2.0',
        hdcpVersion: '2.2',
        rs232: true,
        ethernet: true,
    },
    {
        sku: 'MX-0403-H3-MST',
        name: 'Synergy 4K60Hz HDR 4x3 HDMI & USB-C Matrix Switcher',
        category: 'Matrix Switcher',
        description: 'Advanced 4x3 Matrix with HDBaseT 3.0 and MST technology. Allows a single USB-C connection to drive dual extended screens. HDBaseT 3.0 output enables uncompressed extension to a projector or third screen.',
        tags: ['Matrix', 'USB-C', 'HDBT3.0', 'MST', '4x3', '4K60', 'HDR', 'HDMI', 'USB Passthrough', 'Scaling', 'Dual Display'],
        videoIO: {
            inputs: [{ type: 'HDMI', count: 2 }, { type: 'USB-C', count: 2}],
            outputs: [{ type: 'HDMI', count: 2}, { type: 'HDBaseT', count: 1}]
        },
        hdmiVersion: '2.1',
        hdcpVersion: '2.3',
        rs232: true,
        ethernet: true,
        hdbaset: { version: '3.0' },
        usb: {
            ports: [{ type: 'USB-C', count: 2 }, { type: 'USB-B Host', count: 2 }, { type: 'USB-A Device', count: 2 }],
            bandwidth: '3.2 Gen 1'
        }
    },
    {
        sku: 'MX-0804-EDU',
        name: '8x4 Education Matrix Switcher',
        category: 'Matrix Switcher',
        description: 'An 8-input, 4-output matrix designed for classrooms with mic inputs and powerful audio mixing.',
        tags: ['Matrix', 'Education', 'Audio', 'Silver', '8x4', 'Microphone Input', 'Audio Mixer'],
        videoIO: {
            inputs: [{ type: 'HDMI', count: 6 }, { type: 'VGA', count: 2 }],
            outputs: [{ type: 'HDBaseT', count: 2 }, { type: 'HDMI', count: 2 }]
        },
        hdmiVersion: '1.4',
        hdcpVersion: '1.4',
        rs232: true,
        ethernet: true,
        hdbaset: { version: '2.0 Class A', poh: true },
        audio: { inputs: [{ type: 'Mic', count: 2 }], dsp: true }
    },
    {
        sku: 'MX-1007-HYB',
        name: '10x7 Hybrid HDBaseT/HDMI Matrix Switcher',
        category: 'Matrix Switcher',
        description: 'A powerful hybrid matrix with 10 inputs (HDMI, HDBaseT) and 7 outputs, with integrated audio DSP. Ideal for large boardrooms or divisible spaces.',
        tags: ['Matrix', 'HDBaseT', 'DSP', '4K', 'Gold', '10x7', 'HDMI'],
        videoIO: {
            inputs: [{ type: 'HDMI', count: 5 }, { type: 'HDBaseT', count: 5 }],
            outputs: [{ type: 'HDBaseT', count: 5 }, { type: 'HDMI', count: 2 }]
        },
        hdmiVersion: '2.0',
        hdcpVersion: '2.2',
        rs232: true,
        ethernet: true,
        hdbaset: { version: '2.0 Class A', poh: true },
        audio: { dsp: true }
    },
];
