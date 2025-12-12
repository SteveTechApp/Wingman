import { useState } from 'react';
import { IncomingRequest } from '../utils/types';
import { useLocalStorage } from './useLocalStorage';
import { v4 as uuidv4 } from 'uuid';

const MOCK_REQUESTS: IncomingRequest[] = [
    {
        requestId: uuidv4(),
        clientName: 'Global Corp',
        description: 'We need to upgrade 10 of our medium conference rooms with dual-screen 4K video conferencing capabilities. Wireless presentation is a must-have. Please provide a proposal for a standardized solution.',
        status: 'tentative',
        createdAt: Date.now() - 1000 * 60 * 60 * 24 * 2, // 2 days ago
    },
    {
        requestId: uuidv4(),
        clientName: 'State University',
        description: 'Request for proposal: AV system for new lecture hall. Capacity 200 students. Requires large projector, speech reinforcement, and ability to record lectures. Existing control system is Crestron.',
        status: 'tentative',
        createdAt: Date.now() - 1000 * 60 * 60 * 24 * 5, // 5 days ago
    },
];

export const useClientRequests = () => {
    const [requests, setRequests] = useLocalStorage<IncomingRequest[]>('clientRequests', MOCK_REQUESTS);

    const dismissRequest = (requestId: string) => {
        setRequests(prev => prev.filter(req => req.requestId !== requestId));
    };

    return {
        requests,
        dismissRequest,
    };
};