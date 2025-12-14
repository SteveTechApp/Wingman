// src/components/types.ts
// Component-specific type definitions

/**
 * Manually Added Equipment Interface
 * Used for custom equipment additions in projects
 */
export interface ManuallyAddedEquipment {
    id: string;
    name: string;
    category: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    notes?: string;
    manufacturer?: string;
    model?: string;
}

/**
 * Display Group Interface
 * Used for grouping displays in room configurations
 */
export interface DisplayGroup {
    id: string;
    name: string;
    displayIds: string[];
    arrangement: 'horizontal' | 'vertical' | 'grid';
    rows?: number;
    columns?: number;
}