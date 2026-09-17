import { FIELD } from './field.js';

function formatClock(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function drawHUD(ctx, vw, vh, state) {
  const { home, away, clockSeconds, half, ball, controlled, shootPower, camera } = state;

  // סרגל עליון: קבוצות, תוצאה, שעון
  const barW = 320;
  const barH = 46;
  const barX = vw / 2 - barW / 2;
  const barY = 8;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  roundRect(ctx, barX, barY, barW, barH, 8);
  ctx.fill();

  ctx.textBaseline = 'middle';
  ctx.font = 'bold 15px Arial';
  ctx.textAlign = 'right';
  ctx.fillStyle = '#fff';
  ctx.fillText(home.team.abbr, barX + 92, barY + 16);
  ctx.textAlign = 'left';
  ctx.fillText(away.team.abbr, barX + barW - 92, barY + 16);

  ctx.textAlign = 'center';
  ctx.font = 'bold 18px Arial';
  ctx.fillText(`${home.score} - ${away.score}`, barX + barW / 2, barY + 16);

  ctx.font = '12px Arial';
  ctx.fillStyle = '#ccc';
  ctx.fillText(`${half === 1 ? '1st Half' : '2nd Half'}  ${formatClock(clockSeconds)}`, barX + barW / 2, barY + 34);

  colorChip(ctx, barX + 14, barY + 16, home.team);
  colorChip(ctx, barX + barW - 14, barY + 16, away.team);

  // מיני-מפה
  const mapW = 150;
  const mapH = (mapW * FIELD.height) / FIELD.width;
  const mapX = vw - mapW - 14;
  const mapY = vh - mapH - 14;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  roundRect(ctx, mapX - 4, mapY - 4, mapW + 8, mapH + 8, 6);
  ctx.fill();
  ctx.fillStyle = '#2e7d32';
  ctx.fillRect(mapX, mapY, mapW, mapH);
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 1;
  ctx.strokeRect(mapX, mapY, mapW, mapH);

  const toMap = (x, y) => ({ x: mapX + (x / FIELD.width) * mapW, y: mapY + (y / FIELD.height) * mapH });
  for (const p of [...home.squad, ...away.squad]) {
    const mp = toMap(p.x, p.y);
    ctx.beginPath();
    ctx.arc(mp.x, mp.y, p === controlled ? 3 : 2, 0, Math.PI * 2);
    ctx.fillStyle = p.team.primary;
    ctx.fill();
    if (p === controlled) {
      ctx.strokeStyle = '#ffe600';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
  const bm = toMap(ball.x, ball.y);
  ctx.beginPath();
  ctx.arc(bm.x, bm.y, 2, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.fill();

  // מד כוח בעיטה מעל השחקן הנשלט
  if (shootPower !== null && controlled && camera) {
    const screen = camera.worldToScreen(controlled.x, controlled.y);
    const w = 34;
    const h = 5;
    const x = screen.x - w / 2;
    const y = screen.y - 30;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = shootPower > 0.75 ? '#ff4d4d' : '#ffe600';
    ctx.fillRect(x, y, w * shootPower, h);
  }

  // מקרא שליטה
  ctx.textAlign = 'left';
  ctx.font = '11px Arial';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  const controls = 'Move: WASD/Arrows   Sprint: Shift   Pass: J (hold=long)   Shoot: K (hold to charge)   Tackle: E   Switch: Tab';
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  roundRect(ctx, 8, vh - 26, ctx.measureText(controls).width + 16, 20, 5);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText(controls, 16, vh - 16);
}

function colorChip(ctx, x, y, team) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, Math.PI * 2);
  ctx.fillStyle = team.primary;
  ctx.fill();
  ctx.strokeStyle = team.secondary;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawMatchMessage(ctx, vw, vh, text) {
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, vh / 2 - 40, vw, 80);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 26px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, vw / 2, vh / 2);
}
