import * as React from "react";
import {
  createDeploymentWorkspaceInvitation,
  fetchDeploymentWorkspaceInvitations,
  fetchDeploymentWorkspaceMembers,
  getPersistedDeploymentSession,
  updateDeploymentWorkspaceMemberRole,
  updateDeploymentWorkspaceSettings,
  type DeploymentWorkspaceInvitation,
  type DeploymentWorkspaceMember,
  type DeploymentWorkspaceRole,
} from "@/app/api/wingmanDeploymentClient";
import { useAuth } from "@/context";

const INVITE_ROLES: Array<Exclude<DeploymentWorkspaceRole, "owner">> = ["admin", "sales", "customer"];

export default function WorkspaceAdminPage() {
  const { mode, workspace, workspaceRole, permissions, refreshSession, user } = useAuth();
  const [workspaceName, setWorkspaceName] = React.useState(workspace?.name ?? "");
  const [workspaceTier, setWorkspaceTier] = React.useState(workspace?.tier ?? "pilot");
  const [inviteEmail, setInviteEmail] = React.useState("");
  const [inviteRole, setInviteRole] = React.useState<Exclude<DeploymentWorkspaceRole, "owner">>("customer");
  const [members, setMembers] = React.useState<DeploymentWorkspaceMember[]>([]);
  const [invitations, setInvitations] = React.useState<DeploymentWorkspaceInvitation[]>([]);
  const [lastInviteUrl, setLastInviteUrl] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [savingSettings, setSavingSettings] = React.useState(false);
  const [creatingInvite, setCreatingInvite] = React.useState(false);
  const [updatingMemberId, setUpdatingMemberId] = React.useState<string | null>(null);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setWorkspaceName(workspace?.name ?? "");
    setWorkspaceTier(workspace?.tier ?? "pilot");
  }, [workspace?.name, workspace?.tier]);

  const loadWorkspaceData = React.useCallback(async () => {
    if (mode !== "backend" || !permissions.canManageWorkspace) {
      setMembers([]);
      setInvitations([]);
      setLoading(false);
      return;
    }

    const session = getPersistedDeploymentSession();
    if (!session || session.mode !== "backend") {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [membersResponse, invitationsResponse] = await Promise.all([
        fetchDeploymentWorkspaceMembers(session),
        fetchDeploymentWorkspaceInvitations(session),
      ]);
      setMembers(membersResponse.members);
      setInvitations(invitationsResponse.invitations);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to load workspace administration data.");
    } finally {
      setLoading(false);
    }
  }, [mode, permissions.canManageWorkspace]);

  React.useEffect(() => {
    void loadWorkspaceData();
  }, [loadWorkspaceData]);

  async function saveSettings() {
    const session = getPersistedDeploymentSession();
    if (!session || session.mode !== "backend") return;
    setSavingSettings(true);
    setStatusMessage(null);
    setError(null);
    try {
      await updateDeploymentWorkspaceSettings(session, {
        name: workspaceName.trim(),
        tier: workspaceTier.trim() || "pilot",
      });
      await refreshSession();
      setStatusMessage("Workspace settings saved.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to save workspace settings.");
    } finally {
      setSavingSettings(false);
    }
  }

  async function createInvite() {
    const session = getPersistedDeploymentSession();
    if (!session || session.mode !== "backend") return;
    setCreatingInvite(true);
    setStatusMessage(null);
    setError(null);
    try {
      const response = await createDeploymentWorkspaceInvitation(session, {
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      setInviteEmail("");
      setInvitations((current) => [response.invitation, ...current.filter((item) => item.id !== response.invitation.id)]);
      setLastInviteUrl(response.invitation.acceptUrl ?? "");
      setStatusMessage(`Invitation created for ${response.invitation.email}.`);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to create this invitation.");
    } finally {
      setCreatingInvite(false);
    }
  }

  async function updateMemberRole(member: DeploymentWorkspaceMember, role: Exclude<DeploymentWorkspaceRole, "owner">) {
    const session = getPersistedDeploymentSession();
    if (!session || session.mode !== "backend") return;
    setUpdatingMemberId(member.userId);
    setStatusMessage(null);
    setError(null);
    try {
      const response = await updateDeploymentWorkspaceMemberRole(session, member.userId, { role });
      setMembers((current) => current.map((item) => item.userId === member.userId ? response.member : item));
      setStatusMessage(`${member.email} is now ${role}.`);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to update this member role.");
    } finally {
      setUpdatingMemberId(null);
    }
  }

  async function copyInviteLink() {
    if (!lastInviteUrl || !navigator.clipboard) return;
    await navigator.clipboard.writeText(lastInviteUrl);
    setStatusMessage("Invite link copied.");
  }

  if (mode !== "backend") {
    return (
      <div className="wm-page wm-workspace-admin-page">
        <section className="wm-hero">
          <div className="wm-title-xl">Workspace Settings</div>
          <div className="wm-body-sm wm-page-subtitle">
            Sign into a persisted backend workspace to manage invitations, member roles, and workspace settings.
          </div>
        </section>
      </div>
    );
  }

  if (!permissions.canManageWorkspace) {
    return (
      <div className="wm-page wm-workspace-admin-page">
        <section className="wm-hero">
          <div className="wm-title-xl">Workspace Settings</div>
          <div className="wm-body-sm wm-page-subtitle">
            Workspace administration is limited to admin roles. Your current workspace role is {workspaceRole ?? "unknown"}.
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="wm-page wm-workspace-admin-page">
      <section className="wm-hero">
        <div className="wm-page-hero-row">
          <div>
            <div className="wm-kicker">Workspace Admin</div>
            <div className="wm-title-xl">{workspace?.name ?? "Workspace"}</div>
            <div className="wm-body-sm wm-page-subtitle">
              Manage member roles, customer invitations, and the workspace identity for this deployment.
            </div>
          </div>

          <div className="wm-actions-row">
            <div className="wm-chip">Role: {workspaceRole ?? "admin"}</div>
            <div className="wm-chip">Members: {members.length || workspace?.memberCount || 0}</div>
          </div>
        </div>
      </section>

      <section className="wm-section">
        <div className="wm-section__head">
          <div className="wm-section__titles">
            <h2>Workspace Settings</h2>
            <p>Keep the workspace label and commercial tier aligned with the customer-facing environment.</p>
          </div>
        </div>

        <div className="wm-form-grid">
          <label className="wm-form-field">
            <span className="wm-form-label">Workspace name</span>
            <input className="wm-form-input" value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} />
          </label>

          <label className="wm-form-field">
            <span className="wm-form-label">Tier</span>
            <input className="wm-form-input" value={workspaceTier} onChange={(event) => setWorkspaceTier(event.target.value)} />
          </label>
        </div>

        <div className="wm-actions-row" style={{ marginTop: 12 }}>
          <button type="button" className="wm-btn wm-btn-primary" onClick={saveSettings} disabled={savingSettings || !workspaceName.trim()}>
            {savingSettings ? "Saving..." : "Save Workspace Settings"}
          </button>
        </div>
      </section>

      <div className="wm-split-columns">
        <section className="wm-section wm-section--compact">
          <div className="wm-section__head">
            <div className="wm-section__titles">
              <h2>Invite Members</h2>
              <p>Create role-scoped invites for sales, admin, or customer collaborators.</p>
            </div>
          </div>

          <div className="wm-form-grid">
            <label className="wm-form-field wm-form-field--full">
              <span className="wm-form-label">Email</span>
              <input className="wm-form-input" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="name@company.com" />
            </label>

            <label className="wm-form-field">
              <span className="wm-form-label">Role</span>
              <select className="wm-form-input" value={inviteRole} onChange={(event) => setInviteRole(event.target.value as Exclude<DeploymentWorkspaceRole, "owner">)}>
                {INVITE_ROLES.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="wm-actions-row" style={{ marginTop: 12 }}>
            <button type="button" className="wm-btn wm-btn-primary" onClick={createInvite} disabled={creatingInvite || !inviteEmail.trim()}>
              {creatingInvite ? "Creating..." : "Create Invitation"}
            </button>
            {lastInviteUrl ? (
              <button type="button" className="wm-btn" onClick={() => { void copyInviteLink(); }}>
                Copy Latest Invite Link
              </button>
            ) : null}
          </div>
          {lastInviteUrl ? <div className="wm-body-sm" style={{ wordBreak: "break-all" }}>{lastInviteUrl}</div> : null}
        </section>

        <section className="wm-section wm-section--compact">
          <div className="wm-section__head">
            <div className="wm-section__titles">
              <h2>Status</h2>
              <p>Operational feedback for workspace administration.</p>
            </div>
          </div>

          <div className="wm-summary-list">
            <div className="wm-summary-row"><span>Current user</span><strong>{user?.email ?? "-"}</strong></div>
            <div className="wm-summary-row"><span>Workspace role</span><strong>{workspaceRole ?? "-"}</strong></div>
            <div className="wm-summary-row"><span>Pending invitations</span><strong>{invitations.filter((item) => item.status === "pending").length}</strong></div>
          </div>
          {statusMessage ? <div className="wm-body-sm" style={{ color: "#baf5d0", marginTop: 12 }}>{statusMessage}</div> : null}
          {error ? <div className="wm-body-sm" style={{ color: "#ff9da5", marginTop: 12 }}>{error}</div> : null}
        </section>
      </div>

      <div className="wm-split-columns">
        <section className="wm-section wm-section--compact">
          <div className="wm-section__head">
            <div className="wm-section__titles">
              <h2>Members</h2>
              <p>Workspace-level permissions are enforced from these role assignments.</p>
            </div>
          </div>

          {loading ? (
            <div className="wm-body">Loading members...</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {members.map((member) => {
                const isOwner = member.role === "owner";
                const isSelf = member.userId === user?.id;
                return (
                  <article key={member.userId} className="wm-work-card">
                    <div className="wm-summary-row"><span>Name</span><strong>{member.name}</strong></div>
                    <div className="wm-summary-row"><span>Email</span><strong>{member.email}</strong></div>
                    <div className="wm-summary-row"><span>Joined</span><strong>{new Date(member.joinedAt).toLocaleString()}</strong></div>
                    <div className="wm-summary-row"><span>Last seen</span><strong>{member.lastSeenAt ? new Date(member.lastSeenAt).toLocaleString() : "-"}</strong></div>
                    <div className="wm-actions-row">
                      <select
                        className="wm-form-input"
                        value={member.role === "owner" ? "sales" : member.role}
                        disabled={isOwner || isSelf || updatingMemberId === member.userId}
                        onChange={(event) => {
                          const nextRole = event.target.value as Exclude<DeploymentWorkspaceRole, "owner">;
                          void updateMemberRole(member, nextRole);
                        }}
                      >
                        {INVITE_ROLES.map((role) => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="wm-section wm-section--compact">
          <div className="wm-section__head">
            <div className="wm-section__titles">
              <h2>Invitations</h2>
              <p>Track pending and accepted workspace joins without exposing the raw tokens again.</p>
            </div>
          </div>

          {loading ? (
            <div className="wm-body">Loading invitations...</div>
          ) : invitations.length === 0 ? (
            <div className="wm-body">No invitations created yet.</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {invitations.map((invitation) => (
                <article key={invitation.id} className="wm-work-card">
                  <div className="wm-summary-row"><span>Email</span><strong>{invitation.email}</strong></div>
                  <div className="wm-summary-row"><span>Role</span><strong>{invitation.role}</strong></div>
                  <div className="wm-summary-row"><span>Status</span><strong>{invitation.status}</strong></div>
                  <div className="wm-summary-row"><span>Created</span><strong>{new Date(invitation.createdAt).toLocaleString()}</strong></div>
                  <div className="wm-summary-row"><span>Accepted</span><strong>{invitation.acceptedAt ? new Date(invitation.acceptedAt).toLocaleString() : "-"}</strong></div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
