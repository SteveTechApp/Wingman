import type { ChangeEvent } from "react";
import { WingmanLanguageSelector } from "../components/WingmanLanguageSelector";
import { setStoredWingmanCaptureLanguage, setStoredWingmanLanguage, type WingmanLanguageId } from "../data/wingmanLanguage";
import { useWingmanProfile } from "../data/wingmanProfile";

export function ProfilePage() {
  const { profile, updateProfile, resetProfile } = useWingmanProfile();

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
    };

    reader.readAsDataURL(file);
  };

  const updateUiLanguage = (value: WingmanLanguageId) => {
    setStoredWingmanLanguage(value);
    updateProfile({ uiLanguage: value });
  };

  const updateCaptureLanguage = (value: WingmanLanguageId) => {
    setStoredWingmanCaptureLanguage(value);
    updateProfile({ captureLanguage: value });
  };

  return (
    <main className="wm-profile-page">
      <section className="wm-profile-hero">
        <div>
          <p>Wingman admin</p>
          <h1>Local profile and proposal settings</h1>
          <span>
            Store company details, language preferences and report branding locally. This becomes the foundation for branded proposals, reports and intelligence review workflows.
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
            <button type="button" className="wm-profile-secondary-button" onClick={() => updateProfile({ companyLogoDataUrl: "" })}>
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
              <input value={profile.companyName} onChange={(event) => updateProfile({ companyName: event.target.value })} />
            </label>

            <label>
              Region / market
              <input value={profile.region} onChange={(event) => updateProfile({ region: event.target.value })} />
            </label>

            <label>
              Prepared by
              <input
                value={profile.reportPreparedBy}
                onChange={(event) => updateProfile({ reportPreparedBy: event.target.value })}
                placeholder="Used if no display name is set"
              />
            </label>

            <label>
              Default audience
              <select value={profile.defaultAudience} onChange={(event) => updateProfile({ defaultAudience: event.target.value as typeof profile.defaultAudience })}>
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
          <span className="wm-profile-note">Your display name is used in the top bar greeting and proposal context.</span>

          <div className="wm-profile-form-grid">
            <label>
              Display name
              <input
                value={profile.userName}
                onChange={(event) => updateProfile({ userName: event.target.value })}
                placeholder="e.g. Steve Goodwin"
              />
            </label>

            <label>
              Role
              <input value={profile.userRole} onChange={(event) => updateProfile({ userRole: event.target.value })} />
            </label>

            <label>
              Email
              <input value={profile.email} onChange={(event) => updateProfile({ email: event.target.value })} />
            </label>

            <label>
              Phone
              <input value={profile.phone} onChange={(event) => updateProfile({ phone: event.target.value })} />
            </label>
          </div>
        </article>

        <article className="wm-profile-card">
          <p>Language</p>
          <h2>Region and speech capture</h2>

          <div className="wm-profile-language-grid">
            <WingmanLanguageSelector
              label="Wingman region / market"
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
            Region affects visible top-bar wording and future market preference. Speech capture controls browser dictation and recognition during customer feedback capture. This is not full app translation yet.
          </span>
        </article>

        <article className="wm-profile-card">
          <p>Proposal wording</p>
          <h2>Default footer / disclaimer</h2>

          <label>
            Footer text
            <textarea value={profile.proposalFooter} onChange={(event) => updateProfile({ proposalFooter: event.target.value })} />
          </label>
        </article>

        <article className="wm-profile-card">
          <p>Product intelligence</p>
          <h2>Update governance</h2>

          <label>
            Intelligence update mode
            <select value={profile.intelligenceMode} onChange={(event) => updateProfile({ intelligenceMode: event.target.value as typeof profile.intelligenceMode })}>
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
        <article className="wm-profile-card wm-profile-actions-card">
          <p>Profile actions</p>
          <h2>Manage local settings</h2>
          <span>Print the profile or reset locally stored settings for this browser.</span>

          <div className="wm-profile-action-row">
            <button type="button" onClick={() => window.print()}>Print profile</button>
            <button type="button" onClick={resetProfile}>Reset local profile</button>
          </div>
        </article>
</section>
</main>
  );
}

export default ProfilePage;