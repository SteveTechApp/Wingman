import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import WingmanBrand from "@/components/branding/WingmanBrand";

type LocState = { from?: string };

export default function LoginPage() {
  const nav = useNavigate();
  const loc = useLocation();
  const state = (loc.state || {}) as LocState;

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    localStorage.setItem("wingman_auth", "true");
    localStorage.setItem("wingman_user_name", name || "User");
    localStorage.setItem("wingman_user_email", email || "");

    const target = state.from || "/app/dashboard";
    nav(target, { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl bg-white/5 border border-white/10 backdrop-blur p-6">
        <div className="flex justify-center mb-4">
          <WingmanBrand size="md" align="center" className="max-w-[360px]" />
        </div>

        <h1 className="text-2xl font-black text-center mb-2">Log in</h1>
        <p className="text-sm text-white/70 text-center mb-6">
          Access your workspace and saved projects.
        </p>

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-bold mb-1 text-white/70 uppercase">Name</label>
            <input
              className="w-full p-3 rounded-xl bg-black/30 border border-white/10 outline-none focus:ring-2 focus:ring-emerald-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Steve"
            />
          </div>

          <div>
            <label className="block text-xs font-bold mb-1 text-white/70 uppercase">Email</label>
            <input
              type="email"
              required
              className="w-full p-3 rounded-xl bg-black/30 border border-white/10 outline-none focus:ring-2 focus:ring-emerald-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
            />
          </div>

          <button
            type="submit"
            className="w-full mt-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold shadow-lg"
          >
            Log in
          </button>
        </form>

        <div className="mt-4 text-sm text-center text-white/70">
          New here?{" "}
          <Link className="text-emerald-300 hover:text-emerald-200 font-semibold" to="/signup">
            Create an account
          </Link>
        </div>

        <div className="mt-6 text-center">
          <Link className="text-xs text-white/50 hover:text-white/70" to="/">
            Back to Welcome
          </Link>
        </div>
      </div>
    </div>
  );
}
