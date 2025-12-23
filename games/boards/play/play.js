// AHWA.GAMES — Boards Play (board + question flow)
import { initStartOverlay } from "./overlay.js";
import { initTeams } from "./teams.js";
import { loadStartState, loadUsedSet, saveUsedSet, storageKeys } from "./storage.js";

const DEMO_BOARD = {
  id: "demo-aws-4x4",
  title: "The Most Unnecessarily AWS Board",
  language: "en",
  categories: [
    { name: "LAMBDA LORE" },
    { name: "DYNAMODB DRAMA" },
    { name: "S3 SHENANIGANS" },
    { name: "NETLIFY NOODLES" }
  ],
  points_scheme: [100, 200, 300, 400],
  grid: [
    [
      { points: 100, q: "This runtime executes your code while you pretend servers don’t exist.", a: "AWS Lambda" },
      { points: 100, q: "DynamoDB’s unit of 'you thought this would be simple' throughput.", a: "RCU / WCU (capacity units)" },
      { points: 100, q: "The S3 feature that saves you from accidental deletes… until it doesn’t.", a: "Versioning" },
      { points: 100, q: "Netlify’s go-to magic for making deploys feel like a dopamine dispenser.", a: "Continuous deployment" }
    ],
    [
      { points: 200, q: "The AWS service that turns API calls into 'hello from a function' moments.", a: "API Gateway" },
      { points: 200, q: "That DynamoDB thing you add when you regret your primary key choices.", a: "GSI (Global Secondary Index)" },
      { points: 200, q: "S3’s illusion of folders is really just…", a: "Prefixes (object key names)" },
      { points: 200, q: "This file tells the browser where your built assets live.", a: "index.html (and its references)" }
    ],
    [
      { points: 300, q: "The kind of Lambda invoke where you throw it over the wall and hope.", a: "Async invocation" },
      { points: 300, q: "DynamoDB’s vibe: fast, scalable, and allergic to ad-hoc joins.", a: "NoSQL key-value/document store" },
      { points: 300, q: "S3’s 'fine, keep it private' access pattern best practice.", a: "Block Public Access + least-privilege IAM" },
      { points: 300, q: "Netlify feature that makes /game/123 route work on refresh.", a: "Redirects / SPA fallback" }
    ],
    [
      { points: 400, q: "The AWS feature that stops your Lambda bill from going full anime power-up.", a: "Reserved concurrency (or concurrency limits)" },
      { points: 400, q: "The DynamoDB attribute type that makes numbers behave like numbers.", a: "N (Number)" },
      { points: 400, q: "S3’s 'ship the website' hosting mode (classic, simple, sharp edges).", a: "Static website hosting" },
      { points: 400, q: "The only real 'auth' you need for a coffee-shop game: one person is the…", a: "Host / Admin" }
    ]
  ]
};

const boardDataTag = document.getElementById("board-data");

function parseBoardData() {
  if (!boardDataTag) return DEMO_BOARD;
  try {
    return JSON.parse(boardDataTag.textContent.trim());
  } catch {
    return DEMO_BOARD;
  }
}

function normalizeBoard(raw) {
  const categories = Array.isArray(raw.categories)
    ? raw.categories.map((c, idx) => (typeof c === "string" ? c : c?.name || `Category ${idx + 1}`))
    : [];

  const pointsScheme =
    (Array.isArray(raw.points_scheme) && raw.points_scheme.length && raw.points_scheme) ||
    (Array.isArray(raw.points_per_row) && raw.points_per_row.length && raw.points_per_row) ||
    [];

  const grid = Array.isArray(raw.grid) && raw.grid.length ? raw.grid : raw.clues || [];

  const rows = grid.length || pointsScheme.length;
  const cols = categories.length || (grid[0]?.length ?? 0);

  const safeCategories = categories.length ? categories : Array.from({ length: cols }, (_, i) => `Category ${i + 1}`);

  const safePoints = pointsScheme.length
    ? pointsScheme
    : Array.from({ length: rows }, (_, r) => (grid?.[r]?.[0]?.points ? grid[r][0].points : (r + 1) * 100));

  const safeGrid = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => {
      const cell = grid?.[r]?.[c] || {};
      return {
        points: Number.isFinite(cell.points) ? cell.points : safePoints[r] || (r + 1) * 100,
        q: cell.q || "",
        a: cell.a || ""
      };
    })
  );

  return {
    id: raw.id || "board-play",
    title: raw.title || "Untitled Board",
    language: raw.language || "en",
    categories: safeCategories,
    points: safePoints,
    grid: safeGrid,
    rows,
    cols
  };
}

