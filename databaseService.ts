/**
 * Database Service using IndexedDB for persistent local storage
 * This provides a more robust alternative to localStorage with better performance
 * and support for larger datasets
 */

import { ProjectData, UserProfile, UserTemplate } from '../utils/types';

const DB_NAME = 'WyreStormWingmanDB';
const DB_VERSION = 1;

// Store names
const STORES = {
    PROJECTS: 'projects',
    USER_PROFILE: 'userProfile',
    TEMPLATES: 'templates',
    SETTINGS: 'settings',
} as const;

class DatabaseService {
    private db: IDBDatabase | null = null;
    private initPromise: Promise<void> | null = null;

    /**
     * Initialize the IndexedDB database
     */
    private async init(): Promise<void> {
        if (this.db) return;
        if (this.initPromise) return this.initPromise;

        this.initPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                reject(new Error('Failed to open database'));
            };

            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;

                // Create object stores if they don't exist
                if (!db.objectStoreNames.contains(STORES.PROJECTS)) {
                    const projectStore = db.createObjectStore(STORES.PROJECTS, { keyPath: 'projectId' });
                    projectStore.createIndex('lastSaved', 'lastSaved', { unique: false });
                    projectStore.createIndex('clientName', 'clientName', { unique: false });
                }

                if (!db.objectStoreNames.contains(STORES.USER_PROFILE)) {
                    db.createObjectStore(STORES.USER_PROFILE, { keyPath: 'id' });
                }

                if (!db.objectStoreNames.contains(STORES.TEMPLATES)) {
                    const templateStore = db.createObjectStore(STORES.TEMPLATES, { keyPath: 'id' });
                    templateStore.createIndex('name', 'name', { unique: false });
                    templateStore.createIndex('category', 'category', { unique: false });
                }

