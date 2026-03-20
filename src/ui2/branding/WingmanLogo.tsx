import * as React from "react";
import heroLogo from "@/assets/branding/heroLogo.png";

type Props = {
  /** Height in pixels */
  height?: number;
  /** Optional className */
  className?: string;
  /** Optional alt text */
  alt?: string;
};

export default function WingmanLogo({ height = 68, className = "", alt = "WyreStorm Wingman" }: Props) {
  return (
    <img
      src={heroLogo}
      alt={alt}
      style={{ height, width: "auto", maxWidth: "100%", display: "block" }}
      className={className}
      draggable={false}
    />
  );
}

