import { Player } from './player.js';
import { Ball } from './ball.js';
import { Camera } from './camera.js';
import { runAI } from './ai.js';
import { drawHUD, drawMatchMessage } from './ui.js';
import { FIELD, formationWorldPos } from './field.js';
import { loadPlayers, buildSquad } from './data.js';

const HALF_LENGTH_SECONDS = 4 * 60;
const PICKUP_RADIUS = 22;
const TACKLE_RANGE = 28;

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export class Game {
  constructor(canvas, { onMatchEnd } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;
    this.onMatchEnd = onMatchEnd || (() => {});

    this.camera = new Camera(this.width, this.height);
    this.ball = new Ball(FIELD.width / 2, FIELD.height / 2);

    this.keys = {};
    this.prev = { tab: false, pass: false, shoot: false, tackle: false };
    this.passHoldTime = 0;
    this.shootPower = 0;
    this.switchCooldown = 0;

    this.state = 'playing'; // playing | message | fulltime
    this.messageText = '';
    this.messageTimer = 0;
    this.messageThen = null;
    this.half = 1;
    this.clockSeconds = 0;

    this.crowdDots = generateCrowdDots();
    this.tackleEffects = [];

    this.actions = {
      pass: (player, target, long) => this.passTo(player, target, long),
      shoot: (player) => this.shootBall(player, 0.8),
      tackle: (player) => this.attemptTackle(player),
    };
  }

  async init(myTeam, opponentTeam) {
    const allPlayers = await loadPlayers();
    const mySquadData = buildSquad(myTeam.name, allPlayers);
    const oppSquadData = buildSquad(opponentTeam.name, allPlayers);

    this.home = { team: myTeam, squad: this.spawnSquad(mySquadData, myTeam, 'home', 1), attackDir: 1, side: 'home', score: 0 };
    this.away = { team: opponentTeam, squad: this.spawnSquad(oppSquadData, opponentTeam, 'away', -1), attackDir: -1, side: 'away', score: 0 };
    this.home.squad.forEach((p) => (p.side = 'home'));
    this.away.squad.forEach((p) => (p.side = 'away'));

    this.controlled = this.home.squad.find((p) => p.role !== 'GK');
    this.controlled.isUserControlled = true;

    this.resetKickoff();
  }

  spawnSquad(squadData, team, side, attackDir) {
    return squadData.map((data, i) => {
      const pos = formationWorldPos(i, attackDir);
      return new Player({
        name: data.name,
        shirtNumber: data.shirtNumber,
        position: data.position,
        stats: {
          rating: data.rating,
          pace: data.pace,
          shooting: data.shooting,
          passing: data.passing,
          dribbling: data.dribbling,
          defending: data.defending,
          physical: data.physical,
        },
        team,
        side,
        attackDir,
        slotIndex: i,
        x: pos.x,
        y: pos.y,
      });
    });
  }

  setKeys(keys) {
    this.keys = keys;
  }

  resetKickoff() {
    for (const p of [...this.home.squad, ...this.away.squad]) {
      const pos = formationWorldPos(p.slotIndex, p.attackDir);
      p.x = pos.x;
      p.y = pos.y;
      p.vx = 0;
      p.vy = 0;
      p.slowTimer = 0;
    }
    this.ball.x = FIELD.width / 2;
    this.ball.y = FIELD.height / 2;
    this.ball.vx = 0;
    this.ball.vy = 0;
    this.ball.carrier = null;
  }

  showMessage(text, seconds, then) {
    this.state = 'message';
    this.messageText = text;
    this.messageTimer = seconds;
    this.messageThen = then;
  }

  update(dt) {
    if (this.state === 'message') {
      this.messageTimer -= dt;
      if (this.messageTimer <= 0) {
        const then = this.messageThen;
        this.state = 'playing';
        this.messageThen = null;
        if (then) then();
      }
      return;
    }

    if (this.state === 'fulltime') {
      if (this.keys['KeyR'] && !this.prev.restart) {
        this.onMatchEnd();
      }
      this.prev.restart = !!this.keys['KeyR'];
      return;
    }

    this.autoSwitch();
    this.handleInput(dt);

    runAI(dt, { home: this.home, away: this.away, ball: this.ball, controlled: this.controlled, actions: this.actions, tackleRange: TACKLE_RANGE });

    this.updateBallPickup();
    const prevBallX = this.ball.x;
    this.ball.update(dt, FIELD.width, FIELD.height);
    this.separatePlayers();
    this.checkGoal(prevBallX);
    this.updateClock(dt);
    this.updateTackleEffects(dt);

    if (this.switchCooldown > 0) this.switchCooldown -= dt;
  }

  autoSwitch() {
    if (this.ball.carrier === this.controlled) return;
    if (this.switchCooldown > 0) return;
    let best = null;
    let bestDist = Infinity;
    for (const p of this.home.squad) {
      if (p.role === 'GK') continue;
      const d = dist(p, this.ball);
      if (d < bestDist) {
        bestDist = d;
        best = p;
      }
    }
    if (best && best !== this.controlled) {
      this.setControlled(best);
    }
  }

  setControlled(player) {
    if (this.controlled) this.controlled.isUserControlled = false;
    this.controlled = player;
    this.controlled.isUserControlled = true;
    this.switchCooldown = 0.4;
  }

  handleInput(dt) {
    const keys = this.keys;
    let ix = 0;
    let iy = 0;
    if (keys['KeyW'] || keys['ArrowUp']) iy -= 1;
    if (keys['KeyS'] || keys['ArrowDown']) iy += 1;
    if (keys['KeyA'] || keys['ArrowLeft']) ix -= 1;
    if (keys['KeyD'] || keys['ArrowRight']) ix += 1;
    const sprint = !!(keys['ShiftLeft'] || keys['ShiftRight']);
    this.controlled.update(dt, { moveX: ix, moveY: iy, sprint });

    // מסירה: לחיצה קצרה = קרקעית מדויקת, לחיצה ארוכה = גבוהה/רחוקה
    const passDown = !!keys['KeyJ'];
    if (passDown && !this.prev.pass) this.passHoldTime = 0;
    if (passDown) this.passHoldTime += dt;
    if (!passDown && this.prev.pass && this.ball.carrier === this.controlled) {
      const long = this.passHoldTime > 0.28;
      const target = this.findPassTarget(this.controlled);
      if (target) this.passTo(this.controlled, target, long);
    }
    this.prev.pass = passDown;

    // בעיטה: מד כוח לפי משך לחיצה
    const shootDown = !!keys['KeyK'];
    if (shootDown && this.ball.carrier === this.controlled) {
      this.shootPower = Math.min(1, this.shootPower + dt / 1.1);
    } else if (!shootDown && this.prev.shoot && this.ball.carrier === this.controlled) {
      this.shootBall(this.controlled, Math.max(0.25, this.shootPower));
      this.shootPower = 0;
    } else if (!shootDown) {
      this.shootPower = 0;
    }
    this.prev.shoot = shootDown;

    // חטיפת כדור
    const tackleDown = !!keys['KeyE'];
    if (tackleDown && !this.prev.tackle) this.attemptTackle(this.controlled);
    this.prev.tackle = tackleDown;

    // החלפת שחקן נשלט ידנית
    const tabDown = !!keys['Tab'];
    if (tabDown && !this.prev.tab) this.cyclePlayer();
    this.prev.tab = tabDown;
  }

  cyclePlayer() {
    const squad = this.home.squad;
    const idx = squad.indexOf(this.controlled);
    const next = squad[(idx + 1) % squad.length];
    this.setControlled(next);
  }

  findPassTarget(player) {
    const mates = this.home.squad.filter((p) => p !== player);
    let best = null;
    let bestScore = -Infinity;
    for (const mate of mates) {
      const dx = mate.x - player.x;
      const dy = mate.y - player.y;
      const d = Math.hypot(dx, dy) || 1;
      const dot = (dx / d) * player.facingX + (dy / d) * player.facingY;
      if (dot > 0.25) {
        const score = dot * 400 - d;
        if (score > bestScore) {
          bestScore = score;
          best = mate;
        }
      }
    }
    if (best) return best;
    let nearest = null;
    let nearestDist = Infinity;
    for (const mate of mates) {
      const d = dist(mate, player);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = mate;
      }
    }
    return nearest;
  }

  passTo(fromPlayer, targetPlayer, long) {
    if (!targetPlayer || fromPlayer.kickCooldown > 0) return;
    const dx = targetPlayer.x - fromPlayer.x;
    const dy = targetPlayer.y - fromPlayer.y;
    const d = Math.hypot(dx, dy) || 1;
    const dirX = dx / d;
    const dirY = dy / d;
    const passingStat = fromPlayer.stats.passing / 80;
    const baseSpeed = long ? 330 : 225;
    const speed = baseSpeed * passingStat;
    this.ball.kick(dirX * speed + targetPlayer.vx * 0.25, dirY * speed + targetPlayer.vy * 0.25, { lofted: long });
    this.ball.lastTouchSide = fromPlayer.side;
    fromPlayer.kickCooldown = 0.3;
    this.ball.pickupBlockTimer = 0.15;
  }

  shootBall(fromPlayer, power) {
    if (fromPlayer.kickCooldown > 0) return;
    const shootingStat = fromPlayer.stats.shooting / 80;
    const speed = (250 + power * 380) * shootingStat;
    this.ball.kick(fromPlayer.facingX * speed, fromPlayer.facingY * speed, { lofted: false });
    this.ball.lastTouchSide = fromPlayer.side;
    fromPlayer.kickCooldown = 0.35;
    this.ball.pickupBlockTimer = 0.15;
  }

  attemptTackle(player) {
    if (player.tackleCooldown > 0) return;
    const carrier = this.ball.carrier;
    if (!carrier || carrier.side === player.side) return;
    if (dist(player, carrier) > TACKLE_RANGE) return;

    const chance = Math.max(0.1, Math.min(0.9, 0.5 + (player.stats.defending - carrier.stats.dribbling) / 100));
    const success = Math.random() < chance;
    this.tackleEffects.push({ x1: player.x, y1: player.y, x2: carrier.x, y2: carrier.y, t: 0.25, success });

    if (success) {
      this.ball.carrier = player;
      this.ball.lastTouchSide = player.side;
      this.ball.pickupBlockTimer = 0.05;
      player.tackleCooldown = 0.5;
    } else {
      player.slowTimer = 0.5;
      player.tackleCooldown = 0.7;
    }
  }

  updateTackleEffects(dt) {
    for (const e of this.tackleEffects) e.t -= dt;
    this.tackleEffects = this.tackleEffects.filter((e) => e.t > 0);
  }

  updateBallPickup() {
    if (this.ball.pickupBlockTimer > 0) {
      this.ball.pickupBlockTimer -= 1 / 60;
      return;
    }
    if (this.ball.carrier) return;
    if (Math.hypot(this.ball.vx, this.ball.vy) > 260) return;

    let best = null;
    let bestDist = Infinity;
    for (const p of [...this.home.squad, ...this.away.squad]) {
      const d = dist(p, this.ball);
      if (d < PICKUP_RADIUS && d < bestDist) {
        bestDist = d;
        best = p;
      }
    }
    if (best) {
      this.ball.carrier = best;
      this.ball.lastTouchSide = best.side;
    }
  }

  separatePlayers() {
    const all = [...this.home.squad, ...this.away.squad];
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        const a = all[i];
        const b = all[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 0.001;
        const minDist = a.radius + b.radius;
        if (d < minDist) {
          const push = (minDist - d) / 2;
          const nx = dx / d;
          const ny = dy / d;
          a.x -= nx * push;
          a.y -= ny * push;
          b.x += nx * push;
          b.y += ny * push;
        }
      }
    }
  }

  checkGoal(prevBallX) {
    const halfGoal = FIELD.goalWidth / 2;
    const centerY = FIELD.height / 2;
    const inGoalY = this.ball.y > centerY - halfGoal && this.ball.y < centerY + halfGoal;
    if (!inGoalY) return;

    // גול נספר רק ברגע החציה בפועל של קו השער (לא כשהכדור כבר שוכב מעבר לקו), כדי שלא יהיה אפשר "לעקוף" מהצד
    if (prevBallX >= 0 && this.ball.x < 0) {
      const conceding = this.home.attackDir === 1 ? this.home : this.away;
      this.scoreGoal(conceding === this.home ? this.away : this.home);
    } else if (prevBallX <= FIELD.width && this.ball.x > FIELD.width) {
      const conceding = this.home.attackDir === -1 ? this.home : this.away;
      this.scoreGoal(conceding === this.home ? this.away : this.home);
    }
  }

  scoreGoal(scoringTeam) {
    scoringTeam.score++;
    this.showMessage(`GOAL! ${scoringTeam.team.name}`, 2.2, () => this.resetKickoff());
  }

  updateClock(dt) {
    this.clockSeconds += dt;
    if (this.clockSeconds >= HALF_LENGTH_SECONDS) {
      if (this.half === 1) {
        this.half = 2;
        this.clockSeconds = 0;
        this.home.attackDir *= -1;
        this.away.attackDir *= -1;
        for (const p of [...this.home.squad, ...this.away.squad]) p.attackDir *= -1;
        this.showMessage('Half Time', 2.5, () => this.resetKickoff());
      } else {
        this.clockSeconds = HALF_LENGTH_SECONDS;
        this.state = 'fulltime';
      }
    }
  }

  draw() {
    const ctx = this.ctx;
    ctx.save();
    this.camera.apply(ctx);
    this.drawPitch(ctx);

    const all = [...this.home.squad, ...this.away.squad].sort((a, b) => a.y - b.y);
    for (const p of all) p.draw(ctx);
    this.ball.draw(ctx);
    this.drawTackleEffects(ctx);

    ctx.restore();

    this.camera.update(1 / 60, this.ball.x, this.ball.y, [...this.home.squad, ...this.away.squad]);

    drawHUD(ctx, this.width, this.height, {
      home: this.home,
      away: this.away,
      clockSeconds: this.clockSeconds,
      half: this.half,
      ball: this.ball,
      controlled: this.controlled,
      shootPower: this.ball.carrier === this.controlled && this.shootPower > 0 ? this.shootPower : null,
      camera: this.camera,
    });

    if (this.state === 'message') {
      drawMatchMessage(ctx, this.width, this.height, this.messageText);
    } else if (this.state === 'fulltime') {
      drawMatchMessage(ctx, this.width, this.height, `Full Time  ${this.home.score} - ${this.away.score}   (Press R for new match)`);
    }
  }

  drawPitch(ctx) {
    const { width, height, margin } = FIELD;

    ctx.fillStyle = '#173318';
    ctx.fillRect(-margin - 40, -margin - 40, width + (margin + 40) * 2, height + (margin + 40) * 2);
    for (const d of this.crowdDots) {
      ctx.fillStyle = d.color;
      ctx.fillRect(d.x, d.y, 3, 3);
    }

    ctx.fillStyle = '#2f7a34';
    ctx.fillRect(-margin, -margin, width + margin * 2, height + margin * 2);

    const stripeCount = 12;
    const stripeH = height / stripeCount;
    for (let i = 0; i < stripeCount; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#2e7d32' : '#348a38';
      ctx.fillRect(0, i * stripeH, width, stripeH);
    }

    ctx.strokeStyle = '#f2f2f2';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(0, 0, width, height);
    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, FIELD.centerCircleRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#f2f2f2';
    ctx.fill();

    this.drawBoxesForEnd(ctx, 0, 1);
    this.drawBoxesForEnd(ctx, width, -1);

    const cr = 8;
    ctx.beginPath();
    ctx.arc(0, 0, cr, 0, Math.PI / 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(width, 0, cr, Math.PI / 2, Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, height, cr, -Math.PI / 2, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(width, height, cr, Math.PI, Math.PI * 1.5);
    ctx.stroke();

    this.drawGoal(ctx, 0, 1);
    this.drawGoal(ctx, width, -1);
  }

  drawTackleEffects(ctx) {
    for (const e of this.tackleEffects) {
      const alpha = Math.max(0, e.t / 0.25);
      ctx.strokeStyle = e.success ? `rgba(80,230,120,${alpha})` : `rgba(230,80,80,${alpha})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(e.x1, e.y1);
      ctx.lineTo(e.x2, e.y2);
      ctx.stroke();
    }
  }

  drawBoxesForEnd(ctx, lineX, dir) {
    const { penaltyDepth, penaltyWidth, sixYardDepth, sixYardWidth, height, penaltySpotDist } = FIELD;
    const cy = height / 2;
    ctx.strokeRect(dir === 1 ? lineX : lineX - penaltyDepth, cy - penaltyWidth / 2, penaltyDepth, penaltyWidth);
    ctx.strokeRect(dir === 1 ? lineX : lineX - sixYardDepth, cy - sixYardWidth / 2, sixYardDepth, sixYardWidth);
    ctx.beginPath();
    ctx.arc(lineX + dir * penaltySpotDist, cy, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#f2f2f2';
    ctx.fill();
    ctx.beginPath();
    const startAngle = dir === 1 ? -0.93 : Math.PI - 0.93;
    const endAngle = dir === 1 ? 0.93 : Math.PI + 0.93;
    ctx.arc(lineX + dir * penaltySpotDist, cy, 55, startAngle, endAngle);
    ctx.stroke();
  }

  drawGoal(ctx, lineX, dir) {
    const { goalWidth, goalDepth, height } = FIELD;
    const cy = height / 2;
    const x0 = dir === 1 ? lineX - goalDepth : lineX;
    ctx.strokeStyle = '#eee';
    ctx.lineWidth = 3;
    ctx.strokeRect(x0, cy - goalWidth / 2, goalDepth, goalWidth);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1;
    const step = 6;
    for (let gy = cy - goalWidth / 2; gy <= cy + goalWidth / 2; gy += step) {
      ctx.beginPath();
      ctx.moveTo(x0, gy);
      ctx.lineTo(x0 + goalDepth, gy);
      ctx.stroke();
    }
    for (let gx = x0; gx <= x0 + goalDepth; gx += step) {
      ctx.beginPath();
      ctx.moveTo(gx, cy - goalWidth / 2);
      ctx.lineTo(gx, cy + goalWidth / 2);
      ctx.stroke();
    }
  }
}

function generateCrowdDots() {
  const { width, height, margin } = FIELD;
  const outer = margin + 40;
  const colors = ['#c0392b', '#2980b9', '#f1c40f', '#ecf0f1', '#8e44ad', '#27ae60'];
  const dots = [];
  for (let i = 0; i < 260; i++) {
    const edge = Math.floor(Math.random() * 4);
    let x, y;
    if (edge === 0) {
      x = -outer + Math.random() * (width + outer * 2);
      y = -outer + Math.random() * (outer - margin);
    } else if (edge === 1) {
      x = -outer + Math.random() * (width + outer * 2);
      y = height + margin + Math.random() * (outer - margin);
    } else if (edge === 2) {
      x = -outer + Math.random() * (outer - margin);
      y = -outer + Math.random() * (height + outer * 2);
    } else {
      x = width + margin + Math.random() * (outer - margin);
      y = -outer + Math.random() * (height + outer * 2);
    }
    dots.push({ x, y, color: colors[Math.floor(Math.random() * colors.length)] });
  }
  return dots;
}
