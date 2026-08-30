import {
  ArrowRight,
  CheckCircle2,
  MoreVertical,
  Plus,
  Target,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";
import { HubCard, routeAction } from "./NavigationHubPages";
import { StatusChip } from "../components/StatusChip";
import { GuidedDashboard } from "../components/GuidedDashboard";
import { useUiMode } from "../data/uiMode";
import {
  confirmGovernedProfile,
  fetchApprovedCompetitorDecisions,
  getWingmanSession,
  type WingmanWorkspaceSession,
} from "../api/wingmanApi";
import { governedDecisionLabel } from "../lib/governedCompareRuntime";
import { discoveryResumeInfo, discoveryResumeUrl } from "../lib/discoveryResume";
import type { CompetitorMatchDecision } from "../lib/competitorMatchDecisionLedger";
import {
  governedConfirmationBacklog,
  specCriticalFieldLabel,
  type AwaitingProfile,
  type SpecCriticalField,
  type VerifiedProfile,
} from "../lib/governedConfirmationBacklog";
import { governedCoverageSummary } from "../lib/governedCoverage";
import {
  setActiveProjectId,
  useProjectStore,
  type ProjectStage,
  type StoredProject,
} from "../data/projectStore";
import type { StatusVariant } from "../types";

const primaryActions = [
  routeAction(
    "discovery",
    "Start Discovery",
    "Answer a few questions and get a clear product direction.",
    "GUIDED REQUIREMENT CAPTURE",
    { accent: "aqua", linkLabel: "Start discovery", art: "discovery" },
  ),
  routeAction(
    "ingest",
    "Decode Request",
    "Turn customer emails, RFQs, BOMs, scopes and rough notes into clear requirements and next actions.",
    "REQUEST DECODER",
    { accent: "violet", linkLabel: "Decode request", art: "decode" },
  ),
  routeAction(
    "compare",
    "Compare Products",
    "Check a competitor product against the closest WyreStorm fit.",
    "COMPETITOR PRODUCT MATCH",
    { accent: "amber", linkLabel: "Compare products", art: "competitor" },
  ),
  routeAction(
    "templates",
    "Browse Templates",
    "Start from a ready-made room or application design.",
    "ROOM & APPLICATION TEMPLATES",
    { accent: "violet", linkLabel: "Browse templates", art: "templates" },
  ),
  routeAction(
    "projects",
    "My Projects",
    "Continue discovery, comparison, design and proposal work.",
    "ACTIVE PROJECT WORKSPACE",
    { accent: "green", linkLabel: "Open projects", art: "projects" },
  ),
];

type DashboardProject = {
  id: string;
  name: string;
  scope?: string;
  stage: ProjectStage;
  owner: string;
  status: StatusVariant;
  updated: string;
  resumeTo: string;
  discoveryBrief?: StoredProject["discoveryBrief"];
  proposal?: StoredProject["proposal"];
  compareRuns?: StoredProject["compareRuns"];
  recommendationEvidence?: StoredProject["recommendationEvidence"];
  workflow?: StoredProject["workflow"];
};

type DashboardProgress = {
  label: string;
  value: number;
};

const fallbackProjects: DashboardProject[] = [
  {
    id: "northbridge-meeting-room-refresh",
    name: "Northbridge Meeting Room Refresh",
    scope: "Discovery / Steve",
    stage: "Discovery",
    owner: "Steve",
    status: "recommended",
    updated: "2 hours ago",
    resumeTo: routeCatalogByKey.discovery.path,
  },
  {
    id: "harbour-retail-signage-rollout",
    name: "Harbour Retail Signage Rollout",
    scope: "Competitor Compare / Channel Sales",
    stage: "Competitor Compare",
    owner: "Channel Sales",
    status: "alternative",
    updated: "Today",
    resumeTo: routeCatalogByKey.compare.path,
  },
  {
    id: "westbrook-classroom-standard",
    name: "Westbrook Classroom Standard",
    scope: "Proposal Builder / Pre-sales",
    stage: "Proposal Builder",
    owner: "Pre-sales",
    status: "recommended",
    updated: "Yesterday",
    resumeTo: routeCatalogByKey.responsePack.path,
  },
];

const STAGE_NEXT_STEP: Partial<Record<ProjectStage, string>> = {
  Discovery: "Continue discovery",
  "Competitor Compare": "Review competitor match",
  "Proposal Builder": "Finish proposal and BOM",
  Recommendations: "Review matched products",
  Templates: "Adapt the room template",
  Support: "Continue the support review",
};

const SHOW_HOME_GOVERNANCE = false;

const STATUS_LABEL: Record<StatusVariant, string> = {
  recommended: "On track",
  alternative: "In progress",
  caution: "Needs review",
};

function nextStepFor(stage: ProjectStage) {
  return STAGE_NEXT_STEP[stage] ?? "Continue project";
}

function projectScopeLine(project: { stage: ProjectStage; owner: string; scope?: string }) {
  return project.scope ?? `${project.stage} / ${project.owner}`;
}

function percentValue(value: unknown) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return null;
  }

  return Math.min(100, Math.max(0, Math.round(numeric)));
}

