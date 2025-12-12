import { DesignTier } from '../utils/types';
import {
    DisplayIcon, DualDisplayIcon, ProjectorIcon, VideoWallIcon, InteractiveDisplayIcon
} from '../components/icons/AppIcons';

export const COMMON_FEATURES = [
    { name: 'Video Conferencing', description: 'Integrate with platforms like Zoom or Teams.' },
    { name: 'Wireless Presentation', description: 'Allow users to share content from their devices wirelessly.' },
    { name: 'Multi-Display Support', description: 'Drive two or more displays simultaneously.' },
    { name: 'Speech Reinforcement', description: 'Ensure the presenter\'s voice is heard clearly.' },
    { name: 'Program Audio', description: 'Play back high-quality audio from videos or music.' },
    { name: 'Room Scheduling', description: 'Integrate with a room booking system.' },
];

export const SOURCE_DEVICE_TYPES = [
    'Laptop', 'Tablet', 'Room PC', 'Teams MTR', 
    'Media Player', 'Satellite Decoder', 'Document Camera', 'Guest Device'
];

export const OUTPUT_DEVICE_TYPES = [
    'Room Display', 'Projector', 'Confidence Monitor', 'Recording Feed'
];

export const MAIN_DISPLAY_OPTIONS = [
    { id: 'single_lfd', label: 'Single Display', icon: DisplayIcon, description: 'A single TV or commercial display.' },
    { id: 'dual_lfd', label: 'Dual Displays', icon: DualDisplayIcon, description: 'Two side-by-side TVs or displays.' },
    { id: 'interactive_lfd', label: 'Interactive Display', icon: InteractiveDisplayIcon, description: 'A single touch-enabled display.' },
    { id: 'projector', label: 'Single Projector', icon: ProjectorIcon, description: 'A single projector and screen setup.' },
    { id: 'interactive_projector', label: 'Interactive Projector', icon: InteractiveDisplayIcon, description: 'A projector with interactivity features.' },
    { id: 'video_wall', label: 'Video Wall', icon: VideoWallIcon, description: 'A multi-screen, tiled video wall.' },
];

export const OUTPUT_ROLES = ['Main', 'Repeater', 'Confidence'];

export const CONTROL_TYPES = ['IR', 'RS232', 'IP'];

export const VIDEO_RESOLUTIONS = ['1080p', '4K/30Hz 4:4:4', '4K/60Hz 4:2:0', '4K/60Hz 4:4:4'];
export const CONTROL_SYSTEMS = ['None (Auto-switching)', 'Simple Keypad', 'Touch Panel', 'Third-Party Integration'];

export const AVOIP_SYSTEM_TYPES = [
    'None',
    '1GbE (H.264/H.265 - Low Bandwidth)',
    '1GbE (JPEG-XS - Visually Lossless)',
    '1GbE (JPEG2000 - Legacy)',
    '10GbE (Uncompressed)',
    '10GbE (SDVoE)',
];

export const SWITCH_FEATURES = [
    { id: 'igmp_snooping', label: 'IGMP Snooping' },
    { id: 'jumbo_frames', label: 'Jumbo Frames' },
];

export const WALL_CONSTRUCTION_OPTIONS = [
    { value: 'drywall', label: 'Drywall / Plasterboard' },
    { value: 'concrete', label: 'Concrete / Brick' },
    { value: 'glass', label: 'Glass Partition' },
    { value: 'modular', label: 'Modular / Temporary Wall' },
];

export const CONTAINMENT_OPTIONS = [
    { value: 'none', label: 'None' },
    { value: 'trunking', label: 'Surface Trunking' },
    { value: 'conduit', label: 'In-Wall Conduit' },
    { value: 'floor_boxes', label: 'Floor Boxes' },
];

export const AUDIO_SPEAKER_LAYOUT_OPTIONS = [
    { value: 'none', label: 'None (Display Speakers Only)' },
    { value: 'soundbar', label: 'Soundbar' },
    { value: 'in_ceiling', label: 'In-Ceiling Speakers' },
    { value: 'surface_mount', label: 'Surface-Mount Speakers' },
    { value: 'pendant', label: 'Pendant Speakers' },
];

export const AUDIO_SYSTEM_TYPE_OPTIONS = [
    { value: 'low_impedance', label: 'Stereo (Low Impedance)' },
    { value: 'high_impedance', label: '70V/100V Distributed (High Impedance)' },
];

export const AUDIO_USE_CASE_OPTIONS = [
    { value: 'speech_reinforcement', label: 'Speech Reinforcement' },
    { value: 'program_audio', label: 'Program Audio (Music/Video)' },
    { value: 'video_conferencing', label: 'Video Conferencing Audio' },
];

export const CONNECTION_TYPES = [
    // Video
    'HDMI', 
    'DisplayPort', 
    'USB-C', 
    'SDI',
    'DVI',
    'VGA', 
    'Component',
    'Composite',
    // Audio
    '3.5mm Audio', 
    'RCA Audio',
    'XLR Audio', 
    'SPDIF',
    'Toslink',
    'Phoenix',
    'Speakon',
    // Data/Control
    'USB-A',
    'USB-B',
    'Ethernet',
];
export const TRANSPORT_TYPES = [
    'Direct', 
    'HDBaseT', 
    'AVoIP', 
    'Fiber',
    'Active Optical Cable (AOC)',
    'SDI',
    'Dante',
    'Wireless',
];
export const MOUNTING_TYPES = ['Wall Mount', 'Ceiling Mount', 'Pole Mount', 'Rack Mount', 'Desktop'];
export const LOCATION_TYPES = [
    'Direct to Device',
    'Wall Plate',
    'Brush Plate',
    'Floor Box',
    'Floor Box to Desk',
    'Table Box',
    'Podium',
    'Lectern',
    'In-Furniture',
    'Local Rack',
    'Central Rack',
    'Ceiling Box',
    'Other'
];

export const DISPLAY_TYPES = [
    { value: 'single', label: 'Single LFD' },
    { value: 'dual_display', label: 'Dual LFDs' },
    { value: 'lcd_video_wall', label: 'LCD Video Wall' },
    { value: 'led_video_wall', label: 'LED Video Wall' },
    { value: 'projector', label: 'Projector' },
];

export const PROJECTOR_LENS_TYPES = [
    { value: 'standard', label: 'Standard Lens' },
    { value: 'zoom', label: 'Zoom Lens' },
    { value: 'short_throw', label: 'Short Throw' },
];

export const FURNITURE_TYPES = [
    { value: 'fixed', label: 'Fixed Furniture (e.g., Boardroom Table)' },
    { value: 'multi_use', label: 'Multi-use / Reconfigurable' },
];

export const CAMERA_TYPES = [
    { value: 'none', label: 'No Camera' },
    { value: 'usb_webcam', label: 'USB Webcam / Video Bar' },
    { value: 'hdmi_ptz', label: 'HDMI/SDI PTZ Camera' },
];

export const MICROPHONE_TYPES = [
    { value: 'none', label: 'No Microphones' },
    { value: 'soundbar_mic', label: 'Via Soundbar/Video Bar' },
    { value: 'table_mic', label: 'Table Microphones' },
    { value: 'ceiling_mic', label: 'Ceiling Microphones' },
    { value: 'wireless_lav', label: 'Wireless (Lav/Handheld)' },
];