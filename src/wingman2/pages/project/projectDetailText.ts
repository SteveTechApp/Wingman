/**
 * How the project page reads the loose values a stored project carries.
 *
 * These are the page's own fallbacks — a field that was saved as a list, a
 * number that was saved as text, a timestamp that is not a date — kept here so
 * the page entry itself stays inside its line budget and every panel reads the
 * same shape rather than each one inventing its own.
 */

export function projectText(value: unknown, fallback = "Not captured") {
  if (Array.isArray(value)) {
    const text = value.map((item) => String(item ?? "").trim()).filter(Boolean).join(", ");
    return text || fallback;
  }

  const text = String(value ?? "").trim();
  return text || fallback;
}

export function projectRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  return value as Record<string, unknown>;
}

export function projectField(value: unknown, key: string, fallback = "") {
  const record = projectRecord(value);

  if (!record) {
    return fallback;
  }

  return projectText(record[key], fallback);
}

export function projectNumber(value: unknown, key: string) {
  const record = projectRecord(value);
  const rawValue = record?.[key];

  if (typeof rawValue === "number" && Number.isFinite(rawValue)) {
    return rawValue;
  }

  const parsedValue = Number(rawValue);

  if (Number.isFinite(parsedValue)) {
    return parsedValue;
  }

  return null;
}

export function dedupeText(items: Array<string | undefined | null>) {
  return Array.from(
    new Set(
      items
        .map((item) => String(item ?? "").trim())
        .filter(Boolean),
    ),
  );
}

export function formatProjectTimestamp(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) return "Not timestamped";

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;

  return date.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
