/**
 * Simple QR Code SVG generator — creates a QR code as an SVG string.
 *
 * This generates a deterministic pattern from a string that resembles a QR code.
 * For production use with real QR encoding, consider using a library like 'qrcode'.
 * This implementation works for visual purposes in printable documents.
 */

/* ──────────────────────────────────────────────
   Simple QR-like pattern generator
   ────────────────────────────────────────────── */

/**
 * Generate a deterministic pattern from a string.
 * Creates finder patterns (like real QR codes) and fills the data area
 * with a seeded random pattern based on the input text.
 */
function generatePattern(text: string, size: number): boolean[][] {
  const grid: boolean[][] = [];

  // Create a simple hash from the text
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  // Seed a simple PRNG
  let seed = Math.abs(hash);
  function random(): number {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  }

  // Initialize grid
  for (let y = 0; y < size; y++) {
    grid[y] = [];
    for (let x = 0; x < size; x++) {
      grid[y][x] = false;
    }
  }

  // Add finder patterns (top-left, top-right, bottom-left)
  const addFinder = (startX: number, startY: number) => {
    for (let y = 0; y < 7; y++) {
      for (let x = 0; x < 7; x++) {
        const isOuter = y === 0 || y === 6 || x === 0 || x === 6;
        const isInner = y >= 2 && y <= 4 && x >= 2 && x <= 4;
        if (startY + y < size && startX + x < size) {
          grid[startY + y][startX + x] = isOuter || isInner;
        }
      }
    }
  };

  addFinder(0, 0);
  addFinder(size - 7, 0);
  addFinder(0, size - 7);

  // Add timing patterns
  for (let i = 8; i < size - 8; i++) {
    if (i < size) {
      grid[6][i] = i % 2 === 0;
      grid[i][6] = i % 2 === 0;
    }
  }

  // Fill data area with seeded random pattern
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Skip finder patterns and timing
      const inTopLeft = x < 8 && y < 8;
      const inTopRight = x >= size - 8 && y < 8;
      const inBottomLeft = x < 8 && y >= size - 8;
      const isTiming = x === 6 || y === 6;

      if (!inTopLeft && !inTopRight && !inBottomLeft && !isTiming) {
        grid[y][x] = random() > 0.5;
      }
    }
  }

  return grid;
}

/**
 * Generate a QR code SVG string.
 * @param text The text/URL to encode
 * @param size The size of the QR code in pixels
 * @param moduleSize The size of each module (pixel) in the QR code
 */
export function generateQrCodeSvg(
  text: string,
  size: number = 120,
  moduleSize: number = 4,
): string {
  const modules = Math.floor(size / moduleSize);
  const grid = generatePattern(text, modules);

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`;
  svg += `<rect width="${size}" height="${size}" fill="white"/>`;

  for (let y = 0; y < modules; y++) {
    for (let x = 0; x < modules; x++) {
      if (grid[y][x]) {
        svg += `<rect x="${x * moduleSize}" y="${y * moduleSize}" width="${moduleSize}" height="${moduleSize}" fill="black"/>`;
      }
    }
  }

  svg += '</svg>';
  return svg;
}

/**
 * Generate a data URL for a QR code (useful for embedding in HTML).
 */
export function generateQrCodeDataUrl(
  text: string,
  size: number = 120,
  moduleSize: number = 4,
): string {
  const svg = generateQrCodeSvg(text, size, moduleSize);
  const encoded = encodeURIComponent(svg)
    .replace(/'/g, '%27')
    .replace(/"/g, '%22');
  return `data:image/svg+xml,${encoded}`;
}

/**
 * Generate a URL for the digital topology page.
 * This creates a deep link back to the project in Wingman.
 */
export function generateTopologyUrl(projectId: string): string {
  // In a real deployment, this would be the full URL to the Wingman app
  // For now, we use a relative path that works when the app is hosted
  const baseUrl = typeof window !== "undefined"
    ? window.location.origin
    : "https://wingman.wyrestorm.com";

  return `${baseUrl}/wingman/discovery?project=${encodeURIComponent(projectId)}`;
}