function projectProgress(project: DashboardProject): DashboardProgress | null {
  const capturedPercent = percentValue(project.discoveryBrief?.capturedPercent);

  if (capturedPercent !== null) {
    return { label: "Discovery", value: capturedPercent };
  }

  const readinessScore = percentValue(project.proposal?.readinessScore);

  if (readinessScore !== null) {
    return { label: "Proposal", value: readinessScore };
  }

  const matchScore = percentValue(
    project.compareRuns?.find((run) => Number.isFinite(Number(run.matchScore)))?.matchScore,
  );

  if (matchScore !== null) {
    return { label: "Compare", value: matchScore };
  }

  return null;
}

function greetingForCurrentTime() {
  const hour = new Date().getHours();

  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function readDisplayName() {
  if (typeof window === "undefined") {
    return "";
  }

  const keys = [
    "wingman.localProfile.v2",
    "wingmanProfile",
    "wingman:profile",
    "wingman-profile-settings",
  ];

  for (const key of keys) {
    const raw = window.localStorage.getItem(key);

    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw) as { displayName?: unknown };
      const displayName = typeof parsed.displayName === "string" ? parsed.displayName.trim() : "";

      if (displayName) {
        return displayName.replace(/^Mr\s+/i, "");
      }
    } catch {
      continue;
    }
  }

  return "Steve";
}

function isDashboardAdminSession(session: WingmanWorkspaceSession | null): boolean {
  return Boolean(
    session?.permissions?.canManageWorkspace ||
      [session?.workspaceRole, session?.user?.role].some((role) =>
        ["admin", "owner"].includes(String(role).toLowerCase()),
      ),
  );
}

function isGovernedEvidenceUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * Human-confirmation panel for a governed profile, mirroring the Compare
 * page's GovernedDecisionPanel: status line, reviewer + evidence inputs,
 * per-field confirmation, and a save that writes verified status back.
 */
