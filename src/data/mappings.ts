import { VerticalMarketId } from '../utils/types';

export const roomTypeToVerticalMap: Record<string, VerticalMarketId> = {
    'Conference Room': 'corp',
    'Boardroom': 'corp',
    'Huddle Space': 'corp',
    'Classroom': 'edu',
    'Lecture Hall': 'edu',
    'Auditorium': 'ven',
    'House of Worship': 'how',
    'Command Center': 'cmd',
    'Sports Bar': 'hos',
    'Retail Space': 'ret',
    'Large Venue': 'ven',
    'Other': 'corp', // default
};