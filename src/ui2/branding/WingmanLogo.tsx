import * as React from "react";

type Props = {
  /** Height in pixels */
  height?: number;
  /** Optional className */
  className?: string;
  /** Optional alt text */
  alt?: string;
};

export default function WingmanLogo({ height = 34, className = "", alt = "WyreStorm Wingman" }: Props) {
  return (
    <img
      src="/hero-logo.png"
      alt={alt}
      style={{ height, width: "auto", display: "block" }}
      className={className}
      draggable={false}
  />
  );
}

