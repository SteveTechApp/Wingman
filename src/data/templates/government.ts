
import { v4 as uuidv4 } from 'uuid';
import { UserTemplate } from '../../utils/types';

export const GOVERNMENT_TEMPLATES: UserTemplate[] = [
    // --- SECURE OFFICE ---
    {
        templateId: uuidv4(),
        conceptId: 'secure-office',
        conceptName: 'Secure Meeting Room',
        templateName: 'Secure Office',
        description: 'A simple, secure presentation system for a government office or small meeting room.',
        vertical: 'gov',
        roomData: {
            id: '', roomName: 'Manager\'s Office', roomType: 'Conference Room', designTier: 'Bronze',
            dimensions: { length: 5, width: 4, height: 2.8 }, maxParticipants: 4, 
            ioRequirements: [
                { id: uuidv4(), name: 'Desk Input', deviceType: 'Laptop', type: 'input', quantity: 1, connectionType: 'HDMI', distributionType: 'Direct', distance: 2, terminationType: 'Table Box', control: { needed: false, types: [] } },
                { id: uuidv4(), name: 'Wall Display', deviceType: 'Room Display', type: 'output', quantity: 1, connectionType: 'HDMI', distributionType: 'Direct', distance: 5, terminationType: 'Wall Mount', control: { needed: false, types: [] } },
            ],
            displayType: 'single', displayCount: 1,
            features: [],
            functionalityStatement: 'A basic and highly secure presentation setup. A simple SW-0201-4K auto-switcher allows a user to connect a laptop via HDMI or USB-C to a wall-mounted display. The system is entirely point-to-point with no network connection, ensuring maximum security.',
            manuallyAddedEquipment: [
                { sku: 'SW-0201-4K', name: '2x1 USB-C & HDMI Wireless Switcher', quantity: 1, category: 'Presentation Switcher', description: 'A compact 2x1 presentation switcher with HDMI and USB-C inputs and wireless casting support.', tags: ['Switcher', 'USB-C', 'Casting', '4K', 'Bronze', 'HDMI', 'Auto-switching', '2x1'] },
            ],
            constructionDetails: { wallConstruction: 'drywall', cableContainment: 'trunking', furnitureType: 'fixed' },
            audioSystemDetails: { speakerLayout: 'none', systemType: 'low_impedance', useCases: [], microphoneType: 'none', ucCompatibility: false },
            technicalDetails: { primaryVideoResolution: '1080p', videoSignalTypes: ['HDMI'], controlSystem: 'None (Auto-switching)', cameraType: 'none', cameraCount: 0, roomPc: false },
        },
    },
    {
        templateId: uuidv4(),
        conceptId: 'secure-office',
        conceptName: 'Secure Meeting Room',
        templateName: 'Secure Conference Room',
        description: 'A secure room with fiber connectivity to prevent EMI eavesdropping.',
        vertical: 'gov',
        roomData: {
            id: '', roomName: 'Secure Conference Room', roomType: 'Conference Room', designTier: 'Silver',
            dimensions: { length: 8, width: 6, height: 3 }, maxParticipants: 10, 
            ioRequirements: [
                 { id: uuidv4(), name: 'Table Input', deviceType: 'Laptop', type: 'input', quantity: 2, connectionType: 'HDMI', distributionType: 'Fiber', distance: 15, terminationType: 'Table Box', control: { needed: false, types: [] } },
            ],
            displayType: 'single', displayCount: 1,
            features: [],
            functionalityStatement: 'A secure meeting room utilizing fiber optic extenders to prevent electromagnetic signal leakage. This ensures that sensitive data cannot be intercepted. A standalone switcher manages local inputs without network connectivity.',
            manuallyAddedEquipment: [
                { sku: 'CAB-HAOC-10', name: 'Essentials 10m 4K/60Hz 4:4:4 Active Optical HDMI Cable', quantity: 2, category: 'Cable', description: 'A hybrid active optical fiber HDMI cable.', tags: ['Cable', 'HDMI', 'AOC', 'Fiber', '18Gbps', '10m'] },
                { sku: 'SW-0401-H2', name: '4x1 4K/60Hz 4:2:0 HDMI Switcher', quantity: 1, category: 'Presentation Switcher', description: 'A simple and reliable 4-input HDMI switcher.', tags: ['Switcher', 'HDMI', '4K', 'Bronze', '4x1', '4K30', '4:2:0', 'Auto-switching'] },
            ],
            constructionDetails: { wallConstruction: 'concrete', cableContainment: 'conduit', furnitureType: 'fixed' },
            audioSystemDetails: { speakerLayout: 'none', systemType: 'low_impedance', useCases: [], microphoneType: 'none', ucCompatibility: false },
            technicalDetails: { primaryVideoResolution: '4K/60Hz 4:4:4', videoSignalTypes: ['HDMI'], controlSystem: 'None (Auto-switching)', cameraType: 'none', cameraCount: 0, roomPc: false },
        },
    },
    {
        templateId: uuidv4(),
        conceptId: 'secure-office',
        conceptName: 'Secure Meeting Room',
        templateName: 'SCIF Briefing Room',
        description: 'A top-tier secure facility with advanced fiber distribution and zero network exposure.',
        vertical: 'gov',
        roomData: {
            id: '', roomName: 'SCIF Room', roomType: 'Briefing Room', designTier: 'Gold',
            dimensions: { length: 10, width: 8, height: 3 }, maxParticipants: 12, 
            ioRequirements: [], displayType: 'dual_display', displayCount: 2,
            features: [{ name: 'Multi-Display Support', priority: 'must-have' }],
            functionalityStatement: 'A Sensitive Compartmented Information Facility (SCIF) briefing room. Optical fiber HDMI cables run from the secure table inputs to a dual-output matrix switcher. This allows independent content routing to two displays for detailed analysis. The system is air-gapped from any external networks.',
            manuallyAddedEquipment: [
                 { sku: 'MX-0402-H2-MST', name: '4x2 4K Matrix with Multi-View Scaling', quantity: 1, category: 'Matrix Switcher', description: '4x2 4K matrix switcher.', tags: ['Matrix', 'Multiview', '4K', 'Silver', '4x2', 'Scaling'] },
                 { sku: 'CAB-HAOC-30', name: 'Essentials 30m 4K/60Hz 4:4:4 Active Optical HDMI Cable', quantity: 4, category: 'Cable', description: 'Long-range fiber HDMI.', tags: ['Cable', 'HDMI', 'AOC', 'Fiber', '18Gbps', '30m'] },
            ],
            constructionDetails: { wallConstruction: 'concrete', cableContainment: 'floor_boxes', furnitureType: 'fixed' },
            audioSystemDetails: { speakerLayout: 'none', systemType: 'low_impedance', useCases: [], microphoneType: 'none', ucCompatibility: false },
            technicalDetails: { primaryVideoResolution: '4K/60Hz 4:4:4', videoSignalTypes: ['HDMI'], controlSystem: 'Simple Keypad', cameraType: 'none', cameraCount: 0, roomPc: false },
        },
    },

    // --- COUNCIL CHAMBER ---
    {
        templateId: uuidv4(),
        conceptId: 'council-chamber',
        conceptName: 'Council Chamber',
        templateName: 'Basic Town Hall',
        description: 'A simple projection system for small town hall meetings.',
        vertical: 'gov',
        roomData: {
            id: '', roomName: 'Town Hall', roomType: 'Council Chamber', designTier: 'Bronze',
            dimensions: { length: 12, width: 10, height: 4 }, maxParticipants: 50, 
            ioRequirements: [], displayType: 'projector', displayCount: 1,
            features: [{ name: 'Speech Reinforcement', priority: 'must-have' }],
            functionalityStatement: 'A basic system for a small town council. A single projector displays the agenda. A simple mixer amp and microphones ensure the council members can be heard.',
            manuallyAddedEquipment: [
                { sku: 'SW-510-TX', name: '5-Input 4K HDBaseT Presentation Switcher', quantity: 1, category: 'Presentation Switcher', description: 'Basic switching and extension.', tags: ['HDBaseT', '4K', 'Switcher', 'Silver'] },
            ],
            constructionDetails: { wallConstruction: 'drywall', cableContainment: 'trunking', furnitureType: 'fixed' },
            audioSystemDetails: { speakerLayout: 'surface_mount', systemType: 'high_impedance', useCases: ['speech_reinforcement'], microphoneType: 'table_mic', ucCompatibility: false },
            technicalDetails: { primaryVideoResolution: '1080p', videoSignalTypes: ['HDMI'], controlSystem: 'Simple Keypad', cameraType: 'none', cameraCount: 0, roomPc: false },
        },
    },
    {
        templateId: uuidv4(),
        conceptId: 'council-chamber',
        conceptName: 'Council Chamber',
        templateName: 'Standard Council Chamber',
        description: 'A professional system with delegate microphones and multiple displays.',
        vertical: 'gov',
        roomData: {
            id: '', roomName: 'City Hall', roomType: 'Council Chamber', designTier: 'Silver',
            dimensions: { length: 15, width: 12, height: 5 }, maxParticipants: 80, 
            ioRequirements: [], displayType: 'dual_display', displayCount: 2,
            features: [{ name: 'Speech Reinforcement', priority: 'must-have' }],
            functionalityStatement: 'A capable system for city council meetings. Multiple displays ensure the gallery can see presentations. A robust audio system manages multiple microphones.',
            manuallyAddedEquipment: [
                { sku: 'MX-0804-EDU', name: '8x4 Education Matrix Switcher', quantity: 1, category: 'Matrix Switcher', description: 'Perfect for mixing mics and routing video.', tags: ['Matrix', 'Education', 'Audio', 'Silver'] },
                { sku: 'AMP-260-DNT', name: '120W Network Amplifier', quantity: 1, category: 'Amplifier', description: 'Amplification with Dante.', tags: ['Amplifier', 'Dante'] },
            ],
            constructionDetails: { wallConstruction: 'concrete', cableContainment: 'floor_boxes', furnitureType: 'fixed' },
            audioSystemDetails: { speakerLayout: 'in_ceiling', systemType: 'high_impedance', useCases: ['speech_reinforcement'], microphoneType: 'table_mic', ucCompatibility: false },
            technicalDetails: { primaryVideoResolution: '1080p', videoSignalTypes: ['HDMI'], controlSystem: 'Simple Keypad', cameraType: 'none', cameraCount: 0, roomPc: false },
        },
    },
    {
        templateId: uuidv4(),
        conceptId: 'council-chamber',
        conceptName: 'Council Chamber',
        templateName: 'Broadcast Council Chamber',
        description: 'A formal meeting space with delegate microphones, video conferencing, and broadcast capabilities.',
        vertical: 'gov',
        roomData: {
            id: '',
            roomName: 'City Council Chamber',
            roomType: 'Council Chamber',
            designTier: 'Gold',
            dimensions: { length: 18, width: 12, height: 4 },
            maxParticipants: 50,
            ioRequirements: [],
            displayType: 'dual_display',
            displayCount: 4, // Dual main displays, plus smaller gallery displays
            functionalityStatement: 'A sophisticated system for public meetings. Each delegate position has a microphone with a request-to-speak button. Multiple PTZ cameras automatically focus on the active speaker. A powerful matrix switcher routes presentation content and camera feeds to main projectors and smaller displays for the public gallery. The entire meeting is recorded and streamed for public access, managed from a dedicated control room.',
            manuallyAddedEquipment: [
                { sku: 'MX-1007-HYB', name: '10x7 Hybrid HDBaseT/HDMI Matrix Switcher', quantity: 1, category: 'Matrix Switcher', description: 'A powerful hybrid matrix with 10 inputs (HDMI, HDBaseT) and 7 outputs, with integrated audio DSP.', tags: ['Matrix', 'HDBaseT', 'DSP', '4K', 'Gold', '10x7', 'HDMI'] },
                { sku: 'CAM-210-PTZ', name: '4K AI Tracking PTZ Camera with NDI|HX3', quantity: 3, category: 'Camera', description: 'A professional 4K60Hz PTZ camera with powerful AI tracking capabilities to automatically follow a presenter.', tags: ['Camera', 'PTZ', '4K', 'USB', '12x Zoom', 'AI Tracking', 'IP Stream', 'HDMI', 'NDI'] },
                { sku: 'SYN-TOUCH10', name: 'Synergy™ 10.1” All-in-One Touchpad IP Controller', quantity: 1, category: 'Control', description: 'PoE+ | Table Top Stand & Wall-Mount (US/UK/EU Compatible)', tags: ['Control', 'Touchscreen', 'Synergy'] },
            ],
            features: [
                { name: 'Video Conferencing', priority: 'must-have' },
                { name: 'Speech Reinforcement', priority: 'must-have' },
            ],
            constructionDetails: {
                wallConstruction: 'drywall',
                cableContainment: 'floor_boxes',
                furnitureType: 'fixed'
            },
            audioSystemDetails: {
                speakerLayout: 'in_ceiling',
                systemType: 'high_impedance',
                useCases: ['speech_reinforcement', 'video_conferencing'],
                microphoneType: 'table_mic',
                ucCompatibility: true
            },
            technicalDetails: {
                primaryVideoResolution: '1080p',
                videoSignalTypes: ['HDMI', 'SDI'],
                controlSystem: 'Third-Party Integration',
                cameraType: 'hdmi_ptz',
                cameraCount: 3,
                roomPc: true,
            },
        }
    }
];
