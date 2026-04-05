import * as React from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { resolveDeploymentWorkspaceInvitation } from "@/app/api/wingmanDeploymentClient";
import { useAuth } from "@/context/AuthContext";
import "@/styles/wm-auth-public.css";

export default function InviteAcceptancePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { acceptInvitation, status, user, signOut } = useAuth();

  const token = searchParams.get("token") ?? "";

  const [name, setName] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [invitation, setInvitation] = React.useState<any>(null);

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

      try {
        const res = await resolveDeploymentWorkspaceInvitation(token);
        if (!cancelled) setInvitation(res.invitation);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load invitation.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadInvitation();
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to accept invitation.");
    } finally {
      setSaving(false);
    }
  }

  const wrongUser =
    invitation &&
    user &&
    user.email &&
    user.email !== invitation.email;

  return (
    <div className="wm-auth-shell">
      <div className="wm-auth-shell__root">
        <div className="wm-auth-shell__center">
          <div className="wm-auth-card">
            <div className="wm-auth-card__head">
              <div className="wm-auth-card__eyebrow">
                <span className="wm-auth-card__dot" />
                <span>Workspace Invitation</span>
              </div>

              <h1 className="wm-auth-card__title">Join workspace</h1>

              {loading ? (
                <p className="wm-auth-card__copy">Loading invitation…</p>
              ) : invitation ? (
                <p className="wm-auth-card__copy">
                  Join <strong>{invitation.workspaceName}</strong> as{" "}
                  <strong>{invitation.role}</strong>
                </p>
              ) : null}
            </div>

            {/* Wrong user */}
            {wrongUser ? (
              <>
                <div className="wm-auth-error">
                  You are signed in as {user?.email}. Use the invited account.
                </div>

                <button
                  type="button"
                  className="wm-auth-btn wm-auth-btn--primary"
                  onClick={() => void signOut()}
                >
                  Sign out
                </button>
              </>
            ) : null}

            {/* Accept flow */}
            {!loading && invitation && !wrongUser ? (
              <form
                className="wm-auth-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  void acceptInvite();
                }}
              >
                {status === "authenticated" &&
                user?.email === invitation.email ? (
                  <button
                    type="submit"
                    className="wm-auth-btn wm-auth-btn--primary"
                    disabled={saving}
                  >
                    {saving ? "Joining…" : "Accept invitation"}
                  </button>
                ) : (
                  <>
                    <div className="wm-auth-grid">
                      <div className="wm-auth-field">
                        <label className="wm-auth-label">Name</label>
                        <input
                          className="wm-auth-input"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Your name"
                        />
                      </div>

                      <div className="wm-auth-field">
                        <label className="wm-auth-label">Password</label>
                        <input
                          className="wm-auth-input"
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter or create password"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="wm-auth-btn wm-auth-btn--primary"
                      disabled={saving || !password.trim()}
                    >
                      {saving ? "Joining…" : "Join workspace"}
                    </button>
                  </>
                )}
              </form>
            ) : null}

            {error ? <div className="wm-auth-error">{error}</div> : null}

            <div className="wm-auth-meta">
              Already a member? <Link to="/login">Sign in</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}