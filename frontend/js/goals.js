// Goals Tracker Page Logic (No Auth Required)

let allGoals = [];
let allHabits = [];
let editingGoalId = null;

document.addEventListener('DOMContentLoaded', async () => {
  setupGoalsPage();
  await loadGoalsAndHabits();
});

function setupGoalsPage() {
  const goalForm = document.getElementById('form-goal');
  if (goalForm) {
    goalForm.addEventListener('submit', handleGoalSubmit);
  }
}

async function loadGoalsAndHabits() {
  try {
    const [goalsRes, habitsRes] = await Promise.all([
      fetchWithAuth('/goals'),
      fetchWithAuth('/habits?status=active')
    ]);

    if (habitsRes && habitsRes.success) {
      allHabits = habitsRes.habits;
      populateHabitsDropdown();
    }

    if (goalsRes && goalsRes.success) {
      allGoals = goalsRes.goals;
    }
    renderGoalsList();
  } catch (error) {
    console.error('Failed to load goals:', error);
    renderGoalsList();
  }
}

function populateHabitsDropdown() {
  const select = document.getElementById('goal-habit-select');
  if (!select) return;

  select.innerHTML = '<option value="">-- General Goal (Not linked to single habit) --</option>' +
    allHabits.map(h => `<option value="${h._id}">${h.icon || '✨'} ${h.name}</option>`).join('');
}

function renderGoalsList() {
  const container = document.getElementById('goals-grid-container');
  if (!container) return;

  if (allGoals.length === 0) {
    container.innerHTML = `
      <div class="empty-state glass-card" style="grid-column: 1 / -1;">
        <div class="empty-icon">🎯</div>
        <h3>No goals set yet</h3>
        <p style="color: var(--text-muted);">Set achievable weekly or monthly targets to stay motivated.</p>
        <button class="btn btn-primary" onclick="openGoalModal()" style="margin-top: 10px;">
          + Create First Goal
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = allGoals.map(goal => {
    const pct = Math.min(100, Math.round((goal.current / goal.target) * 100)) || 0;
    const isCompleted = goal.status === 'completed' || pct >= 100;

    return `
      <div class="goal-card ${isCompleted ? 'glass-card' : ''}">
        <div class="goal-header">
          <div>
            <span class="badge ${goal.period === 'monthly' ? 'badge-streak' : 'cat-Study'}" style="margin-bottom: 6px; text-transform: uppercase; font-size: 11px;">
              ${goal.period}
            </span>
            <h3 class="goal-title">${goal.name}</h3>
          </div>
          <span style="font-size: 24px;">${isCompleted ? '🏆' : '🎯'}</span>
        </div>

        <div>
          <div style="display: flex; justify-content: space-between; font-size: 13.5px; font-weight: 600; margin-bottom: 8px;">
            <span>${goal.current} / ${goal.target} ${goal.unit}</span>
            <span style="color: ${isCompleted ? 'var(--success)' : 'var(--accent-light)'};">${pct}%</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill" style="width: ${pct}%; background: ${isCompleted ? 'var(--success)' : 'var(--accent-gradient)'};"></div>
          </div>
        </div>

        <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid var(--glass-border); padding-top: 12px; margin-top: auto;">
          <span style="font-size: 12px; color: var(--text-muted);">
            ${isCompleted ? '✓ Target Achieved!' : 'In progress'}
          </span>

          <div style="display: flex; gap: 6px;">
            <button class="btn btn-ghost btn-sm" onclick="openEditGoalModal('${goal._id}')">✏️ Edit</button>
            <button class="btn btn-ghost btn-sm" style="color: var(--danger);" onclick="deleteGoal('${goal._id}')">🗑</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function openGoalModal() {
  editingGoalId = null;
  const modal = document.getElementById('goal-modal');
  const title = document.getElementById('goal-modal-title');
  const form = document.getElementById('form-goal');

  if (title) title.textContent = 'Create New Goal';
  if (form) form.reset();
  if (modal) modal.classList.add('open');
}

function openEditGoalModal(goalId) {
  const goal = allGoals.find(g => g._id === goalId);
  if (!goal) return;

  editingGoalId = goalId;
  const modal = document.getElementById('goal-modal');
  const title = document.getElementById('goal-modal-title');

  if (title) title.textContent = 'Edit Goal';

  document.getElementById('goal-name').value = goal.name;
  document.getElementById('goal-target').value = goal.target;
  document.getElementById('goal-unit').value = goal.unit || 'times';
  document.getElementById('goal-period').value = goal.period || 'monthly';
  document.getElementById('goal-habit-select').value = goal.habitId?._id || goal.habitId || '';

  if (modal) modal.classList.add('open');
}

function closeGoalModal() {
  const modal = document.getElementById('goal-modal');
  if (modal) modal.classList.remove('open');
  editingGoalId = null;
}

async function handleGoalSubmit(e) {
  e.preventDefault();

  const name = document.getElementById('goal-name').value;
  const target = Number(document.getElementById('goal-target').value);
  const unit = document.getElementById('goal-unit').value || 'times';
  const period = document.getElementById('goal-period').value || 'monthly';
  const habitId = document.getElementById('goal-habit-select').value || null;

  const payload = { name, target, unit, period, habitId };

  try {
    let res;
    if (editingGoalId) {
      res = await fetchWithAuth(`/goals/${editingGoalId}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
    } else {
      res = await fetchWithAuth('/goals', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    }

    if (res && res.success) {
      showToast(editingGoalId ? 'Goal updated!' : 'Goal created!', 'success');
      closeGoalModal();
      await loadGoalsAndHabits();
    }
  } catch (error) {
    showToast('Failed to save goal.', 'error');
  }
}

async function deleteGoal(goalId) {
  if (confirm('Delete this goal?')) {
    try {
      const res = await fetchWithAuth(`/goals/${goalId}`, { method: 'DELETE' });
      if (res && res.success) {
        showToast('Goal deleted.', 'info');
        await loadGoalsAndHabits();
      }
    } catch (error) {
      showToast('Failed to delete goal.', 'error');
    }
  }
}
