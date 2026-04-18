export type GuruBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type GuruFabPosition = {
  x: number;
  y: number;
  size: number;
};

const DEFAULT_GURU_BOUNDS: GuruBounds = {
  x: 0,
  y: 0,
  width: 520,
  height: 680,
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getGuruFabMetrics() {
  const isCompact = window.innerWidth <= 900;

  return {
    size: isCompact ? 62 : 68,
    offset: isCompact ? 16 : 24,
    gap: isCompact ? 12 : 16,
  };
}

function getDefaultGuruSize() {
  return {
    width: clamp(window.innerWidth * 0.34, 420, 560),
    height: clamp(window.innerHeight * 0.7, 520, 760),
  };
}

export function getGuruFabPosition(): GuruFabPosition {
  if (typeof window === "undefined") {
    return { x: 24, y: 24, size: 68 };
  }

  const { size, offset } = getGuruFabMetrics();

  return {
    x: Math.max(12, window.innerWidth - size - offset),
    y: Math.max(12, window.innerHeight - size - offset),
    size,
  };
}

export function getAnchoredGuruBounds(bounds: Partial<GuruBounds> = {}): GuruBounds {
  if (typeof window === "undefined") {
    return DEFAULT_GURU_BOUNDS;
  }

  const fallbackSize = getDefaultGuruSize();
  const { x: fabX, y: fabY, size } = getGuruFabPosition();
  const { gap } = getGuruFabMetrics();
  const width = clamp(bounds.width ?? fallbackSize.width, 420, Math.max(420, window.innerWidth - 32));
  const height = clamp(bounds.height ?? fallbackSize.height, 480, Math.max(480, window.innerHeight - 120));
  const x = clamp(fabX + size - width, 12, Math.max(12, window.innerWidth - width - 12));
  const y = clamp(fabY - height - gap, 84, Math.max(84, window.innerHeight - height - 12));

  return { x, y, width, height };
}

export function getDefaultGuruBounds(): GuruBounds {
  if (typeof window === "undefined") {
    return DEFAULT_GURU_BOUNDS;
  }

  return getAnchoredGuruBounds(getDefaultGuruSize());
}

export function sanitizeGuruBounds(
  bounds: Partial<GuruBounds>,
  fallbackToDefault = false,
): GuruBounds {
  if (typeof window === "undefined") {
    return DEFAULT_GURU_BOUNDS;
  }

  const fallback = getDefaultGuruBounds();
  const isLegacyDefault = bounds.x === 0 && bounds.y === 0;
  if (fallbackToDefault && isLegacyDefault) {
    return fallback;
  }

  const width = clamp(bounds.width ?? fallback.width, 420, Math.max(420, window.innerWidth - 32));
  const height = clamp(bounds.height ?? fallback.height, 480, Math.max(480, window.innerHeight - 120));
  const x = clamp(
    bounds.x ?? fallback.x,
    12,
    Math.max(12, window.innerWidth - width - 12),
  );
  const y = clamp(
    bounds.y ?? fallback.y,
    84,
    Math.max(84, window.innerHeight - height - 12),
  );

  return { x, y, width, height };
}
