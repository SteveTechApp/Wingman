import type { CSSProperties } from "react";
import wingmanBrandLogo from "@/assets/branding/wingman-brand-logo.png";

type WingmanBrandProps = {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  stacked?: boolean;
};

const SIZE_MAP: Record<NonNullable<WingmanBrandProps["size"]>, number> = {
  sm: 28,
  md: 38,
  lg: 56,
  xl: 72,
};

export default function WingmanBrand({
  size = "md",
  showText = true,
  stacked = false,
}: WingmanBrandProps) {
  const px = SIZE_MAP[size];

  return (
    <div
      style={{
        ...wrapStyle,
        flexDirection: stacked ? "column" : "row",
        alignItems: stacked ? "flex-start" : "center",
        gap: stacked ? 10 : 12,
      }}
    >
      <div
        style={{
          ...markWrapStyle,
          width: px,
          height: px,
          borderRadius: Math.max(10, Math.round(px * 0.28)),
        }}
      >
        <img
          src={wingmanBrandLogo}
          alt="Wingman"
          style={imgStyle}
        />
      </div>

      {showText ? (
        <div style={textWrapStyle}>
          <div
            style={{
              ...titleStyle,
              fontSize:
                size === "sm" ? 18 :
                size === "md" ? 22 :
                size === "lg" ? 28 :
                34,
            }}
          >
            Wingman
          </div>
          <div
            style={{
              ...subStyle,
              fontSize:
                size === "sm" ? 10 :
                size === "md" ? 11 :
                12,
            }}
          >
            WyreStorm Sales & Design Platform
          </div>
        </div>
      ) : null}
    </div>
  );
}

const wrapStyle: CSSProperties = {
  display: "flex",
  minWidth: 0,
};

const markWrapStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
  border: "1px solid rgba(96,165,250,0.24)",
  background: "linear-gradient(180deg, rgba(15,23,42,0.92), rgba(30,41,59,0.88))",
  boxShadow: "0 10px 24px rgba(2,8,23,0.20)",
  flex: "0 0 auto",
};

const imgStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "contain",
  display: "block",
  background: "transparent",
};

const textWrapStyle: CSSProperties = {
  display: "grid",
  gap: 2,
  minWidth: 0,
};

const titleStyle: CSSProperties = {
  lineHeight: 1,
  fontWeight: 900,
  color: "inherit",
};

const subStyle: CSSProperties = {
  lineHeight: 1.35,
  opacity: 0.74,
  letterSpacing: 0.2,
};