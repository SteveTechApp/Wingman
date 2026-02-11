import React from "react";

type Props = {
  /** Path to the WyreStorm logo asset (svg/png). Default is "C:\Users\steve\wingman\src\assets\branding\wyrestorm-wingman-logo.png" (change if needed). */
  logoSrc?: string;
  productName?: string;
  tagline?: string;
  className?: string;
};

export default function LogoLockup({
  logoSrc = "/wyrestorm-logo.svg",
  productName = "WyreStorm Wingman",
  tagline = "AV Sales Assistant",
  className = ""
}: Props) {
  return (
    <div className={"wm-brand " + className}>
      <img className="wm-brand-logo" src={logoSrc} alt="WyreStorm" />
      <div className="wm-brand-text">
        <div className="wm-brand-name">{productName}</div>
        <div className="wm-brand-tag">{tagline}</div>
      </div>
    </div>
  );
}