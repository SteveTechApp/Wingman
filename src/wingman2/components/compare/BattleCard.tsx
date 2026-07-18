/**
 * BattleCard — a "stat trading card" presentation of a product (original
 * design inspired by classic stat-card games; no third-party branding).
 *
 * Layout: photo header with title bar, "fact file" text panel, manufactured-by
 * strip, then big stat rows. Stats are spec-verified values from the
 * compareSpecEngine SpecSheet — never invented numbers.
 */

import type { SpecSheet } from "../../lib/compareSpecEngine";

export type BattleStat = {
  label: string;
  value: string;
  highlight?: "win" | "lose" | "draw" | null;
};

export function buildBattleStats(sheet: SpecSheet, rating: number | null): BattleStat[] {
  const stats: BattleStat[] = [];
  const push = (label: string, value: string | number | null | undefined, suffix = "") => {
    if (value === null || value === undefined || value === "") return;
    stats.push({ label, value: `${value}${suffix}` });
  };

  push("Max Resolution", sheet.maxResolutionLabel || (sheet.resolutionRank ? "Verified" : ""));
  push("Chroma", sheet.chroma);
  push("Bandwidth (Gbps)", sheet.bandwidthGbps);
  const io = [sheet.hdmiIn, sheet.hdmiOut];
  if (io[0] != null || io[1] != null) {
    push("HDMI In / Out", `${io[0] ?? "—"} / ${io[1] ?? "—"}`);
  }
  push("USB", sheet.usbVersion);
  push("Control Options", sheet.controlOptions.length || null);
  push("Audio Options", sheet.audioOptions.length || null);
  push("Max Reach (m)", sheet.distanceM);
  push("PoE / PoH", sheet.poe);
  if (rating != null) stats.push({ label: "Verified Match Rating", value: String(rating) });
  return stats.slice(0, 8);
}

function brandMonogram(brand: string): string {
  const parts = brand.trim().split(/\s+/);
  return (parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "");
}

export function BattleCard({
  sheet,
  stats,
  accent,
  bestFor,
  footnote,
}: {
  sheet: SpecSheet;
  stats: BattleStat[];
  accent: "wyrestorm" | "competitor";
  bestFor?: string;
  footnote?: string;
}) {
  return (
    <article className={`wm-battle-card wm-battle-card--${accent}`} aria-label={`${sheet.brand} ${sheet.sku} product card`}>
      <div className="wm-battle-card__frame">
        <header className="wm-battle-card__hero">
          <h3 className="wm-battle-card__title">{sheet.brand} {sheet.sku}</h3>
          {sheet.imageUrl ? (
            <img className="wm-battle-card__photo" src={sheet.imageUrl} alt={`${sheet.brand} ${sheet.sku}`} loading="lazy" />
          ) : (
            <div className="wm-battle-card__photo wm-battle-card__photo--placeholder" aria-hidden="true">
              <span>{brandMonogram(sheet.brand)}</span>
            </div>
          )}
        </header>

        <div className="wm-battle-card__body">
          <section className="wm-battle-card__factfile" aria-label="Fact file">
            <p className="wm-battle-card__factfile-kicker">Fact file</p>
            <p className="wm-battle-card__factfile-copy">{sheet.summary || sheet.name}</p>
          </section>

          <div className="wm-battle-card__stat-column">
            <section className="wm-battle-card__madeby" aria-label="Manufacturer and best-for">
              <p><span>Manufactured by</span><strong>{sheet.brand}</strong></p>
              {bestFor ? <p><span>Best for</span><strong>{bestFor}</strong></p> : null}
            </section>

            <dl className="wm-battle-card__stats">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className={`wm-battle-card__stat${stat.highlight ? ` wm-battle-card__stat--${stat.highlight}` : ""}`}
                >
                  <dt>{stat.label}</dt>
                  <dd>{stat.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {footnote ? <footer className="wm-battle-card__footnote">{footnote}</footer> : null}
      </div>
    </article>
  );
}

export default BattleCard;
