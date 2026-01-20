// ===== State Management =====
let currentDate = new Date();
let achievements = {};
let selectedDateRange = 'today';
let selectedFormat = 'csv';

// ===== Category Configuration =====
const CATEGORIES = {
  work: { label: 'Work' },
  personal: { label: 'Personal' },
  learning: { label: 'Learning' },
  health: { label: 'Health' },
  other: { label: 'Other' }
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
  exportBtn: document.getElementById('exportBtn'),
  exportModal: document.getElementById('exportModal'),
  modalClose: document.getElementById('modalClose'),
  cancelExport: document.getElementById('cancelExport'),
  confirmExport: document.getElementById('confirmExport'),
  previewCount: document.getElementById('previewCount'),
  formatBtns: document.querySelectorAll('.format-btn'),
  dateRangeInputs: document.querySelectorAll('input[name="dateRange"]')
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

function formatDateForExport(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function isToday(date) {
  const today = new Date();
  return formatDate(date) === formatDate(today);
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// ===== Date Range Functions =====
function getDateRange(rangeType) {
  const today = new Date();
  let startDate, endDate;

  switch (rangeType) {
    case 'today':
      startDate = new Date(today);
      endDate = new Date(today);
      break;
    case 'week':
      // Get Monday of current week
      startDate = new Date(today);
      const day = startDate.getDay();
      const diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
      startDate.setDate(diff);
      // Get Sunday
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      break;
    case 'month':
      // First day of month
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      // Last day of month
      endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      break;
    case 'all':
      startDate = null;
      endDate = null;
      break;
    default:
      startDate = new Date(today);
      endDate = new Date(today);
  }

  return { startDate, endDate };
}

function getAchievementsInRange(rangeType) {
  const { startDate, endDate } = getDateRange(rangeType);
  const result = [];

  Object.keys(achievements).forEach(dateKey => {
    const date = new Date(dateKey);

    if (rangeType === 'all' ||
      (date >= startDate && date <= endDate)) {
      achievements[dateKey].forEach(achievement => {
        result.push({
          ...achievement,
          date: dateKey
        });
      });
    }
  });

  // Sort by date (newest first)
  result.sort((a, b) => new Date(b.date) - new Date(a.date) || b.timestamp - a.timestamp);

  return result;
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
        ${category.label}
      </span>
      <button class="delete-btn" title="Delete">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M2 4H12M5 4V3C5 2.44772 5.44772 2 6 2H8C8.55228 2 9 2.44772 9 3V4M11 4V11C11 11.5523 10.5523 12 10 12H4C3.44772 12 3 11.5523 3 11V4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
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
      showToast('Achievement deleted');
    }, 150);
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
  const existingToast = document.querySelector('.toast');
  if (existingToast) {
    existingToast.remove();
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add('show'), 10);

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 200);
  }, 2000);
}

// ===== Modal Functions =====
function openExportModal() {
  elements.exportModal.classList.add('active');
  updateExportPreview();
}

function closeExportModal() {
  elements.exportModal.classList.remove('active');
}

function updateExportPreview() {
  const achievements = getAchievementsInRange(selectedDateRange);
  elements.previewCount.textContent = achievements.length;
}

function setSelectedFormat(format) {
  selectedFormat = format;
  elements.formatBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.format === format);
  });
}

// ===== CSV Export =====
function exportToCSV() {
  const achievementsList = getAchievementsInRange(selectedDateRange);

  if (achievementsList.length === 0) {
    showToast('No achievements to export', 'error');
    closeExportModal();
    return;
  }

  // CSV Header
  const headers = ['Date', 'Time', 'Category', 'Achievement'];

  // CSV Rows
  const rows = achievementsList.map(a => {
    const category = CATEGORIES[a.category] || CATEGORIES.other;
    return [
      formatDateForExport(a.timestamp),
      formatTime(a.timestamp),
      category.label,
      `"${a.text.replace(/"/g, '""')}"` // Escape quotes in text
    ];
  });

  // Build CSV content
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  // Create download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  // Generate filename
  const { startDate, endDate } = getDateRange(selectedDateRange);
  let filename;
  if (selectedDateRange === 'all') {
    filename = 'achievements_all.csv';
  } else if (selectedDateRange === 'today') {
    filename = `achievements_${formatDate(new Date())}.csv`;
  } else {
    filename = `achievements_${formatDate(startDate)}_to_${formatDate(endDate)}.csv`;
  }

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  showToast(`Exported ${achievementsList.length} achievements`);
  closeExportModal();
}

// ===== PDF Export =====
async function exportToPDF() {
  const achievementsList = getAchievementsInRange(selectedDateRange);

  if (achievementsList.length === 0) {
    showToast('No achievements to export', 'error');
    closeExportModal();
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // Colors
  const primaryColor = [59, 130, 246]; // Blue
  const textColor = [26, 26, 46];
  const lightGray = [156, 163, 175];

  // Header
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 220, 35, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Achievement Report', 20, 22);

  // Date range subtitle
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const { startDate, endDate } = getDateRange(selectedDateRange);
  let rangeText;
  if (selectedDateRange === 'all') {
    rangeText = 'All Time';
  } else if (selectedDateRange === 'today') {
    rangeText = formatDisplayDate(new Date());
  } else {
    rangeText = `${formatDisplayDate(startDate)} - ${formatDisplayDate(endDate)}`;
  }
  doc.text(rangeText, 20, 30);

  // Content
  let yPos = 50;

  // Group by category
  const grouped = {};
  achievementsList.forEach(a => {
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
    doc.text(category.label, 20, yPos);
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

      // Date and timestamp
      doc.setTextColor(...lightGray);
      doc.setFontSize(9);
      const dateTimeStr = `${formatDateForExport(achievement.timestamp)} at ${formatTime(achievement.timestamp)}`;
      doc.text(dateTimeStr, 25, yPos);
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
      `Achievement Tracker • Page ${i} of ${pageCount}`,
      105,
      290,
      { align: 'center' }
    );
  }

  // Save
  let filename;
  if (selectedDateRange === 'all') {
    filename = 'achievements_all.pdf';
  } else if (selectedDateRange === 'today') {
    filename = `achievements_${formatDate(new Date())}.pdf`;
  } else {
    filename = `achievements_${formatDate(startDate)}_to_${formatDate(endDate)}.pdf`;
  }
  doc.save(filename);

  showToast(`Exported ${achievementsList.length} achievements`);
  closeExportModal();
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

  // Export modal
  elements.exportBtn.addEventListener('click', openExportModal);
  elements.modalClose.addEventListener('click', closeExportModal);
  elements.cancelExport.addEventListener('click', closeExportModal);

  // Close modal on overlay click
  elements.exportModal.addEventListener('click', (e) => {
    if (e.target === elements.exportModal) {
      closeExportModal();
    }
  });

  // Date range selection
  elements.dateRangeInputs.forEach(input => {
    input.addEventListener('change', (e) => {
      selectedDateRange = e.target.value;
      updateExportPreview();
    });
  });

  // Format selection
  elements.formatBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      setSelectedFormat(btn.dataset.format);
    });
  });

  // Confirm export
  elements.confirmExport.addEventListener('click', () => {
    if (selectedFormat === 'csv') {
      exportToCSV();
    } else {
      exportToPDF();
    }
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && elements.exportModal.classList.contains('active')) {
      closeExportModal();
    }
  });
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

  showToast('Achievement added');
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
