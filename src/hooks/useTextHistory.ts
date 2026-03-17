import * as React from "react";
import {
  getRecentTextEntries,
  saveRecentTextEntry,
  subscribeRecentTextEntries,
  type TextHistoryKey,
} from "@/services/ui/textHistoryService";

export function useTextHistory(key: TextHistoryKey) {
  const values = React.useSyncExternalStore(
    (notify) => subscribeRecentTextEntries(key, notify),
    () => getRecentTextEntries(key),
    () => []
  );

  const save = React.useCallback(
    (value: string) => saveRecentTextEntry(key, value),
    [key]
  );

  return {
    recentValues: values,
    saveRecentValue: save,
  };
}