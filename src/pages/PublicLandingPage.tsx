import React from "react";
import { Link } from "react-router-dom";
import heroLogo from "@/assets/branding/heroLogo.png";

function CTAButton({ to, children, variant }: { to: string; children: React.ReactNode; variant?: "primary" | "ghost" }) {
  const base =
    "inline-flex items-center justify-center rounded-xl px-6 py-3 font-semibold transition border";
  const primary =
    "bg-emerald-500 text-black border-emerald-400 hover:bg-emerald-400";
  const ghost =
    "bg-transparent text-white border-white/20 hover:border-white/40 hover:bg-white/5";
  return (
    <Link className={`${base} ${variant === "primary" ? primary : ghost}`} to={to}>
      {children}
    </Link>
  );
}

function FeatureCard({ title, desc, to }: { title: string; desc: string; to: string }) {
  return (
    <Link
      to={to}
      className="block rounded-2xl border border-white/10 bg-white/5 p-6 hover:bg-white/7 hover:border-white/20 transition"
    >
      <div className="text-lg font-semibold text-white">{title}</div>
      <div className="mt-2 text-sm text-white/70">{desc}</div>
      <div className="mt-4 text-sm font-semibold text-emerald-300">Open →</div>
    </Link>
  );
}

export default function PublicLandingPage() {
  return (
    <div className="min-h-screen text-white">
      {/* Background */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-[#070A12] via-[#07121B] to-[#05060A]" />
      <div className="fixed inset-0 -z-10 opacity-60 bg-[radial-gradient(1200px_600px_at_50%_0%,rgba(16,185,129,0.18),transparent_60%)]" />

      {/* Top bar */}
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
  <Link to="/" className="flex items-center gap-3">
    <img src={heroLogo} alt="WyreStorm Wingman" className="h-28 w-auto" />
  </Link>
  <nav className="flex items-center gap-3">
    <Link className="inline-flex items-center justify-center rounded-xl px-5 py-2.5 font-semibold transition border border-white/20 text-white/90 hover:bg-white/5" to="/login">Log in</Link>
    <Link className="inline-flex items-center justify-center rounded-xl px-5 py-2.5 font-semibold transition border border-emerald-400 bg-emerald-500 text-black hover:bg-emerald-400" to="/signup">Create account</Link>
  </nav>
</header>

      {/* Hero */}
      <main className="mx-auto w-full max-w-6xl px-6 pb-16">
        <section className="pt-10 pb-8 text-center">
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight">
            AV Sales. Simplified.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-white/75">
            Design systems faster, compare competitors confidently, and generate proposals in minutes —
            from one guided workspace built for WyreStorm workflows.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <CTAButton to="/signup" variant="primary">Create free account</CTAButton>
            <CTAButton to="/app/dashboard" variant="ghost">Enter workspace</CTAButton>
            <CTAButton to="/app/tools/ask" variant="ghost">Ask Wingman (Guru)</CTAButton>
          </div>

          <div className="mt-6 text-xs text-white/55">
            New here? Start in 30 seconds: create account → open ToolHub → run your first design.
          </div>
        </section>

        {/* Why */}
        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="text-base font-semibold">Guided system design</div>
            <div className="mt-2 text-sm text-white/70">
              Structured steps that reduce mistakes and speed up quoting.
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="text-base font-semibold">Competitor positioning</div>
            <div className="mt-2 text-sm text-white/70">
              Quickly match use-cases and recommend WyreStorm equivalents.
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="text-base font-semibold">Proposal outputs</div>
            <div className="mt-2 text-sm text-white/70">
              Turn your design into a presentable summary and bill-of-materials.
            </div>
          </div>
        </section>

        {/* Feature entry points */}
        <section className="mt-10">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">Start with a tool</h2>
              <p className="mt-1 text-sm text-white/65">
                These are the most-used applets. Everything else lives in ToolHub.
              </p>
            </div>
            <Link className="text-sm font-semibold text-emerald-300 hover:text-emerald-200" to="/app/toolhub">
              Open ToolHub →
            </Link>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <FeatureCard
              title="VideoWall Designer"
              desc="Plan a wall, outputs, processing, and practical constraints."
              to="/app/tools/videowall"
            />
            <FeatureCard
              title="Competitor Compare"
              desc="Find WyreStorm matches and structure your positioning."
              to="/app/tools/competitor-compare"
            />
            <FeatureCard
              title="System Compare"
              desc="Compare products/configs and capture decision notes."
              to="/app/tools/compare"
            />
            <FeatureCard
              title="Import Intake"
              desc="Paste requirements or upload text and extract key needs."
              to="/app/import"
            />
          </div>

          <div className="mt-8 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-6">
            <div className="text-lg font-bold">Ready to use Wingman on a live opportunity?</div>
            <div className="mt-2 text-sm text-white/75">
              Create an account, start a project, then run ToolHub applets to produce a design and proposal.
            </div>
            <div className="mt-4 flex flex-col sm:flex-row gap-3">
              <CTAButton to="/signup" variant="primary">Create account</CTAButton>
              <CTAButton to="/app/projects" variant="ghost">Go to Projects</CTAButton>
              <CTAButton to="/app/toolhub" variant="ghost">Open ToolHub</CTAButton>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-12 border-t border-white/10 pt-6 text-center text-xs text-white/55">
          © {new Date().getFullYear()} WyreStorm Technologies — Wingman</footer>
      </main>
    </div>
  );
}