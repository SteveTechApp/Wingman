/**
 * Authentication Service
 * Main service that orchestrates authentication operations
 */

import { AuthUser, RegistrationData } from './types';
import { SessionManager } from './SessionManager';
import { PasswordManager } from './PasswordManager';
import { UserManager } from './UserManager';

class AuthService {
    private sessionManager: SessionManager;
    private passwordManager: PasswordManager;
    private userManager: UserManager;

    constructor() {
        this.sessionManager = new SessionManager();
        this.passwordManager = new PasswordManager();
        this.userManager = new UserManager();
    }

    async register(data: RegistrationData): Promise<AuthUser> {
        const { email, password, name, company } = data;

        // Validate
        if (!email || !password || !name) {
            throw new Error('Email, password, and name are required');
        }

        if (!this.userManager.validateEmail(email)) {
            throw new Error('Invalid email address');
        }

        const passwordCheck = this.passwordManager.validatePasswordStrength(password);
        if (!passwordCheck.valid) {
            throw new Error(passwordCheck.message);
        }

        // Create user and store credentials
        const user = await this.userManager.createUser(email, name, company);
        await this.passwordManager.storePassword(email, password);

        // Create session
        this.sessionManager.createSession(user);

        return user;
    }

    async login(email: string, password: string): Promise<AuthUser> {
        if (!email || !password) {
            throw new Error('Email and password are required');
        }

        const isValid = await this.passwordManager.validateCredentials(email, password);
        if (!isValid) {
            throw new Error('Invalid email or password');
        }

        const user = await this.userManager.getOrCreateUser(email);
        await this.userManager.updateLastLogin(email);

        this.sessionManager.createSession(user);

        return user;
    }

    async logout(): Promise<void> {
        this.sessionManager.clearSession();
    }

    isAuthenticated(): boolean {
        return this.sessionManager.isValid();
    }

    getCurrentUser(): AuthUser | null {
        if (!this.isAuthenticated()) return null;
        return this.sessionManager.getCurrentSession()?.user || null;
    }

    async updateProfile(updates: Partial<Omit<AuthUser, 'id' | 'email' | 'createdAt'>>): Promise<AuthUser> {
        const currentUser = this.getCurrentUser();
        if (!currentUser) {
            throw new Error('Not authenticated');
        }

        const updatedUser = await this.userManager.updateProfile(currentUser.email, updates);
        this.sessionManager.updateUser(updatedUser);

        return updatedUser;
    }

    async changePassword(currentPassword: string, newPassword: string): Promise<void> {
        const user = this.getCurrentUser();
        if (!user) {
            throw new Error('Not authenticated');
        }

        const isValid = await this.passwordManager.validateCredentials(user.email, currentPassword);
        if (!isValid) {
            throw new Error('Current password is incorrect');
        }

        const passwordCheck = this.passwordManager.validatePasswordStrength(newPassword);
        if (!passwordCheck.valid) {
            throw new Error(passwordCheck.message);
        }

        await this.passwordManager.storePassword(user.email, newPassword);
    }

    async requestPasswordReset(email: string): Promise<void> {
        if (!this.userManager.validateEmail(email)) {
            throw new Error('Invalid email address');
        }

        const token = this.passwordManager.createResetToken(email);
        console.log(`Password reset requested for ${email}. Token: ${token}`);
    }

    async resetPassword(email: string, token: string, newPassword: string): Promise<void> {
        const passwordCheck = this.passwordManager.validatePasswordStrength(newPassword);
        if (!passwordCheck.valid) {
            throw new Error(passwordCheck.message);
        }

        const tokenCheck = this.passwordManager.validateResetToken(email, token);
        if (!tokenCheck.valid) {
            throw new Error(tokenCheck.message);
        }

        await this.passwordManager.storePassword(email, newPassword);
        this.passwordManager.clearResetToken(email);
    }
}

export const authService = new AuthService();
