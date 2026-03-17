import * as React from "react";

type TextHistorySuggestionsProps = {
  items: string[];
  onSelect: (value: string) => void;
  emptyLabel?: string;
};

export default function TextHistorySuggestions({
  items,
  onSelect,
  emptyLabel = "No recent entries",
}: TextHistorySuggestionsProps) {
  if (items.length === 0) {
    return <div className="wm-text-history__empty">{emptyLabel}</div>;
  }

  return (
    <div className="wm-text-history">
      {items.map((item) => (
        <button
          key={item}
          type="button"
          className="wm-text-history__chip"
          onClick={() => onSelect(item)}
        >
          {item}
        </button>
      ))}
    </div>
  );
}