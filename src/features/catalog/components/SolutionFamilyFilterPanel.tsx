import React from "react";
import {
  CatalogueFilterState,
  FamilyFilterGroup,
  SOLUTION_FAMILIES,
  SolutionFamily
} from "../catalogFamilyFilterModel";

type SolutionFamilyFilterPanelProps = {
  state: CatalogueFilterState;
  onChange: (next: CatalogueFilterState) => void;
};

const shellStyle: React.CSSProperties = {
  display: "grid",
  gap: 12
};

const sectionStyle: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 20,
  padding: 14,
  background: "linear-gradient(180deg, rgba(18,20,28,0.84), rgba(12,14,20,0.92))",
  boxShadow: "0 14px 28px rgba(0,0,0,0.12)"
};

const titleStyle: React.CSSProperties = {
  fontSize: 12,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  opacity: 0.72,
  marginBottom: 10
};

const familyButtonStyle = (active: boolean): React.CSSProperties => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  width: "100%",
  borderRadius: 16,
  border: active ? "1px solid rgba(112,183,255,0.38)" : "1px solid rgba(255,255,255,0.08)",
  background: active
    ? "linear-gradient(180deg, rgba(30,42,62,0.94), rgba(18,26,40,0.96))"
    : "linear-gradient(180deg, rgba(16,19,28,0.94), rgba(12,15,22,0.96))",
  padding: "11px 12px",
  cursor: "pointer",
  textAlign: "left",
  color: "inherit"
});

const chipWrapStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8
};

const chipStyle = (active: boolean): React.CSSProperties => ({
  borderRadius: 999,
  border: active ? "1px solid rgba(112,183,255,0.4)" : "1px solid rgba(255,255,255,0.08)",
  background: active
    ? "linear-gradient(180deg, rgba(30,42,62,0.94), rgba(18,26,40,0.96))"
    : "rgba(16,19,28,0.9)",
  padding: "7px 11px",
  fontSize: 12,
  lineHeight: 1.2,
  cursor: "pointer",
  color: "inherit"
});

function setFamily(state: CatalogueFilterState, family: SolutionFamily): CatalogueFilterState {
  return {
    family,
    search: state.search,
    selected: {}
  };
}

function clearFamily(state: CatalogueFilterState): CatalogueFilterState {
  return {
    family: null,
    search: state.search,
    selected: {}
  };
}

function toggleGroupValue(
  state: CatalogueFilterState,
  group: FamilyFilterGroup,
  value: string
): CatalogueFilterState {
  const current = state.selected[group.id] ?? [];
  const exists = current.includes(value);

  if (group.type === "single") {
    return {
      ...state,
      selected: {
        ...state.selected,
        [group.id]: exists ? [] : [value]
      }
    };
  }

  return {
    ...state,
    selected: {
      ...state.selected,
      [group.id]: exists ? current.filter(x => x !== value) : [...current, value]
    }
  };
}

export default function SolutionFamilyFilterPanel(props: SolutionFamilyFilterPanelProps) {
  const { state, onChange } = props;
  const activeFamily = SOLUTION_FAMILIES.find(x => x.id === state.family) ?? null;

  return (
    <div className="wm-cat2__family-shell" style={shellStyle}>
      <section className="wm-cat2__family-section" style={sectionStyle}>
        <div style={titleStyle}>Browse by Solution Family</div>

        <div style={{ display: "grid", gap: 10 }}>
          {SOLUTION_FAMILIES.map(family => {
            const active = state.family === family.id;
            return (
              <button
                key={family.id}
                type="button"
                className={active ? "wm-cat2__family-button is-active" : "wm-cat2__family-button"}
                style={familyButtonStyle(active)}
                onClick={() => onChange(active ? clearFamily(state) : setFamily(state, family.id))}
              >
                <div style={{ display: "grid", gap: 4 }}>
                  <div style={{ fontWeight: 700 }}>{family.label}</div>
                  <div style={{ fontSize: 12, opacity: 0.74 }}>{family.description}</div>
                </div>
                <div style={{ fontSize: 18, opacity: 0.8 }}>{active ? "âˆ’" : "+"}</div>
              </button>
            );
          })}
        </div>
      </section>

      {activeFamily ? (
        <section className="wm-cat2__family-section" style={sectionStyle}>
          <div style={titleStyle}>{activeFamily.label} Filters</div>

          <div style={{ display: "grid", gap: 16 }}>
            {activeFamily.groups.map(group => (
              <div key={group.id} className="wm-cat2__family-group" style={{ display: "grid", gap: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{group.label}</div>

                <div style={chipWrapStyle}>
                  {group.options.map(option => {
                    const active = (state.selected[group.id] ?? []).includes(option.id);
                    return (
                      <button
                        key={option.id}
                        type="button"
                        className={active ? "wm-cat2__family-chip is-active" : "wm-cat2__family-chip"}
                        style={chipStyle(active)}
                        onClick={() => onChange(toggleGroupValue(state, group, option.id))}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
