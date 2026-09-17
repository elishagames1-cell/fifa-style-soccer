// מצלמת top-down עם מעקב חלק וזום דינמי לפי צפיפות שחקנים
import { FIELD } from './field.js';

export class Camera {
  constructor(viewportWidth, viewportHeight) {
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
    this.x = FIELD.width / 2;
    this.y = FIELD.height / 2;

    // זום ברירת מחדל: פנימה, על האזור המיידי סביב המשחק
    this.zoomClose = viewportWidth / 480;
    // זום ליד קו ה-18 של היריב: מתרחק כדי להראות את כל תמונת ההתקפה/הגנה
    this.zoomWide = (viewportWidth / (FIELD.width + FIELD.margin * 2)) * 1.05;
    this.zoom = this.zoomClose;
    // "השליש ההתקפי" - מרחק מהשער שממנו מתחילים להתרחק בהדרגה
    this.attackThird = FIELD.width / 3;
  }

  update(dt, focusX, focusY, players) {
    // רמת זום בסיסית לפי מרחק הכדור/המיקוד מהשער הקרוב ביותר
    const distToGoal = Math.min(focusX, FIELD.width - focusX);
    let targetZoom;
    if (distToGoal >= this.attackThird) {
      targetZoom = this.zoomClose;
    } else {
      const t = distToGoal / this.attackThird; // 0 בקו השער, 1 בקצה השליש ההתקפי
      targetZoom = this.zoomWide + (this.zoomClose - this.zoomWide) * t;
    }

    // צפיפות שחקנים סביב נקודת המיקוד: הרבה שחקנים קרובים -> נדנוד קל נוסף החוצה
    let nearby = 0;
    for (const p of players) {
      const d = Math.hypot(p.x - focusX, p.y - focusY);
      if (d < 140) nearby++;
    }
    const density = Math.min(nearby / 10, 1);
    targetZoom *= 1 - density * 0.08;

    const followSpeed = 3.2;
    this.x += (focusX - this.x) * Math.min(1, followSpeed * dt);
    this.y += (focusY - this.y) * Math.min(1, followSpeed * dt);
    this.zoom += (targetZoom - this.zoom) * Math.min(1, 1.8 * dt); // מעבר חלק בין רמות זום, לא קפיצה

    const halfW = this.viewportWidth / 2 / this.zoom;
    const halfH = this.viewportHeight / 2 / this.zoom;
    const minX = -FIELD.margin + halfW;
    const maxX = FIELD.width + FIELD.margin - halfW;
    const minY = -FIELD.margin + halfH;
    const maxY = FIELD.height + FIELD.margin - halfH;
    // כשהתצוגה רחבה יותר מהמגרש+שוליים (minX>maxX), אין לאן "לתחום" את המצלמה -
    // ממרכזים במקום להשאיר אותה חופשית לזחול ולחשוף שוליים/קהל בפרופורציה מוגזמת
    this.x = minX <= maxX ? Math.max(minX, Math.min(maxX, this.x)) : FIELD.width / 2;
    this.y = minY <= maxY ? Math.max(minY, Math.min(maxY, this.y)) : FIELD.height / 2;
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
