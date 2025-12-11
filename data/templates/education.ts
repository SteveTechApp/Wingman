
import { v4 as uuidv4 } from 'uuid';
import { UserTemplate } from '../../utils/types';

export const EDUCATION_TEMPLATES: UserTemplate[] = [
    // --- CLASSROOMS ---
    {
        templateId: uuidv4(),
        conceptId: 'classroom',
        conceptName: 'Classroom',
        templateName: 'Standard Classroom',
        description: 'A simple, budget-friendly setup with a projector and a wired wall plate input.',
        vertical: 'edu',
        roomData: {
            id: '', roomName: 'Classroom 3B', roomType: 'Classroom', designTier: 'Bronze',
            dimensions: { length: 9, width: 7, height: 3 }, maxParticipants: 25, 
            ioRequirements: [
                { id: uuidv4(), name: 'Wall Plate Input', deviceType: 'Guest Device', type: 'input', quantity: 1, connectionType: 'HDMI', distributionType: 'HDBaseT', distance: 15, terminationType: 'Wall Plate', control: { needed: false, types: [] } },
                { id: uuidv4(), name: 'Projector', deviceType: 'Projector', type: 'output', quantity: 1, connectionType: 'HDMI', distributionType: 'HDBaseT', distance: 2, terminationType: 'Ceiling Mount', control: { needed: false, types: [] } },
            ],
            displayType: 'projector', displayCount: 1,
            features: [],
            functionalityStatement: 'A cost-effective and reliable AV system for a standard K-12 classroom. A bright projector displays content from a wall plate with an HDMI input. An EX-70-G2 HDBaseT extender set ensures a reliable signal from the wall to the projector. Built-in projector speakers provide audio. This simple setup is robust and easy for any teacher to use.',
            manuallyAddedEquipment: [
                { sku: 'EX-70-G2', name: '4K60Hz 4:2:0 HDBaseT Extender', quantity: 1, category: 'Extender', description: 'PoH | CEC | IR | RS232 (4K: 35m/115ft, 1080p: 70m/230ft)', tags: ['Extender', 'HDBaseT', 'Class B', '4K30', '4:2:0', 'CEC', 'IR', 'RS232'] },
            ],
            constructionDetails: { wallConstruction: 'concrete', cableContainment: 'trunking', furnitureType: 'multi_use' },
            audioSystemDetails: { speakerLayout: 'none', systemType: 'low_impedance', useCases: [], microphoneType: 'none', ucCompatibility: false },
            technicalDetails: { primaryVideoResolution: '1080p', videoSignalTypes: ['HDMI', 'USB-C'], controlSystem: 'None (Auto-switching)', cameraType: 'none', cameraCount: 0, roomPc: false },
        },
    },
    {
        templateId: uuidv4(),
        conceptId: 'classroom',
        conceptName: 'Classroom',
        templateName: 'Interactive Classroom',
        description: 'A modern classroom with an interactive display, wireless casting, and voice reinforcement.',
        vertical: 'edu',
        roomData: {
            id: '',
            roomName: 'Interactive Learning Space',
            roomType: 'Classroom',
            designTier: 'Silver',
            dimensions: { length: 10, width: 8, height: 3 },
            maxParticipants: 30,
            ioRequirements: [
                { id: uuidv4(), name: 'Lectern PC', deviceType: 'Room PC', type: 'input', quantity: 1, connectionType: 'HDMI', distributionType: 'Direct', distance: 2, terminationType: 'Lectern', control: { needed: false, types: [] } },
                { id: uuidv4(), name: 'Guest Laptop', deviceType: 'Laptop', type: 'input', quantity: 1, connectionType: 'HDMI', distributionType: 'Direct', distance: 2, terminationType: 'Lectern', control: { needed: false, types: [] } },
                { id: uuidv4(), name: 'Interactive Display', deviceType: 'Room Display', type: 'output', quantity: 1, connectionType: 'HDMI', distributionType: 'HDBaseT', distance: 15, terminationType: 'Wall Mount', control: { needed: false, types: [] } },
            ],
            displayType: 'single',
            displayCount: 1,
            features: [
                { name: 'Wireless Presentation', priority: 'must-have' },
                { name: 'Speech Reinforcement', priority: 'must-have' },
            ],
            functionalityStatement: 'An engaging learning environment where the instructor can present from a fixed lectern with multiple inputs. The SW-510-TX switcher sends the selected source to the main interactive display via a reliable HDBaseT connection. A ceiling microphone provides clear voice lift, and a simple wall-plate controller manages the system.',
            manuallyAddedEquipment: [
                { sku: 'SW-510-TX', name: '5-Input 4K HDBaseT Presentation Switcher', quantity: 1, category: 'Presentation Switcher', description: '5-input HDBaseT/HDMI/VGA/DP switcher with scaling and CEC control.', tags: ['HDBaseT', '4K', 'Switcher', 'CEC', 'Silver', '5x1', 'HDMI', 'VGA', 'DisplayPort', 'Scaling'] },
                { sku: 'AMP-260-DNT', name: '120W Network Amplifier', quantity: 1, category: 'Amplifier', description: '2 x 60w or 4 x 25w Channel Output @ 4ohm | Dual Power Options | Advanced DSP with Dante Integration', tags: ['Amplifier', 'Dante', 'DSP', 'Low Impedance'] },
            ],
            constructionDetails: { wallConstruction: 'concrete', cableContainment: 'trunking', furnitureType: 'multi_use' },
            audioSystemDetails: { speakerLayout: 'surface_mount', systemType: 'high_impedance', useCases: ['speech_reinforcement', 'program_audio'], microphoneType: 'ceiling_mic', ucCompatibility: false },
            technicalDetails: { primaryVideoResolution: '4K/30Hz 4:4:4', videoSignalTypes: ['HDMI', 'USB-C'], controlSystem: 'Simple Keypad', cameraType: 'none', cameraCount: 0, roomPc: true },
        },
    },
    {
        templateId: uuidv4(),
        conceptId: 'classroom',
        conceptName: 'Classroom',
        templateName: 'Hybrid Classroom',
        description: 'A flexible learning space with multi-input switching, lecture capture, and full BYOM capabilities for remote students.',
        vertical: 'edu',
        roomData: {
            id: '', roomName: 'Hybrid Classroom', roomType: 'Classroom', designTier: 'Gold',
            dimensions: { length: 10, width: 8, height: 3 }, maxParticipants: 30,
            ioRequirements: [], displayType: 'dual_display', displayCount: 2,
            features: [{ name: 'Video Conferencing', priority: 'must-have' }, { name: 'Wireless Presentation', priority: 'must-have' }],
            functionalityStatement: 'A future-proof hybrid classroom. The SW-640L-TX-W switcher supports dual displays and full BYOM via wireless casting, allowing both in-room and remote students to participate fully. An AI-tracking camera follows the instructor, providing an engaging experience for remote learners.',
            manuallyAddedEquipment: [
                { sku: 'SW-640L-TX-W', name: '6-Input 4K/60Hz Presentation Switcher with USB-C & Wireless Casting', quantity: 1, category: 'Presentation Switcher', description: 'Dual output 4K presentation switcher with wireless casting, USB-C, and USB host for peripherals.', tags: ['Switcher', 'USB-C', 'Casting', '4K', 'Gold', '6x2', 'Dual Output', 'USB Host', 'BYOM', 'Wireless'] },
                { sku: 'CAM-210-PTZ', name: '4K AI Tracking PTZ Camera with NDI|HX3', quantity: 1, category: 'Camera', description: 'A professional 4K60Hz PTZ camera with powerful AI tracking capabilities to automatically follow a presenter.', tags: ['Camera', 'PTZ', '4K', 'USB', '12x Zoom', 'AI Tracking', 'IP Stream', 'HDMI', 'NDI'] },
            ],
            constructionDetails: { wallConstruction: 'drywall', cableContainment: 'floor_boxes', furnitureType: 'multi_use' },
            audioSystemDetails: { speakerLayout: 'in_ceiling', systemType: 'high_impedance', useCases: ['speech_reinforcement', 'video_conferencing'], microphoneType: 'ceiling_mic', ucCompatibility: true },
            technicalDetails: { primaryVideoResolution: '4K/60Hz 4:4:4', videoSignalTypes: ['HDMI', 'USB-C'], controlSystem: 'Touch Panel', cameraType: 'hdmi_ptz', cameraCount: 1, roomPc: true },
        },
    },

    // --- LECTURE HALLS ---
    {
        templateId: uuidv4(),
        conceptId: 'lecture-hall',
        conceptName: 'Lecture Hall',
        templateName: 'Basic Lecture Hall',
        description: 'A straightforward single-projector system for large group instruction.',
        vertical: 'edu',
        roomData: {
            id: '', roomName: 'Lecture Hall A', roomType: 'Lecture Hall', designTier: 'Bronze',
            dimensions: { length: 15, width: 12, height: 5 }, maxParticipants: 100,
            ioRequirements: [
                { id: uuidv4(), name: 'Lectern HDMI', deviceType: 'Laptop', type: 'input', quantity: 1, connectionType: 'HDMI', distributionType: 'HDBaseT', distance: 20, terminationType: 'Lectern', control: { needed: false, types: [] } },
                { id: uuidv4(), name: 'Projector', deviceType: 'Projector', type: 'output', quantity: 1, connectionType: 'HDMI', distributionType: 'HDBaseT', distance: 30, terminationType: 'Ceiling Mount', control: { needed: false, types: [] } },
            ],
            displayType: 'projector', displayCount: 1,
            features: [{ name: 'Speech Reinforcement', priority: 'must-have' }],
            functionalityStatement: 'A reliable projection system for a university lecture hall. An EX-100-G2 extender kit sends video from the lecturer\'s laptop to a high-brightness projector over a long distance. A simple microphone input on the projector or a basic PA system ensures the lecturer is heard.',
            manuallyAddedEquipment: [
                { sku: 'EX-100-G2', name: '4K60Hz 4.2.0 HDBaseT Extender', quantity: 1, category: 'Extender', description: 'PoH | CEC | IR | RS232 | 100m/327ft', tags: ['Extender', 'HDBaseT', '4K', 'Class A', '4K30', '4:2:0', 'CEC', 'IR', 'RS232'] },
            ],
            constructionDetails: { wallConstruction: 'concrete', cableContainment: 'floor_boxes', furnitureType: 'fixed' },
            audioSystemDetails: { speakerLayout: 'surface_mount', systemType: 'high_impedance', useCases: ['speech_reinforcement'], microphoneType: 'wireless_lav', ucCompatibility: false },
            technicalDetails: { primaryVideoResolution: '1080p', videoSignalTypes: ['HDMI'], controlSystem: 'None (Auto-switching)', cameraType: 'none', cameraCount: 0, roomPc: false },
        },
    },
    {
        templateId: uuidv4(),
        conceptId: 'lecture-hall',
        conceptName: 'Lecture Hall',
        templateName: 'Advanced Lecture Hall',
        description: 'A dual-projection system with multi-source switching and confidence monitoring.',
        vertical: 'edu',
        roomData: {
            id: '', roomName: 'Lecture Hall B', roomType: 'Lecture Hall', designTier: 'Silver',
            dimensions: { length: 18, width: 14, height: 6 }, maxParticipants: 150,
            ioRequirements: [
                { id: uuidv4(), name: 'Lectern Inputs', deviceType: 'Laptop', type: 'input', quantity: 4, connectionType: 'HDMI', distributionType: 'Direct', distance: 2, terminationType: 'Lectern', control: { needed: false, types: [] } },
                { id: uuidv4(), name: 'Left Projector', deviceType: 'Projector', type: 'output', quantity: 1, connectionType: 'HDMI', distributionType: 'HDBaseT', distance: 40, terminationType: 'Ceiling Mount', control: { needed: false, types: [] } },
                { id: uuidv4(), name: 'Right Projector', deviceType: 'Projector', type: 'output', quantity: 1, connectionType: 'HDMI', distributionType: 'HDBaseT', distance: 40, terminationType: 'Ceiling Mount', control: { needed: false, types: [] } },
            ],
            displayType: 'projector', displayCount: 2,
            features: [{ name: 'Speech Reinforcement', priority: 'must-have' }, { name: 'Multi-Display Support', priority: 'must-have' }],
            functionalityStatement: 'A dual-screen lecture hall allowing for flexible presentation. The MX-0804-EDU matrix switcher manages multiple inputs from the lectern and routes them to two large projectors. This allows simultaneous display of different content (e.g., slides and document camera). Integrated audio mixing supports multiple microphones.',
            manuallyAddedEquipment: [
                { sku: 'MX-0804-EDU', name: '8x4 Education Matrix Switcher', quantity: 1, category: 'Matrix Switcher', description: 'An 8-input, 4-output matrix designed for classrooms with mic inputs and powerful audio mixing.', tags: ['Matrix', 'Education', 'Audio', 'Silver', '8x4', 'Microphone Input', 'Audio Mixer'] },
                { sku: 'GEN-PTZ-CAM', name: 'Generic 4K PTZ Camera', quantity: 1, category: 'Camera', description: 'PTZ camera for lecture capture.', tags: ['Camera', 'PTZ', '4K'] },
            ],
            constructionDetails: { wallConstruction: 'concrete', cableContainment: 'floor_boxes', furnitureType: 'fixed' },
            audioSystemDetails: { speakerLayout: 'in_ceiling', systemType: 'high_impedance', useCases: ['speech_reinforcement', 'program_audio'], microphoneType: 'table_mic', ucCompatibility: false },
            technicalDetails: { primaryVideoResolution: '4K/30Hz 4:4:4', videoSignalTypes: ['HDMI', 'VGA'], controlSystem: 'Simple Keypad', cameraType: 'hdmi_ptz', cameraCount: 1, roomPc: true },
        },
    },
    {
        templateId: uuidv4(),
        conceptId: 'lecture-hall',
        conceptName: 'Lecture Hall',
        templateName: 'University Auditorium',
        description: 'A large venue system with projection, lecture capture, and multiple sources for higher education.',
        vertical: 'edu',
        roomData: {
            id: '',
            roomName: 'Lecture Hall 101',
            roomType: 'Lecture Hall',
            designTier: 'Gold',
            dimensions: { length: 20, width: 25, height: 8 },
            maxParticipants: 200,
            ioRequirements: [
                { id: uuidv4(), name: 'Lectern Sources', deviceType: 'Guest Device', type: 'input', quantity: 4, connectionType: 'HDMI', distributionType: 'Direct', distance: 2, terminationType: 'Lectern', control: { needed: false, types: [] } },
                { id: uuidv4(), name: 'Main Projectors', deviceType: 'Projector', type: 'output', quantity: 2, connectionType: 'HDMI', distributionType: 'HDBaseT', distance: 50, terminationType: 'Ceiling Mount', control: { needed: false, types: [] } },
                { id: uuidv4(), name: 'Confidence Monitor', deviceType: 'Confidence Monitor', type: 'output', quantity: 1, connectionType: 'HDMI', distributionType: 'Direct', distance: 3, terminationType: 'Floor Box', control: { needed: false, types: [] } },
            ],
            displayType: 'projector',
            displayCount: 2,
            features: [
                { name: 'Speech Reinforcement', priority: 'must-have' },
                 { name: 'Multi-Display Support', priority: 'must-have' },
            ],
            functionalityStatement: 'A comprehensive AV system for a large university lecture hall, centered around the powerful MX-1007-HYB hybrid matrix. It routes multiple sources from the lectern to dual laser projectors and a confidence monitor. The system integrates with a lecture capture platform to record and stream classes via a dedicated PTZ camera. A distributed audio system with Dante integration ensures every student hears clearly.',
            manuallyAddedEquipment: [
                { sku: 'MX-1007-HYB', name: '10x7 Hybrid HDBaseT/HDMI Matrix Switcher', quantity: 1, category: 'Matrix Switcher', description: 'A powerful hybrid matrix with 10 inputs (HDMI, HDBaseT) and 7 outputs, with integrated audio DSP.', tags: ['Matrix', 'HDBaseT', 'DSP', '4K', 'Gold', '10x7', 'HDMI'] },
                { sku: 'GEN-PTZ-CAM', name: 'Generic 4K PTZ Camera', quantity: 2, category: 'Camera', description: 'A professional 4K pan-tilt-zoom camera with 12x optical zoom, USB, and IP streaming. Ideal for larger rooms and lecture halls.', tags: ['Camera', 'PTZ', '4K', 'USB', '12x Zoom', 'USB3.0', 'IP Stream', 'HDMI'] },
                { sku: 'AMP-260-DNT', name: '120W Network Amplifier', quantity: 2, category: 'Amplifier', description: '2 x 60w or 4 x 25w Channel Output @ 4ohm | Dual Power Options | Advanced DSP with Dante Integration', tags: ['Amplifier', 'Dante', 'DSP', 'Low Impedance'] },
            ],
            constructionDetails: { wallConstruction: 'concrete', cableContainment: 'floor_boxes', furnitureType: 'fixed' },
            audioSystemDetails: { speakerLayout: 'in_ceiling', systemType: 'high_impedance', useCases: ['speech_reinforcement', 'program_audio'], microphoneType: 'table_mic', ucCompatibility: false },
            technicalDetails: { primaryVideoResolution: '4K/30Hz 4:4:4', videoSignalTypes: ['HDMI', 'DisplayPort', 'SDI'], controlSystem: 'Touch Panel', cameraType: 'hdmi_ptz', cameraCount: 2, roomPc: true },
        },
    }
];
