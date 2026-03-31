import { useState } from "react";
import "./tool-hub-saas.css";

type ToolCard = {
  title: string;
  description: string;
  route: string;
};

const tools: ToolCard[] = [
  {
    title: "System Designer",
    description: "Build AV system architectures and validate signal flow.",
    route: "/app/tools/designer",
  },
  {
    title: "Video Wall Planner",
    description: "Design LED/LCD walls and layout processing.",
    route: "/app/tools/video-wall",
  },
];

export default function ToolHubPage() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="wm-toolhub">
      <h1>Tool Hub</h1>

      <div className="wm-toolhub-grid">
        {tools.map((tool) => (
          <div
            key={tool.title}
            className="wm-toolhub-card"
            onClick={() => setSelected(tool.title)}
          >
            <h3>{tool.title}</h3>
            <p>{tool.description}</p>
          </div>
        ))}
      </div>

      {selected && (
        <div className="wm-inspector">
          <h3>Selected Tool</h3>
          <p>{selected}</p>
        </div>
      )}
    </div>
  );
}