function GovernedProfileConfirmationPanel({
  profile,
  onSaved,
}: {
  profile: AwaitingProfile;
  onSaved: (sku: string, reviewerName: string) => void;
}) {
  const [reviewer, setReviewer] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [selected, setSelected] = useState<Set<SpecCriticalField>>(
    new Set(profile.awaitingConfirmation),
  );
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  function toggleField(field: SpecCriticalField): void {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(field)) next.delete(field);
      else next.add(field);
      return next;
    });
    setMessage("");
  }

  async function confirmProfile(): Promise<void> {
    const reviewerName = reviewer.trim();
    if (!reviewerName) {
      setMessage("Record the reviewer name before confirming this profile.");
      return;
    }
    if (selected.size === 0) {
      setMessage("Confirm at least one spec-critical field.");
      return;
    }
    if (!isGovernedEvidenceUrl(evidenceUrl.trim())) {
      setMessage("Add a valid manufacturer or datasheet source URL before confirming.");
      return;
    }

    setSaving(true);
    try {
      const result = await confirmGovernedProfile({
        sku: profile.sku,
        verifiedBy: reviewerName,
        confirmedFields: [...selected],
        evidenceUrl: evidenceUrl.trim(),
      });
      if (!result.ok) {
        setMessage(result.error || "Confirmation was rejected.");
        return;
      }
      onSaved(profile.sku, reviewerName);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Confirmation failed - check the API and try again.");
    } finally {
      setSaving(false);
    }
  }

  const unconfirmable = profile.missingData.length > 0;

  return (
    <section className="wm-profile-confirmation-panel" aria-label={`Confirm ${profile.sku} profile`}>
      <header className="wm-profile-confirmation-panel__header">
        <div>
          <h3>Confirm {profile.sku}</h3>
          <p className="wm-profile-confirmation-panel__meta">
            {profile.productClass} · {profile.role} · currently machine-transcribed, awaiting human confirmation
          </p>
        </div>
      </header>

      <ul className="wm-profile-confirmation-panel__fields">
        {profile.awaitingConfirmation.map((field) => (
          <li key={`${profile.sku}-panel-${field}`} className="wm-profile-confirmation-panel__field">
            <label className="wm-profile-confirmation-panel__field-label">
              <input
                type="checkbox"
                checked={selected.has(field)}
                onChange={() => toggleField(field)}
              />
              <span>
                <strong>{specCriticalFieldLabel(field)}</strong>
                <small>{profile.values[field] || "Value present - not readable as text"}</small>
              </span>
            </label>
          </li>
        ))}
        {profile.missingData.map((field) => (
          <li key={`${profile.sku}-panel-missing-${field}`} className="wm-profile-confirmation-panel__field">
            <span className="wm-profile-confirmation-panel__field-label wm-profile-confirmation-panel__field-label--missing">
              <input type="checkbox" disabled />
              <span>
                <strong>{specCriticalFieldLabel(field)}</strong>
                <small>Missing data - add a readable value before this can be confirmed</small>
              </span>
            </span>
          </li>
        ))}
      </ul>

      <div className="wm-form-grid">
        <label className="wm-field">
          Reviewer
          <input
            className="wm-input"
            value={reviewer}
            onChange={(event) => setReviewer(event.target.value)}
            placeholder="Name of technical reviewer"
          />
        </label>
        <label className="wm-field">
          Manufacturer or datasheet source
          <input
            className="wm-input"
            value={evidenceUrl}
            onChange={(event) => setEvidenceUrl(event.target.value)}
            placeholder="https://wyrestorm.com/product"
          />
        </label>
      </div>

      <div className="wm-profile-confirmation-panel__actions">
        <button
          type="button"
          className="wm-ui-button"
          disabled={unconfirmable || saving}
          onClick={confirmProfile}
          title={
            unconfirmable
              ? "Add missing data before this profile can be verified"
              : "Confirm the selected spec-critical fields and record verifiedBy"
          }
        >
          {saving ? "Saving…" : "Confirm profile (mark verified)"}
        </button>
      </div>

      {message ? <p className="wm-profile-confirmation-panel__message">{message}</p> : null}
    </section>
  );
}

