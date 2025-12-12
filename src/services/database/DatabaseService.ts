/**
 * Database Service - Core initialization and setup
 */

import { DB_NAME, DB_VERSION, STORES } from './types';

export class DatabaseService {
    private db: IDBDatabase | null = null;
    private initPromise: Promise<void> | null = null;

    async init(): Promise<void> {
        if (this.db) return;
        if (this.initPromise) return this.initPromise;

        this.initPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => reject(new Error('Failed to open database'));
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                this.createStores(db);
            };
        });

        return this.initPromise;
    }

    async getDB(): Promise<IDBDatabase> {
        await this.init();
        if (!this.db) {
            throw new Error('Database not initialized');
        }
        return this.db;
    }

    private createStores(db: IDBDatabase): void {
        // Projects store
        if (!db.objectStoreNames.contains(STORES.PROJECTS)) {
            const projectStore = db.createObjectStore(STORES.PROJECTS, { keyPath: 'projectId' });
            projectStore.createIndex('lastSaved', 'lastSaved', { unique: false });
            projectStore.createIndex('clientName', 'clientName', { unique: false });
        }

        // User profile store
        if (!db.objectStoreNames.contains(STORES.USER_PROFILE)) {
            db.createObjectStore(STORES.USER_PROFILE, { keyPath: 'id' });
        }

        // Templates store
        if (!db.objectStoreNames.contains(STORES.TEMPLATES)) {
            const templateStore = db.createObjectStore(STORES.TEMPLATES, { keyPath: 'id' });
            templateStore.createIndex('name', 'name', { unique: false });
            templateStore.createIndex('category', 'category', { unique: false });
        }

        // Settings store
        if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
            db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
        }
    }
}
