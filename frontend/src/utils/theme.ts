export const hueValues = Array.from({ length: 361 }, (_, index) => String(index))

/** Keep white text legible even at bright yellow/green hues. */
export function accentLightness(hue: number) {
  for (let lightness = 0.46; lightness >= 0.25; lightness -= 0.01) {
    const channel = (offset: number) => {
      const k = (offset + hue / 30) % 12
      const a = 0.32 * Math.min(lightness, 1 - lightness)
      const value = lightness - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
    }
    if (0.2126 * channel(0) + 0.7152 * channel(8) + 0.0722 * channel(4) <= 0.18)
      return `${Math.round(lightness * 100)}%`
  }
  return '25%'
}
