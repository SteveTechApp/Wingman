import { Product } from '../../utils/types';

export const AUDIO_SYSTEMS: Product[] = [
    {
        sku: 'AMP-260-DNT', name: '120W Network Amplifier', category: 'Amplifier',
        description: '2 x 60w or 4 x 25w Channel Output @ 4ohm | Dual Power Options | Advanced DSP with Dante Integration',
        tags: ['Amplifier', 'Dante', 'DSP', 'Low Impedance'],
        ethernet: true,
        audio: {
            inputs: [{ type: 'Dante', count: 2 }, { type: 'Analog Stereo', count: 2}],
            outputs: [{ type: 'Speaker Level', count: 4 }],
            dsp: true
        }
    },
    {
        sku: 'APO-SKY-MIC', name: 'Apollo™ companion Add-On Ceiling Mic', category: 'Microphone',
        description: 'RJ45 connection',
        tags: ['Microphone', 'Ceiling'],
    },
    {
        sku: 'COM-MIC-HUB', name: 'Microphone Hub | Microphone Mixer', category: 'Audio Processor',
        description: 'AEC & AGC & ANR | Web-UI',
        tags: ['DSP', 'Microphone', 'Mixer', 'AEC', 'AGC'],
        ethernet: true,
        usb: { ports: [{ type: 'USB-B', count: 1 }], bandwidth: '2.0'},
        audio: {
            inputs: [{ type: 'Proprietary Mic', count: 4 }],
            dsp: true
        }
    },
    {
        sku: 'EXP-CON-AUD-H2', name: '4K60Hz 4:4:4 HDMI 2.0 Audio Extractor', category: 'Audio Processor',
        description: 'HDMI to S/PDIF or RCA | 4K60 | Dolby Vision & HDR',
        tags: ['Audio', 'Extractor', 'De-embed', '4K60', '4:4:4', 'HDR'],
        videoIO: {
            inputs: [{ type: 'HDMI', count: 1 }],
            outputs: [{ type: 'HDMI', count: 1 }]
        },
        hdmiVersion: '2.0',
        hdcpVersion: '2.2',
        audio: {
            outputs: [{ type: 'SPDIF', count: 1 }, { type: 'Analog Stereo', count: 1 }]
        }
    },
];