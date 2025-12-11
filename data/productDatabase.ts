import { Product } from '../utils/types';

import { ACCESSORIES } from './products/accessories';
import { AUDIO_SYSTEMS } from './products/audio';
import { AVOIP_PRODUCTS } from './products/avoip';
import { CABLES } from './products/cables';
import { CAMERAS } from './products/cameras';
import { CONTROL_SOLUTIONS } from './products/control';
import { EXTENDERS } from './products/extenders';
import { GENERIC_DEVICES } from './products/generic';
import { NEW_ARRIVALS } from './products/new-arrivals';
import { VIDEO_PROCESSORS } from './products/processors';
import { SWITCHERS_MATRIX, SWITCHERS_PRESENTATION } from './products/switchers';
import { UC_SOLUTIONS } from './products/uc';

export const PRODUCT_DATABASE: Product[] = [
    ...ACCESSORIES,
    ...AUDIO_SYSTEMS,
    ...AVOIP_PRODUCTS,
    ...CABLES,
    ...CAMERAS,
    ...CONTROL_SOLUTIONS,
    ...EXTENDERS,
    ...GENERIC_DEVICES,
    ...NEW_ARRIVALS,
    ...VIDEO_PROCESSORS,
    ...SWITCHERS_MATRIX,
    ...SWITCHERS_PRESENTATION,
    ...UC_SOLUTIONS,
];