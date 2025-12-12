/**
 * Template Store
 * Handles template-related database operations
 */

import { DatabaseService } from './DatabaseService';
import { STORES } from './types';

export class TemplateStore extends DatabaseService {
    async saveTemplate(template: any): Promise<void> {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORES.TEMPLATES], 'readwrite');
            const store = transaction.objectStore(STORES.TEMPLATES);
            const request = store.put(template);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(new Error('Failed to save template'));
        });
    }

    async getAllTemplates(): Promise<any[]> {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORES.TEMPLATES], 'readonly');
            const store = transaction.objectStore(STORES.TEMPLATES);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(new Error('Failed to get templates'));
        });
    }

    async getTemplatesByCategory(category: string): Promise<any[]> {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORES.TEMPLATES], 'readonly');
            const store = transaction.objectStore(STORES.TEMPLATES);
            const index = store.index('category');
            const request = index.getAll(category);

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(new Error('Failed to get templates by category'));
        });
    }

    async deleteTemplate(templateId: string): Promise<void> {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORES.TEMPLATES], 'readwrite');
            const store = transaction.objectStore(STORES.TEMPLATES);
            const request = store.delete(templateId);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(new Error('Failed to delete template'));
        });
    }
}
