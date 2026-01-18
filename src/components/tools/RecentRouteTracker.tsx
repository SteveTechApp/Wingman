import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { recordRecentTool } from "@/components/tools/recentTools";
import { getToolByPath } from "@/data/toolCategories";

export default function RecentRouteTracker() {
  const loc = useLocation();

  useEffect(() => {
    const p = loc.pathname;
    if (!p) return;

    // Record only known tool paths (avoid recording project-specific routes like /design/:id)
    if (getToolByPath(p)) {
      recordRecentTool(p);
      // best-effort: notify same-tab listeners too
      window.dispatchEvent(new StorageEvent("storage", { key: "wingman_recent_tools_v1" }));
    }
  }, [loc.pathname]);

  return null;
}