// Analytics Page Logic (No Auth Required)

document.addEventListener('DOMContentLoaded', async () => {
  await loadAnalyticsDashboard();
});

async function loadAnalyticsDashboard() {
  try {
    const [overviewRes, weeklyRes, monthlyRes, achievementsRes] = await Promise.all([
      fetchWithAuth('/analytics/overview'),
      fetchWithAuth('/analytics/weekly'),
      fetchWithAuth('/analytics/monthly'),
      fetchWithAuth('/achievements')
    ]);

    if (overviewRes && overviewRes.success) {
      renderOverviewCards(overviewRes.data);
    }

    if (weeklyRes && weeklyRes.success) {
      renderWeeklyChart(weeklyRes.weekDays);
    }

    if (monthlyRes && monthlyRes.success) {
      renderMonthlyAndCategories(monthlyRes.stats, monthlyRes.categories);
    }

    if (achievementsRes && achievementsRes.success) {
      renderAchievements(achievementsRes.achievements, achievementsRes.unlockedCount, achievementsRes.totalCount);
    }
  } catch (error) {
    console.error('Failed to load analytics:', error);
  }
}

// Render Top KPI Cards
function renderOverviewCards(data) {
  const rateEl = document.getElementById('analytics-rate');
  const completionsEl = document.getElementById('analytics-completions');
  const streakEl = document.getElementById('analytics-current-streak');
  const longestEl = document.getElementById('analytics-longest-streak');

  if (rateEl) rateEl.textContent = `${data.completionRate}%`;
  if (completionsEl) completionsEl.textContent = data.totalCompletions;
  if (streakEl) streakEl.textContent = `${data.currentStreak} days`;
  if (longestEl) longestEl.textContent = `${data.longestStreak} days`;
}

// Render Weekly Progress Chart
function renderWeeklyChart(weekDays) {
  const container = document.getElementById('weekly-chart-container');
  if (!container) return;

  const maxCompleted = Math.max(1, ...weekDays.map(d => d.completed));

  container.innerHTML = weekDays.map(d => {
    const heightPct = Math.min(100, Math.round((d.completed / (maxCompleted + 1)) * 100));
    return `
      <div style="display: flex; flex-direction: column; align-items: center; gap: 8px; flex: 1;">
        <div style="font-size: 11px; font-weight: 700; color: var(--accent-light);">${d.completed}</div>
        <div style="width: 100%; max-width: 40px; height: 160px; background: rgba(255,255,255,0.04); border-radius: var(--radius-md); display: flex; align-items: flex-end; overflow: hidden; padding: 3px; border: 1px solid var(--glass-border);">
          <div style="width: 100%; height: ${Math.max(8, heightPct)}%; background: var(--accent-gradient); border-radius: var(--radius-sm); transition: height 0.6s ease; box-shadow: 0 0 10px var(--accent-glow);"></div>
        </div>
        <span style="font-size: 12px; font-weight: 600; color: var(--text-secondary);">${d.name}</span>
      </div>
    `;
  }).join('');
}

// Render Monthly Breakdown & Category Distribution
function renderMonthlyAndCategories(stats, categories) {
  const mCompleted = document.getElementById('monthly-completed');
  const mSkipped = document.getElementById('monthly-skipped');
  const mMissed = document.getElementById('monthly-missed');

  if (mCompleted) mCompleted.textContent = stats.completed;
  if (mSkipped) mSkipped.textContent = stats.skipped;
  if (mMissed) mMissed.textContent = stats.missed;

  const catContainer = document.getElementById('category-distribution-container');
  if (!catContainer) return;

  const totalCatCompletions = Object.values(categories).reduce((sum, v) => sum + v, 0) || 1;
  const entries = Object.entries(categories);

  if (entries.length === 0) {
    catContainer.innerHTML = '<p style="color: var(--text-muted); font-size: 13px;">No category data yet this month.</p>';
    return;
  }

  catContainer.innerHTML = entries.map(([category, count]) => {
    const pct = Math.round((count / totalCatCompletions) * 100);
    return `
      <div style="margin-bottom: 14px;">
        <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 600; margin-bottom: 6px;">
          <span class="badge cat-${category}">${category}</span>
          <span>${count} completed (${pct}%)</span>
        </div>
        <div class="progress-track" style="height: 8px;">
          <div class="progress-fill" style="width: ${pct}%;"></div>
        </div>
      </div>
    `;
  }).join('');
}

// Render Achievements Section
function renderAchievements(achievements, unlockedCount, totalCount) {
  const counterEl = document.getElementById('achievements-counter');
  const gridEl = document.getElementById('achievements-grid');

  if (counterEl) {
    counterEl.textContent = `${unlockedCount} / ${totalCount} Unlocked`;
  }

  if (gridEl) {
    gridEl.innerHTML = achievements.map(ach => {
      return `
        <div class="achievement-card ${ach.isUnlocked ? 'unlocked' : 'locked'}">
          <div class="achievement-icon">${ach.isUnlocked ? ach.icon : '🔒'}</div>
          <h4 style="font-family: var(--font-heading); font-size: 15px; font-weight: 700;">${ach.title}</h4>
          <p style="font-size: 12px; color: var(--text-secondary);">${ach.description}</p>
          <span class="badge ${ach.isUnlocked ? 'badge-success' : ''}" style="font-size: 11px; margin-top: auto;">
            ${ach.isUnlocked ? '✓ Unlocked' : 'Locked'}
          </span>
        </div>
      `;
    }).join('');
  }
}
