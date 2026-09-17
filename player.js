const SPEED = 220; // פיקסלים לשנייה

export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 12;
    this.facingX = 1;
    this.facingY = 0;
  }

  update(dt, keys, fieldWidth, fieldHeight) {
    let ix = 0, iy = 0;
    if (keys['KeyW'] || keys['ArrowUp']) iy -= 1;
    if (keys['KeyS'] || keys['ArrowDown']) iy += 1;
    if (keys['KeyA'] || keys['ArrowLeft']) ix -= 1;
    if (keys['KeyD'] || keys['ArrowRight']) ix += 1;

    const len = Math.hypot(ix, iy);
    if (len > 0) {
      ix /= len; iy /= len;
      this.x += ix * SPEED * dt;
      this.y += iy * SPEED * dt;
      this.facingX = ix;
      this.facingY = iy;
    }

    const margin = 24;
    this.x = Math.max(margin, Math.min(fieldWidth - margin, this.x));
    this.y = Math.max(margin, Math.min(fieldHeight - margin, this.y));
  }

  draw(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#1d4fd8';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // חץ קטן שמראה לאיזה כיוון השחקן פונה
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x + this.facingX * (this.radius + 8), this.y + this.facingY * (this.radius + 8));
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();
  }
}
