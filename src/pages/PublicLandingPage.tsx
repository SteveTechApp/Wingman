import { Link } from "react-router-dom";
import type { CSSProperties } from "react";
import { ArrowRight, Bot, ClipboardList, FileText, Search } from "lucide-react";
import WingmanBrand from "@/components/branding/WingmanBrand";
import GuruAvatar from "@/components/branding/GuruAvatar";

const features = [
  {
    icon: Search,
    title: "Find the right product",
    text: "Use application-led product finding instead of starting from product codes.",
  },
  {
    icon: ClipboardList,
    title: "Capture requirements properly",
    text: "Guide sales teams through the correct discovery structure for AV projects.",
  },
  {
    icon: FileText,
    title: "Build proposals faster",
    text: "Convert selected products and requirements into architecture and proposal output.",
  },
  {
    icon: Bot,
    title: "Use Guru as your AV assistant",
    text: "Get live product, technical and positioning support during real sales conversations.",
  },
];

export default function PublicLandingPage() {
  return (
    <div style={pageStyle}>
      <header style={topBarStyle}>
        <WingmanBrand size="lg" showText />
        <div style={topActionsStyle}>
          <Link to="/login" style={ghostButtonStyle}>
            Log in
          </Link>
          <Link to="/signup" style={primaryButtonStyle}>
            Get started
          </Link>
        </div>
      </header>

      <main style={heroWrapStyle}>
        <section style={heroPanelStyle}>
          <div style={heroCopyStyle}>
            <div style={eyebrowStyle}>WyreStorm Wingman</div>
            <h1 style={titleStyle}>The AV sales and design platform for faster, clearer solution building</h1>
            <div style={bodyStyle}>
              Wingman helps sales and pre-sales teams move from customer requirement to product selection, architecture and proposal output with less dependency on senior engineering support.
            </div>

            <div style={actionRowStyle}>
              <Link to="/signup" style={primaryButtonStyle}>
                Start with Wingman
              </Link>
              <Link to="/login" style={ghostButtonStyle}>
                Open existing workspace
              </Link>
            </div>

            <div style={heroInfoRowStyle}>
              <span style={heroChipStyle}>Quick reference tools</span>
              <span style={heroChipStyle}>Formal proposal workflows</span>
              <span style={heroChipStyle}>Guru AV assistant</span>
            </div>
          </div>

          <div style={heroVisualStyle}>
            <div style={visualCardStyle}>
              <div style={visualHeadStyle}>
                <WingmanBrand size="sm" showText={false} />
                <div style={visualTitleStyle}>Wingman Workspace</div>
              </div>

              <div style={modeGridStyle}>
                <div style={quickModeCardStyle}>
                  <div style={modeCardTitleStyle}>Quick Reference</div>
                  <div style={modeCardTextStyle}>Product Finder, Guru, Compare, Navigator</div>
                </div>

                <div style={workflowModeCardStyle}>
                  <div style={modeCardTitleStyle}>Workflow</div>
                  <div style={modeCardTextStyle}>Discovery, Templates, Proposal, Project Outputs</div>
                </div>
              </div>

              <div style={guruFeatureCardStyle}>
                <GuruAvatar size={54} rounded={14} />
                <div style={guruFeatureCopyStyle}>
                  <div style={modeCardTitleStyle}>Guru Assistant</div>
                  <div style={modeCardTextStyle}>
                    Page-aware AV helper for product explanation, design guidance and sales support.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section style={featureGridStyle}>
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <article key={feature.title} style={featureCardStyle}>
                <div style={featureIconWrapStyle}>
                  <Icon size={18} />
                </div>
                <div style={featureTitleStyle}>{feature.title}</div>
                <div style={featureTextStyle}>{feature.text}</div>
              </article>
            );
          })}
        </section>

        <section style={ctaPanelStyle}>
          <div>
            <div style={ctaTitleStyle}>Move from discovery to design to proposal</div>
            <div style={ctaTextStyle}>
              Wingman is built for real AV sales support, not generic chat.
            </div>
          </div>
          <Link to="/signup" style={ctaButtonStyle}>
            Create workspace
            <ArrowRight size={15} />
          </Link>
        </section>
      </main>
    </div>
  );
}

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  background: "radial-gradient(circle at top, rgba(30,64,175,0.10), transparent 26%), linear-gradient(180deg, #07111f, #081221)",
  color: "#e5eef8",
  padding: 18,
};

const topBarStyle: CSSProperties = {
  maxWidth: 1320,
  margin: "0 auto 18px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
};

const topActionsStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
};

const heroWrapStyle: CSSProperties = {
  maxWidth: 1320,
  margin: "0 auto",
  display: "grid",
  gap: 16,
};

const heroPanelStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.1fr 0.9fr",
  gap: 16,
  borderRadius: 24,
  padding: 22,
  border: "1px solid rgba(96,165,250,0.18)",
  background: "linear-gradient(135deg, rgba(15,23,42,0.94), rgba(30,41,59,0.84))",
  boxShadow: "0 24px 60px rgba(2,8,23,0.34)",
};

