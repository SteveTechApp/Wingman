import type { ReactNode } from "react";
import type { PageBandLadderEntry, PageBandLadder } from "../lib/pageBands";

/** A ladder entry plus the two lines a rail can print that a ladder never holds. */
export type PageBandItem<K extends string> = PageBandLadderEntry<K> & {
  /** What this band still holds, printed under its name. */
  status?: string;
  /** A surface's own state class for this item (`is-open`). */
  state?: string;
};

/**
 * The rail above a banded page, and the one band it opens.
 *
 * Every surface that reads in bands renders this rail, so the question "what
 * else is on this page" is answered the same way wherever a rep meets it: a
 * numbered chip per band, the open one pressed, and the band's own status line
 * under its name when the surface has one to print. The class names are the
 * surface's own, because each page's rail is styled in its page's sheet — the
 * shared part is the markup and the state, not the paint.
 *
 * A closed band is not rendered rather than hidden, so nothing behind the rail
 * is in the tab order and a rep cannot read past the band they are on.
 */
export function PageBandRail<K extends string>({
  label,
  bands,
  active,
  onSelect,
  testIdPrefix,
  className,
  itemClassName,
  activeClassName,
  numberClassName,
  copyClassName,
  ariaCurrent,
}: {
  /** The rail's accessible name: what these bands are bands of. */
  label: string;
  bands: ReadonlyArray<PageBandItem<K>>;
  active: K;
  onSelect: (key: K) => void;
  /** Buttons are `<prefix>-<key>`, which is what a walk drives. */
  testIdPrefix: string;
  className?: string;
  itemClassName?: string;
  activeClassName?: string;
  numberClassName?: string;
  copyClassName?: string;
  /** `"step"` for a ladder that names its position in the address. */
  ariaCurrent?: "step";
}) {
  return (
    <nav className={className} aria-label={label}>
      {bands.map((item, index) => {
        const open = item.key === active;
        return (
          <button
            key={item.key}
            type="button"
            className={[itemClassName, open ? activeClassName : undefined, item.state]
              .filter(Boolean)
              .join(" ") || undefined}
            data-testid={`${testIdPrefix}-${item.key}`}
            aria-pressed={open}
            aria-current={ariaCurrent && open ? ariaCurrent : undefined}
            onClick={() => onSelect(item.key)}
          >
            <span className={numberClassName} aria-hidden="true">{index + 1}</span>
            {copyClassName ? (
              <span className={copyClassName}>
                <strong>{item.label}</strong>
                {item.status ? <small>{item.status}</small> : null}
              </span>
            ) : (
              <>
                <strong>{item.label}</strong>
                {item.status ? <small>{item.status}</small> : null}
              </>
            )}
          </button>
        );
      })}
    </nav>
  );
}

/** The one band on screen; every other band in the ladder returns null. */
export function PageBandPanel<K extends string>({
  band,
  of,
  testIdPrefix,
  testId,
  className,
  children,
}: {
  band: K;
  of: K;
  testIdPrefix?: string;
  /** Overrides the derived `<prefix>-panel-<key>` when a surface named it already. */
  testId?: string;
  className?: string;
  children: ReactNode;
}) {
  if (band !== of) return null;
  const name = testId ?? (testIdPrefix ? `${testIdPrefix}-panel-${of}` : `page-band-panel-${of}`);
  return <div className={className} data-testid={name}>{children}</div>;
}

export type { PageBandLadder, PageBandLadderEntry };