// Settings & Preferences Page Logic

document.addEventListener('DOMContentLoaded', async () => {
  if (!checkAuth()) return;

  await loadUserSettings();
  setupSettingsListeners();
});

async function loadUserSettings() {
  const user = getCurrentUser();
  if (user) {
    populateUserFields(user);
  }

  try {
    const res = await fetchWithAuth('/auth/me');
    if (res && res.success && res.user) {
      setAuth(getAuthToken(), res.user);
      populateUserFields(res.user);
    }
  } catch (err) {
    console.error('Failed to load user profile in settings:', err);
  }
}

function populateUserFields(user) {
  const nameInput = document.getElementById('settings-name');
  const emailInput = document.getElementById('settings-email');
  if (nameInput) nameInput.value = user.name || '';
  if (emailInput) emailInput.value = user.email || '';

  const theme = user.theme || 'dark';
  const themeRadio = document.querySelector(`input[name="theme-option"][value="${theme}"]`);
  if (themeRadio) themeRadio.checked = true;

  const prefs = user.preferences || {};
  const notifToggle = document.getElementById('toggle-notifications');
  const motionToggle = document.getElementById('toggle-reduced-motion');
  const textToggle = document.getElementById('toggle-larger-text');
  const contrastToggle = document.getElementById('toggle-high-contrast');

  if (notifToggle) notifToggle.checked = !!prefs.notificationsEnabled;
  if (motionToggle) motionToggle.checked = !!prefs.reducedMotion;
  if (textToggle) textToggle.checked = !!prefs.largerText;
  if (contrastToggle) contrastToggle.checked = !!prefs.highContrast;
}

function setupSettingsListeners() {
  // Theme change radio
  document.querySelectorAll('input[name="theme-option"]').forEach(radio => {
    radio.addEventListener('change', async (e) => {
      const theme = e.target.value;
      localStorage.setItem('theme', theme);
      const user = getCurrentUser() || {};
      user.theme = theme;
      applyThemeAndPreferences(user);

      await savePreferencesToBackend({ theme });
    });
  });

  // Notification toggle
  const notifToggle = document.getElementById('toggle-notifications');
  if (notifToggle) {
    notifToggle.addEventListener('change', async (e) => {
      if (e.target.checked && 'Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          showToast('Notification permission was denied in browser.', 'warning');
          e.target.checked = false;
          return;
        }
      }
      await savePreferencesToBackend({
        preferences: { notificationsEnabled: e.target.checked }
      });
      showToast('Notification settings updated.', 'info');
    });
  }

  // Accessibility toggles
  ['toggle-reduced-motion', 'toggle-larger-text', 'toggle-high-contrast'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', async () => {
        const motion = document.getElementById('toggle-reduced-motion')?.checked || false;
        const text = document.getElementById('toggle-larger-text')?.checked || false;
        const contrast = document.getElementById('toggle-high-contrast')?.checked || false;

        const prefs = {
          reducedMotion: motion,
          largerText: text,
          highContrast: contrast
        };

        const user = getCurrentUser() || {};
        user.preferences = { ...user.preferences, ...prefs };
        applyThemeAndPreferences(user);

        await savePreferencesToBackend({ preferences: prefs });
      });
    }
  });

  // Profile Save Form
  const profileForm = document.getElementById('form-profile');
  if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('settings-name').value;
      const currentPassword = document.getElementById('settings-current-pwd')?.value || '';
      const newPassword = document.getElementById('settings-new-pwd')?.value || '';

      const payload = { name };
      if (newPassword) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }

      try {
        const res = await fetchWithAuth('/auth/profile', {
          method: 'PUT',
          body: JSON.stringify(payload)
        });

        if (res && res.success) {
          showToast('Account details updated successfully!', 'success');
          setAuth(getAuthToken(), res.user);
          if (document.getElementById('settings-current-pwd')) document.getElementById('settings-current-pwd').value = '';
          if (document.getElementById('settings-new-pwd')) document.getElementById('settings-new-pwd').value = '';
        } else if (res && res.error) {
          showToast(res.error, 'error');
        }
      } catch (err) {
        showToast('Failed to update account details.', 'error');
      }
    });
  }

  // Export Data Buttons
  const exportCsvBtn = document.getElementById('btn-export-csv');
  const exportJsonBtn = document.getElementById('btn-export-json');

  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', () => {
      const token = getAuthToken();
      window.location.href = `/api/export/csv?token=${token}`;
      showToast('Downloading CSV history...', 'success');
    });
  }

  if (exportJsonBtn) {
    exportJsonBtn.addEventListener('click', () => {
      const token = getAuthToken();
      window.location.href = `/api/export/json?token=${token}`;
      showToast('Downloading complete JSON backup...', 'success');
    });
  }

  // Sign Out Button
  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to sign out?')) {
        clearAuth();
      }
    });
  }
}

async function savePreferencesToBackend(payload) {
  try {
    const res = await fetchWithAuth('/auth/preferences', {
      method: 'PUT',
      body: JSON.stringify(payload)
    });

    if (res && res.success) {
      setAuth(getAuthToken(), res.user);
      return res;
    }
  } catch (error) {
    console.error('Failed to save preferences:', error);
  }
}
