const LOCAL_STORAGE_KEY = 'ahwa_create_config';
const API_ENDPOINT = 'https://bnvzrbjkdg.execute-api.eu-central-1.amazonaws.com/prod/v1/boards';

const aiInput = document.getElementById('ai-json-input');
const validateBtn = document.getElementById('validate-json');
const publishBtn = document.getElementById('publish-ai');
const errorEl = document.getElementById('ai-error');
const statusEl = document.getElementById('ai-status');
const previewPanel = document.getElementById('ai-preview');
const previewTitle = document.getElementById('preview-title');
const previewCategories = document.getElementById('preview-categories');
const previewPoints = document.getElementById('preview-points');
const previewSize = document.getElementById('preview-size');
const previewLanguage = document.getElementById('preview-language');
const previewIntent = document.getElementById('preview-intent');
const configSummary = document.getElementById('config-summary');
const configMissing = document.getElementById('config-missing');

let createConfig = null;
let lastValidPayload = null;

function loadConfig() {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch (error) {
    console.warn('Unable to read stored config', error);
    return null;
  }
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

function showError(message) {
  errorEl.textContent = message || '';
  statusEl.textContent = '';
  previewPanel.style.display = 'none';
  publishBtn.disabled = true;
}

function showStatus(message) {
  statusEl.textContent = message || '';
}

function renderConfigSummary() {
  if (!createConfig) {
    configSummary.textContent = '';
    configMissing.textContent = 'Missing setup details. Go back to Step 1 and choose "Use AI" to save your config.';
    aiInput.disabled = true;
    validateBtn.disabled = true;
    publishBtn.disabled = true;
    return;
  }

  const { title, language, intent, rows, cols, categories } = createConfig;
  const catList = categories?.filter(Boolean).join(', ');
  configSummary.textContent = `Title: ${title || 'Untitled'} · Language: ${language} · Vibe: ${intent} · Categories (${cols}): ${catList} · Questions per category: ${rows}`;
  configMissing.textContent = '';
}

function validatePayloadText() {
  if (!createConfig) {
    showError('Missing setup details. Go back to Step 1 and pick "Use AI" to continue.');
    return null;
  }

  const raw = aiInput.value.trim();
  if (!raw) {
    showError('Paste the ChatGPT JSON response first.');
    return null;
  }

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch (error) {
    showError(`Invalid JSON: ${error.message}`);
    return null;
  }

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    showError('The JSON must be an object.');
    return null;
  }

  const requiredKeys = [
    'owner_id',
    'intent',
    'created_using',
    'title',
    'status',
    'language',
    'version',
    'categories',
    'points_scheme',
    'grid',
  ];

  for (const key of requiredKeys) {
    if (!(key in payload)) {
      showError(`Missing required key: ${key}`);
      return null;
    }
  }

  if (payload.created_using !== 'ai') {
    showError('created_using must be "ai".');
    return null;
  }

  const rows = Number(createConfig.rows);
  const cols = Number(createConfig.cols);

  if (!Array.isArray(payload.categories)) {
    showError('categories must be an array.');
    return null;
  }

  if (payload.categories.length !== cols) {
    showError(`Expected ${cols} categories, got ${payload.categories.length}.`);
    return null;
  }

  payload.categories = payload.categories.map((cat, idx) => {
    if (!cat || typeof cat !== 'object') {
      throw new Error(`Category ${idx + 1} is invalid.`);
    }
    if (!cat.name || typeof cat.name !== 'string' || !cat.name.trim()) {
      throw new Error(`Category ${idx + 1} is missing a name.`);
    }
    const slug = cat.slug && typeof cat.slug === 'string' && cat.slug.trim()
      ? cat.slug.trim()
      : createCategorySlug(cat.name) || createCategorySlug(`category-${idx + 1}`);
    return { ...cat, slug };
  });

  if (!Array.isArray(payload.points_scheme)) {
    showError('points_scheme must be an array.');
    return null;
  }

  if (payload.points_scheme.length !== rows) {
    showError(`points_scheme must have ${rows} entries.`);
    return null;
  }

  if (!Array.isArray(payload.grid)) {
    showError('grid must be an array.');
    return null;
  }

  if (payload.grid.length !== rows) {
    showError(`Grid has ${payload.grid.length} rows, expected ${rows}.`);
    return null;
  }

  for (let r = 0; r < rows; r += 1) {
    const expectedPoints = payload.points_scheme[r];
    const row = payload.grid[r];
    if (!Array.isArray(row)) {
      showError(`Row ${r + 1} must be an array.`);
      return null;
    }
    if (row.length !== cols) {
      showError(`Row ${r + 1} has ${row.length} cells, expected ${cols}.`);
      return null;
    }
    for (let c = 0; c < cols; c += 1) {
      const cell = row[c];
      if (!cell || typeof cell !== 'object') {
        showError(`Row ${r + 1} Col ${c + 1} is invalid.`);
        return null;
      }
      if (cell.points !== expectedPoints) {
        showError(`Row ${r + 1} Col ${c + 1} points must be ${expectedPoints}.`);
        return null;
      }
      if (!cell.q || typeof cell.q !== 'string' || !cell.q.trim()) {
        showError(`Row ${r + 1} Col ${c + 1} is missing a question.`);
        return null;
      }
      if (!cell.a || typeof cell.a !== 'string' || !cell.a.trim()) {
        showError(`Row ${r + 1} Col ${c + 1} is missing an answer.`);
        return null;
      }
    }
  }

  lastValidPayload = {
    ...payload,
    categories: payload.categories,
  };
  return lastValidPayload;
}

