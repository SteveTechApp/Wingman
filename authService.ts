/**
 * Authentication Service
 * Handles user authentication, session management, and access control
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

class AuthService {
    private currentSession: AuthSession | null = null;
    private readonly SESSION_KEY = 'wingman_auth_session';
    private readonly SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

    constructor() {
        // Try to restore session from localStorage on initialization
        this.restoreSession();
    }

    /**
     * Register a new user
     */
    async register(email: string, password: string, name: string, company?: string): Promise<AuthUser> {
        // Validate input
        if (!email || !password || !name) {
            throw new Error('Email, password, and name are required');
        }

        if (password.length < 8) {
            throw new Error('Password must be at least 8 characters long');
        }

        if (!this.isValidEmail(email)) {
            throw new Error('Invalid email address');
        }

        // In a real implementation, this would make an API call
        // For now, we'll create a mock user
        const user: AuthUser = {
            id: this.generateId(),
            email,
            name,
            company,
            role: 'user',
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
        };

        // Store hashed password (in real implementation, this would be server-side)
        await this.storeUserCredentials(email, password);

        // Create session
        await this.createSession(user);

        return user;
    }

    /**
     * Login with email and password
     */
    async login(email: string, password: string): Promise<AuthUser> {
        // Validate input
        if (!email || !password) {
            throw new Error('Email and password are required');
        }

        // In a real implementation, this would make an API call
        // For now, we'll check stored credentials
        const isValid = await this.validateCredentials(email, password);
        
        if (!isValid) {
            throw new Error('Invalid email or password');
        }

        // Get or create user
        const user = await this.getUserByEmail(email);

        // Update last login
        user.lastLogin = new Date().toISOString();
        await this.updateUser(user);

        // Create session
        await this.createSession(user);

        return user;
    }

    /**
     * Logout current user
     */
    async logout(): Promise<void> {
        this.currentSession = null;
        localStorage.removeItem(this.SESSION_KEY);
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated(): boolean {
        if (!this.currentSession) {
            return false;
        }

        // Check if session has expired
        const now = new Date().getTime();
        const expiresAt = new Date(this.currentSession.expiresAt).getTime();

        if (now > expiresAt) {
            this.logout();
            return false;
        }

        return true;
    }

    /**
     * Get current authenticated user
     */
    getCurrentUser(): AuthUser | null {
        if (!this.isAuthenticated()) {
            return null;
        }
        return this.currentSession?.user || null;
    }

    /**
     * Update current user's profile
     */
    async updateProfile(updates: Partial<Omit<AuthUser, 'id' | 'email' | 'createdAt'>>): Promise<AuthUser> {
        const currentUser = this.getCurrentUser();
        if (!currentUser) {
            throw new Error('Not authenticated');
        }

        const updatedUser: AuthUser = {
            ...currentUser,
            ...updates,
        };

        await this.updateUser(updatedUser);

        // Update session
        if (this.currentSession) {
            this.currentSession.user = updatedUser;
            this.saveSession();
        }

        return updatedUser;
    }

    /**
     * Change password
     */
    async changePassword(currentPassword: string, newPassword: string): Promise<void> {
        const user = this.getCurrentUser();
        if (!user) {
            throw new Error('Not authenticated');
        }

        // Validate current password
        const isValid = await this.validateCredentials(user.email, currentPassword);
        if (!isValid) {
            throw new Error('Current password is incorrect');
        }

        // Validate new password
        if (newPassword.length < 8) {
            throw new Error('New password must be at least 8 characters long');
        }

        // Update password
        await this.storeUserCredentials(user.email, newPassword);
    }

    /**
     * Request password reset
     */
    async requestPasswordReset(email: string): Promise<void> {
        if (!this.isValidEmail(email)) {
            throw new Error('Invalid email address');
        }

        // In a real implementation, this would send a password reset email
        console.log(`Password reset requested for ${email}`);
        
        // Store reset token (in real implementation, this would be server-side)
        const resetToken = this.generateId();
        const expiresAt = new Date(Date.now() + 3600000).toISOString(); // 1 hour
        
        localStorage.setItem(`password_reset_${email}`, JSON.stringify({
            token: resetToken,
            expiresAt,
        }));
    }

    /**
     * Reset password with token
     */
    async resetPassword(email: string, token: string, newPassword: string): Promise<void> {
        // Validate new password
        if (newPassword.length < 8) {
            throw new Error('New password must be at least 8 characters long');
        }

        // Verify token
        const resetData = localStorage.getItem(`password_reset_${email}`);
        if (!resetData) {
            throw new Error('Invalid or expired reset token');
        }

        const { token: storedToken, expiresAt } = JSON.parse(resetData);
        
        if (token !== storedToken) {
            throw new Error('Invalid reset token');
        }

        if (new Date() > new Date(expiresAt)) {
            localStorage.removeItem(`password_reset_${email}`);
            throw new Error('Reset token has expired');
        }

        // Update password
        await this.storeUserCredentials(email, newPassword);

        // Clean up reset token
        localStorage.removeItem(`password_reset_${email}`);
    }

    // ==================== PRIVATE METHODS ====================

    private async createSession(user: AuthUser): Promise<void> {
        const token = this.generateToken();
        const expiresAt = new Date(Date.now() + this.SESSION_DURATION).toISOString();

        this.currentSession = {
            user,
            token,
            expiresAt,
        };

        this.saveSession();
    }

    private saveSession(): void {
        if (this.currentSession) {
            localStorage.setItem(this.SESSION_KEY, JSON.stringify(this.currentSession));
        }
    }

    private restoreSession(): void {
        const sessionData = localStorage.getItem(this.SESSION_KEY);
        if (sessionData) {
            try {
                this.currentSession = JSON.parse(sessionData);
                
                // Verify session hasn't expired
                if (!this.isAuthenticated()) {
                    this.currentSession = null;
                    localStorage.removeItem(this.SESSION_KEY);
                }
            } catch (error) {
                console.error('Failed to restore session:', error);
                localStorage.removeItem(this.SESSION_KEY);
            }
        }
    }

    private async storeUserCredentials(email: string, password: string): Promise<void> {
        // In a real implementation, password would be hashed server-side
        // This is just for demo purposes
        const hashedPassword = await this.hashPassword(password);
        
        const users = this.getStoredUsers();
        users[email] = hashedPassword;
        localStorage.setItem('wingman_users', JSON.stringify(users));
    }

    private async validateCredentials(email: string, password: string): Promise<boolean> {
        const users = this.getStoredUsers();
        const storedHash = users[email];
        
        if (!storedHash) {
            return false;
        }

        const passwordHash = await this.hashPassword(password);
        return passwordHash === storedHash;
    }

    private getStoredUsers(): Record<string, string> {
        const usersData = localStorage.getItem('wingman_users');
        return usersData ? JSON.parse(usersData) : {};
    }

    private async getUserByEmail(email: string): Promise<AuthUser> {
        // In real implementation, this would fetch from database
        const usersDataStr = localStorage.getItem('wingman_user_profiles');
        const usersData = usersDataStr ? JSON.parse(usersDataStr) : {};
        
        if (usersData[email]) {
            return usersData[email];
        }

        // Create new user profile if doesn't exist
        const newUser: AuthUser = {
            id: this.generateId(),
            email,
            name: email.split('@')[0],
            role: 'user',
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
        };

        usersData[email] = newUser;
        localStorage.setItem('wingman_user_profiles', JSON.stringify(usersData));

        return newUser;
    }

    private async updateUser(user: AuthUser): Promise<void> {
        const usersDataStr = localStorage.getItem('wingman_user_profiles');
        const usersData = usersDataStr ? JSON.parse(usersDataStr) : {};
        
        usersData[user.email] = user;
        localStorage.setItem('wingman_user_profiles', JSON.stringify(usersData));
    }

    private async hashPassword(password: string): Promise<string> {
        // Simple hash for demo - in production, use proper bcrypt/scrypt
        const encoder = new TextEncoder();
        const data = encoder.encode(password + 'salt');
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    private generateId(): string {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    private generateToken(): string {
        return `${this.generateId()}-${this.generateId()}`;
    }

    private isValidEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
}

// Export singleton instance
export const authService = new AuthService();
