/**
 * User Manager
 * Handles user profile operations and storage
 */

import { AuthUser } from './types';

export class UserManager {
    async createUser(email: string, name: string, company?: string): Promise<AuthUser> {
        const user: AuthUser = {
            id: this.generateId(),
            email,
            name,
            company,
            role: 'user',
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
        };

        await this.saveUser(user);
        return user;
    }

    async getUserByEmail(email: string): Promise<AuthUser | null> {
        const users = this.getStoredUsers();
        return users[email] || null;
    }

    async getOrCreateUser(email: string): Promise<AuthUser> {
        const existingUser = await this.getUserByEmail(email);
        
        if (existingUser) {
            return existingUser;
        }

        return this.createUser(email, email.split('@')[0]);
    }

    async updateUser(user: AuthUser): Promise<void> {
        const users = this.getStoredUsers();
        users[user.email] = user;
        localStorage.setItem('wingman_user_profiles', JSON.stringify(users));
    }

    async updateLastLogin(email: string): Promise<void> {
        const user = await this.getUserByEmail(email);
        if (user) {
            user.lastLogin = new Date().toISOString();
            await this.updateUser(user);
        }
    }

    async updateProfile(
        email: string, 
        updates: Partial<Omit<AuthUser, 'id' | 'email' | 'createdAt'>>
    ): Promise<AuthUser> {
        const user = await this.getUserByEmail(email);
        
        if (!user) {
            throw new Error('User not found');
        }

        const updatedUser: AuthUser = { ...user, ...updates };
        await this.updateUser(updatedUser);
        return updatedUser;
    }

    validateEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    private async saveUser(user: AuthUser): Promise<void> {
        const users = this.getStoredUsers();
        users[user.email] = user;
        localStorage.setItem('wingman_user_profiles', JSON.stringify(users));
    }

    private getStoredUsers(): Record<string, AuthUser> {
        const usersData = localStorage.getItem('wingman_user_profiles');
        return usersData ? JSON.parse(usersData) : {};
    }

    private generateId(): string {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
}
