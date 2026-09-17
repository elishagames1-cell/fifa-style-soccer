// טבלת מובילים מקומית: נקודות = מספר הגולים שהובקעו במשחק שנוצח, 0 נקודות אם לא ניצחו
const KEY = 'soccer_leaderboard_v1';

function loadBoard() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}

function saveBoard(board) {
  localStorage.setItem(KEY, JSON.stringify(board));
}

export function recordResult(username, { won, goalsScored }) {
  const board = loadBoard();
  const points = won ? goalsScored : 0;
  board[username] = (board[username] || 0) + points;
  saveBoard(board);
  return board[username];
}

export function getLeaderboard() {
  const board = loadBoard();
  return Object.entries(board)
    .map(([username, points]) => ({ username, points }))
    .sort((a, b) => b.points - a.points);
}
