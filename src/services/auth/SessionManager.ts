/**
 * Session Manager
 * Handles session storage, validation, and expiration
 */

import { AuthSession, AuthUser } from './types';

export class SessionManager {
    private readonly SESSION_KEY = 'wingman_auth_session';
    private readonly SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours
    private currentSession: AuthSession | null = null;

    constructor() {
        this.restoreSession();
    }

    createSession(user: AuthUser): AuthSession {
        const token = this.generateToken();
        const expiresAt = new Date(Date.now() + this.SESSION_DURATION).toISOString();

        this.currentSession = { user, token, expiresAt };
        this.saveSession();
        return this.currentSession;
    }

    getCurrentSession(): AuthSession | null {
        return this.currentSession;
    }

    isValid(): boolean {
        if (!this.currentSession) return false;

        const now = new Date().getTime();
        const expiresAt = new Date(this.currentSession.expiresAt).getTime();

        if (now > expiresAt) {
            this.clearSession();
            return false;
        }

        return true;
    }

    updateUser(user: AuthUser): void {
        if (this.currentSession) {
            this.currentSession.user = user;
            this.saveSession();
        }
    }

    clearSession(): void {
        this.currentSession = null;
        localStorage.removeItem(this.SESSION_KEY);
    }

    private saveSession(): void {
        if (this.currentSession) {
            localStorage.setItem(this.SESSION_KEY, JSON.stringify(this.currentSession));
        }
    }

    private restoreSession(): void {
        const sessionData = localStorage.getItem(this.SESSION_KEY);
        if (!sessionData) return;

        try {
            this.currentSession = JSON.parse(sessionData);
            if (!this.isValid()) {
                this.clearSession();
            }
        } catch (error) {
            console.error('Failed to restore session:', error);
            localStorage.removeItem(this.SESSION_KEY);
        }
    }

    private generateToken(): string {
        const id1 = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const id2 = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        return `${id1}-${id2}`;
    }
}
