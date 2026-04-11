import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();

function read(relativePath) {
  const fullPath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Missing file: ${relativePath}`);
  }
  return fs.readFileSync(fullPath, "utf8");
}

function mustContain(relativePath, text, label) {
  const content = read(relativePath);
  if (!content.includes(text)) {
    throw new Error(`${label} missing in ${relativePath}: ${text}`);
  }
}

mustContain("src/context/AuthContext.tsx", "withTimeout(", "Auth timeout wrapper");
mustContain("src/context/AuthContext.tsx", 'setStatus("guest")', "Guest fallback on auth bootstrap failure");
mustContain("src/context/AuthContext.tsx", "persistDeploymentSession(null);", "Failed session reset");
mustContain("src/context/AuthContext.tsx", "SESSION_BOOTSTRAP_TIMEOUT_MS", "Session bootstrap timeout");
mustContain("src/context/AuthContext.tsx", "HEALTH_TIMEOUT_MS", "Health timeout");

mustContain("src/pages/LoginPage.tsx", "signInDemo(", "Demo mode on login page");
mustContain("src/pages/SignupPage.tsx", "signInDemo(", "Demo mode on signup page");
mustContain("src/pages/PublicLandingPage.tsx", "signInDemo(", "Demo mode on public landing page");

mustContain("src/pages/LoginPage.tsx", "Live sign-in may be unavailable right now. Demo mode still works for testing.", "Login backend fallback copy");
mustContain("src/pages/SignupPage.tsx", "Live sign-up may be unavailable right now. Demo mode still works for testing.", "Signup backend fallback copy");
mustContain("src/pages/PublicLandingPage.tsx", "Live sign-in may be unavailable right now. Demo mode still works for testing.", "Landing backend fallback copy");

console.log("Auth entry regression check passed");