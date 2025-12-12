
import { DesignTier } from './common';
import { Product } from './product';
import type { Proposal } from './proposal';

export interface Dimensions {
  length: number;
  width: number;
  height: number;
}

export interface Feature {
  name: string;
  priority: 'must-have' | 'nice-to-have';
}

export type DisplayType = 'single' | 'dual_display' | 'lcd_video_wall' | 'led_video_wall' | 'projector';
export type ProjectorLensType = 'standard' | 'zoom' | 'short_throw';

export interface IOControl {
  needed: boolean;
  types: ('IR' | 'RS232' | 'IP')[];
}

export interface IOPoint {
  id: string;
  name: string;
  type: 'input' | 'output';
  deviceType?: string; // Pre-defined type like 'Laptop', 'Room PC'
  quantity: number;
  connectionType: string;
  distributionType: string;
  distance: number;
  terminationType: string;
  displayType?: DisplayType;
  projectorLensType?: ProjectorLensType;
  control?: IOControl;
  role?: 'main' | 'repeater' | 'confidence';
}

export interface ConstructionDetails {
  wallConstruction: 'drywall' | 'concrete' | 'glass' | 'modular';
  cableContainment: 'none' | 'trunking' | 'conduit' | 'floor_boxes';
  furnitureType: 'fixed' | 'multi_use';
}

export interface AudioZone {
    id: string;
    name: string;
    speakerType: 'ceiling' | 'pendant' | 'surface' | 'soundbar';
    quantity: number;
}

export interface AudioSystemDetails {
  speakerLayout: 'none' | 'soundbar' | 'in_ceiling' | 'surface_mount' | 'pendant';
  systemType: 'low_impedance' | 'high_impedance' | 'dante';
  zones?: AudioZone[];
  useCases: ('speech_reinforcement' | 'program_audio' | 'video_conferencing' | 'paging' | 'background_music')[];
  microphoneType: 'none' | 'table_mic' | 'ceiling_mic' | 'wireless_lav' | 'soundbar_mic';
  ucCompatibility: boolean;
}

export interface AVoIPNetworkDetails {
    useDedicatedNetwork: boolean;
    poeAvailable: boolean;
    switchFeatures: ('igmp_snooping' | 'jumbo_frames')[];
}

export interface TechnicalDetails {
  primaryVideoResolution: string;
  videoSignalTypes: string[];
  controlSystem: string;
  cameraType: 'none' | 'usb_webcam' | 'hdmi_ptz';
  cameraCount: number;
  roomPc: boolean;
  avoipSystem?: string;
  avoipNetworkDetails?: AVoIPNetworkDetails;
  projectorLensType?: ProjectorLensType;
}

export interface StructuredSystemDiagramNode {
    id: string;
    label: string;
    type: string;
}

export interface StructuredSystemDiagramEdge {
    from: string;
    to: string;
    label: string;
    type: string;
}

export interface StructuredSystemDiagram {
    nodes: StructuredSystemDiagramNode[];
    edges: StructuredSystemDiagramEdge[];
}

export interface VideoWallConfig {
    type: 'lcd' | 'led';
    layout: { rows: number; cols: number };
    technology: 'avoip' | 'processor';
    multiviewRequired: boolean;
}

export interface ManuallyAddedEquipment extends Product {
    quantity: number;
}

export interface ValueEngineeringSuggestion {
    originalSku: string;
    suggestedSku: string;
}

export interface DesignProposal {
  tier: DesignTier;
  functionalityStatement: string;
  manuallyAddedEquipment: ManuallyAddedEquipment[];
}

export interface RoomData {
    id: string;
    roomName: string;
    roomType: string;
    designTier: DesignTier;
    dimensions: Dimensions;
    maxParticipants: number;
    ioRequirements: IOPoint[];
    displayType: DisplayType;
    displayCount: number;
    displaySize?: number;
    videoWallConfig?: VideoWallConfig;
    features: Feature[];
    functionalityStatement: string;
    manuallyAddedEquipment: ManuallyAddedEquipment[];
    systemDiagram?: StructuredSystemDiagram;
    constructionDetails: ConstructionDetails;
    audioSystemDetails: AudioSystemDetails;
    technicalDetails: TechnicalDetails;
    valueEngineeringConstraints?: string[];
    valueEngineeringSuggestions?: ValueEngineeringSuggestion[];
    aiDesignProposals?: DesignProposal[];
}

export type RoomWizardAnswers = Omit<RoomData, 'systemDiagram' | 'manuallyAddedEquipment' | 'valueEngineeringConstraints' | 'valueEngineeringSuggestions' | 'aiDesignProposals'>;

export interface ProjectInfrastructure {
    useDedicatedNetwork: boolean;
    enableTouchAppPreview: boolean;
    cablingByOthers: boolean;
    // New Architecture Fields
    buildingType: 'single_floor' | 'multi_floor' | 'campus';
    floorCount: number;
    rackStrategy: 'in_room' | 'distributed_closet' | 'central_server_room' | 'hybrid';
    // Hybrid rack strategy details
    hasLocalRacks: boolean;  // Credenza, lectern, under-desk equipment
    hasCentralizedInfrastructure: boolean;  // Central server room, distribution racks
    centralizedEquipment?: ('sources' | 'matrices' | 'processors' | 'network_switches' | 'avoip_encoders' | 'avoip_decoders')[];
    localEquipmentTypes?: ('sources' | 'small_matrices' | 'room_controllers' | 'codecs' | 'amplifiers')[];
}

export interface ProjectData {
    projectId: string;
    projectName: string;
    clientName: string;
    lastSaved: string;
    rooms: RoomData[];
    proposals: Proposal[];
    unitSystem: 'metric' | 'imperial';
    notes: string;
    productDatabase: Product[];
    infrastructure: ProjectInfrastructure;
}

export interface ProjectSetupData {
  projectName: string;
  clientName: string;
  rooms: RoomData[];
}
