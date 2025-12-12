/**
 * Password Manager
 * Handles password hashing, validation, and reset operations
 */

import { PasswordResetToken } from './types';

export class PasswordManager {
    private readonly RESET_TOKEN_DURATION = 3600000; // 1 hour

    async hashPassword(password: string): Promise<string> {
        const encoder = new TextEncoder();
        const data = encoder.encode(password + 'salt');
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    async validatePassword(password: string, hashedPassword: string): Promise<boolean> {
        const inputHash = await this.hashPassword(password);
        return inputHash === hashedPassword;
    }

    validatePasswordStrength(password: string): { valid: boolean; message?: string } {
        if (password.length < 8) {
            return { valid: false, message: 'Password must be at least 8 characters long' };
        }
        return { valid: true };
    }

    async storePassword(email: string, password: string): Promise<void> {
        const hashedPassword = await this.hashPassword(password);
        const users = this.getStoredPasswords();
        users[email] = hashedPassword;
        localStorage.setItem('wingman_users', JSON.stringify(users));
    }

    async validateCredentials(email: string, password: string): Promise<boolean> {
        const users = this.getStoredPasswords();
        const storedHash = users[email];
        
        if (!storedHash) return false;
        return this.validatePassword(password, storedHash);
    }

    createResetToken(email: string): string {
        const token = this.generateId();
        const expiresAt = new Date(Date.now() + this.RESET_TOKEN_DURATION).toISOString();
        
        const resetToken: PasswordResetToken = { token, expiresAt };
        localStorage.setItem(`password_reset_${email}`, JSON.stringify(resetToken));
        
        return token;
    }

    validateResetToken(email: string, token: string): { valid: boolean; message?: string } {
        const resetData = localStorage.getItem(`password_reset_${email}`);
        
        if (!resetData) {
            return { valid: false, message: 'Invalid or expired reset token' };
        }

        const { token: storedToken, expiresAt } = JSON.parse(resetData) as PasswordResetToken;
        
        if (token !== storedToken) {
            return { valid: false, message: 'Invalid reset token' };
        }

        if (new Date() > new Date(expiresAt)) {
            localStorage.removeItem(`password_reset_${email}`);
            return { valid: false, message: 'Reset token has expired' };
        }

        return { valid: true };
    }

    clearResetToken(email: string): void {
        localStorage.removeItem(`password_reset_${email}`);
    }

    private getStoredPasswords(): Record<string, string> {
        const usersData = localStorage.getItem('wingman_users');
        return usersData ? JSON.parse(usersData) : {};
    }

    private generateId(): string {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
}
