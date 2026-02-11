import React from "react";
import heroLogo from "@/assets/branding/wyrestorm-wingman-logo.png";
import { Link } from "react-router-dom";

export default function PublicLandingPage() {
  return (
    <div className="min-h-screen w-full bg-[#060a14] text-white">
      <div className="mx-auto max-w-6xl px-6 pt-16 pb-10">
        {/* Brand */}
        <div className="flex items-center justify-center">
          <img src={heroLogo} alt="WyreStorm Wingman" className="h-12 w-auto opacity-95" />
        </div>

        {/* Hero */}
        <div className="mt-10 text-center">
          {/* Remove the duplicate subtitle entirely */}
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mt-4">
            AV Sales. Simplified.
          </h1>

          <p className="mt-4 text-white/70 max-w-2xl mx-auto">
            Design systems, compare competitors, generate proposals and win projects faster Ã¢â‚¬â€ all from one intelligent workspace.
          </p>

          {/* CTA Buttons */}
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <Link
              to="/app/dashboard"
              className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold shadow-lg"
            >
              Enter Workspace
            </Link>

            <Link
              to="/signup"
              className="px-6 py-3 rounded-xl border border-white/20 hover:bg-white/10 font-semibold"
            >
              Sign Up
            </Link>

            <Link
              to="/app/tools/training"
              className="px-6 py-3 rounded-xl border border-white/20 hover:bg-white/10 font-semibold"
            >
              Watch Demo
            </Link>
          </div>
        </div>

        {/* Feature tiles */}
        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="text-lg font-semibold">System Design</div>
            <div className="mt-2 text-sm text-white/70">
              Build AV system designs quickly with structured guidance.
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="text-lg font-semibold">Competitor Compare</div>
            <div className="mt-2 text-sm text-white/70">
              Instantly position WyreStorm solutions with confidence.
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="text-lg font-semibold">Proposal Generation</div>
            <div className="mt-2 text-sm text-white/70">
              Create polished proposals in minutes, not hours.
            </div>
          </div>
        </div>

        <div className="mt-10 text-center text-xs text-white/40">
          Ã‚Â© {new Date().getFullYear()} WyreStorm Technologies Ã¢â‚¬â€ Wingman
        </div>
      </div>
    </div>
  );
}

