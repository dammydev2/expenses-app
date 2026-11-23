/**
 * Chart colours.
 *
 * The categorical palette is a validated colour-blind-safe set (8 hues in a fixed order),
 * checked against this app's surfaces (#ffffff light, #000000 dark):
 *   - adjacent-pair CVD ΔE ≥ 8.4, normal-vision ΔE ≥ 19.3 in both modes
 *   - dark: all ≥ 3:1 contrast. Light: aqua, yellow and magenta are < 3:1 on white,
 *     so every chart shows names and amounts next to it (never colour alone).
 *
 * Each colour has a separate dark-mode step (not an automatic inversion).
 * Category colours are stored in the DB as the LIGHT hex; use `categoryColor()` to render.
 */
import type { ColorSchemeName } from 'react-native';

export const CATEGORICAL = [
  { name: 'blue', light: '#2a78d6', dark: '#3987e5' },
  { name: 'orange', light: '#eb6834', dark: '#d95926' },
  { name: 'aqua', light: '#1baf7a', dark: '#199e70' },
  { name: 'yellow', light: '#eda100', dark: '#c98500' },
  { name: 'magenta', light: '#e87ba4', dark: '#d55181' },
  { name: 'green', light: '#008300', dark: '#0ca30c' },
  { name: 'violet', light: '#6250d6', dark: '#9085e9' },
  { name: 'red', light: '#e34948', dark: '#e66767' },
] as const;

/** De-emphasis grey: the "Other" slice and catch-all categories. */
export const NEUTRAL = { light: '#898781', dark: '#898781' } as const;

const darkByLight = new Map<string, string>([
  ...CATEGORICAL.map((c) => [c.light, c.dark] as const),
  [NEUTRAL.light, NEUTRAL.dark],
]);

/** Render colour for a stored category colour in the current colour scheme. */
export function categoryColor(storedHex: string, scheme: ColorSchemeName | null): string {
  if (scheme !== 'dark') return storedHex;
  return darkByLight.get(storedHex.toLowerCase()) ?? storedHex;
}

/** A catch-all category (grey) is grouped into the chart's "Other" slice. */
export function isNeutralColor(storedHex: string): boolean {
  return storedHex.toLowerCase() === NEUTRAL.light;
}

/** Single-series charts (daily bars, share bars) use slot 1. */
export const SERIES = {
  light: { fill: CATEGORICAL[0].light, track: '#e6effa' },
  dark: { fill: CATEGORICAL[0].dark, track: '#16263a' },
} as const;

/** Chart furniture: recessive hairlines and muted axis text. */
export const CHART_CHROME = {
  light: { grid: '#e1e0d9', axis: '#c3c2b7', muted: '#6f6d68' },
  dark: { grid: '#2c2c2a', axis: '#383835', muted: '#9a988f' },
} as const;
