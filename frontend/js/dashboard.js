// Dashboard Logic

let currentHabits = [];
let todayCompletions = {};
let activeTimers = {}; // { [habitId]: { intervalId, seconds, isRunning } }

document.addEventListener('DOMContentLoaded', async () => {
  if (!checkAuth()) return;

  setupGreetingAndDate();
  await loadDashboardData();
  setupEventListeners();
});

// Setup Dynamic Greeting and Date
function setupGreetingAndDate() {
  const user = getCurrentUser();
  const name = (user && user.name) ? user.name : 'there';
  const hour = new Date().getHours();
  let greeting = 'Good morning';

  if (hour >= 12 && hour < 17) greeting = 'Good afternoon';
  else if (hour >= 17 && hour < 22) greeting = 'Good evening';
  else if (hour >= 22 || hour < 5) greeting = 'Good night';

  const greetingEl = document.getElementById('dashboard-greeting');
  if (greetingEl) {
    greetingEl.textContent = `${greeting}, ${name} 👋`;
  }

  const dateEl = document.getElementById('current-date-display');
  if (dateEl) {
    dateEl.textContent = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
  }
}

// Load all Dashboard data
async function loadDashboardData() {
  const todayStr = getTodayString();

  try {
    const [overviewRes, habitsRes, completionsRes] = await Promise.all([
      fetchWithAuth('/analytics/overview'),
      fetchWithAuth('/habits?status=active'),
      fetchWithAuth(`/completions?date=${todayStr}`)
    ]);

    if (overviewRes && overviewRes.success) {
      renderOverviewStats(overviewRes.data);
    }

    if (completionsRes && completionsRes.success) {
      todayCompletions = {};
      completionsRes.completions.forEach(c => {
        const hId = c.habitId ? (c.habitId._id || c.habitId) : null;
        if (hId) todayCompletions[hId] = c;
      });
    }

    if (habitsRes && habitsRes.success) {
      currentHabits = habitsRes.habits;
    }
    renderTodayHabits();
  } catch (error) {
    console.error('Failed to load dashboard:', error);
    renderTodayHabits();
  }
}

// Render 4 Stat Cards & Daily Progress Bar
function renderOverviewStats(data) {
  const streakEl = document.getElementById('stat-streak');
  const completedEl = document.getElementById('stat-completed');
  const rateEl = document.getElementById('stat-rate');
  const goalEl = document.getElementById('stat-goal');

  if (streakEl) streakEl.textContent = `${data.currentStreak} ${data.currentStreak === 1 ? 'day' : 'days'}`;
  if (completedEl) completedEl.textContent = data.totalCompletions;
  if (rateEl) rateEl.textContent = `${data.completionRate}%`;
  if (goalEl) goalEl.textContent = `${data.goalProgress}%`;

  const progressText = document.getElementById('progress-stats-text');
  const progressPct = document.getElementById('progress-percentage');
  const progressFill = document.getElementById('progress-fill');

  if (progressText) progressText.textContent = `${data.todayCompleted} / ${data.todayTotal} completed`;
  if (progressPct) progressPct.textContent = `${data.todayProgress}%`;
  if (progressFill) progressFill.style.width = `${data.todayProgress}%`;
}

// Filter habits scheduled for today
function isHabitScheduledForToday(habit) {
  const dayOfWeek = new Date().getDay();
  const schedule = habit.schedule || { type: 'daily' };

  if (schedule.type === 'daily') return true;
  if (schedule.type === 'weekdays') {
    if (schedule.days && schedule.days.length > 0) {
      return schedule.days.includes(dayOfWeek);
    }
    return dayOfWeek >= 1 && dayOfWeek <= 5;
  }
  return true;
}

