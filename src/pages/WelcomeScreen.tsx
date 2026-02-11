
import React from "react";
import { Link } from "react-router-dom";

import DefaultWelcome from "../components/welcome/DefaultWelcome";
import ToolGrid from "@/components/app/tools/ToolGrid";

const WelcomeScreen: React.FC = () => {
  return (
    <>
      <DefaultWelcome />

      <div className="mt-6\ rounded-2xl\ border\ border-white/10\ bg-black/20\ p-4">
        <div className="flex\ flex-wrap\ items-center\ justify-between\ gap-3">
          <div>
            <div className="text-\[11px]\ font-bold\ uppercase\ tracking-widest\ text-emerald-100/70">
              Start here
            </div>
            <div className="mt-1\ text-white\ font-semibold">
              New to Wingman? Begin with Project Setup.
            </div>
            <div className="mt-1\ text-xs\ text-emerald-100/60">
              Capture the project basics first, then use templates and tools to refine the design.
            </div>
          </div>

          <Link
            to="/app/setup"
            className="h-11\ inline-flex\ items-center\ justify-center\ rounded-xl\ bg-emerald-400\ px-4\ text-sm\ font-semibold\ text-emerald-950\ hover:bg-emerald-300"
          >
            Start Project Setup
          </Link>
        </div>
      </div>

      <div className="mt-6">
        <ToolGrid pinPrimary />
      </div>
    </>
  );
};

export default WelcomeScreen;



