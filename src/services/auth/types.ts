/**
 * Authentication Type Definitions
 */

export interface AuthUser {
    id: string;
    email: string;
    name: string;
    company?: string;
    role: 'admin' | 'user' | 'viewer';
    createdAt: string;
    lastLogin: string;
}

export interface AuthSession {
    user: AuthUser;
    token: string;
    expiresAt: string;
}

export interface UserCredentials {
    email: string;
    password: string;
}

export interface RegistrationData extends UserCredentials {
    name: string;
    company?: string;
}

export interface PasswordResetToken {
    token: string;
    expiresAt: string;
}
