// מסך בחירת קבוצה: קודם בחירת הקבוצה שלי, אחר כך קבוצה יריבה (או רנדומלית)
import { loadTeams, loadPlayers, buildSquad, teamRating } from './data.js';
import { drawCrest } from './crest.js';

export async function initTeamSelect({ onTeamsChosen }) {
  const titleEl = document.getElementById('teamSelectTitle');
  const gridEl = document.getElementById('teamGrid');

  const teams = await loadTeams();
  const players = await loadPlayers();

  let phase = 'mine'; // 'mine' | 'opponent' | 'duration' | 'difficulty'
  let myTeam = null;
  let opponentTeam = null;
  let durationMinutes = null;

  function teamCard(team, opts = {}) {
    const card = document.createElement('div');
    card.className = 'team-card';
    if (opts.disabled) card.classList.add('disabled');

    const canvas = document.createElement('canvas');
    canvas.width = 70;
    canvas.height = 80;
    drawCrest(canvas.getContext('2d'), 70, 80, team);

    const nameEl = document.createElement('div');
    nameEl.className = 'team-card-name';
    nameEl.textContent = team.name;

    const squad = buildSquad(team.name, players);
    const ratingEl = document.createElement('div');
    ratingEl.className = 'team-card-rating';
    ratingEl.textContent = `דירוג: ${teamRating(squad)}`;

    card.append(canvas, nameEl, ratingEl);
    if (!opts.disabled) {
      card.addEventListener('click', () => opts.onClick());
    }
    return card;
  }

  function renderMinePhase() {
    phase = 'mine';
    titleEl.textContent = 'בחר את הקבוצה שלך';
    gridEl.innerHTML = '';
    for (const team of teams) {
      gridEl.appendChild(
        teamCard(team, {
          onClick: () => {
            myTeam = team;
            renderOpponentPhase();
          },
        })
      );
    }
  }

  function renderOpponentPhase() {
    phase = 'opponent';
    titleEl.textContent = `הקבוצה שלך: ${myTeam.name} — בחר יריבה`;
    gridEl.innerHTML = '';

    const randomCard = document.createElement('div');
    randomCard.className = 'team-card random-card';
    randomCard.innerHTML = '<div class="random-icon">?</div><div class="team-card-name">אקראי</div>';
    randomCard.addEventListener('click', () => {
      const candidates = teams.filter((t) => t.name !== myTeam.name);
      opponentTeam = candidates[Math.floor(Math.random() * candidates.length)];
      renderDurationPhase();
    });
    gridEl.appendChild(randomCard);

    for (const team of teams) {
      const isMine = team.name === myTeam.name;
      gridEl.appendChild(
        teamCard(team, {
          disabled: isMine,
          onClick: () => {
            opponentTeam = team;
            renderDurationPhase();
          },
        })
      );
    }
  }

  function renderDurationPhase() {
    phase = 'duration';
    titleEl.textContent = `${myTeam.name} נגד ${opponentTeam.name} — משך המשחק`;
    gridEl.innerHTML = '';

    for (const minutes of [2, 5, 10]) {
      const card = document.createElement('div');
      card.className = 'team-card duration-card';
      card.innerHTML = `<div class="duration-icon">⏱</div><div class="team-card-name">${minutes} דקות</div>`;
      card.addEventListener('click', () => {
        durationMinutes = minutes;
        renderDifficultyPhase();
      });
      gridEl.appendChild(card);
    }
  }

  function renderDifficultyPhase() {
    phase = 'difficulty';
    titleEl.textContent = `${myTeam.name} נגד ${opponentTeam.name} — רמת קושי`;
    gridEl.innerHTML = '';

    const levels = [
      { key: 'easy', label: 'קל', icon: '🙂' },
      { key: 'medium', label: 'בינוני', icon: '😐' },
      { key: 'hard', label: 'קשה', icon: '😈' },
    ];
    for (const level of levels) {
      const card = document.createElement('div');
      card.className = 'team-card duration-card';
      card.innerHTML = `<div class="duration-icon">${level.icon}</div><div class="team-card-name">${level.label}</div>`;
      card.addEventListener('click', () => onTeamsChosen(myTeam, opponentTeam, durationMinutes, level.key));
      gridEl.appendChild(card);
    }
  }

  renderMinePhase();

  return {
    reset() {
      myTeam = null;
      opponentTeam = null;
      durationMinutes = null;
      renderMinePhase();
    },
  };
}
