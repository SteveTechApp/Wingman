import React from 'react';
import { LanguageCode, DesignTier } from '../utils/types';
import { 
    BuildingIcon, 
    EducationIcon,
    GovernmentIcon,
    HospitalityIcon,
    RetailIcon,
    ResidentialIcon,
    TransportationIcon,
    LargeVenueIcon,
    IndustrialIcon,
    GamingIcon,
    HouseOfWorshipIcon,
    CommandCenterIcon,
    SwitcherIcon,
    ExtenderIcon,
    UCIcon,
    CameraIcon,
    AudioIcon,
    ProcessorIcon,
    ControlIcon,
    GenericDeviceIcon,
} from '../components/icons/AppIcons';
import { SparklesIcon, GridIcon } from '../components/icons/UIIcons';
import { 
    HdmiIcon, 
    UsbCIcon, 
    DisplayPortIcon, 
    VgaIcon, 
    AudioJackIcon, 
    XlrIcon, 
    DirectIcon, 
    HdbasetIcon, 
    AvoipIcon, 
    FiberIcon 
} from '../components/io/io-icons';


export const ROOM_TYPES: string[] = [
    'Conference Room',
    'Boardroom',
    'Huddle Space',
    'Classroom',
    'Lecture Hall',
    'Auditorium',
    'House of Worship',
    'Command Center',
    'Sports Bar',
    'Retail Space',
    'Large Venue',
    'Other'
];

export const DESIGN_TIER_OPTIONS: DesignTier[] = ['Bronze', 'Silver', 'Gold'];

export const SUPPORTED_LANGUAGES: { code: LanguageCode, name: string }[] = [
    { code: 'en-GB', name: 'English (UK)' },
    { code: 'en-US', name: 'English (US)' },
    { code: 'en-AU', name: 'English (AU)' },
    { code: 'fr-FR', name: 'Français (France)' },
    { code: 'es-ES', name: 'Español (España)' },
    { code: 'de-DE', name: 'Deutsch (Deutschland)' },
];

export const VERTICAL_MARKETS = [
    { verticalId: 'all', name: 'All', icon: SparklesIcon, imageUrl: '' },
];

export const PRODUCT_CATEGORY_ICONS: Record<string, React.FC<{ className?: string }>> = {
    'switcher': SwitcherIcon,
    'extender': ExtenderIcon,
    'uc': UCIcon,
    'camera': CameraIcon,
    'audio': AudioIcon,
    'amplifier': AudioIcon,
    'microphone': AudioIcon,
    'processor': ProcessorIcon,
    'control': ControlIcon,
    'avoip': ProcessorIcon,
    'default': GenericDeviceIcon,
};

export const CONNECTION_TYPE_ICONS: Record<string, React.FC<{ className?: string }>> = {
    'HDMI': HdmiIcon,
    'USB-C': UsbCIcon,
    'DisplayPort': DisplayPortIcon,
    'VGA': VgaIcon,
    '3.5mm Audio': AudioJackIcon,
    'XLR Audio': XlrIcon,
    'Direct': DirectIcon,
    'HDBaseT': HdbasetIcon,
    'AVoIP': AvoipIcon,
    'Fiber': FiberIcon,
    'default': GenericDeviceIcon,
};

// FIX: Add missing ROOM_TYPE_ICONS export
export const ROOM_TYPE_ICONS: Record<string, React.FC<{ className?: string }>> = {
    'Conference Room': BuildingIcon,
    'Boardroom': BuildingIcon,
    'Huddle Space': SparklesIcon,
    'Classroom': EducationIcon,
    'Lecture Hall': EducationIcon,
    'Auditorium': LargeVenueIcon,
    'House of Worship': HouseOfWorshipIcon,
    'Command Center': CommandCenterIcon,
    'Sports Bar': HospitalityIcon,
    'Retail Space': RetailIcon,
    'Large Venue': LargeVenueIcon,
    'Other': SparklesIcon,
};