function main() {
  const rawBoard = parseBoardData();
  const board = normalizeBoard(rawBoard);
  const keys = storageKeys(board.id);
  const usedCells = loadUsedSet(keys.used);
  const startState = loadStartState(keys.start);
  const bodyEl = document.body;

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

  const titleEl = document.getElementById("board-title");
  const subtitleEl = document.getElementById("board-subtitle");

  let activeClue = null;

  if (titleEl) titleEl.textContent = board.title;
  if (subtitleEl) subtitleEl.textContent = `${board.cols} categories • ${board.rows} rows`;

  categoriesEl.style.setProperty("--cols", board.cols);
  gridEl.style.setProperty("--cols", board.cols);
  gridEl.style.setProperty("--rows", board.rows);
  categoriesEl.setAttribute("data-cols", board.cols);

  function renderCategories() {
    categoriesEl.innerHTML = "";
    board.categories.forEach((cat) => {
      const cell = document.createElement("div");
      cell.className = "cat";
      cell.textContent = cat;
      categoriesEl.appendChild(cell);
    });
  }

  function cellKey(r, c) {
    return `${r}:${c}`;
  }

  function renderGrid() {
    gridEl.innerHTML = "";
    gridEl.setAttribute("aria-rowcount", board.rows);
    gridEl.setAttribute("aria-colcount", board.cols);

    for (let r = 0; r < board.rows; r++) {
      for (let c = 0; c < board.cols; c++) {
        const isUsed = usedCells.has(cellKey(r, c));
        const points = board.points[r] ?? (r + 1) * 100;
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "cell" + (isUsed ? " used" : "");
        btn.textContent = String(points);
        btn.dataset.row = String(r);
        btn.dataset.col = String(c);
        btn.addEventListener("click", () => handleCell(r, c));
        gridEl.appendChild(btn);
      }
    }
  }

  function markUsed(r, c) {
    const key = cellKey(r, c);
    if (usedCells.has(key)) return;
    usedCells.add(key);
    saveUsedSet(keys.used, usedCells);
    const btn = gridEl.querySelector(`button[data-row="${r}"][data-col="${c}"]`);
    if (btn) btn.classList.add("used");
  }

  function openQuestionView(r, c) {
    const clue = board.grid?.[r]?.[c] || { q: "", a: "" };
    const category = board.categories[c] || `Category ${c + 1}`;
    const points = clue.points ?? board.points[r] ?? (r + 1) * 100;

    activeClue = { r, c, category, points };
    crumbEl.textContent = `${category} • ${points}`;
    questionEl.textContent = clue.q || "(No question)";
    answerEl.textContent = clue.a || "(No answer)";

    questionView.classList.remove("revealed");
    questionView.classList.add("open");
    questionView.setAttribute("aria-hidden", "false");

    teamsAPI?.setScoreStep(points);
    bodyEl?.classList.add("mode-question");
  }

  function closeQuestionView() {
    questionView.classList.remove("open", "revealed");
    questionView.setAttribute("aria-hidden", "true");
    activeClue = null;
    bodyEl?.classList.remove("mode-question");
  }

  function toggleReveal() {
    if (!questionView.classList.contains("open")) return;
    questionView.classList.toggle("revealed");
  }

  function handleCell(r, c) {
    markUsed(r, c);
    openQuestionView(r, c);
  }

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

  renderCategories();
  renderGrid();

  const baseStep = board.points?.[0] ?? 100;
  const teamsAPI = initTeams({
    boardId: board.id,
    mountEls: [document.getElementById("teams"), document.getElementById("teams-question")],
    initialCount: startState.teamCount
  });

  teamsAPI.setScoreStep(baseStep);

  initStartOverlay({
    boardId: board.id,
    overlayEls: {
      container: document.getElementById("start-overlay"),
      selectEl: document.getElementById("team-count"),
      startBtn: document.getElementById("start-game"),
      titleEl: document.getElementById("start-title")
    },
    blurTargets: [gameplayEl, teamsStrip],
    boardTitle: board.title,
    onStart: (teamCount) => {
      teamsAPI.setTeamsCount(teamCount);
      teamsAPI.setScoreStep(baseStep);
    }
  });

  teamsAPI.ready.then(() => {
    gameplayEl?.classList.remove("is-blurred");
    teamsStrip?.classList.remove("is-blurred");
  });
}

document.addEventListener("DOMContentLoaded", main);
