// Habits Management Page Logic

let allHabits = [];
let editingHabitId = null;
let currentFilter = 'active';
let currentCategory = 'all';

document.addEventListener('DOMContentLoaded', async () => {
  if (!checkAuth()) return;

  setupHabitsPage();
  await loadHabits();
});

function setupHabitsPage() {
  // Tab Filter Listeners
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.status;
      renderHabitsList();
    });
  });

  // Category Filter Listener
  const catSelect = document.getElementById('filter-category');
  if (catSelect) {
    catSelect.addEventListener('change', (e) => {
      currentCategory = e.target.value;
      renderHabitsList();
    });
  }

  // Search Filter Listener
  const searchInput = document.getElementById('search-habits');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      renderHabitsList();
    });
  }

  // Habit Type Switcher in Modal
  const typeSelect = document.getElementById('habit-type');
  if (typeSelect) {
    typeSelect.addEventListener('change', (e) => {
      const type = e.target.value;
      const qtyGroup = document.getElementById('quantity-fields');
      const durGroup = document.getElementById('duration-fields');

      if (qtyGroup) qtyGroup.style.display = (type === 'quantity') ? 'block' : 'none';
      if (durGroup) durGroup.style.display = (type === 'duration') ? 'block' : 'none';
    });
  }

  // Schedule Type Switcher in Modal
  const scheduleSelect = document.getElementById('habit-schedule-type');
  if (scheduleSelect) {
    scheduleSelect.addEventListener('change', (e) => {
      const isWeekdays = e.target.value === 'weekdays';
      const daysSelector = document.getElementById('weekday-selector');
      if (daysSelector) daysSelector.style.display = isWeekdays ? 'flex' : 'none';
    });
  }

  // Form Submit
  const habitForm = document.getElementById('form-habit');
  if (habitForm) {
    habitForm.addEventListener('submit', handleHabitFormSubmit);
  }
}

// Load Habits from Backend
async function loadHabits() {
  try {
    const res = await fetchWithAuth('/habits?status=all');
    if (res && res.success) {
      allHabits = res.habits;
      populateStackingDropdown();
      populateCategoryFilterDropdown();
    }
    renderHabitsList();
  } catch (error) {
    console.error('Failed to load habits:', error);
    renderHabitsList();
  }
}

// Populate Category Filter Dropdown
function populateCategoryFilterDropdown() {
  const catSelect = document.getElementById('filter-category');
  if (!catSelect) return;

  const defaultCategories = ['Health', 'Fitness', 'Study', 'Work', 'Personal', 'Mindfulness', 'Finance', 'Other'];
  const habitCategories = allHabits.map(h => h.category).filter(Boolean);
  const categories = Array.from(new Set([...defaultCategories, ...habitCategories]));

  const currentValue = catSelect.value || 'all';
  catSelect.innerHTML = '<option value="all">All Categories</option>' +
    categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
  if (categories.includes(currentValue) || currentValue === 'all') {
    catSelect.value = currentValue;
  }
}

// Populate Stacking Dropdown in Modal
function populateStackingDropdown() {
  const stackSelect = document.getElementById('habit-stack-after');
  if (!stackSelect) return;

  stackSelect.innerHTML = '<option value="">-- None (Stand-alone habit) --</option>' +
    allHabits
      .filter(h => h.status === 'active' && (!editingHabitId || h._id !== editingHabitId))
      .map(h => `<option value="${h.name}">${h.icon || '✨'} ${h.name}</option>`)
      .join('');
}

