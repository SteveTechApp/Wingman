import { Bot, Lightbulb, MessageSquare, Monitor, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { routeByPath, routeCatalogByKey, type WingmanRouteKey } from "../app/routeCatalog";

type WingmanGuruDrawerProps = {
  open: boolean;
  onClose: () => void;
};

type HelperContext = {
  label: string;
  purpose: string;
  nextMove: string;
  quickLinks: { routeKey: WingmanRouteKey; icon: "sales" | "videowall" | "helper" }[];
};

const pageHelp: Record<WingmanRouteKey, HelperContext> = {
  dashboard: {
    label: "Workspace guidance",
    purpose: "Use Guru to route the rep into the right motion quickly and reduce hesitation at the start of a sales conversation.",
    nextMove: "Pick a path: Discovery for clarification, Competitor Compare for replacement, or Projects to resume live work.",
    quickLinks: [
      { routeKey: "salesHelper", icon: "sales" },
      { routeKey: "callCards", icon: "helper" },
      { routeKey: "videowall", icon: "videowall" },
    ],
  },
  projects: {
    label: "Project coordination",
    purpose: "Use Guru to reopen the correct stage quickly and keep the sales workflow moving without losing project context.",
    nextMove: "Resume discovery, comparison, or proposal work based on the current project stage.",
    quickLinks: [
      { routeKey: "discovery", icon: "helper" },
      { routeKey: "compare", icon: "helper" },
      { routeKey: "proposal", icon: "helper" },
    ],
  },
  discovery: {
    label: "Discovery coaching",
    purpose: "Guide the rep to ask smarter questions, expose technical uncertainty early, and capture the right brief.",
    nextMove: "Use the helper cards to decide what to ask next and what missing detail is still blocking confidence.",
    quickLinks: [
      { routeKey: "callCards", icon: "helper" },
      { routeKey: "salesHelper", icon: "sales" },
      { routeKey: "projects", icon: "helper" },
    ],
  },
  finder: {
    label: "Positioning support",
    purpose: "Help the rep explain why a recommended product is the right commercial and technical fit.",
    nextMove: "Use sales helper prompts to strengthen positioning before carrying the result into compare or proposal.",
    quickLinks: [
      { routeKey: "salesHelper", icon: "sales" },
      { routeKey: "compare", icon: "helper" },
      { routeKey: "callCards", icon: "helper" },
    ],
  },
  compare: {
    label: "Replacement guidance",
    purpose: "Make competitor replacement safer by surfacing talking points, cautions, and next-best actions.",
    nextMove: "Check objections, confirm partial-match risks, and use call cards to guide the rest of the sales conversation.",
    quickLinks: [
      { routeKey: "salesHelper", icon: "sales" },
      { routeKey: "callCards", icon: "helper" },
      { routeKey: "proposal", icon: "helper" },
    ],
  },
  templates: {
    label: "Template guidance",
    purpose: "Use templates to accelerate the sales conversation without skipping the assumptions that still matter.",
    nextMove: "Apply the closest room type, then move into discovery or proposal with a pre-framed solution.",
    quickLinks: [
      { routeKey: "discovery", icon: "helper" },
      { routeKey: "proposal", icon: "helper" },
      { routeKey: "projects", icon: "helper" },
    ],
  },
  videowall: {
    label: "Videowall design help",
    purpose: "Use Guru to shape LED or LCD wall requirements into a proposal-ready recommendation path.",
    nextMove: "Confirm wall type, size, resolution, and signal/control approach before adding the design into the project.",
    quickLinks: [
      { routeKey: "salesHelper", icon: "sales" },
      { routeKey: "projects", icon: "helper" },
      { routeKey: "proposal", icon: "helper" },
    ],
  },
  salesHelper: {
    label: "Positioning support",
    purpose: "Use Guru to move from technical detail into cleaner commercial language the rep can actually say out loud.",
    nextMove: "Carry the improved positioning into Finder, Compare, or Proposal while the context is still clear.",
    quickLinks: [
      { routeKey: "finder", icon: "helper" },
      { routeKey: "compare", icon: "helper" },
      { routeKey: "proposal", icon: "helper" },
    ],
  },
  callCards: {
    label: "Live call coaching",
    purpose: "Use Guru to choose the right question, framing, and risk watch-out for the active customer conversation.",
    nextMove: "Take the relevant card into discovery, compare, videowall, or proposal work immediately.",
    quickLinks: [
      { routeKey: "discovery", icon: "helper" },
      { routeKey: "videowall", icon: "videowall" },
      { routeKey: "proposal", icon: "helper" },
    ],
  },
  ingest: {
    label: "Document interpretation",
    purpose: "Use Guru to turn raw file content into a cleaner requirement summary and next-action list.",
    nextMove: "Review the unknowns, then push the extracted brief into discovery or proposal.",
    quickLinks: [
      { routeKey: "discovery", icon: "helper" },
      { routeKey: "proposal", icon: "helper" },
      { routeKey: "support", icon: "helper" },
    ],
  },
  proposal: {
    label: "Proposal refinement",
    purpose: "Use Guru to tighten assumptions, improve sales phrasing, and catch missing technical confirmations before the proposal leaves the room.",
    nextMove: "Escalate unresolved risks or return to compare and discovery before sending the final draft.",
    quickLinks: [
      { routeKey: "support", icon: "helper" },
      { routeKey: "compare", icon: "helper" },
      { routeKey: "projects", icon: "helper" },
    ],
  },
  support: {
    label: "Escalation support",
    purpose: "Use Guru to identify what should be escalated versus what can be solved by routing back into the right workflow.",
    nextMove: "Open the feature or workflow that resolves the current risk, then return here if review is still needed.",
    quickLinks: [
      { routeKey: "projects", icon: "helper" },
      { routeKey: "proposal", icon: "helper" },
      { routeKey: "salesHelper", icon: "sales" },
    ],
  },
};

function iconFor(kind: "sales" | "videowall" | "helper") {
  if (kind === "sales") return <Lightbulb className="h-4 w-4" />;
  if (kind === "videowall") return <Monitor className="h-4 w-4" />;
  return <MessageSquare className="h-4 w-4" />;
}

export function WingmanGuruDrawer({ open, onClose }: WingmanGuruDrawerProps) {
  const location = useLocation();
  const activeRoute = routeByPath(location.pathname);
  const context: HelperContext = activeRoute
    ? pageHelp[activeRoute.key]
    : {
        label: "Wingman Guru",
        purpose: "Use the floating helper to bring sales prompts, next moves, and supporting tools into the current workflow.",
        nextMove: "Open the supporting module that best helps the current conversation move forward.",
        quickLinks: [
          { routeKey: "salesHelper", icon: "sales" },
          { routeKey: "callCards", icon: "helper" },
          { routeKey: "videowall", icon: "videowall" },
        ],
      };

  return (
    <div
      className={[
        "fixed inset-y-0 right-0 z-40 w-full max-w-[420px] transform transition-transform duration-300",
        open ? "translate-x-0" : "translate-x-full",
      ].join(" ")}
    >
      <div className="flex h-full flex-col border-l border-white/10 bg-slate-950/95 p-6 text-white shadow-2xl backdrop-blur-xl">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <p className="wingman-kicker text-slate-400">Floating helper</p>
            <div className="mt-2 flex items-center gap-3">
              <Bot className="h-6 w-6 text-orange-300" />
              <h2 className="text-2xl font-semibold">Wingman Guru</h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-300">{context.label}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 p-2 text-slate-300 transition hover:bg-white/5 hover:text-white"
            aria-label="Close Wingman Guru"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 space-y-6 overflow-y-auto">
          <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="wingman-kicker text-slate-400">Purpose</p>
            <p className="mt-3 text-sm leading-6 text-slate-200">{context.purpose}</p>
          </section>

          <section className="rounded-2xl border border-orange-400/20 bg-orange-500/10 p-4">
            <p className="wingman-kicker text-orange-200">Next move</p>
            <p className="mt-3 text-sm leading-6 text-orange-50">{context.nextMove}</p>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="wingman-kicker text-slate-400">Quick actions</p>
            <div className="mt-4 space-y-3">
              {context.quickLinks.map((item) => (
                <Link
                  key={item.routeKey}
                  to={routeCatalogByKey[item.routeKey].path}
                  onClick={onClose}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm text-slate-100 transition hover:border-orange-300/40 hover:bg-slate-900"
                >
                  <span className="inline-flex items-center gap-3">
                    {iconFor(item.icon)}
                    {routeCatalogByKey[item.routeKey].label}
                  </span>
                  <span className="text-xs uppercase tracking-[0.18em] text-slate-400">Open</span>
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="wingman-kicker text-slate-400">Suggested helper cards</p>
            <div className="mt-4 space-y-3 text-sm text-slate-200">
              <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-4">
                <p className="font-semibold">Ask this next</p>
                <p className="mt-2 text-slate-300">
                  What technical constraint, competitor pressure, or customer uncertainty is still blocking the decision?
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-4">
                <p className="font-semibold">Position this clearly</p>
                <p className="mt-2 text-slate-300">
                  Use simpler language first, then justify the recommendation with one technical strength and one commercial advantage.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-4">
                <p className="font-semibold">Watch for risk</p>
                <p className="mt-2 text-slate-300">
                  If the topology, USB path, or wall-control requirement is unclear, escalate before finalizing the proposal.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
