/* Shared helper utilities for Boards data handling */
(function attachBoardDataHelpers(global) {
  function safeParseJsonFromScriptTag(id) {
    const el = document.getElementById(id);
    if (!el) return null;
    try {
      const text = el.textContent?.trim() || '';
      if (!text) return null;
      return JSON.parse(text);
    } catch (error) {
      console.warn('Failed to parse JSON from script tag', error);
      return null;
    }
  }

  function assertBoardShape(board) {
    const errors = [];
    if (!board || typeof board !== 'object') {
      return { ok: false, errors: ['Board payload missing or invalid.'] };
    }

    if (!board.title || typeof board.title !== 'string') {
      errors.push('Title is required.');
    }

    if (!Array.isArray(board.categories) || !board.categories.length) {
      errors.push('At least one category is required.');
    } else {
      board.categories.forEach((cat, index) => {
        if (!cat || typeof cat !== 'object') {
          errors.push(`Category ${index + 1} is invalid.`);
          return;
        }
        if (!cat.name) errors.push(`Category ${index + 1} missing name.`);
        if (!Array.isArray(cat.clues) || !cat.clues.length) {
          errors.push(`Category ${index + 1} has no clues.`);
        }
      });
    }

    if (!Array.isArray(board.rows) || !board.rows.length) {
      errors.push('Rows array is required to set point values.');
    }

    return { ok: errors.length === 0, errors };
  }

  function normalizeBoard(board) {
    const normalized = {
      board_id: board.board_id || '',
      title: board.title || 'Untitled Board',
      language: board.language || 'en',
      updated_at: board.updated_at || '',
      rows: Array.isArray(board.rows) && board.rows.length ? [...board.rows] : [],
      categories: [],
    };

    const categoryCount = Array.isArray(board.categories) ? board.categories.length : 0;

    for (let i = 0; i < categoryCount; i += 1) {
      const cat = board.categories[i] || {};
      const clues = Array.isArray(cat.clues) ? cat.clues : [];
      normalized.categories.push({
        name: cat.name || `Category ${i + 1}`,
        clues: clues.map((clue, idx) => ({
          points: clue?.points ?? normalized.rows[idx] ?? null,
          question: clue?.question ?? '',
          answer: clue?.answer ?? '',
        })),
      });
    }

    if (!normalized.rows.length && normalized.categories.length) {
      normalized.rows = normalized.categories[0].clues.map((clue) => clue.points ?? 0);
    }

    return normalized;
  }

  const DEMO_BOARD = {
    board_id: 'demo',
    title: 'Demo Board',
    language: 'en',
    rows: [200, 400, 600, 800, 1000],
    updated_at: new Date().toISOString(),
    categories: [
      {
        name: 'Starts With A',
        clues: [
          { points: 200, question: 'An animal known as the king of the jungle.', answer: 'Lion' },
          { points: 400, question: 'Capital of France.', answer: 'Paris' },
          { points: 600, question: 'Largest planet in the solar system.', answer: 'Jupiter' },
          { points: 800, question: 'The opposite of cold.', answer: 'Hot' },
          { points: 1000, question: 'Language this page is written in.', answer: 'HTML/CSS/JS' },
        ],
      },
      {
        name: 'Numbers',
        clues: [
          { points: 200, question: '2 + 2', answer: '4' },
          { points: 400, question: 'Square root of 81', answer: '9' },
          { points: 600, question: 'Number of continents', answer: '7' },
          { points: 800, question: 'Hours in a day', answer: '24' },
          { points: 1000, question: 'Days in a leap year', answer: '366' },
        ],
      },
    ],
  };

  global.boardDataHelpers = {
    safeParseJsonFromScriptTag,
    assertBoardShape,
    normalizeBoard,
    DEMO_BOARD,
  };
})(window);
