import { Link } from "react-router-dom";

type WingmanBrandProps = {
  compact?: boolean;
  subtitle?: string;
};

export default function WingmanBrand({
  compact = false,
  subtitle = "Clear inputs, live outputs, and visual decision support.",
}: WingmanBrandProps) {
  return (
    <Link
      to="/app/dashboard"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        textDecoration: "none",
        minWidth: 0,
      }}
    >
      <img
        src="/wingman-brand-logo.png"
        alt="Wingman"
        style={{
          width: compact ? 32 : 36,
          height: compact ? 32 : 36,
          borderRadius: 8,
          objectFit: "contain",
          flex: "0 0 auto",
        }}
      />
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontWeight: 600,
            color: "white",
            fontSize: compact ? 18 : 20,
            lineHeight: 1,
          }}
        >
          Wingman
        </div>
        <div
          style={{
            fontSize: 11,
            color: "#94a3b8",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {subtitle}
        </div>
      </div>
    </Link>
  );
}
