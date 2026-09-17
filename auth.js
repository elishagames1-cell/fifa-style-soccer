// מערכת התחברות/הרשמה מקומית - localStorage בלבד, בלי אבטחה אמיתית ובלי שרת
const USERS_KEY = 'soccer_users_v1';
const SESSION_KEY = 'soccer_session_v1';
const USERNAME_RE = /^[A-Za-z0-9_]{3,16}$/;
const INVALID_MSG = 'Please use English letters only (3-16 characters: letters, digits, _)';

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
  const form = document.getElementById('authForm');
  const usernameInput = document.getElementById('usernameInput');
  const passwordInput = document.getElementById('passwordInput');
  const errorEl = document.getElementById('authError');
  const titleEl = document.getElementById('authTitle');
  const submitBtn = document.getElementById('authSubmit');
  const switchBtn = document.getElementById('switchModeBtn');
  const switchText = document.getElementById('switchText');

  let mode = 'login';

  function setMode(newMode) {
    mode = newMode;
    errorEl.textContent = '';
    if (mode === 'login') {
      titleEl.textContent = 'Login';
      submitBtn.textContent = 'Login';
      switchText.textContent = "Don't have an account?";
      switchBtn.textContent = 'Sign Up';
    } else {
      titleEl.textContent = 'Sign Up';
      submitBtn.textContent = 'Sign Up';
      switchText.textContent = 'Already have an account?';
      switchBtn.textContent = 'Login';
    }
  }

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
        errorEl.textContent = 'Username already taken';
        return;
      }
      users[username] = password;
      saveUsers(users);
    } else {
      if (!users[username] || users[username] !== password) {
        errorEl.textContent = 'Incorrect username or password';
        return;
      }
    }

    form.reset();
    localStorage.setItem(SESSION_KEY, username);
    onLoginSuccess(username);
  });

  setMode('login');
}
