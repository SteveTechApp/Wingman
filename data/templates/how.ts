
import { v4 as uuidv4 } from 'uuid';
import { UserTemplate } from '../../utils/types';

export const HOW_TEMPLATES: UserTemplate[] = [
    {
        templateId: uuidv4(),
        conceptId: 'worship-sanctuary',
        conceptName: 'Worship Sanctuary',
        templateName: 'Overflow Room Feed',
        description: 'A simple, reliable way to send the main service video and audio feed to an auxiliary room.',
        vertical: 'how',
        roomData: {
            id: '', roomName: 'Cry Room', roomType: 'Other', designTier: 'Bronze',
            dimensions: { length: 5, width: 4, height: 2.8 }, maxParticipants: 10, 
            ioRequirements: [], displayType: 'single', displayCount: 1,
            features: [],
            functionalityStatement: 'A cost-effective solution to provide a live feed of the main service to an overflow or cry room. An EX-70-G2 HDBaseT extender takes an output from the main system and reliably sends it to a display in the adjacent room, providing both video and audio.',
            manuallyAddedEquipment: [
                { sku: 'EX-70-G2', name: '4K60Hz 4:2:0 HDBaseT Extender', quantity: 1, category: 'Extender', description: 'PoH | CEC | IR | RS232 (4K: 35m/115ft, 1080p: 70m/230ft)', tags: ['Extender', 'HDBaseT', 'Class B', '4K30', '4:2:0', 'CEC', 'IR', 'RS232'] },
            ],
            constructionDetails: { wallConstruction: 'drywall', cableContainment: 'trunking', furnitureType: 'fixed' },
            audioSystemDetails: { speakerLayout: 'none', systemType: 'low_impedance', useCases: [], microphoneType: 'none', ucCompatibility: false },
            technicalDetails: { primaryVideoResolution: '1080p', videoSignalTypes: ['HDMI'], controlSystem: 'None (Auto-switching)', cameraType: 'none', cameraCount: 0, roomPc: false },
        },
    },
    {
        templateId: uuidv4(),
        conceptId: 'worship-sanctuary',
        conceptName: 'Worship Sanctuary',
        templateName: 'Main Sanctuary',
        description: 'A multi-screen system for displaying lyrics and live video, with easy control for volunteers.',
        vertical: 'how',
        roomData: {
            id: '',
            roomName: 'Main Sanctuary',
            roomType: 'House of Worship',
            designTier: 'Silver',
            dimensions: { length: 25, width: 18, height: 9 },
            maxParticipants: 300,
            ioRequirements: [
                { id: uuidv4(), name: 'Presentation PC', deviceType: 'Room PC', type: 'input', quantity: 1, connectionType: 'HDMI', distributionType: 'Direct', distance: 5, terminationType: 'Local Rack', control: { needed: false, types: [] } },
                { id: uuidv4(), name: 'Camera Feed', deviceType: 'Camera', type: 'input', quantity: 1, connectionType: 'HDMI', distributionType: 'Direct', distance: 10, terminationType: 'Local Rack', control: { needed: false, types: [] } },
                { id: uuidv4(), name: 'Main Projector', deviceType: 'Projector', type: 'output', quantity: 1, connectionType: 'HDMI', distributionType: 'HDBaseT', distance: 30, terminationType: 'Ceiling Mount', control: { needed: false, types: [] } },
                { id: uuidv4(), name: 'Side Displays', deviceType: 'Room Display', type: 'output', quantity: 2, connectionType: 'HDMI', distributionType: 'HDBaseT', distance: 25, terminationType: 'Wall Mount', control: { needed: false, types: [] } },
            ],
            displayType: 'projector',
            displayCount: 3, // Main projector + 2 side displays
            features: [
                { name: 'Speech Reinforcement', priority: 'must-have' },
                { name: 'Multi-Display Support', priority: 'must-have' },
            ],
            functionalityStatement: 'A versatile system designed for worship services. A central MX-0804-EDU matrix switcher routes content from a presentation computer (for lyrics) and a live camera feed to a main center projector and two side-fill displays via HDBaseT. The switcher also handles microphone inputs for the pastor and choir, mixing them for the main audio system. Control is handled by a simple keypad for easy operation by volunteers.',
            manuallyAddedEquipment: [
                { sku: 'MX-0804-EDU', name: '8x4 Education Matrix Switcher', quantity: 1, category: 'Matrix Switcher', description: 'An 8-input, 4-output matrix designed for classrooms with mic inputs and powerful audio mixing.', tags: ['Matrix', 'Education', 'Audio', 'Silver', '8x4', 'Microphone Input', 'Audio Mixer'] },
                { sku: 'GEN-PTZ-CAM', name: 'Generic 4K PTZ Camera', quantity: 2, category: 'Camera', description: 'A professional 4K pan-tilt-zoom camera with 12x optical zoom, USB, and IP streaming. Ideal for larger rooms and lecture halls.', tags: ['Camera', 'PTZ', '4K', 'USB', '12x Zoom', 'USB3.0', 'IP Stream', 'HDMI'] },
            ],
            constructionDetails: { wallConstruction: 'drywall', cableContainment: 'conduit', furnitureType: 'fixed' },
            audioSystemDetails: { speakerLayout: 'surface_mount', systemType: 'low_impedance', useCases: ['speech_reinforcement', 'program_audio'], microphoneType: 'wireless_lav', ucCompatibility: false },
            technicalDetails: { primaryVideoResolution: '1080p', videoSignalTypes: ['HDMI', 'SDI'], controlSystem: 'Simple Keypad', cameraType: 'hdmi_ptz', cameraCount: 2, roomPc: true },
        },
    },
    {
        templateId: uuidv4(),
        conceptId: 'worship-sanctuary',
        conceptName: 'Worship Sanctuary',
        templateName: 'Broadcast & Streaming Campus',
        description: 'A campus-wide AVoIP system for broadcasting services to multiple rooms and online.',
        vertical: 'how',
        roomData: {
            id: '', roomName: 'Broadcast Campus', roomType: 'Other', designTier: 'Gold',
            dimensions: { length: 6, width: 4, height: 3 }, maxParticipants: 3, 
            ioRequirements: [],
            displayType: 'single', displayCount: 4,
            features: [],
            functionalityStatement: 'A professional, campus-wide AVoIP system for recording and streaming high-quality video content. A multi-camera setup in the main sanctuary is encoded using NetworkHD 500 series encoders. These feeds are sent to a dedicated broadcast booth for live production, and also distributed to decoders in overflow rooms, nurseries, and digital signage displays. The visually lossless quality of the 500 series ensures a high-quality experience for both in-person and online attendees.',
            manuallyAddedEquipment: [
                { sku: 'NHD-500-TX', name: 'NetworkHD 500 Series 4K60 JPEG-XS Encoder', quantity: 5, category: 'AVoIP Encoder', description: 'Visually lossless 4K60 4:4:4 video over 1GbE.', tags: ['NetworkHD', 'AVoIP', 'Encoder', '4K', 'JPEG-XS', 'Dante', '1GbE', '4K60', '4:4:4', 'Low Latency'] },
                { sku: 'NHD-500-RX', name: 'NetworkHD 500 Series 4K60 JPEG-XS Decoder', quantity: 8, category: 'AVoIP Decoder', description: 'Decoder for the 500 series with USB 2.0 KVM support.', tags: ['NetworkHD', 'AVoIP', 'Decoder', '4K', 'JPEG-XS', 'Dante', '1GbE', '4K60', '4:4:4', 'USB', 'KVM'] },
                { sku: 'NHD-CTL-PRO', name: 'NetworkHD Pro Controller', quantity: 1, category: 'Control', description: 'Centralized controller for NetworkHD systems.', tags: ['NetworkHD', 'Control', 'Controller'] },
            ],
            constructionDetails: { wallConstruction: 'drywall', cableContainment: 'trunking', furnitureType: 'fixed' },
            audioSystemDetails: { speakerLayout: 'none', systemType: 'low_impedance', useCases: ['program_audio'], microphoneType: 'wireless_lav', ucCompatibility: false },
            technicalDetails: { primaryVideoResolution: '1080p', videoSignalTypes: ['HDMI', 'SDI'], controlSystem: 'Third-Party Integration', cameraType: 'hdmi_ptz', cameraCount: 3, roomPc: true },
        },
    }
];
