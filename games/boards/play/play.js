// AHWA.GAMES — Boards Play (SSR HTML + client interactions)
// Assumption: server renders categories + grid buttons into the HTML.
// Each cell button should have: data-row, data-col, data-points, data-q, data-a (optional data-cat)

import { initStartOverlay } from "./overlay.js";
import { initTeams } from "./teams.js";
import {
  clearBoardState,
  loadStartState,
  loadUsedSet,
  saveUsedSet,
  storageKeys
} from "./storage.js";

function getBoardIdFromDom(gridEl) {
  const fromDom = gridEl?.dataset?.boardId;
  if (fromDom) return fromDom;

  // fallback: last path segment
  const parts = window.location.pathname.split("/").filter(Boolean);
  return parts[parts.length - 1] || "board-play";
}

function readIntCssVar(el, name) {
  const raw =
    (el?.style?.getPropertyValue(name) || "").trim() ||
    (getComputedStyle(el)?.getPropertyValue(name) || "").trim();
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function inferRowsCols(gridEl, categoriesEl) {
  const colsFromCats = categoriesEl?.children?.length || null;

  const cellBtns = gridEl
    ? [...gridEl.querySelectorAll("button.cell[data-row][data-col]")]
    : [];

  const rowsFromCells = cellBtns.length
    ? new Set(cellBtns.map((b) => b.dataset.row)).size
    : null;

  const colsFromCells = cellBtns.length
    ? new Set(cellBtns.map((b) => b.dataset.col)).size
    : null;

  const rows = readIntCssVar(gridEl, "--rows") || rowsFromCells || 1;
  const cols = readIntCssVar(gridEl, "--cols") || colsFromCats || colsFromCells || 1;

  return { rows, cols, cellBtns };
}

function getBaseStepFromCells(cellBtns) {
  const points = cellBtns
    .map((b) => Number(b.dataset.points))
    .filter((n) => Number.isFinite(n) && n > 0);
  return points.length ? Math.min(...points) : 100;
}

function main() {
  const gameplayEl = document.getElementById("gameplay");
  const teamsStrip = document.getElementById("teams-strip");

  const categoriesEl = document.getElementById("board-categories");
  const gridEl = document.getElementById("board-grid");
  const questionView = document.getElementById("question-view");

  const crumbEl = document.getElementById("qv-crumb");
  const questionEl = document.getElementById("qv-question");
  const answerEl = document.getElementById("qv-answer");
  const revealBtn = document.getElementById("qv-reveal");
  const continueBtn = document.getElementById("qv-continue");
  const menuBtn = document.getElementById("menu-button");

  const titleEl = document.getElementById("board-title");
  const startTitleEl = document.getElementById("start-title");
  const subtitleEl = document.getElementById("board-subtitle"); // optional

  if (!gridEl || !categoriesEl || !questionView) {
    console.error("Play page missing required elements (#board-grid/#board-categories/#question-view).");
    return;
  }

  const { rows, cols, cellBtns } = inferRowsCols(gridEl, categoriesEl);
  const boardId = getBoardIdFromDom(gridEl);
  const keys = storageKeys(boardId);

  // Accessibility hints
  gridEl.setAttribute("aria-rowcount", String(rows));
  gridEl.setAttribute("aria-colcount", String(cols));

  // Titles are SSR'd; keep fallbacks
  if (titleEl && titleEl.textContent.trim() === "Loading…") titleEl.textContent = "Untitled Board";
  if (startTitleEl && startTitleEl.textContent.trim() === "Loading…") {
    startTitleEl.textContent = titleEl?.textContent?.trim() || "Untitled Board";
  }
  if (subtitleEl) subtitleEl.textContent = `${cols} categories • ${rows} rows`;

  let usedCells = loadUsedSet(keys.used);
  const startState = loadStartState(keys.start);
  const bodyEl = document.body;

  const cellKey = (r, c) => `${r}:${c}`;

  const markUsed = (r, c) => {
    const key = cellKey(r, c);
    if (usedCells.has(key)) return;
    usedCells.add(key);
    saveUsedSet(keys.used, usedCells);

    const btn = gridEl.querySelector(`button.cell[data-row="${r}"][data-col="${c}"]`);
    if (btn) btn.classList.add("used");
  };

  const closeQuestionView = () => {
    questionView.classList.remove("open", "revealed");
    questionView.setAttribute("aria-hidden", "true");
    bodyEl?.classList.remove("mode-question");
  };

  const toggleReveal = () => {
    if (!questionView.classList.contains("open")) return;
    questionView.classList.toggle("revealed");
  };

  // Teams (must exist before opening question view)
  const baseStep = getBaseStepFromCells(cellBtns);
  const teamsAPI = initTeams({
    boardId,
    mountEls: [document.getElementById("teams"), document.getElementById("teams-question")],
    initialCount: startState.teamCount
  });
  teamsAPI.setScoreStep(baseStep);

  const openQuestionViewFromBtn = (btn) => {
    const c = Number(btn.dataset.col);

    const category =
      btn.dataset.cat ||
      categoriesEl?.children?.[c]?.textContent?.trim() ||
      `Category ${c + 1}`;

    const points = Number(btn.dataset.points);
    const safePoints = Number.isFinite(points) ? points : baseStep;

    crumbEl.textContent = `${category} • ${safePoints}`;
    questionEl.textContent = btn.dataset.q || "(No question)";
    answerEl.textContent = btn.dataset.a || "(No answer)";

    questionView.classList.remove("revealed");
    questionView.classList.add("open");
    questionView.setAttribute("aria-hidden", "false");

    teamsAPI.setScoreStep(safePoints);
    bodyEl?.classList.add("mode-question");
  };

  const handleCell = (btn) => {
    const r = Number(btn.dataset.row);
    const c = Number(btn.dataset.col);
    markUsed(r, c);
    openQuestionViewFromBtn(btn);
  };

  // Apply used styles + bind clicks to SSR buttons
  cellBtns.forEach((btn) => {
    const r = Number(btn.dataset.row);
    const c = Number(btn.dataset.col);
    if (usedCells.has(cellKey(r, c))) btn.classList.add("used");
    btn.addEventListener("click", () => handleCell(btn));
  });

  // Keyboard shortcuts while question view is open
  document.addEventListener("keydown", (event) => {
    if (!questionView.classList.contains("open")) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeQuestionView();
    }
    if (event.key === " " || event.code === "Space") {
      event.preventDefault();
      toggleReveal();
    }
  });

  revealBtn?.addEventListener("click", toggleReveal);
  continueBtn?.addEventListener("click", closeQuestionView);

  // Reset
  const resetBoardState = (teamCount) => {
    clearBoardState(keys);
    usedCells = new Set();
    gridEl.querySelectorAll("button.cell.used").forEach((b) => b.classList.remove("used"));
    teamsAPI.resetTeams(teamCount);
    teamsAPI.setScoreStep(baseStep);
    closeQuestionView();
  };

  // Start overlay
  let overlayAPI;

  const handleReset = (teamCount) => {
    resetBoardState(teamCount);
    overlayAPI?.show(teamCount);
  };

  overlayAPI = initStartOverlay({
    boardId,
    overlayEls: {
      container: document.getElementById("start-overlay"),
      selectEl: document.getElementById("team-count"),
      startBtn: document.getElementById("start-game"),
      titleEl: document.getElementById("start-title"),
      resetBtn: document.getElementById("reset-board")
    },
    blurTargets: [gameplayEl, teamsStrip],
    boardTitle: titleEl?.textContent?.trim() || "Untitled Board",
    onStart: (teamCount) => {
      teamsAPI.setTeamsCount(teamCount);
      teamsAPI.setScoreStep(baseStep);
    },
    onReset: handleReset
  });

  const openMenu = () => {
    closeQuestionView();
    const count = teamsAPI.getTeamCount();
    overlayAPI.show(count);
  };

  menuBtn?.addEventListener("click", openMenu);

  teamsAPI.ready.then(() => {
    gameplayEl?.classList.remove("is-blurred");
    teamsStrip?.classList.remove("is-blurred");
  });
}

document.addEventListener("DOMContentLoaded", main);
