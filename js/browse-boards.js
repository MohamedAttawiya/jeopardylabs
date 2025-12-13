const API_ENDPOINT = 'https://bnvzrbjkdg.execute-api.eu-central-1.amazonaws.com/prod/v1/boards';

const statusEl = document.getElementById('boards-status');
const gridEl = document.getElementById('boards-grid');
const paginationEl = document.getElementById('boards-pagination');

function formatDate(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function setStatus(message) {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.style.display = message ? 'block' : 'none';
}

function clearGrid() {
  if (gridEl) {
    gridEl.innerHTML = '';
  }
}

function createCategoryChips(categories) {
  const chipWrap = document.createElement('div');
  chipWrap.className = 'board-card__chips';

  if (!categories || categories.length === 0) {
    const chip = document.createElement('span');
    chip.className = 'chip muted';
    chip.textContent = 'Uncategorized';
    chipWrap.appendChild(chip);
    return chipWrap;
  }

  categories.forEach((cat) => {
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.textContent = cat.name || cat.slug || 'Category';
    chipWrap.appendChild(chip);
  });

  return chipWrap;
}

function renderBoards(items = []) {
  clearGrid();

  if (!gridEl) return;

  if (!items.length) {
    setStatus('No boards found.');
    return;
  }

  setStatus('');

  items.forEach((board) => {
    const card = document.createElement('article');
    card.className = 'board-card card';

    const header = document.createElement('div');
    header.className = 'board-card__header';

    const title = document.createElement('h3');
    title.className = 'board-card__title';
    title.textContent = board.title || board.board_id || 'Untitled Board';

    const statusBadge = document.createElement('span');
    statusBadge.className = `chip subtle ${board.status ? `status-${board.status}` : ''}`.trim();
    statusBadge.textContent = board.status ? board.status : 'status';

    header.appendChild(title);
    header.appendChild(statusBadge);

    const chips = createCategoryChips(board.categories || []);

    const metaList = document.createElement('dl');
    metaList.className = 'board-card__meta';

    const pairs = [
      ['Questions', board.questions_per_category ? `${board.questions_per_category} per category` : '—'],
      [
        'Score range',
        board.lowest_score != null && board.highest_score != null
          ? `${board.lowest_score}–${board.highest_score} pts`
          : '—',
      ],
      ['Owner', board.owner_id ? board.owner_id.replace(/^OWNER#/, '') : 'by user'],
      ['Updated', formatDate(board.updated_at)],
    ];

    pairs.forEach(([label, value]) => {
      const dt = document.createElement('dt');
      dt.textContent = label;
      const dd = document.createElement('dd');
      dd.textContent = value || '—';
      metaList.append(dt, dd);
    });

    card.append(header, chips, metaList);
    gridEl.appendChild(card);
  });
}

function renderPagination(page, pageCount, hasPrev, hasNext) {
  if (!paginationEl) return;

  paginationEl.innerHTML = '';

  const prevBtn = document.createElement('button');
  prevBtn.className = 'btn ghost';
  prevBtn.textContent = 'Previous';
  prevBtn.disabled = !hasPrev;
  prevBtn.addEventListener('click', () => {
    if (hasPrev) loadBoards(page - 1);
  });

  const summary = document.createElement('span');
  summary.className = 'boards-pagination__summary';
  summary.textContent = `Page ${page} of ${pageCount || 1}`;

  const nextBtn = document.createElement('button');
  nextBtn.className = 'btn ghost';
  nextBtn.textContent = 'Next';
  nextBtn.disabled = !hasNext;
  nextBtn.addEventListener('click', () => {
    if (hasNext) loadBoards(page + 1);
  });

  paginationEl.append(prevBtn, summary, nextBtn);
}

function updateUrl(page) {
  const url = new URL(window.location);
  url.searchParams.set('page', page);
  window.history.replaceState({}, '', url);
}

async function loadBoards(page = 1) {
  if (!gridEl || !statusEl) return;

  setStatus('Loading boards…');
  clearGrid();
  if (paginationEl) paginationEl.innerHTML = '';

  try {
    const res = await fetch(`${API_ENDPOINT}?page=${page}`);
    if (!res.ok) throw new Error('Failed to fetch boards');
    const data = await res.json();

    renderBoards(data.items || []);
    renderPagination(data.page || page, data.page_count || 1, Boolean(data.has_prev), Boolean(data.has_next));
    updateUrl(data.page || page);
  } catch (error) {
    console.error(error);
    setStatus('Unable to load boards right now. Please try again later.');
  }
}

function initBoardsPage() {
  const params = new URLSearchParams(window.location.search);
  const initialPage = Math.max(parseInt(params.get('page'), 10) || 1, 1);
  loadBoards(initialPage);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initBoardsPage);
} else {
  initBoardsPage();
}
