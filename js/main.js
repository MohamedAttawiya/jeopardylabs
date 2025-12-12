const form = document.getElementById('board-form');
const rowsInput = document.getElementById('rows');
const colsInput = document.getElementById('columns');
const categoriesContainer = document.getElementById('categories-container');
const gridContainer = document.getElementById('grid-container');
const titleInput = document.getElementById('title');
const languageInput = document.getElementById('language');
const jsonOutput = document.getElementById('json-output');
const downloadBtn = document.getElementById('download-json');
const resetBtn = document.getElementById('reset-form');
const sampleBtn = document.getElementById('fill-sample');

const clampSize = (val) => Math.min(6, Math.max(3, Number(val) || 3));

function generatePointsScheme(rows) {
  return Array.from({ length: rows }, (_, idx) => (idx + 1) * 100);
}

function createCategoryInputs(cols) {
  categoriesContainer.innerHTML = '';
  for (let i = 0; i < cols; i += 1) {
    const wrapper = document.createElement('div');
    wrapper.className = 'field';

    const nameLabel = document.createElement('label');
    nameLabel.innerHTML = `<span>Category ${i + 1} name</span>`;
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.placeholder = `E.g. Topic ${i + 1}`;
    nameInput.dataset.categoryName = i;
    nameLabel.appendChild(nameInput);

    const slugLabel = document.createElement('label');
    slugLabel.innerHTML = `<span>Category ${i + 1} slug</span>`;
    const slugInput = document.createElement('input');
    slugInput.type = 'text';
    slugInput.placeholder = `topic-${i + 1}`;
    slugInput.dataset.categorySlug = i;
    slugLabel.appendChild(slugInput);

    wrapper.appendChild(nameLabel);
    wrapper.appendChild(slugLabel);
    categoriesContainer.appendChild(wrapper);
  }
}

function createGrid(rows, cols) {
  gridContainer.innerHTML = '';
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  headRow.appendChild(document.createElement('th')); // empty corner for points label

  for (let col = 0; col < cols; col += 1) {
    const th = document.createElement('th');
    th.textContent = `Column ${col + 1}`;
    headRow.appendChild(th);
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  const pointsScheme = generatePointsScheme(rows);

  for (let row = 0; row < rows; row += 1) {
    const tr = document.createElement('tr');
    const pointsCell = document.createElement('th');
    pointsCell.textContent = `${pointsScheme[row]} pts`;
    tr.appendChild(pointsCell);

    for (let col = 0; col < cols; col += 1) {
      const td = document.createElement('td');
      const wrapper = document.createElement('div');
      wrapper.className = 'cell-inputs';

      const qLabel = document.createElement('label');
      qLabel.innerHTML = '<span>Question</span>';
      const qInput = document.createElement('textarea');
      qInput.placeholder = `Question ${row + 1}-${col + 1}`;
      qInput.dataset.question = `${row}-${col}`;
      qLabel.appendChild(qInput);

      const aLabel = document.createElement('label');
      aLabel.innerHTML = '<span>Answer</span>';
      const aInput = document.createElement('textarea');
      aInput.placeholder = `Answer ${row + 1}-${col + 1}`;
      aInput.dataset.answer = `${row}-${col}`;
      aLabel.appendChild(aInput);

      wrapper.appendChild(qLabel);
      wrapper.appendChild(aLabel);
      td.appendChild(wrapper);
      tr.appendChild(td);
    }

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  gridContainer.appendChild(table);
}

function buildPayload() {
  const rows = clampSize(rowsInput.value);
  const cols = clampSize(colsInput.value);
  const pointsScheme = generatePointsScheme(rows);

  const categories = Array.from(categoriesContainer.querySelectorAll('[data-category-name]')).map((input, idx) => ({
    name: input.value || `Category ${idx + 1}`,
    slug: categoriesContainer.querySelector(`[data-category-slug="${idx}"]`)?.value || `category-${idx + 1}`
  }));

  const grid = [];
  for (let r = 0; r < rows; r += 1) {
    const row = [];
    for (let c = 0; c < cols; c += 1) {
      const q = gridContainer.querySelector(`[data-question="${r}-${c}"]`)?.value || '';
      const a = gridContainer.querySelector(`[data-answer="${r}-${c}"]`)?.value || '';
      row.push({ points: pointsScheme[r], q, a });
    }
    grid.push(row);
  }

  return {
    pk: 'BOARD#<chosen by backend>',
    sk: 'META',
    title: titleInput.value || '',
    language: languageInput.value,
    categories,
    points_scheme: pointsScheme,
    version: 1,
    grid,
  };
}

function updateOutput() {
  const payload = buildPayload();
  jsonOutput.value = JSON.stringify(payload, null, 2);
  downloadBtn.disabled = !titleInput.value.trim();
}

function handleResize() {
  const rows = clampSize(rowsInput.value);
  const cols = clampSize(colsInput.value);
  rowsInput.value = rows;
  colsInput.value = cols;
  createCategoryInputs(cols);
  createGrid(rows, cols);
  updateOutput();
}

function resetForm() {
  form.reset();
  rowsInput.value = 5;
  colsInput.value = 5;
  handleResize();
}

function fillSampleData() {
  const rows = clampSize(rowsInput.value);
  const cols = clampSize(colsInput.value);
  categoriesContainer.querySelectorAll('input[data-category-name]').forEach((input, idx) => {
    input.value = `Category ${idx + 1}`;
  });
  categoriesContainer.querySelectorAll('input[data-category-slug]').forEach((input, idx) => {
    input.value = `category-${idx + 1}`;
  });

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const qEl = gridContainer.querySelector(`[data-question="${r}-${c}"]`);
      const aEl = gridContainer.querySelector(`[data-answer="${r}-${c}"]`);
      if (qEl) qEl.value = `Sample question ${r + 1}-${c + 1}?`;
      if (aEl) aEl.value = `Answer ${r + 1}-${c + 1}`;
    }
  }

  titleInput.value = 'New Board';
  updateOutput();
}

function downloadJSON() {
  const payload = buildPayload();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${(titleInput.value || 'board').toLowerCase().replace(/\s+/g, '-')}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

// Event bindings
rowsInput.addEventListener('change', handleResize);
colsInput.addEventListener('change', handleResize);

categoriesContainer.addEventListener('input', updateOutput);
gridContainer.addEventListener('input', updateOutput);
form.addEventListener('input', updateOutput);

resetBtn.addEventListener('click', resetForm);
sampleBtn.addEventListener('click', fillSampleData);
downloadBtn.addEventListener('click', downloadJSON);

handleResize();
