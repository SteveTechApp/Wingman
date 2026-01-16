[CmdletBinding()]
param(
  [string]$RepoRoot = (Get-Location).Path
)

$ErrorActionPreference = "Stop"

function EnsureDir([string]$p) {
  if (-not (Test-Path -LiteralPath $p)) { New-Item -ItemType Directory -Force -Path $p | Out-Null }
}
function BackupFile([string]$p) {
  if (Test-Path -LiteralPath $p) {
    $stamp = Get-Date -Format "yyyyMMdd_HHmmss"
    Copy-Item -LiteralPath $p -Destination ($p + ".bak_" + $stamp) -Force
    Write-Host ("Backup: {0}.bak_{1}" -f $p, $stamp) -ForegroundColor DarkYellow
  }
}
function WriteUtf8NoBom([string]$path, [string]$content) {
  $dir = Split-Path -Parent $path
  if ($dir) { EnsureDir $dir }
  [IO.File]::WriteAllText($path, $content, (New-Object System.Text.UTF8Encoding($false)))
  Write-Host ("Wrote: {0}" -f $path) -ForegroundColor Green
}

$RepoRoot = (Get-Item -LiteralPath $RepoRoot).FullName

# ---------------------------
# 1) PasswordManager.ts (clean, browser-safe implementation)
# ---------------------------
$pmPath = Join-Path $RepoRoot "src\services\auth\PasswordManager.ts"
BackupFile $pmPath

$pmContent = @"
export type PasswordHashRecord = {
  version: 1;
  saltB64: string;
  hashB64: string;
  createdAtIso: string;
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

async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest("SHA-256", data);
  return new Uint8Array(digest);
}

function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

/**
 * PasswordManager
 * - Minimal implementation to satisfy typecheck and provide a working hash+verify flow.
 * - Stores a salted SHA-256 hash record (NOT bcrypt/argon2). Good enough for demo/local usage.
 * - If you later introduce a real auth backend, you can replace this.
 */
export class PasswordManager {
  private storageKey: string;

  constructor(storageKey = "wingman.passwordHash") {
    this.storageKey = storageKey;
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

  async setPassword(password: string): Promise<PasswordHashRecord> {
    if (!password || password.length < 6) {
      throw new Error("Password must be at least 6 characters.");
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

    localStorage.setItem(this.storageKey, JSON.stringify(rec));
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
"@

WriteUtf8NoBom $pmPath $pmContent

# ---------------------------
# 2) productConsolidation.ts (convert to a clean prompt export)
# ---------------------------
$pcPath = Join-Path $RepoRoot "src\services\prompts\designRoom\productConsolidation.ts"
BackupFile $pcPath

$pcContent = @"
export const productConsolidationPrompt = `
You are Wingman, an AV pre-sales assistant for WyreStorm solutions.

Task:
- Consolidate a list of proposed products (SKUs) into a clean bill of materials (BOM).
- Remove duplicates and roll up quantities.
- Identify obvious missing ancillaries (mounts, power, cabling, control accessories) as "Recommended".
- Flag incompatibilities and rule violations as "Warnings".

Rules:
- Prefer current WyreStorm SKUs; avoid EoL ranges if the catalog indicates them.
- Keep the output structured and deterministic.

Output format (JSON only):
{
  "bom": [
    { "sku": "STRING", "description": "STRING", "qty": NUMBER, "category": "Core|Accessory|Cabling|Recommended" }
  ],
  "warnings": [ "STRING" ],
  "notes": [ "STRING" ]
}
`.trim();
"@

WriteUtf8NoBom $pcPath $pcContent

# ---------------------------
# Run typecheck
# ---------------------------
Write-Host ""
Write-Host "== Running: npm run typecheck ==" -ForegroundColor Cyan
Push-Location $RepoRoot
try {
  npm run typecheck | Out-Host
} finally {
  Pop-Location
}
