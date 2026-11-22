/**
 * Allocation-free lightning helpers.
 * A bolt is a polyline of (segs+1) points stored in a shared Float32Array.
 * `offs` holds fixed random offsets in [-1,1] (re-rolled when the bolt is
 * regenerated) so the bolt follows moving endpoints without re-randomizing
 * every frame.
 */
export function randomOffsets(offs, offOff, n) {
  for (let i = 0; i < n; i++) offs[offOff + i] = Math.random() * 2 - 1;
}

export function jagged(out, outOff, offs, offOff, x1, y1, x2, y2, segs, amp) {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const o = offs[offOff + i] * amp * Math.sin(Math.PI * t);
    const k = (outOff + i) * 2;
    out[k] = x1 + dx * t + nx * o;
    out[k + 1] = y1 + dy * t + ny * o;
  }
}

function path(g, pts, ptOff, n) {
  g.beginPath();
  g.moveTo(pts[ptOff * 2], pts[ptOff * 2 + 1]);
  for (let i = 1; i < n; i++) g.lineTo(pts[(ptOff + i) * 2], pts[(ptOff + i) * 2 + 1]);
  g.stroke();
}

/** 3-pass glow stroke (wide halo, mid, white core). styles = [halo, mid, core]. */
export function strokeBolt(g, pts, ptOff, n, w, styles) {
  g.lineWidth = w * 4; g.strokeStyle = styles[0]; path(g, pts, ptOff, n);
  g.lineWidth = w * 1.8; g.strokeStyle = styles[1]; path(g, pts, ptOff, n);
  g.lineWidth = w * 0.7; g.strokeStyle = styles[2]; path(g, pts, ptOff, n);
}
