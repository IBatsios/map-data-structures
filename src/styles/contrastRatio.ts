/**
 * WCAG 2.1's contrast formula, for the tests that measure this project's
 * stylesheets.
 *
 * It lives in its own module because two stylesheets are now measured — the
 * drawing's colour bands (D27) and the validation panel's text — and one
 * implementation of a published formula is worth more than two copies of it
 * that could drift apart. Nothing the site ships imports this; it is here so
 * that "the text is readable" stays a claim something can check.
 */

/** The three channel weights WCAG 2.1 gives for relative luminance. */
const CHANNEL_WEIGHTS = [0.2126, 0.7152, 0.0722] as const;

/** Below this the channel is linear; above it, the curve applies. */
const LINEAR_THRESHOLD = 0.03928;

/**
 * Relative luminance of a `#rrggbb` colour, per the WCAG 2.1 definition.
 *
 * @param hex - a six-digit hex colour, `#` included
 * @returns its relative luminance, 0 for black and 1 for white
 */
export function luminance(hex: string): number {
  const channels = [1, 3, 5].map((start) => {
    const value = Number.parseInt(hex.slice(start, start + 2), 16) / 255;

    return value <= LINEAR_THRESHOLD ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });

  return channels.reduce(
    (total, channel, index) => total + channel * (CHANNEL_WEIGHTS[index] ?? 0),
    0,
  );
}

/**
 * Contrast ratio between two `#rrggbb` colours, per WCAG 2.1.
 *
 * @param foreground - the text colour
 * @param background - what it is drawn on
 * @returns the ratio, from 1 (identical) to 21 (black on white)
 *
 * @example
 * ```typescript
 * contrastRatio('#000000', '#ffffff'); // 21
 * ```
 */
export function contrastRatio(foreground: string, background: string): number {
  const a = luminance(foreground);
  const b = luminance(background);

  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
