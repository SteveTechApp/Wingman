
import * as React from "react";
import { Product } from '../../utils/types';

export const AVOIP_PRODUCTS: Product[] = [
    // 100 SERIES - H.264
    {
        sku: 'NHD-120-TX',
        name: 'NetworkHD 120 Series 4K H.264/H.265 Encoder',
        category: 'AVoIP Encoder',
        description: 'A cost-effective "Bronze" tier AVoIP encoder using a low-bandwidth (10-30Mbps) H.264/H.265 stream. Ideal for budget-conscious projects, digital signage, or large-scale deployments on existing 1GbE networks where minimizing network impact is critical. Does not support video wall bezel compensation.',
        tags: ['NetworkHD', 'AVoIP', 'Encoder', '4K', 'H.264', 'H.265', '1GbE', '4K30', 'Bronze'],
        videoIO: { inputs: [{ type: 'HDMI', count: 1 }], outputs: [{ type: 'RJ45', count: 1 }] },
        hdmiVersion: '1.4',
        hdcpVersion: '2.2',
        rs232: true,
        ethernet: true,
        poe: true,
        avoip: { codec: 'H.264' }
    },
    {
        sku: 'NHD-120-RX',
        name: 'NetworkHD 120 Series 4K H.264/H.265 Decoder',
        category: 'AVoIP Decoder',
        description: 'A cost-effective "Bronze" tier AVoIP decoder for the low-bandwidth NetworkHD 120 series. Ideal for digital signage and large-scale distribution where network efficiency is a priority. Does not support video wall bezel compensation.',
        tags: ['NetworkHD', 'AVoIP', 'Decoder', '4K', 'H.264', 'H.265', '1GbE', '4K30', 'Bronze'],
        videoIO: { inputs: [{ type: 'RJ45', count: 1 }], outputs: [{ type: 'HDMI', count: 1 }] },
        hdmiVersion: '1.4',
        hdcpVersion: '2.2',
        rs232: true,
        ethernet: true,
        poe: true,
        avoip: { codec: 'H.264' }
    },
    {
        sku: 'NHD-150-RX',
        name: 'NetworkHD 150 Series Multiview Receiver',
        category: 'AVoIP Decoder',
        description: 'A specialized multiview receiver for the low-bandwidth 100/120 Series. It can display up to 9 sources on a single output using tile or overlay layouts. Use it as a single composite display feed or upstream of another processor, not as a generic per-panel video wall decoder.',
        tags: ['NetworkHD', 'AVoIP', 'Decoder', 'Multiview', '1GbE', 'H.264'],
        videoIO: { inputs: [{ type: 'RJ45', count: 1 }], outputs: [{ type: 'HDMI', count: 1 }] },
        hdmiVersion: '1.4',
        hdcpVersion: '2.2',
        ethernet: true,
        poe: true,
        avoip: { codec: 'H.264' }
    },

    // 400 SERIES - JPEG2000 (LEGACY)
    {
        sku: 'NHD-400-TX',
        name: 'NetworkHD 400 Series 4K JPEG2000 Encoder',
        category: 'AVoIP Encoder',
        description: 'Legacy visually lossless 4K30 4:4:4 video over 1GbE with JPEG2000 compression. Does not support multiview on its own, requires NHD-0401-MV.',
        tags: ['NetworkHD', 'AVoIP', 'Encoder', '4K', 'JPEG-2000', '1GbE', '4K30', '4:4:4'],
        videoIO: { inputs: [{ type: 'HDMI', count: 1 }], outputs: [{ type: 'RJ45', count: 1 }] },
        hdmiVersion: '2.0',
        hdcpVersion: '2.2',
        rs232: true,
        ethernet: true,
        poe: true,
        avoip: { codec: 'JPEG-2000' },
        status: 'legacy',
        legacyReason: 'The 400 Series has been superseded by the 500 Series, which uses the more efficient JPEG-XS codec and offers Dante audio support.'
    },
    {
        sku: 'NHD-400-RX',
        name: 'NetworkHD 400 Series 4K JPEG2000 Decoder',
        category: 'AVoIP Decoder',
        description: 'Decoder for the NetworkHD 400 JPEG2000 series. Supports bezel correction for video walls.',
        tags: ['NetworkHD', 'AVoIP', 'Decoder', '4K', 'JPEG-2000', '1GbE', '4K30', '4:4:4'],
        videoIO: { inputs: [{ type: 'RJ45', count: 1 }], outputs: [{ type: 'HDMI', count: 1 }] },
        hdmiVersion: '2.0',
        hdcpVersion: '2.2',
        rs232: true,
        ethernet: true,
        poe: true,
        avoip: { codec: 'JPEG-2000' },
        status: 'legacy',
        legacyReason: 'The 400 Series has been superseded by the 500 Series, which uses the more efficient JPEG-XS codec and offers Dante audio support.'
    },

    // 500 SERIES - JPEG 2000
    {
        sku: 'NHD-500-TX',
        name: 'NetworkHD 500 Series 4K60 JPEG 2000 Encoder',
        category: 'AVoIP Encoder',
        description: 'A "Silver" tier AVoIP encoder for high-quality AV over 1GbE. It uses JPEG 2000 compression for visually lossless 4K60 4:4:4-class transport with very low latency, making it a strong fit for premium signage, TV, and live presentation environments. Multiview requires a separate compatible processor such as NHD-0401-MV.',
        tags: ['NetworkHD', 'AVoIP', 'Encoder', '4K', 'JPEG-2000', 'Dante', '1GbE', '4K60', '4:4:4', 'Low Latency', 'Silver'],
        videoIO: { inputs: [{ type: 'HDMI', count: 1 }], outputs: [{ type: 'RJ45', count: 1 }] },
        hdmiVersion: '2.0b',
        hdcpVersion: '2.2',
        rs232: true,
        ethernet: true,
        poe: true,
        avoip: { codec: 'JPEG-2000' },
        audio: { dsp: true }
    },
    {
        sku: 'NHD-500-RX',
        name: 'NetworkHD 500 Series 4K60 JPEG 2000 Decoder',
        category: 'AVoIP Decoder',
        description: 'A "Silver" tier AVoIP decoder for the high-quality NetworkHD 500 series. It decodes JPEG 2000 streams for visually lossless 4K60-class video and supports video-wall features, audio breakout, RS-232, IR passthrough, and USB 2.0/KVM workflows on supported designs. Does not have built-in multiview composition.',
        tags: ['NetworkHD', 'AVoIP', 'Decoder', '4K', 'JPEG-2000', 'Dante', '1GbE', '4K60', '4:4:4', 'USB', 'KVM', 'Silver', 'Video Wall'],
        videoIO: { inputs: [{ type: 'RJ45', count: 1 }], outputs: [{ type: 'HDMI', count: 1 }] },
        hdmiVersion: '2.0b',
        hdcpVersion: '2.2',
        rs232: true,
        ethernet: true,
        poe: true,
        avoip: { codec: 'JPEG-2000' },
        usb: { ports: [{ type: 'USB-B Host', count: 1 }, { type: 'USB-A Device', count: 2 }], bandwidth: '2.0 (480Mbps)'},
        audio: { dsp: true }
    },
    {
        sku: 'NHD-500-E-TX',
        name: 'NetworkHD 500 Series 4K60 JPEG 2000 Encoder (HDMI Only)',
        category: 'AVoIP Encoder',
        description: 'A cost-effective "essentials" version of the 500-series encoder. It provides the same visually lossless 4K60 JPEG 2000 video path without the richer audio and USB features, making it a good fit for straightforward HDMI-only source distribution.',
        tags: ['NetworkHD', 'AVoIP', 'Encoder', '4K', 'JPEG-2000', '1GbE', '4K60', '4:4:4', 'Low Latency', 'Video Wall'],
        videoIO: { inputs: [{ type: 'HDMI', count: 1 }], outputs: [{ type: 'RJ45', count: 1 }] },
        hdmiVersion: '2.0b',
        hdcpVersion: '2.2',
        rs232: true,
        ethernet: true,
        poe: true,
        avoip: { codec: 'JPEG-2000' }
    },
    {
        sku: 'NHD-500-E-RX',
        name: 'NetworkHD 500 Series 4K60 JPEG 2000 Decoder (HDMI Only)',
        category: 'AVoIP Decoder',
        description: 'A cost-effective "essentials" version of the 500-series decoder. It provides the same visually lossless 4K60 output and is well suited to display endpoints and video-wall panels that do not need USB/KVM or advanced audio features.',
        tags: ['NetworkHD', 'AVoIP', 'Decoder', '4K', 'JPEG-2000', '1GbE', '4K60', '4:4:4', 'Low Latency', 'Video Wall'],
        videoIO: { inputs: [{ type: 'RJ45', count: 1 }], outputs: [{ type: 'HDMI', count: 1 }] },
        hdmiVersion: '2.0b',
        hdcpVersion: '2.2',
        rs232: true,
        ethernet: true,
        poe: true,
        avoip: { codec: 'JPEG-2000' }
    },
    
    // 600 SERIES - UNCOMPRESSED 10GbE
    {
        sku: 'NHD-600-TRX',
        name: 'NetworkHD 600 Series 4K60 10GbE Transceiver',
        category: 'AVoIP Transceiver',
        description: 'The ultimate "Gold" tier AVoIP solution, representing the best choice for video walls and mission-critical applications. This transceiver delivers pixel-perfect, zero-latency uncompressed 4K60 4:4:4 video performance over a 10GbE network. It features powerful, built-in multiview with up to 16 customizable windows. As a true transceiver, it can be configured as an Encoder, a Decoder, or both simultaneously. This enables unique applications, such as working on a local PC while also receiving a feed from another remote encoder on the same device. It is the required solution where video quality and speed are non-negotiable.',
        tags: ['NetworkHD', 'AVoIP', 'Transceiver', '4K', 'Uncompressed', '10GbE', '4K60', '4:4:4', 'Zero Latency', 'Multiview', 'Gold'],
        videoIO: { inputs: [{ type: 'HDMI', count: 1 }], outputs: [{ type: 'SFP+', count: 1 }] },
        hdmiVersion: '2.0b',
        hdcpVersion: '2.2',
        rs232: true,
        ethernet: true,
        poe: true,
        avoip: { codec: 'Uncompressed' }
    },
    {
        sku: 'NHD-610-TX',
        name: 'NetworkHD 600 Series Multi-Input 10GbE Encoder w/ Dante',
        category: 'AVoIP Encoder',
        description: 'A premium, multi-input 10GbE encoder for the NetworkHD 600 series. With inputs for HDMI, USB-C, and DisplayPort, it offers maximum source flexibility. A dedicated hardware Dante port ensures robust, broadcast-quality audio integration for the most demanding professional applications.',
        tags: ['NetworkHD', 'AVoIP', 'Encoder', '10GbE', 'Uncompressed', 'Dante', 'USB-C', 'DisplayPort'],
        videoIO: { inputs: [{ type: 'HDMI', count: 1 }, { type: 'USB-C', count: 1 }, { type: 'DisplayPort', count: 1 }], outputs: [{ type: 'SFP+', count: 1 }] },
        hdmiVersion: '2.0b',
        hdcpVersion: '2.2',
        rs232: true,
        ethernet: true,
        poe: true,
        avoip: { codec: 'Uncompressed' },
        audio: { inputs: [{ type: 'Dante', count: 1 }], dsp: true }
    },
    {
        sku: 'NHD-610-RX',
        name: 'NetworkHD 600 Series 10GbE Decoder w/ Dante',
        category: 'AVoIP Decoder',
        description: '10GbE decoder for the 600 series with a dedicated hardware Dante port for de-embedding audio to a local sound system.',
        tags: ['NetworkHD', 'AVoIP', 'Decoder', '10GbE', 'Uncompressed', 'Dante'],
        videoIO: { inputs: [{ type: 'SFP+', count: 1 }], outputs: [{ type: 'HDMI', count: 1 }] },
        hdmiVersion: '2.0b',
        hdcpVersion: '2.2',
        rs232: true,
        ethernet: true,
        poe: true,
        avoip: { codec: 'Uncompressed' },
        audio: { outputs: [{ type: 'Dante', count: 1 }], dsp: true }
    },
    
    // CONTROLLERS
    {
        sku: 'NHD-CTL-PRO',
        name: 'NetworkHD Pro Controller v2',
        category: 'Control',
        description: 'The brain of any NetworkHD system. This centralized controller is a MANDATORY component REQUIRED for ALL NetworkHD deployments, regardless of series. It provides the web interface for all system configuration and signal routing, and is the single point of control for all third-party integrations via its API.',
        tags: ['NetworkHD', 'Control', 'Controller'],
        ethernet: true,
    },
];



