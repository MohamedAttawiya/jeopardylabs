const screens = {
  landing: document.getElementById('landing-screen'),
  config: document.getElementById('config-screen'),
  grid: document.getElementById('grid-screen'),
  preview: document.getElementById('preview-screen'),
};

const navButtons = document.querySelectorAll('[data-nav]');
const startCreateBtns = [
  document.getElementById('start-create'),
  document.getElementById('create-landing'),
];

const rowsInput = document.getElementById('rows');
const colsInput = document.getElementById('columns');
const titleInput = document.getElementById('title');
const languageInput = document.getElementById('language');
const categoriesContainer = document.getElementById('categories-container');
const gridContainer = document.getElementById('grid-container');
const toGridBtn = document.getElementById('to-grid');
const toPreviewBtn = document.getElementById('to-preview');
const jsonOutput = document.getElementById('json-output');
const timerNote = document.getElementById('timer-note');
const copyJsonBtn = document.getElementById('copy-json');
const downloadBtn = document.getElementById('download-json');

let previewTimer = null;
let countdownInterval = null;

const state = {
  title: '',
  language: 'en',
  rows: 5,
  cols: 5,
  categories: [],
  grid: [],
};

const clampSize = (val) => Math.min(6, Math.max(3, Number(val) || 3));

function generatePointsScheme(rows) {
  return Array.from({ length: rows }, (_, idx) => (idx + 1) * 100);
}

function resetTimers() {
  if (previewTimer) {
    clearTimeout(previewTimer);
    previewTimer = null;
  }
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
  timerNote.textContent = '';
}

function showScreen(key) {
  resetTimers();
  Object.entries(screens).forEach(([name, el]) => {
    el.classList.toggle('active', name === key);
  });

  if (key === 'preview') {
    startPreviewTimer();
  }
}

function startPreviewTimer() {
  let remaining = 10;
  timerNote.textContent = `Returning to landing in ${remaining}s...`;
  countdownInterval = setInterval(() => {
    remaining -= 1;
    timerNote.textContent = `Returning to landing in ${remaining}s...`;
    if (remaining <= 0) {
      clearInterval(countdownInterval);
    }
  }, 1000);

  previewTimer = setTimeout(() => {
    showScreen('landing');
  }, 10000);
}

function ensureGridState() {
  const rows = clampSize(state.rows);
  const cols = clampSize(state.cols);
  state.grid = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => state.grid?.[r]?.[c] || { q: '', a: '' })
  );
}

function createCategoryInputs(cols) {
  categoriesContainer.innerHTML = '';
  for (let i = 0; i < cols; i += 1) {
    const wrapper = document.createElement('div');
    wrapper.className = 'field';

    const nameLabel = document.createElement('label');
    nameLabel.innerHTML = `<span>Category ${i + 1}</span>`;
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.placeholder = `Topic ${i + 1}`;
    nameInput.value = state.categories[i] || '';
    nameInput.dataset.category = i;
    nameLabel.appendChild(nameInput);

    wrapper.appendChild(nameLabel);
    categoriesContainer.appendChild(wrapper);
  }
}

function renderGrid() {
  ensureGridState();
  gridContainer.innerHTML = '';
  const pointsScheme = generatePointsScheme(state.rows);

  for (let r = 0; r < state.rows; r += 1) {
    for (let c = 0; c < state.cols; c += 1) {
      const cell = document.createElement('div');
      cell.className = 'cell-card';

      const head = document.createElement('div');
      head.className = 'cell-head';
      const catName = state.categories[c] || `Category ${c + 1}`;
      head.innerHTML = `<span class="category">${catName}</span><span class="points">${pointsScheme[r]} pts</span>`;

      const qWrap = document.createElement('div');
      qWrap.className = 'cell-body question';
      const qText = document.createElement('textarea');
      qText.placeholder = `Question ${r + 1}-${c + 1}`;
      qText.value = state.grid[r][c].q;
      qText.dataset.question = `${r}-${c}`;
      qWrap.appendChild(qText);

      const aWrap = document.createElement('div');
      aWrap.className = 'cell-body answer';
      const aText = document.createElement('textarea');
      aText.placeholder = `Answer ${r + 1}-${c + 1}`;
      aText.value = state.grid[r][c].a;
      aText.dataset.answer = `${r}-${c}`;
      aWrap.appendChild(aText);

      cell.appendChild(head);
      cell.appendChild(qWrap);
      cell.appendChild(aWrap);
      gridContainer.appendChild(cell);
    }
  }
}