function GovernedConfirmationCard() {
  const backlog = governedConfirmationBacklog();
  const [confirmedSkus, setConfirmedSkus] = useState<Set<string>>(new Set());
  const [openSku, setOpenSku] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (backlog.awaiting.length === 0) return null;
  const awaiting = backlog.awaiting.filter((profile) => !confirmedSkus.has(profile.sku));
  const visible = awaiting.slice(0, 8);
  const openProfile = awaiting.find((profile) => profile.sku === openSku) ?? null;

  function handleSaved(sku: string, reviewerName: string): void {
    setConfirmedSkus((current) => new Set(current).add(sku));
    setOpenSku(null);
    setNotice(`${sku} verified - confirmed by ${reviewerName}. Reload to refresh the governed profile data.`);
  }

  return (
    <section className="wm-dashboard-confirmation-card" aria-label="Profiles awaiting human confirmation">
      <header className="wm-dashboard-confirmation-card__header">
        <div>
          <h2>Profiles awaiting human confirmation</h2>
          <p>
            {backlog.humanVerified}/{backlog.total} human-confirmed · {backlog.readyToConfirm} ready to confirm ·{" "}
            {backlog.needDataWork} need data work first · {backlog.aging} aging · {backlog.overdue} overdue. A profile
            becomes verified when a reviewer confirms max resolution, routed I/O and power and records verifiedBy.
          </p>
        </div>
        <span className="wm-dashboard-confirmation-card__count">{awaiting.length} awaiting</span>
      </header>
      {notice ? (
        <p className="wm-dashboard-confirmation-card__notice" role="status">
          {notice}
        </p>
      ) : null}
      <ul className="wm-dashboard-confirmation-card__list">
        {visible.map((profile) => (
          <li key={profile.sku} className="wm-dashboard-confirmation-card__row">
            <strong>{profile.sku}</strong>
            <span
              className={`wm-dashboard-confirmation-card__tag ${
                profile.aging === "overdue"
                  ? "wm-dashboard-confirmation-card__tag--missing"
                  : "wm-dashboard-confirmation-card__tag--awaiting"
              }`}
              title={
                profile.ageDays === null
                  ? "No evidence timestamp - the profile cannot be dated"
                  : profile.aging === "overdue"
                    ? `Awaiting confirmation for ${profile.ageDays} days - past the overdue threshold`
                    : `Awaiting confirmation for ${profile.ageDays} day(s)`
              }
            >
              {profile.ageDays === null
                ? "no date"
                : profile.aging === "overdue"
                  ? `OVERDUE ${profile.ageDays}d`
                  : `${profile.ageDays}d`}
            </span>
            <span className="wm-dashboard-confirmation-card__class">{profile.productClass}</span>
            {profile.awaitingConfirmation.map((field) => (
              <span
                key={`${profile.sku}-awaiting-${field}`}
                className="wm-dashboard-confirmation-card__tag wm-dashboard-confirmation-card__tag--awaiting"
                title="Value present - ready for a reviewer to confirm"
              >
                {specCriticalFieldLabel(field)}
              </span>
            ))}
            {profile.missingData.map((field) => (
              <span
                key={`${profile.sku}-missing-${field}`}
                className="wm-dashboard-confirmation-card__tag wm-dashboard-confirmation-card__tag--missing"
                title="No readable value - add data before confirming"
              >
                {specCriticalFieldLabel(field)} - missing data
              </span>
            ))}
            <button
              type="button"
              className="wm-dashboard-confirmation-card__confirm"
              onClick={() => setOpenSku(openSku === profile.sku ? null : profile.sku)}
              aria-expanded={openSku === profile.sku}
              disabled={profile.missingData.length > 0}
              title={
                profile.missingData.length > 0
                  ? "Add missing data before this profile can be verified"
                  : "Confirm this profile's spec-critical fields"
              }
            >
              {profile.missingData.length > 0 ? "Add data first" : openSku === profile.sku ? "Close" : "Confirm"}
            </button>
          </li>
        ))}
      </ul>
      {openProfile ? <GovernedProfileConfirmationPanel profile={openProfile} onSaved={handleSaved} /> : null}
      {awaiting.length > visible.length ? (
        <p className="wm-dashboard-confirmation-card__more">
          … and {awaiting.length - visible.length} more awaiting confirmation.
        </p>
      ) : null}
    </section>
  );
}

const VERIFIED_REVIEWER_ALL = "all";

type VerifiedSortMode = "recent" | "sku";

