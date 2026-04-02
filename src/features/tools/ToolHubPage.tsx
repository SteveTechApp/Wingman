import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  Brain,
  FileUp,
  LayoutGrid,
  ShieldCheck,
  Sparkles,
  Trophy,
  Wand2,
} from "lucide-react";
import "./tool-hub-page.css";

type ToolCard = {
  title: string;
  description: string;
  route: string;
  icon: typeof LayoutGrid;
};

const toolCards: ToolCard[] = [
  {
    title: "Catalogue",
    description: "Browse WyreStorm product categories, review hardware options, and identify suitable solutions.",
    route: "/app/tools/catalog",
    icon: LayoutGrid,
  },
  {
    title: "Competitor Compare",
    description: "Review competitor alternatives and frame WyreStorm against the current opportunity.",
    route: "/app/tools/compare",
    icon: Trophy,
  },
  {
    title: "Video Wall",
    description: "Build video wall concepts, review layout approaches, and support architecture decisions.",
    route: "/app/tools/video-wall",
    icon: LayoutGrid,
  },
  {
    title: "Import Customer Brief",
    description: "Convert customer notes and requirement documents into a structured working brief.",
    route: "/app/tools/import-intake",
    icon: FileUp,
  },
  {
    title: "Product Intelligence",
    description: "Inspect enriched technical guidance, evidence, and internal positioning support.",
    route: "/app/tools/product-intelligence",
    icon: Brain,
  },
  {
    title: "Sales Positioning",
    description: "Build product talk tracks, flash cards, and WyreStorm elevator pitches for live sales conversations.",
    route: "/app/tools/sales",
    icon: ShieldCheck,
  },
  {
    title: "Training Hub",
    description: "Access guided product learning, structured support content, and onboarding material.",
    route: "/app/tools/training",
    icon: BookOpen,
  },
  {
    title: "Guru",
    description: "Ask for guided technical support, architecture direction, and recommendation assistance.",
    route: "/app/tools/guru",
    icon: Wand2,
  },
];

export default function ToolHubPage() {
  const navigate = useNavigate();

  return (
    <div className="wm-toolhub-page">
      <section className="wm-toolhub-hero">
        <div className="wm-toolhub-hero__content">
          <div className="wm-toolhub-hero__eyebrow">Tool Hub</div>
          <h1 className="wm-toolhub-hero__title">
            Choose the correct Wingman workspace for the task in front of you.
          </h1>
          <p className="wm-toolhub-hero__subtitle">
            Work from the actual tool menu only. Open the right module to browse products,
            compare competition, build video wall ideas, import briefs, or ask Guru for help.
          </p>
        </div>

        <div className="wm-toolhub-hero__badge">
          <Sparkles size={16} />
          <span>8 active tool spaces</span>
        </div>
      </section>

      <section className="wm-toolhub-grid" aria-label="Wingman tools">
        {toolCards.map((tool) => {
          const Icon = tool.icon;

          return (
            <button
              key={tool.title}
              type="button"
              className="wm-toolhub-card"
              onClick={() => navigate(tool.route)}
            >
              <div className="wm-toolhub-card__top">
                <div className="wm-toolhub-card__iconWrap">
                  <Icon size={20} strokeWidth={1.9} />
                </div>

                <div className="wm-toolhub-card__copy">
                  <h2 className="wm-toolhub-card__title">{tool.title}</h2>
                  <p className="wm-toolhub-card__description">{tool.description}</p>
                </div>
              </div>

              <div className="wm-toolhub-card__footer">
                <span className="wm-toolhub-card__action">Open tool</span>
                <ArrowRightStub />
              </div>
            </button>
          );
        })}
      </section>
    </div>
  );
}

function ArrowRightStub() {
  return <span className="wm-toolhub-card__arrow">→</span>;
}
