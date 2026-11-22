import { h } from '../dom.js';
import { ICONS } from '../../content/pixelArt.js';

/**
 * Draw one 8x8 pixel-art icon on a tiny canvas (scaled up with crisp pixels by CSS).
 * @param {string} name key of ICONS
 * @param {number} [size] CSS size in px
 * @returns {HTMLCanvasElement}
 */
export function pixelIcon(name, size = 32) {
  const def = ICONS[name];
  const c = h('canvas', { class: 'px-icon', width: 8, height: 8, role: 'img', 'aria-label': name });
  c.style.width = `${size}px`;
  c.style.height = `${size}px`;
  const g = c.getContext('2d');
  if (def && g) {
    def.rows.forEach((row, y) => {
      for (let x = 0; x < 8; x++) {
        const ch = row[x];
        if (ch === '.') continue;
        g.fillStyle = def.pal[ch];
        g.fillRect(x, y, 1, 1);
      }
    });
  }
  return c;
}
