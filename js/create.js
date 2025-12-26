const screens = {
  config: document.getElementById('config-screen'),
  grid: document.getElementById('grid-screen'),
};

const navButtons = document.querySelectorAll('main [data-nav]');
const rowsInput = document.getElementById('rows');
const colsInput = document.getElementById('columns');
const titleInput = document.getElementById('title');
const ownerInput = document.getElementById('owner');
const languageInput = document.getElementById('language');
const vibeInput = document.getElementById('vibe');
const categoriesContainer = document.getElementById('categories-container');
const gridContainer = document.getElementById('grid-container');
const gridCategoryRow = document.getElementById('grid-category-row');
const toGridBtn = document.getElementById('to-grid');
const publishBtn = document.getElementById('publish-board');
const configError = document.getElementById('config-error');
const gridError = document.getElementById('grid-error');
const gridStatus = document.getElementById('grid-status');
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
  ownerInput &&
  languageInput &&
  vibeInput &&
  categoriesContainer &&
  gridContainer &&
  gridCategoryRow &&
  toGridBtn &&
  publishBtn &&
  configError &&
  gridError &&
  gridStatus &&
  modal &&
  modalTitle &&
  modalCategory &&
  modalQuestion &&
  modalAnswer
) {
  let activeCell = null;

  const state = {
    title: '',
    owner: '',
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

  function generatePointsScheme(rows) {
    return Array.from({ length: rows }, (_, idx) => (idx + 1) * 100);
  }

  function summarizeText(text) {
    const clean = text.trim();
    if (!clean) return '';
    return clean.length > 80 ? `${clean.slice(0, 77)}…` : clean;
  }

  function showScreen(key) {
    if (!screens[key]) return;
    Object.entries(screens).forEach(([name, el]) => {
      el.classList.toggle('active', name === key);
    });
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
    state.owner = ownerInput.value.trim();
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
    const owner = ownerInput.value.trim();
    const rows = clampSize(rowsInput.value);
    const cols = clampSize(colsInput.value);
    const vibe = vibeInput.value;
    const categoryInputs = categoriesContainer.querySelectorAll('[data-category]');
    const categoryNames = Array.from(categoryInputs).map((input) => input.value.trim());
    const filledCategories = categoryInputs.length === cols && categoryNames.every((name) => name.length > 0);
    const hasDuplicates = hasDuplicateCategories(categoryNames);

    return Boolean(title && owner && rows && cols && filledCategories && !hasDuplicates && vibe);
  }

  function syncConfigValidity() {
    const title = titleInput.value.trim();
    const owner = ownerInput.value.trim();
    const rows = clampSize(rowsInput.value);
    const cols = clampSize(colsInput.value);
    const vibe = vibeInput.value;
    const categoryInputs = categoriesContainer.querySelectorAll('[data-category]');
    const categoryNames = Array.from(categoryInputs).map((input) => input.value.trim());
    const filledCategories = categoryInputs.length === cols && categoryNames.every((name) => name.length > 0);
    const hasDuplicates = hasDuplicateCategories(categoryNames);

    let message = '';
    if (!title || !owner || !rows || !cols || !filledCategories || !vibe) {
      message = 'Please complete the title, owner name, grid size, vibe, and every category before continuing.';
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
    publishBtn.disabled = !complete;
    gridError.textContent = complete ? '' : 'Fill every question and answer before publishing.';
  }

  function buildPayload() {
    const pointsScheme = generatePointsScheme(state.rows);
    const categories = state.categories.map((name, idx) => {
      const slug = createCategorySlug(name) || createCategorySlug(`category-${idx + 1}`);
      return { name, slug };
    });
    const ownerSlug = state.owner
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .replace(/_{2,}/g, '_')
      || 'user';
    const ownerId = `OWNER#${ownerSlug}`;

    return {
      owner_id: ownerId,
      intent: state.intent,
      created_using: 'manual',
      title: `${state.cols}x${state.rows} Trivia Board`,
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

  function setGridStatus(message, isError = false) {
    if (!gridStatus) return;
    gridStatus.textContent = message;
    gridStatus.classList.toggle('error', Boolean(isError));
  }

  function goToGrid() {
    if (!isConfigComplete()) {
      syncConfigValidity();
      return;
    }
    updateStateFromConfig();
    renderGrid();
    showScreen('grid');
    setGridStatus('');
    gridError.textContent = '';
    syncGridValidity();
  }

  async function publishBoard() {
    if (!isGridComplete()) {
      syncGridValidity();
      return;
    }

    updateStateFromConfig();
    const payload = buildPayload();
    publishBtn.disabled = true;
    setGridStatus('Publishing board…');
    gridError.textContent = '';

    try {
	const res = await fetch(API_ENDPOINT, {
	  method: 'POST',
	  body: JSON.stringify(payload),
	});

      if (!res.ok) throw new Error('Failed to publish board');
      window.location.href = 'board-published.html';
    } catch (error) {
      console.error(error);
      gridError.textContent = 'Unable to publish board right now. Please try again.';
      setGridStatus('');
    } finally {
      publishBtn.disabled = false;
    }
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

    [titleInput, ownerInput, languageInput, vibeInput].forEach((input) =>
      input.addEventListener('input', syncConfigValidity)
    );

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
    publishBtn.addEventListener('click', publishBoard);
  }

  function init() {
    state.rows = clampSize(rowsInput.value);
    state.cols = clampSize(colsInput.value);
    state.owner = ownerInput.value.trim() || state.owner;
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
