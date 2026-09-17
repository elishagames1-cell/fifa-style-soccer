// ציור סמל קבוצה גנרי: מגן בצבעי הקבוצה עם ראשי תיבות באמצע (לא לוגו רשמי מועתק)
export function drawCrest(ctx, w, h, team) {
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.translate(w / 2, 2);

  const shieldW = w - 8;
  const shieldH = h - 6;
  const top = 0;

  ctx.beginPath();
  ctx.moveTo(-shieldW / 2, top);
  ctx.lineTo(shieldW / 2, top);
  ctx.lineTo(shieldW / 2, shieldH * 0.55);
  ctx.quadraticCurveTo(shieldW / 2, shieldH * 0.85, 0, shieldH);
  ctx.quadraticCurveTo(-shieldW / 2, shieldH * 0.85, -shieldW / 2, shieldH * 0.55);
  ctx.closePath();

  ctx.fillStyle = team.primary;
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = team.secondary;
  ctx.stroke();

  // פס אמצעי בצבע המשני, כדי שהסמל לא יהיה צבע אחיד שטוח
  ctx.save();
  ctx.clip();
  ctx.fillStyle = team.secondary;
  ctx.fillRect(-shieldW / 2, shieldH * 0.35, shieldW, shieldH * 0.22);
  ctx.restore();

  // ראשי תיבות במרכז, עם קונטור כדי שיהיה קריא על כל רקע
  ctx.font = `bold ${Math.round(shieldH * 0.32)}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const textColor = isLight(team.primary) ? '#111111' : '#ffffff';
  ctx.fillStyle = textColor;
  ctx.fillText(team.abbr, 0, shieldH * 0.42);

  ctx.restore();
}

function isLight(hex) {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6;
}
