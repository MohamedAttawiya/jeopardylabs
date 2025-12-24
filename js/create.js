const screens = {
  config: document.getElementById('config-screen'),
  grid: document.getElementById('grid-screen'),
  preview: document.getElementById('preview-screen'),
};

const navButtons = document.querySelectorAll('main [data-nav]');
const rowsInput = document.getElementById('rows');
const colsInput = document.getElementById('columns');
const titleInput = document.getElementById('title');
const languageInput = document.getElementById('language');
const vibeInput = document.getElementById('vibe');
const categoriesContainer = document.getElementById('categories-container');
const gridContainer = document.getElementById('grid-container');
const gridCategoryRow = document.getElementById('grid-category-row');
const toGridBtn = document.getElementById('to-grid');
const toPreviewBtn = document.getElementById('to-preview');
const jsonOutput = document.getElementById('json-output');
const curlOutput = document.getElementById('curl-output');
const timerNote = document.getElementById('timer-note');
const apiStatus = document.getElementById('api-status');
const copyJsonBtn = document.getElementById('copy-json');
const downloadBtn = document.getElementById('download-json');
const configError = document.getElementById('config-error');
const gridError = document.getElementById('grid-error');
const modal = document.getElementById('cell-modal');
const modalTitle = document.getElementById('modal-title');
const modalCategory = document.getElementById('modal-category');
const modalQuestion = document.getElementById('modal-question');
const modalAnswer = document.getElementById('modal-answer');
const modalSave = document.getElementById('modal-save');

const API_ENDPOINT = 'https://bnvzrbjkdg.execute-api.eu-central-1.amazonaws.com/prod/v1/boards';

