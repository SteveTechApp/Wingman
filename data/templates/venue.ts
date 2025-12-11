
import { v4 as uuidv4 } from 'uuid';
import { UserTemplate } from '../../utils/types';

export const VENUE_TEMPLATES: UserTemplate[] = [
    {
        templateId: uuidv4(),
        conceptId: 'venue-space',
        conceptName: 'Venue Space',
        templateName: 'Small Presentation Space',
        description: 'A cost-effective setup for a small presentation or event space using a simple HDBaseT extender.',
        vertical: 'ven',
        roomData: {
            id: '', roomName: 'Meeting Space A', roomType: 'Conference Room', designTier: 'Bronze',
            dimensions: { length: 15, width: 10, height: 4 }, maxParticipants: 50, 
            ioRequirements: [
                { id: uuidv4(), name: 'Floor Box Input', deviceType: 'Guest Device', type: 'input', quantity: 1, connectionType: 'HDMI', distributionType: 'HDBaseT', distance: 20, terminationType: 'Floor Box', control: { needed: false, types: [] } },
                { id: uuidv4(), name: 'Projector', deviceType: 'Projector', type: 'output', quantity: 1, connectionType: 'HDMI', distributionType: 'HDBaseT', distance: 2, terminationType: 'Ceiling Mount', control: { needed: false, types: [] } },
            ],
            displayType: 'projector', displayCount: 1,
            features: [{ name: 'Speech Reinforcement', priority: 'must-have' }],
            functionalityStatement: 'A robust and user-friendly system for a convention center breakout room. A ceiling-mounted projector and screen are connected via an EX-70-G2 HDBaseT extender set. Floor and wall plates provide HDMI inputs for presenters. A basic audio system with a wireless microphone is included for speech reinforcement. The system is designed for reliability and quick setup between events.',
            manuallyAddedEquipment: [
                { sku: 'EX-70-G2', name: '4K60Hz 4:2:0 HDBaseT Extender', quantity: 1, category: 'Extender', description: 'PoH | CEC | IR | RS232 (4K: 35m/115ft, 1080p: 70m/230ft)', tags: ['Extender', 'HDBaseT', 'Class B', '4K30', '4:2:0', 'CEC', 'IR', 'RS232'] },
            ],
            constructionDetails: { wallConstruction: 'drywall', cableContainment: 'floor_boxes', furnitureType: 'multi_use' },
            audioSystemDetails: { speakerLayout: 'in_ceiling', systemType: 'high_impedance', useCases: ['speech_reinforcement'], microphoneType: 'wireless_lav', ucCompatibility: false },
            technicalDetails: { primaryVideoResolution: '1080p', videoSignalTypes: ['HDMI'], controlSystem: 'Simple Keypad', cameraType: 'none', cameraCount: 0, roomPc: false },
        },
    },
    {
        templateId: uuidv4(),
        conceptId: 'venue-space',
        conceptName: 'Venue Space',
        templateName: 'Convention Breakout Room',
        description: 'A standard, easy-to-use AV setup for temporary meetings and presentations with a multi-input switcher.',
        vertical: 'ven',
        roomData: {
            id: '', roomName: 'Breakout Room C', roomType: 'Conference Room', designTier: 'Silver',
            dimensions: { length: 15, width: 10, height: 4 }, maxParticipants: 50, 
            ioRequirements: [
                { id: uuidv4(), name: 'Lectern Input', deviceType: 'Guest Device', type: 'input', quantity: 1, connectionType: 'HDMI', distributionType: 'HDBaseT', distance: 20, terminationType: 'Floor Box', control: { needed: false, types: [] } },
                { id: uuidv4(), name: 'Projector', deviceType: 'Projector', type: 'output', quantity: 1, connectionType: 'HDMI', distributionType: 'HDBaseT', distance: 2, terminationType: 'Ceiling Mount', control: { needed: false, types: [] } },
            ],
            displayType: 'projector', displayCount: 1,
            features: [{ name: 'Speech Reinforcement', priority: 'must-have' }],
            functionalityStatement: 'A flexible AV system for a breakout room, featuring a SW-510-TX presentation switcher at a lectern. This allows for multiple source types (HDMI, VGA, DP) and sends a reliable HDBaseT signal to the main projector. A simple keypad provides source selection, and an integrated audio system supports a presenter microphone.',
            manuallyAddedEquipment: [
                { sku: 'SW-510-TX', name: '5-Input 4K HDBaseT Presentation Switcher', quantity: 1, category: 'Presentation Switcher', description: '5-input HDBaseT/HDMI/VGA/DP switcher with scaling and CEC control.', tags: ['HDBaseT', '4K', 'Switcher', 'CEC', 'Silver', '5x1', 'HDMI', 'VGA', 'DisplayPort', 'Scaling'] },
            ],
            constructionDetails: { wallConstruction: 'drywall', cableContainment: 'floor_boxes', furnitureType: 'multi_use' },
            audioSystemDetails: { speakerLayout: 'in_ceiling', systemType: 'high_impedance', useCases: ['speech_reinforcement'], microphoneType: 'wireless_lav', ucCompatibility: false },
            technicalDetails: { primaryVideoResolution: '1080p', videoSignalTypes: ['HDMI'], controlSystem: 'Simple Keypad', cameraType: 'none', cameraCount: 0, roomPc: false },
        },
    },
    {
        templateId: uuidv4(),
        conceptId: 'venue-space',
        conceptName: 'Venue Space',
        templateName: 'Corporate Auditorium',
        description: 'A projection-based system for corporate auditoriums with multiple inputs, streaming, and touch panel control.',
        vertical: 'ven',
        roomData: {
            id: '',
            roomName: 'Corporate Auditorium',
            roomType: 'Auditorium',
            designTier: 'Gold',
            dimensions: { length: 30, width: 20, height: 7 },
            maxParticipants: 250,
            ioRequirements: [
                { id: uuidv4(), name: 'Lectern Inputs', deviceType: 'Laptop', type: 'input', quantity: 3, connectionType: 'HDMI', distributionType: 'Direct', distance: 3, terminationType: 'Lectern', control: { needed: false, types: [] } },
                { id: uuidv4(), name: 'Main Projector', deviceType: 'Projector', type: 'output', quantity: 1, connectionType: 'HDMI', distributionType: 'HDBaseT', distance: 40, terminationType: 'Ceiling Mount', control: { needed: false, types: [] } },
            ],
            displayType: 'projector',
            displayCount: 1,
            features: [
                { name: 'Speech Reinforcement', priority: 'must-have' },
                { name: 'Multi-Display Support', priority: 'nice-to-have' }, // For confidence monitors
            ],
            functionalityStatement: 'A professional presentation system for a large auditorium. A high-brightness laser projector is fed by a powerful SW-640L-TX-W presentation switcher located at the lectern. The switcher accommodates various sources, including guest laptops and a resident PC. Multiple wireless microphones and a distributed speaker system ensure clear audio for every attendee. The system is managed via a touch panel controller.',
            manuallyAddedEquipment: [
                { sku: 'SW-640L-TX-W', name: '6-Input 4K/60Hz Presentation Switcher with USB-C & Wireless Casting', quantity: 1, category: 'Presentation Switcher', description: 'Dual output 4K presentation switcher with wireless casting, USB-C, and USB host for peripherals.', tags: ['Switcher', 'USB-C', 'Casting', '4K', 'Gold', '6x2', 'Dual Output', 'USB Host'] },
                { sku: 'CAM-210-PTZ', name: '4K AI Tracking PTZ Camera with NDI|HX3', quantity: 1, category: 'Camera', description: 'A professional 4K60Hz PTZ camera with powerful AI tracking capabilities to automatically follow a presenter.', tags: ['Camera', 'PTZ', '4K', 'USB', '12x Zoom', 'AI Tracking', 'IP Stream', 'HDMI', 'NDI'] },
                { sku: 'SYN-TOUCH10', name: 'Synergy™ 10.1” All-in-One Touchpad IP Controller', quantity: 1, category: 'Control', description: 'PoE+ | Table Top Stand & Wall-Mount (US/UK/EU Compatible)', tags: ['Control', 'Touchscreen', 'Synergy'] },
            ],
            constructionDetails: { wallConstruction: 'concrete', cableContainment: 'conduit', furnitureType: 'fixed' },
            audioSystemDetails: { speakerLayout: 'surface_mount', systemType: 'high_impedance', useCases: ['speech_reinforcement', 'program_audio'], microphoneType: 'wireless_lav', ucCompatibility: false },
            technicalDetails: { primaryVideoResolution: '4K/30Hz 4:4:4', videoSignalTypes: ['HDMI', 'DisplayPort'], controlSystem: 'Touch Panel', cameraType: 'hdmi_ptz', cameraCount: 1, roomPc: true },
        },
    }
];
