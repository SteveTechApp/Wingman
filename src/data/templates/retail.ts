
import { v4 as uuidv4 } from 'uuid';
import { UserTemplate } from '../../utils/types';

export const RETAIL_TEMPLATES: UserTemplate[] = [
    {
        templateId: uuidv4(),
        conceptId: 'retail-signage',
        conceptName: 'Retail Signage',
        templateName: 'Single Signage Display',
        description: 'A single, standalone digital signage display for promotions or information.',
        vertical: 'ret',
        roomData: {
            id: '', roomName: 'Entrance Display', roomType: 'Retail Space', designTier: 'Bronze',
            dimensions: { length: 5, width: 1, height: 4 }, maxParticipants: 0, 
            ioRequirements: [],
            displayType: 'single', displayCount: 1,
            features: [],
            functionalityStatement: 'A simple, standalone digital signage screen near a store entrance or high-traffic area. A commercial display with a built-in System-on-Chip (SoC) media player runs content from a USB drive or network connection. This is the most cost-effective solution for basic, single-screen advertising.',
            manuallyAddedEquipment: [],
            constructionDetails: { wallConstruction: 'drywall', cableContainment: 'conduit', furnitureType: 'fixed' },
            audioSystemDetails: { speakerLayout: 'none', systemType: 'low_impedance', useCases: [], microphoneType: 'none', ucCompatibility: false },
            technicalDetails: { primaryVideoResolution: '1080p', videoSignalTypes: ['HDMI'], controlSystem: 'None (Auto-switching)', cameraType: 'none', cameraCount: 0, roomPc: false },
        },
    },
    {
        templateId: uuidv4(),
        conceptId: 'retail-signage',
        conceptName: 'Retail Signage',
        templateName: 'Store-Wide Digital Signage',
        description: 'A scalable AVoIP solution for distributing promotional content to multiple screens in a retail environment.',
        vertical: 'ret',
        roomData: {
            id: '',
            roomName: 'Store-Wide Signage',
            roomType: 'Retail Space',
            designTier: 'Silver',
            dimensions: { length: 50, width: 30, height: 4 },
            maxParticipants: 200,
            ioRequirements: [
                 { id: uuidv4(), name: 'Media Player Source', deviceType: 'Media Player', type: 'input', quantity: 1, connectionType: 'HDMI', distributionType: 'AVoIP', distance: 30, terminationType: 'Central Rack', control: { needed: false, types: [] } },
                 { id: uuidv4(), name: 'Signage Displays', deviceType: 'Room Display', type: 'output', quantity: 6, connectionType: 'HDMI', distributionType: 'AVoIP', distance: 20, terminationType: 'Wall Mount', control: { needed: false, types: [] } },
            ],
            displayType: 'single', // multiple single displays
            displayCount: 6,
            features: [],
            functionalityStatement: 'A NetworkHD 120 series AVoIP system distributes content from a central media player to six displays throughout the store. The low-bandwidth H.264 solution is cost-effective and easy to scale as more displays are added. Content can be updated centrally and scheduled to change throughout the day.',
            manuallyAddedEquipment: [
                { sku: 'NHD-120-TX', name: 'NetworkHD 120 Series 4K H.264/H.265 Encoder', quantity: 1, category: 'AVoIP Encoder', description: 'Cost-effective H.264/H.265 streaming for 4K30 video.', tags: ['NetworkHD', 'AVoIP', 'Encoder', '4K', 'H.264', 'H.265', '1GbE', '4K30'] },
                { sku: 'NHD-120-RX', name: 'NetworkHD 120 Series 4K H.264/H.265 Decoder', quantity: 6, category: 'AVoIP Decoder', description: 'Decoder for the NetworkHD 120 series.', tags: ['NetworkHD', 'AVoIP', 'Decoder', '4K', 'H.264', 'H.265', '1GbE', '4K30'] },
                { sku: 'NHD-CTL-PRO', name: 'NetworkHD Pro Controller', quantity: 1, category: 'Control', description: 'Centralized controller for NetworkHD systems.', tags: ['NetworkHD', 'Control', 'Controller'] },
            ],
            constructionDetails: { wallConstruction: 'drywall', cableContainment: 'conduit', furnitureType: 'fixed' },
            audioSystemDetails: { speakerLayout: 'none', systemType: 'low_impedance', useCases: [], microphoneType: 'none', ucCompatibility: false },
            technicalDetails: { primaryVideoResolution: '1080p', videoSignalTypes: ['HDMI'], controlSystem: 'None (Auto-switching)', cameraType: 'none', cameraCount: 0, roomPc: false },
        },
    },
    {
        templateId: uuidv4(),
        conceptId: 'retail-signage',
        conceptName: 'Retail Signage',
        templateName: 'Experiential Video Wall',
        description: 'An immersive video wall with high-quality visuals to create a premium brand experience.',
        vertical: 'ret',
        roomData: {
            id: '', roomName: 'Brand Experience Area', roomType: 'Retail Space', designTier: 'Gold',
            dimensions: { length: 10, width: 8, height: 3.5 }, maxParticipants: 15, 
            ioRequirements: [
                { id: uuidv4(), name: '4K Media Player', deviceType: 'Media Player', type: 'input', quantity: 1, connectionType: 'HDMI', distributionType: 'AVoIP', distance: 2, terminationType: 'Local Rack', control: { needed: false, types: [] } },
                { id: uuidv4(), name: 'Video Wall Displays', deviceType: 'Room Display', type: 'output', quantity: 4, connectionType: 'HDMI', distributionType: 'AVoIP', distance: 3, terminationType: 'Wall Mount', control: { needed: false, types: [] } },
            ],
            displayType: 'lcd_video_wall', displayCount: 4,
            videoWallConfig: { type: 'lcd', layout: { rows: 2, cols: 2 }, technology: 'avoip', multiviewRequired: false },
            features: [],
            functionalityStatement: 'An engaging brand experience zone designed to attract and immerse customers. It features a 2x2 video wall, driven by a visually lossless NetworkHD 500 series AVoIP system (one decoder per panel). This provides high-impact 4K brand content with excellent clarity. Directional speakers create a focused audio experience.',
            manuallyAddedEquipment: [
                { sku: 'NHD-500-TXE', name: 'NetworkHD 500 Series 4K60 JPEG-XS Encoder (HDMI Only)', quantity: 1, category: 'AVoIP Encoder', description: 'A cost-effective, visually lossless 4K60 4:4:4 encoder over 1GbE.', tags: ['NetworkHD', 'AVoIP', 'Encoder', '4K', 'JPEG-XS', '1GbE', '4K60', '4:4:4', 'Low Latency', 'Video Wall'] },
                { sku: 'NHD-500-RXE', name: 'NetworkHD 500 Series 4K60 JPEG-XS Decoder (HDMI Only)', quantity: 4, category: 'AVoIP Decoder', description: 'A cost-effective, visually lossless 4K60 4:4:4 decoder over 1GbE.', tags: ['NetworkHD', 'AVoIP', 'Decoder', '4K', 'JPEG-XS', '1GbE', '4K60', '4:4:4', 'Low Latency', 'Video Wall'] },
                { sku: 'NHD-CTL-PRO', name: 'NetworkHD Pro Controller', quantity: 1, category: 'Control', description: 'Centralized controller for NetworkHD systems.', tags: ['NetworkHD', 'Control', 'Controller'] },
            ],
            constructionDetails: { wallConstruction: 'drywall', cableContainment: 'conduit', furnitureType: 'fixed' },
            audioSystemDetails: { speakerLayout: 'surface_mount', systemType: 'low_impedance', useCases: ['program_audio'], microphoneType: 'none', ucCompatibility: false },
            technicalDetails: { primaryVideoResolution: '4K/60Hz 4:4:4', videoSignalTypes: ['HDMI'], controlSystem: 'None (Auto-switching)', cameraType: 'none', cameraCount: 0, roomPc: false },
        },
    }
];
