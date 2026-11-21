'use strict';

/* ======================================================================
   KPI Tracker — popup logic
   Data never leaves the device: chrome.storage.local only, no network.
   ====================================================================== */

const CATEGORIES = [
  { id: 'work', label: 'Work', color: 'blue', rgb: [24, 51, 71], bg: [211, 229, 239] },
  { id: 'leadership', label: 'Leadership', color: 'orange', rgb: [73, 41, 14], bg: [250, 222, 201] },
  { id: 'learning', label: 'Learning', color: 'purple', rgb: [65, 36, 84], bg: [232, 222, 238] },
  { id: 'personal', label: 'Personal', color: 'pink', rgb: [76, 35, 55], bg: [245, 224, 233] },
  { id: 'health', label: 'Health', color: 'green', rgb: [28, 56, 41], bg: [219, 237, 219] },
  { id: 'other', label: 'Other', color: 'gray', rgb: [50, 48, 44], bg: [227, 226, 224] }
];
const CATEGORY_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));
const category = (id) => CATEGORY_BY_ID[id] || CATEGORY_BY_ID.other;

const RANGES = ['day', 'week', 'month', 'quarter', 'year', 'all'];
const RANGE_LABELS = { day: 'Day', week: 'Week', month: 'Month', quarter: 'Quarter', year: 'Year', all: 'All time' };
const FORMATS = ['pdf', 'csv', 'md'];
const THEMES = ['system', 'light', 'dark'];

const MAX_TEXT = 500;
const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

/* ---------- Storage (chrome.storage.local, with a localStorage fallback for previews) ---------- */

const hasChromeStorage = typeof chrome !== 'undefined' && !!(chrome.storage && chrome.storage.local);

const storage = {
  async get(keys) {
    if (hasChromeStorage) return chrome.storage.local.get(keys);
    const out = {};
    for (const key of keys) {
      try {
        const raw = localStorage.getItem(key);
        if (raw !== null) out[key] = JSON.parse(raw);
      } catch { /* ignore */ }
    }
    return out;
  },
  async set(items) {
    if (hasChromeStorage) return chrome.storage.local.set(items);
    for (const [key, value] of Object.entries(items)) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
    }
  }
};

/* ---------- State ---------- */

const state = {
  entries: {},           // { 'YYYY-MM-DD': [{ id, text, category, timestamp }] } newest first
  day: startOfDay(new Date()),
  prefs: { theme: 'system', category: 'work', range: 'week', format: 'pdf' },
  searchCategory: 'all',
  undo: null
};

const $ = (id) => document.getElementById(id);
const el = {};

/* ---------- Date helpers (always local time) ---------- */

function pad(n) { return String(n).padStart(2, '0'); }
function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
function dayKey(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function parseKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function today() { return startOfDay(new Date()); }
function sameDay(a, b) { return dayKey(a) === dayKey(b); }
function startOfWeek(d) { return addDays(d, -((d.getDay() + 6) % 7)); }

const fmt = {
  weekday: new Intl.DateTimeFormat(undefined, { weekday: 'long' }),
  long: new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
  short: new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }),
  shortYear: new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
  monthYear: new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }),
  groupDay: new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
  time: new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' })
};

function plural(n, word) { return `${n} ${word}${n === 1 ? '' : 's'}`; }

/* ---------- Data validation ---------- */

function cleanText(value, max = MAX_TEXT) {
  return String(value ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max);
}

