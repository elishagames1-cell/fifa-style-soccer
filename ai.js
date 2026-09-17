// לוגיקת AI: מיקום פורמציה דינמי לכל שחקן שאינו נשלט, ולחיצה/בניית מתקפה עבור מחזיק הכדור
import { FIELD, formationWorldPos } from './field.js';

const PRESS_RADIUS = 190;
const SHOOT_RANGE = 260;
const CLOSE_PRESSURE = 46;

function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

function normalize(dx, dy) {
  const len = Math.hypot(dx, dy) || 1;
  return { x: dx / len, y: dy / len };
}

function goalkeeperTarget(player, ball) {
  const ownGoalX = player.attackDir === 1 ? 6 : FIELD.width - 6;
  const halfGoal = FIELD.goalWidth * 0.62;
  const centerY = FIELD.height / 2;
  const targetY = Math.max(centerY - halfGoal, Math.min(centerY + halfGoal, ball.y));

  const distToGoalLine = Math.abs(ball.x - ownGoalX);
  const ballOnDefensiveSide = player.attackDir === 1 ? ball.x < FIELD.width * 0.35 : ball.x > FIELD.width * 0.65;
  let targetX = ownGoalX + player.attackDir * 12;
  if (ballOnDefensiveSide && distToGoalLine < 200) {
    targetX = ownGoalX + player.attackDir * 34;
  }
  return { x: targetX, y: targetY };
}

function formationTarget(player, ball, teamHasBall) {
  const base = formationWorldPos(player.slotIndex, player.attackDir);
  if (player.role === 'GK') return base;

  const ballFrac = ball.x / FIELD.width;
  const advance = player.attackDir === 1 ? ballFrac - 0.5 : 0.5 - ballFrac;
  const possessionBoost = teamHasBall ? 1.4 : 0.7;
  const shift = Math.max(-70, Math.min(130, advance * 220 * possessionBoost)) * player.attackDir;

  const targetY = base.y + (ball.y - base.y) * 0.12;
  return { x: base.x + shift, y: targetY };
}

function findChaser(squad, ball) {
  let best = null;
  let bestDist = Infinity;
  for (const p of squad) {
    if (p.role === 'GK') continue;
    if (p.isUserControlled) continue;
    const d = dist(p.x, p.y, ball.x, ball.y);
    if (d < bestDist) {
      bestDist = d;
      best = p;
    }
  }
  return best;
}

function findClosestTo(squad, x, y, exclude) {
  let best = null;
  let bestDist = Infinity;
  for (const p of squad) {
    if (p === exclude || p.role === 'GK' || p.isUserControlled) continue;
    const d = dist(p.x, p.y, x, y);
    if (d < bestDist) {
      bestDist = d;
      best = p;
    }
  }
  return best;
}

function decideCarrierIntent(player, ball, ownSquad, oppSquad) {
  const goalX = player.attackDir === 1 ? FIELD.width : 0;
  const goalY = FIELD.height / 2;
  const distToGoal = dist(player.x, player.y, goalX, goalY);

  let nearestOpp = null;
  let nearestOppDist = Infinity;
  for (const o of oppSquad) {
    const d = dist(o.x, o.y, player.x, player.y);
    if (d < nearestOppDist) {
      nearestOppDist = d;
      nearestOpp = o;
    }
  }

  if (distToGoal < SHOOT_RANGE && Math.random() < 0.045) {
    return { type: 'shoot' };
  }

  if (nearestOppDist < CLOSE_PRESSURE) {
    let bestMate = null;
    let bestScore = -Infinity;
    for (const mate of ownSquad) {
      if (mate === player || mate.role === 'GK') continue;
      const mateAdvance = player.attackDir === 1 ? mate.x : -mate.x;
      const laneClear = dist(mate.x, mate.y, player.x, player.y) < 380;
      if (!laneClear) continue;
      if (mateAdvance > bestScore) {
        bestScore = mateAdvance;
        bestMate = mate;
      }
    }
    if (bestMate) {
      const long = dist(player.x, player.y, bestMate.x, bestMate.y) > 220;
      return { type: 'pass', target: bestMate, long };
    }
  }

  const awayFromOpp = nearestOpp ? normalize(player.x - nearestOpp.x, player.y - nearestOpp.y) : { x: 0, y: 0 };
  const towardGoal = normalize(goalX - player.x, goalY - player.y);
  const dirX = towardGoal.x * 0.75 + awayFromOpp.x * 0.35;
  const dirY = towardGoal.y * 0.75 + awayFromOpp.y * 0.35;
  return { type: 'dribble', dir: normalize(dirX, dirY) };
}

// מריץ AI לכל השחקנים שאינם נשלטים כרגע ע"י המשתמש. actions מספק pass()/shoot() שמבוצעים ע"י game.js
export function runAI(dt, { home, away, ball, controlled, actions, tackleRange = 28 }) {
  const teams = [home, away];

  for (const team of teams) {
    const opp = team === home ? away : home;
    const chaser = findChaser(team.squad, ball);
    const ballCarrierSide = ball.carrier ? ball.carrier.side : null;
    const teamHasBall = ballCarrierSide === team.side;
    const oppCarrier = ball.carrier && ball.carrier.side === opp.side ? ball.carrier : null;
    const presser = oppCarrier ? findClosestTo(team.squad, oppCarrier.x, oppCarrier.y) : null;

    for (const player of team.squad) {
      if (player === controlled) continue;

      let target;
      let sprint = false;

      if (player.role === 'GK') {
        target = goalkeeperTarget(player, ball);
      } else if (ball.carrier === player) {
        const intent = decideCarrierIntent(player, ball, team.squad, opp.squad);
        if (player.actionCooldown <= 0) {
          if (intent.type === 'shoot') {
            actions.shoot(player);
            player.actionCooldown = 1.0;
          } else if (intent.type === 'pass') {
            actions.pass(player, intent.target, intent.long);
            player.actionCooldown = 1.0;
          }
        }
        const dir = intent.dir || normalize((player.attackDir === 1 ? FIELD.width : 0) - player.x, FIELD.height / 2 - player.y);
        target = { x: player.x + dir.x * 40, y: player.y + dir.y * 40 };
        sprint = true;
      } else if (!ball.carrier && player === chaser && dist(player.x, player.y, ball.x, ball.y) < PRESS_RADIUS) {
        target = { x: ball.x, y: ball.y };
        sprint = dist(player.x, player.y, ball.x, ball.y) > 50;
      } else if (presser === player) {
        target = { x: oppCarrier.x - player.attackDir * 14, y: oppCarrier.y };
        const dToCarrier = dist(player.x, player.y, oppCarrier.x, oppCarrier.y);
        sprint = dToCarrier > 70;
        if (dToCarrier < tackleRange && player.tackleCooldown <= 0) {
          actions.tackle(player);
        }
      } else {
        target = formationTarget(player, ball, teamHasBall);
      }

      const dir = normalize(target.x - player.x, target.y - player.y);
      const d = dist(player.x, player.y, target.x, target.y);
      const moveX = d > 4 ? dir.x : 0;
      const moveY = d > 4 ? dir.y : 0;
      player.update(dt, { moveX, moveY, sprint });
    }
  }
}
