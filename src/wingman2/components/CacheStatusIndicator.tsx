/**
 * CacheStatusIndicator — Shows which data is cached and available offline.
 * Appears on call cards and battle cards pages when offline.
 */
import { useEffect, useState } from "react";
import { Database, RefreshCcw, Check, AlertCircle } from "lucide-react";

type CacheStatus = {
  callCardsCached: boolean;
  battleCardsCached: boolean;
  productIndexCached: boolean;
  lastChecked: string;
};

async function checkCacheStatus(): Promise<CacheStatus> {
  const status: CacheStatus = {
    callCardsCached: false,
    battleCardsCached: false,
    productIndexCached: false,
    lastChecked: new Date().toISOString(),
  };

  if (typeof caches === "undefined") return status;

  try {
    const cacheNames = await caches.keys();
    const wingmanCaches = cacheNames.filter((name) => name.startsWith("wingman-"));

    for (const cacheName of wingmanCaches) {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();

      for (const request of keys) {
        const url = request.url;
        if (url.includes("call-card-products")) status.callCardsCached = true;
        if (url.includes("battle-cards") || url.includes("competitor-products")) status.battleCardsCached = true;
        if (url.includes("product-intelligence-index")) status.productIndexCached = true;
      }
    }
  } catch {
    // Caches API may not be available
  }

  return status;
}

type CacheStatusIndicatorProps = {
  showDetails?: boolean;
  className?: string;
};

export function CacheStatusIndicator({ showDetails = false, className = "" }: CacheStatusIndicatorProps) {
  const [status, setStatus] = useState<CacheStatus | null>(null);
  const [checking, setChecking] = useState(false);

  async function refreshStatus() {
    setChecking(true);
    const newStatus = await checkCacheStatus();
    setStatus(newStatus);
    setChecking(false);
  }

  useEffect(() => {
    refreshStatus();
  }, []);

  if (!status) return null;

  const allCached = status.callCardsCached && status.battleCardsCached && status.productIndexCached;
  const someCached = status.callCardsCached || status.battleCardsCached || status.productIndexCached;

  return (
    <div className={`wm-cache-status ${className}`}>
      <div className="wm-cache-status__header">
        <Database className="h-4 w-4" aria-hidden="true" />
        <span className="wm-cache-status__title">Offline Cache</span>
        <button
          type="button"
          className="wm-cache-status__refresh"
          onClick={refreshStatus}
          disabled={checking}
          aria-label="Refresh cache status"
        >
          <RefreshCcw className={`h-3 w-3 ${checking ? "animate-spin" : ""}`} aria-hidden="true" />
        </button>
      </div>

      {showDetails && (
        <div className="wm-cache-status__details">
          <CacheItem label="Call cards" cached={status.callCardsCached} />
          <CacheItem label="Battle cards" cached={status.battleCardsCached} />
          <CacheItem label="Product index" cached={status.productIndexCached} />
        </div>
      )}

      <div className="wm-cache-status__summary">
        {allCached ? (
          <span className="wm-cache-status__badge wm-cache-status__badge--ready">
            <Check className="h-3 w-3" aria-hidden="true" />
            All data cached
          </span>
        ) : someCached ? (
          <span className="wm-cache-status__badge wm-cache-status__badge--partial">
            <AlertCircle className="h-3 w-3" aria-hidden="true" />
            Partially cached
          </span>
        ) : (
          <span className="wm-cache-status__badge wm-cache-status__badge--empty">
            <AlertCircle className="h-3 w-3" aria-hidden="true" />
            Not cached
          </span>
        )}
      </div>
    </div>
  );
}

function CacheItem({ label, cached }: { label: string; cached: boolean }) {
  return (
    <div className="wm-cache-status__item">
      {cached ? (
        <Check className="h-3 w-3 wm-cache-status__icon--cached" aria-hidden="true" />
      ) : (
        <AlertCircle className="h-3 w-3 wm-cache-status__icon--missing" aria-hidden="true" />
      )}
      <span className={cached ? "wm-cache-status__label--cached" : "wm-cache-status__label--missing"}>
        {label}
      </span>
    </div>
  );
}

/**
 * SavePageForOffline — Button that triggers the service worker to cache the current page
 */
export function SavePageForOffline({ pageType }: { pageType: "call-cards" | "battle-cards" }) {
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);

    try {
      // Pre-fetch key data URLs to cache them
      const urlsToCache = [
        "/product-intelligence-index.json",
        "/product-call-card-products.json",
        "/data/catalog/competitor-products.generated.json",
        "/data/catalog/battle-cards.generated.json",
      ];

      await Promise.all(
        urlsToCache.map((url) =>
          fetch(url).then((res) => {
            if (res.ok) return res.text();
            return null;
          }).catch(() => null)
        )
      );

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      // Best-effort caching
    } finally {
      setSaving(false);
    }
  }

  return (
    <button
      type="button"
      className="wm-ui-button wm-ui-button-secondary wm-save-offline-btn"
      onClick={handleSave}
      disabled={saving || saved}
    >
      {saved ? (
        <>
          <Check className="h-4 w-4" aria-hidden="true" />
          Saved for offline
        </>
      ) : saving ? (
        <>
          <RefreshCcw className="h-4 w-4 animate-spin" aria-hidden="true" />
          Caching...
        </>
      ) : (
        <>
          <Database className="h-4 w-4" aria-hidden="true" />
          Save for offline
        </>
      )}
    </button>
  );
}
