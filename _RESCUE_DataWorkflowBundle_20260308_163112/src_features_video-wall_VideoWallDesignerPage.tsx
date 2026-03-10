import * as React from "react";
import PageFrame from "@/app/layout/PageFrame";
import PageSection from "@/app/layout/PageSection";

function Stat({
  label,
  value,
  meta,
}: {
  label: string;
  value: string;
  meta: string;
}) {
  return (
    <div className="wm-stat wm-stat--compact">
      <span className="wm-stat__label">{label}</span>
      <span className="wm-stat__value">{value}</span>
      <span className="wm-stat__meta">{meta}</span>
    </div>
  );
}

export default function VideoWallDesignerPage() {
  return (
    <PageFrame
      title="VideoWall Designer"
      subtitle="Plan LCD and LED wall concepts, array layouts, processor thinking, and supporting signal flow."
    >
      <div className="wm-dashboard">
        <div className="wm-dashboard__stats">
          <Stat label="Wall Type" value="LCD / LED" meta="Support both tiled display and direct-view LED concepts." />
          <Stat label="Layouts" value="2x2+" meta="Use standard array sizes as the design starting point." />
          <Stat label="Processing" value="Mapped" meta="Capture scaling, switching, and controller needs." />
          <Stat label="Outputs" value="Ready" meta="Prepare design logic for proposal and BOM follow-on." />
        </div>

        <PageSection compact>
          <div className="wm-instrumentHero">
            <div className="wm-instrumentHero__main">
              <span className="wm-kicker">Wall Design Control</span>
              <h2>Build the wall concept first</h2>
              <p>
                Start with wall type, array size, pixel pitch or bezel logic, source count,
                controller requirement, and signal path before selecting products.
              </p>
            </div>

            <div className="wm-instrumentHero__status">
              <div className="wm-statusTile">
                <strong>Best Use</strong>
                <span>2x2, 3x3, large LCD walls, LED walls, processor-led designs, and source layout planning.</span>
              </div>
              <div className="wm-statusTile">
                <strong>Next Output</strong>
                <span>Use this page to prepare product selection, signal flow, and proposal framing.</span>
              </div>
            </div>
          </div>
        </PageSection>

        <PageSection
          title="Wall Design Modules"
          subtitle="Use these modules to structure the design conversation."
          compact
        >
          <div className="wm-panelGroup">
            <div className="wm-panelTool">
              <div className="wm-panelTool__rail">
                <span className="wm-panelTool__index">01</span>
                <span className="wm-panelTool__tag">Wall Type</span>
              </div>
              <div className="wm-panelTool__main">
                <h3>LCD or LED</h3>
                <p>Decide whether the project is tiled LCD, direct-view LED, or an alternative large-format approach.</p>
              </div>
            </div>

            <div className="wm-panelTool">
              <div className="wm-panelTool__rail">
                <span className="wm-panelTool__index">02</span>
                <span className="wm-panelTool__tag">Array</span>
              </div>
              <div className="wm-panelTool__main">
                <h3>Layout & Size</h3>
                <p>Capture 2x2, 3x3, 4x4 and larger arrays, plus aspect ratio and physical wall intent.</p>
              </div>
            </div>

            <div className="wm-panelTool">
              <div className="wm-panelTool__rail">
                <span className="wm-panelTool__index">03</span>
                <span className="wm-panelTool__tag">Processing</span>
              </div>
              <div className="wm-panelTool__main">
                <h3>Controller Logic</h3>
                <p>Determine multiview, scaling, windowing, source switching, and processor requirement.</p>
              </div>
            </div>

            <div className="wm-panelTool">
              <div className="wm-panelTool__rail">
                <span className="wm-panelTool__index">04</span>
                <span className="wm-panelTool__tag">Signal Path</span>
              </div>
              <div className="wm-panelTool__main">
                <h3>Transport & Outputs</h3>
                <p>Map source flow, controller connectivity, output count, extension method, and rack/display positions.</p>
              </div>
            </div>
          </div>
        </PageSection>

        <PageSection
          title="What to capture"
          subtitle="These are the most important inputs for strong wall-design guidance."
          compact
        >
          <div className="wm-toolboxLayout">
            <div className="wm-tbHero__main">
              <span className="wm-kicker">Key Inputs</span>
              <h2>Collect the critical wall data early</h2>
              <p>
                Wall type, physical size, viewing distance, bezel or pixel pitch expectations,
                source count, multiview needs, and control expectations should all be defined up front.
              </p>
            </div>

            <div className="wm-tbHero__flow">
              <div className="wm-tbFlow__label">Recommended sequence</div>
              <div className="wm-tbFlow__rail">
                <span>Wall Type</span>
                <span>Layout</span>
                <span>Processing</span>
                <span>Outputs</span>
              </div>
              <div className="wm-tbFlow__note">
                Follow this sequence before moving into product catalog, BOM, or proposal output.
              </div>
            </div>
          </div>
        </PageSection>
      </div>
    </PageFrame>
  );
}