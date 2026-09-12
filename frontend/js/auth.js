document.addEventListener('DOMContentLoaded', () => {
  // If already logged in, redirect directly to dashboard
  if (getAuthToken()) {
    window.location.href = '/dashboard.html';
    return;
  }

  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const formLogin = document.getElementById('form-login');
  const formRegister = document.getElementById('form-register');
  const authTitle = document.getElementById('auth-title');
  const authSubtitle = document.getElementById('auth-subtitle');

  // Tab switching
  if (tabLogin && tabRegister) {
    tabLogin.addEventListener('click', () => {
      tabLogin.classList.add('active');
      tabRegister.classList.remove('active');
      formLogin.style.display = 'block';
      formRegister.style.display = 'none';
      if (authTitle) authTitle.textContent = 'Welcome Back';
      if (authSubtitle) authSubtitle.textContent = 'Sign in to access your habits and streak progress from any device.';
    });

    tabRegister.addEventListener('click', () => {
      tabRegister.classList.add('active');
      tabLogin.classList.remove('active');
      formLogin.style.display = 'none';
      formRegister.style.display = 'block';
      if (authTitle) authTitle.textContent = 'Create Your Account';
      if (authSubtitle) authSubtitle.textContent = 'Start fresh with your personal glassmorphic habit tracker.';
    });
  }

  // Handle Sign In Submit
  if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      const submitBtn = formLogin.querySelector('button[type="submit"]');

      submitBtn.disabled = true;
      submitBtn.textContent = 'Signing in...';

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if ((data.success || data.token) && data.token) {
          showToast(`Welcome back, ${data.user.name}!`, 'success');
          setAuth(data.token, data.user);
          setTimeout(() => {
            window.location.href = '/dashboard.html';
          }, 300);
        } else {
          showToast(data.error || data.message || 'Invalid email or password.', 'error');
          submitBtn.disabled = false;
          submitBtn.textContent = 'Sign In';
        }
      } catch (err) {
        showToast('Unable to connect to server. Please try again.', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign In';
      }
    });
  }

  // Handle Create Account Submit
  if (formRegister) {
    formRegister.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('reg-name').value.trim();
      const email = document.getElementById('reg-email').value.trim();
      const password = document.getElementById('reg-password').value;
      const submitBtn = formRegister.querySelector('button[type="submit"]');

      if (password.length < 6) {
        showToast('Password must be at least 6 characters.', 'error');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Creating account...';

      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password })
        });

        const data = await res.json();

        if ((data.success || data.token) && data.token) {
          showToast('Account created! Welcome to AuraHabit.', 'success');
          setAuth(data.token, data.user);
          setTimeout(() => {
            window.location.href = '/dashboard.html';
          }, 300);
        } else {
          showToast(data.error || data.message || 'Registration failed.', 'error');
          submitBtn.disabled = false;
          submitBtn.textContent = 'Create Account';
        }
      } catch (err) {
        showToast('Unable to connect to server. Please try again.', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Account';
      }
    });
  }

  // Handle Logout Button
  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
      try {
        const res = await fetch('/api/auth/logout', { method: 'POST' });
        const data = await res.json();
        showToast(data.message || 'Logged out.', 'success');
        // Clear auth token and user info
        clearAuth();
        // Hide post-auth controls
        document.getElementById('post-auth-controls').style.display = 'none';
        // Show login form again
        formLogin.style.display = 'block';
        formRegister.style.display = 'none';
        // Reset tabs
        tabLogin.classList.add('active');
        tabRegister.classList.remove('active');
        if (authTitle) authTitle.textContent = 'Welcome Back';
        if (authSubtitle) authSubtitle.textContent = 'Sign in to access your habits and streak progress from any device.';
      } catch (err) {
        showToast('Unable to logout. Please try again.', 'error');
      }
    });
  }
});