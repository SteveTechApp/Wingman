import { LanguageCode } from './common';
import { Product } from './product';

export interface UserProfile {
    name: string;
    company: string;
    logoUrl: string;
    language: LanguageCode;
    unitSystem: 'metric' | 'imperial';
    showBackground: boolean;
    zoomLevel: number;
    customProductDatabase?: Product[];
}