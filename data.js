// טעינת קבוצות ושחקנים, והשלמת סגל ל-11 שחקנים לכל קבוצה עם שחקנים גנריים כשחסר מידע אמיתי
const FORMATION_SLOTS = ['GK', 'DEF', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'MID', 'FWD', 'FWD'];

let teamsCache = null;
let playersCache = null;

export async function loadTeams() {
  if (!teamsCache) {
    const res = await fetch('data/teams.json');
    teamsCache = await res.json();
  }
  return teamsCache;
}

export async function loadPlayers() {
  if (!playersCache) {
    const res = await fetch('data/players.json');
    playersCache = await res.json();
  }
  return playersCache;
}

export function teamRating(teamPlayers) {
  if (teamPlayers.length === 0) return 70;
  const sum = teamPlayers.reduce((acc, p) => acc + p.rating, 0);
  return Math.round(sum / teamPlayers.length);
}

function genericStatsFor(position, baseRating) {
  const jitter = () => Math.round(baseRating + (Math.random() * 10 - 5));
  const stats = { rating: baseRating, pace: jitter(), shooting: jitter(), passing: jitter(), dribbling: jitter(), defending: jitter(), physical: jitter() };
  if (position === 'GK') { stats.shooting = 30; stats.defending = 40; }
  if (position === 'DEF') { stats.defending = Math.min(99, stats.defending + 10); }
  if (position === 'FWD') { stats.shooting = Math.min(99, stats.shooting + 10); }
  return stats;
}

// בונה סגל של 11 שחקנים לקבוצה: שחקנים אמיתיים מתוך players.json + שחקנים גנריים למילוי החוסר
export function buildSquad(teamName, allPlayers) {
  const real = allPlayers.filter((p) => p.team === teamName);
  const usedNumbers = new Set(real.map((p) => p.shirtNumber));
  const baseRating = real.length ? teamRating(real) : 72;

  const squad = [];
  const realByPosition = { GK: [], DEF: [], MID: [], FWD: [] };
  real.forEach((p) => realByPosition[p.position]?.push(p));

  let nextNumber = 2;
  function pickNumber() {
    while (usedNumbers.has(nextNumber)) nextNumber++;
    usedNumbers.add(nextNumber);
    return nextNumber++;
  }

  let fillerCount = 0;
  for (const slot of FORMATION_SLOTS) {
    const pool = realByPosition[slot];
    if (pool && pool.length > 0) {
      squad.push({ ...pool.shift(), isGeneric: false });
    } else {
      fillerCount++;
      squad.push({
        name: `Player ${fillerCount}`,
        team: teamName,
        position: slot,
        shirtNumber: pickNumber(),
        isGeneric: true,
        ...genericStatsFor(slot, baseRating),
      });
    }
  }

  // שחקנים אמיתיים שנשארו מעבר לצרכי הפורמציה - שיבוץ בכל מקום פנוי שנשאר (לא אמור לקרות עם 11 סלוטים, אבל ליתר ביטחון)
  return squad;
}
