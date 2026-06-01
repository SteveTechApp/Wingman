import { useState, type ChangeEvent } from "react";
import { Save } from "lucide-react";
import { WingmanLanguageSelector } from "../components/WingmanLanguageSelector";
import { setStoredWingmanCaptureLanguage, setStoredWingmanLanguage, type WingmanLanguageId } from "../data/wingmanLanguage";
import { useWingmanProfile } from "../data/wingmanProfile";

export function ProfilePage() {
  const { profile, updateProfile, resetProfile } = useWingmanProfile();
  const [saveMessage, setSaveMessage] = useState("");

  const saveProfile = () => {
    updateProfile({});
    setSaveMessage(`${profile.userName.trim() || profile.reportPreparedBy.trim() || "Wingman"} saved for the welcome header.`);
  };

  const resetLocalProfile = () => {
    resetProfile();
    setSaveMessage("");
  };

  const handleLogoUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      updateProfile({ companyLogoDataUrl: String(reader.result || "") });
      setSaveMessage("");
    };

    reader.readAsDataURL(file);
  };

  const updateUiLanguage = (value: WingmanLanguageId) => {
    setStoredWingmanLanguage(value);
    updateProfile({ uiLanguage: value });
    setSaveMessage("");
  };

  const updateCaptureLanguage = (value: WingmanLanguageId) => {
    setStoredWingmanCaptureLanguage(value);
    updateProfile({ captureLanguage: value });
    setSaveMessage("");
  };

  const patchProfile = (patch: Parameters<typeof updateProfile>[0]) => {
    updateProfile(patch);
    setSaveMessage("");
  };

  return (
    <main className="wm-profile-page">
      <section className="wm-profile-hero">
        <div>
          <p>Wingman admin</p>
          <h1>Local profile and proposal settings</h1>
          <span>
            Store company details, region preference, speech capture settings and report branding locally. This becomes the foundation for branded proposals, reports and intelligence review workflows.
          </span>
        </div>
      </section>

      <section className="wm-profile-grid">
        <article className="wm-profile-card wm-profile-logo-card">
          <div>
            <p>Branding</p>
            <h2>Company logo</h2>
            <span>Used later for proposals, reports and customer-facing exports.</span>
          </div>

          <div className="wm-profile-logo-preview">
            {profile.companyLogoDataUrl ? (
              <img src={profile.companyLogoDataUrl} alt="Uploaded company logo" />
            ) : (
              <strong>No logo uploaded</strong>
            )}
          </div>

          <label className="wm-profile-file-button">
            Upload logo
            <input type="file" accept="image/*" onChange={handleLogoUpload} />
          </label>

          {profile.companyLogoDataUrl ? (
            <button type="button" className="wm-profile-secondary-button" onClick={() => patchProfile({ companyLogoDataUrl: "" })}>
              Remove logo
            </button>
          ) : null}
        </article>

        <article className="wm-profile-card">
          <p>Company</p>
          <h2>Default details</h2>

          <div className="wm-profile-form-grid">
            <label>
              Company name
              <input value={profile.companyName} onChange={(event) => patchProfile({ companyName: event.target.value })} />
            </label>

            <label>
              Region / market
              <input value={profile.region} onChange={(event) => patchProfile({ region: event.target.value })} />
            </label>

            <label>
              Prepared by
              <input value={profile.reportPreparedBy} onChange={(event) => patchProfile({ reportPreparedBy: event.target.value })} />
            </label>

            <label>
              Default audience
              <select value={profile.defaultAudience} onChange={(event) => patchProfile({ defaultAudience: event.target.value as typeof profile.defaultAudience })}>
                <option value="endUser">End user</option>
                <option value="dealer">Dealer / reseller</option>
                <option value="consultant">Consultant / designer</option>
                <option value="internal">Internal sales / pre-sales</option>
              </select>
            </label>
          </div>
        </article>

        <article className="wm-profile-card">
          <p>User</p>
          <h2>Contact details</h2>

          <div className="wm-profile-form-grid">
            <label>
              Display name
              <input
                value={profile.userName}
                onChange={(event) => patchProfile({ userName: event.target.value })}
                placeholder="e.g. Steve Goodwin"
              />
            </label>

            <label>
              Role
              <input value={profile.userRole} onChange={(event) => patchProfile({ userRole: event.target.value })} />
            </label>

            <label>
              Email
              <input value={profile.email} onChange={(event) => patchProfile({ email: event.target.value })} />
            </label>

            <label>
              Phone
              <input value={profile.phone} onChange={(event) => patchProfile({ phone: event.target.value })} />
            </label>
          </div>
        </article>

        <article className="wm-profile-card">
          <p>Region and capture</p>
          <h2>Market and speech settings</h2>

          <div className="wm-profile-language-grid">
            <WingmanLanguageSelector
              label="Region / market preference"
              value={profile.uiLanguage}
              onChange={updateUiLanguage}
            />

            <WingmanLanguageSelector
              label="Speech capture language"
              mode="capture"
              value={profile.captureLanguage}
              onChange={updateCaptureLanguage}
            />
          </div>

          <span className="wm-profile-note">
            Wingman is currently English-first. Region is stored for market context and future localisation. Speech capture controls browser dictation during customer call capture.
          </span>
        </article>

        <article className="wm-profile-card">
          <p>Proposal wording</p>
          <h2>Default footer / disclaimer</h2>

          <label>
            Footer text
            <textarea value={profile.proposalFooter} onChange={(event) => patchProfile({ proposalFooter: event.target.value })} />
          </label>
        </article>

        <article className="wm-profile-card">
          <p>Product intelligence</p>
          <h2>Update governance</h2>

          <label>
            Intelligence update mode
            <select value={profile.intelligenceMode} onChange={(event) => patchProfile({ intelligenceMode: event.target.value as typeof profile.intelligenceMode })}>
              <option value="manual">Manual only</option>
              <option value="reviewed">Auto-draft, require approval</option>
              <option value="autoDraft">Auto-draft intelligence records</option>
            </select>
          </label>

          <div className="wm-profile-info-list">
            <strong>Recommended setting: Auto-draft, require approval</strong>
            <span>New WyreStorm or competitor findings should be staged for review before Finder, Compare or Proposal uses them as trusted data.</span>
          </div>
        </article>
      </section>

      <section className="wm-profile-actions">
        {saveMessage ? <span className="wm-profile-save-status" role="status">{saveMessage}</span> : null}
        <button type="button" className="wm-profile-primary-button" onClick={saveProfile}>
          <Save className="h-4 w-4" />
          <span>Save profile</span>
        </button>
        <button type="button" onClick={() => window.print()}>Print profile</button>
        <button type="button" onClick={resetLocalProfile}>Reset local profile</button>
      </section>
    </main>
  );
}

export default ProfilePage;
