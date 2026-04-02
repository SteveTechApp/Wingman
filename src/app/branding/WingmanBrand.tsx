import { Link } from "react-router-dom";
import { brand } from "@/branding/brand";
import "./wingman-brand.css";

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
      className={`wm-brand${compact ? " wm-brand--compact" : ""}`}
      aria-label={`${brand.displayName} dashboard`}
    >
      <span className="wm-brand__mark" aria-hidden="true">
        <span className="wm-brand__mark-core">{brand.monogram}</span>
      </span>

      <div className="wm-brand__copy">
        <div className="wm-brand__title">{brand.appName}</div>
        <div className="wm-brand__subtitle">{subtitle}</div>
      </div>
    </Link>
  );
}
