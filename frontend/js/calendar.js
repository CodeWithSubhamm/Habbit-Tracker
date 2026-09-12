// Calendar & Consistency Heatmap Logic

let currentCalendarDate = new Date();
let monthCompletions = [];
let allHabits = [];

document.addEventListener('DOMContentLoaded', async () => {
  if (!checkAuth()) return;

  setupCalendarControls();
  await loadHabitsAndCalendar();
  await loadConsistencyHeatmap();
});

function setupCalendarControls() {
  const prevBtn = document.getElementById('btn-prev-month');
  const nextBtn = document.getElementById('btn-next-month');
  const todayBtn = document.getElementById('btn-today-month');

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
      renderCalendarMonth();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
      renderCalendarMonth();
    });
  }

  if (todayBtn) {
    todayBtn.addEventListener('click', () => {
      currentCalendarDate = new Date();
      renderCalendarMonth();
    });
  }
}

// Load Habits & Monthly Completions
async function loadHabitsAndCalendar() {
  try {
    const habitsRes = await fetchWithAuth('/habits?status=all');
    if (habitsRes && habitsRes.success) {
      allHabits = habitsRes.habits;
    }
    await renderCalendarMonth();
  } catch (error) {
    console.error('Failed to load calendar data:', error);
  }
}

// Render Monthly Calendar Grid
async function renderCalendarMonth() {
  const titleEl = document.getElementById('calendar-month-title');
  const gridEl = document.getElementById('calendar-days-grid');
  if (!gridEl) return;

  const year = currentCalendarDate.getFullYear();
  const month = currentCalendarDate.getMonth();

  if (titleEl) {
    titleEl.textContent = currentCalendarDate.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    });
  }

  const startDate = new Date(year, month, 1).toISOString().split('T')[0];
  const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

  const completionsRes = await fetchWithAuth(`/completions?startDate=${startDate}&endDate=${endDate}`);
  monthCompletions = (completionsRes && completionsRes.success) ? completionsRes.completions : [];

  const dateMap = {};
  monthCompletions.forEach(c => {
    if (!dateMap[c.date]) dateMap[c.date] = [];
    dateMap[c.date].push(c);
  });

  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const prevMonthTotalDays = new Date(year, month, 0).getDate();

  const todayStr = getTodayString();
  let html = '';

  for (let i = firstDayIndex - 1; i >= 0; i--) {
    html += `<div class="calendar-day-tile other-month"><span class="day-number">${prevMonthTotalDays - i}</span></div>`;
  }

  for (let day = 1; day <= totalDays; day++) {
    const dObj = new Date(year, month, day);
    const dateStr = dObj.toISOString().split('T')[0];
    const isToday = dateStr === todayStr;
    const dayRecords = dateMap[dateStr] || [];

    const completedCount = dayRecords.filter(r => r.status === 'completed').length;
    const skippedCount = dayRecords.filter(r => r.status === 'skipped').length;
    const missedCount = dayRecords.filter(r => r.status === 'missed').length;

    html += `
      <div class="calendar-day-tile ${isToday ? 'today' : ''}" onclick="openDayInspector('${dateStr}')">
        <span class="day-number">${day}</span>
        <div class="day-dots">
          ${completedCount > 0 ? '<span class="day-dot dot-completed" title="Completed"></span>' : ''}
          ${skippedCount > 0 ? '<span class="day-dot dot-skipped" title="Skipped"></span>' : ''}
          ${missedCount > 0 ? '<span class="day-dot dot-missed" title="Missed"></span>' : ''}
        </div>
      </div>
    `;
  }

  gridEl.innerHTML = html;
}

// Open Day Inspector Drawer / Modal
async function openDayInspector(dateStr) {
  const modal = document.getElementById('day-inspector-modal');
  const title = document.getElementById('day-inspector-title');
  const content = document.getElementById('day-inspector-content');

  if (title) {
    title.textContent = formatDateDisplay(dateStr);
  }

  try {
    const res = await fetchWithAuth(`/completions?date=${dateStr}`);
    const completions = (res && res.success) ? res.completions : [];

    if (completions.length === 0) {
      content.innerHTML = `
        <div class="empty-state" style="padding: 30px 10px;">
          <div style="font-size: 32px; margin-bottom: 6px;">📅</div>
          <p style="color: var(--text-muted); font-size: 14px;">No habit activity recorded on this day.</p>
        </div>
      `;
    } else {
      content.innerHTML = completions.map(c => {
        const habit = c.habitId || allHabits.find(h => h._id === (c.habitId?._id || c.habitId));
        const habitName = habit ? habit.name : 'Habit';
        const habitIcon = habit ? habit.icon : '✨';

        return `
          <div class="glass-card" style="padding: 14px; margin-bottom: 10px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 18px;">${habitIcon}</span>
                <span style="font-weight: 700; font-size: 14px;">${habitName}</span>
              </div>
              <span class="badge ${c.status === 'completed' ? 'badge-success' : 'badge-warning'}" style="text-transform: capitalize;">
                ${c.status}
              </span>
            </div>

            ${c.quantity ? `<div style="font-size: 12.5px; color: var(--text-secondary);">📊 Quantity: ${c.quantity}</div>` : ''}
            ${c.duration ? `<div style="font-size: 12.5px; color: var(--text-secondary);">⏱ Duration: ${c.duration} minutes</div>` : ''}
            ${c.note ? `
              <div style="margin-top: 6px; font-size: 13px; background: rgba(255,255,255,0.04); padding: 8px; border-radius: var(--radius-sm); border-left: 3px solid var(--accent);">
                📝 <em>"${c.note}"</em>
              </div>
            ` : ''}
          </div>
        `;
      }).join('');
    }

    if (modal) modal.classList.add('open');
  } catch (err) {
    showToast('Failed to load day details.', 'error');
  }
}

function closeDayInspector() {
  const modal = document.getElementById('day-inspector-modal');
  if (modal) modal.classList.remove('open');
}

// 365-Day Consistency Heatmap
async function loadConsistencyHeatmap() {
  const heatmapEl = document.getElementById('consistency-heatmap-grid');
  if (!heatmapEl) return;

  try {
    const res = await fetchWithAuth('/analytics/heatmap');
    const heatmapData = (res && res.success) ? res.heatmap : {};

    const today = new Date();
    let html = '';

    for (let i = 364; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const count = heatmapData[dateStr] || 0;

      let level = 0;
      if (count >= 4) level = 4;
      else if (count === 3) level = 3;
      else if (count === 2) level = 2;
      else if (count === 1) level = 1;

      html += `
        <div class="heatmap-cell"
             data-level="${level}"
             title="${dateStr}: ${count} habit${count === 1 ? '' : 's'} completed"
             onclick="openDayInspector('${dateStr}')">
        </div>
      `;
    }

    heatmapEl.innerHTML = html;
  } catch (error) {
    console.error('Failed to load heatmap:', error);
  }
}