function newId() {
  return (crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`);
}

/** Returns a sanitized copy of an entries map. Anything malformed is dropped. */
function normalizeEntries(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const [key, list] of Object.entries(raw)) {
    if (!DAY_KEY_RE.test(key) || !Array.isArray(list)) continue;
    const items = [];
    for (const item of list) {
      if (!item || typeof item !== 'object') continue;
      const text = cleanText(item.text, 2000);
      if (!text) continue;
      const ts = Number(item.timestamp);
      items.push({
        id: typeof item.id === 'string' && item.id.length <= 64 ? item.id : newId(),
        text,
        category: CATEGORY_BY_ID[item.category] ? item.category : 'other',
        timestamp: Number.isFinite(ts) && ts > 0 ? ts : parseKey(key).getTime()
      });
    }
    if (items.length) out[key] = items;
  }
  return out;
}

/* ---------- Persistence ---------- */

async function load() {
  const data = await storage.get(['achievements', 'prefs']);
  state.entries = normalizeEntries(data.achievements);
  const p = data.prefs || {};
  if (THEMES.includes(p.theme)) state.prefs.theme = p.theme;
  if (CATEGORY_BY_ID[p.category]) state.prefs.category = p.category;
  if (RANGES.includes(p.range)) state.prefs.range = p.range;
  if (FORMATS.includes(p.format)) state.prefs.format = p.format;
}

function saveEntries() { return storage.set({ achievements: state.entries }); }
function savePrefs() { return storage.set({ prefs: state.prefs }); }

function entriesFor(d) { return state.entries[dayKey(d)] || []; }
function countFor(d) { return entriesFor(d).length; }

/* ---------- Theme ---------- */

function applyTheme(theme) {
  if (theme === 'system') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.dataset.theme = theme;
  try { localStorage.setItem('kpi-theme', theme); } catch { /* ignore */ }
  el.themeSwitch?.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.theme === theme)));
}

// Apply the cached theme synchronously to avoid a flash on open.
try {
  const cached = localStorage.getItem('kpi-theme');
  if (cached === 'light' || cached === 'dark') document.documentElement.dataset.theme = cached;
} catch { /* ignore */ }

/* ---------- Rendering: day view ---------- */

function renderDay() {
  const t = today();
  const d = state.day;
  const diff = Math.round((t - d) / 86400000);
  el.dateTitle.textContent = diff === 0 ? 'Today' : diff === 1 ? 'Yesterday' : fmt.weekday.format(d);
  el.dateSub.textContent = fmt.long.format(d);
  el.datePicker.value = dayKey(d);
  el.datePicker.max = dayKey(t);
  el.todayBtn.disabled = diff === 0;
  el.nextDay.disabled = diff <= 0;

  const list = entriesFor(d);
  el.entryList.replaceChildren(...list.map(renderEntry));
  el.emptyState.hidden = list.length > 0;
  renderStats();
}

function renderStats() {
  const t = today();
  const weekStart = startOfWeek(t);
  let week = 0;
  for (let i = 0; i < 7; i++) week += countFor(addDays(weekStart, i));

  let cursor = countFor(t) ? t : addDays(t, -1);
  let streak = 0;
  while (countFor(cursor)) { streak++; cursor = addDays(cursor, -1); }

  let total = 0;
  for (const list of Object.values(state.entries)) total += list.length;

  el.statWeek.textContent = String(week);
  el.statStreak.textContent = plural(streak, 'day');
  el.statTotal.textContent = total.toLocaleString();
}

function buildCategorySelect(selected, label) {
  const select = document.createElement('select');
  select.className = 'tag tag-select';
  select.setAttribute('aria-label', label);
  for (const c of CATEGORIES) {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.label;
    select.append(opt);
  }
  select.value = category(selected).id;
  select.dataset.color = category(selected).color;
  return select;
}

function iconButton(title, path, extraClass = '') {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `icon-btn ${extraClass}`.trim();
  btn.title = title;
  btn.setAttribute('aria-label', title);
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('aria-hidden', 'true');
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p.setAttribute('d', path);
  svg.append(p);
  btn.append(svg);
  return btn;
}

function renderEntry(entry) {
  const li = document.createElement('li');
  li.className = 'entry';
  li.dataset.id = entry.id;

  const bullet = document.createElement('span');
  bullet.className = 'entry-bullet';
  bullet.setAttribute('aria-hidden', 'true');

  const body = document.createElement('div');
  body.className = 'entry-body';

  const text = document.createElement('span');
  text.className = 'entry-text';
  text.textContent = entry.text;
  text.title = 'Click to edit';
  text.addEventListener('click', () => startEdit(li, text, entry));

  const meta = document.createElement('div');
  meta.className = 'entry-meta';
  const select = buildCategorySelect(entry.category, 'Change category');
  select.addEventListener('change', async () => {
    entry.category = category(select.value).id;
    select.dataset.color = category(entry.category).color;
    await saveEntries();
  });
  const time = document.createElement('time');
  time.className = 'entry-time';
  time.dateTime = new Date(entry.timestamp).toISOString();
  time.textContent = fmt.time.format(entry.timestamp);
  meta.append(select, time);
  body.append(text, meta);

  const actions = document.createElement('div');
  actions.className = 'entry-actions';
  const edit = iconButton('Edit', 'M10.5 2.5l3 3L6 13H3v-3z');
  edit.addEventListener('click', () => startEdit(li, text, entry));
  const del = iconButton('Delete', 'M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8.5h5.8l.6-8.5', 'danger');
  del.addEventListener('click', () => removeEntry(li, entry));
  actions.append(edit, del);

  li.append(bullet, body, actions);
  return li;
}

function startEdit(li, textEl, entry) {
  if (textEl.isContentEditable) return;
  const original = entry.text;
  textEl.contentEditable = 'plaintext-only';
  textEl.focus();
  const range = document.createRange();
  range.selectNodeContents(textEl);
  range.collapse(false);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);

  let done = false;
  const finish = async (commit) => {
    if (done) return;
    done = true;
    textEl.removeAttribute('contenteditable');
    textEl.removeEventListener('keydown', onKey);
    textEl.removeEventListener('blur', onBlur);
    const next = cleanText(textEl.textContent);
    if (commit && next && next !== original) {
      entry.text = next;
      textEl.textContent = next;
      await saveEntries();
      toast('Saved');
    } else {
      textEl.textContent = original;
    }
  };
  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); finish(true); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finish(false); }
  };
  const onBlur = () => finish(true);
  textEl.addEventListener('keydown', onKey);
  textEl.addEventListener('blur', onBlur);
}

async function addEntry(text) {
  const clean = cleanText(text);
  if (!clean) return;
  const key = dayKey(state.day);
  const now = new Date();
  // Entries logged on a past day keep that day's date but the current time of day.
  const stamp = sameDay(state.day, now)
    ? now.getTime()
    : new Date(state.day.getFullYear(), state.day.getMonth(), state.day.getDate(), now.getHours(), now.getMinutes()).getTime();
  const entry = { id: newId(), text: clean, category: category(el.categorySelect.value).id, timestamp: stamp };
  (state.entries[key] ||= []).unshift(entry);
  await saveEntries();
  renderDay();
}

function removeEntry(li, entry) {
  li.classList.add('leaving');
  setTimeout(async () => {
    const key = dayKey(state.day);
    const list = state.entries[key] || [];
    const index = list.findIndex((e) => e.id === entry.id);
    if (index === -1) return;
    list.splice(index, 1);
    if (!list.length) delete state.entries[key];
    state.undo = { key, index, entry };
    await saveEntries();
    renderDay();
    toast('Deleted', { action: 'Undo', onAction: undoDelete, duration: 5000 });
  }, 140);
}

async function undoDelete() {
  const u = state.undo;
  if (!u) return;
  state.undo = null;
  const list = (state.entries[u.key] ||= []);
  list.splice(Math.min(u.index, list.length), 0, u.entry);
  await saveEntries();
  state.day = parseKey(u.key);
  renderDay();
  hideToast();
}

function goToDay(d) {
  const t = today();
  state.day = d > t ? t : startOfDay(d);
  renderDay();
}

/* ---------- Search ---------- */

function openSearch() {
  closeMenu();
  el.dayView.hidden = true;
  el.searchView.hidden = false;
  el.searchBtn.setAttribute('aria-expanded', 'true');
  renderSearchFilters();
  renderSearch();
  el.searchInput.focus();
  el.searchInput.select();
}

function closeSearch() {
  el.searchView.hidden = true;
  el.dayView.hidden = false;
  el.searchBtn.setAttribute('aria-expanded', 'false');
  renderDay();
  el.entryInput.focus();
}

function renderSearchFilters() {
  const chips = [{ id: 'all', label: 'All' }, ...CATEGORIES].map((c) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.textContent = c.label;
    if (c.id === 'all') b.dataset.all = '';
    else b.dataset.color = c.color;
    b.setAttribute('aria-pressed', String(state.searchCategory === c.id));
    b.addEventListener('click', () => {
      state.searchCategory = c.id;
      renderSearchFilters();
      renderSearch();
    });
    return b;
  });
  el.searchFilters.replaceChildren(...chips);
}

function highlight(text, query) {
  const frag = document.createDocumentFragment();
  if (!query) { frag.append(text); return frag; }
  const lower = text.toLowerCase();
  let i = 0;
  while (i < text.length) {
    const hit = lower.indexOf(query, i);
    if (hit === -1) { frag.append(text.slice(i)); break; }
    if (hit > i) frag.append(text.slice(i, hit));
    const mark = document.createElement('mark');
    mark.textContent = text.slice(hit, hit + query.length);
    frag.append(mark);
    i = hit + query.length;
  }
  return frag;
}

function renderSearch() {
  const q = el.searchInput.value.trim().toLowerCase();
  const cat = state.searchCategory;
  const keys = Object.keys(state.entries).sort().reverse();
  const groups = [];
  let shown = 0;
  let total = 0;

  for (const key of keys) {
    const hits = state.entries[key].filter((e) =>
      (cat === 'all' || e.category === cat) && (!q || e.text.toLowerCase().includes(q)));
    if (!hits.length) continue;
    total += hits.length;
    if (shown >= 200) continue;
    shown += hits.length;

    const group = document.createElement('section');
    group.className = 'result-group';
    const head = document.createElement('button');
    head.type = 'button';
    head.className = 'result-date';
    const label = document.createElement('span');
    label.textContent = fmt.groupDay.format(parseKey(key));
    const count = document.createElement('span');
    count.textContent = String(hits.length);
    head.append(label, count);
    head.addEventListener('click', () => jumpTo(key));
    group.append(head);

    for (const e of hits) {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'result';
      const tag = document.createElement('span');
      tag.className = 'tag';
      tag.dataset.color = category(e.category).color;
      tag.textContent = category(e.category).label;
      const t = document.createElement('span');
      t.className = 'result-text';
      t.append(highlight(e.text, q));
      row.append(tag, t);
      row.addEventListener('click', () => jumpTo(key, e.id));
      group.append(row);
    }
    groups.push(group);
  }

  if (!groups.length) {
    const p = document.createElement('p');
    p.className = 'search-empty';
    p.textContent = Object.keys(state.entries).length ? 'No matching wins.' : 'Nothing logged yet — your wins will show up here.';
    groups.push(p);
  } else if (total > shown) {
    const p = document.createElement('p');
    p.className = 'search-empty';
    p.textContent = `Showing ${shown} of ${total}. Refine your search to see more.`;
    groups.push(p);
  }
  el.searchResults.replaceChildren(...groups);
}

function jumpTo(key, id) {
  state.day = parseKey(key);
  closeSearch();
  if (id) {
    const row = el.entryList.querySelector(`[data-id="${CSS.escape(id)}"]`);
    if (row) {
      row.scrollIntoView({ block: 'center' });
      row.classList.add('flash');
      setTimeout(() => row.classList.remove('flash'), 1400);
    }
  }
}

/* ---------- Menu ---------- */

function openMenu() {
  el.menu.hidden = false;
  el.menuBtn.setAttribute('aria-expanded', 'true');
  applyTheme(state.prefs.theme);
}
function closeMenu() {
  el.menu.hidden = true;
  el.menuBtn.setAttribute('aria-expanded', 'false');
}

/* ---------- Export ---------- */

function rangeBounds(range, anchor = state.day) {
  const y = anchor.getFullYear();
  const m = anchor.getMonth();
  switch (range) {
    case 'day': return [anchor, anchor];
    case 'week': { const s = startOfWeek(anchor); return [s, addDays(s, 6)]; }
    case 'month': return [new Date(y, m, 1), new Date(y, m + 1, 0)];
    case 'quarter': { const q = Math.floor(m / 3) * 3; return [new Date(y, q, 1), new Date(y, q + 3, 0)]; }
    case 'year': return [new Date(y, 0, 1), new Date(y, 11, 31)];
    default: return [null, null];
  }
}

function rangeLabel(range, anchor = state.day) {
  const [s, e] = rangeBounds(range, anchor);
  switch (range) {
    case 'day': return fmt.shortYear.format(s);
    case 'week': return `${fmt.short.format(s)} – ${fmt.shortYear.format(e)}`;
    case 'month': return fmt.monthYear.format(s);
    case 'quarter': return `Q${Math.floor(s.getMonth() / 3) + 1} ${s.getFullYear()}`;
    case 'year': return String(s.getFullYear());
    default: return 'All time';
  }
}

/** Entries in a range, oldest first (reports read chronologically). */
function entriesInRange(range) {
  const [s, e] = rangeBounds(range);
  const lo = s ? dayKey(s) : '';
  const hi = e ? dayKey(e) : '9999-99-99';
  const out = [];
  for (const key of Object.keys(state.entries)) {
    if (key < lo || key > hi) continue;
    for (const entry of state.entries[key]) out.push({ ...entry, date: key });
  }
  out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.timestamp - b.timestamp));
  return out;
}

function groupByCategory(list) {
  const groups = new Map(CATEGORIES.map((c) => [c.id, []]));
  for (const e of list) groups.get(category(e.category).id).push(e);
  return [...groups].filter(([, items]) => items.length).map(([id, items]) => ({ cat: category(id), items }));
}

function openExport() {
  closeMenu();
  renderRangeOptions();
  syncFormat();
  updateExportSummary();
  el.exportDialog.showModal();
}

function renderRangeOptions() {
  const rows = RANGES.map((r) => {
    const label = document.createElement('label');
    label.className = 'option';
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'range';
    input.value = r;
    input.checked = state.prefs.range === r;
    input.addEventListener('change', () => { state.prefs.range = r; savePrefs(); updateExportSummary(); });
    const name = document.createElement('span');
    name.className = 'option-label';
    name.textContent = RANGE_LABELS[r];
    const hint = document.createElement('span');
    hint.className = 'option-hint';
    hint.textContent = r === 'all' ? '' : rangeLabel(r);
    label.append(input, name, hint);
    return label;
  });
  el.rangeOptions.replaceChildren(...rows);
}

function syncFormat() {
  el.formatSwitch.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.format === state.prefs.format)));
}

function updateExportSummary() {
  const list = entriesInRange(state.prefs.range);
  const days = new Set(list.map((e) => e.date)).size;
  el.exportSummary.replaceChildren();
  if (!list.length) {
    el.exportSummary.textContent = 'No wins in this range yet.';
  } else {
    const strong = document.createElement('strong');
    strong.textContent = plural(list.length, 'win');
    el.exportSummary.append(strong, ` across ${plural(days, 'day')}`);
  }
  el.downloadBtn.disabled = !list.length;
  el.copyBtn.disabled = !list.length;
}

function fileBase() {
  const r = state.prefs.range;
  if (r === 'all') return 'kpi-tracker_all-time';
  const [s, e] = rangeBounds(r);
  return r === 'day' ? `kpi-tracker_${dayKey(s)}` : `kpi-tracker_${dayKey(s)}_to_${dayKey(e)}`;
}

function downloadBlob(content, type, filename) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

function toMarkdown(list) {
  const r = state.prefs.range;
  const lines = [`# Achievements — ${rangeLabel(r)}`, ''];
  const groups = groupByCategory(list);
  lines.push(`**${plural(list.length, 'win')}** · ${groups.map((g) => `${g.cat.label} ${g.items.length}`).join(' · ')}`, '');
  for (const g of groups) {
    lines.push(`## ${g.cat.label}`, '');
    for (const e of g.items) {
      const text = e.text.replace(/\s*\n\s*/g, ' ');
      lines.push(r === 'day' ? `- ${text}` : `- ${text} _(${fmt.short.format(parseKey(e.date))})_`);
    }
    lines.push('');
  }
  return lines.join('\n').trimEnd() + '\n';
}

function csvCell(value) {
  let v = String(value);
  // Neutralise spreadsheet formula injection.
  if (/^[=+\-@\t\r]/.test(v)) v = `'${v}`;
  return `"${v.replace(/"/g, '""')}"`;
}

function toCSV(list) {
  const rows = [['Date', 'Time', 'Category', 'Achievement']];
  for (const e of list) rows.push([e.date, fmt.time.format(e.timestamp), category(e.category).label, e.text]);
  return '﻿' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

let jsPDFPromise = null;
function loadJsPDF() {
  if (window.jspdf) return Promise.resolve(window.jspdf);
  jsPDFPromise ||= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'libs/jspdf.umd.min.js';
    s.onload = () => (window.jspdf ? resolve(window.jspdf) : reject(new Error('jsPDF failed to load')));
    s.onerror = () => { jsPDFPromise = null; reject(new Error('jsPDF failed to load')); };
    document.head.append(s);
  });
  return jsPDFPromise;
}