                if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
                    db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
                }
            };
        });

        return this.initPromise;
    }

    /**
     * Ensure database is initialized before operations
     */
    private async ensureInit(): Promise<IDBDatabase> {
        await this.init();
        if (!this.db) {
            throw new Error('Database not initialized');
        }
        return this.db;
    }

    // ==================== PROJECT OPERATIONS ====================

    /**
     * Save a project to the database
     */
    async saveProject(project: ProjectData): Promise<void> {
        const db = await this.ensureInit();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORES.PROJECTS], 'readwrite');
            const store = transaction.objectStore(STORES.PROJECTS);
            
            // Update lastSaved timestamp
            const projectToSave = {
                ...project,
                lastSaved: new Date().toISOString(),
            };

            const request = store.put(projectToSave);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(new Error('Failed to save project'));
        });
    }

    /**
     * Get a project by ID
     */
    async getProject(projectId: string): Promise<ProjectData | null> {
        const db = await this.ensureInit();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORES.PROJECTS], 'readonly');
            const store = transaction.objectStore(STORES.PROJECTS);
            const request = store.get(projectId);

            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(new Error('Failed to get project'));
        });
    }

    /**
     * Get all projects
     */
    async getAllProjects(): Promise<ProjectData[]> {
        const db = await this.ensureInit();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORES.PROJECTS], 'readonly');
            const store = transaction.objectStore(STORES.PROJECTS);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(new Error('Failed to get projects'));
        });
    }

    /**
     * Get recent projects sorted by last saved date
     */
    async getRecentProjects(limit: number = 10): Promise<ProjectData[]> {
        const db = await this.ensureInit();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORES.PROJECTS], 'readonly');
            const store = transaction.objectStore(STORES.PROJECTS);
            const index = store.index('lastSaved');
            const request = index.openCursor(null, 'prev'); // Descending order

            const projects: ProjectData[] = [];
            let count = 0;

            request.onsuccess = (event) => {
                const cursor = (event.target as IDBRequest).result;
                if (cursor && count < limit) {
                    projects.push(cursor.value);
                    count++;
                    cursor.continue();
                } else {
                    resolve(projects);
                }
            };

            request.onerror = () => reject(new Error('Failed to get recent projects'));
        });
    }

    /**
     * Delete a project
     */
    async deleteProject(projectId: string): Promise<void> {
        const db = await this.ensureInit();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORES.PROJECTS], 'readwrite');
            const store = transaction.objectStore(STORES.PROJECTS);
            const request = store.delete(projectId);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(new Error('Failed to delete project'));
        });
    }

    /**
     * Search projects by client name or project name
     */
    async searchProjects(query: string): Promise<ProjectData[]> {
        const allProjects = await this.getAllProjects();
        const lowerQuery = query.toLowerCase();
        
        return allProjects.filter(project => 
            project.projectName.toLowerCase().includes(lowerQuery) ||
            project.clientName.toLowerCase().includes(lowerQuery)
        );
    }

    // ==================== USER PROFILE OPERATIONS ====================

    /**
     * Save user profile
     */
    async saveUserProfile(profile: UserProfile): Promise<void> {
        const db = await this.ensureInit();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORES.USER_PROFILE], 'readwrite');
            const store = transaction.objectStore(STORES.USER_PROFILE);
            const profileToSave = { ...profile, id: 'current' }; // Single user profile
            const request = store.put(profileToSave);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(new Error('Failed to save user profile'));
        });
    }

    /**
     * Get user profile
     */
    async getUserProfile(): Promise<UserProfile | null> {
        const db = await this.ensureInit();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORES.USER_PROFILE], 'readonly');
            const store = transaction.objectStore(STORES.USER_PROFILE);
            const request = store.get('current');

            request.onsuccess = () => {
                const result = request.result;
                if (result) {
                    const { id, ...profile } = result; // Remove the 'id' field we added
                    resolve(profile as UserProfile);
                } else {
                    resolve(null);
                }
            };
            request.onerror = () => reject(new Error('Failed to get user profile'));
        });
    }

    // ==================== TEMPLATE OPERATIONS ====================

    /**
     * Save a template
     */
    async saveTemplate(template: UserTemplate): Promise<void> {
        const db = await this.ensureInit();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORES.TEMPLATES], 'readwrite');
            const store = transaction.objectStore(STORES.TEMPLATES);
            const request = store.put(template);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(new Error('Failed to save template'));
        });
    }

    /**
     * Get all templates
     */
    async getAllTemplates(): Promise<UserTemplate[]> {
        const db = await this.ensureInit();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORES.TEMPLATES], 'readonly');
            const store = transaction.objectStore(STORES.TEMPLATES);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(new Error('Failed to get templates'));
        });
    }

    /**
     * Get templates by category
     */
    async getTemplatesByCategory(category: string): Promise<UserTemplate[]> {
        const db = await this.ensureInit();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORES.TEMPLATES], 'readonly');
            const store = transaction.objectStore(STORES.TEMPLATES);
            const index = store.index('category');
            const request = index.getAll(category);

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(new Error('Failed to get templates by category'));
        });
    }

    /**
     * Delete a template
     */
    async deleteTemplate(templateId: string): Promise<void> {
        const db = await this.ensureInit();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORES.TEMPLATES], 'readwrite');
            const store = transaction.objectStore(STORES.TEMPLATES);
            const request = store.delete(templateId);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(new Error('Failed to delete template'));
        });
    }

    // ==================== SETTINGS OPERATIONS ====================

    /**
     * Save a setting
     */
    async saveSetting(key: string, value: any): Promise<void> {
        const db = await this.ensureInit();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORES.SETTINGS], 'readwrite');
            const store = transaction.objectStore(STORES.SETTINGS);
            const request = store.put({ key, value });

            request.onsuccess = () => resolve();
            request.onerror = () => reject(new Error('Failed to save setting'));
        });
    }

    /**
     * Get a setting
     */
    async getSetting(key: string): Promise<any> {
        const db = await this.ensureInit();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORES.SETTINGS], 'readonly');
            const store = transaction.objectStore(STORES.SETTINGS);
            const request = store.get(key);

            request.onsuccess = () => resolve(request.result?.value);
            request.onerror = () => reject(new Error('Failed to get setting'));
        });
    }

    // ==================== UTILITY OPERATIONS ====================

    /**
     * Export all data as JSON
     */
    async exportAllData(): Promise<string> {
        const projects = await this.getAllProjects();
        const profile = await this.getUserProfile();
        const templates = await this.getAllTemplates();

        const exportData = {
            version: DB_VERSION,
            exportDate: new Date().toISOString(),
            projects,
            profile,
            templates,
        };

        return JSON.stringify(exportData, null, 2);
    }

    /**
     * Import data from JSON
     */
    async importData(jsonData: string): Promise<void> {
        const data = JSON.parse(jsonData);

        if (data.profile) {
            await this.saveUserProfile(data.profile);
        }

        if (data.projects) {
            for (const project of data.projects) {
                await this.saveProject(project);
            }
        }

        if (data.templates) {
            for (const template of data.templates) {
                await this.saveTemplate(template);
            }
        }
    }

    /**
     * Clear all data (use with caution!)
     */
    async clearAllData(): Promise<void> {
        const db = await this.ensureInit();
        
        const storeNames = [STORES.PROJECTS, STORES.USER_PROFILE, STORES.TEMPLATES, STORES.SETTINGS];
        
        for (const storeName of storeNames) {
            await new Promise<void>((resolve, reject) => {
                const transaction = db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                const request = store.clear();

                request.onsuccess = () => resolve();
                request.onerror = () => reject(new Error(`Failed to clear ${storeName}`));
            });
        }
    }

    /**
     * Get database statistics
     */
    async getStats(): Promise<{
        projectCount: number;
        templateCount: number;
        hasUserProfile: boolean;
        databaseSize: string;
    }> {
        const projects = await this.getAllProjects();
        const templates = await this.getAllTemplates();
        const profile = await this.getUserProfile();

        // Estimate database size
        const dataStr = JSON.stringify({ projects, templates, profile });
        const sizeInBytes = new Blob([dataStr]).size;
        const sizeInMB = (sizeInBytes / (1024 * 1024)).toFixed(2);

        return {
            projectCount: projects.length,
            templateCount: templates.length,
            hasUserProfile: profile !== null,
            databaseSize: `${sizeInMB} MB`,
        };
    }
}

// Export singleton instance
export const db = new DatabaseService();
