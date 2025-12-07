import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Lightens a hex color by blending it with white.
 * @param hex The hex color string (e.g., "#RRGGBB" or "RRGGBB").
 * @param percent The percentage to lighten (0.0 to 1.0, where 1.0 is pure white).
 * @returns The lightened hex color string.
 */
export function lightenHexColor(hex: string, percent: number): string {
  const hexValue = hex.startsWith('#') ? hex.slice(1) : hex;

  let r = parseInt(hexValue.substring(0, 2), 16);
  let g = parseInt(hexValue.substring(2, 4), 16);
  let b = parseInt(hexValue.substring(4, 6), 16);

  r = Math.min(255, r + (255 - r) * percent);
  g = Math.min(255, g + (255 - g) * percent);
  b = Math.min(255, b + (255 - b) * percent);

  const toHex = (c: number) => Math.round(c).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Darkens a hex color by blending it with black.
 * @param hex The hex color string (e.g., "#RRGGBB" or "RRGGBB").
 * @param percent The percentage to darken (0.0 to 1.0, where 1.0 is pure black).
 * @returns The darkened hex color string.
 */
export function darkenHexColor(hex: string, percent: number): string {
  const hexValue = hex.startsWith('#') ? hex.slice(1) : hex;

  let r = parseInt(hexValue.substring(0, 2), 16);
  let g = parseInt(hexValue.substring(2, 4), 16);
  let b = parseInt(hexValue.substring(4, 6), 16);

  r = Math.max(0, Math.round(r * (1 - percent)));
  g = Math.max(0, Math.round(g * (1 - percent)));
  b = Math.max(0, Math.round(b * (1 - percent)));

  const toHex = (c: number) => Math.round(c).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}