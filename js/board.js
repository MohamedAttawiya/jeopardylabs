/* AHWA.GAMES — Boards (Play Screen)
   Host-driven, one screen, many players/teams.
   - Renders N×N board (3..5 recommended, but works for any N that fits)
   - Click clue -> modal with question + reveal answer
   - Host awards points to active team
   - Local session state persisted in localStorage per board id
*/

(function () {
  const el = (id) => document.getElementById(id);

  const gridEl = el("board-grid");
  const titleEl = el("board-title");
  const subtitleEl = el("board-subtitle");

  const modal = el("cell-modal");
  const qa = el("qa");
  const modalCategory = el("modal-category");
  const modalTitle = el("modal-title");
  const modalPoints = el("modal-points");
  const modalQuestion = el("modal-question");
  const modalAnswer = el("modal-answer");

  const revealBtn = el("reveal-answer");
  const correctBtn = el("mark-correct");
  const wrongBtn = el("mark-wrong");

  const autoMarkUsedEl = el("auto-mark-used");
  const wrongSubtractsEl = el("wrong-subtracts");
  const resetLocalBtn = el("reset-local");

  const teamsEl = el("teams");
  const activeTeamHint = el("active-team-hint");
  const addTeamBtn = el("add-team");
  const renameTeamBtn = el("rename-team");
  const removeTeamBtn = el("remove-team");

  // ---------- Load board data (server-filled later; JSON-in-script for now) ----------
  const boardDataTag = el("board-data");
  if (!boardDataTag) {
    console.error("Missing #board-data <script type='application/json'>");
    return;
  }

  let board;
  try {
    board = JSON.parse(boardDataTag.textContent.trim());
  } catch (e) {
    console.error("Invalid board JSON", e);
    return;
  }

  // ---------- Validate / normalize ----------
  const categories = Array.isArray(board.categories) ? board.categories : [];
  const pointsPerRow = Array.isArray(board.points_per_row) ? board.points_per_row : [];
  const clues = Array.isArray(board.clues) ? board.clues : [];

  const cols = categories.length;
  const rows = pointsPerRow.length;

  if (!cols || !rows) {
    titleEl.textContent = "Invalid board";
    subtitleEl.textContent = "Missing categories or points_per_row.";
    return;
  }

  // clues should be [rows][cols]
  const safeClues = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => (clues?.[r]?.[c] ? clues[r][c] : { q: "", a: "" }))
  );

  // ---------- Session state ----------
  const storageKey = `ahwa.board.play.${board.id || "unknown"}`;

  const defaultState = {
    used: Array.from({ length: rows }, () => Array.from({ length: cols }, () => false)),
    teams: [
      { name: "Team 1", score: 0 },
      { name: "Team 2", score: 0 }
    ],
    activeTeamIdx: 0
  };

  function loadState() {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return structuredClone(defaultState);
      const parsed = JSON.parse(raw);

      // shape-guard for used matrix
      const used = Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => Boolean(parsed?.used?.[r]?.[c]))
      );

      const teams = Array.isArray(parsed.teams) && parsed.teams.length
        ? parsed.teams.map((t, idx) => ({
            name: String(t?.name || `Team ${idx + 1}`),
            score: Number.isFinite(Number(t?.score)) ? Number(t.score) : 0
          }))
        : structuredClone(defaultState.teams);

      const activeTeamIdx = Math.min(
        Math.max(0, Number(parsed.activeTeamIdx) || 0),
        teams.length - 1
      );

      return { used, teams, activeTeamIdx };
    } catch {
      return structuredClone(defaultState);
    }
  }

  function saveState() {
    localStorage.setItem(storageKey, JSON.stringify(state));
  }

  let state = loadState();

  // ---------- Render ----------
  function renderHeader() {
    titleEl.textContent = board.title || "Untitled board";
    subtitleEl.textContent = `${cols} categories × ${rows} clues • Host-controlled scoring`;
  }

  function renderTeams() {
    teamsEl.innerHTML = "";

    state.teams.forEach((t, idx) => {
      const row = document.createElement("div");
      row.className = "team" + (idx === state.activeTeamIdx ? " active" : "");
      row.setAttribute("role", "button");
      row.setAttribute("tabindex", "0");
      row.dataset.teamIdx = String(idx);

      const name = document.createElement("div");
      name.className = "name";
      name.textContent = t.name;

      const score = document.createElement("div");
      score.className = "score";
      score.textContent = String(t.score);

      row.appendChild(name);
      row.appendChild(score);

      row.addEventListener("click", () => setActiveTeam(idx));
      row.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setActiveTeam(idx);
        }
      });

      teamsEl.appendChild(row);
    });

    const active = state.teams[state.activeTeamIdx];
    activeTeamHint.textContent = active
      ? `Active: ${active.name}`
      : "Pick an active team.";
  }

  function renderGrid() {
    // grid template: header row + rows
    // columns: categories + (no extra)
    gridEl.style.gridTemplateColumns = `repeat(${cols}, minmax(120px, 1fr))`;

    // Clear
    gridEl.innerHTML = "";

    // Category row
    for (let c = 0; c < cols; c++) {
      const cell = document.createElement("div");
      cell.className = "cell category";
      cell.setAttribute("role", "columnheader");
      cell.textContent = categories[c] || `Category ${c + 1}`;
      gridEl.appendChild(cell);
    }

    // Clue cells
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const used = !!state.used?.[r]?.[c];
        const points = pointsPerRow[r] ?? (r + 1) * 100;

        const cell = document.createElement("button");
        cell.type = "button";
        cell.className = "cell clue" + (used ? " used" : "");
        cell.setAttribute("role", "gridcell");
        cell.dataset.r = String(r);
        cell.dataset.c = String(c);
        cell.disabled = used;

        cell.textContent = String(points);

        cell.addEventListener("click", () => openClue(r, c));
        gridEl.appendChild(cell);
      }
    }
  }

  // ---------- Modal ----------
  let activeClue = null; // { r, c, points }

  function openModal() {
    modal.classList.add("open");
    qa.classList.remove("reveal");
    // focus trap-lite: focus reveal button
    setTimeout(() => revealBtn?.focus(), 0);
  }

  function closeModal() {
    modal.classList.remove("open");
    qa.classList.remove("reveal");

    if (autoMarkUsedEl?.checked && activeClue) {
      markUsed(activeClue.r, activeClue.c);
    }

    activeClue = null;
  }

  function openClue(r, c) {
    const points = pointsPerRow[r] ?? (r + 1) * 100;
    const cat = categories[c] || `Category ${c + 1}`;
    const clue = safeClues[r][c] || { q: "", a: "" };

    activeClue = { r, c, points };

    modalCategory.textContent = cat;
    modalTitle.textContent = `${points} points`;
    modalPoints.textContent = `${points} points`;
    modalQuestion.textContent = clue.q || "(Empty question)";
    modalAnswer.textContent = clue.a || "(Empty answer)";

    openModal();
  }

  function revealAnswer() {
    qa.classList.add("reveal");
  }

  function markUsed(r, c) {
    if (!state.used?.[r]) return;
    state.used[r][c] = true;
    saveState();
    renderGrid();
  }

  function award(delta) {
    const idx = state.activeTeamIdx;
    if (idx == null || !state.teams[idx]) return;

    state.teams[idx].score += delta;
    saveState();
    renderTeams();
  }

  // ---------- Teams ----------
  function setActiveTeam(idx) {
    if (!state.teams[idx]) return;
    state.activeTeamIdx = idx;
    saveState();
    renderTeams();
  }

  function addTeam() {
    const n = state.teams.length + 1;
    state.teams.push({ name: `Team ${n}`, score: 0 });
    state.activeTeamIdx = state.teams.length - 1;
    saveState();
    renderTeams();
  }

  function renameTeam() {
    const idx = state.activeTeamIdx;
    const t = state.teams[idx];
    if (!t) return;

    const next = prompt("Team name:", t.name);
    if (next == null) return;

    t.name = next.trim() || t.name;
    saveState();
    renderTeams();
  }

  function removeTeam() {
    if (state.teams.length <= 1) return;
    const idx = state.activeTeamIdx;
    const t = state.teams[idx];
    if (!t) return;

    const ok = confirm(`Remove "${t.name}"?`);
    if (!ok) return;

    state.teams.splice(idx, 1);
    state.activeTeamIdx = Math.max(0, idx - 1);
    saveState();
    renderTeams();
  }

  // ---------- Events ----------
  function bindEvents() {
    // Modal close (matches your create.js pattern)
    modal.addEventListener("click", (event) => {
      const target = event.target;
      if (target?.dataset?.closeModal !== undefined || target === modal) closeModal();
    });

    document.addEventListener("keydown", (event) => {
      if (!modal.classList.contains("open")) {
        // team quick-select even when modal closed
        if (/^[1-9]$/.test(event.key)) {
          const idx = Number(event.key) - 1;
          if (state.teams[idx]) setActiveTeam(idx);
        }
        return;
      }

      // When modal is open:
      if (event.key === "Escape") closeModal();
      if (event.key.toLowerCase() === "a") revealAnswer();
      if (event.key.toLowerCase() === "c") handleCorrect();
      if (event.key.toLowerCase() === "w") handleWrong();

      // Team quick-select while modal open too
      if (/^[1-9]$/.test(event.key)) {
        const idx = Number(event.key) - 1;
        if (state.teams[idx]) setActiveTeam(idx);
      }
    });

    revealBtn.addEventListener("click", revealAnswer);

    correctBtn.addEventListener("click", handleCorrect);
    wrongBtn.addEventListener("click", handleWrong);

    addTeamBtn.addEventListener("click", addTeam);
    renameTeamBtn.addEventListener("click", renameTeam);
    removeTeamBtn.addEventListener("click", removeTeam);

    resetLocalBtn.addEventListener("click", () => {
      const ok = confirm("Reset local session state (used cells + team scores) for this board?");
      if (!ok) return;
      localStorage.removeItem(storageKey);
      state = loadState();
      renderTeams();
      renderGrid();
    });
  }

  function handleCorrect() {
    if (!activeClue) return;
    award(activeClue.points);
    markUsed(activeClue.r, activeClue.c);
    closeModal();
  }

  function handleWrong() {
    if (!activeClue) return;

    if (wrongSubtractsEl?.checked) {
      award(-activeClue.points);
    }

    markUsed(activeClue.r, activeClue.c);
    closeModal();
  }

  // ---------- Init ----------
  renderHeader();
  renderTeams();
  renderGrid();
  bindEvents();
})();
