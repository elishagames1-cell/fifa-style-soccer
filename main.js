// נקודת הכניסה: מקים את הקנבס, מאזין למקלדת, ומריץ את לולאת המשחק
import { Game } from './game.js';

const canvas = document.getElementById('gameCanvas');
const game = new Game(canvas);

const keys = {};
window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code === 'Space') e.preventDefault(); // מונע גלילת דף
});
window.addEventListener('keyup', (e) => {
  keys[e.code] = false;
});
game.setKeys(keys);

let lastTime = performance.now();
function loop(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.05); // מגביל dt כדי שקפיצת פריים לא תשגע את הפיזיקה
  lastTime = now;
  game.update(dt);
  game.draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
