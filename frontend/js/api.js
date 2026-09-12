// Shared API Client & Authentication Management

const API_BASE = '/api';

// Authentication State in LocalStorage
function getAuthToken() {
  return localStorage.getItem('authToken');
}

function getCurrentUser() {
  const user = localStorage.getItem('currentUser');
  return user ? JSON.parse(user) : null;
}

function setAuth(token, user) {
  localStorage.setItem('authToken', token);
  localStorage.setItem('currentUser', JSON.stringify(user));
  applyThemeAndPreferences(user);
}

function clearAuth() {
  localStorage.removeItem('authToken');
  localStorage.removeItem('currentUser');
  window.location.href = '/index.html';
}

function checkAuth(redirectIfNotAuth = true) {
  const token = getAuthToken();
  if (!token) {
    if (redirectIfNotAuth && !window.location.pathname.endsWith('index.html') && window.location.pathname !== '/') {
      window.location.href = '/index.html';
    }
    return false;
  }
  return true;
}

// Fetch Wrapper with Bearer Token Header
async function fetchWithAuth(endpoint, options = {}) {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    if (response.status === 401) {
      clearAuth();
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`API error on ${endpoint}:`, error);
    showToast('Network or server error. Please try again.', 'error');
    throw error;
  }
}

// Toast Notifications
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
    warning: '⚠'
  };

  toast.innerHTML = `
    <span style="font-weight: 700;">${icons[type] || '•'}</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Theme & Preferences Manager
function applyThemeAndPreferences(user) {
  const theme = (user && user.theme) || localStorage.getItem('theme') || 'dark';

  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }

  if (user && user.preferences) {
    document.body.classList.toggle('reduced-motion', !!user.preferences.reducedMotion);
    document.body.classList.toggle('larger-text', !!user.preferences.largerText);
    document.body.classList.toggle('high-contrast', !!user.preferences.highContrast);
  }
}

// Date helpers
function getTodayString() {
  return new Date().toISOString().split('T')[0];
}

function formatDateDisplay(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  });
}

// Initialize user and theme on page load
document.addEventListener('DOMContentLoaded', () => {
  const user = getCurrentUser();
  if (user) {
    applyThemeAndPreferences(user);

    const userInitialsEl = document.getElementById('user-initials');
    const userNameEl = document.getElementById('sidebar-user-name');
    const mobileAvatarEl = document.getElementById('mobile-user-avatar');

    if (userInitialsEl && user.name) {
      userInitialsEl.textContent = user.name.charAt(0).toUpperCase();
    }
    if (mobileAvatarEl && user.name) {
      mobileAvatarEl.textContent = user.name.charAt(0).toUpperCase();
    }
    if (userNameEl && user.name) {
      userNameEl.textContent = user.name;
    }
  }
});