async function toPDF(list) {
  const { jsPDF } = await loadJsPDF();
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 20;
  const ink = [55, 53, 47];
  const muted = [120, 119, 116];
  const faint = [233, 233, 231];
  let y = 26;

  const ensure = (h) => { if (y + h > H - 20) { doc.addPage(); y = 22; } };

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(...ink);
  doc.text('Achievement Report', M, y);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...muted);
  doc.text(`${rangeLabel(state.prefs.range)}  ·  ${plural(list.length, 'win')}  ·  Generated ${fmt.shortYear.format(new Date())}`, M, y);
  y += 8;

  const groups = groupByCategory(list);
  // Category summary chips
  let x = M;
  doc.setFontSize(9);
  for (const g of groups) {
    const label = `${g.cat.label} ${g.items.length}`;
    const w = doc.getTextWidth(label) + 5;
    if (x + w > W - M) { x = M; y += 7; }
    doc.setFillColor(...g.cat.bg);
    doc.roundedRect(x, y - 3.8, w, 5.6, 1, 1, 'F');
    doc.setTextColor(...g.cat.rgb);
    doc.text(label, x + 2.5, y);
    x += w + 2.5;
  }
  y += 6;
  doc.setDrawColor(...faint);
  doc.setLineWidth(0.3);
  doc.line(M, y, W - M, y);
  y += 10;

  const showDates = state.prefs.range !== 'day';
  for (const g of groups) {
    ensure(18);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...ink);
    doc.text(g.cat.label, M, y);
    y += 7;

    doc.setFont('helvetica', 'normal');
    for (const e of g.items) {
      doc.setFontSize(11);
      const lines = doc.splitTextToSize(e.text, W - M * 2 - 26);
      ensure(lines.length * 5.2 + 3);
      doc.setTextColor(...ink);
      doc.text('•', M + 1, y);
      doc.text(lines, M + 6, y, { lineHeightFactor: 1.35 });
      if (showDates) {
        doc.setFontSize(9);
        doc.setTextColor(...muted);
        doc.text(fmt.short.format(parseKey(e.date)), W - M, y, { align: 'right' });
      }
      y += lines.length * 5.2 + 2.6;
    }
    y += 6;
  }

  const pages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...muted);
    doc.text('KPI Tracker', M, H - 10);
    doc.text(`${i} / ${pages}`, W - M, H - 10, { align: 'right' });
  }
  return doc.output('blob');
}

