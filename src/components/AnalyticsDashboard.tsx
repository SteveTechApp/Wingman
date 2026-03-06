import * as React from "react";

type Props = {
  projects?: unknown[];
};

export default function AnalyticsDashboard(_props: Props) {
  return (
    <div className="rounded-xl\ border\ border-white/10\ bg-white/5\ p-4\ text-sm">
      <div className="font-medium">Analytics Dashboard</div>
      <div className="mt-1\ opacity-80">
        Temporarily disabled for stabilisation (types out of sync).
      </div>
    </div>
  );
}

