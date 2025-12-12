/**
 * Project Store
 * Handles all project-related database operations
 */

import { DatabaseService } from './DatabaseService';
import { STORES } from './types';

export class ProjectStore extends DatabaseService {
    async saveProject(project: any): Promise<void> {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORES.PROJECTS], 'readwrite');
            const store = transaction.objectStore(STORES.PROJECTS);
            
            const projectToSave = {
                ...project,
                lastSaved: new Date().toISOString(),
            };

            const request = store.put(projectToSave);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(new Error('Failed to save project'));
        });
    }

    async getProject(projectId: string): Promise<any | null> {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORES.PROJECTS], 'readonly');
            const store = transaction.objectStore(STORES.PROJECTS);
            const request = store.get(projectId);

            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(new Error('Failed to get project'));
        });
    }

    async getAllProjects(): Promise<any[]> {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORES.PROJECTS], 'readonly');
            const store = transaction.objectStore(STORES.PROJECTS);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(new Error('Failed to get projects'));
        });
    }

    async getRecentProjects(limit: number = 10): Promise<any[]> {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORES.PROJECTS], 'readonly');
            const store = transaction.objectStore(STORES.PROJECTS);
            const index = store.index('lastSaved');
            const request = index.openCursor(null, 'prev');

            const projects: any[] = [];
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

    async deleteProject(projectId: string): Promise<void> {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORES.PROJECTS], 'readwrite');
            const store = transaction.objectStore(STORES.PROJECTS);
            const request = store.delete(projectId);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(new Error('Failed to delete project'));
        });
    }

    async searchProjects(query: string): Promise<any[]> {
        const allProjects = await this.getAllProjects();
        const lowerQuery = query.toLowerCase();
        
        return allProjects.filter(project => 
            project.projectName.toLowerCase().includes(lowerQuery) ||
            project.clientName.toLowerCase().includes(lowerQuery)
        );
    }
}