if (
  screens.config &&
  rowsInput &&
  colsInput &&
  titleInput &&
  languageInput &&
  vibeInput &&
  categoriesContainer &&
  gridContainer &&
  gridCategoryRow &&
  toGridBtn &&
  toPreviewBtn &&
  jsonOutput &&
  curlOutput &&
  timerNote &&
  copyJsonBtn &&
  downloadBtn &&
  configError &&
  gridError &&
  modal &&
  modalTitle &&
  modalCategory &&
  modalQuestion &&
  modalAnswer
) {
  let previewTimer = null;
  let countdownInterval = null;
  let activeCell = null;
  let lastPayload = null;

  const state = {
    title: '',
    language: 'en',
    intent: 'trivia_mix',
    rows: 5,
    cols: 5,
    categories: [],
    grid: [],
  };

  const clampSize = (val) => Math.min(5, Math.max(3, Number(val) || 3));

  function hasDuplicateCategories(names) {
    const normalized = names.map((name) => name.trim().toLowerCase()).filter(Boolean);
    return new Set(normalized).size !== normalized.length;
  }

  function createCategorySlug(name = '') {
    return name
      .trim()
      .toLowerCase()
      .replace(/&/g, '')
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-{2,}/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  function generateBoardId() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let suffix = '';
    for (let i = 0; i < 4; i += 1) {
      suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    return `BRD-${y}${m}${d}-${suffix}`;
  }

  function generatePointsScheme(rows) {
    return Array.from({ length: rows }, (_, idx) => (idx + 1) * 100);
  }

  function summarizeText(text) {
    const clean = text.trim();
    if (!clean) return '';
    return clean.length > 80 ? `${clean.slice(0, 77)}…` : clean;
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
    if (!screens[key]) return;
    resetTimers();
    if (key !== 'preview') setApiStatus('');
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
      window.location.href = 'index.html';
    }, 10000);
  }

  function ensureCategoryState() {
    state.categories = Array.from({ length: state.cols }, (_, i) => state.categories?.[i] ?? '');
  }

  function ensureGridState() {
    const rows = clampSize(state.rows);
    const cols = clampSize(state.cols);
    ensureCategoryState();
    state.grid = Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (_, c) => state.grid?.[r]?.[c] || { q: '', a: '' })
    );
  }

  function createCategoryInputs(cols) {
    ensureCategoryState();
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
      nameInput.required = true;
      nameLabel.appendChild(nameInput);

      wrapper.appendChild(nameLabel);
      categoriesContainer.appendChild(wrapper);
    }
  }

  function renderGrid() {
    ensureGridState();
    gridContainer.innerHTML = '';
    gridCategoryRow.innerHTML = '';
    const pointsScheme = generatePointsScheme(state.rows);

    const columnTemplate = `repeat(${state.cols}, minmax(150px, 1fr))`;
    gridContainer.style.gridTemplateColumns = columnTemplate;
    gridCategoryRow.style.gridTemplateColumns = columnTemplate;

    state.categories.forEach((catName, idx) => {
      const chip = document.createElement('div');
      chip.className = 'category-chip';
      chip.textContent = catName || `Category ${idx + 1}`;
      gridCategoryRow.appendChild(chip);
    });

    for (let r = 0; r < state.rows; r += 1) {
      for (let c = 0; c < state.cols; c += 1) {
        const cell = document.createElement('div');
        const hasQuestion = Boolean(state.grid[r][c].q);
        const hasAnswer = Boolean(state.grid[r][c].a);
        const isFilled = hasQuestion && hasAnswer;
        cell.className = `cell-card ${isFilled ? 'filled' : ''}`.trim();

        const openBtn = document.createElement('button');
        openBtn.type = 'button';
        openBtn.className = `cell-trigger ${isFilled ? 'filled' : 'empty'}`;
        openBtn.dataset.cellOpen = `${r}-${c}`;
        openBtn.textContent = `${pointsScheme[r]} pts`;

        const preview = document.createElement('div');
        preview.className = 'cell-preview';

        const qLine = document.createElement('p');
        qLine.className = 'cell-line';
        const qLabel = document.createElement('span');
        qLabel.className = 'label';
        qLabel.textContent = 'Q';
        const qText = document.createElement('span');
        const qSummary = summarizeText(state.grid[r][c].q);
        qText.textContent = qSummary || 'Add question';
        if (!qSummary) qText.classList.add('empty');
        qLine.appendChild(qLabel);
        qLine.appendChild(qText);

        const aLine = document.createElement('p');
        aLine.className = 'cell-line';
        const aLabel = document.createElement('span');
        aLabel.className = 'label';
        aLabel.textContent = 'A';
        const aText = document.createElement('span');
        const aSummary = summarizeText(state.grid[r][c].a);
        aText.textContent = aSummary || 'Add answer';
        if (!aSummary) aText.classList.add('empty');
        aLine.appendChild(aLabel);
        aLine.appendChild(aText);

        preview.appendChild(qLine);
        preview.appendChild(aLine);

        cell.appendChild(openBtn);
        cell.appendChild(preview);
        gridContainer.appendChild(cell);
      }
    }
  }

  function updateStateFromConfig() {
    state.title = titleInput.value.trim();
    state.language = languageInput.value;
    state.intent = vibeInput.value;
    state.rows = clampSize(rowsInput.value);
    state.cols = clampSize(colsInput.value);
    rowsInput.value = state.rows;
    colsInput.value = state.cols;
    state.categories = Array.from(categoriesContainer.querySelectorAll('[data-category]')).map((input) =>
      input.value.trim()
    );
    ensureCategoryState();
    ensureGridState();
  }

  function isConfigComplete() {
    const title = titleInput.value.trim();
    const rows = clampSize(rowsInput.value);
    const cols = clampSize(colsInput.value);
    const vibe = vibeInput.value;
    const categoryInputs = categoriesContainer.querySelectorAll('[data-category]');
    const categoryNames = Array.from(categoryInputs).map((input) => input.value.trim());
    const filledCategories = categoryInputs.length === cols && categoryNames.every((name) => name.length > 0);
    const hasDuplicates = hasDuplicateCategories(categoryNames);

    return Boolean(title && rows && cols && filledCategories && !hasDuplicates && vibe);
  }

  function syncConfigValidity() {
    const title = titleInput.value.trim();
    const rows = clampSize(rowsInput.value);
    const cols = clampSize(colsInput.value);
    const vibe = vibeInput.value;
    const categoryInputs = categoriesContainer.querySelectorAll('[data-category]');
    const categoryNames = Array.from(categoryInputs).map((input) => input.value.trim());
    const filledCategories = categoryInputs.length === cols && categoryNames.every((name) => name.length > 0);
    const hasDuplicates = hasDuplicateCategories(categoryNames);

    let message = '';
    if (!title || !rows || !cols || !filledCategories || !vibe) {
      message = 'Please complete the title, grid size, vibe, and every category before continuing.';
    } else if (hasDuplicates) {
      message = 'Category names must be unique.';
    }

    toGridBtn.disabled = Boolean(message);
    configError.textContent = message;
  }

  function isGridComplete() {
    return state.grid.every((row) => row.every((cell) => cell.q.trim() && cell.a.trim()));
  }

  function syncGridValidity() {
    const complete = isGridComplete();
    toPreviewBtn.disabled = !complete;
    gridError.textContent = complete ? '' : 'Fill every question and answer before moving on.';
  }

  function buildPayload() {
    const pointsScheme = generatePointsScheme(state.rows);
    const categories = state.categories.map((name, idx) => {
      const slug = createCategorySlug(name) || createCategorySlug(`category-${idx + 1}`);
      return { name, slug };
    });

    return {
      board_id: generateBoardId(),
      owner_id: 'OWNER#eg_user_0001',
      intent: state.intent,
      created_using: 'manual',
      title: state.title || `${state.cols}x${state.rows} Trivia Board`,
      status: 'draft',
      language: state.language || 'en',
      version: 1,
      categories,
      points_scheme: pointsScheme,
      grid: state.grid.map((row, r) =>
        row.map((cell) => ({ points: pointsScheme[r], q: cell.q, a: cell.a }))
      ),
    };
  }

  function buildCurlCommand(payload) {
    const body = JSON.stringify(payload);
    const escapedBody = body.replace(/'/g, "'\\''");
    return `curl -X POST '${API_ENDPOINT}' -H 'Content-Type: application/json' -d '${escapedBody}'`;
  }

  function updatePreview(payload = null) {
    const data = payload || buildPayload();
    lastPayload = data;
    jsonOutput.value = JSON.stringify(data, null, 2);
    curlOutput.value = buildCurlCommand(data);
  }

  function handleDownload() {
    const payload = lastPayload || buildPayload();
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

  function setApiStatus(message, isError = false) {
    if (!apiStatus) return;
    apiStatus.textContent = message;
    apiStatus.classList.toggle('error', Boolean(isError));
  }

  async function submitBoard(payload) {
    if (!payload) return;
    setApiStatus(payload ? 'Saving board…' : '');
    try {
      const res = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to save board');
      setApiStatus('Board saved successfully!');
    } catch (error) {
      console.error(error);
      setApiStatus('Unable to save board right now. Please try again.', true);
    }
  }

  function goToGrid() {
    if (!isConfigComplete()) {
      syncConfigValidity();
      return;
    }
    updateStateFromConfig();
    renderGrid();
    showScreen('grid');
    syncGridValidity();
  }

  async function goToPreview() {
    if (!isGridComplete()) {
      syncGridValidity();
      return;
    }
    updateStateFromConfig();
    const payload = buildPayload();
    updatePreview(payload);
    toPreviewBtn.disabled = true;
    try {
      await submitBoard(payload);
    } finally {
      toPreviewBtn.disabled = false;
    }
    showScreen('preview');
  }

  function closeModal() {
    modal.classList.remove('open');
    activeCell = null;
  }

  function openModal(r, c) {
    activeCell = { r, c };
    const points = generatePointsScheme(state.rows)[r];
    const catName = state.categories[c] || `Category ${c + 1}`;
    modalTitle.textContent = `${points} points`;
    modalCategory.textContent = catName;
    modalQuestion.value = state.grid[r][c].q || '';
    modalAnswer.value = state.grid[r][c].a || '';
    modal.classList.add('open');
    modalQuestion.focus();
  }

  function saveModalEntry() {
    if (!activeCell) return;
    const { r, c } = activeCell;
    state.grid[r][c].q = modalQuestion.value.trim();
    state.grid[r][c].a = modalAnswer.value.trim();
    renderGrid();
    syncGridValidity();
    closeModal();
  }

  function initCategories() {
    createCategoryInputs(state.cols);
  }

  function bindEvents() {
    navButtons.forEach((btn) => {
      btn.addEventListener('click', (event) => {
        const targetScreen = btn.dataset.nav;
        if (!screens[targetScreen]) return;
        event.preventDefault();
        showScreen(targetScreen);
      });
    });

    rowsInput.addEventListener('change', () => {
      state.rows = clampSize(rowsInput.value);
      rowsInput.value = state.rows;
      ensureGridState();
      if (screens.grid.classList.contains('active')) {
        renderGrid();
        syncGridValidity();
      }
      syncConfigValidity();
    });

    colsInput.addEventListener('change', () => {
      state.cols = clampSize(colsInput.value);
      colsInput.value = state.cols;
      createCategoryInputs(state.cols);
      ensureGridState();
      if (screens.grid.classList.contains('active')) {
        renderGrid();
        syncGridValidity();
      }
      syncConfigValidity();
    });

    [titleInput, languageInput, vibeInput].forEach((input) => input.addEventListener('input', syncConfigValidity));

    categoriesContainer.addEventListener('input', () => {
      state.categories = Array.from(categoriesContainer.querySelectorAll('[data-category]')).map((input) => input.value);
      ensureCategoryState();
      if (screens.grid.classList.contains('active')) {
        renderGrid();
      }
      syncConfigValidity();
    });

    gridContainer.addEventListener('click', (event) => {
      const trigger = event.target.closest('[data-cell-open]');
      if (trigger) {
        const [r, c] = trigger.dataset.cellOpen.split('-').map(Number);
        openModal(r, c);
      }
    });

    modalSave?.addEventListener('click', saveModalEntry);

    modal?.addEventListener('click', (event) => {
      if (event.target.dataset.closeModal !== undefined || event.target === modal) {
        closeModal();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && modal.classList.contains('open')) {
        closeModal();
      }
    });

    toGridBtn.addEventListener('click', goToGrid);
    toPreviewBtn.addEventListener('click', goToPreview);
    downloadBtn.addEventListener('click', handleDownload);
    copyJsonBtn.addEventListener('click', handleCopy);
  }

  function init() {
    state.rows = clampSize(rowsInput.value);
    state.cols = clampSize(colsInput.value);
    state.language = languageInput.value || state.language;
    state.intent = vibeInput.value || state.intent;
    ensureCategoryState();
    initCategories();
    ensureGridState();
    syncConfigValidity();
    syncGridValidity();
    bindEvents();
  }

  init();
}
