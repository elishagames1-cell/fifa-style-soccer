const FRICTION_PER_SEC = 0.62; // חלק מהמהירות שנשאר אחרי שנייה אחת של חיכוך
const MIN_SPEED = 4; // מתחת למהירות הזו הכדור נעצר לגמרי, כדי שלא ירטט לנצח

export class Ball {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.radius = 8;
  }

  kick(vx, vy) {
    this.vx = vx;
    this.vy = vy;
  }

  update(dt, fieldWidth, fieldHeight) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // חיכוך אקספוננציאלי בלתי-תלוי בקצב פריימים: עצירה הדרגתית וחלקה
    const decel = Math.pow(FRICTION_PER_SEC, dt);
    this.vx *= decel;
    this.vy *= decel;
    if (Math.hypot(this.vx, this.vy) < MIN_SPEED) {
      this.vx = 0;
      this.vy = 0;
    }

    const margin = 20;
    if (this.x < margin) { this.x = margin; this.vx = 0; }
    if (this.x > fieldWidth - margin) { this.x = fieldWidth - margin; this.vx = 0; }
    if (this.y < margin) { this.y = margin; this.vy = 0; }
    if (this.y > fieldHeight - margin) { this.y = fieldHeight - margin; this.vy = 0; }
  }

  draw(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#222222';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}
