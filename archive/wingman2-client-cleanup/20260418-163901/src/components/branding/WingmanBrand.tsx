import type { CSSProperties } from "react";
import wingmanBrandLogo from "@/assets/branding/wingman-brand-logo.png";

type WingmanBrandProps = {
  size?: "sm" | "md" | "lg" | "xl" | "xxl";
  showText?: boolean;
  stacked?: boolean;
};

const SIZE_MAP: Record<NonNullable<WingmanBrandProps["size"]>, number> = {
  sm: 28,
  md: 38,
  lg: 56,
  xl: 80,
  xxl: 112,
};

export default function WingmanBrand({
  size = "md",
  showText = true,
  stacked = false,
}: WingmanBrandProps) {
  const px = SIZE_MAP[size];
  const logoHeight = showText ? px : Math.max(44, Math.round(px * 0.92));
  const logoWidth = showText ? px : Math.max(140, Math.round(logoHeight * 2.55));

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
          width: logoWidth,
          height: logoHeight,
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
                size === "xl" ? 34 :
                40,
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
                size === "lg" ? 12 :
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
  justifyContent: "flex-start",
  overflow: "visible",
  border: "none",
  background: "transparent",
  boxShadow: "none",
  flex: "0 0 auto",
  padding: 0,
};

const imgStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "contain",
  objectPosition: "left center",
  display: "block",
  background: "transparent",
  filter: "drop-shadow(0 8px 18px rgba(2,8,23,0.18))",
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