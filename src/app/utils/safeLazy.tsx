import * as React from "react";
type ComponentModule = { default: React.ComponentType<any> };

function ImportErrorFallback({ label }: { label: string }) {
  return (
    <div className="wm-page wm-animate-in" style={{ width: "100%", maxWidth: "none", minWidth: 0 }}>
      <div className="wm-card" style={{ padding: 18, borderRadius: 18 }}>
        <div className="wm-page-eyebrow">LOAD PROTECTION</div>
        <h1 className="wm-page-title" style={{ marginBottom: 8 }}>Module failed to load</h1>
        <div style={{ fontSize: 14, lineHeight: 1.5, color: "rgba(255,255,255,0.86)" }}>
          The requested page could not be imported safely.
        </div>
        <div style={{ marginTop: 10, fontSize: 13, color: "rgba(255,255,255,0.75)" }}>
          Module: {label}
        </div>
      </div>
    </div>
  );
}

export function safeLazy(
  importer: () => Promise<ComponentModule>,
  label: string,
) {
  return React.lazy(async () => {
    try {
      const mod = await importer();
      if (!mod || typeof mod.default !== "function") {
        throw new Error("Missing default React component export");
      }
      return mod;
    } catch (error) {
      console.error("[safeLazy] import failed:", label, error);
      return {
        default: function SafeLazyFallback() {
          return <ImportErrorFallback label={label} />;
        },
      };
    }
  });
}