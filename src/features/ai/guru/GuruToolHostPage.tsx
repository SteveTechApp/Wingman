import { useMemo, useState, type CSSProperties } from "react";
import { Lightbulb, MessageSquareText, PackageSearch, Sparkles } from "lucide-react";
import GuruAvatar from "@/components/branding/GuruAvatar";

type GuruContext = {
  source?: string;
  prompt?: string;
  requirements?: {
    application?: string;
    roomType?: string;
    sourceCount?: number;
    displayCount?: number;
    usbRequired?: boolean;
    audioRequired?: boolean;
    controlRequired?: boolean;
  };
  endpointChoice?: {
    encoderSku?: string;
    decoderSku?: string;
    transceiverSku?: string;
    specialistSku?: string;
  };
  product?: {
    sku?: string;
    name?: string;
    family?: string;
    series?: string;
    reasons?: string[];
    summary?: string;
  };
};

type GuruAnswer = {
  headline: string;
  positioning: string[];
  technical: string[];
  nextSteps: string[];
};

type GuruToolHostPageProps = {
  compact?: boolean;
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

function buildLocalAnswer(question: string, context: GuruContext | null): GuruAnswer {
  const product = context?.product;
  const requirements = context?.requirements;
  const endpointChoice = context?.endpointChoice;
  const reasons = Array.isArray(product?.reasons) ? product.reasons : [];

  const headline = product?.sku
    ? `${product.sku} looks like a strong fit for this requirement.`
    : "Here is a structured AV sales and design response.";

  const positioning = [
    product?.name ? `${product.name} can be positioned as the primary solution device in this requirement.` : "Start from the application and customer objective rather than the product alone.",
    product?.family ? `${product.family}${product?.series ? ` / ${product.series}` : ""} aligns with the likely architecture direction.` : "Confirm the correct architecture first, then narrow the actual endpoint mix.",
    reasons.length > 0 ? `The strongest fit signals are: ${reasons.join(", ")}.` : "Use captured requirement data to explain why the recommendation is relevant.",
  ].filter(Boolean);

  const technical = [
    requirements?.application ? `Application context: ${requirements.application}.` : "",
    requirements?.roomType ? `Room type: ${requirements.roomType}.` : "",
    typeof requirements?.sourceCount === "number" ? `Source count: ${requirements.sourceCount}.` : "",
    typeof requirements?.displayCount === "number" ? `Display count: ${requirements.displayCount}.` : "",
    requirements?.usbRequired ? "USB workflow is part of the requirement and should be confirmed in the endpoint design." : "",
    requirements?.audioRequired ? "Audio workflow is required and should be validated as part of the final signal path." : "",
    requirements?.controlRequired ? "Control integration is expected and should be included in the final design and proposal." : "",
    endpointChoice?.encoderSku ? `Selected encoder: ${endpointChoice.encoderSku}.` : "",
    endpointChoice?.decoderSku ? `Selected decoder: ${endpointChoice.decoderSku}.` : "",
    endpointChoice?.transceiverSku ? `Selected transceiver: ${endpointChoice.transceiverSku}.` : "",
    endpointChoice?.specialistSku ? `Specialist device: ${endpointChoice.specialistSku}.` : "",
    product?.summary ? product.summary : "",
  ].filter(Boolean);

  const nextSteps = [
    "Use Product Finder if the requirement still needs narrowing.",
    "Move to Proposal Builder when the opportunity needs customer-facing output.",
    question.trim() ? `Keep the answer focused on: "${question.trim()}".` : "Keep the response application-driven, concise and commercially useful.",
  ];

  return {
    headline,
    positioning,
    technical,
    nextSteps,
  };
}

export default function GuruToolHostPage({ compact = false }: GuruToolHostPageProps) {
  const context = useMemo(() => readContext(), []);
  const [question, setQuestion] = useState(context?.prompt || "");
  const answer = useMemo(() => buildLocalAnswer(question, context), [question, context]);

  const quickPrompts = [
    "Why is this the right product?",
    "How should I explain this to a customer?",
    "What are the likely objections?",
    "What should I confirm before quoting?",
  ];

  return (
    <div style={compact ? compactPageStyle : pageStyle}>
      <div style={compact ? compactLayoutStyle : layoutStyle}>
        <aside style={compact ? compactLeftRailStyle : leftRailStyle}>
          {!compact ? (
            <section style={heroStyle}>
              <div style={guruBadgeWrapStyle}>
                <GuruAvatar size={58} rounded={16} />
                <div>
                  <div style={eyebrowStyle}>AI Guru Expert</div>
                  <h1 style={titleStyle}>Your AV designer and general AV assistant</h1>
                </div>
              </div>

              <div style={bodyStyle}>
                Ask short, practical questions and scan the response in sections rather than reading a long text block.
              </div>
            </section>
          ) : (
            <section style={compactHeroStyle}>
              <GuruAvatar size={40} rounded={12} />
              <div>
                <div style={compactHeroTitleStyle}>Guru</div>
                <div style={compactHeroTextStyle}>Quick AV support</div>
              </div>
            </section>
          )}

          <section style={contextPanelStyle}>
            <div style={sectionEyebrowStyle}>Context</div>

            <div style={chipWrapStyle}>
              {context?.product?.sku ? <span style={chipStyle}>{context.product.sku}</span> : null}
              {context?.product?.family ? <span style={chipStyle}>{context.product.family}</span> : null}
              {context?.product?.series ? <span style={chipStyle}>{context.product.series}</span> : null}
              {context?.requirements?.application ? <span style={chipStyle}>{context.requirements.application}</span> : null}
              {context?.requirements?.roomType ? <span style={chipStyle}>{context.requirements.roomType}</span> : null}
            </div>

            <div style={miniTextStyle}>
              {context?.product?.name || "No handoff product loaded."}
            </div>
          </section>

          <section style={promptPanelStyle}>
            <div style={sectionEyebrowStyle}>Ask Guru</div>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              style={compact ? compactTextareaStyle : textareaStyle}
              placeholder="Ask for positioning, design help, objection handling or AV guidance..."
            />

            <div style={chipWrapStyle}>
              {quickPrompts.map((prompt) => (
                <button key={prompt} type="button" style={promptChipStyle} onClick={() => setQuestion(prompt)}>
                  {prompt}
                </button>
              ))}
            </div>
          </section>
        </aside>

        <main style={mainStyle}>
          <section style={answerHeroStyle}>
            <div style={answerHeroTitleStyle}>
              <Sparkles size={16} />
              <span>Guru Summary</span>
            </div>
            <div style={headlineStyle}>{answer.headline}</div>
          </section>

          <div style={compact ? compactAnswerGridStyle : answerGridStyle}>
            <section style={answerCardBlueStyle}>
              <div style={cardHeadStyle}>
                <PackageSearch size={16} />
                <span>Positioning</span>
              </div>
              <div style={listWrapStyle}>
                {answer.positioning.map((item) => (
                  <div key={item} style={listItemStyle}>{item}</div>
                ))}
              </div>
            </section>

            <section style={answerCardPurpleStyle}>
              <div style={cardHeadStyle}>
                <MessageSquareText size={16} />
                <span>Technical Guidance</span>
              </div>
              <div style={listWrapStyle}>
                {answer.technical.map((item) => (
                  <div key={item} style={listItemStyle}>{item}</div>
                ))}
              </div>
            </section>

            <section style={answerCardAmberStyle}>
              <div style={cardHeadStyle}>
                <Lightbulb size={16} />
                <span>Next Steps</span>
              </div>
              <div style={listWrapStyle}>
                {answer.nextSteps.map((item) => (
                  <div key={item} style={listItemStyle}>{item}</div>
                ))}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

const pageStyle: CSSProperties = {
  display: "grid",
  gap: 12,
  padding: 12,
  maxWidth: 1720,
  margin: "0 auto",
  color: "var(--wm-text, #e5eef8)",
};

const compactPageStyle: CSSProperties = {
  display: "grid",
  height: "100%",
  minHeight: 0,
  color: "var(--wm-text, #e5eef8)",
};

const layoutStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "360px 1fr",
  gap: 12,
};

const compactLayoutStyle: CSSProperties = {
  display: "grid",
  gridTemplateRows: "auto minmax(0, 1fr)",
  gap: 10,
  height: "100%",
  minHeight: 0,
  padding: 12,
};

const leftRailStyle: CSSProperties = {
  display: "grid",
  gap: 12,
  alignContent: "start",
};

const compactLeftRailStyle: CSSProperties = {
  display: "grid",
  gap: 10,
  alignContent: "start",
};

const basePanelStyle: CSSProperties = {
  borderRadius: 16,
  padding: 14,
  display: "grid",
  gap: 10,
  boxShadow: "0 18px 36px rgba(2,8,23,0.18)",
};

const heroStyle: CSSProperties = {
  ...basePanelStyle,
  border: "1px solid rgba(249,115,22,0.22)",
  background: "linear-gradient(135deg, rgba(56,25,8,0.92), rgba(15,23,42,0.92))",
};

const compactHeroStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  borderRadius: 14,
  padding: 10,
  border: "1px solid rgba(249,115,22,0.18)",
  background: "linear-gradient(180deg, rgba(249,115,22,0.10), rgba(15,23,42,0.72))",
};

const compactHeroTitleStyle: CSSProperties = {
  fontSize: 14,
  fontWeight: 900,
  lineHeight: 1.1,
};

const compactHeroTextStyle: CSSProperties = {
  fontSize: 12,
  opacity: 0.76,
};

const contextPanelStyle: CSSProperties = {
  ...basePanelStyle,
  border: "1px solid rgba(14,165,233,0.22)",
  background: "linear-gradient(180deg, rgba(9,53,72,0.84), rgba(10,25,34,0.94))",
};

const promptPanelStyle: CSSProperties = {
  ...basePanelStyle,
  border: "1px solid rgba(168,85,247,0.22)",
  background: "linear-gradient(180deg, rgba(45,20,75,0.84), rgba(24,14,42,0.94))",
};

const guruBadgeWrapStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
};

