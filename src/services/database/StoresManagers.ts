/**
 * User Profile Store
 * Handles user profile database operations
 */

import { DatabaseService } from './DatabaseService';
import { STORES } from './types';

export class UserProfileStore extends DatabaseService {
    async saveUserProfile(profile: any): Promise<void> {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORES.USER_PROFILE], 'readwrite');
            const store = transaction.objectStore(STORES.USER_PROFILE);
            const profileToSave = { ...profile, id: 'current' };
            const request = store.put(profileToSave);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(new Error('Failed to save user profile'));
        });
    }

    async getUserProfile(): Promise<any | null> {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORES.USER_PROFILE], 'readonly');
            const store = transaction.objectStore(STORES.USER_PROFILE);
            const request = store.get('current');

            request.onsuccess = () => {
                const result = request.result;
                if (result) {
                    const { id, ...profile } = result;
                    resolve(profile);
                } else {
                    resolve(null);
                }
            };
            request.onerror = () => reject(new Error('Failed to get user profile'));
        });
    }
}

/**
 * Settings Store
 * Handles application settings storage
 */
export class SettingsStore extends DatabaseService {
    async saveSetting(key: string, value: any): Promise<void> {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORES.SETTINGS], 'readwrite');
            const store = transaction.objectStore(STORES.SETTINGS);
            const request = store.put({ key, value });

            request.onsuccess = () => resolve();
            request.onerror = () => reject(new Error('Failed to save setting'));
        });
    }

    async getSetting(key: string): Promise<any> {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORES.SETTINGS], 'readonly');
            const store = transaction.objectStore(STORES.SETTINGS);
            const request = store.get(key);

            request.onsuccess = () => resolve(request.result?.value);
            request.onerror = () => reject(new Error('Failed to get setting'));
        });
    }
}
