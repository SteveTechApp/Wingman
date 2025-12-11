
import { v4 as uuidv4 } from 'uuid';
import { UserTemplate } from '../../utils/types';

export const INDUSTRIAL_TEMPLATES: UserTemplate[] = [
    {
        templateId: uuidv4(),
        conceptId: 'industrial-space',
        conceptName: 'Industrial Space',
        templateName: 'Factory Floor Huddle Station',
        description: 'A ruggedized display on a mobile cart for reviewing production data on the factory floor.',
        vertical: 'ind',
        roomData: {
            id: '', roomName: 'Production Line 2 Station', roomType: 'Other', designTier: 'Bronze',
            dimensions: { length: 5, width: 5, height: 5 }, maxParticipants: 8, 
            ioRequirements: [],
            displayType: 'single', displayCount: 1,
            features: [],
            functionalityStatement: 'A mobile AV cart for use on the factory floor. It includes a ruggedized commercial display and a simple SW-0201-4K switcher with wireless presentation. This allows teams to huddle and review production metrics, schematics, or safety information right where the work is happening. The cart is self-contained and only requires a power outlet.',
            manuallyAddedEquipment: [
                { sku: 'SW-0201-4K', name: '2x1 USB-C & HDMI Wireless Switcher', quantity: 1, category: 'Presentation Switcher', description: 'A compact 2x1 presentation switcher with HDMI and USB-C inputs and wireless casting support.', tags: ['Switcher', 'USB-C', 'Casting', '4K', 'Bronze', 'HDMI', 'Auto-switching', '2x1'] },
            ],
            constructionDetails: { wallConstruction: 'concrete', cableContainment: 'none', furnitureType: 'multi_use' },
            audioSystemDetails: { speakerLayout: 'none', systemType: 'low_impedance', useCases: [], microphoneType: 'none', ucCompatibility: false },
            technicalDetails: { primaryVideoResolution: '1080p', videoSignalTypes: ['HDMI'], controlSystem: 'None (Auto-switching)', cameraType: 'none', cameraCount: 0, roomPc: false },
        },
    },
    {
        templateId: uuidv4(),
        conceptId: 'industrial-space',
        conceptName: 'Industrial Space',
        templateName: 'Safety Briefing Room',
        description: 'A simple, reliable room for conducting safety training and daily briefings using HDBaseT.',
        vertical: 'ind',
        roomData: {
            id: '', roomName: 'Daily Briefing Room', roomType: 'Conference Room', designTier: 'Silver',
            dimensions: { length: 10, width: 8, height: 3 }, maxParticipants: 25, 
            ioRequirements: [],
            displayType: 'projector', displayCount: 1,
            features: [{ name: 'Speech Reinforcement', priority: 'must-have' }],
            functionalityStatement: 'A robust AV system for daily safety briefings. A bright projector and screen provide a large, clear image. A SW-340-TX switcher at the lectern offers HDMI & USB-C connections and sends a reliable HDBaseT signal to the projector. A simple public address system with a wired microphone ensures the speaker can be heard over ambient noise.',
            manuallyAddedEquipment: [
                { sku: 'SW-340-TX', name: '3-Input HDBaseT Presentation Switcher with USB-C', quantity: 1, category: 'Presentation Switcher', description: 'A versatile 3-input presentation switcher with 2x HDMI and 1x USB-C inputs. Features an HDBaseT output for long-distance transmission to a display, USB host, and auto-switching.', tags: ['Switcher', 'HDBaseT', 'USB-C', '4K', 'Silver', '3x1', 'USB Host', 'Auto-switching'] },
            ],
            constructionDetails: { wallConstruction: 'concrete', cableContainment: 'trunking', furnitureType: 'multi_use' },
            audioSystemDetails: { speakerLayout: 'surface_mount', systemType: 'high_impedance', useCases: ['speech_reinforcement'], microphoneType: 'table_mic', ucCompatibility: false },
            technicalDetails: { primaryVideoResolution: '1080p', videoSignalTypes: ['HDMI'], controlSystem: 'Simple Keypad', cameraType: 'none', cameraCount: 0, roomPc: false },
        },
    },
    {
        templateId: uuidv4(),
        conceptId: 'industrial-space',
        conceptName: 'Industrial Space',
        templateName: 'Process Control Room',
        description: 'A zero-latency 10GbE AVoIP system for displaying critical SCADA and telemetry data in a control room.',
        vertical: 'ind',
        roomData: {
            id: '',
            roomName: 'Operations Control Center',
            roomType: 'Command Center',
            designTier: 'Gold',
            dimensions: { length: 12, width: 8, height: 3 },
            maxParticipants: 8,
            ioRequirements: [
                { id: uuidv4(), name: 'SCADA PCs', deviceType: 'Room PC', type: 'input', quantity: 8, connectionType: 'DisplayPort', distributionType: 'AVoIP', distance: 5, terminationType: 'Central Rack', control: { needed: false, types: [] } },
                { id: uuidv4(), name: 'Video Wall', deviceType: 'Room Display', type: 'output', quantity: 6, connectionType: 'HDMI', distributionType: 'AVoIP', distance: 10, terminationType: 'Wall Mount', control: { needed: false, types: [] } },
            ],
            displayType: 'lcd_video_wall',
            displayCount: 6,
            videoWallConfig: { type: 'lcd', layout: { rows: 2, cols: 3 }, technology: 'avoip', multiviewRequired: true },
            features: [],
            functionalityStatement: 'A mission-critical visualization system for an industrial process control room. The NetworkHD 600 series delivers pixel-perfect, zero-latency uncompressed video over a 10GbE network, ensuring operators see real-time data without any delay or compression artifacts. The 3x2 video wall can display multiple SCADA system outputs, camera feeds, and telemetry data in flexible layouts controlled by a simple touch interface.',
            manuallyAddedEquipment: [
                { sku: 'NHD-600-TRX', name: 'NetworkHD 600 Series 4K60 10GbE Transceiver', quantity: 14, category: 'AVoIP Transceiver', description: 'Uncompressed 4K60 4:4:4 video over 10GbE. Configurable as Encoder or Decoder.', tags: ['NetworkHD', 'AVoIP', 'Transceiver', '4K', 'Uncompressed', '10GbE', '4K60', '4:4:4', 'Zero Latency', 'Multiview'] },
                { sku: 'NHD-CTL-PRO', name: 'NetworkHD Pro Controller', quantity: 1, category: 'Control', description: 'Centralized controller for NetworkHD systems.', tags: ['NetworkHD', 'Control', 'Controller'] },
            ],
            constructionDetails: { wallConstruction: 'concrete', cableContainment: 'conduit', furnitureType: 'fixed' },
            audioSystemDetails: { speakerLayout: 'none', systemType: 'low_impedance', useCases: [], microphoneType: 'none', ucCompatibility: false },
            technicalDetails: { primaryVideoResolution: '4K/60Hz 4:4:4', videoSignalTypes: ['DisplayPort', 'HDMI'], controlSystem: 'Third-Party Integration', cameraType: 'none', cameraCount: 0, roomPc: true },
        },
    }
];