async function download() {
  const list = entriesInRange(state.prefs.range);
  if (!list.length) return;
  const base = fileBase();
  el.downloadBtn.disabled = true;
  try {
    if (state.prefs.format === 'csv') downloadBlob(toCSV(list), 'text/csv;charset=utf-8', `${base}.csv`);
    else if (state.prefs.format === 'md') downloadBlob(toMarkdown(list), 'text/markdown;charset=utf-8', `${base}.md`);
    else downloadBlob(await toPDF(list), 'application/pdf', `${base}.pdf`);
    el.exportDialog.close();
    toast(`Exported ${plural(list.length, 'win')}`);
  } catch (err) {
    console.error(err);
    toast('Export failed. Please try again.', { error: true });
  } finally {
    el.downloadBtn.disabled = false;
  }
}

async function copyMarkdown() {
  const list = entriesInRange(state.prefs.range);
  if (!list.length) return;
  try {
    await navigator.clipboard.writeText(toMarkdown(list));
    el.exportDialog.close();
    toast(`Copied ${plural(list.length, 'win')} as Markdown`);
  } catch {
    toast('Could not access the clipboard', { error: true });
  }
}

/* ---------- Backup & restore ---------- */

function backup() {
  closeMenu();
  const payload = { app: 'kpi-tracker', version: 2, exportedAt: new Date().toISOString(), achievements: state.entries };
  downloadBlob(JSON.stringify(payload, null, 2), 'application/json', `kpi-tracker-backup_${dayKey(today())}.json`);
  toast('Backup downloaded');
}

