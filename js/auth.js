const SESSION_KEY = "ccmc_rtw_session";

function getSession() {
  const raw = sessionStorage.getItem(SESSION_KEY);
  return raw ? JSON.parse(raw) : null;
}

function requireAuth() {
  const session = getSession();
  if (!session) {
    window.location.href = "index.html";
    return null;
  }
  return session;
}

function logoutUser() {
  const session = getSession();
  const state = loadState();
  if (session) {
    logAudit(state, session.username, session.role, `Logged out (${session.name})`);
    saveState(state);
  }
  sessionStorage.removeItem(SESSION_KEY);
  window.location.href = "index.html";
}

// Attach login handler if on index.html
const loginForm = document.getElementById("login-form");
if (loginForm) {
  const errorBox = document.getElementById("login-error");

  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    const state = loadState();
    const user = state.users.find(
      (u) => u.username.toLowerCase() === username.toLowerCase() && u.password === password
    );

    if (!user) {
      logAudit(state, username || "unknown", "Guest", `Failed login attempt for "${username}"`);
      saveState(state);
      errorBox.textContent = "Invalid username or password. Please try again.";
      errorBox.classList.remove("hidden");
      return;
    }

    if (!user.active) {
      logAudit(state, user.username, user.role, "Blocked login attempt on inactive account");
      saveState(state);
      errorBox.textContent = "This account is deactivated. Contact the shop owner.";
      errorBox.classList.remove("hidden");
      return;
    }

    const sessionData = {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
    logAudit(state, user.username, user.role, `Successful login (${user.name})`);
    saveState(state);
    window.location.href = "app.html";
  });
}