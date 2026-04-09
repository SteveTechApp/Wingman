import { useMemo, type CSSProperties } from "react";
import { ArrowRight, MessageSquareText, PackageSearch, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

import GuruAvatar from "@/components/branding/GuruAvatar";
import {
  WingmanEmptyState,
  WingmanPageFrame,
  WingmanSection,
} from "@/components/wm";
import GuruDock from "@/features/ai/guru/GuruDock";

type GuruContext = {
  prompt?: string;
  requirements?: {
    application?: string;
    roomType?: string;
  };
  product?: {
    sku?: string;
    name?: string;
    family?: string;
    series?: string;
  };
};

function readContext(): GuruContext | null {
  try {
    const raw = localStorage.getItem("wm:guru:catalog-context");
    if (!raw) return null;
    return JSON.parse(raw) as GuruContext;
  } catch {
    return null;
  }
}

export default function GuruToolHostPage() {
  const context = useMemo(() => readContext(), []);

  const contextPills = [
    context?.product?.sku,
    context?.product?.family,
    context?.product?.series,
    context?.requirements?.application,
    context?.requirements?.roomType,
  ].filter(Boolean) as string[];

  return (
    <div className="wm-page">
      <WingmanPageFrame
        eyebrow={
          <span className="wm-flex">
            <Sparkles size={14} />
            <span>Quick Reference</span>
          </span>
        }
        title={
          <span style={titleWrapStyle}>
            <GuruAvatar size={42} rounded={14} />
            <span>Guru</span>
          </span>
        }
        subtitle="Use the same shared shell as the rest of Wingman, but switch into a chat-first workspace when you need live sales, product or design guidance."
        actions={
          <div className="wm-flex">
            <Link to="/app/tools/catalog" className="wm-btn wm-btn--secondary">
              Product Finder
            </Link>
            <Link to="/app/tools/proposal" className="wm-btn wm-btn--brand">
              Proposal Builder
            </Link>
          </div>
        }
        toolbar={
          <div className="wm-between" style={{ width: "100%" }}>
            <div className="wm-soft">Guru stays chat-first here and floats as a draggable assistant everywhere else.</div>
            <div className="wm-page-inline-list">
              {contextPills.length > 0 ? (
                contextPills.map((item) => <span key={item} className="wm-workspace-tag">{item}</span>)
              ) : (
                <span className="wm-workspace-tag">No current handoff</span>
              )}
            </div>
          </div>
        }
      >
        <div style={workspaceStyle}>
          <div style={chatColumnStyle}>
            <WingmanSection
              brand
              eyebrow="Conversation"
              title="Ask Guru anything"
              description="The conversation is route-aware, keeps suggested follow-ups visible, and links answers back into the rest of the app."
            >
              <div className="wm-surface" style={chatSurfaceStyle}>
                <GuruDock />
              </div>
            </WingmanSection>
          </div>

          <aside style={railStyle}>
            <WingmanSection
              eyebrow="Context"
              title="Current handoff"
              description="Guru can work from product and requirement context when another tool has already handed information over."
            >
              {context ? (
                <div className="wm-stack-sm">
                  <div className="wm-stat">
                    <p className="wm-stat__label">Pinned product</p>
                    <p className="wm-stat__value" style={statValueStyle}>
                      {context.product?.sku || "None"}
                    </p>
                    <p className="wm-stat__meta">
                      {context.product?.name || "No product is pinned to the conversation yet."}
                    </p>
                  </div>

                  <div className="wm-grid wm-grid--2">
                    <div className="wm-stat">
                      <p className="wm-stat__label">Application</p>
                      <p className="wm-stat__value" style={statValueStyle}>
                        {context.requirements?.application || "Not set"}
                      </p>
                    </div>

                    <div className="wm-stat">
                      <p className="wm-stat__label">Room type</p>
                      <p className="wm-stat__value" style={statValueStyle}>
                        {context.requirements?.roomType || "Not set"}
                      </p>
                    </div>
                  </div>

                  {context.prompt ? (
                    <div className="wm-stat">
                      <p className="wm-stat__label">Last prompt</p>
                      <p className="wm-stat__meta">{context.prompt}</p>
                    </div>
                  ) : null}
                </div>
              ) : (
                <WingmanEmptyState
                  title="No handoff loaded"
                  body="Open Guru from Product Finder or another tool to carry that working context straight into the chat."
                />
              )}
            </WingmanSection>

            <WingmanSection
              eyebrow="Best Use"
              title="Keep Guru conversational"
              description="Guru is strongest when you use it like a working chat instead of a static page."
            >
              <div className="wm-stack-sm">
                <div className="wm-stat">
                  <p className="wm-stat__label">
                    <MessageSquareText size={14} style={inlineIconStyle} />
                    Ask
                  </p>
                  <p className="wm-stat__meta">Positioning, objections, architecture tradeoffs and quick product guidance.</p>
                </div>

                <div className="wm-stat">
                  <p className="wm-stat__label">
                    <PackageSearch size={14} style={inlineIconStyle} />
                    Verify
                  </p>
                  <p className="wm-stat__meta">Check whether a product family or transport direction actually fits the job.</p>
                </div>

                <Link to="/app/tools/catalog" className="wm-btn wm-btn--secondary">
                  Continue in Product Finder
                  <ArrowRight size={16} />
                </Link>
              </div>
            </WingmanSection>
          </aside>
        </div>
      </WingmanPageFrame>
    </div>
  );
}

const workspaceStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 320px",
  gap: 16,
  alignItems: "start",
};

const chatColumnStyle: CSSProperties = {
  minWidth: 0,
};

const railStyle: CSSProperties = {
  display: "grid",
  gap: 16,
  alignContent: "start",
};

const chatSurfaceStyle: CSSProperties = {
  height: "min(76vh, 860px)",
  overflow: "hidden",
  borderRadius: 18,
};

const titleWrapStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 12,
};

const statValueStyle: CSSProperties = {
  fontSize: 18,
};

const inlineIconStyle: CSSProperties = {
  display: "inline-block",
  verticalAlign: "text-bottom",
  marginRight: 6,
};
