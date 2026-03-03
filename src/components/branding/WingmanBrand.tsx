import React from "react";

export default function WingmanBrand({
  className = "",
  size,
  align,
}: {
  className?: string;
  size?: string | number;
  align?: "left" | "center" | "right";
}) {
  const fontSize = typeof size === "number" ? `${size}px` : size === "md" ? "20px" : undefined;
  const textAlign = align;
  return <span className={className} style={{ fontSize, textAlign, display: "inline-block" }}>Wingman</span>;
}
