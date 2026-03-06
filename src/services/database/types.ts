import * as React from "react";


// src/services/database/types.ts
// Database configuration and types

/**
 * Database Configuration Constants
 */
export const DB_NAME = 'WingmanDB';
export const DB_VERSION = 1;

/**
 * Store Names
 */
export const STORES = {
    PROJECTS: 'projects',
    TEMPLATES: 'templates',
    USER_PROFILE: 'userProfile',
    SETTINGS: 'settings',
} as const;

/**
 * Database Statistics Interface
 */
export interface DatabaseStats {
    projectCount: number;
    templateCount: number;
    totalSize: number;
    lastBackup?: string;
}
export interface DatabaseStats {
    projectCount: number;
    templateCount: number;
    totalSize: number;
    lastBackup?: string;
    hasUserProfile?: boolean;  // ADD THIS
}

export interface ExportData {
    version: number;
    exportDate: string;
    projects: any[];
    templates: any[];
    userProfile: any;
    settings: any[];
    profile?: any;  // ADD THIS
}
/**
 * Export Data Structure
 */
export interface ExportData {
    version: number;
    exportDate: string;
    projects: any[];
    templates: any[];
    userProfile: any;
    settings: any[];
}

/**
 * Store Names Type
 */
export type StoreName = typeof STORES[keyof typeof STORES];



