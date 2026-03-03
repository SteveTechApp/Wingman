import React from "react";
import { Link } from "react-router-dom";

type ToolItem = { title: string; to: string; description?: string };

const DEFAULT_TOOLS: ToolItem[] = [
  { title: "Video Wall", to: "/app/tools/videowall", description: "Plan LCD or LED video wall systems." },
  { title: "Proposal Builder", to: "/app/tools/proposal", description: "Build proposals and BOMs." },
  { title: "Room Wizard", to: "/app/tools/room", description: "Capture room requirements and I/O." },
  { title: "Training Hub", to: "/app/tools/training", description: "Guides, playbooks and quick help." }
];

export default function ToolGrid({ tools = DEFAULT_TOOLS }: { tools?: ToolItem[] }) {
  return (
    <div className="wm-grid">
      {tools.map(t => (
        <Link key={t.to} to={t.to} className="wm-card wm-card-pad wm-card-hover">
          <div className="wm-h3">{t.title}</div>
          {t.description ? <div className="wm-muted">{t.description}</div> : null}
        </Link>
      ))}
    </div>
  );
}