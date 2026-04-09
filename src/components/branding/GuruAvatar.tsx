import type { CSSProperties } from "react";
import { Bot } from "lucide-react";
import guruLogo from "@/assets/branding/guru.png";

type GuruAvatarProps = {
  size?: number;
  rounded?: number;
};

export default function GuruAvatar({ size = 48, rounded = 14 }: GuruAvatarProps) {
  return (
    <div
      style={{
        ...wrapStyle,
        width: size,
        height: size,
        borderRadius: rounded,
      }}
    >
      <img
        src={guruLogo}
        alt="Guru"
        style={imgStyle}
        onError={(event) => {
          const target = event.currentTarget;
          target.style.display = "none";
          const fallback = target.nextElementSibling as HTMLElement | null;
          if (fallback) fallback.style.display = "flex";
        }}
      />
      <div style={fallbackStyle}>
        <Bot size={Math.max(18, Math.round(size * 0.46))} />
      </div>
    </div>
  );
}

const wrapStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
  border: "1px solid rgba(249,115,22,0.30)",
  background: "linear-gradient(180deg, rgba(249,115,22,0.18), rgba(30,41,59,0.80))",
  boxShadow: "0 10px 24px rgba(2,8,23,0.20)",
  flex: "0 0 auto",
  position: "relative",
};

const imgStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block",
};

const fallbackStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "none",
  alignItems: "center",
  justifyContent: "center",
  color: "#fff",
};
