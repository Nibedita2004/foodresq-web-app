// public/js/auth.js
// Lightweight, robust auth client used by register.html and login.html

const API_BASE = ''; // leave blank if same origin

// Use sessionStorage instead of localStorage to keep sessions per tab
function setTokenAndUser(token, user) {
  if (token) sessionStorage.setItem('fr_token', token);
  if (user) sessionStorage.setItem('fr_user', JSON.stringify(user));
}

// helper: read status element for a form
function getStatusEl(form) {
  return form.querySelector('#formStatus') || form.querySelector('[role="status"]');
}

// unified JSON fetch helper (throws on non-OK)
async function jsonFetch(url, opts = {}) {
  const res = await fetch(API_BASE + url, opts);
  let body;
  try { body = await res.json(); } catch (e) { body = null; }
  if (!res.ok) {
    const msg = (body && (body.error || body.message)) || res.statusText || 'Request failed';
    const err = new Error(msg);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

// Register form handler function used by register.html
async function registerFormHandler(form) {
  const status = getStatusEl(form);
  if (status) status.textContent = 'Please wait...';

  const payload = {
    name: form.name?.value?.trim() || '',
    email: form.email?.value?.trim() || '',
    password: form.password?.value || '',
    role: form.role?.value || 'donor'
  };

  // Basic client-side validation (you can expand)
  if (!payload.email || !payload.password || payload.password.length < 8) {
    if (status) status.textContent = 'Please provide a valid email and a password of at least 8 characters.';
    throw new Error('Validation failed');
  }

  try {
    const data = await jsonFetch('/api/users/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    // If backend returns token + user
    setTokenAndUser(data.token, data.user);
    if (status) {
      status.style.color = '#047857'; // green
      status.textContent = 'Registered — redirecting...';
    }
    // small delay so user sees message
    await new Promise(r => setTimeout(r, 500));
    window.location.href = '/dashboard.html';
    return data;
  } catch (err) {
    if (status) {
      status.style.color = '#dc2626';
      status.textContent = 'Error: ' + (err.message || 'Registration failed');
    }
    throw err;
  }
}

// Login form handler used by login.html
async function loginFormHandler(form) {
  const status = getStatusEl(form);
  if (status) status.textContent = 'Signing in...';

  const payload = {
    email: form.email?.value?.trim() || '',
    password: form.password?.value || ''
  };

  if (!payload.email || !payload.password) {
    if (status) status.textContent = 'Please enter email and password.';
    throw new Error('Validation failed');
  }

  try {
    const data = await jsonFetch('/api/users/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    setTokenAndUser(data.token, data.user);
    if (status) {
      status.style.color = '#047857';
      status.textContent = 'Signed in — redirecting...';
    }
    await new Promise(r => setTimeout(r, 350));
    window.location.href = '/dashboard.html';
    return data;
  } catch (err) {
    if (status) {
      status.style.color = '#dc2626';
      status.textContent = 'Error: ' + (err.message || 'Login failed');
    }
    throw err;
  }
}

// For backward compatibility: small global helpers used elsewhere
// (but prefer loginFormHandler/registerFormHandler from markup)
window.logoutAndRedirect = function () {
  sessionStorage.removeItem('fr_token');
  sessionStorage.removeItem('fr_user');
  window.location.href = '/login.html';
};
