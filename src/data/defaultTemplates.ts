import { UserTemplate } from '../utils/types';
import { CORPORATE_TEMPLATES } from './templates/corporate';
import { EDUCATION_TEMPLATES } from './templates/education';
import { HOSPITALITY_TEMPLATES } from './templates/hospitality';
import { COMMAND_TEMPLATES } from './templates/command';
import { RETAIL_TEMPLATES } from './templates/retail';
import { VENUE_TEMPLATES } from './templates/venue';
import { HOW_TEMPLATES } from './templates/how';
import { GAMING_TEMPLATES } from './templates/gaming';
import { RESIDENTIAL_TEMPLATES } from './templates/residential';
import { TRANSPORTATION_TEMPLATES } from './templates/transportation';
import { INDUSTRIAL_TEMPLATES } from './templates/industrial';
import { GOVERNMENT_TEMPLATES } from './templates/government';

export const DEFAULT_TEMPLATES: UserTemplate[] = [
    ...CORPORATE_TEMPLATES,
    ...EDUCATION_TEMPLATES,
    ...HOSPITALITY_TEMPLATES,
    ...GOVERNMENT_TEMPLATES,
    ...COMMAND_TEMPLATES,
    ...RETAIL_TEMPLATES,
    ...VENUE_TEMPLATES,
    ...HOW_TEMPLATES,
    ...GAMING_TEMPLATES,
    ...RESIDENTIAL_TEMPLATES,
    ...TRANSPORTATION_TEMPLATES,
    ...INDUSTRIAL_TEMPLATES,
];