const heroCopyStyle: CSSProperties = {
  display: "grid",
  gap: 14,
  alignContent: "center",
};

const eyebrowStyle: CSSProperties = {
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: 1.4,
  opacity: 0.74,
  fontWeight: 800,
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: 44,
  lineHeight: 1.02,
  fontWeight: 900,
  maxWidth: 720,
};

const bodyStyle: CSSProperties = {
  fontSize: 16,
  lineHeight: 1.6,
  opacity: 0.88,
  maxWidth: 680,
};

const actionRowStyle: CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};

const primaryButtonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 42,
  padding: "0 16px",
  borderRadius: 12,
  border: "1px solid rgba(249,115,22,0.30)",
  background: "linear-gradient(180deg, rgba(249,115,22,0.90), rgba(194,65,12,0.92))",
  color: "#fff",
  textDecoration: "none",
  fontWeight: 800,
  fontSize: 14,
};

const ghostButtonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 42,
  padding: "0 16px",
  borderRadius: 12,
  border: "1px solid rgba(148,163,184,0.16)",
  background: "rgba(255,255,255,0.05)",
  color: "inherit",
  textDecoration: "none",
  fontWeight: 700,
  fontSize: 14,
};

const heroInfoRowStyle: CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

const heroChipStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "5px 10px",
  borderRadius: 999,
  fontSize: 11,
  background: "rgba(255,255,255,0.07)",
  border: "1px solid rgba(255,255,255,0.10)",
};

const heroVisualStyle: CSSProperties = {
  display: "grid",
  alignContent: "center",
};

const visualCardStyle: CSSProperties = {
  borderRadius: 20,
  padding: 18,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "linear-gradient(180deg, rgba(8,16,30,0.88), rgba(8,14,24,0.96))",
  boxShadow: "0 20px 40px rgba(2,8,23,0.32)",
  display: "grid",
  gap: 14,
};

const visualHeadStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
};

const visualTitleStyle: CSSProperties = {
  fontSize: 15,
  fontWeight: 900,
};

const modeGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 10,
};

const quickModeCardStyle: CSSProperties = {
  borderRadius: 16,
  padding: 14,
  border: "1px solid rgba(14,165,233,0.22)",
  background: "linear-gradient(180deg, rgba(9,53,72,0.82), rgba(10,25,34,0.94))",
  display: "grid",
  gap: 6,
};

const workflowModeCardStyle: CSSProperties = {
  borderRadius: 16,
  padding: 14,
  border: "1px solid rgba(20,184,166,0.22)",
  background: "linear-gradient(180deg, rgba(7,44,46,0.84), rgba(10,27,34,0.94))",
  display: "grid",
  gap: 6,
};

const guruFeatureCardStyle: CSSProperties = {
  borderRadius: 16,
  padding: 14,
  border: "1px solid rgba(249,115,22,0.22)",
  background: "linear-gradient(180deg, rgba(89,36,9,0.74), rgba(33,20,11,0.94))",
  display: "grid",
  gridTemplateColumns: "auto 1fr",
  gap: 12,
  alignItems: "center",
};

const guruFeatureCopyStyle: CSSProperties = {
  display: "grid",
  gap: 4,
};

const modeCardTitleStyle: CSSProperties = {
  fontSize: 14,
  fontWeight: 900,
};

const modeCardTextStyle: CSSProperties = {
  fontSize: 13,
  lineHeight: 1.45,
  opacity: 0.86,
};

const featureGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 12,
};

const featureCardStyle: CSSProperties = {
  borderRadius: 18,
  padding: 16,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "linear-gradient(180deg, rgba(15,23,42,0.74), rgba(8,14,24,0.88))",
  boxShadow: "0 14px 28px rgba(2,8,23,0.22)",
  display: "grid",
  gap: 10,
};

const featureIconWrapStyle: CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 12,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(249,115,22,0.14)",
  border: "1px solid rgba(249,115,22,0.22)",
};

const featureTitleStyle: CSSProperties = {
  fontSize: 16,
  fontWeight: 900,
};

const featureTextStyle: CSSProperties = {
  fontSize: 13,
  lineHeight: 1.5,
  opacity: 0.86,
};

const ctaPanelStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 14,
  borderRadius: 20,
  padding: 18,
  border: "1px solid rgba(168,85,247,0.18)",
  background: "linear-gradient(180deg, rgba(45,20,75,0.76), rgba(24,14,42,0.94))",
};

const ctaTitleStyle: CSSProperties = {
  fontSize: 24,
  fontWeight: 900,
  lineHeight: 1.1,
};

const ctaTextStyle: CSSProperties = {
  marginTop: 6,
  fontSize: 14,
  opacity: 0.84,
};

const ctaButtonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  minHeight: 44,
  padding: "0 16px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(255,255,255,0.08)",
  color: "inherit",
  textDecoration: "none",
  fontWeight: 800,
};