function verifiedReviewerOptions(verified: VerifiedProfile[]): string[] {
  return [...new Set(verified.map((profile) => profile.verifiedBy).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  );
}

function sortVerifiedProfiles(verified: VerifiedProfile[], mode: VerifiedSortMode): VerifiedProfile[] {
  const sorted = [...verified];
  if (mode === "sku") {
    sorted.sort((a, b) => a.sku.localeCompare(b.sku));
  } else {
    sorted.sort(
      (a, b) =>
        (b.verifiedAt || b.reviewedOn).localeCompare(a.verifiedAt || a.reviewedOn) || a.sku.localeCompare(b.sku),
    );
  }
  return sorted;
}

function GovernedVerifiedCard() {
  const backlog = governedConfirmationBacklog();
  const [reviewer, setReviewer] = useState<string>(VERIFIED_REVIEWER_ALL);
  const [sortMode, setSortMode] = useState<VerifiedSortMode>("recent");

  if (backlog.verified.length === 0) return null;
  const reviewers = verifiedReviewerOptions(backlog.verified);
  const rows = sortVerifiedProfiles(
    reviewer === VERIFIED_REVIEWER_ALL
      ? backlog.verified
      : backlog.verified.filter((profile) => profile.verifiedBy === reviewer),
    sortMode,
  );
  const visible = rows.slice(0, 8);

  return (
    <section className="wm-dashboard-verified-card" aria-label="Human-verified profiles">
      <header className="wm-dashboard-verified-card__header">
        <div>
          <h2>Human-verified profiles</h2>
          <p>
            The reviewer trail behind the “Verified governed data” badge: who confirmed each profile, when, and the
            official source used.
          </p>
        </div>
        <span className="wm-dashboard-verified-card__count">{backlog.verified.length} verified</span>
      </header>
      <div className="wm-dashboard-verified-card__toolbar">
        <label className="wm-dashboard-verified-card__toolbar-label" htmlFor="verified-reviewer-filter">
          Reviewer
        </label>
        <select
          id="verified-reviewer-filter"
          className="wm-dashboard-verified-card__select"
          aria-label="Filter by reviewer"
          value={reviewer}
          onChange={(event) => setReviewer(event.target.value)}
        >
          <option value={VERIFIED_REVIEWER_ALL}>All reviewers</option>
          {reviewers.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <label className="wm-dashboard-verified-card__toolbar-label" htmlFor="verified-sort-mode">
          Sort
        </label>
        <select
          id="verified-sort-mode"
          className="wm-dashboard-verified-card__select"
          aria-label="Sort verified profiles"
          value={sortMode}
          onChange={(event) => setSortMode(event.target.value as VerifiedSortMode)}
        >
          <option value="recent">Recent first</option>
          <option value="sku">SKU A–Z</option>
        </select>
      </div>
      <ul className="wm-dashboard-verified-card__list">
        {visible.map((profile) => (
          <li key={profile.sku} className="wm-dashboard-verified-card__row">
            <strong>{profile.sku}</strong>
            <span className="wm-dashboard-verified-card__class">{profile.productClass}</span>
            <span className="wm-dashboard-verified-card__reviewer">
              confirmed by {profile.verifiedBy} · {profile.reviewedOn}
            </span>
            <span className="wm-dashboard-verified-card__tag wm-dashboard-verified-card__tag--confirmed">
              {profile.confirmedFields.map(specCriticalFieldLabel).join(" · ")}
            </span>
            <a
              className="wm-dashboard-verified-card__evidence"
              href={profile.evidenceUrl}
              target="_blank"
              rel="noopener noreferrer"
              title={`Official source confirmed for ${profile.sku}`}
            >
              {profile.evidenceUrl.replace(/^https?:\/\//, "")}
            </a>
          </li>
        ))}
      </ul>
      {rows.length > visible.length ? (
        <p className="wm-dashboard-verified-card__more">
          … and {rows.length - visible.length} more verified profiles.
        </p>
      ) : null}
    </section>
  );
}

/**
 * The human-approval trail behind the Compare page's governed decisions:
 * how many of the ledger's competitor decisions a reviewer has approved,
 * with the most recent approvals, the reviewer, and the official source each
 * was confirmed against. Mirrors GovernedVerifiedCard for the profile side.
 */
function CompetitorDecisionApprovedCard() {
  const [state, setState] = useState<{
    loading: boolean;
    total: number;
    approved: number;
    decisions: CompetitorMatchDecision[];
  }>({ loading: true, total: 0, approved: 0, decisions: [] });

  useEffect(() => {
    let active = true;

    fetchApprovedCompetitorDecisions()
      .then((response) => {
        if (!active || !response.ok) return;
        setState({
          loading: false,
          total: response.total ?? 0,
          approved: response.approved ?? 0,
          decisions: response.decisions ?? [],
        });
      })
      .catch(() => {
        // The governed server may be absent (offline / standalone); the card
        // simply does not render rather than showing a stale or wrong count.
        if (active) setState((current) => ({ ...current, loading: false }));
      });

    return () => {
      active = false;
    };
  }, []);

  if (state.loading || state.approved === 0) return null;

  const rows = [...state.decisions]
    .sort((a, b) =>
      String(b.reviewedAt ?? "").localeCompare(String(a.reviewedAt ?? "")),
    )
    .slice(0, 8);
  const pending = Math.max(0, state.total - state.approved);

  return (
    <section className="wm-dashboard-verified-card" aria-label="Approved competitor decisions">
      <header className="wm-dashboard-verified-card__header">
        <div>
          <h2>Approved competitor decisions</h2>
          <p>
            The reviewer trail behind the Compare page's governed match decisions: which
            competitor products have an approved WyreStorm recommendation, by whom, and
            against which official source.
          </p>
        </div>
        <span className="wm-dashboard-verified-card__count">{state.approved} approved</span>
      </header>
      <p className="wm-dashboard-verified-card__summary">
        {state.approved}/{state.total} competitor decisions human-approved · {pending} awaiting review in the{" "}
        <Link to={routeCatalogByKey.compare.path}>Compare decision queue</Link>.
      </p>
      <ul className="wm-dashboard-verified-card__list">
        {rows.map((decision) => (
          <li key={`${decision.competitorManufacturer}:${decision.competitorSku}`} className="wm-dashboard-verified-card__row">
            <strong>
              {decision.competitorManufacturer} {decision.competitorSku}
            </strong>
            <span className="wm-dashboard-verified-card__class">→ {decision.wyrestormSku ?? "no recommendation"}</span>
            <span className="wm-dashboard-verified-card__reviewer">
              {governedDecisionLabel(decision)} · {decision.reviewer} ·{" "}
              {String(decision.reviewedAt ?? "").slice(0, 10)}
            </span>
            {decision.evidence.at(-1)?.sourceUrl ? (
              <a
                className="wm-dashboard-verified-card__evidence"
                href={decision.evidence.at(-1)?.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                title={`Official source confirmed for ${decision.competitorSku}`}
              >
                {decision.evidence.at(-1)?.sourceUrl.replace(/^https?:\/\//, "")}
              </a>
            ) : null}
          </li>
        ))}
      </ul>
      {state.decisions.length > rows.length ? (
        <p className="wm-dashboard-verified-card__more">
          … and {state.decisions.length - rows.length} more approved decisions.
        </p>
      ) : null}
    </section>
  );
}

function GovernedCoverageStrip() {
  const coverage = governedCoverageSummary();
  return (
    <section className="wm-dashboard-coverage-strip" aria-label="Governed product data coverage">
      <span className="wm-dashboard-coverage-strip__dot" aria-hidden="true" />
      <p>
        <strong>{coverage.verifiedPct}% of product profiles human-verified</strong>
        <small>
          {coverage.verified}/{coverage.total} human-confirmed governed profiles · {coverage.compareReady} compare-ready — the Compare
          feature leads with official governed data awaiting human confirmation.
        </small>
      </p>
      <Link to={routeCatalogByKey.compare.path} className="wm-dashboard-coverage-strip__link">
        Compare products
      </Link>
    </section>
  );
}

export function DashboardPage() {
  const { isGuided } = useUiMode();
  const { projects } = useProjectStore();
  const [workspaceSession, setWorkspaceSession] = useState<WingmanWorkspaceSession | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const showAdminGovernance = sessionReady && isDashboardAdminSession(workspaceSession);

  useEffect(() => {
    let active = true;

    getWingmanSession()
      .then((response) => {
        if (active) setWorkspaceSession(response.session || null);
      })
      .catch(() => {
        if (active) setWorkspaceSession(null);
      })
      .finally(() => {
        if (active) setSessionReady(true);
      });

    return () => {
      active = false;
    };
  }, []);

  // In guided mode, show the simplified dashboard
  if (isGuided) {
    return <GuidedDashboard />;
  }

  const sourceProjects: DashboardProject[] = projects.length
    ? projects.map((project) => ({ ...project, scope: projectScopeLine(project) }))
    : fallbackProjects;

  const recentProjects = sourceProjects.slice(0, 3);
  const displayName = readDisplayName();

  return (
    <main
      className="wm-reference-dashboard wm-dashboard-page wm-page wm-polish-shell"
      data-wingman-page="home"
      data-wingman-home="true"
      aria-label="Wingman dashboard"
    >
      <header className="wm-dashboard-heading-row">
        <div className="wm-dashboard-heading">
          <p className="wm-polish-eyebrow">WyreStorm sales intelligence</p>
          <h1 id="wingman-dashboard-title">
            {greetingForCurrentTime()}
            {displayName ? `, ${displayName}` : ""}
          </h1>
          <p>What would you like to achieve today?</p>
        </div>

        <button
          type="button"
          className="wingman-new-project-button"
          onClick={() => window.dispatchEvent(new Event("wingman:new-project"))}
          aria-label="Create new Wingman project"
        >
          <Plus className="h-4 w-4" />
          <span>New Project</span>
        </button>
      </header>

      <div className="wm-reference-dashboard-layout wm-dashboard-content-grid">
        <div className="wm-reference-dashboard-main">
          <section className="wm-sh-card-grid wm-polish-grid" aria-label="Primary Wingman actions">
            {primaryActions.map((action) => (
              <HubCard key={action.title} item={action} />
            ))}
          </section>

          {SHOW_HOME_GOVERNANCE ? <GovernedCoverageStrip /> : null}

          {showAdminGovernance ? (
            <>
              {SHOW_HOME_GOVERNANCE ? <CompetitorDecisionApprovedCard /> : null}
              {SHOW_HOME_GOVERNANCE ? <GovernedConfirmationCard /> : null}
              {SHOW_HOME_GOVERNANCE ? <GovernedVerifiedCard /> : null}
            </>
          ) : null}

          <section className="wm-reference-section" aria-label="Recent projects">
            <div className="wm-reference-section-heading">
              <h2>Recent Projects</h2>
              <Link to={routeCatalogByKey.projects.path}>
                View all
                <ArrowRight aria-hidden="true" />
              </Link>
            </div>

            <div className="wm-reference-project-grid">
              {recentProjects.map((project) => {
                const progress = projectProgress(project);
                const resume = discoveryResumeInfo(project.discoveryBrief);
                const resumeInterview = resume && resume.hasContent && !resume.complete;

                return (
                  <Link
                    key={project.id}
                    to={resumeInterview ? discoveryResumeUrl() : `${routeCatalogByKey.projects.path}/${project.id}`}
                    onClick={() => setActiveProjectId(project.id)}
                    className="wm-reference-project-card"
                    data-wm-status={project.status}
                  >
                    <div className="wm-reference-project-topline">
                      <StatusChip label={STATUS_LABEL[project.status]} variant={project.status} />
                      <MoreVertical aria-hidden="true" />
                    </div>
                    <div className="wm-reference-project-name">
                      <span className="wm-reference-project-icon">
                        <CheckCircle2 aria-hidden="true" />
                      </span>
                      <span>
                        <strong>{project.name}</strong>
                        <small>{projectScopeLine(project)} · Updated {project.updated}</small>
                      </span>
                    </div>
                    {progress ? (
                      <div className="wm-reference-progress" aria-label={`${progress.label}: ${progress.value}%`}>
                        <progress className="wm-reference-progress-track" max={100} value={progress.value} />
                        <strong>{progress.value}%</strong>
                      </div>
                    ) : null}
                    <div className="wm-reference-project-next">
                      {resumeInterview ? (
                        <span className="wm-reference-project-resume" data-testid="dashboard-resume-position">
                          Resume interview — next: {resume!.nextQuestion || `open question ${resume!.answeredCount + 1}`} · {resume!.answeredCount} answered
                        </span>
                      ) : (
                        nextStepFor(project.stage)
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        </div>

        <aside className="wm-reference-dashboard-rail" aria-label="Dashboard focus panel">
          <section className="wm-reference-rail-card wm-reference-focus-card">
            <div className="wm-reference-rail-title">
              <Target aria-hidden="true" />
              <h2>Today&apos;s Focus</h2>
            </div>
            <div className="wm-reference-focus-list">
              {recentProjects.map((project) => (
                <Link
                  key={project.id}
                  to={project.resumeTo}
                  onClick={() => setActiveProjectId(project.id)}
                >
                  <span className="wm-reference-focus-marker" />
                  <span>
                    <strong>{nextStepFor(project.stage)}</strong>
                    <small>{project.name}</small>
                  </span>
                </Link>
              ))}
            </div>
            <Link to={routeCatalogByKey.projects.path} className="wm-reference-text-link">
              See all tasks
              <ArrowRight aria-hidden="true" />
            </Link>
          </section>

          <section className="wm-reference-rail-card wm-reference-news-card">
            <div className="wm-reference-rail-title">
              <Zap aria-hidden="true" />
              <h2>What&apos;s New</h2>
            </div>
            <p>Room templates and guided workflows have been refreshed.</p>
            <p>The dashboard now prioritises active work and core starting points, with all other tools available from the Wingman menu.</p>
            <Link to={routeCatalogByKey.templates.path} className="wm-reference-text-link">
              Explore templates
              <ArrowRight aria-hidden="true" />
            </Link>
          </section>
        </aside>
      </div>
    </main>
  );
}

export default DashboardPage;
