import { Player } from './player.js';
import { Ball } from './ball.js';

const KICK_POWER = 420;
const KICK_RANGE = 14; // מרווח נוסף מעבר לרדיוסים של השחקן והכדור

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;
    this.keys = {};
    this.spacePrev = false;

    this.player = new Player(this.width / 2 - 100, this.height / 2);
    this.ball = new Ball(this.width / 2, this.height / 2);
  }

  setKeys(keys) {
    this.keys = keys;
  }

  update(dt) {
    this.player.update(dt, this.keys, this.width, this.height);

    // בעיטה בלחיצה בודדת (edge-triggered) כדי שהחזקת רווח לא תבעט כל פריים
    const spaceNow = !!this.keys['Space'];
    if (spaceNow && !this.spacePrev) {
      this.tryKick();
    }
    this.spacePrev = spaceNow;

    this.ball.update(dt, this.width, this.height);
  }

  tryKick() {
    const dx = this.ball.x - this.player.x;
    const dy = this.ball.y - this.player.y;
    const dist = Math.hypot(dx, dy);
    if (dist < this.player.radius + this.ball.radius + KICK_RANGE) {
      this.ball.kick(this.player.facingX * KICK_POWER, this.player.facingY * KICK_POWER);
    }
  }

  draw() {
    this.drawField();
    this.ball.draw(this.ctx);
    this.player.draw(this.ctx);
  }

  drawField() {
    const ctx = this.ctx;
    ctx.fillStyle = '#2e7d32';
    ctx.fillRect(0, 0, this.width, this.height);

    const margin = 20;
    ctx.strokeStyle = '#f2f2f2';
    ctx.lineWidth = 3;
    ctx.strokeRect(margin, margin, this.width - margin * 2, this.height - margin * 2);

    // קו חצי מגרש
    ctx.beginPath();
    ctx.moveTo(this.width / 2, margin);
    ctx.lineTo(this.width / 2, this.height - margin);
    ctx.stroke();

    // מעגל מרכז
    ctx.beginPath();
    ctx.arc(this.width / 2, this.height / 2, 70, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(this.width / 2, this.height / 2, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#f2f2f2';
    ctx.fill();

    // שערים בשני הצדדים
    const goalWidth = 110, goalDepth = 18;
    ctx.lineWidth = 4;
    ctx.strokeRect(margin - goalDepth, this.height / 2 - goalWidth / 2, goalDepth, goalWidth);
    ctx.strokeRect(this.width - margin, this.height / 2 - goalWidth / 2, goalDepth, goalWidth);
  }
}
