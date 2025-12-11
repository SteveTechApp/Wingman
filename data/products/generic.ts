import { Product } from '../../utils/types';

export const GENERIC_DEVICES: Product[] = [
    {
        sku: 'GEN-PC', name: 'Dedicated Room PC', category: 'Source',
        description: 'A dedicated in-room computer for running presentations and video conferencing software.',
        tags: ['Source', 'PC'],
        videoIO: {
            inputs: [],
            outputs: [{ type: 'HDMI', count: 1 }, { type: 'DisplayPort', count: 1 }]
        },
        usb: {
            ports: [{ type: 'USB-A', count: 4 }]
        },
        ethernet: true,
    },
    {
        sku: 'GEN-DOC-CAM', name: 'Document Camera', category: 'Source',
        description: 'A camera for displaying physical documents or objects to the main screen. Common in education.',
        tags: ['Source', 'Camera'],
        videoIO: {
            inputs: [],
            outputs: [{ type: 'HDMI', count: 1 }, { type: 'USB', count: 1 }]
        },
        usb: {
            ports: [{ type: 'USB-B', count: 1 }]
        }
    },
    {
        sku: 'GEN-USB-CAM',
        name: 'Generic 4K USB Webcam',
        category: 'Camera',
        description: 'A high-quality 4K USB webcam with a wide-angle lens, suitable for huddle spaces and small to medium meeting rooms.',
        tags: ['Camera', 'USB', '4K', 'Webcam'],
        usb: {
            ports: [{ type: 'USB-C', count: 1 }],
            bandwidth: '3.0'
        },
    },
    {
        sku: 'GEN-PTZ-CAM',
        name: 'Generic 4K PTZ Camera',
        category: 'Camera',
        description: 'A professional 4K pan-tilt-zoom camera with 12x optical zoom, USB, and IP streaming. Ideal for larger rooms and lecture halls.',
        tags: ['Camera', 'PTZ', '4K', 'USB', '12x Zoom', 'USB3.0', 'IP Stream', 'HDMI'],
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
];