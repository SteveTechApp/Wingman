import React from "react";
import logo from "@/assets/branding/wyrestorm-wingman-logo.png";

type Props = {
  size?: "sm" | "md" | "lg";
  variant?: "full" | "mark";
  className?: string;
};

const sizeMap = {
  sm: "h-7",
  md: "h-9",
  lg: "h-12",
};

export default function BrandLogo({
  size = "md",
  variant = "full",
  className = "",
}: Props) {
  const height = sizeMap[size];

  // Future-proof: if you later add an icon-only version, you can switch by variant.
  return (
    <div className={`inline-flex items-center ${className}`} aria-label="WyreStorm Wingman">
      <img
        src={logo}
        alt="WyreStorm Wingman"
        className={`${height} w-auto select-none`}
        draggable={false}
      />
    </div>
  );
}
