import { FIELD } from './field.js';

const FRICTION_PER_SEC = 0.62;
const MIN_SPEED = 4;

function bouncePost(ball, postX, postY, postRadius) {
  const dx = ball.x - postX;
  const dy = ball.y - postY;
  const dist = Math.hypot(dx, dy);
  const minDist = ball.radius + postRadius;
  if (dist >= minDist || dist < 0.001) return;

  const nx = dx / dist;
  const ny = dy / dist;
  ball.x = postX + nx * minDist;
  ball.y = postY + ny * minDist;

  const vDotN = ball.vx * nx + ball.vy * ny;
  if (vDotN < 0) {
    ball.vx = (ball.vx - 2 * vDotN * nx) * 0.5;
    ball.vy = (ball.vy - 2 * vDotN * ny) * 0.5;
  }
}

export class Ball {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.radius = 7;
    this.carrier = null;
    this.lastTouchSide = null; // 'home' | 'away'
    this.lastKicker = null; // השחקן היחיד שחסום מלאסוף את הכדור בחזרה מיד אחרי שבעט/מסר
    this.kickerGraceTimer = 0;
    this.loftT = 0;
    this.loftDuration = 0;
    this.loftHeight = 0;
  }

  kick(vx, vy, { lofted = false } = {}) {
    this.carrier = null;
    this.vx = vx;
    this.vy = vy;
    if (lofted) {
      this.loftT = 0;
      this.loftDuration = Math.min(1.3, Math.max(0.5, Math.hypot(vx, vy) / 260));
      this.loftHeight = Math.min(34, Math.hypot(vx, vy) * 0.08);
    } else {
      this.loftDuration = 0;
      this.loftHeight = 0;
    }
  }

  update(dt, fieldWidth, fieldHeight) {
    if (this.carrier) {
      const c = this.carrier;
      this.x = c.x + c.facingX * (c.radius + this.radius + 4);
      this.y = c.y + c.facingY * (c.radius + this.radius + 4);
      this.vx = 0;
      this.vy = 0;
      return;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    const decel = Math.pow(FRICTION_PER_SEC, dt);
    this.vx *= decel;
    this.vy *= decel;
    if (Math.hypot(this.vx, this.vy) < MIN_SPEED) {
      this.vx = 0;
      this.vy = 0;
    }

    if (this.loftDuration > 0) {
      this.loftT += dt;
      if (this.loftT >= this.loftDuration) {
        this.loftDuration = 0;
        this.loftT = 0;
      }
    }

    const m = FIELD.margin * 0.5;
    if (this.y < -m) { this.y = -m; this.vy = 0; }
    if (this.y > fieldHeight + m) { this.y = fieldHeight + m; this.vy = 0; }

    // קווי השער: מחוץ לרוחב המסגרת זה קיר קשיח (כמו קו צד), בתוך רוחב המסגרת נכנסים לרשת ונעצרים בעומק
    const halfGoal = FIELD.goalWidth / 2;
    const centerY = fieldHeight / 2;
    const inGoalMouthY = this.y > centerY - halfGoal && this.y < centerY + halfGoal;

    if (inGoalMouthY) {
      if (this.x < -FIELD.goalDepth) { this.x = -FIELD.goalDepth; this.vx = 0; this.vy = 0; }
      if (this.x > fieldWidth + FIELD.goalDepth) { this.x = fieldWidth + FIELD.goalDepth; this.vx = 0; this.vy = 0; }
    } else {
      if (this.x < 0) { this.x = 0; this.vx = Math.abs(this.vx) * 0.3; }
      if (this.x > fieldWidth) { this.x = fieldWidth; this.vx = -Math.abs(this.vx) * 0.3; }
    }

    // קורות השער: התנגשות מוצקה, הכדור חוזר/נעצר ולא עובר דרכן
    const r = FIELD.postRadius;
    bouncePost(this, 0, centerY - halfGoal, r);
    bouncePost(this, 0, centerY + halfGoal, r);
    bouncePost(this, fieldWidth, centerY - halfGoal, r);
    bouncePost(this, fieldWidth, centerY + halfGoal, r);
  }

  get airHeight() {
    if (this.loftDuration <= 0) return 0;
    return Math.sin(Math.PI * Math.min(this.loftT / this.loftDuration, 1)) * this.loftHeight;
  }

  draw(ctx) {
    const h = this.airHeight;

    // צל על הקרקע
    ctx.beginPath();
    ctx.ellipse(this.x, this.y, this.radius * 0.9, this.radius * 0.45, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fill();

    // הכדור עצמו, מוזז למעלה כשהוא "באוויר" (מסירה גבוהה)
    ctx.beginPath();
    ctx.arc(this.x, this.y - h, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#222222';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
}
