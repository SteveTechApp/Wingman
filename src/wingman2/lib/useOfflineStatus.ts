// React hook that tracks the browser's online/offline status.
// Used by the offline banner component to notify the user when
// cached data is being served instead of live data.

import { useEffect, useState } from "react";

export type OfflineStatus = {
  isOffline: boolean;
  isOnline: boolean;
  /** True if the service worker is controlling the page. */
  swActive: boolean;
};

export function useOfflineStatus(): OfflineStatus {
  const [isOffline, setIsOffline] = useState(
    () => typeof navigator !== "undefined" && !navigator.onLine
  );
  const [swActive, setSwActive] = useState(false);

  useEffect(() => {
    function handleOnline() {
      setIsOffline(false);
    }
    function handleOffline() {
      setIsOffline(true);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Check if service worker is active
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      setSwActive(true);
    }

    navigator.serviceWorker?.addEventListener?.("controllerchange", () => {
      setSwActive(true);
    });

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return {
    isOffline,
    isOnline: !isOffline,
    swActive,
  };
}
