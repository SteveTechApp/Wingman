import * as React from "react";
import type { CatalogueTechnology } from "./catalogue.types";
import "./catalogue2.css";

type CatalogueQuickChipsProps = {
  technologies: CatalogueTechnology[];
  selected: CatalogueTechnology[];
  onToggle: (technology: CatalogueTechnology) => void;
};

export default function CatalogueQuickChips({
  technologies,
  selected,
  onToggle,
}: CatalogueQuickChipsProps) {
  return (
    <div className="wm-cat2__chips">
      {technologies.map((technology) => {
        const active = selected.includes(technology);
        return (
          <button
            key={technology}
            type="button"
            className={active ? "wm-cat2__chip is-active" : "wm-cat2__chip"}
            onClick={() => onToggle(technology)}
          >
            {technology}
          </button>
        );
      })}
    </div>
  );
}