// Render Today's Habits List
function renderTodayHabits() {
  const container = document.getElementById('today-habits-container');
  if (!container) return;

  const todayHabits = currentHabits.filter(isHabitScheduledForToday);

  if (todayHabits.length === 0) {
    container.innerHTML = `
      <div class="empty-state glass-card">
        <div class="empty-icon">✨</div>
        <h3 style="font-family: var(--font-heading); font-size: 18px;">No habits created yet</h3>
        <p style="font-size: 14px; color: var(--text-muted);">Start fresh by creating your first daily routine!</p>
        <a href="/habits.html" class="btn btn-primary" style="margin-top: 10px;">
          + Create New Habit
        </a>
      </div>
    `;
    return;
  }

  container.innerHTML = todayHabits.map(habit => {
    const completion = todayCompletions[habit._id];
    const isCompleted = completion && completion.status === 'completed';

    const currentQty = completion ? (completion.quantity || 0) : 0;
    const currentDuration = completion ? (completion.duration || 0) : 0;

    let controlHtml = '';

    if (habit.type === 'quantity') {
      controlHtml = `
        <div class="stepper-control">
          <button class="stepper-btn" onclick="updateQuantity('${habit._id}', -0.5)">−</button>
          <span class="stepper-value">${currentQty} / ${habit.target} ${habit.unit}</span>
          <button class="stepper-btn" onclick="updateQuantity('${habit._id}', 0.5)">+</button>
        </div>
      `;
    } else if (habit.type === 'duration') {
      const isRunning = activeTimers[habit._id] && activeTimers[habit._id].isRunning;
      controlHtml = `
        <div class="timer-control">
          <span class="timer-digits" id="timer-display-${habit._id}">${currentDuration || 0} / ${habit.target} min</span>
          <button class="btn btn-glass btn-sm" onclick="toggleDurationTimer('${habit._id}', ${habit.target})">
            ${isRunning ? 'Pause' : 'Start'}
          </button>
        </div>
      `;
    }

    return `
      <div class="habit-card ${isCompleted ? 'completed' : ''}" id="habit-card-${habit._id}">
        <div class="habit-left">
          <div class="habit-icon-bubble" style="background: ${habit.color}22; color: ${habit.color}; border: 1px solid ${habit.color}44;">
            ${habit.icon || '✨'}
          </div>
          <div class="habit-details">
            <div class="habit-title-row">
              <span class="habit-name">${habit.name}</span>
              <span class="badge cat-${habit.category}">${habit.category}</span>
              ${!habit.isPositive ? '<span class="badge badge-warning" style="font-size: 11px;">Avoid</span>' : ''}
              ${completion && completion.note ? `<span title="Note: ${completion.note}" style="cursor: pointer; font-size: 13px;" onclick="openNoteModal('${habit._id}')">📝</span>` : ''}
            </div>
            <div class="habit-meta">
              <span>${habit.description || (habit.type === 'duration' ? `${habit.target} minutes` : habit.type === 'quantity' ? `Target: ${habit.target} ${habit.unit}` : 'Daily check-in')}</span>
              ${habit.reminder && habit.reminder.enabled ? `<span>• ⏰ ${habit.reminder.time}</span>` : ''}
            </div>
            ${habit.stacking && habit.stacking.enabled ? `
              <div class="habit-stack-hint">
                <span>🔗 After "${habit.stacking.afterHabitName || 'Routine'}":</span>
                <span>${habit.stacking.actionDescription || 'Follow up'}</span>
              </div>
            ` : ''}
          </div>
        </div>

        <div class="habit-actions-right">
          ${controlHtml}

          <button class="btn-complete ${isCompleted ? 'done' : ''}" onclick="toggleHabitStatus('${habit._id}')">
            ${isCompleted ? '✓ Completed' : '✓ Complete'}
          </button>

          <button class="btn btn-ghost btn-sm" title="Add Note" onclick="openNoteModal('${habit._id}')">
            📝
          </button>

          <div class="dropdown" id="dropdown-${habit._id}">
            <button class="btn btn-ghost btn-icon" onclick="toggleDropdown('${habit._id}')">
              ⋮
            </button>
            <div class="dropdown-menu">
              <button class="dropdown-item" onclick="markHabitStatus('${habit._id}', 'skipped')">— Mark Skipped</button>
              <button class="dropdown-item" onclick="markHabitStatus('${habit._id}', 'missed')">✕ Mark Missed</button>
              <button class="dropdown-item" onclick="openNoteModal('${habit._id}')">📝 Add Reflection Note</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Toggle Complete Habit Status
async function toggleHabitStatus(habitId) {
  const todayStr = getTodayString();
  const current = todayCompletions[habitId];
  const nextStatus = (current && current.status === 'completed') ? 'missed' : 'completed';

  try {
    const res = await fetchWithAuth('/completions/toggle', {
      method: 'POST',
      body: JSON.stringify({ habitId, date: todayStr, status: nextStatus })
    });

    if (res && res.success) {
      showToast(nextStatus === 'completed' ? 'Great job! Habit completed 🎉' : 'Habit unchecked', 'success');
      await loadDashboardData();
    }
  } catch (error) {
    showToast('Failed to update habit status.', 'error');
  }
}

// Mark habit as Skipped or Missed
async function markHabitStatus(habitId, status) {
  const todayStr = getTodayString();
  closeAllDropdowns();

  try {
    const res = await fetchWithAuth('/completions/toggle', {
      method: 'POST',
      body: JSON.stringify({ habitId, date: todayStr, status })
    });

    if (res && res.success) {
      showToast(`Habit marked as ${status}.`, 'info');
      await loadDashboardData();
    }
  } catch (error) {
    showToast('Failed to update status.', 'error');
  }
}

// Quantity Stepper Handler
async function updateQuantity(habitId, delta) {
  const todayStr = getTodayString();

  try {
    const res = await fetchWithAuth('/completions/quantity', {
      method: 'POST',
      body: JSON.stringify({ habitId, date: todayStr, delta })
    });

    if (res && res.success) {
      await loadDashboardData();
    }
  } catch (error) {
    showToast('Failed to update quantity.', 'error');
  }
}

// Duration Timer Handler
function toggleDurationTimer(habitId, targetMinutes) {
  const todayStr = getTodayString();

  if (!activeTimers[habitId]) {
    activeTimers[habitId] = {
      seconds: 0,
      isRunning: false,
      intervalId: null
    };
  }

  const timer = activeTimers[habitId];

  if (timer.isRunning) {
    clearInterval(timer.intervalId);
    timer.isRunning = false;
    renderTodayHabits();

    const completedMinutes = Math.round((timer.seconds / 60) * 10) / 10;
    fetchWithAuth('/completions/timer', {
      method: 'POST',
      body: JSON.stringify({ habitId, date: todayStr, duration: completedMinutes })
    }).then(() => loadDashboardData());
  } else {
    timer.isRunning = true;
    timer.intervalId = setInterval(() => {
      timer.seconds++;
      const currentMin = Math.floor(timer.seconds / 60);
      const displayEl = document.getElementById(`timer-display-${habitId}`);
      if (displayEl) {
        displayEl.textContent = `${currentMin} / ${targetMinutes} min (${timer.seconds % 60}s)`;
      }

      if (timer.seconds >= targetMinutes * 60) {
        clearInterval(timer.intervalId);
        timer.isRunning = false;
        showToast('🎯 Timer goal completed! Awesome work.', 'success');
        fetchWithAuth('/completions/timer', {
          method: 'POST',
          body: JSON.stringify({ habitId, date: todayStr, duration: targetMinutes })
        }).then(() => loadDashboardData());
      }
    }, 1000);

    renderTodayHabits();
  }
}

// Note Modal Handlers
let activeNoteHabitId = null;

function openNoteModal(habitId) {
  activeNoteHabitId = habitId;
  const modal = document.getElementById('note-modal');
  const noteInput = document.getElementById('note-modal-text');
  const completion = todayCompletions[habitId];

  if (noteInput) {
    noteInput.value = (completion && completion.note) ? completion.note : '';
  }

  if (modal) modal.classList.add('open');
}

function closeNoteModal() {
  const modal = document.getElementById('note-modal');
  if (modal) modal.classList.remove('open');
  activeNoteHabitId = null;
}

async function saveNote() {
  if (!activeNoteHabitId) return;
  const noteText = document.getElementById('note-modal-text').value;
  const todayStr = getTodayString();

  try {
    const res = await fetchWithAuth('/completions/note', {
      method: 'POST',
      body: JSON.stringify({
        habitId: activeNoteHabitId,
        date: todayStr,
        note: noteText
      })
    });

    if (res && res.success) {
      showToast('Reflection note saved!', 'success');
      closeNoteModal();
      await loadDashboardData();
    }
  } catch (error) {
    showToast('Failed to save note.', 'error');
  }
}

function toggleDropdown(id) {
  const el = document.getElementById(`dropdown-${id}`);
  if (el) {
    const wasOpen = el.classList.contains('open');
    closeAllDropdowns();
    if (!wasOpen) el.classList.add('open');
  }
}

function closeAllDropdowns() {
  document.querySelectorAll('.dropdown').forEach(d => d.classList.remove('open'));
}

function setupEventListeners() {
  window.addEventListener('click', (e) => {
    if (!e.target.closest('.dropdown')) {
      closeAllDropdowns();
    }
  });

  const saveNoteBtn = document.getElementById('btn-save-note');
  if (saveNoteBtn) saveNoteBtn.addEventListener('click', saveNote);

  const closeNoteBtn = document.getElementById('btn-close-note-modal');
  if (closeNoteBtn) closeNoteBtn.addEventListener('click', closeNoteModal);
}
