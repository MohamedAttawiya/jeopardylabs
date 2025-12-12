const screens = {
  config: document.getElementById('config-screen'),
  grid: document.getElementById('grid-screen'),
  preview: document.getElementById('preview-screen'),
};

const navButtons = document.querySelectorAll('[data-nav]');
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
const configError = document.getElementById('config-error');
const modal = document.getElementById('cell-modal');
const modalTitle = document.getElementById('modal-title');
const modalCategory = document.getElementById('modal-category');
const modalQuestion = document.getElementById('modal-question');
const modalAnswer = document.getElementById('modal-answer');
const modalSave = document.getElementById('modal-save');

if (screens.config && rowsInput && colsInput) {
  let previewTimer = null;
  let countdownInterval = null;
  let activeCell = null;

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
      window.location.href = 'index.html';
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
      nameInput.required = true;
      nameLabel.appendChild(nameInput);

      wrapper.appendChild(nameLabel);
      categoriesContainer.appendChild(wrapper);
    }
  }

  function renderGrid() {
    ensureGridState();
    gridContainer.innerHTML = '';
    const pointsScheme = generatePointsScheme(state.rows);

    gridContainer.style.gridTemplateColumns = `repeat(${state.cols}, minmax(260px, 1fr))`;

    for (let r = 0; r < state.rows; r += 1) {
      for (let c = 0; c < state.cols; c += 1) {
        const cell = document.createElement('div');
        cell.className = 'cell-card';

        const head = document.createElement('div');
        head.className = 'cell-head';
        const catName = state.categories[c] || `Category ${c + 1}`;
        head.innerHTML = `<span class="category">${catName}</span><span class="points">${pointsScheme[r]} pts</span>`;

        const body = document.createElement('div');
        body.className = 'cell-body';

        const openBtn = document.createElement('button');
        openBtn.type = 'button';
        openBtn.className = 'accent cell-open';
        openBtn.dataset.cellOpen = `${r}-${c}`;
        openBtn.textContent = `${pointsScheme[r]} points`;

        const status = document.createElement('p');
        const hasQuestion = Boolean(state.grid[r][c].q);
        const hasAnswer = Boolean(state.grid[r][c].a);
        status.className = `cell-status ${hasQuestion && hasAnswer ? 'filled' : ''}`;
        status.textContent = hasQuestion || hasAnswer
          ? (hasQuestion && hasAnswer ? 'Question and answer saved' : 'Incomplete entry')
          : 'Click to add a question and answer';

        body.appendChild(openBtn);
        body.appendChild(status);

        cell.appendChild(head);
        cell.appendChild(body);
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

  function isConfigComplete() {
    const title = titleInput.value.trim();
    const rows = clampSize(rowsInput.value);
    const cols = clampSize(colsInput.value);
    const categoryInputs = categoriesContainer.querySelectorAll('[data-category]');
    const filledCategories =
      categoryInputs.length === cols && Array.from(categoryInputs).every((input) => input.value.trim().length > 0);

    return Boolean(title && rows && cols && filledCategories);
  }

  function syncConfigValidity() {
    const valid = isConfigComplete();
    toGridBtn.disabled = !valid;
    if (!valid) {
      configError.textContent = 'Please complete the title, grid size, and every category before continuing.';
    } else {
      configError.textContent = '';
    }
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
    if (!isConfigComplete()) {
      syncConfigValidity();
      return;
    }
    updateStateFromConfig();
    renderGrid();
    showScreen('grid');
  }

  function goToPreview() {
    updatePreview();
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
    closeModal();
  }

  function initCategories() {
    createCategoryInputs(state.cols);
  }

  function bindEvents() {
    navButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        showScreen(btn.dataset.nav);
      });
    });

    rowsInput.addEventListener('change', () => {
      state.rows = clampSize(rowsInput.value);
      rowsInput.value = state.rows;
      ensureGridState();
      syncConfigValidity();
    });

    colsInput.addEventListener('change', () => {
      state.cols = clampSize(colsInput.value);
      colsInput.value = state.cols;
      createCategoryInputs(state.cols);
      syncConfigValidity();
    });

    [titleInput, languageInput].forEach((input) => input.addEventListener('input', syncConfigValidity));

    categoriesContainer.addEventListener('input', () => {
      state.categories = Array.from(categoriesContainer.querySelectorAll('[data-category]')).map((input) => input.value);
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
    initCategories();
    ensureGridState();
    syncConfigValidity();
    bindEvents();
  }

  init();
}