async function restore(file) {
  if (!file) return;
  if (file.size > MAX_IMPORT_BYTES) { toast('That file is too large to be a backup', { error: true }); return; }
  let parsed;
  try { parsed = JSON.parse(await file.text()); } catch { toast('That file isn’t a valid backup', { error: true }); return; }
  const source = parsed && typeof parsed === 'object' && parsed.achievements ? parsed.achievements : parsed;
  const incoming = normalizeEntries(source);

  let added = 0;
  for (const [key, list] of Object.entries(incoming)) {
    const existing = (state.entries[key] ||= []);
    // De-duplicate by id, and by content for entries that arrive without a stable id.
    const seen = new Set(existing.flatMap((e) => [e.id, `${e.timestamp}|${e.text}`]));
    for (const e of list) {
      const sig = `${e.timestamp}|${e.text}`;
      if (seen.has(e.id) || seen.has(sig)) continue;
      existing.push(e);
      seen.add(e.id);
      seen.add(sig);
      added++;
    }
    existing.sort((a, b) => b.timestamp - a.timestamp);
  }
  if (!added) { toast('Nothing new to restore'); return; }
  await saveEntries();
  renderDay();
  toast(`Restored ${plural(added, 'win')}`);
}

/* ---------- Toast ---------- */

let toastTimer = 0;
function toast(message, { action, onAction, duration = 2200, error = false } = {}) {
  clearTimeout(toastTimer);
  el.toastText.textContent = message;
  el.toast.classList.toggle('error', error);
  el.toastAction.hidden = !action;
  el.toastAction.textContent = action || '';
  el.toastAction.onclick = onAction || null;
  el.toast.hidden = false;
  toastTimer = setTimeout(hideToast, duration);
}
function hideToast() { el.toast.hidden = true; }

