import * as React from "react";
import { useLocation } from "react-router-dom";
import { getToolByPath, noteRecentTool } from "./recentTools";

export default function RecentRouteTracker() {
  const location = useLocation();

  React.useEffect(() => {
    const path = location.pathname;
    if (getToolByPath(path)) {
      noteRecentTool(path);
    }
  }, [location.pathname]);

  return null;
}