// Render Habits Grid
function renderHabitsList() {
  const container = document.getElementById('habits-grid-container');
  if (!container) return;

  const searchQuery = (document.getElementById('search-habits')?.value || '').toLowerCase().trim();

  const filtered = allHabits.filter(h => {
    if (currentFilter !== 'all' && h.status !== currentFilter) return false;
    if (currentCategory !== 'all' && h.category !== currentCategory) return false;
    if (searchQuery && !h.name.toLowerCase().includes(searchQuery) && !(h.description || '').toLowerCase().includes(searchQuery)) {
      return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state glass-card" style="grid-column: 1 / -1;">
        <div class="empty-icon">📂</div>
        <h3>No habits created yet</h3>
        <p style="color: var(--text-muted);">Create your first habit to begin building consistency!</p>
        <button class="btn btn-primary" onclick="openHabitModal()" style="margin-top: 10px;">
          + Create New Habit
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(habit => {
    return `
      <div class="glass-card habit-manage-card" style="display: flex; flex-direction: column; justify-content: space-between; gap: 16px;">
        <div>
          <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 12px;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div class="habit-icon-bubble" style="background: ${habit.color}22; color: ${habit.color}; border: 1px solid ${habit.color}44;">
                ${habit.icon || '✨'}
              </div>
              <div>
                <h4 style="font-family: var(--font-heading); font-size: 16px; font-weight: 700;">${habit.name}</h4>
                <span class="badge cat-${habit.category}">${habit.category}</span>
              </div>
            </div>
            <span class="badge ${habit.status === 'active' ? 'badge-success' : 'badge-warning'}" style="text-transform: capitalize;">
              ${habit.status}
            </span>
          </div>

          <p style="font-size: 13.5px; color: var(--text-secondary); margin-bottom: 12px;">
            ${habit.description || 'No description provided.'}
          </p>

          <div style="display: flex; flex-direction: column; gap: 6px; font-size: 12.5px; color: var(--text-muted);">
            <div>📌 <strong>Type:</strong> ${habit.type === 'quantity' ? `Target: ${habit.target} ${habit.unit}` : habit.type === 'duration' ? `Target: ${habit.target} minutes` : 'Yes / No Check-in'}</div>
            <div>🔄 <strong>Schedule:</strong> ${habit.schedule?.type || 'Daily'}</div>
            ${habit.reminder?.enabled ? `<div>⏰ <strong>Reminder:</strong> ${habit.reminder.time}</div>` : ''}
            ${habit.stacking?.enabled ? `<div style="color: var(--accent-light);">🔗 <strong>Stacked After:</strong> "${habit.stacking.afterHabitName}"</div>` : ''}
          </div>
        </div>

        <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid var(--glass-border); padding-top: 14px;">
          <button class="btn btn-glass btn-sm" onclick="openEditHabitModal('${habit._id}')">
            ✏️ Edit
          </button>

          <div style="display: flex; gap: 6px;">
            <button class="btn btn-ghost btn-sm" onclick="togglePauseHabit('${habit._id}')" title="${habit.status === 'paused' ? 'Resume' : 'Pause'}">
              ${habit.status === 'paused' ? '▶ Resume' : '⏸ Pause'}
            </button>
            <button class="btn btn-ghost btn-sm" onclick="toggleArchiveHabit('${habit._id}')" title="${habit.status === 'archived' ? 'Restore' : 'Archive'}">
              ${habit.status === 'archived' ? '📂 Restore' : '📦 Archive'}
            </button>
            <button class="btn btn-ghost btn-sm" style="color: var(--danger);" onclick="confirmDeleteHabit('${habit._id}')" title="Delete">
              🗑
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Open Modal for New Habit
function openHabitModal() {
  editingHabitId = null;
  const modal = document.getElementById('habit-modal');
  const title = document.getElementById('habit-modal-title');
  const form = document.getElementById('form-habit');

  if (title) title.textContent = 'Create New Habit';
  if (form) form.reset();

  document.getElementById('quantity-fields').style.display = 'none';
  document.getElementById('duration-fields').style.display = 'none';
  document.getElementById('weekday-selector').style.display = 'none';

  populateStackingDropdown();
  if (modal) modal.classList.add('open');
}

// Open Modal for Editing Habit
function openEditHabitModal(habitId) {
  const habit = allHabits.find(h => h._id === habitId);
  if (!habit) return;

  editingHabitId = habitId;
  const modal = document.getElementById('habit-modal');
  const title = document.getElementById('habit-modal-title');

  if (title) title.textContent = 'Edit Habit';

  document.getElementById('habit-name').value = habit.name;
  document.getElementById('habit-description').value = habit.description || '';
  document.getElementById('habit-icon').value = habit.icon || '✨';
  document.getElementById('habit-color').value = habit.color || '#9b8cff';
  document.getElementById('habit-category').value = habit.category || 'Personal';
  document.getElementById('habit-type').value = habit.type || 'boolean';
  document.getElementById('habit-is-positive').checked = habit.isPositive !== false;

  const qtyGroup = document.getElementById('quantity-fields');
  const durGroup = document.getElementById('duration-fields');
  if (habit.type === 'quantity') {
    qtyGroup.style.display = 'block';
    document.getElementById('habit-target-qty').value = habit.target || 1;
    document.getElementById('habit-unit').value = habit.unit || 'times';
  } else {
    qtyGroup.style.display = 'none';
  }

  if (habit.type === 'duration') {
    durGroup.style.display = 'block';
    document.getElementById('habit-target-duration').value = habit.target || 15;
  } else {
    durGroup.style.display = 'none';
  }

  document.getElementById('habit-schedule-type').value = habit.schedule?.type || 'daily';
  const weekdaySelector = document.getElementById('weekday-selector');
  if (habit.schedule?.type === 'weekdays') {
    weekdaySelector.style.display = 'flex';
    const selectedDays = habit.schedule.days || [];
    document.querySelectorAll('.weekday-checkbox').forEach(cb => {
      cb.checked = selectedDays.includes(Number(cb.value));
    });
  } else {
    weekdaySelector.style.display = 'none';
  }

  document.getElementById('habit-reminder-enabled').checked = !!habit.reminder?.enabled;
  document.getElementById('habit-reminder-time').value = habit.reminder?.time || '09:00';

  populateStackingDropdown();
  document.getElementById('habit-stack-after').value = habit.stacking?.afterHabitName || '';
  document.getElementById('habit-stack-action').value = habit.stacking?.actionDescription || '';

  if (modal) modal.classList.add('open');
}

function closeHabitModal() {
  const modal = document.getElementById('habit-modal');
  if (modal) modal.classList.remove('open');
  editingHabitId = null;
}

// Handle Add / Edit Submit
async function handleHabitFormSubmit(e) {
  e.preventDefault();

  const name = document.getElementById('habit-name').value.trim();
  if (!name) {
    showToast('Please enter a habit name.', 'warning');
    return;
  }
  const description = document.getElementById('habit-description').value.trim();
  const icon = document.getElementById('habit-icon').value || '✨';
  const color = document.getElementById('habit-color').value || '#9b8cff';
  const category = document.getElementById('habit-category').value;
  const type = document.getElementById('habit-type').value;
  const isPositive = document.getElementById('habit-is-positive').checked;

  let target = 1;
  let unit = 'times';
  if (type === 'quantity') {
    target = Number(document.getElementById('habit-target-qty').value) || 1;
    unit = document.getElementById('habit-unit').value || 'times';
  } else if (type === 'duration') {
    target = Number(document.getElementById('habit-target-duration').value) || 15;
    unit = 'min';
  }

  const scheduleType = document.getElementById('habit-schedule-type').value;
  const selectedDays = [];
  if (scheduleType === 'weekdays') {
    document.querySelectorAll('.weekday-checkbox:checked').forEach(cb => {
      selectedDays.push(Number(cb.value));
    });
  }

  const reminderEnabled = document.getElementById('habit-reminder-enabled').checked;
  const reminderTime = document.getElementById('habit-reminder-time').value || '09:00';

  const stackAfter = document.getElementById('habit-stack-after').value;
  const stackAction = document.getElementById('habit-stack-action').value;

  const payload = {
    name,
    description,
    icon,
    color,
    category,
    type,
    target,
    unit,
    isPositive,
    schedule: {
      type: scheduleType,
      days: selectedDays,
      timesPerWeek: scheduleType === 'daily' ? 7 : (selectedDays.length || 5)
    },
    reminder: {
      enabled: reminderEnabled,
      time: reminderTime
    },
    stacking: {
      enabled: !!stackAfter,
      afterHabitName: stackAfter,
      actionDescription: stackAction
    }
  };

  try {
    let res;
    if (editingHabitId) {
      res = await fetchWithAuth(`/habits/${editingHabitId}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
    } else {
      res = await fetchWithAuth('/habits', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    }

    if (res && res.success) {
      showToast(editingHabitId ? 'Habit updated successfully!' : 'Habit created successfully!', 'success');
      closeHabitModal();
      await loadHabits();
    }
  } catch (error) {
    showToast('Failed to save habit.', 'error');
  }
}

// Pause / Resume Habit
async function togglePauseHabit(habitId) {
  try {
    const res = await fetchWithAuth(`/habits/${habitId}/pause`, { method: 'PATCH' });
    if (res && res.success) {
      showToast(res.message, 'info');
      await loadHabits();
    }
  } catch (error) {
    showToast('Failed to toggle pause.', 'error');
  }
}

// Archive / Restore Habit
async function toggleArchiveHabit(habitId) {
  try {
    const res = await fetchWithAuth(`/habits/${habitId}/archive`, { method: 'PATCH' });
    if (res && res.success) {
      showToast(res.message, 'info');
      await loadHabits();
    }
  } catch (error) {
    showToast('Failed to toggle archive.', 'error');
  }
}

// Delete Habit Confirmation
async function confirmDeleteHabit(habitId) {
  if (confirm('Are you sure you want to delete this habit and all its history?')) {
    try {
      const res = await fetchWithAuth(`/habits/${habitId}`, { method: 'DELETE' });
      if (res && res.success) {
        showToast('Habit deleted.', 'success');
        await loadHabits();
      }
    } catch (error) {
      showToast('Failed to delete habit.', 'error');
    }
  }
}
