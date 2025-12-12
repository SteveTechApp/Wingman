import { v4 as uuidv4 } from 'uuid';
import { UserTemplate } from '../../utils/types';

export const RESIDENTIAL_TEMPLATES: UserTemplate[] = [
    {
        templateId: uuidv4(),
        conceptId: 'outdoor-entertainment',
        conceptName: 'Outdoor Entertainment',
        templateName: 'Outdoor Patio Entertainment',
        description: 'A weatherproof TV and speaker system for outdoor viewing, connected via HDBaseT.',
        vertical: 'res',
        roomData: {
            id: '', roomName: 'Back Patio', roomType: 'Other', designTier: 'Bronze',
            dimensions: { length: 10, width: 8, height: 3 }, maxParticipants: 15, 
            ioRequirements: [],
            displayType: 'single', displayCount: 1,
            features: [],
            functionalityStatement: 'An outdoor entertainment system for the patio. A weatherproof TV, designed for viewing in bright daylight, is the main feature. A pair of outdoor-rated speakers provide robust audio. An EX-70-G2 HDBaseT extender connects the outdoor equipment back to a source device located safely inside the house.',
            manuallyAddedEquipment: [
                { sku: 'EX-70-G2', name: '4K60Hz 4:2:0 HDBaseT Extender', quantity: 1, category: 'Extender', description: 'PoH | CEC | IR | RS232 (4K: 35m/115ft, 1080p: 70m/230ft)', tags: ['Extender', 'HDBaseT', 'Class B', '4K30', '4:2:0', 'CEC', 'IR', 'RS232'] },
            ],
            constructionDetails: { wallConstruction: 'concrete', cableContainment: 'conduit', furnitureType: 'fixed' },
            audioSystemDetails: { speakerLayout: 'surface_mount', systemType: 'low_impedance', useCases: ['program_audio'], microphoneType: 'none', ucCompatibility: false },
            technicalDetails: { primaryVideoResolution: '4K/30Hz 4:4:4', videoSignalTypes: ['HDMI'], controlSystem: 'None (Auto-switching)', cameraType: 'none', cameraCount: 0, roomPc: false },
        },
    },
    {
        templateId: uuidv4(),
        conceptId: 'living-room-media',
        conceptName: 'Living Room Media System',
        templateName: 'Living Room Media System',
        description: 'A clean and simple setup with a large TV, soundbar, and hidden sources connected via an ARC-enabled extender.',
        vertical: 'res',
        roomData: {
            id: '', roomName: 'Living Room', roomType: 'Other', designTier: 'Silver',
            dimensions: { length: 7, width: 6, height: 2.8 }, maxParticipants: 6, 
            ioRequirements: [
                { id: uuidv4(), name: 'Media Cabinet Sources', deviceType: 'Media Player', type: 'input', quantity: 3, connectionType: 'HDMI', distributionType: 'HDBaseT', distance: 10, terminationType: 'Central Rack', control: { needed: false, types: [] } },
                { id: uuidv4(), name: 'Living Room TV', deviceType: 'Room Display', type: 'output', quantity: 1, connectionType: 'HDMI', distributionType: 'HDBaseT', distance: 2, terminationType: 'Wall Mount', control: { needed: false, types: [] } },
            ],
            displayType: 'single', displayCount: 1,
            features: [{ name: 'Program Audio', priority: 'must-have' }],
            functionalityStatement: 'A high-quality but discreet living room entertainment system. A large 4K OLED TV is mounted on the wall, paired with a high-performance soundbar with eARC. All source devices (streaming box, cable box, game console) are located remotely in a nearby closet and connected via an EX-40-H2-ARC HDBaseT extender for a clean, wire-free look. A universal remote controls the entire system.',
            manuallyAddedEquipment: [
                { sku: 'EX-40-H2-ARC', name: '4K60Hz 4.4.4 HDBaseT™ Extender Set', quantity: 1, category: 'Extender', description: 'Dolby Vision & HDR | ARC | RS232 & 2-Way IR Passthrough (4K: 40m/115ft, 1080p: 70m/230ft)', tags: ['Extender', 'HDBaseT', 'ARC', 'Class B', '4K60', '4:4:4', 'HDR', 'RS232', 'IR'] },
            ],
            constructionDetails: { wallConstruction: 'drywall', cableContainment: 'conduit', furnitureType: 'fixed' },
            audioSystemDetails: { speakerLayout: 'soundbar', systemType: 'low_impedance', useCases: ['program_audio'], microphoneType: 'none', ucCompatibility: false },
            technicalDetails: { primaryVideoResolution: '4K/60Hz 4:4:4', videoSignalTypes: ['HDMI'], controlSystem: 'None (Auto-switching)', cameraType: 'none', cameraCount: 0, roomPc: false },
        },
    },
    {
        templateId: uuidv4(),
        conceptId: 'home-theater',
        conceptName: 'Dedicated Home Theater',
        templateName: 'Dedicated Home Theater',
        description: 'A high-end home cinema with 4K projection, immersive audio, and simple control using HDBaseT 3.0.',
        vertical: 'res',
        roomData: {
            id: '',
            roomName: 'Home Cinema',
            roomType: 'Other',
            designTier: 'Gold',
            dimensions: { length: 8, width: 5, height: 3 },
            maxParticipants: 8,
            ioRequirements: [
                { id: uuidv4(), name: 'AV Sources', deviceType: 'Media Player', type: 'input', quantity: 3, connectionType: 'HDMI', distributionType: 'Direct', distance: 2, terminationType: 'Central Rack', control: { needed: false, types: [] } },
                { id: uuidv4(), name: 'Projector', deviceType: 'Projector', type: 'output', quantity: 1, connectionType: 'HDMI', distributionType: 'HDBaseT', distance: 15, terminationType: 'Ceiling Mount', control: { needed: false, types: [] } },
            ],
            displayType: 'projector',
            displayCount: 1,
            features: [
                { name: 'Program Audio', priority: 'must-have' },
            ],
            functionalityStatement: 'A dedicated home cinema experience. A 4K laser projector is fed by a cutting-edge EX-40-VWM-5K HDBaseT 3.0 extender for a reliable, uncompressed video signal. Multiple sources like a 4K Blu-ray player, Apple TV, and gaming console are connected through an advanced AV Receiver in a local rack. The entire system, including lighting, is controlled via a single remote or touch panel.',
            manuallyAddedEquipment: [
                { sku: 'EX-40-VWM-5K', name: '5K30Hz HDBT3.0 Extender Kit', quantity: 1, category: 'Extender', description: 'Uncompressed video | HDMI Loop out | Audio de-embedding | Analog Audio pass-through | USB 2.0 | PoH | DIP Switch, RS232 control', tags: ['Extender', 'HDBT3.0', '5K', 'USB', 'RS232', 'Audio De-embed'] },
            ],
            constructionDetails: { wallConstruction: 'drywall', cableContainment: 'conduit', furnitureType: 'fixed' },
            audioSystemDetails: { speakerLayout: 'in_ceiling', systemType: 'low_impedance', useCases: ['program_audio'], microphoneType: 'none', ucCompatibility: false },
            technicalDetails: { primaryVideoResolution: '4K/60Hz 4:4:4', videoSignalTypes: ['HDMI'], controlSystem: 'Third-Party Integration', cameraType: 'none', cameraCount: 0, roomPc: false },
        },
    }
];