const eyebrowStyle: CSSProperties = {
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: 1.4,
  opacity: 0.74,
  fontWeight: 800,
};

const titleStyle: CSSProperties = {
  margin: "4px 0 0",
  fontSize: 26,
  lineHeight: 1.05,
  fontWeight: 900,
};

const sectionEyebrowStyle: CSSProperties = {
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: 1,
  opacity: 0.76,
  fontWeight: 800,
};

const bodyStyle: CSSProperties = {
  fontSize: 14,
  lineHeight: 1.5,
  opacity: 0.88,
};

const chipWrapStyle: CSSProperties = {
  display: "flex",
  gap: 6,
  flexWrap: "wrap",
};

const chipStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "4px 8px",
  borderRadius: 999,
  fontSize: 11,
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.10)",
};

const miniTextStyle: CSSProperties = {
  fontSize: 13,
  lineHeight: 1.45,
  opacity: 0.88,
};

const textareaStyle: CSSProperties = {
  width: "100%",
  minHeight: 130,
  padding: 12,
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(2,6,23,0.72)",
  color: "inherit",
  fontSize: 13,
  lineHeight: 1.45,
  resize: "vertical",
};

const compactTextareaStyle: CSSProperties = {
  width: "100%",
  minHeight: 84,
  maxHeight: 120,
  padding: 12,
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(2,6,23,0.72)",
  color: "inherit",
  fontSize: 13,
  lineHeight: 1.45,
  resize: "vertical",
};

const promptChipStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 30,
  padding: "0 10px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(255,255,255,0.06)",
  color: "inherit",
  cursor: "pointer",
  fontSize: 11,
  fontWeight: 700,
};

const mainStyle: CSSProperties = {
  display: "grid",
  gap: 12,
  minHeight: 0,
  overflow: "auto",
};

const answerHeroStyle: CSSProperties = {
  borderRadius: 16,
  padding: 14,
  border: "1px solid rgba(249,115,22,0.22)",
  background: "linear-gradient(180deg, rgba(89,36,9,0.82), rgba(33,20,11,0.94))",
  display: "grid",
  gap: 8,
};

const answerHeroTitleStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontSize: 12,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: 1,
  opacity: 0.8,
};

const headlineStyle: CSSProperties = {
  fontSize: 20,
  lineHeight: 1.2,
  fontWeight: 900,
};

const answerGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 12,
};

const compactAnswerGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: 10,
};

const answerCardBaseStyle: CSSProperties = {
  borderRadius: 16,
  padding: 12,
  display: "grid",
  gap: 10,
  boxShadow: "0 18px 36px rgba(2,8,23,0.18)",
};

const answerCardBlueStyle: CSSProperties = {
  ...answerCardBaseStyle,
  border: "1px solid rgba(14,165,233,0.22)",
  background: "linear-gradient(180deg, rgba(9,53,72,0.84), rgba(10,25,34,0.94))",
};

const answerCardPurpleStyle: CSSProperties = {
  ...answerCardBaseStyle,
  border: "1px solid rgba(168,85,247,0.22)",
  background: "linear-gradient(180deg, rgba(45,20,75,0.84), rgba(24,14,42,0.94))",
};

const answerCardAmberStyle: CSSProperties = {
  ...answerCardBaseStyle,
  border: "1px solid rgba(245,158,11,0.22)",
  background: "linear-gradient(180deg, rgba(78,51,10,0.84), rgba(36,24,9,0.94))",
};

const cardHeadStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontSize: 13,
  fontWeight: 900,
};

const listWrapStyle: CSSProperties = {
  display: "grid",
  gap: 8,
};

const listItemStyle: CSSProperties = {
  borderRadius: 12,
  padding: 10,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(255,255,255,0.05)",
  fontSize: 13,
  lineHeight: 1.45,
};