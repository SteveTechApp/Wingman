
import { v4 as uuidv4 } from 'uuid';
import { UserTemplate } from '../../utils/types';

export const TRANSPORTATION_TEMPLATES: UserTemplate[] = [
    // --- TRANSPORT SIGNAGE ---
    {
        templateId: uuidv4(),
        conceptId: 'transport-signage',
        conceptName: 'Passenger Info System',
        templateName: 'Schedule Board',
        description: 'A single, ruggedized display for showing arrival and departure times, connected via HDBaseT.',
        vertical: 'tra',
        roomData: {
            id: '', roomName: 'Bus Terminal Gate 3', roomType: 'Other', designTier: 'Bronze',
            dimensions: { length: 20, width: 10, height: 6 }, maxParticipants: 100, 
            ioRequirements: [],
            displayType: 'single', displayCount: 1,
            features: [],
            functionalityStatement: 'A simple and robust schedule board for a bus terminal. A high-brightness commercial display is fed by an EX-100-G2 HDBaseT extender, which connects back to a central media player in an IT closet. This provides a reliable, long-distance connection that is immune to the electrical interference common in large public spaces.',
            manuallyAddedEquipment: [
                { sku: 'EX-100-G2', name: '4K60Hz 4.2.0 HDBaseT Extender', quantity: 1, category: 'Extender', description: 'PoH | CEC | IR | RS232 | 100m/327ft', tags: ['Extender', 'HDBaseT', '4K', 'Class A', '4K30', '4:2:0', 'CEC', 'IR', 'RS232'] },
            ],
            constructionDetails: { wallConstruction: 'concrete', cableContainment: 'conduit', furnitureType: 'fixed' },
            audioSystemDetails: { speakerLayout: 'none', systemType: 'high_impedance', useCases: [], microphoneType: 'none', ucCompatibility: false },
            technicalDetails: { primaryVideoResolution: '1080p', videoSignalTypes: ['HDMI'], controlSystem: 'None (Auto-switching)', cameraType: 'none', cameraCount: 0, roomPc: false },
        },
    },
    {
        templateId: uuidv4(),
        conceptId: 'transport-signage',
        conceptName: 'Passenger Info System',
        templateName: 'Airport Signage System',
        description: 'A highly scalable and reliable 1GbE AVoIP system for displaying flight information and advertising.',
        vertical: 'tra',
        roomData: {
            id: '',
            roomName: 'Terminal Signage System',
            roomType: 'Large Venue',
            designTier: 'Silver',
            dimensions: { length: 500, width: 200, height: 12 },
            maxParticipants: 5000,
            ioRequirements: [
                { id: uuidv4(), name: 'FIDS Server', deviceType: 'Room PC', type: 'input', quantity: 4, connectionType: 'HDMI', distributionType: 'AVoIP', distance: 100, terminationType: 'Central Rack', control: { needed: false, types: [] } },
                { id: uuidv4(), name: 'Terminal Displays', deviceType: 'Room Display', type: 'output', quantity: 100, connectionType: 'HDMI', distributionType: 'AVoIP', distance: 80, terminationType: 'Wall Mount', control: { needed: false, types: [] } },
            ],
            displayType: 'single', // Many single displays and video walls
            displayCount: 100,
            features: [],
            functionalityStatement: 'A campus-wide NetworkHD 120 series AVoIP system for distributing flight information (FIDS), gate information, and advertising content to over 100 displays throughout the terminal. The system is designed for 24/7 reliability and can be centrally managed and monitored. The scalability of AVoIP is crucial, allowing the airport to easily add or change displays as the terminal evolves.',
            manuallyAddedEquipment: [
                { sku: 'NHD-120-TX', name: 'NetworkHD 120 Series 4K H.264/H.265 Encoder', quantity: 4, category: 'AVoIP Encoder', description: 'Cost-effective H.264/H.265 streaming for 4K30 video.', tags: ['NetworkHD', 'AVoIP', 'Encoder', '4K', 'H.264', 'H.265', '1GbE', '4K30'] },
                { sku: 'NHD-120-RX', name: 'NetworkHD 120 Series 4K H.264/H.265 Decoder', quantity: 100, category: 'AVoIP Decoder', description: 'Decoder for the NetworkHD 120 series.', tags: ['NetworkHD', 'AVoIP', 'Decoder', '4K', 'H.264', 'H.265', '1GbE', '4K30'] },
                { sku: 'NHD-CTL-PRO', name: 'NetworkHD Pro Controller', quantity: 1, category: 'Control', description: 'Centralized controller for NetworkHD systems.', tags: ['NetworkHD', 'Control', 'Controller'] },
            ],
            constructionDetails: { wallConstruction: 'glass', cableContainment: 'conduit', furnitureType: 'fixed' },
            audioSystemDetails: { speakerLayout: 'none', systemType: 'high_impedance', useCases: [], microphoneType: 'none', ucCompatibility: false },
            technicalDetails: { primaryVideoResolution: '1080p', videoSignalTypes: ['HDMI'], controlSystem: 'Third-Party Integration', cameraType: 'none', cameraCount: 0, roomPc: false },
        },
    },
    {
        templateId: uuidv4(),
        conceptId: 'transport-signage',
        conceptName: 'Passenger Info System',
        templateName: 'Cruise Ship Theater',
        description: 'A high-performance AV system for live shows and movie screenings on a cruise ship.',
        vertical: 'tra',
        roomData: {
            id: '', roomName: 'Starlight Theater', roomType: 'Auditorium', designTier: 'Gold',
            dimensions: { length: 25, width: 20, height: 9 }, maxParticipants: 400, 
            ioRequirements: [],
            displayType: 'led_video_wall', displayCount: 1,
            features: [{ name: 'Speech Reinforcement', priority: 'must-have' }, { name: 'Program Audio', priority: 'must-have' }],
            functionalityStatement: 'A state-of-the-art theater for cruise ship entertainment. A large, fine-pitch LED wall serves as a dynamic backdrop for live performances and a brilliant screen for movie nights. A professional audio system with line array speakers provides powerful, clear sound. The system includes a production booth with a video switcher and audio mixer to manage the shows.',
            manuallyAddedEquipment: [
                { sku: 'MX-1007-HYB', name: '10x7 Hybrid HDBaseT/HDMI Matrix Switcher', quantity: 1, category: 'Matrix Switcher', description: 'A powerful hybrid matrix with 10 inputs (HDMI, HDBaseT) and 7 outputs, with integrated audio DSP.', tags: ['Matrix', 'HDBaseT', 'DSP', '4K', 'Gold', '10x7', 'HDMI'] },
                { sku: 'AMP-260-DNT', name: '120W Network Amplifier', quantity: 2, category: 'Amplifier', description: '2 x 60w or 4 x 25w Channel Output @ 4ohm | Dual Power Options | Advanced DSP with Dante Integration', tags: ['Amplifier', 'Dante', 'DSP', 'Low Impedance'] },
            ],
            constructionDetails: { wallConstruction: 'drywall', cableContainment: 'conduit', furnitureType: 'fixed' },
            audioSystemDetails: { speakerLayout: 'surface_mount', systemType: 'low_impedance', useCases: ['speech_reinforcement', 'program_audio'], microphoneType: 'wireless_lav', ucCompatibility: false },
            technicalDetails: { primaryVideoResolution: '4K/30Hz 4:4:4', videoSignalTypes: ['HDMI', 'SDI'], controlSystem: 'Third-Party Integration', cameraType: 'hdmi_ptz', cameraCount: 3, roomPc: false },
        },
    }
];
