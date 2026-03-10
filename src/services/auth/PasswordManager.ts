import * as React from "react";


export type PasswordHashRecord = {
  version: 1;
  saltB64: string;
  hashB64: string;
  createdAtIso: string;
};

export type ResetTokenRecord = {
  token: string;
  expiresAtIso: string;
};

function toB64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function fromB64(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

async function sha256(data: Uint8Array): Promise<Uint8Array> {
  // Avoid ArrayBufferLike typing issues by passing a real ArrayBuffer slice
  const ab = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  const digest = await crypto.subtle.digest("SHA-256", ab);
  return new Uint8Array(digest);
}

function randomToken(len = 32): string {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return toB64(bytes).replace(/=+$/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

/**
 * PasswordManager (browser/local demo)
 * NOTE: This is not a server-grade password system.
 * It exists to keep the app functional and type-safe while you stabilise features.
 */
export class PasswordManager {
  private storageKey: string;
  private resetKey: string;

  constructor(storageKey = "wingman.passwordHash", resetKey = "wingman.resetToken") {
    this.storageKey = storageKey;
    this.resetKey = resetKey;
  }

  getRecord(): PasswordHashRecord | null {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as PasswordHashRecord;
      if (!parsed || parsed.version !== 1) return null;
      if (!parsed.saltB64 || !parsed.hashB64) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  clear(): void {
    localStorage.removeItem(this.storageKey);
  }

  // --- Compatibility API expected by AuthService ---

  validatePasswordStrength(password: string): { ok: boolean; reasons: string[] } {
    const reasons: string[] = [];
    if (!password || password.length < 6) reasons.push("Password must be at least 6 characters.");
    if (!/[A-Z]/.test(password)) reasons.push("Add an uppercase letter.");
    if (!/[0-9]/.test(password)) reasons.push("Add a number.");
    return { ok: reasons.length === 0, reasons };
  }

  async storePassword(password: string): Promise<PasswordHashRecord> {
    return this.setPassword(password);
  }

  async validateCredentials(password: string): Promise<boolean> {
    return this.verifyPassword(password);
  }

  async createResetToken(ttlMinutes = 30): Promise<ResetTokenRecord> {
    const token = randomToken(24);
    const expiresAtIso = new Date(Date.now() + ttlMinutes * 60_000).toISOString();
    const rec: ResetTokenRecord = { token, expiresAtIso };
    localStorage.setItem(this.resetKey, JSON.stringify(rec, null, 2));
    return rec;
  }

  validateResetToken(token: string): boolean {
    try {
      const raw = localStorage.getItem(this.resetKey);
      if (!raw) return false;
      const rec = JSON.parse(raw) as ResetTokenRecord;
      if (!rec?.token || !rec?.expiresAtIso) return false;
      if (rec.token !== token) return false;
      return new Date(rec.expiresAtIso).getTime() > Date.now();
    } catch {
      return false;
    }
  }

  clearResetToken(): void {
    localStorage.removeItem(this.resetKey);
  }

  // --- Core implementation ---

  async setPassword(password: string): Promise<PasswordHashRecord> {
    const strength = this.validatePasswordStrength(password);
    if (!strength.ok) {
      throw new Error(strength.reasons[0] ?? "Password not strong enough.");
    }

    const salt = crypto.getRandomValues(new Uint8Array(16));
    const enc = new TextEncoder().encode(password);
    const salted = concat(salt, enc);
    const hash = await sha256(salted);

    const rec: PasswordHashRecord = {
      version: 1,
      saltB64: toB64(salt),
      hashB64: toB64(hash),
      createdAtIso: new Date().toISOString(),
    };

    localStorage.setItem(this.storageKey, JSON.stringify(rec, null, 2));
    return rec;
  }

  async verifyPassword(password: string): Promise<boolean> {
    const rec = this.getRecord();
    if (!rec) return false;

    const salt = fromB64(rec.saltB64);
    const enc = new TextEncoder().encode(password);
    const salted = concat(salt, enc);
    const hash = await sha256(salted);

    return toB64(hash) === rec.hashB64;
  }
}