function renderPreview(payload) {
  if (!payload) return;
  previewPanel.style.display = 'block';
  previewTitle.textContent = payload.title || 'Untitled board';
  previewCategories.textContent = payload.categories.map((cat) => cat.name).join(', ');
  const minPoints = Math.min(...payload.points_scheme);
  const maxPoints = Math.max(...payload.points_scheme);
  previewPoints.textContent = `${payload.points_scheme.length} rows: ${minPoints} → ${maxPoints}`;
  previewSize.textContent = `${createConfig.cols} categories × ${createConfig.rows} questions`;
  previewLanguage.textContent = payload.language;
  previewIntent.textContent = payload.intent;
}

async function publishPayload() {
  if (!lastValidPayload) {
    showError('Validate the JSON before publishing.');
    return;
  }

  publishBtn.disabled = true;
  showStatus('Publishing board…');
  errorEl.textContent = '';

  try {
    const res = await fetch(API_ENDPOINT, {
      method: 'POST',
      body: JSON.stringify(lastValidPayload),
    });
    if (!res.ok) throw new Error('Failed to publish board');
    let boardId = '';
    try {
      const data = await res.json();
      boardId = data?.board_id || '';
    } catch (error) {
      boardId = '';
    }
    const destination = boardId
      ? `board-published.html?board_id=${encodeURIComponent(boardId)}`
      : 'board-published.html';
    window.location.href = destination;
  } catch (error) {
    console.error(error);
    showError('Unable to publish board right now. Please try again.');
    showStatus('');
  } finally {
    publishBtn.disabled = false;
  }
}

function handleValidate() {
  try {
    const payload = validatePayloadText();
    if (payload) {
      errorEl.textContent = '';
      showStatus('JSON looks valid.');
      publishBtn.disabled = false;
      renderPreview(payload);
    } else {
      previewPanel.style.display = 'none';
      publishBtn.disabled = true;
    }
  } catch (error) {
    showError(error.message);
  }
}

function init() {
  createConfig = loadConfig();
  renderConfigSummary();

  aiInput?.addEventListener('input', () => {
    errorEl.textContent = '';
    statusEl.textContent = '';
    previewPanel.style.display = 'none';
    publishBtn.disabled = true;
  });

  validateBtn?.addEventListener('click', handleValidate);
  publishBtn?.addEventListener('click', publishPayload);
}

init();
