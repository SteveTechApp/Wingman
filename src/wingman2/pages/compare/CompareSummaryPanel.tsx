/**
 * CompareSummaryPanel — Shows a copyable summary of the compare result.
 *
 * Extracted from ComparePageNew.advanced.tsx for maintainability.
 */

export function CompareSummaryPanel({
  summary,
  requestLiveLookup,
  sourceUrl,
}: {
  summary: string;
  requestLiveLookup: boolean;
  sourceUrl: string;
}) {
  return (
    <details className="compare-native-summary wm-ui-card wm-ui-copy">
      <summary>Copyable summary</summary>
      <pre>{summary}</pre>
      {requestLiveLookup ? (
        <p className="compare-native-muted wm-ui-copy">
          Live lookup recommended for source validation. {sourceUrl}
        </p>
      ) : null}
    </details>
  );
}

export default CompareSummaryPanel;
