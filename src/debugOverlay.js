/** 2D debug layer: landmarks, tracked points, plus whatever the active filter adds. */
export class DebugOverlay {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.w = 0; this.h = 0;
    this.cleared = true;
  }

  resize(w, h, dpr) {
    this.w = w; this.h = h;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.cleared = false;
  }

  clear() {
    if (this.cleared) return;
    this.ctx.clearRect(0, 0, this.w, this.h);
    this.cleared = true;
  }

  dot(x, y, r, color) {
    const g = this.ctx;
    g.fillStyle = color;
    g.beginPath();
    g.arc(x, y, r, 0, 6.2832);
    g.fill();
  }

  label(text, x, y, color) {
    const g = this.ctx;
    g.fillStyle = color;
    g.font = '11px ui-monospace, Menlo, Consolas, monospace';
    g.fillText(text, x + 7, y - 6);
  }

  draw(face, mouthOpen, filter) {
    const g = this.ctx;
    g.clearRect(0, 0, this.w, this.h);
    this.cleared = false;

    g.fillStyle = 'rgba(0,255,170,0.8)';
    const lm = face.landmarks;
    for (let i = 0; i < face.landmarkCount; i++) g.fillRect(lm[i * 2] - 1, lm[i * 2 + 1] - 1, 2, 2);

    this.dot(face.center.x, face.center.y, 4, '#4da3ff');
    this.dot(face.nose.x, face.nose.y, 3, '#ffffff');
    this.dot(face.top.x, face.top.y, 3, '#b0b0ff');
    this.dot(face.eyeL.x, face.eyeL.y, 4, '#59f0ff');
    this.dot(face.eyeR.x, face.eyeR.y, 4, '#59f0ff');
    this.dot(face.upperLip.x, face.upperLip.y, 3, '#ff66cc');
    this.dot(face.lowerLip.x, face.lowerLip.y, 3, '#ff66cc');
    this.dot(face.mouth.x, face.mouth.y, 5, mouthOpen ? '#ff2d2d' : '#ff9b9b');
    this.label(mouthOpen ? 'mouth (OPEN)' : 'mouth', face.mouth.x, face.mouth.y, '#ff9b9b');

    if (filter) filter.debugDraw(this);
  }
}
