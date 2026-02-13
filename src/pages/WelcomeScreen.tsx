import React from "react";
import { Link } from "react-router-dom";
import LoginForm from "@/components/auth/LoginForm";
import heroLogo from "@/assets/branding/wyrestorm-wingman-logo.png";

export default function WelcomeScreen() {
  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl p-6 pt-10">
        <div className="grid gap-6 lg:grid-cols-[1fr_420px] items-start">
          {/* Left: pitch */}
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-7">
            <div className="flex items-center gap-4">
              <img src={heroLogo} alt="WyreStorm Wingman" className="h-16 w-auto" />
              <div>
                <div className="text-sm text-white/70">WyreStorm Wingman</div>
                <h1 className="text-3xl sm:text-4xl font-black text-white/95 mt-1">
                  AV sales + design, simplified
                </h1>
              </div>
            </div>

            <p className="mt-4 text-white/70 max-w-2xl">
              Wingman helps you capture requirements, select the right WyreStorm solution, and produce proposal-ready
              outputs — with guardrails to reduce mistakes and speed up quoting.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="font-extrabold text-white/90">Toolbox</div>
                <div className="text-sm text-white/65 mt-1">
                  Room Wizard, Video Wall planner, Templates, Compare, Proposals, Import Intake.
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="font-extrabold text-white/90">Guardrails</div>
                <div className="text-sm text-white/65 mt-1">
                  Helps prevent topology mistakes, mismatched SKUs, and missing ancillaries.
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="font-extrabold text-white/90">Sales-ready outputs</div>
                <div className="text-sm text-white/65 mt-1">
                  Summaries and proposal structure you can export and refine.
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="font-extrabold text-white/90">Training + Guru</div>
                <div className="text-sm text-white/65 mt-1">
                  Fast answers and enablement for sales and pre-sales.
                </div>
              </div>
            </div>

            <div className="mt-6 text-sm text-white/60">
              Live tools and saved data are available only after sign-in.
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <Link className="px-4 py-2 rounded-xl border border-white/15 hover:bg-white/10 text-white/80 font-semibold" to="/">
                Public landing
              </Link>
              <Link className="px-4 py-2 rounded-xl border border-white/15 hover:bg-white/10 text-white/80 font-semibold" to="/signup">
                Create account
              </Link>
            </div>
          </div>

          {/* Right: embedded login */}
          <div>
            <LoginForm embedded title="Sign in to Wingman" subtitle="Access your Dashboard, Projects, and Tools." />
          </div>
        </div>
      </div>
    </div>
  );
}