/**
 * Main Database Service
 * Combines all database operations and provides utility methods
 */

import { ProjectStore } from './ProjectStore';
import { TemplateStore } from './TemplateStore';
import { UserProfileStore, SettingsStore } from './StoresManagers';
import { DatabaseStats, ExportData, STORES, DB_VERSION } from './types';

class Database {
    private projectStore: ProjectStore;
    private templateStore: TemplateStore;
    private userProfileStore: UserProfileStore;
    private settingsStore: SettingsStore;

    constructor() {
        this.projectStore = new ProjectStore();
        this.templateStore = new TemplateStore();
        this.userProfileStore = new UserProfileStore();
        this.settingsStore = new SettingsStore();
    }

    // Project methods
    saveProject = (project: any) => this.projectStore.saveProject(project);
    getProject = (id: string) => this.projectStore.getProject(id);
    getAllProjects = () => this.projectStore.getAllProjects();
    getRecentProjects = (limit?: number) => this.projectStore.getRecentProjects(limit);
    deleteProject = (id: string) => this.projectStore.deleteProject(id);
    searchProjects = (query: string) => this.projectStore.searchProjects(query);

    // Template methods
    saveTemplate = (template: any) => this.templateStore.saveTemplate(template);
    getAllTemplates = () => this.templateStore.getAllTemplates();
    getTemplatesByCategory = (category: string) => this.templateStore.getTemplatesByCategory(category);
    deleteTemplate = (id: string) => this.templateStore.deleteTemplate(id);

    // User profile methods
    saveUserProfile = (profile: any) => this.userProfileStore.saveUserProfile(profile);
    getUserProfile = () => this.userProfileStore.getUserProfile();

    // Settings methods
    saveSetting = (key: string, value: any) => this.settingsStore.saveSetting(key, value);
    getSetting = (key: string) => this.settingsStore.getSetting(key);

    // Utility methods
    async exportAllData(): Promise<string> {
        const projects = await this.getAllProjects();
        const profile = await this.getUserProfile();
        const templates = await this.getAllTemplates();

        const exportData: ExportData = {
            version: DB_VERSION,
            exportDate: new Date().toISOString(),
            projects,
            profile,
            templates,
        };

        return JSON.stringify(exportData, null, 2);
    }

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

    async clearAllData(): Promise<void> {
        const db = await this.projectStore.getDB();
        const storeNames = Object.values(STORES);
        
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

    async getStats(): Promise<DatabaseStats> {
        const projects = await this.getAllProjects();
        const templates = await this.getAllTemplates();
        const profile = await this.getUserProfile();

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

export const db = new Database();