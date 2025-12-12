import { RoomData } from './project';

export interface DesignFeedbackItem {
    type: 'Warning' | 'Suggestion' | 'Opportunity' | 'Insight' | 'Financial';
    text: string;
}

export type VerticalMarketId = 'corp' | 'edu' | 'gov' | 'hos' | 'ret' | 'res' | 'tra' | 'ven' | 'ind' | 'gam' | 'how' | 'cmd';

export interface UserTemplate {
    templateId: string;
    conceptId?: string;
    conceptName?: string;
    templateName: string;
    description: string;
    vertical: VerticalMarketId;
    imageUrl: string;
    roomData: RoomData;
}

export interface RelatedProductsPayload {
    alternatives: { sku: string; name: string; reason: string }[];
    accessories: { sku: string; name: string; reason: string }[];
}

export interface IncomingRequest {
    requestId: string;
    clientName: string;
    description: string;
    status: 'tentative' | 'confirmed';
    createdAt: number;
}