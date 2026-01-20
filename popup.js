// ===== State Management =====
let currentDate = new Date();
let achievements = {};

// ===== Category Configuration =====
const CATEGORIES = {
  work: { emoji: '•', label: 'Work' },
  personal: { emoji: '•', label: 'Personal' },
  learning: { emoji: '•', label: 'Learning' },
  health: { emoji: '•', label: 'Health' },
  other: { emoji: '•', label: 'Other' }
};

// ===== DOM Elements =====
const elements = {
  prevDay: document.getElementById('prevDay'),
  nextDay: document.getElementById('nextDay'),
  todayBtn: document.getElementById('todayBtn'),
  currentDate: document.getElementById('currentDate'),
  achievementInput: document.getElementById('achievementInput'),
  categorySelect: document.getElementById('categorySelect'),
  addBtn: document.getElementById('addBtn'),
  achievementsList: document.getElementById('achievementsList'),
  achievementCount: document.getElementById('achievementCount'),
  emptyState: document.getElementById('emptyState'),
  exportBtn: document.getElementById('exportBtn')
};

// ===== Utility Functions =====
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function formatDisplayDate(date) {
  const options = { weekday: 'short', month: 'short', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function isToday(date) {
  const today = new Date();
  return formatDate(date) === formatDate(today);
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// ===== Storage Functions =====
async function loadAchievements() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['achievements'], (result) => {
      achievements = result.achievements || {};
      resolve();
    });
  });
}

async function saveAchievements() {
  return new Promise((resolve) => {
    chrome.storage.local.set({ achievements }, resolve);
  });
}

function getAchievementsForDate(date) {
  const dateKey = formatDate(date);
  return achievements[dateKey] || [];
}

// ===== Achievement CRUD =====
async function addAchievement(text, category) {
  const dateKey = formatDate(currentDate);

  if (!achievements[dateKey]) {
    achievements[dateKey] = [];
  }

  const achievement = {
    id: generateId(),
    text: text.trim(),
    category,
    timestamp: Date.now()
  };

  achievements[dateKey].unshift(achievement);
  await saveAchievements();

  return achievement;
}

async function deleteAchievement(id) {
  const dateKey = formatDate(currentDate);

  if (achievements[dateKey]) {
    achievements[dateKey] = achievements[dateKey].filter(a => a.id !== id);

    if (achievements[dateKey].length === 0) {
      delete achievements[dateKey];
    }

    await saveAchievements();
  }
}

// ===== UI Rendering =====
function renderAchievements() {
  const dayAchievements = getAchievementsForDate(currentDate);

  // Update count
  const count = dayAchievements.length;
  elements.achievementCount.textContent = `${count} item${count !== 1 ? 's' : ''}`;

  // Clear list (except empty state)
  const cards = elements.achievementsList.querySelectorAll('.achievement-card');
  cards.forEach(card => card.remove());

  // Show/hide empty state
  if (count === 0) {
    elements.emptyState.classList.remove('hidden');
    return;
  }

  elements.emptyState.classList.add('hidden');

  // Render achievements
  dayAchievements.forEach(achievement => {
    const card = createAchievementCard(achievement);
    elements.achievementsList.insertBefore(card, elements.emptyState);
  });
}

