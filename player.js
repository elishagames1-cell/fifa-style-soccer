import { FIELD } from './field.js';

function moveToward(current, target, maxDelta) {
  const diff = target - current;
  if (Math.abs(diff) <= maxDelta) return target;
  return current + Math.sign(diff) * maxDelta;
}

export class Player {
  constructor({ name, shirtNumber, position, stats, team, side, attackDir, slotIndex, x, y }) {
    this.name = name;
    this.shirtNumber = shirtNumber;
    this.role = position; // GK | DEF | MID | FWD
    this.stats = stats;
    this.team = team; // { name, primary, secondary }
    this.side = side; // 'home' | 'away'
    this.attackDir = attackDir; // 1 or -1
    this.slotIndex = slotIndex;

    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.radius = 11;
    this.facingX = attackDir;
    this.facingY = 0;
    this.stamina = 1;
    this.animPhase = 0;

    this.isUserControlled = false;
    this.actionCooldown = 0;
    this.tackleCooldown = 0;
    this.kickCooldown = 0;
    this.slowTimer = 0;
  }

  update(dt, intent) {
    const { moveX = 0, moveY = 0, sprint = false } = intent;
    const paceFactor = this.stats.pace / 80;
    const baseSpeed = 95 * paceFactor;
    const sprintMult = sprint && this.stamina > 0.04 ? 1.32 : 1.0;
    const slowMult = this.slowTimer > 0 ? 0.5 : 1.0;
    const maxSpeed = baseSpeed * sprintMult * slowMult;
    const accel = 620;
    const decel = 700;

    const inputLen = Math.hypot(moveX, moveY);
    if (inputLen > 0.01) {
      const dirX = moveX / inputLen;
      const dirY = moveY / inputLen;
      this.vx = moveToward(this.vx, dirX * maxSpeed, accel * dt);
      this.vy = moveToward(this.vy, dirY * maxSpeed, accel * dt);
      this.facingX = dirX;
      this.facingY = dirY;
      const speedRatio = Math.hypot(this.vx, this.vy) / (baseSpeed * 1.3);
      this.animPhase += speedRatio * dt * 14;
    } else {
      this.vx = moveToward(this.vx, 0, decel * dt);
      this.vy = moveToward(this.vy, 0, decel * dt);
    }

    if (sprint && inputLen > 0.01 && this.stamina > 0.04) {
      this.stamina = Math.max(0, this.stamina - dt * 0.32);
    } else {
      this.stamina = Math.min(1, this.stamina + dt * 0.16);
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    const m = FIELD.margin * 0.6;
    this.x = Math.max(-m, Math.min(FIELD.width + m, this.x));
    this.y = Math.max(-m, Math.min(FIELD.height + m, this.y));

    if (this.actionCooldown > 0) this.actionCooldown -= dt;
    if (this.tackleCooldown > 0) this.tackleCooldown -= dt;
    if (this.kickCooldown > 0) this.kickCooldown -= dt;
    if (this.slowTimer > 0) this.slowTimer -= dt;
  }

  draw(ctx) {
    const { x, y, radius } = this;

    // צל
    ctx.beginPath();
    ctx.ellipse(x, y + radius * 0.75, radius * 0.9, radius * 0.4, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    ctx.fill();

    // רגליים (אנימציית ריצה פשוטה)
    const stride = Math.sin(this.animPhase) * 6;
    const perpX = -this.facingY;
    const perpY = this.facingX;
    ctx.strokeStyle = 'rgba(20,20,20,0.55)';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(x + perpX * 3.5, y + perpY * 3.5);
    ctx.lineTo(x + this.facingX * stride + perpX * 3.5, y + this.facingY * stride + perpY * 3.5);
    ctx.moveTo(x - perpX * 3.5, y - perpY * 3.5);
    ctx.lineTo(x - this.facingX * stride - perpX * 3.5, y - this.facingY * stride - perpY * 3.5);
    ctx.stroke();

    // חולצה
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = this.team.primary;
    ctx.fill();
    ctx.strokeStyle = this.team.secondary;
    ctx.lineWidth = 2;
    ctx.stroke();

    if (this.isUserControlled) {
      ctx.beginPath();
      ctx.arc(x, y, radius + 5, 0, Math.PI * 2);
      ctx.strokeStyle = '#ffe600';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // מספר חולצה
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isLight(this.team.primary) ? '#111' : '#fff';
    ctx.fillText(String(this.shirtNumber), x, y + 1);

    // שם קצר מעל
    const shortName = this.name.split(' ').pop();
    ctx.font = '9px Arial';
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.lineWidth = 2;
    ctx.strokeText(shortName, x, y - radius - 6);
    ctx.fillText(shortName, x, y - radius - 6);
  }
}

function isLight(hex) {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6;
}
