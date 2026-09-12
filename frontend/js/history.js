// Activity History Log Logic (No Auth Required)

let allCompletions = [];
let currentFilter = 'all';

document.addEventListener('DOMContentLoaded', async () => {
  setupHistoryControls();
  await loadHistory();
});

function setupHistoryControls() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.status;
      renderHistoryTimeline();
    });
  });

  const searchInput = document.getElementById('search-history');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      renderHistoryTimeline();
    });
  }
}

async function loadHistory() {
  try {
    const res = await fetchWithAuth('/completions');
    if (res && res.success) {
      allCompletions = res.completions;
    }
    renderHistoryTimeline();
  } catch (error) {
    console.error('Failed to load history:', error);
    renderHistoryTimeline();
  }
}

function renderHistoryTimeline() {
  const container = document.getElementById('history-timeline-container');
  if (!container) return;

  const searchQuery = (document.getElementById('search-history')?.value || '').toLowerCase().trim();

  const filtered = allCompletions.filter(c => {
    if (currentFilter !== 'all' && c.status !== currentFilter) return false;
    const habitName = (c.habitId?.name || '').toLowerCase();
    const note = (c.note || '').toLowerCase();
    if (searchQuery && !habitName.includes(searchQuery) && !note.includes(searchQuery)) {
      return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state glass-card">
        <div class="empty-icon">📜</div>
        <h3>No activity records found</h3>
        <p style="color: var(--text-muted);">Completions and reflection notes will appear here as you log your routines.</p>
      </div>
    `;
    return;
  }

  const grouped = {};
  filtered.forEach(c => {
    if (!grouped[c.date]) grouped[c.date] = [];
    grouped[c.date].push(c);
  });

  container.innerHTML = Object.entries(grouped).map(([dateStr, records]) => {
    return `
      <div class="timeline-group">
        <div class="timeline-date-label">📅 ${formatDateDisplay(dateStr)}</div>
        ${records.map(r => {
          const habit = r.habitId;
          const name = habit ? habit.name : 'Unknown Habit';
          const icon = habit ? habit.icon : '✨';
          const category = habit ? habit.category : 'Personal';

          return `
            <div class="timeline-item">
              <div style="display: flex; align-items: center; gap: 14px;">
                <span style="font-size: 22px;">${icon}</span>
                <div>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-weight: 700; font-size: 14.5px;">${name}</span>
                    <span class="badge cat-${category}" style="font-size: 11px;">${category}</span>
                  </div>
                  <div style="font-size: 12.5px; color: var(--text-secondary); margin-top: 2px;">
                    ${r.quantity ? `<span>Quantity: ${r.quantity}</span> • ` : ''}
                    ${r.duration ? `<span>Duration: ${r.duration} min</span> • ` : ''}
                    <span>Logged on ${new Date(r.createdAt || r.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  ${r.note ? `
                    <div style="margin-top: 6px; font-size: 13px; color: var(--text-primary); background: rgba(255,255,255,0.05); padding: 6px 12px; border-radius: var(--radius-sm); border-left: 2px solid var(--accent);">
                      📝 <em>"${r.note}"</em>
                    </div>
                  ` : ''}
                </div>
              </div>

              <span class="badge ${r.status === 'completed' ? 'badge-success' : 'badge-warning'}" style="text-transform: capitalize; flex-shrink: 0;">
                ${r.status === 'completed' ? '✓ Completed' : r.status === 'skipped' ? '— Skipped' : '✕ Missed'}
              </span>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }).join('');
}
