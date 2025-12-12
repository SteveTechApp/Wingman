
import { v4 as uuidv4 } from 'uuid';
import { UserTemplate } from '../../utils/types';

export const COMMAND_TEMPLATES: UserTemplate[] = [
    {
        templateId: uuidv4(),
        conceptId: 'command-center',
        conceptName: 'Command Center',
        templateName: 'Single Monitoring Station',
        description: 'A single operator desk with a 4-input multiviewer to monitor several critical feeds on one display.',
        vertical: 'cmd',
        roomData: {
            id: '', roomName: 'Monitoring Station', roomType: 'Command Center', designTier: 'Bronze',
            dimensions: { length: 4, width: 3, height: 2.8 }, maxParticipants: 1,
            ioRequirements: [
                 { id: uuidv4(), name: 'Data Feeds', type: 'input', deviceType: 'Room PC', quantity: 4, connectionType: 'HDMI', distributionType: 'Direct', distance: 2, terminationType: 'Desktop', control: { needed: false, types: [] } },
                 { id: uuidv4(), name: 'Operator Display', type: 'output', deviceType: 'Room Display', quantity: 1, connectionType: 'HDMI', distributionType: 'Direct', distance: 2, terminationType: 'Desktop', control: { needed: false, types: [] } },
            ],
            displayType: 'single', displayCount: 1,
            features: [],
            functionalityStatement: 'A simple, cost-effective monitoring station for a single operator. A NetworkHD multiviewer receives up to 4 AVoIP streams and displays them in a quad-view layout on a single 4K monitor, allowing for at-a-glance monitoring of multiple systems.',
            manuallyAddedEquipment: [
                { sku: 'NHD-120-TX', name: 'NetworkHD 120 Series 4K H.264/H.265 Encoder', quantity: 4, category: 'AVoIP Encoder', description: 'Cost-effective H.264/H.265 streaming for 4K30 video.', tags: ['NetworkHD', 'AVoIP', 'Encoder', '4K', 'H.264', 'H.265', '1GbE', '4K30'] },
                { sku: 'NHD-150-RX', name: 'NetworkHD 150 Series Multiview & Video Wall Decoder', quantity: 1, category: 'AVoIP Decoder', description: 'Specialized 100-series decoder that can display up to 9 sources on a single display.', tags: ['NetworkHD', 'AVoIP', 'Decoder', 'Multiview', 'Video Wall', '1GbE', 'H.264'] },
            ],
            constructionDetails: { wallConstruction: 'drywall', cableContainment: 'trunking', furnitureType: 'fixed' },
            audioSystemDetails: { speakerLayout: 'none', systemType: 'low_impedance', useCases: [], microphoneType: 'none', ucCompatibility: false },
            technicalDetails: { primaryVideoResolution: '1080p', videoSignalTypes: ['HDMI'], controlSystem: 'None (Auto-switching)', cameraType: 'none', cameraCount: 0, roomPc: true },
        },
    },
    {
        templateId: uuidv4(),
        conceptId: 'command-center',
        conceptName: 'Command Center',
        templateName: 'Security Operations Center',
        description: 'A 2x2 video wall using visually lossless 1GbE AVoIP for monitoring multiple camera and data feeds.',
        vertical: 'cmd',
        roomData: {
            id: '',
            roomName: 'Security Operations Center',
            roomType: 'Command Center',
            designTier: 'Silver',
            dimensions: { length: 8, width: 6, height: 3 },
            maxParticipants: 4,
            ioRequirements: [
                 { id: uuidv4(), name: 'Camera Feeds', type: 'input', deviceType: 'Camera', quantity: 4, connectionType: 'HDMI', distributionType: 'AVoIP', distance: 10, terminationType: 'Central Rack', control: { needed: false, types: [] } },
                 { id: uuidv4(), name: 'Video Wall', type: 'output', deviceType: 'Room Display', quantity: 4, connectionType: 'HDMI', distributionType: 'AVoIP', distance: 5, terminationType: 'Wall Mount', control: { needed: false, types: [] } },
            ],
            displayType: 'lcd_video_wall',
            displayCount: 4,
            videoWallConfig: { type: 'lcd', layout: { rows: 2, cols: 2 }, technology: 'avoip', multiviewRequired: true },
            features: [],
            functionalityStatement: 'A compact but powerful security operations center for 2-4 operators. A 2x2 video wall displays a flexible combination of security camera feeds and data sources. The system is driven by a NetworkHD 500 AVoIP system, allowing any source to be shown on any screen or across the entire wall. Operators can control layouts from their workstations.',
            manuallyAddedEquipment: [
                { sku: 'NHD-500-TX', name: 'NetworkHD 500 Series 4K60 JPEG-XS Encoder', quantity: 4, category: 'AVoIP Encoder', description: 'Visually lossless 4K60 4:4:4 video over 1GbE.', tags: ['NetworkHD', 'AVoIP', 'Encoder', '4K', 'JPEG-XS', 'Dante', '1GbE', '4K60', '4:4:4', 'Low Latency'] },
                { sku: 'NHD-500-RXE', name: 'NetworkHD 500 Series 4K60 JPEG-XS Decoder (HDMI Only)', quantity: 4, category: 'AVoIP Decoder', description: 'A cost-effective, visually lossless 4K60 4:4:4 decoder over 1GbE.', tags: ['NetworkHD', 'AVoIP', 'Decoder', '4K', 'JPEG-XS', '1GbE', '4K60', '4:4:4', 'Low Latency', 'Video Wall'] },
                { sku: 'NHD-CTL-PRO', name: 'NetworkHD Pro Controller', quantity: 1, category: 'Control', description: 'Centralized controller for NetworkHD systems.', tags: ['NetworkHD', 'Control', 'Controller'] },
            ],
            constructionDetails: { wallConstruction: 'drywall', cableContainment: 'conduit', furnitureType: 'fixed' },
            audioSystemDetails: { speakerLayout: 'in_ceiling', systemType: 'high_impedance', useCases: [], microphoneType: 'none', ucCompatibility: false },
            technicalDetails: { primaryVideoResolution: '1080p', videoSignalTypes: ['HDMI', 'DisplayPort'], controlSystem: 'Third-Party Integration', cameraType: 'none', cameraCount: 0, roomPc: true },
        },
    },
    {
        templateId: uuidv4(),
        conceptId: 'command-center',
        conceptName: 'Command Center',
        templateName: 'Emergency Operations Center',
        description: 'A large-scale, zero-latency video wall with multiple operator stations for coordinating emergency responses.',
        vertical: 'cmd',
        roomData: {
            id: '', roomName: 'Emergency Operations Center', roomType: 'Command Center', designTier: 'Gold',
            dimensions: { length: 20, width: 15, height: 5 }, maxParticipants: 30,
            ioRequirements: [
                { id: uuidv4(), name: 'EOC Sources', type: 'input', deviceType: 'Room PC', quantity: 12, connectionType: 'HDMI', distributionType: 'AVoIP', distance: 10, terminationType: 'Central Rack', control: { needed: false, types: [] } },
                { id: uuidv4(), name: 'Main Video Wall', type: 'output', deviceType: 'Room Display', quantity: 16, connectionType: 'HDMI', distributionType: 'AVoIP', distance: 20, terminationType: 'Wall Mount', control: { needed: false, types: [] } },
                { id: uuidv4(), name: 'Operator Desks', type: 'output', deviceType: 'Room Display', quantity: 8, connectionType: 'HDMI', distributionType: 'AVoIP', distance: 15, terminationType: 'Desktop', control: { needed: false, types: [] } },
            ],
            displayType: 'lcd_video_wall',
            displayCount: 16,
            videoWallConfig: { type: 'lcd', layout: { rows: 4, cols: 4 }, technology: 'avoip', multiviewRequired: true },
            features: [ { name: 'Video Conferencing', priority: 'must-have' } ],
            functionalityStatement: 'A mission-critical emergency operations center featuring a large 4x4 video wall. A zero-latency NetworkHD 600 Series AVoIP system distributes uncompressed 4K video from numerous sources (broadcast news, GIS mapping, IP cameras, PCs) to the main wall and individual operator desk displays. The system is designed for 24/7 reliability and allows for flexible, on-the-fly configuration of screen layouts via a touch panel controller.',
            manuallyAddedEquipment: [
                { sku: 'NHD-600-TRX', name: 'NetworkHD 600 Series 4K60 10GbE Transceiver', quantity: 36, category: 'AVoIP Transceiver', description: 'Uncompressed 4K60 4:4:4 video over 10GbE (not SDVoE). Configurable as Encoder or Decoder.', tags: ['NetworkHD', 'AVoIP', 'Transceiver', '4K', 'Uncompressed', '10GbE', '4K60', '4:4:4', 'Zero Latency', 'Multiview'] },
                { sku: 'NHD-CTL-PRO', name: 'NetworkHD Pro Controller', quantity: 1, category: 'Control', description: 'Centralized controller for NetworkHD systems.', tags: ['NetworkHD', 'Control', 'Controller'] },
            ],
            constructionDetails: { wallConstruction: 'drywall', cableContainment: 'floor_boxes', furnitureType: 'fixed' },
            audioSystemDetails: { speakerLayout: 'surface_mount', systemType: 'high_impedance', useCases: ['speech_reinforcement', 'video_conferencing'], microphoneType: 'table_mic', ucCompatibility: true },
            technicalDetails: { primaryVideoResolution: '4K/60Hz 4:4:4', videoSignalTypes: ['HDMI', 'DisplayPort', 'SDI'], controlSystem: 'Touch Panel', cameraType: 'hdmi_ptz', cameraCount: 4, roomPc: true },
        },
    }
];
