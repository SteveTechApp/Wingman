import * as React from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { resolveDeploymentWorkspaceInvitation } from "@/app/api/wingmanDeploymentClient";
import { useAuth } from "@/context";

export default function InviteAcceptancePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { acceptInvitation, status, user, signOut } = useAuth();
  const token = searchParams.get("token") ?? "";
  const [name, setName] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [invitation, setInvitation] = React.useState<Awaited<ReturnType<typeof resolveDeploymentWorkspaceInvitation>>["invitation"] | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function loadInvitation() {
      if (!token) {
        setLoading(false);
        setError("Invitation token missing.");
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const response = await resolveDeploymentWorkspaceInvitation(token);
        if (!cancelled) {
          setInvitation(response.invitation);
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : "Unable to load invitation.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadInvitation();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function acceptInvite() {
    if (!token) return;
    setSaving(true);
    setError(null);
    try {
      await acceptInvitation({
        token,
        name: name.trim() || undefined,
        password: password.trim() || undefined,
      });
      navigate("/app/dashboard", { replace: true });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to accept invitation.");
    } finally {
      setSaving(false);
    }
  }

  const signedInWithDifferentEmail = Boolean(
    invitation &&
    user &&
    user.email &&
    user.email !== invitation.email,
  );

  return (
    <div className="wm-page wm-invite-page">
      <div className="wm-invite-page__inner">
        <div className="wm-card wm-card-pad" style={{ display: "grid", gap: 12 }}>
          <div className="wm-h2">Join Workspace</div>
          {loading ? <div className="wm-p">Loading invitation...</div> : null}
          {!loading && invitation ? (
            <>
              <div className="wm-p">
                Join <strong>{invitation.workspaceName}</strong> as <strong>{invitation.role}</strong>.
              </div>
              <div className="wm-body-sm" style={{ opacity: 0.78 }}>
                Invited email: {invitation.email}
              </div>
            </>
          ) : null}

          {signedInWithDifferentEmail ? (
            <>
              <div className="wm-body-sm" style={{ color: "#ff9da5" }}>
                You are signed in as {user?.email}. Sign out and use the invited account instead.
              </div>
              <button type="button" className="wm-btn wm-btn-primary" onClick={() => { void signOut(); }}>
                Sign Out
              </button>
            </>
          ) : null}

          {!loading && invitation && !signedInWithDifferentEmail ? (
            <>
              {status === "authenticated" && user?.email === invitation.email ? (
                <button type="button" className="wm-btn wm-btn-primary" onClick={() => { void acceptInvite(); }} disabled={saving}>
                  {saving ? "Joining..." : "Accept Invitation"}
                </button>
              ) : (
                <>
                  <label className="wm-form-field">
                    <span className="wm-form-label">Name</span>
                    <input className="wm-form-input" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" />
                  </label>

                  <label className="wm-form-field">
                    <span className="wm-form-label">Password</span>
                    <input
                      className="wm-form-input"
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Use your existing account password, or create one"
                    />
                  </label>

                  <button type="button" className="wm-btn wm-btn-primary" onClick={() => { void acceptInvite(); }} disabled={saving || !password.trim()}>
                    {saving ? "Joining..." : "Join Workspace"}
                  </button>
                </>
              )}
            </>
          ) : null}

          {error ? <div className="wm-body-sm" style={{ color: "#ff9da5" }}>{error}</div> : null}

          <div className="wm-body-sm" style={{ opacity: 0.78 }}>
            Already part of the workspace? <Link to="/login">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
