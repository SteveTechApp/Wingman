import { Product } from '../../utils/types';

export const CAMERAS: Product[] = [
    {
        sku: 'CAM-200-PTZ',
        name: '4K Pro PTZ Camera',
        category: 'Camera',
        description: 'Professional 4K pan-tilt-zoom camera with 12x optical zoom, USB 3.0, and IP streaming. Ideal for larger rooms and lecture halls.',
        tags: ['Camera', 'PTZ', '4K', 'USB', '12x Zoom', 'USB3.0', 'IP Stream'],
        status: 'legacy',
        legacyReason: 'This model is being phased out. For new designs, please consider alternative camera solutions.',
        videoIO: {
            inputs: [],
            outputs: [{ type: 'HDMI', count: 1 }, { type: 'USB', count: 1 }, { type: 'IP Stream', count: 1 }]
        },
        hdmiVersion: '2.0',
        rs232: true,
        ethernet: true,
        poe: true,
        usb: {
            ports: [{ type: 'USB-B', count: 1 }],
            bandwidth: '3.0'
        }
    },
    {
        sku: 'CAM-210-PTZ',
        name: '4K AI Tracking PTZ Camera with NDI|HX3',
        category: 'Camera',
        description: 'A professional 4K60Hz PTZ camera with powerful AI tracking capabilities to automatically follow a presenter. Features 12x optical zoom and multiple simultaneous outputs including HDMI, USB 3.0, and IP streaming with NDI|HX3 support.',
        tags: ['Camera', 'PTZ', '4K', 'USB', '12x Zoom', 'AI Tracking', 'IP Stream', 'HDMI', 'NDI'],
        status: 'active',
        videoIO: {
            inputs: [],
            outputs: [{ type: 'HDMI', count: 1 }, { type: 'USB', count: 1 }, { type: 'IP Stream', count: 1 }]
        },
        hdmiVersion: '2.0',
        rs232: true,
        ethernet: true,
        poe: true,
        usb: {
            ports: [{ type: 'USB-B', count: 1 }],
            bandwidth: '3.0'
        }
    },
    {
        sku: 'CAM-100-4K',
        name: '4K USB ePTZ Camera',
        category: 'Camera',
        description: 'A compact 4K USB camera with a wide 120-degree field of view and electronic pan-tilt-zoom (ePTZ). Ideal for huddle spaces and small meeting rooms. Simple USB-C connection.',
        tags: ['Camera', 'USB', '4K', 'Webcam', 'ePTZ', 'Wide-angle'],
        status: 'active',
        videoIO: {
            inputs: [],
            outputs: [{ type: 'USB', count: 1 }]
        },
        usb: {
            ports: [{ type: 'USB-C', count: 1 }],
            bandwidth: '3.0'
        }
    }
];