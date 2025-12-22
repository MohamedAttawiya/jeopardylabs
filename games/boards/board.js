(() => {
  const helpers = window.boardDataHelpers || {};
  const {
    safeParseJsonFromScriptTag,
    assertBoardShape,
    normalizeBoard,
    DEMO_BOARD,
  } = helpers;

  if (!safeParseJsonFromScriptTag || !assertBoardShape || !normalizeBoard) {
    console.warn('Board helpers missing; cannot initialize board.');
    return;
  }

  const elements = {
    grid: document.getElementById('board-grid'),
    status: document.getElementById('board-status'),
    title: document.getElementById('board-title'),
    subtitle: document.getElementById('board-subtitle'),
    modal: document.getElementById('board-modal'),
    modalCategory: document.getElementById('modal-category'),
    modalHeading: document.getElementById('modal-heading'),
    modalValue: document.getElementById('modal-value'),
    modalPhase: document.getElementById('modal-phase'),
    modalQuestion: document.getElementById('modal-question'),
    modalAnswer: document.getElementById('modal-answer'),
    btnRevealQuestion: document.getElementById('btn-reveal-question'),
    btnRevealAnswer: document.getElementById('btn-reveal-answer'),
    btnCloseModal: document.getElementById('btn-close-modal'),
  };

  const gameState = {
    selectedCellId: null,
    revealedPhase: 'closed', // closed | question | answer
    spentCells: new Set(),
  };

  const cellLookup = new Map();
  let normalizedBoard = null;

  function setStatus(message) {
    if (!elements.status) return;
    if (message) {
      elements.status.textContent = message;
      elements.status.hidden = false;
    } else {
      elements.status.textContent = '';
      elements.status.hidden = true;
    }
  }

  function updateSelectionHighlight() {
    if (!elements.grid) return;
    elements.grid.querySelectorAll('.board-cell').forEach((cell) => {
      if (cell.dataset.cellId === gameState.selectedCellId) {
        cell.classList.add('is-selected');
        cell.focus({ preventScroll: true });
      } else {
        cell.classList.remove('is-selected');
      }
    });
  }

  function markSpent(cellId) {
    gameState.spentCells.add(cellId);
    const cell = elements.grid?.querySelector(`.board-cell[data-cell-id="${cellId}"]`);
    if (cell) {
      cell.classList.add('is-spent');
      cell.setAttribute('aria-disabled', 'true');
      cell.disabled = true;
      cell.classList.remove('is-selected');
    }
  }

  function closeModal(markAsSpent = false) {
    if (!elements.modal) return;
    const { selectedCellId, revealedPhase } = gameState;
    if (markAsSpent && selectedCellId && revealedPhase === 'answer') {
      markSpent(selectedCellId);
    }
    gameState.selectedCellId = null;
    gameState.revealedPhase = 'closed';
    elements.modal.hidden = true;
    updateSelectionHighlight();
  }

  function setModalPhase(phase) {
    gameState.revealedPhase = phase;
    if (!elements.modal) return;

    const cellData = cellLookup.get(gameState.selectedCellId);
    const isQuestionVisible = phase === 'question' || phase === 'answer';
    const isAnswerVisible = phase === 'answer';

    if (elements.modalPhase) {
      elements.modalPhase.textContent =
        phase === 'closed' ? 'Ready?' : phase === 'question' ? 'Question' : 'Answer';
    }

    if (elements.modalQuestion) {
      elements.modalQuestion.textContent = cellData?.clue?.question || 'No question available.';
      elements.modalQuestion.hidden = !isQuestionVisible;
    }

    if (elements.modalAnswer) {
      elements.modalAnswer.textContent = cellData?.clue?.answer || 'No answer available.';
      elements.modalAnswer.hidden = !isAnswerVisible;
    }

    if (elements.btnRevealQuestion) {
      elements.btnRevealQuestion.disabled = phase !== 'closed';
    }
    if (elements.btnRevealAnswer) {
      elements.btnRevealAnswer.disabled = phase !== 'question';
    }
  }

  function openCell(cellId) {
    if (gameState.spentCells.has(cellId)) return;
    const cellData = cellLookup.get(cellId);
    if (!cellData || !elements.modal) return;

    gameState.selectedCellId = cellId;
    setModalPhase('closed');

    if (elements.modalCategory) elements.modalCategory.textContent = cellData.categoryName;
    if (elements.modalHeading) elements.modalHeading.textContent = cellData.clue?.question ? 'Clue' : 'No clue';
    if (elements.modalValue) {
      elements.modalValue.textContent =
        cellData.clue?.points != null ? `${cellData.clue.points}` : cellData.rowValue ?? '';
    }

    elements.modal.hidden = false;
    updateSelectionHighlight();
  }

  function moveSelection(deltaCat, deltaRow) {
    if (!normalizedBoard || !elements.grid) return;
    const catCount = normalizedBoard.categories.length;
    const rowCount = normalizedBoard.rows.length;

    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

    const currentCell = gameState.selectedCellId
      ? cellLookup.get(gameState.selectedCellId)
      : null;

    let nextCat = clamp(currentCell?.catIndex ?? 0, 0, catCount - 1);
    let nextRow = clamp(currentCell?.rowIndex ?? 0, 0, rowCount - 1);

    nextCat = clamp(nextCat + deltaCat, 0, catCount - 1);
    nextRow = clamp(nextRow + deltaRow, 0, rowCount - 1);

    let attempts = 0;
    let nextCellId = null;
    while (attempts < catCount * rowCount) {
      const candidate = elements.grid.querySelector(
        `.board-cell[data-cat-index="${nextCat}"][data-row-index="${nextRow}"]`
      );
      if (candidate && !candidate.classList.contains('is-spent')) {
        nextCellId = candidate.dataset.cellId;
        break;
      }
      nextCat = clamp(nextCat + deltaCat, 0, catCount - 1);
      nextRow = clamp(nextRow + deltaRow, 0, rowCount - 1);
      attempts += 1;
    }

    if (nextCellId) {
      gameState.selectedCellId = nextCellId;
      updateSelectionHighlight();
    }
  }

  function handleGridClick(event) {
    const cell = event.target.closest('.board-cell');
    if (!cell || cell.disabled || cell.classList.contains('is-spent')) return;
    const cellId = cell.dataset.cellId;
    if (!cellId) return;
    openCell(cellId);
  }

  function handleKeydown(event) {
    if (event.defaultPrevented) return;
    switch (event.key) {
      case 'Escape':
        if (!elements.modal?.hidden) {
          closeModal(gameState.revealedPhase === 'answer');
          event.preventDefault();
        }
        break;
      case ' ':
      case 'Spacebar':
        if (!elements.modal?.hidden) {
          if (gameState.revealedPhase === 'closed') {
            setModalPhase('question');
          } else if (gameState.revealedPhase === 'question') {
            setModalPhase('answer');
          }
          event.preventDefault();
        }
        break;
      case 'ArrowLeft':
        moveSelection(-1, 0);
        event.preventDefault();
        break;
      case 'ArrowRight':
        moveSelection(1, 0);
        event.preventDefault();
        break;
      case 'ArrowUp':
        moveSelection(0, -1);
        event.preventDefault();
        break;
      case 'ArrowDown':
        moveSelection(0, 1);
        event.preventDefault();
        break;
      default:
        break;
    }
  }

  function bindModalControls() {
    elements.btnRevealQuestion?.addEventListener('click', () => setModalPhase('question'));
    elements.btnRevealAnswer?.addEventListener('click', () => setModalPhase('answer'));
    elements.btnCloseModal?.addEventListener('click', () =>
      closeModal(gameState.revealedPhase === 'answer')
    );
    elements.modal?.addEventListener('click', (event) => {
      if (event.target === elements.modal) {
        closeModal(gameState.revealedPhase === 'answer');
      }
    });
  }

  function buildGrid(board) {
    if (!elements.grid) return;
    elements.grid.innerHTML = '';
    cellLookup.clear();

    const catCount = board.categories.length;
    const rowCount = board.rows.length;

    const headerRow = document.createElement('div');
    headerRow.className = 'board-row board-row--header';
    for (let c = 0; c < catCount; c += 1) {
      const categoryCell = document.createElement('div');
      categoryCell.className = 'board-cell';
      categoryCell.textContent = board.categories[c].name || `Category ${c + 1}`;
      categoryCell.setAttribute('role', 'columnheader');
      headerRow.appendChild(categoryCell);
    }
    elements.grid.appendChild(headerRow);

    for (let r = 0; r < rowCount; r += 1) {
      const row = document.createElement('div');
      row.className = 'board-row';
      for (let c = 0; c < catCount; c += 1) {
        const clue = board.categories[c]?.clues?.[r];
        const cellId = `c${c}-r${r}`;
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'board-cell';
        cell.dataset.cellId = cellId;
        cell.dataset.catIndex = String(c);
        cell.dataset.rowIndex = String(r);
        cell.textContent =
          clue?.points != null ? `${clue.points}` : board.rows[r] != null ? `${board.rows[r]}` : '—';
        cell.setAttribute('role', 'gridcell');

        const cellData = {
          cellId,
          catIndex: c,
          rowIndex: r,
          categoryName: board.categories[c]?.name || `Category ${c + 1}`,
          rowValue: board.rows[r],
          clue: clue || {},
        };
        cellLookup.set(cellId, cellData);

        row.appendChild(cell);
      }
      elements.grid.appendChild(row);
    }
  }

  function ensureDemoBoard(boardPayload) {
    const params = new URLSearchParams(window.location.search);
    if (boardPayload && Object.keys(boardPayload).length > 0) return boardPayload;
    if (params.get('demo') === '1') {
      return { ...DEMO_BOARD };
    }
    return boardPayload;
  }

  function initBoard() {
    let boardPayload = safeParseJsonFromScriptTag('board-data') || {};
    boardPayload = ensureDemoBoard(boardPayload);

    const validation = assertBoardShape(boardPayload);
    if (!validation.ok) {
      setStatus(validation.errors.join(' '));
      if (!boardPayload || Object.keys(boardPayload).length === 0) {
        setStatus('Board data missing.');
      }
      return;
    }

    normalizedBoard = normalizeBoard(boardPayload);
    if (!normalizedBoard || !normalizedBoard.categories.length) {
      setStatus('Board data missing.');
      return;
    }

    setStatus('');
    if (elements.title) elements.title.textContent = normalizedBoard.title || 'Boards Game';
    if (elements.subtitle) {
      elements.subtitle.textContent = normalizedBoard.updated_at
        ? `Updated ${new Date(normalizedBoard.updated_at).toLocaleString()}`
        : 'Ready to host.';
    }

    buildGrid(normalizedBoard);
    elements.grid?.addEventListener('click', handleGridClick);
    document.addEventListener('keydown', handleKeydown);
    bindModalControls();
    updateSelectionHighlight();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBoard);
  } else {
    initBoard();
  }
})();