/* ---------- Events ---------- */

function isTyping(target) {
  return target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
}

function bind() {
  el.addForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const value = el.entryInput.value;
    if (!value.trim()) return;
    el.entryInput.value = '';
    await addEntry(value);
    el.entryInput.focus();
  });

  el.categorySelect.addEventListener('change', () => {
    state.prefs.category = category(el.categorySelect.value).id;
    el.categorySelect.dataset.color = category(state.prefs.category).color;
    savePrefs();
  });

  el.prevDay.addEventListener('click', () => goToDay(addDays(state.day, -1)));
  el.nextDay.addEventListener('click', () => goToDay(addDays(state.day, 1)));
  el.todayBtn.addEventListener('click', () => goToDay(today()));

  el.dateTitle.parentElement.addEventListener('click', (e) => {
    e.preventDefault();
    try { el.datePicker.showPicker(); } catch { /* not supported */ }
  });
  el.datePicker.addEventListener('change', () => {
    if (DAY_KEY_RE.test(el.datePicker.value)) goToDay(parseKey(el.datePicker.value));
  });

  el.searchBtn.addEventListener('click', () => (el.searchView.hidden ? openSearch() : closeSearch()));
  el.searchClose.addEventListener('click', closeSearch);
  el.searchInput.addEventListener('input', renderSearch);

  el.menuBtn.addEventListener('click', (e) => { e.stopPropagation(); el.menu.hidden ? openMenu() : closeMenu(); });
  document.addEventListener('click', (e) => { if (!el.menu.hidden && !el.menu.contains(e.target)) closeMenu(); });
  el.themeSwitch.addEventListener('click', (e) => {
    const t = e.target.closest('button')?.dataset.theme;
    if (!THEMES.includes(t)) return;
    state.prefs.theme = t;
    applyTheme(t);
    savePrefs();
  });
  el.backupBtn.addEventListener('click', backup);
  el.restoreBtn.addEventListener('click', () => { closeMenu(); el.restoreInput.click(); });
  el.restoreInput.addEventListener('change', async () => {
    await restore(el.restoreInput.files[0]);
    el.restoreInput.value = '';
  });
  el.shortcutBtn.addEventListener('click', () => {
    closeMenu();
    if (typeof chrome !== 'undefined' && chrome.tabs) chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
  });

  el.exportBtn.addEventListener('click', openExport);
  el.formatSwitch.addEventListener('click', (e) => {
    const f = e.target.closest('button')?.dataset.format;
    if (!FORMATS.includes(f)) return;
    state.prefs.format = f;
    syncFormat();
    savePrefs();
  });
  el.downloadBtn.addEventListener('click', download);
  el.copyBtn.addEventListener('click', copyMarkdown);
  el.exportDialog.addEventListener('click', (e) => { if (e.target === el.exportDialog) el.exportDialog.close(); });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!el.menu.hidden) { e.preventDefault(); closeMenu(); return; }
      if (!el.searchView.hidden && !el.exportDialog.open) { e.preventDefault(); closeSearch(); return; }
    }
    if (isTyping(e.target) || el.exportDialog.open || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === '/') { e.preventDefault(); openSearch(); }
    else if (!el.dayView.hidden && e.key === 'ArrowLeft') goToDay(addDays(state.day, -1));
    else if (!el.dayView.hidden && e.key === 'ArrowRight') goToDay(addDays(state.day, 1));
    else if (!el.dayView.hidden && e.key.toLowerCase() === 't') goToDay(today());
    else if (!el.dayView.hidden && e.key.toLowerCase() === 'n') { e.preventDefault(); el.entryInput.focus(); }
  });
}

