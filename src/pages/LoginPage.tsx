import * as React from "react";
import { Link } from "react-router-dom";
import {
  Boxes,
  FileText,
  ShieldCheck,
  Sparkles,
  ArrowRight,
} from "lucide-react";

import LoginForm from "@/components/auth/LoginForm";
import heroLogo from "@/assets/branding/heroLogo.png";

const capabilityCards = [
  {
    title: "Design workflows",
    body: "Jump back into room design, video wall planning, and topology guidance without losing project context.",
    Icon: Boxes,
  },
  {
    title: "Evidence-backed compare",
    body: "Cross-check WyreStorm against competitor products using the richer seeded catalog and structured product data.",
    Icon: Sparkles,
  },
  {
    title: "Proposal output",
    body: "Move from solution design into BOM support, proposal structure, and customer-ready handoff faster.",
    Icon: FileText,
  },
];

const trustPoints = [
  "Workspace-aware projects and saved progress",
  "Demo mode remains available during service outages",
  "Built for sales, pre-sales, and solution design teams",
];

export default function LoginPage() {
  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#06111f] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(68,216,241,0.18),transparent_28%),radial-gradient(circle_at_85%_18%,rgba(55,128,255,0.16),transparent_22%),linear-gradient(180deg,#08111f_0%,#040914_52%,#03070f_100%)]" />
      <div className="absolute left-[-6rem] top-24 h-72 w-72 rounded-full bg-cyan-300/10 blur-3xl" />
      <div className="absolute bottom-0 right-[-4rem] h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-5 py-6 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between gap-4">
          <Link to="/" className="inline-flex items-center gap-3 text-white no-underline">
            <img src={heroLogo} alt="WyreStorm Wingman" className="h-9 w-auto sm:h-10" />
            <div className="hidden sm:block">
              <div className="text-[11px] font-semibold uppercase tracking-[0.34em] text-cyan-200/70">
                WyreStorm
              </div>
              <div className="text-sm font-semibold text-white/88">Wingman workspace</div>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="inline-flex min-h-10 items-center rounded-xl border border-white/12 bg-white/[0.04] px-4 text-sm font-semibold text-white/80 no-underline transition hover:bg-white/[0.08] hover:text-white"
            >
              Back to site
            </Link>
            <Link
              to="/signup"
              className="inline-flex min-h-10 items-center rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-4 text-sm font-semibold text-cyan-100 no-underline transition hover:bg-cyan-300/16"
            >
              Create account
            </Link>
          </div>
        </header>

        <section className="grid flex-1 items-center gap-8 py-8 lg:grid-cols-[minmax(0,1.1fr)_460px] lg:gap-12 lg:py-10">
          <div className="order-2 space-y-8 lg:order-1 lg:pr-8">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/16 bg-cyan-300/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-100/88">
                <ShieldCheck className="h-3.5 w-3.5" />
                Secure workspace sign in
              </div>

              <div className="max-w-3xl space-y-4">
                <h1 className="text-4xl font-black tracking-[-0.05em] text-white sm:text-5xl lg:text-6xl">
                  Pick up the design exactly where your team left it.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                  Sign in to access dashboards, active projects, competitor comparisons, room workflows, and proposal-ready outputs in one place.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {capabilityCards.map(({ title, body, Icon }) => (
                <article
                  key={title}
                  className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_20px_48px_rgba(0,0,0,0.18)] backdrop-blur-sm"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-300/16 bg-cyan-300/10 text-cyan-100">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h2 className="mt-4 text-lg font-bold tracking-[-0.02em] text-white">{title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{body}</p>
                </article>
              ))}
            </div>

            <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(9,18,33,0.86),rgba(9,18,33,0.55))] p-6 shadow-[0_22px_60px_rgba(0,0,0,0.2)]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-200/72">
                    Why teams use Wingman
                  </div>
                  <div className="mt-2 text-2xl font-black tracking-[-0.04em] text-white">
                    Modern AV workflow support, not just a login wall.
                  </div>
                </div>
                <div className="hidden h-14 w-14 items-center justify-center rounded-2xl border border-cyan-300/18 bg-cyan-300/10 text-cyan-100 sm:flex">
                  <ArrowRight className="h-6 w-6" />
                </div>
              </div>

              <div className="mt-5 grid gap-3">
                {trustPoints.map((point) => (
                  <div
                    key={point}
                    className="flex items-start gap-3 rounded-2xl border border-white/8 bg-black/10 px-4 py-3 text-sm leading-6 text-slate-300"
                  >
                    <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-cyan-300" />
                    <span>{point}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <LoginForm
              title="Welcome back"
              subtitle="Sign in to open your workspace, or continue in demo mode while deployment services are unavailable."
              variant="modern"
            />
          </div>
        </section>
      </div>
    </main>
  );
}
