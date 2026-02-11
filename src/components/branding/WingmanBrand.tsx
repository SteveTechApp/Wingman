import React from "react";
import brand from "@/assets/branding/wyrestorm-wingman-logo.png";

type Props = {
  size?: "sm" | "md" | "lg";
  align?: "left" | "center";
  showStrap?: boolean;
  className?: string;
};

const sizes = {
  sm: "h-14",
  md: "h-14",
  lg: "h-14",
};

export default function WingmanBrand({
  size = "md",
  align = "left",
  showStrap = true,
  className = "",
}: Props) {
  const justify =
    align === "center"
      ? "items-center text-center"
      : "items-start text-left";

  return (
    <div className={`inline-flex flex-col ${justify} ${className}`}>
      <img
        src={brand}
        alt="WyreStorm Wingman"
        className={`${sizes[size]} w-auto select-none wm-brand-img`}
        draggable={false}
      />
      {showStrap && (<div className="wm-brand-strap">WyreStorm Sales Assistant</div>)}
    </div>
  );
}

