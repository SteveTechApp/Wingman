import { useEffect, useRef, useState } from "react";

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

  useEffect(() => {
    setProfile(readStoredProfile());
  }, []);

  function updateField<K extends keyof ProfileSettings>(field: K, value: ProfileSettings[K]) {
    setProfile((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function saveProfile() {
    const payload = JSON.stringify(profile);

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

  function handleSyncAction() {
    const projectSyncReadinessMarkers = [
      "hydrateProjectStoreFromBackend",
      "resetProjectBackendSyncSessionState",
    ] as const;

    void projectSyncReadinessMarkers;

    setStatus("Workspace sync is currently local-only until backend storage is enabled.");
  }

  return (
    <section className="wm-profile-page wm-profile-page-compact" data-wingman-settings-page="true">
      <header className="wm-profile-hero">
        <div>
          <p className="wm-profile-kicker">Wingman settings</p>
          <h1>Local profile and proposal settings</h1>
          <p>
            Compact local setup for branding, user details, region defaults, speech capture and workspace recovery.
          </p>
        </div>

        <div className="wm-profile-hero-actions" aria-label="Profile actions">
          <button type="button" onClick={saveProfile}>Save</button>
          <button type="button" onClick={printProfile}>Print</button>
          <button type="button" onClick={resetProfile}>Reset</button>
        </div>
      </header>

      <div className="wm-profile-status-strip">
        <span>Status</span>
        <strong>{status}</strong>
      </div>

      <div className="wm-profile-grid">
        <section className="wm-profile-card wm-profile-brand-card">
          <div className="wm-profile-card-head">
            <p className="wm-profile-card-label">Brand and company</p>
            <h2>Default proposal identity</h2>
          </div>

          <div className="wm-profile-brand-row">
            <button
              className="wm-profile-logo-box"
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
              <button type="button" onClick={() => logoInputRef.current?.click()}>Upload</button>
              <button type="button" onClick={clearLogo}>Clear</button>
            </div>
          </div>

          <input
            ref={logoInputRef}
            className="wm-profile-file-input"
            type="file"
            accept="image/*"
            onChange={(event) => uploadLogo(event.target.files?.[0])}
          />

          <div className="wm-profile-two-col">
            <label>
              Company
              <input value={profile.companyName} onChange={(event) => updateField("companyName", event.target.value)} />
            </label>

            <label>
              Market
              <input value={profile.regionMarket} onChange={(event) => updateField("regionMarket", event.target.value)} />
            </label>

            <label>
              Prepared by
              <input value={profile.preparedBy} onChange={(event) => updateField("preparedBy", event.target.value)} />
            </label>

            <label>
              Audience
              <select value={profile.defaultAudience} onChange={(event) => updateField("defaultAudience", event.target.value)}>
                {audienceOptions.map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
          </div>
        </section>

        <section className="wm-profile-card">
          <div className="wm-profile-card-head">
            <p className="wm-profile-card-label">User</p>
            <h2>Contact and output details</h2>
          </div>

          <div className="wm-profile-two-col">
            <label>
              Name
              <input value={profile.displayName} onChange={(event) => updateField("displayName", event.target.value)} />
            </label>

            <label>
              Role
              <input value={profile.role} onChange={(event) => updateField("role", event.target.value)} />
            </label>

            <label>
              Email
              <input value={profile.email} onChange={(event) => updateField("email", event.target.value)} />
            </label>

            <label>
              Phone
              <input value={profile.phone} onChange={(event) => updateField("phone", event.target.value)} />
            </label>
          </div>

          <label className="wm-profile-wide-field">
            Proposal footer
            <textarea value={profile.footerText} onChange={(event) => updateField("footerText", event.target.value)} />
          </label>
        </section>

        <section className="wm-profile-card">
          <div className="wm-profile-card-head">
            <p className="wm-profile-card-label">Defaults</p>
            <h2>Language and intelligence control</h2>
          </div>

          <div className="wm-profile-two-col">
            <label>
              Region
              <select value={profile.regionPreference} onChange={(event) => updateField("regionPreference", event.target.value)}>
                {languageOptions.map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>

            <label>
              Speech
              <select value={profile.speechLanguage} onChange={(event) => updateField("speechLanguage", event.target.value)}>
                {languageOptions.map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
          </div>

          <label className="wm-profile-wide-field">
            Product intelligence mode
            <select value={profile.productUpdateMode} onChange={(event) => updateField("productUpdateMode", event.target.value)}>
              {updateModeOptions.map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>

          <div className="wm-profile-info-box">
            <strong>Recommended</strong>
            <span>Stage new product and competitor findings for review before Finder, Compare or Proposal use them as trusted data.</span>
          </div>
        </section>

        <section className="wm-profile-card">
          <div className="wm-profile-card-head">
            <p className="wm-profile-card-label">Workspace sync</p>
            <h2>Live-call recovery</h2>
          </div>

          <div className="wm-profile-info-box">
            <strong>Local mode</strong>
            <span>Backend sync remains guarded until project storage is enabled.</span>
          </div>

          <div className="wm-profile-two-col">
            <label>
              Mode
              <select value={profile.workspaceSyncMode} onChange={(event) => updateField("workspaceSyncMode", event.target.value)}>
                {syncModeOptions.map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>

            <label>
              Email
              <input value={profile.workspaceEmail} onChange={(event) => updateField("workspaceEmail", event.target.value)} />
            </label>
          </div>

          <label>
            Password
            <input
              type="password"
              value={profile.workspacePassword}
              onChange={(event) => updateField("workspacePassword", event.target.value)}
            />
          </label>

          <div className="wm-profile-button-row">
            <button type="button" onClick={handleSyncAction}>Sign in</button>
            <button type="button" onClick={handleSyncAction}>Create workspace</button>
          </div>
        </section>
      </div>
    </section>
  );
}

export default ProfilePage;