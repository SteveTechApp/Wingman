/**
 * CompareEvidenceList — Simple list of evidence items for compare results.
 *
 * Extracted from ComparePageNew.advanced.tsx for maintainability.
 */

export function CompareEvidenceList({
  title,
  items,
  className = "",
}: {
  title: string;
  items: string[];
  className?: string;
}) {
  if (!items.length) return null;

  return (
    <div className={`compare-native-evidence ${className}`}>
      <strong>{title}</strong>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export default CompareEvidenceList;