async function showShortcut() {
  try {
    if (typeof chrome === 'undefined' || !chrome.commands) return;
    const cmds = await chrome.commands.getAll();
    const cmd = cmds.find((c) => c.name === '_execute_action');
    el.shortcutKey.textContent = cmd && cmd.shortcut ? cmd.shortcut : 'Set…';
  } catch { /* ignore */ }
}

/* ---------- Init ---------- */

async function init() {
  for (const id of [
    'dayView', 'searchView', 'dateTitle', 'dateSub', 'datePicker', 'prevDay', 'nextDay', 'todayBtn',
    'statWeek', 'statStreak', 'statTotal', 'addForm', 'entryInput', 'categorySelect', 'entryList', 'emptyState',
    'searchBtn', 'searchInput', 'searchClose', 'searchFilters', 'searchResults', 'menuBtn', 'menu', 'themeSwitch',
    'backupBtn', 'restoreBtn', 'restoreInput', 'shortcutBtn', 'shortcutKey', 'exportBtn', 'exportDialog',
    'rangeOptions', 'formatSwitch', 'exportSummary', 'copyBtn', 'downloadBtn', 'toast', 'toastText', 'toastAction'
  ]) el[id] = $(id);

  await load();
  applyTheme(state.prefs.theme);

  const select = buildCategorySelect(state.prefs.category, 'Category');
  const { value, dataset: { color } } = select;
  el.categorySelect.replaceChildren(...select.options);
  el.categorySelect.value = value;
  el.categorySelect.dataset.color = color;

  bind();
  renderDay();
  showShortcut();
  el.entryInput.focus();
}

document.addEventListener('DOMContentLoaded', init);
