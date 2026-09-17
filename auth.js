// מערכת התחברות/הרשמה מקומית - localStorage בלבד, בלי אבטחה אמיתית ובלי שרת
const USERS_KEY = 'soccer_users_v1';
const SESSION_KEY = 'soccer_session_v1';
const USERNAME_RE = /^[A-Za-z0-9_]{3,16}$/;
const INVALID_MSG = 'יש להשתמש באותיות ומספרים באנגלית בלבד (3-16 תווים: אותיות, ספרות, _)';

function loadUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY)) || {};
  } catch {
    return {};
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

// שומר את המשתמש המחובר כדי שלא יצטרך להתחבר מחדש בכל פתיחה של הדף
export function getSession() {
  const username = localStorage.getItem(SESSION_KEY);
  if (!username) return null;
  const users = loadUsers();
  return users[username] !== undefined ? username : null;
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function initAuth({ onLoginSuccess }) {
  const choice = document.getElementById('authChoice');
  const form = document.getElementById('authForm');
  const usernameInput = document.getElementById('usernameInput');
  const passwordInput = document.getElementById('passwordInput');
  const errorEl = document.getElementById('authError');
  const titleEl = document.getElementById('authTitle');
  const submitBtn = document.getElementById('authSubmit');
  const switchBtn = document.getElementById('switchModeBtn');
  const switchText = document.getElementById('switchText');
  const showLoginBtn = document.getElementById('showLoginBtn');
  const showSignupBtn = document.getElementById('showSignupBtn');

  let mode = 'login';

  function setMode(newMode) {
    mode = newMode;
    errorEl.textContent = '';
    if (mode === 'login') {
      titleEl.textContent = 'התחברות';
      submitBtn.textContent = 'התחבר';
      switchText.textContent = 'אין לך חשבון?';
      switchBtn.textContent = 'הירשם';
    } else {
      titleEl.textContent = 'הרשמה';
      submitBtn.textContent = 'הירשם';
      switchText.textContent = 'יש לך כבר חשבון?';
      switchBtn.textContent = 'התחבר';
    }
  }

  const switchLine = document.getElementById('switchLine');

  function showChoice() {
    choice.classList.remove('hidden');
    form.classList.add('hidden');
    switchLine.classList.add('hidden');
    form.reset();
    errorEl.textContent = '';
  }

  function showForm(startMode) {
    setMode(startMode);
    choice.classList.add('hidden');
    form.classList.remove('hidden');
    switchLine.classList.remove('hidden');
  }

  showLoginBtn.addEventListener('click', () => showForm('login'));
  showSignupBtn.addEventListener('click', () => showForm('signup'));

  switchBtn.addEventListener('click', () => {
    setMode(mode === 'login' ? 'signup' : 'login');
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    errorEl.textContent = '';

    const username = usernameInput.value;
    const password = passwordInput.value;

    if (!USERNAME_RE.test(username) || !USERNAME_RE.test(password)) {
      errorEl.textContent = INVALID_MSG;
      return;
    }

    const users = loadUsers();

    if (mode === 'signup') {
      if (users[username]) {
        errorEl.textContent = 'שם המשתמש כבר תפוס';
        return;
      }
      users[username] = password;
      saveUsers(users);
    } else {
      if (!users[username] || users[username] !== password) {
        errorEl.textContent = 'שם משתמש או סיסמה שגויים';
        return;
      }
    }

    form.reset();
    localStorage.setItem(SESSION_KEY, username);
    onLoginSuccess(username);
  });

  showChoice();

  return { showChoice };
}
