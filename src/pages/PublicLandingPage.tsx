import * as React from "react";
import { Link } from "react-router-dom";
import {
  ClipboardList,
  Boxes,
  FileText,
  Sparkles,
} from "lucide-react";
import heroLogo from "@/assets/branding/heroLogo.png";

export default function PublicLandingPage() {
  return (
    <main style={styles.page}>
      <section style={styles.heroSection}>
        <div style={styles.heroShell}>
          <div style={styles.logoWrap}>
            <img
              src={heroLogo}
              alt="WyreStorm Wingman"
              style={styles.logo}
            />
          </div>

          <h1 style={styles.title}>
            Turn AV requirements into proposal-ready system designs.
          </h1>

          <p style={styles.subtitle}>
            Wingman helps sales and pre-sales teams capture room requirements,
            choose the right WyreStorm architecture, structure a BOM, and move
            opportunities through a consistent workflow.
          </p>

          <div style={styles.ctaRow}>
            <Link to="/signup" style={{ ...styles.button, ...styles.primaryButton }}>
              Create Account
            </Link>

            <Link to="/login" style={{ ...styles.button, ...styles.secondaryButton }}>
              Sign In
            </Link>

            <Link to="/app/dashboard" style={{ ...styles.button, ...styles.secondaryButton }}>
              Open Mission Control
            </Link>
          </div>
        </div>
      </section>

      <section style={styles.featuresSection}>
        <div style={styles.featuresHeader}>
          <div style={styles.featuresTitle}>Sales Toolkit</div>
          <div style={styles.featuresSubtitle}>
            Core tools to move from customer enquiry to solution and proposal output.
          </div>
        </div>

        <div style={styles.featuresGrid}>
          <article style={styles.card}>
            <div style={styles.cardIconWrap}>
              <ClipboardList size={20} />
            </div>
            <div style={styles.cardEyebrow}>Capture</div>
            <h3 style={styles.cardTitle}>Capture requirements</h3>
            <p style={styles.cardText}>
              Start with customer needs, room conditions, source counts, display
              layouts, USB requirements, and control expectations.
            </p>
          </article>

          <article style={styles.card}>
            <div style={styles.cardIconWrap}>
              <Boxes size={20} />
            </div>
            <div style={styles.cardEyebrow}>Design</div>
            <h3 style={styles.cardTitle}>Build the right system</h3>
            <p style={styles.cardText}>
              Guide users toward the correct WyreStorm platform, topology, and
              supporting hardware for the application.
            </p>
          </article>

          <article style={styles.card}>
            <div style={styles.cardIconWrap}>
              <FileText size={20} />
            </div>
            <div style={styles.cardEyebrow}>Deliver</div>
            <h3 style={styles.cardTitle}>Create proposal-ready outputs</h3>
            <p style={styles.cardText}>
              Structure BOMs, produce project-ready documentation, and move from
              enquiry to solution with more consistency.
            </p>
          </article>

          <article style={styles.card}>
            <div style={styles.cardIconWrap}>
              <Sparkles size={20} />
            </div>
            <div style={styles.cardEyebrow}>Sales Toolkit</div>
            <h3 style={styles.cardTitle}>Get live guidance and support</h3>
            <p style={styles.cardText}>
              Use Guru for technical AV answers, Product Intelligence for evidence-backed detail, and Competitor Compare for positioning support.
            </p>
          </article>
        </div>

      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100dvh",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    background:
      "radial-gradient(circle at top, rgba(17, 73, 122, 0.26) 0%, rgba(4, 16, 36, 0.98) 42%, #020814 100%)",
    color: "#eaf2ff",
    padding: "0",
  },

  heroSection: {
    minHeight: "50vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "18px 20px 2px",
  },

  heroShell: {
    width: "100%",
    maxWidth: "940px",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    gap: "0",
  },

  logoWrap: {
    display: "flex",
    justifyContent: "center",
    marginBottom: "8px",
  },

  logo: {
    width: "min(340px, 56vw)",
    height: "auto",
    display: "block",
  },

  title: {
    margin: "0 auto",
    maxWidth: "900px",
    fontSize: "clamp(2.1rem, 4vw, 4.2rem)",
    lineHeight: 0.94,
    letterSpacing: "-0.04em",
    fontWeight: 800,
    color: "#f3f7ff",
  },

  subtitle: {
    margin: "14px auto 0",
    maxWidth: "760px",
    fontSize: "clamp(0.96rem, 1.1vw, 1.12rem)",
    lineHeight: 1.45,
    color: "rgba(224, 234, 248, 0.9)",
  },

  ctaRow: {
    marginTop: "20px",
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    alignItems: "center",
    justifyContent: "center",
  },

  button: {
    minHeight: "42px",
    padding: "0 16px",
    borderRadius: "12px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    textDecoration: "none",
    fontSize: "14px",
    fontWeight: 700,
    transition: "all 160ms ease",
  },

  primaryButton: {
    background: "linear-gradient(90deg, #49e2e8 0%, #24c1d6 100%)",
    color: "#03131d",
    boxShadow: "0 10px 30px rgba(32, 198, 214, 0.25)",
  },

  secondaryButton: {
    background: "rgba(11, 20, 38, 0.86)",
    color: "#f1f6ff",
    border: "1px solid rgba(122, 168, 214, 0.18)",
    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.18)",
  },

  featuresSection: {
    padding: "0 20px 22px",
  },

  featuresHeader: {
    width: "100%",
    maxWidth: "1180px",
    margin: "0 auto 10px",
    textAlign: "left",
  },

  featuresTitle: {
    margin: 0,
    fontSize: "1.08rem",
    fontWeight: 800,
    letterSpacing: "-0.01em",
    color: "#f4f8ff",
  },

  featuresSubtitle: {
    marginTop: "4px",
    fontSize: "0.84rem",
    lineHeight: 1.4,
    color: "rgba(220, 233, 246, 0.8)",
  },

  featuresGrid: {
    width: "100%",
    maxWidth: "1180px",
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "12px",
  },

  card: {
    borderRadius: "18px",
    padding: "14px 15px",
    background: "linear-gradient(180deg, rgba(12, 24, 46, 0.94) 0%, rgba(7, 16, 32, 0.98) 100%)",
    border: "1px solid rgba(109, 160, 214, 0.16)",
    boxShadow: "0 18px 50px rgba(0, 0, 0, 0.22)",
  },

  cardIconWrap: {
    width: "34px",
    height: "34px",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "10px",
    background: "rgba(67, 222, 236, 0.12)",
    border: "1px solid rgba(67, 222, 236, 0.16)",
    color: "#6ce8f3",
  },

  cardEyebrow: {
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "#74dfea",
    marginBottom: "6px",
  },

  cardTitle: {
    margin: "0 0 8px",
    fontSize: "1rem",
    lineHeight: 1.2,
    fontWeight: 700,
    color: "#f4f8ff",
  },

  cardText: {
    margin: 0,
    fontSize: "0.84rem",
    lineHeight: 1.42,
    color: "rgba(219, 230, 244, 0.86)",
  },
};
