// Offline banner — shows a subtle notice when the app is serving cached data
// instead of live network data. Appears at the top of the viewport and
// auto-dismisses when the connection is restored.

import { useEffect, useState } from "react";
import { Wifi, WifiOff } from "lucide-react";
import { useOfflineStatus } from "../lib/useOfflineStatus";

export function OfflineBanner() {
  const { isOffline, isOnline } = useOfflineStatus();
  const [dismissed, setDismissed] = useState(false);
  const [showRestored, setShowRestored] = useState(false);

  // Auto-dismiss the "restored" notice after 4 seconds
  useEffect(() => {
    if (isOnline && !dismissed) {
      setShowRestored(true);
      const timer = setTimeout(() => setShowRestored(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, dismissed]);

  // Reset dismissed when going offline again
  useEffect(() => {
    if (isOffline) setDismissed(false);
  }, [isOffline]);

  if (dismissed && !showRestored) return null;
  if (!isOffline && !showRestored) return null;

  return (
    <div
      className={`wm-offline-banner ${isOffline ? "wm-offline-banner--offline" : "wm-offline-banner--restored"}`}
      role="status"
      aria-live="polite"
    >
      <div className="wm-offline-banner-inner">
        {isOffline ? (
          <>
            <WifiOff className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>
              <strong>Offline</strong> — Using cached product data. Call cards and battle cards are available.
            </span>
          </>
        ) : (
          <>
            <Wifi className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Connection restored.</span>
          </>
        )}
        <button
          type="button"
          className="wm-offline-banner-dismiss"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
}
