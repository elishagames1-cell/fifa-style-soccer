// מצלמת top-down עם מעקב חלק וזום דינמי לפי צפיפות שחקנים
import { FIELD } from './field.js';

export class Camera {
  constructor(viewportWidth, viewportHeight) {
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
    this.x = FIELD.width / 2;
    this.y = FIELD.height / 2;
    this.zoom = 0.85;
    this.baseZoom = viewportWidth / (FIELD.width + FIELD.margin * 2);
  }

  update(dt, focusX, focusY, players) {
    // צפיפות שחקנים סביב נקודת המיקוד: הרבה שחקנים קרובים -> זום מעט החוצה
    let nearby = 0;
    for (const p of players) {
      const d = Math.hypot(p.x - focusX, p.y - focusY);
      if (d < 140) nearby++;
    }
    const density = Math.min(nearby / 10, 1);
    const targetZoom = this.baseZoom * (1.28 - density * 0.22);

    const followSpeed = 3.2;
    this.x += (focusX - this.x) * Math.min(1, followSpeed * dt);
    this.y += (focusY - this.y) * Math.min(1, followSpeed * dt);
    this.zoom += (targetZoom - this.zoom) * Math.min(1, 2.5 * dt);

    const halfW = this.viewportWidth / 2 / this.zoom;
    const halfH = this.viewportHeight / 2 / this.zoom;
    const minX = -FIELD.margin + halfW;
    const maxX = FIELD.width + FIELD.margin - halfW;
    const minY = -FIELD.margin + halfH;
    const maxY = FIELD.height + FIELD.margin - halfH;
    if (minX < maxX) this.x = Math.max(minX, Math.min(maxX, this.x));
    if (minY < maxY) this.y = Math.max(minY, Math.min(maxY, this.y));
  }

  worldToScreen(wx, wy) {
    return {
      x: (wx - this.x) * this.zoom + this.viewportWidth / 2,
      y: (wy - this.y) * this.zoom + this.viewportHeight / 2,
    };
  }

  apply(ctx) {
    ctx.translate(this.viewportWidth / 2, this.viewportHeight / 2);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.x, -this.y);
  }
}
