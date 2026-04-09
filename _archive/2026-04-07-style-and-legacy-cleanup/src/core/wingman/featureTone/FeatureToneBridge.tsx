import { useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import "@/styles/wm-feature-glow-system.css";

type FeatureTone =
  | "landing"
  | "auth"
  | "dashboard"
  | "projects"
  | "tools"
  | "navigator"
  | "discovery"
  | "catalog"
  | "compare"
  | "guru"
  | "sales"
  | "room"
  | "proposal"
  | "import"
  | "training"
  | "video-wall"
  | "templates"
  | "product-intelligence"
  | "diagnostics"
  | "default";

function getFeatureTone(pathname: string): FeatureTone {
  if (pathname === "/") return "landing";
  if (pathname.startsWith("/login") || pathname.startsWith("/signup") || pathname.startsWith("/invite")) return "auth";
  if (pathname.startsWith("/app/dashboard")) return "dashboard";
  if (pathname.startsWith("/app/projects")) return "projects";
  if (pathname === "/app/tools") return "tools";
  if (pathname.startsWith("/app/tools/navigator")) return "navigator";
  if (pathname.startsWith("/app/tools/discovery")) return "discovery";
  if (pathname.startsWith("/app/tools/catalog")) return "catalog";
  if (pathname.startsWith("/app/catalogue")) return "catalog";
  if (pathname.startsWith("/app/tools/compare")) return "compare";
  if (pathname.startsWith("/app/tools/guru")) return "guru";
  if (pathname.startsWith("/app/tools/sales")) return "sales";
  if (pathname.startsWith("/app/tools/room-wizard")) return "room";
  if (pathname.startsWith("/app/tools/proposal")) return "proposal";
  if (pathname.startsWith("/app/tools/import-intake")) return "import";
  if (pathname.startsWith("/app/tools/training")) return "training";
  if (pathname.startsWith("/app/tools/video-wall")) return "video-wall";
  if (pathname.startsWith("/app/tools/templates")) return "templates";
  if (pathname.startsWith("/app/tools/product-intelligence")) return "product-intelligence";
  if (pathname.startsWith("/app/tools/competitor-lookup-diagnostics")) return "diagnostics";
  if (pathname.startsWith("/app/")) return "tools";
  return "default";
}

export default function FeatureToneBridge() {
  const location = useLocation();

  const tone = useMemo(() => getFeatureTone(location.pathname), [location.pathname]);

  useEffect(() => {
    document.documentElement.setAttribute("data-wm-feature", tone);
    document.body.setAttribute("data-wm-feature", tone);

    return () => {
      document.documentElement.removeAttribute("data-wm-feature");
      document.body.removeAttribute("data-wm-feature");
    };
  }, [tone]);

  return null;
}