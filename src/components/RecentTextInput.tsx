import * as React from "react";

import {
  getRecentTextEntries,
  rememberRecentTextEntry,
} from "@/features/inputs/recentTextEntries";

type RecentTextInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "list"> & {
  historyKey: string;
  historyScope?: string;
};

export default function RecentTextInput({
  historyKey,
  historyScope,
  onBlur,
  autoComplete,
  ...props
}: RecentTextInputProps) {
  const generatedId = React.useId().replace(/:/g, "");
  const datalistId = `wm-recent-${historyKey}-${generatedId}`;
  const [entries, setEntries] = React.useState<string[]>(() => getRecentTextEntries(historyKey, { scope: historyScope }));

  React.useEffect(() => {
    setEntries(getRecentTextEntries(historyKey, { scope: historyScope }));
  }, [historyKey, historyScope]);

  return (
    <>
      <input
        {...props}
        autoComplete={autoComplete ?? "off"}
        list={entries.length > 0 ? datalistId : undefined}
        onBlur={(event) => {
          setEntries(rememberRecentTextEntry(historyKey, event.currentTarget.value, { scope: historyScope }));
          onBlur?.(event);
        }}
      />
      {entries.length > 0 ? (
        <datalist id={datalistId}>
          {entries.map((entry) => (
            <option key={entry} value={entry} />
          ))}
        </datalist>
      ) : null}
    </>
  );
}

