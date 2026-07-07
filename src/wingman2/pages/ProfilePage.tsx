import { useEffect, useRef, useState } from "react";
import {
  getWingmanSession,
  loginWingmanWorkspace,
  logoutWingmanWorkspace,
  signUpWingmanWorkspace,
  type WingmanWorkspaceSession,
} from "../api/wingmanApi";
import {
  hydrateProjectStoreFromBackend,
  projectBackendSyncEnabled,
  resetProjectBackendSyncSessionState,
} from "../data/projectStore";
import { StatusChip } from "../components/StatusChip";

type ProfileSettings = {
  companyName: string;
  regionMarket: string;
  preparedBy: string;
  defaultAudience: string;
  displayName: string;
  role: string;
  email: string;
  phone: string;
  regionPreference: string;
  speechLanguage: string;
  footerText: string;
  productUpdateMode: string;
  logoDataUrl: string;
  workspaceSyncMode: string;
  workspaceEmail: string;
  workspacePassword: string;
};

const storageKeys = [
  "wingman.localProfile.v2",
  "wingmanProfile",
  "wingman:profile",
  "wingman-profile-settings",
];

const defaultProfile: ProfileSettings = {
  companyName: "WyreStorm",
  regionMarket: "United Kingdom",
  preparedBy: "",
  defaultAudience: "Dealer / reseller",
  displayName: "Mr Steve",
  role: "",
  email: "",
  phone: "",
  regionPreference: "GB - English",
  speechLanguage: "GB - English",
  footerText: "Prepared using WyreStorm Wingman.",
  productUpdateMode: "Auto-draft, require approval",
  logoDataUrl: "",
  workspaceSyncMode: "Local only",
  workspaceEmail: "",
  workspacePassword: "",
};

const audienceOptions = [
  "Dealer / reseller",
  "Integrator",
  "Distributor sales team",
  "Technical consultant",
  "End user",
  "Internal WyreStorm team",
];

const languageOptions = [
  "GB - English",
  "US - English",
  "IE - English",
  "AU - English",
];

const updateModeOptions = [
  "Auto-draft, require approval",
  "Manual review only",
  "Trusted WyreStorm updates only",
];

const syncModeOptions = [
  "Local only",
  "Sign in",
];

function readStoredProfile(): ProfileSettings {
  for (const key of storageKeys) {
    const raw = window.localStorage.getItem(key);

    if (!raw) {
      continue;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<ProfileSettings>;

      if (parsed && typeof parsed === "object") {
        return {
          ...defaultProfile,
          ...parsed,
          workspacePassword: "",
        };
      }
    } catch {
      continue;
    }
  }

  return defaultProfile;
}