function createAchievementCard(achievement) {
  const card = document.createElement('div');
  card.className = 'achievement-card';
  card.dataset.id = achievement.id;

  const category = CATEGORIES[achievement.category] || CATEGORIES.other;

  card.innerHTML = `
    <div class="card-header">
      <span class="category-badge ${achievement.category}">
        ${category.emoji} ${category.label}
      </span>
      <button class="delete-btn" title="Delete">🗑️</button>
    </div>
    <p class="achievement-text">${escapeHtml(achievement.text)}</p>
    <span class="achievement-time">${formatTime(achievement.timestamp)}</span>
  `;

  // Delete handler
  card.querySelector('.delete-btn').addEventListener('click', async (e) => {
    e.stopPropagation();
    card.style.opacity = '0';
    card.style.transform = 'translateX(20px)';

    setTimeout(async () => {
      await deleteAchievement(achievement.id);
      renderAchievements();
      showToast('Achievement deleted', 'success');
    }, 200);
  });

  return card;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function updateDateDisplay() {
  elements.currentDate.textContent = formatDisplayDate(currentDate);

  // Highlight today button
  if (isToday(currentDate)) {
    elements.todayBtn.style.opacity = '0.5';
    elements.todayBtn.disabled = true;
  } else {
    elements.todayBtn.style.opacity = '1';
    elements.todayBtn.disabled = false;
  }
}

// ===== Toast Notification =====
function showToast(message, type = 'success') {
  // Remove existing toast
  const existingToast = document.querySelector('.toast');
  if (existingToast) {
    existingToast.remove();
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  // Trigger animation
  setTimeout(() => toast.classList.add('show'), 10);

  // Remove after delay
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

// ===== PDF Export =====
async function exportToPDF() {
  const dayAchievements = getAchievementsForDate(currentDate);

  if (dayAchievements.length === 0) {
    showToast('No achievements to export', 'error');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // Colors
  const primaryColor = [139, 92, 246]; // Purple
  const textColor = [51, 51, 51];
  const lightGray = [150, 150, 150];

  // Header
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 220, 35, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('🏆 Achievement Report', 20, 22);

  // Date
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(formatDisplayDate(currentDate), 20, 30);

  // Content
  let yPos = 50;

  // Group by category
  const grouped = {};
  dayAchievements.forEach(a => {
    if (!grouped[a.category]) {
      grouped[a.category] = [];
    }
    grouped[a.category].push(a);
  });

  // Render each category
  Object.entries(grouped).forEach(([categoryKey, items]) => {
    const category = CATEGORIES[categoryKey] || CATEGORIES.other;

    // Category header
    doc.setTextColor(...primaryColor);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`${category.emoji} ${category.label}`, 20, yPos);
    yPos += 8;

    // Achievements in category
    doc.setTextColor(...textColor);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');

    items.forEach(achievement => {
      // Check for page break
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }

      // Bullet point and text
      const lines = doc.splitTextToSize(`• ${achievement.text}`, 160);
      lines.forEach(line => {
        doc.text(line, 25, yPos);
        yPos += 6;
      });

      // Timestamp
      doc.setTextColor(...lightGray);
      doc.setFontSize(9);
      doc.text(formatTime(achievement.timestamp), 25, yPos);
      doc.setTextColor(...textColor);
      doc.setFontSize(11);
      yPos += 10;
    });

    yPos += 5;
  });

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(...lightGray);
    doc.text(
      `Generated by Achievement Logger • Page ${i} of ${pageCount}`,
      105,
      290,
      { align: 'center' }
    );
  }

  // Save
  const fileName = `achievements_${formatDate(currentDate)}.pdf`;
  doc.save(fileName);

  showToast('PDF exported successfully!', 'success');
}

// ===== Event Listeners =====
function setupEventListeners() {
  // Add achievement
  elements.addBtn.addEventListener('click', handleAddAchievement);
  elements.achievementInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleAddAchievement();
    }
  });

  // Date navigation
  elements.prevDay.addEventListener('click', () => {
    currentDate.setDate(currentDate.getDate() - 1);
    updateDateDisplay();
    renderAchievements();
  });

  elements.nextDay.addEventListener('click', () => {
    currentDate.setDate(currentDate.getDate() + 1);
    updateDateDisplay();
    renderAchievements();
  });

  elements.todayBtn.addEventListener('click', () => {
    currentDate = new Date();
    updateDateDisplay();
    renderAchievements();
  });

  // Export
  elements.exportBtn.addEventListener('click', exportToPDF);
}

async function handleAddAchievement() {
  const text = elements.achievementInput.value.trim();
  const category = elements.categorySelect.value;

  if (!text) {
    elements.achievementInput.focus();
    return;
  }

  await addAchievement(text, category);

  // Clear input
  elements.achievementInput.value = '';
  elements.achievementInput.focus();

  // Re-render
  renderAchievements();

  showToast('Added', 'success');
}

// ===== Initialization =====
async function init() {
  await loadAchievements();
  updateDateDisplay();
  renderAchievements();
  setupEventListeners();
  elements.achievementInput.focus();
}

// Start the app
document.addEventListener('DOMContentLoaded', init);
