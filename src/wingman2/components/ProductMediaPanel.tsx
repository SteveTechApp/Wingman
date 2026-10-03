import { useEffect, useState } from "react";
import { getProductMediaBySku, loadProductMediaIndex } from "../data/productMedia";
import type { ProductMediaAsset, ProductMediaSet, ProductMediaStatus } from "../types/productPositioning";

type ProductMediaPanelProps = {
  sku: string;
  title?: string;
  compact?: boolean;
  className?: string;
};

const statusLabels: Record<ProductMediaStatus, string> = {
  "verified-front-back": "Front and rear verified",
  "partial-front": "Primary image plus rear candidate",
  "primary-only": "Primary image only",
  "gallery-only": "Gallery image, needs review",
  "no-gallery": "No official gallery image",
  "no-official-page": "No official product page",
};

function mediaStatusLabel(status: ProductMediaStatus): string {
  return statusLabels[status] ?? "Imagery needs review";
}

function ProductImageSlot(props: { label: string; asset?: ProductMediaAsset; missingText: string }) {
  if (!props.asset) {
    return (
      <figure className="wm-product-media-slot is-missing">
        <figcaption>{props.label}</figcaption>
        <div>{props.missingText}</div>
      </figure>
    );
  }

  return (
    <figure className="wm-product-media-slot">
      <a href={props.asset.url} target="_blank" rel="noreferrer" title="Open full-size image in a new tab">
        <img
          src={props.asset.url}
          alt={props.asset.alt}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
        />
      </a>
      <figcaption>
        <span>{props.label}</span>
        <small>{props.asset.confidence.toLowerCase()} confidence · click to enlarge</small>
      </figcaption>
    </figure>
  );
}

export function ProductMediaPanel({ sku, title, compact = false, className = "" }: ProductMediaPanelProps) {
  const [media, setMedia] = useState<ProductMediaSet | null | undefined>(undefined);

  useEffect(() => {
    let isMounted = true;

    loadProductMediaIndex()
      .then((index) => {
        if (!isMounted) {
          return;
        }

        setMedia(getProductMediaBySku(index, sku) ?? null);
      })
      .catch(() => {
        if (isMounted) {
          setMedia(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [sku]);

  if (media === undefined) {
    return (
      <section className={`wm-product-media-panel ${className}`.trim()} data-compact={compact ? "true" : undefined}>
        <div className="wm-product-media-head">
          <div>
            <span>Product imagery</span>
            <h3>{sku}</h3>
          </div>
          <strong>Loading</strong>
        </div>
      </section>
    );
  }

  if (!media) {
    return (
      <section className={`wm-product-media-panel ${className}`.trim()} data-compact={compact ? "true" : undefined}>
        <div className="wm-product-media-head">
          <div>
            <span>Product imagery</span>
            <h3>{sku}</h3>
          </div>
          <strong>Not indexed</strong>
        </div>
        <p className="wm-product-media-note">No official product imagery record has been indexed for this SKU yet.</p>
      </section>
    );
  }

  const notes = media.notes.slice(0, compact ? 1 : 3);

  return (
    <section className={`wm-product-media-panel ${className}`.trim()} data-compact={compact ? "true" : undefined}>
      <div className="wm-product-media-head">
        <div>
          <span>Product imagery</span>
          <h3>{title || media.productName || media.sku}</h3>
        </div>
        <strong>{mediaStatusLabel(media.status)}</strong>
      </div>

      <div className="wm-product-media-grid">
        <ProductImageSlot
          label="Front / primary view"
          asset={media.front}
          missingText="Front view needs sourcing"
        />
        <ProductImageSlot
          label="Rear / connector view"
          asset={media.rear}
          missingText="Rear image needs sourcing"
        />
      </div>

      {!compact && media.gallery.length > 0 ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "10px" }}>
          {media.gallery.slice(0, 6).map((asset) => (
            <a
              key={asset.url}
              href={asset.url}
              target="_blank"
              rel="noreferrer"
              title="Open full-size image in a new tab"
              style={{ display: "block", width: "72px", height: "72px", borderRadius: "8px", overflow: "hidden", border: "1px solid #29465e", background: "#fff" }}
            >
              <img
                src={asset.url}
                alt={asset.alt}
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
            </a>
          ))}
        </div>
      ) : null}

      {notes.length > 0 ? (
        <ul className="wm-product-media-notes">
          {notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : null}

      {media.officialProductUrl ? (
        <a className="wm-product-media-source" href={media.officialProductUrl} target="_blank" rel="noreferrer">
          Official product page
        </a>
      ) : null}
    </section>
  );
}
