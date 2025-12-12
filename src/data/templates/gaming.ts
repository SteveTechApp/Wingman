
import { v4 as uuidv4 } from 'uuid';
import { UserTemplate } from '../../utils/types';

export const GAMING_TEMPLATES: UserTemplate[] = [
    {
        templateId: uuidv4(),
        conceptId: 'sportsbook',
        conceptName: 'Sportsbook',
        templateName: 'Small VIP Bar',
        description: 'A simple matrix switcher to distribute a few satellite receivers to multiple TVs in a small bar or VIP area.',
        vertical: 'gam',
        roomData: {
            id: '', roomName: 'VIP Bar', roomType: 'Sports Bar', designTier: 'Bronze',
            dimensions: { length: 15, width: 10, height: 3.5 }, maxParticipants: 40, 
            ioRequirements: [],
            displayType: 'single', displayCount: 8,
            features: [],
            functionalityStatement: 'A simple and reliable TV distribution system for a small bar. A central 8x8 HDBaseT matrix switcher sends satellite and media player feeds to 8 displays. Staff can change the source for each TV using a simple keypad controller. This is a robust, cost-effective solution for basic source routing.',
            manuallyAddedEquipment: [
                { sku: 'MXV-0808-H2A-KIT', name: '4K60Hz 4.4.4 8x8 HDBaseT™ Matrix Kit', quantity: 1, category: 'Matrix Switcher', description: 'w/ 8 standard receivers & 2 Scaling receivers | Dolby Vision & HDR | PoH |Audio De-embed | Routable CEC & RS232 (4K: 35m/115ft, 1080p: 70m/230ft)', tags: ['Matrix', 'HDBaseT', 'Kit', '8x8', 'Class B', '4K60', '4:4:4', 'HDR', 'Audio De-embed', 'CEC', 'RS232'] },
            ],
            constructionDetails: { wallConstruction: 'drywall', cableContainment: 'conduit', furnitureType: 'fixed' },
            audioSystemDetails: { speakerLayout: 'in_ceiling', systemType: 'high_impedance', useCases: ['program_audio'], microphoneType: 'none', ucCompatibility: false },
            technicalDetails: { primaryVideoResolution: '1080p', videoSignalTypes: ['HDMI'], controlSystem: 'Simple Keypad', cameraType: 'none', cameraCount: 0, roomPc: false },
        },
    },
    {
        templateId: uuidv4(),
        conceptId: 'sportsbook',
        conceptName: 'Sportsbook',
        templateName: 'Sportsbook Video Wall',
        description: 'A large LED video wall for displaying multiple live games and betting odds using flexible 1Gb AVoIP.',
        vertical: 'gam',
        roomData: {
            id: '', roomName: 'Race & Sports Book', roomType: 'Large Venue', designTier: 'Silver',
            dimensions: { length: 30, width: 20, height: 7 }, maxParticipants: 200, 
            ioRequirements: [],
            displayType: 'led_video_wall', displayCount: 1,
            videoWallConfig: { type: 'led', layout: { rows: 1, cols: 1 }, technology: 'processor', multiviewRequired: true },
            features: [{ name: 'Multi-Display Support', priority: 'must-have' }],
            functionalityStatement: 'The centerpiece of a modern sportsbook: a massive, seamless direct-view LED video wall. An AVoIP system using low-bandwidth NHD-120 encoders and a powerful NHD-150-RX multiview decoder allows the wall to be configured in endless ways, showing multiple live games, odds boards, and promotional content simultaneously. Operators can instantly recall presets from a touch panel controller.',
            manuallyAddedEquipment: [
                { sku: 'NHD-120-TX', name: 'NetworkHD 120 Series 4K H.264/H.265 Encoder', quantity: 9, category: 'AVoIP Encoder', description: 'Cost-effective H.264/H.265 streaming for 4K30 video.', tags: ['NetworkHD', 'AVoIP', 'Encoder', '4K', 'H.264', 'H.265', '1GbE', '4K30'] },
                { sku: 'NHD-150-RX', name: 'NetworkHD 150 Series Multiview & Video Wall Decoder', quantity: 1, category: 'AVoIP Decoder', description: 'Specialized 100-series decoder that can display up to 9 sources on a single display.', tags: ['NetworkHD', 'AVoIP', 'Decoder', 'Multiview', 'Video Wall', '1GbE', 'H.264'] },
                { sku: 'NHD-CTL-PRO', name: 'NetworkHD Pro Controller', quantity: 1, category: 'Control', description: 'Centralized controller for NetworkHD systems.', tags: ['NetworkHD', 'Control', 'Controller'] },
            ],
            constructionDetails: { wallConstruction: 'drywall', cableContainment: 'conduit', furnitureType: 'fixed' },
            audioSystemDetails: { speakerLayout: 'surface_mount', systemType: 'low_impedance', useCases: ['program_audio'], microphoneType: 'none', ucCompatibility: false },
            technicalDetails: { primaryVideoResolution: '1080p', videoSignalTypes: ['HDMI', 'SDI'], controlSystem: 'Touch Panel', cameraType: 'none', cameraCount: 0, roomPc: false },
        },
    },
    {
        templateId: uuidv4(),
        conceptId: 'sportsbook',
        conceptName: 'Sportsbook',
        templateName: 'Esports Arena',
        description: 'A specialized venue with zero-latency 10GbE AVoIP for players and high-quality feeds for spectators.',
        vertical: 'gam',
        roomData: {
            id: '', roomName: 'Esports Arena', roomType: 'Large Venue', designTier: 'Gold',
            dimensions: { length: 40, width: 30, height: 10 }, maxParticipants: 500, 
            ioRequirements: [],
            displayType: 'led_video_wall', displayCount: 1,
            videoWallConfig: { type: 'led', layout: { rows: 1, cols: 1 }, technology: 'avoip', multiviewRequired: true },
            features: [],
            functionalityStatement: 'A state-of-the-art esports arena. Player stations feature high-refresh-rate monitors with zero-latency connections. A broadcast production booth switches between player cameras, gameplay feeds, and commentator analysis. The main spectator experience is a large LED wall showing the primary game feed. The entire system is built on a high-speed NetworkHD 600 series AVoIP backbone to ensure minimal latency, which is critical for competitive gaming.',
            manuallyAddedEquipment: [
                { sku: 'NHD-600-TRX', name: 'NetworkHD 600 Series 4K60 10GbE Transceiver', quantity: 30, category: 'AVoIP Transceiver', description: 'Uncompressed 4K60 4:4:4 video over 10GbE. Configurable as Encoder or Decoder.', tags: ['NetworkHD', 'AVoIP', 'Transceiver', '4K', 'Uncompressed', '10GbE', '4K60', '4:4:4', 'Zero Latency', 'Multiview'] },
                { sku: 'NHD-CTL-PRO', name: 'NetworkHD Pro Controller', quantity: 1, category: 'Control', description: 'Centralized controller for NetworkHD systems.', tags: ['NetworkHD', 'Control', 'Controller'] },
            ],
            constructionDetails: { wallConstruction: 'drywall', cableContainment: 'conduit', furnitureType: 'fixed' },
            audioSystemDetails: { speakerLayout: 'surface_mount', systemType: 'low_impedance', useCases: ['program_audio'], microphoneType: 'none', ucCompatibility: false },
            technicalDetails: { primaryVideoResolution: '1080p', videoSignalTypes: ['HDMI', 'DisplayPort', 'SDI'], controlSystem: 'Third-Party Integration', cameraType: 'hdmi_ptz', cameraCount: 8, roomPc: true },
        },
    }
];
