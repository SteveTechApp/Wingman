import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { clearTemplateSeed, writeTemplateSeed } from "@/app/schema/templateSeed";
import { WM_ROUTES } from "@/core/wingman/routeMap";
import {
  buildWorkbenchTemplateSeed,
  ROOM_TEMPLATE_CATEGORY_ORDER,
  ROOM_TEMPLATE_LIBRARY,
  roomTemplateSearchBlob,
  type RoomTemplateCategory,
} from "./roomTemplateLibrary";
import "./templates-page.css";

type CategoryFilter = "All Rooms" | RoomTemplateCategory;

function toolLabel(path: string): string {
  if (path === WM_ROUTES.roomWizard) return "Room Wizard";
  if (path === WM_ROUTES.videowall) return "Video Wall Planner";
  if (path === WM_ROUTES.proposals) return "Proposal Builder";
  return "Product Catalogue";
}

function scaleLabel(tier: "bronze" | "silver" | "gold"): string {
  if (tier === "bronze") return "Compact starter";
  if (tier === "gold") return "Complex room";
  return "Balanced room";
}

export default function TemplatesPage() {
  const navigate = useNavigate();
  const [category, setCategory] = useState<CategoryFilter>("All Rooms");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(ROOM_TEMPLATE_LIBRARY[0]?.id ?? "");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const visibleTemplates = useMemo(() => {
    return ROOM_TEMPLATE_LIBRARY.filter((template) => {
      if (category !== "All Rooms" && template.category !== category) {
        return false;
      }

      if (!deferredQuery) {
        return true;
      }

      return roomTemplateSearchBlob(template).includes(deferredQuery);
    });
  }, [category, deferredQuery]);

  useEffect(() => {
    if (visibleTemplates.length === 0) return;
    if (!visibleTemplates.some((template) => template.id === selectedId)) {
      setSelectedId(visibleTemplates[0]!.id);
    }
  }, [selectedId, visibleTemplates]);

  const activeTemplate =
    visibleTemplates.find((template) => template.id === selectedId) ?? visibleTemplates[0] ?? null;

  function loadTemplateStarter() {
    if (!activeTemplate) return;
    writeTemplateSeed(buildWorkbenchTemplateSeed(activeTemplate));
    navigate(WM_ROUTES.projectLauncher);
  }

  function startBlankProject() {
    clearTemplateSeed();
    navigate(WM_ROUTES.projectLauncher);
  }

  return (
    <div className="wm-templates-page">
      <section className="wm-templates-page__hero">
        <div className="wm-templates-page__hero-copy">
          <div className="wm-templates-page__eyebrow">Templates</div>
          <h1>Choose a room type.</h1>
          <p>
            Start with the room or venue the customer actually recognizes. Wingman will preload the likely sources,
            outputs, transport assumptions, audio expectations, control style, and WyreStorm direction from there.
          </p>
        </div>

        <div className="wm-templates-page__hero-metrics">
          <div className="wm-templates-page__metric">
            <span>Room starters</span>
            <strong>{ROOM_TEMPLATE_LIBRARY.length}</strong>
          </div>
          <div className="wm-templates-page__metric">
            <span>Sectors</span>
            <strong>{ROOM_TEMPLATE_CATEGORY_ORDER.length - 1}</strong>
          </div>
          <div className="wm-templates-page__metric">
            <span>Next step</span>
            <strong>Project launcher</strong>
          </div>
        </div>
      </section>

      <section className="wm-templates-page__workspace">
        <aside className="wm-templates-page__browser">
          <div className="wm-templates-page__step">
            <span className="wm-templates-page__step-number">1</span>
            <div>
              <h2>Pick the closest room type</h2>
              <p>Use the room and venue pattern first. Avoid starting with products, tiers, or architecture jargon.</p>
            </div>
          </div>

          <div className="wm-templates-page__controls">
            <label className="wm-templates-page__search">
              <span>Search room types</span>
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Boardroom, classroom, pub, sports bar..."
              />
            </label>

            <div className="wm-templates-page__filters">
              {ROOM_TEMPLATE_CATEGORY_ORDER.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={
                    option === category
                      ? "wm-templates-page__filter wm-templates-page__filter--active"
                      : "wm-templates-page__filter"
                  }
                  onClick={() => setCategory(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="wm-templates-page__list-head">
            <span>{visibleTemplates.length} matching room types</span>
            {deferredQuery ? <button type="button" onClick={() => setQuery("")}>Clear search</button> : null}
          </div>

          {visibleTemplates.length > 0 ? (
            <div className="wm-templates-page__list">
              {visibleTemplates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  className={
                    template.id === activeTemplate?.id
                      ? "wm-templates-page__list-item wm-templates-page__list-item--active"
                      : "wm-templates-page__list-item"
                  }
                  onClick={() => setSelectedId(template.id)}
                >
                  <div className="wm-templates-page__list-item-top">
                    <span className="wm-templates-page__list-item-category">{template.category}</span>
                    <span className="wm-templates-page__list-item-scale">{scaleLabel(template.templateTier)}</span>
                  </div>
                  <strong>{template.roomType}</strong>
                  <p>{template.summary}</p>
                  <div className="wm-templates-page__list-item-meta">
                    <span>{template.ioProfile.sources}</span>
                    <span>{template.ioProfile.outputs}</span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="wm-templates-page__empty">
              <h3>No room types match that search.</h3>
              <p>Try a broader room name like "meeting room", "classroom", or "sports bar".</p>
            </div>
          )}
        </aside>

        <section className="wm-templates-page__detail">
          {activeTemplate ? (
            <>
              <div className="wm-templates-page__step">
                <span className="wm-templates-page__step-number">2</span>
                <div>
                  <h2>Review what Wingman will preload</h2>
                  <p>Each room starter carries realistic AV assumptions forward into the project launcher.</p>
                </div>
              </div>

              <div className="wm-templates-page__detail-hero">
                <div className="wm-templates-page__detail-copy">
                  <div className="wm-templates-page__detail-kicker">
                    <span>{activeTemplate.vertical}</span>
                    <span>{scaleLabel(activeTemplate.templateTier)}</span>
                  </div>
                  <h3>{activeTemplate.roomType}</h3>
                  <p>{activeTemplate.designPurpose}</p>
                </div>

                <div className="wm-templates-page__detail-metrics">
                  <div className="wm-templates-page__detail-metric">
                    <span>Inputs</span>
                    <strong>{activeTemplate.ioProfile.sources}</strong>
                  </div>
                  <div className="wm-templates-page__detail-metric">
                    <span>Outputs</span>
                    <strong>{activeTemplate.ioProfile.outputs}</strong>
                  </div>
                  <div className="wm-templates-page__detail-metric">
                    <span>Operators</span>
                    <strong>{activeTemplate.ioProfile.operators}</strong>
                  </div>
                  <div className="wm-templates-page__detail-metric">
                    <span>Next tool</span>
                    <strong>{toolLabel(activeTemplate.recommendedTool)}</strong>
                  </div>
                </div>
              </div>

              <div className="wm-templates-page__chip-row">
                {activeTemplate.recommendedFamilies.map((family) => (
                  <span key={family} className="wm-templates-page__chip">
                    {family}
                  </span>
                ))}
              </div>

              <div className="wm-templates-page__detail-grid">
                <section className="wm-templates-page__panel">
                  <h4>Likely input sources</h4>
                  <ul>
                    {activeTemplate.sourceTypes.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>

                <section className="wm-templates-page__panel">
                  <h4>Likely outputs</h4>
                  <ul>
                    {activeTemplate.outputTypes.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>

                <section className="wm-templates-page__panel">
                  <h4>Preloaded AV assumptions</h4>
                  <ul>
                    <li>{activeTemplate.transportProfile}</li>
                    <li>{activeTemplate.audioProfile}</li>
                    <li>{activeTemplate.controlProfile}</li>
                    {activeTemplate.assumptions.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>

                <section className="wm-templates-page__panel">
                  <h4>Included system direction</h4>
                  <ul>
                    {activeTemplate.includedSystems.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>
              </div>

              <div className="wm-templates-page__panel wm-templates-page__panel--wide">
                <div className="wm-templates-page__panel-head">
                  <div>
                    <h4>Why this starter is useful</h4>
                    <p>{activeTemplate.story}</p>
                  </div>
                  <div className="wm-templates-page__uplift">
                    {activeTemplate.uplift.map((item) => (
                      <span key={item}>{item}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="wm-templates-page__step">
                <span className="wm-templates-page__step-number">3</span>
                <div>
                  <h2>Start from this room type</h2>
                  <p>Wingman will carry these assumptions into the project launcher so you can add the customer and site details without rebuilding the room logic.</p>
                </div>
              </div>

              <div className="wm-templates-page__actions">
                <button type="button" className="wm-btn-primary" onClick={loadTemplateStarter}>
                  Use This Room Type
                </button>
                <button type="button" className="wm-btn-secondary" onClick={startBlankProject}>
                  Start Blank Project
                </button>
              </div>
            </>
          ) : (
            <div className="wm-templates-page__empty">
              <h3>Select a room type to continue.</h3>
              <p>The detail panel will show the preloaded AV assumptions once a room type is selected.</p>
            </div>
          )}
        </section>
      </section>
    </div>
  );
}