function updateStateFromConfig() {
  state.title = titleInput.value.trim();
  state.language = languageInput.value;
  state.rows = clampSize(rowsInput.value);
  state.cols = clampSize(colsInput.value);
  rowsInput.value = state.rows;
  colsInput.value = state.cols;
  state.categories = Array.from(categoriesContainer.querySelectorAll('[data-category]')).map((input, idx) =>
    input.value.trim() || `Category ${idx + 1}`
  );
  ensureGridState();
}

function updateGridStateFromInputs() {
  gridContainer.querySelectorAll('[data-question]').forEach((input) => {
    const [r, c] = input.dataset.question.split('-').map(Number);
    state.grid[r][c].q = input.value;
  });
  gridContainer.querySelectorAll('[data-answer]').forEach((input) => {
    const [r, c] = input.dataset.answer.split('-').map(Number);
    state.grid[r][c].a = input.value;
  });
}

function buildPayload() {
  const pointsScheme = generatePointsScheme(state.rows);
  return {
    pk: 'BOARD#<chosen by backend>',
    sk: 'META',
    title: state.title,
    language: state.language,
    categories: state.categories.map((name) => ({ name })),
    points_scheme: pointsScheme,
    version: 1,
    grid: state.grid.map((row, r) =>
      row.map((cell) => ({ points: pointsScheme[r], q: cell.q, a: cell.a }))
    ),
  };
}

function updatePreview() {
  const payload = buildPayload();
  jsonOutput.value = JSON.stringify(payload, null, 2);
}

function handleDownload() {
  const payload = buildPayload();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${(state.title || 'board').toLowerCase().replace(/\s+/g, '-')}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function handleCopy() {
  navigator.clipboard?.writeText(jsonOutput.value);
}

function goToGrid() {
  updateStateFromConfig();
  renderGrid();
  showScreen('grid');
}

function goToPreview() {
  updateGridStateFromInputs();
  updatePreview();
  showScreen('preview');
}

function initCategories() {
  createCategoryInputs(state.cols);
}

function bindEvents() {
  startCreateBtns.forEach((btn) => btn?.addEventListener('click', () => showScreen('config')));
  document.getElementById('browse-btn')?.addEventListener('click', () => {});
  document.getElementById('browse-landing')?.addEventListener('click', () => {});

  navButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      showScreen(btn.dataset.nav);
    });
  });

  rowsInput.addEventListener('change', () => {
    state.rows = clampSize(rowsInput.value);
    rowsInput.value = state.rows;
    ensureGridState();
  });

  colsInput.addEventListener('change', () => {
    state.cols = clampSize(colsInput.value);
    colsInput.value = state.cols;
    createCategoryInputs(state.cols);
  });

  categoriesContainer.addEventListener('input', () => {
    state.categories = Array.from(categoriesContainer.querySelectorAll('[data-category]')).map((input) => input.value);
  });

  gridContainer.addEventListener('input', () => {
    updateGridStateFromInputs();
  });

  toGridBtn.addEventListener('click', goToGrid);
  toPreviewBtn.addEventListener('click', goToPreview);
  downloadBtn.addEventListener('click', handleDownload);
  copyJsonBtn.addEventListener('click', handleCopy);
}

function init() {
  initCategories();
  ensureGridState();
  bindEvents();
}

init();
