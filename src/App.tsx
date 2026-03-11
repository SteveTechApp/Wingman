import * as React from "react";

import AppRoutes from "./AppRoutes";
import { refreshLiveProductData } from "@/services/liveProductDataStore";

export default function App() {
  React.useEffect(() => {
    void refreshLiveProductData({ minIntervalMs: 5 * 60 * 1000 });

    const interval = window.setInterval(() => {
      void refreshLiveProductData({ minIntervalMs: 15 * 60 * 1000 });
    }, 15 * 60 * 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  return <AppRoutes />;
}