export function ProfilePage() {
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const [profile, setProfile] = useState<ProfileSettings>(defaultProfile);
  const [status, setStatus] = useState("Local settings ready.");
  const [session, setSession] = useState<WingmanWorkspaceSession | null>(null);
  const [workspaceBusy, setWorkspaceBusy] = useState(false);

  useEffect(() => {
    setProfile(readStoredProfile());

    getWingmanSession()
      .then((response) => {
        setSession(response.session ?? null);
        if (response.session?.user) {
          setStatus(`Signed in as ${response.session.user.email || response.session.user.name || "Wingman user"}.`);
        }
      })
      .catch(() => {
        setSession(null);
      });
  }, []);

  function updateField<K extends keyof ProfileSettings>(field: K, value: ProfileSettings[K]) {
    setProfile((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function saveProfile() {
    const payload = JSON.stringify({ ...profile, workspacePassword: "" });

    for (const key of storageKeys) {
      window.localStorage.setItem(key, payload);
    }

    setStatus(`Saved locally at ${new Date().toLocaleTimeString()}.`);
  }

  function resetProfile() {
    const confirmed = window.confirm("Reset the local Wingman profile settings?");

    if (!confirmed) {
      return;
    }

    for (const key of storageKeys) {
      window.localStorage.removeItem(key);
    }

    setProfile(defaultProfile);
    setStatus("Local profile reset.");
  }

  function printProfile() {
    window.print();
  }

  function uploadLogo(file: File | undefined) {
    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";

      updateField("logoDataUrl", result);
      setStatus(`Logo loaded locally: ${file.name}`);
    };

    reader.readAsDataURL(file);
  }

  function clearLogo() {
    updateField("logoDataUrl", "");
    setStatus("Logo removed.");
  }

  async function activateWorkspace(responseSession: WingmanWorkspaceSession | undefined, action: string) {
    setSession(responseSession ?? null);
    resetProjectBackendSyncSessionState();

    if (projectBackendSyncEnabled()) {
      await hydrateProjectStoreFromBackend();
      setStatus(`${action}. Workspace projects are now synchronised.`);
      return;
    }

    setStatus(`${action}. Project sync is disabled for this build, so projects remain in this browser.`);
  }

  async function handleSignIn() {
    if (!profile.workspaceEmail.trim() || !profile.workspacePassword) {
      setStatus("Enter your workspace email and password.");
      return;
    }

    setWorkspaceBusy(true);
    try {
      const response = await loginWingmanWorkspace({
        email: profile.workspaceEmail.trim(),
        password: profile.workspacePassword,
      });
      await activateWorkspace(response.session, "Signed in");
      updateField("workspacePassword", "");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Sign in failed.");
    } finally {
      setWorkspaceBusy(false);
    }
  }

  async function handleCreateWorkspace() {
    const email = profile.workspaceEmail.trim() || profile.email.trim();
    const name = profile.displayName.trim() || profile.preparedBy.trim();
    const company = profile.companyName.trim();

    if (!name || !company || !email || !profile.workspacePassword) {
      setStatus("Enter your name, company, workspace email and a password of at least 10 characters.");
      return;
    }

    setWorkspaceBusy(true);
    try {
      const response = await signUpWingmanWorkspace({
        name,
        company,
        email,
        password: profile.workspacePassword,
      });
      await activateWorkspace(response.session, "Workspace created");
      updateField("workspaceEmail", email);
      updateField("workspacePassword", "");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Workspace creation failed.");
    } finally {
      setWorkspaceBusy(false);
    }
  }

  async function handleSignOut() {
    setWorkspaceBusy(true);
    try {
      await logoutWingmanWorkspace();
      setSession(null);
      resetProjectBackendSyncSessionState();
      setStatus("Signed out. Projects remain available in this browser.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Sign out failed.");
    } finally {
      setWorkspaceBusy(false);
    }
  }

  return (
    <main
      className="wm-page wm-settings-page wm-profile-page wm-profile-page-compact"
      data-wingman-page="settings"
      data-wingman-settings-page="true"
    >
      <header className="wm-page-header wm-profile-hero">
        <div>
          <p className="wm-profile-kicker">Wingman settings</p>
          <h1>Local profile and proposal settings</h1>
          <p>
            Compact local setup for branding, user details, region defaults, speech capture and workspace recovery.
          </p>
        </div>

        <div className="wm-profile-hero-actions" aria-label="Profile actions">
          <button className="wm-button wm-button-primary" type="button" onClick={saveProfile}>Save</button>
          <button className="wm-button wm-button-secondary" type="button" onClick={printProfile}>Print</button>
          <button className="wm-button wm-button-ghost" type="button" onClick={resetProfile}>Reset</button>
        </div>
      </header>

      <div className="wm-output-panel wm-profile-status-strip">
        <StatusChip label="Status" variant="ready" />
        <strong>{status}</strong>
      </div>

      <div className="wm-form-grid wm-profile-grid">
        <section className="wm-section-card wm-profile-card wm-profile-brand-card">
          <div className="wm-profile-card-head">
            <p className="wm-profile-card-label">Brand and company</p>
            <h2>Default proposal identity</h2>
          </div>

          <div className="wm-profile-brand-row">
            <button
              className="wm-button wm-button-ghost wm-profile-logo-box"
              type="button"
              onClick={() => logoInputRef.current?.click()}
              aria-label="Upload company logo"
            >
              {profile.logoDataUrl ? (
                <img src={profile.logoDataUrl} alt="Company logo preview" />
              ) : (
                <span>Logo</span>
              )}
            </button>

            <div className="wm-profile-brand-actions">
              <button className="wm-button wm-button-secondary" type="button" onClick={() => logoInputRef.current?.click()}>Upload</button>
              <button className="wm-button wm-button-ghost" type="button" onClick={clearLogo}>Clear</button>
            </div>
          </div>

          <input
            ref={logoInputRef}
            className="wm-profile-file-input"
            type="file"
            accept="image/*"
            onChange={(event) => uploadLogo(event.target.files?.[0])}
          />

          <div className="wm-form-grid wm-profile-two-col">
            <label className="wm-field">
              Company
              <input className="wm-input" value={profile.companyName} onChange={(event) => updateField("companyName", event.target.value)} />
            </label>

            <label className="wm-field">
              Market
              <input className="wm-input" value={profile.regionMarket} onChange={(event) => updateField("regionMarket", event.target.value)} />
            </label>

            <label className="wm-field">
              Prepared by
              <input className="wm-input" value={profile.preparedBy} onChange={(event) => updateField("preparedBy", event.target.value)} />
            </label>

            <label className="wm-field">
              Audience
              <select className="wm-select" value={profile.defaultAudience} onChange={(event) => updateField("defaultAudience", event.target.value)}>
                {audienceOptions.map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
          </div>
        </section>

        <section className="wm-section-card wm-profile-card">
          <div className="wm-profile-card-head">
            <p className="wm-profile-card-label">User</p>
            <h2>Contact and output details</h2>
          </div>

          <div className="wm-form-grid wm-profile-two-col">
            <label className="wm-field">
              Name
              <input className="wm-input" value={profile.displayName} onChange={(event) => updateField("displayName", event.target.value)} />
            </label>

            <label className="wm-field">
              Role
              <input className="wm-input" value={profile.role} onChange={(event) => updateField("role", event.target.value)} />
            </label>

            <label className="wm-field">
              Email
              <input className="wm-input" value={profile.email} onChange={(event) => updateField("email", event.target.value)} />
            </label>

            <label className="wm-field">
              Phone
              <input className="wm-input" value={profile.phone} onChange={(event) => updateField("phone", event.target.value)} />
            </label>
          </div>

          <label className="wm-field wm-profile-wide-field">
            Proposal footer
            <textarea className="wm-textarea" value={profile.footerText} onChange={(event) => updateField("footerText", event.target.value)} />
          </label>
        </section>

        <section className="wm-section-card wm-profile-card">
          <div className="wm-profile-card-head">
            <p className="wm-profile-card-label">Defaults</p>
            <h2>Language and intelligence control</h2>
          </div>

          <div className="wm-form-grid wm-profile-two-col">
            <label className="wm-field">
              Region
              <select className="wm-select" value={profile.regionPreference} onChange={(event) => updateField("regionPreference", event.target.value)}>
                {languageOptions.map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>

            <label className="wm-field">
              Speech
              <select className="wm-select" value={profile.speechLanguage} onChange={(event) => updateField("speechLanguage", event.target.value)}>
                {languageOptions.map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
          </div>

          <label className="wm-field wm-profile-wide-field">
            Product intelligence mode
            <select className="wm-select" value={profile.productUpdateMode} onChange={(event) => updateField("productUpdateMode", event.target.value)}>
              {updateModeOptions.map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>

          <div className="wm-output-panel wm-profile-info-box">
            <strong>Recommended</strong>
            <span>Stage new product and competitor findings for review before Finder, Compare or Proposal use them as trusted data.</span>
          </div>
        </section>

        <section className="wm-section-card wm-profile-card">
          <div className="wm-profile-card-head">
            <p className="wm-profile-card-label">Workspace sync</p>
            <h2>Live-call recovery</h2>
          </div>

          <div className="wm-output-panel wm-profile-info-box">
            <strong>{session?.workspace?.name || (projectBackendSyncEnabled() ? "Workspace available" : "Local mode")}</strong>
            <span>
              {session?.user
                ? `Signed in as ${session.user.email || session.user.name}.`
                : projectBackendSyncEnabled()
                  ? "Sign in to recover projects across devices."
                  : "This build saves projects in this browser. You can still sign in, but project sync is disabled."}
            </span>
          </div>

          <div className="wm-form-grid wm-profile-two-col">
            <label className="wm-field">
              Mode
              <select className="wm-select" value={profile.workspaceSyncMode} onChange={(event) => updateField("workspaceSyncMode", event.target.value)}>
                {syncModeOptions.map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>

            <label className="wm-field">
              Email
              <input className="wm-input" value={profile.workspaceEmail} onChange={(event) => updateField("workspaceEmail", event.target.value)} />
            </label>
          </div>

          <label className="wm-field">
            Password
            <input
              className="wm-input"
              type="password"
              value={profile.workspacePassword}
              onChange={(event) => updateField("workspacePassword", event.target.value)}
            />
          </label>

          <div className="wm-profile-button-row">
            {session?.user ? (
              <button className="wm-button wm-button-secondary" type="button" onClick={handleSignOut} disabled={workspaceBusy}>Sign out</button>
            ) : (
              <>
                <button className="wm-button wm-button-secondary" type="button" onClick={handleSignIn} disabled={workspaceBusy}>Sign in</button>
                <button className="wm-button wm-button-primary" type="button" onClick={handleCreateWorkspace} disabled={workspaceBusy}>Create workspace</button>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

export default ProfilePage;
