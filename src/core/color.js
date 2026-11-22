/** "#rrggbb" -> [r,g,b] in 0..1 (writes into `out`). */
export function hexToRgb(hex, out = [1, 1, 1]) {
  const v = parseInt(String(hex).replace('#', ''), 16) || 0;
  out[0] = ((v >> 16) & 255) / 255;
  out[1] = ((v >> 8) & 255) / 255;
  out[2] = (v & 255) / 255;
  return out;
}
export const rgbCss = (r, g, b, a = 1) =>
  `rgba(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)},${a})`;
export const lerp = (a, b, t) => a + (b - a) * t;
