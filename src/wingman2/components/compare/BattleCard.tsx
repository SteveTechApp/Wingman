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

  const joinedAudio = sheet.audioSummary || sheet.audioOptions.join(" · ");
  const joinedControl = sheet.controlSummary || sheet.controlOptions.join(" · ");

  if (sheet.specClass === "MATRIX") {
    const matrixSize =
      sheet.matrixSize ||
      (sheet.routedIn != null && sheet.routedOut != null
        ? `${sheet.routedIn}x${sheet.routedOut}`
        : "");

    const inputSummary =
      sheet.inputSummary ||
      (sheet.hdmiIn != null ? `${sheet.hdmiIn} x HDMI` : "");

    const routedOutputSummary =
      sheet.routedOutputSummary ||
      (sheet.routedOut != null
        ? `${sheet.routedOut} x ${
            sheet.transport === "hdbaset" ? "HDBaseT" : "HDMI"
          }`
        : "");

    push("Matrix size", matrixSize);
    push("Inputs", inputSummary);
    push("Routed outputs", routedOutputSummary);
    push("Mirrored outputs", sheet.mirroredOutputSummary);
    push("Max video", sheet.maxResolutionLabel || (sheet.resolutionRank ? "Verified" : ""));
    push("Bandwidth", sheet.bandwidthGbps, sheet.bandwidthGbps != null ? "Gbps" : "");
    push("Audio breakout", joinedAudio);
    push("Control", joinedControl);

    if (rating != null && stats.length < 8) {
      push("Verified match rating", rating);
    }

    return stats.slice(0, 8);
  }

  if (sheet.specClass === "AVOIP") {
    push("Endpoint role", sheet.role);
    push("Network", sheet.transportLabel);
    push("Input", sheet.inputSummary || (sheet.hdmiIn != null ? `${sheet.hdmiIn} x HDMI` : ""));
    push("Routed output", sheet.routedOutputSummary);
    push("Local loop", sheet.loopOutputSummary);
    push("Max video", sheet.maxResolutionLabel || (sheet.resolutionRank ? "Verified" : ""));
    push("USB / KVM", sheet.usbVersion);
    push("Audio", joinedAudio);
    push("Power", sheet.poe);
    return stats.slice(0, 8);
  }

  push("Max video", sheet.maxResolutionLabel || (sheet.resolutionRank ? "Verified" : ""));
  push("Chroma", sheet.chroma);
  push("Bandwidth", sheet.bandwidthGbps, sheet.bandwidthGbps != null ? "Gbps" : "");

  const inputSummary =
    sheet.inputSummary ||
    (sheet.hdmiIn != null ? `${sheet.hdmiIn} x HDMI` : "");
  const outputSummary =
    sheet.routedOutputSummary ||
    (sheet.hdmiOut != null ? `${sheet.hdmiOut} x HDMI` : "");

  push("Inputs", inputSummary);
  push("Outputs", outputSummary);
  push("USB / KVM", sheet.usbVersion);
  push("Audio", joinedAudio);
  push("Control", joinedControl);
  push("Max reach", sheet.distanceM, sheet.distanceM != null ? "m" : "");
  push("Power", sheet.poe);

  if (rating != null && stats.length < 8) {
    push("Verified match rating", rating);
  }

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
