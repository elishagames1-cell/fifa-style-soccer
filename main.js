// נקודת הכניסה: מנהל את המעבר בין מסכים (התחברות -> בית -> בחירת קבוצה/טבלה/הסבר -> משחק)
import { initAuth, getSession, clearSession } from './auth.js';
import { initTeamSelect } from './teamSelect.js';
import { Game } from './game.js';
import { initTouchControls } from './touchControls.js';
import { recordResult, getLeaderboard } from './leaderboard.js';

const authScreen = document.getElementById('authScreen');
const homeScreen = document.getElementById('homeScreen');
const teamSelectScreen = document.getElementById('teamSelectScreen');
const leaderboardScreen = document.getElementById('leaderboardScreen');
const helpScreen = document.getElementById('helpScreen');
const gameScreen = document.getElementById('gameScreen');

const allScreens = [authScreen, homeScreen, teamSelectScreen, leaderboardScreen, helpScreen, gameScreen];

initTouchControls(gameScreen);
initFullscreenButton();

function initFullscreenButton() {
  const btn = document.getElementById('fullscreenBtn');
  const supported = !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen);
  if (!supported) {
    btn.style.display = 'none';
    return;
  }

  function isFullscreen() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement);
  }

  btn.addEventListener('click', () => {
    if (!isFullscreen()) {
      const req = document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen;
      req.call(document.documentElement).catch((err) => console.warn('Fullscreen request failed:', err));
    } else {
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      exit.call(document);
    }
  });

  ['fullscreenchange', 'webkitfullscreenchange'].forEach((evt) => {
    document.addEventListener(evt, () => {
      btn.textContent = isFullscreen() ? '⤢' : '⛶';
      btn.title = isFullscreen() ? 'Exit Fullscreen' : 'Fullscreen';
    });
  });
}

function showScreen(screen) {
  allScreens.forEach((s) => s.classList.add('hidden'));
  screen.classList.remove('hidden');
}

let teamSelectApi = null;
let currentGame = null;
let keysBound = false;
let currentUsername = '';

function goHome(username) {
  currentUsername = username;
  document.getElementById('homeUsernameLabel').textContent = username;
  document.getElementById('teamSelectUsernameLabel').textContent = username;
  document.getElementById('leaderboardUsernameLabel').textContent = username;
  document.getElementById('helpUsernameLabel').textContent = username;
  showScreen(homeScreen);
}

function logout() {
  clearSession();
  showScreen(authScreen);
}

['homeLogoutBtn', 'teamSelectLogoutBtn', 'leaderboardLogoutBtn', 'helpLogoutBtn'].forEach((id) => {
  document.getElementById(id).addEventListener('click', logout);
});

['teamSelectBackBtn', 'leaderboardBackBtn', 'helpBackBtn'].forEach((id) => {
  document.getElementById(id).addEventListener('click', () => showScreen(homeScreen));
});

document.getElementById('startPlayingBtn').addEventListener('click', async () => {
  showScreen(teamSelectScreen);
  await ensureTeamSelect();
});

document.getElementById('leaderboardBtn').addEventListener('click', () => {
  renderLeaderboard();
  showScreen(leaderboardScreen);
});
document.getElementById('helpBtn').addEventListener('click', () => showScreen(helpScreen));

function renderLeaderboard() {
  const list = document.getElementById('leaderboardList');
  list.innerHTML = '';
  const entries = getLeaderboard();

  if (entries.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'leaderboard-empty';
    empty.textContent = 'No results yet — win a match to get on the board!';
    list.appendChild(empty);
    return;
  }

  entries.forEach((entry, i) => {
    const row = document.createElement('div');
    row.className = 'leaderboard-row';

    const rank = document.createElement('span');
    rank.className = 'lb-rank';
    rank.textContent = `#${i + 1}`;

    const name = document.createElement('span');
    name.className = 'lb-name';
    name.textContent = entry.username;

    const points = document.createElement('span');
    points.className = 'lb-points';
    points.textContent = `${entry.points} pts`;

    row.append(rank, name, points);
    list.appendChild(row);
  });
}

function handleFullTime({ homeScore, awayScore }) {
  const won = homeScore > awayScore;
  recordResult(currentUsername, { won, goalsScored: homeScore });
  currentGame = null;
  renderLeaderboard();
  showScreen(leaderboardScreen);
}

function leaveMatch(destination) {
  currentGame = null;
  showScreen(destination);
  if (destination === teamSelectScreen && teamSelectApi) teamSelectApi.reset();
}

document.getElementById('gameBackBtn').addEventListener('click', () => leaveMatch(teamSelectScreen));
document.getElementById('gameHomeBtn').addEventListener('click', () => leaveMatch(homeScreen));

async function ensureTeamSelect() {
  if (!teamSelectApi) {
    teamSelectApi = await initTeamSelect({
      onTeamsChosen: (myTeam, opponentTeam, durationMinutes) => startMatch(myTeam, opponentTeam, durationMinutes),
    });
  } else {
    teamSelectApi.reset();
  }
}

initAuth({ onLoginSuccess: goHome });

const existingSession = getSession();
if (existingSession) {
  goHome(existingSession);
}

async function startMatch(myTeam, opponentTeam, durationMinutes) {
  showScreen(gameScreen);
  const canvas = document.getElementById('gameCanvas');

  const game = new Game(canvas, {
    onMatchEnd: () => leaveMatch(teamSelectScreen),
    onFullTime: handleFullTime,
  });
  await game.init(myTeam, opponentTeam, durationMinutes);
  currentGame = game;

  const keys = {};
  if (!keysBound) {
    keysBound = true;
    window.addEventListener('keydown', (e) => {
      keys[e.code] = true;
      if (['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => {
      keys[e.code] = false;
    });
    window.__gameKeys = keys;
  }
  game.setKeys(window.__gameKeys);

  let lastTime = performance.now();
  function loop(now) {
    if (currentGame !== game) return; // עצור לולאה ישנה אם עברנו למשחק חדש
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    game.update(dt);
    game.draw();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}
