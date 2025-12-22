/* AHWA.GAMES — Boards (Play Screen)
   Host-driven, one screen, many players/teams.
   - Renders N×N board (3..5 recommended, but works for any N that fits)
   - Full-screen question view (no modal)
   - Host awards points to active team via +/- controls
   - Local session state persisted in localStorage per board id
*/

(function () {
  const el = (id) => document.getElementById(id);

  const gridEl = el("board-grid");
  const titleEl = el("board-title");
  const subtitleEl = el("board-subtitle");
  const gameplayEl = el("gameplay");

  const autoMarkUsedEl = el("auto-mark-used");
  const wrongSubtractsEl = el("wrong-subtracts");
  const resetLocalBtn = el("reset-local");

  const teamsEl = el("teams");
  const teamsFullEl = el("teams-full");
  const activeTeamHint = el("active-team-hint");
  const addTeamBtn = el("add-team");
  const renameTeamBtn = el("rename-team");
  const removeTeamBtn = el("remove-team");

  const questionView = el("question-view");
  const qvQuestion = el("qv-question");
  const qvAnswer = el("qv-answer");
  const qvCrumb = el("qv-crumb");
  const qvRevealBtn = el("qv-reveal");
  const qvContinueBtn = el("qv-continue");
  const qvMarkUsedBtn = el("qv-mark-used");
  const qvCorrectBtn = el("qv-correct");
  const qvWrongBtn = el("qv-wrong");

  // ---------- Load board data ----------
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

  const safeClues = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => (clues?.[r]?.[c] ? clues[r][c] : { q: "", a: "" }))
  );

  // ---------- Session state ----------
  const storageKey = `ahwa.board.play.${board.id || "unknown"}`;

  const createUsedMatrix = () =>
    Array.from({ length: rows }, () => Array.from({ length: cols }, () => false));

  const defaultTeams = (count = 2) =>
    Array.from({ length: count }, (_, idx) => ({ name: `Team ${idx + 1}`, score: 0 }));

  const defaultState = {
    used: createUsedMatrix(),
    teams: defaultTeams(),
    activeTeamIdx: 0
  };

  function loadState() {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return structuredClone(defaultState);
      const parsed = JSON.parse(raw);

      const used = Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => Boolean(parsed?.used?.[r]?.[c]))
      );

      const teams = Array.isArray(parsed.teams) && parsed.teams.length
        ? parsed.teams.map((t, idx) => ({
            name: String(t?.name || `Team ${idx + 1}`),
            score: Number.isFinite(Number(t?.score)) ? Number(t.score) : 0
          }))
        : defaultTeams();

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
  let activeClue = null; // { r, c, points, category }

  // ---------- Render ----------
  function renderHeader() {
    titleEl.textContent = board.title || "Untitled board";
    subtitleEl.textContent = `${cols} categories × ${rows} clues • Host-controlled scoring`;
  }

  function renderTeamsList(container, { withAdjustments = false } = {}) {
    if (!container) return;

    container.innerHTML = "";

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

      if (withAdjustments) {
        const controls = document.createElement("div");
        controls.className = "team-controls";

        const delta = activeClue?.points || 0;

        const plus = document.createElement("button");
        plus.type = "button";
        plus.className = "accent";
        plus.textContent = delta > 0 ? `+${delta}` : "+";
        plus.disabled = delta <= 0;
        plus.addEventListener("click", (e) => {
          e.stopPropagation();
          awardToTeam(idx, delta);
        });

        const minus = document.createElement("button");
        minus.type = "button";
        minus.className = "ghost";
        minus.textContent = delta > 0 ? `-${delta}` : "-";
        minus.disabled = delta <= 0;
        minus.addEventListener("click", (e) => {
          e.stopPropagation();
          awardToTeam(idx, delta * -1);
        });

        controls.appendChild(plus);
        controls.appendChild(minus);
        row.appendChild(controls);
      }

      row.addEventListener("click", () => setActiveTeam(idx));
      row.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setActiveTeam(idx);
        }
      });

      container.appendChild(row);
    });
  }

  function renderTeams() {
    renderTeamsList(teamsEl, { withAdjustments: false });
    renderTeamsList(teamsFullEl, { withAdjustments: true });

    const active = state.teams[state.activeTeamIdx];
    if (activeTeamHint) {
      activeTeamHint.textContent = active ? `Active: ${active.name}` : "Pick an active team.";
    }
  }

  function renderGrid() {
    gridEl.style.gridTemplateColumns = `repeat(${cols}, minmax(120px, 1fr))`;
    gridEl.style.gridTemplateRows = `auto repeat(${rows}, 1fr)`;
    gridEl.innerHTML = "";

    for (let c = 0; c < cols; c++) {
      const cell = document.createElement("div");
      cell.className = "cell category";
      cell.setAttribute("role", "columnheader");
      cell.textContent = categories[c] || `Category ${c + 1}`;
      gridEl.appendChild(cell);
    }

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

  // ---------- Question view ----------
  function openClue(r, c) {
    if (state.used?.[r]?.[c]) return;

    const points = pointsPerRow[r] ?? (r + 1) * 100;
    const cat = categories[c] || `Category ${c + 1}`;
    const clue = safeClues[r][c] || { q: "", a: "" };

    activeClue = { r, c, points, category: cat };

    qvCrumb.textContent = `${cat} for ${points}`;
    qvQuestion.textContent = clue.q || "(Empty question)";
    qvAnswer.textContent = clue.a || "(Empty answer)";

    questionView.classList.remove("revealed");
    questionView.classList.add("open");
    questionView.setAttribute("aria-hidden", "false");
    if (gameplayEl) gameplayEl.classList.add("question-open");

    renderTeams();

    setTimeout(() => qvRevealBtn?.focus(), 0);
  }

  function closeQuestionView({ markUsedOnClose = false } = {}) {
    if (activeClue && (autoMarkUsedEl?.checked || markUsedOnClose)) {
      markUsed(activeClue.r, activeClue.c);
    }

    questionView.classList.remove("open", "revealed");
    questionView.setAttribute("aria-hidden", "true");
    if (gameplayEl) gameplayEl.classList.remove("question-open");

    activeClue = null;
    renderTeams();
  }

  function toggleReveal() {
    if (!questionView.classList.contains("open")) return;
    questionView.classList.toggle("revealed");
  }

  function markCurrentUsed() {
    if (!activeClue) return;
    markUsed(activeClue.r, activeClue.c);
  }

  function handleCorrect() {
    if (!activeClue) return;
    award(activeClue.points);
    markUsed(activeClue.r, activeClue.c);
    closeQuestionView({ markUsedOnClose: false });
  }

  function handleWrong() {
    if (!activeClue) return;
    if (wrongSubtractsEl?.checked) {
      award(-activeClue.points);
    }
    markUsed(activeClue.r, activeClue.c);
    closeQuestionView({ markUsedOnClose: false });
  }

  // ---------- State actions ----------
  function markUsed(r, c) {
    if (!state.used?.[r]) return;
    state.used[r][c] = true;
    saveState();
    renderGrid();
  }

  function awardToTeam(idx, delta) {
    if (idx == null || !state.teams[idx] || !Number.isFinite(delta)) return;
    state.teams[idx].score += delta;
    saveState();
    renderTeams();
  }

  function award(delta) {
    const idx = state.activeTeamIdx;
    awardToTeam(idx, delta);
  }

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

  function resetSession({ showOverlay = true } = {}) {
    const ok = confirm("Reset local session state (used cells + team scores) for this board?");
    if (!ok) return;
    localStorage.removeItem(storageKey);
    state = loadState();
    activeClue = null;
    renderTeams();
    renderGrid();

    window.dispatchEvent(
      new CustomEvent("ahwa:boardSessionReset", { detail: { boardId: board.id } })
    );

    if (showOverlay && window.AHWA_BOARDS_START?.showOverlay) {
      window.AHWA_BOARDS_START.showOverlay();
    }

    if (gameplayEl) gameplayEl.classList.add("blurred");
    closeQuestionView({ markUsedOnClose: false });
  }

  function setTeamsCount(count, { resetUsed = true } = {}) {
    const n = Math.min(6, Math.max(2, Number(count) || 2));
    state.teams = defaultTeams(n);
    state.activeTeamIdx = 0;
    if (resetUsed) {
      state.used = createUsedMatrix();
    }
    saveState();
    renderTeams();
    renderGrid();
  }

  // ---------- Events ----------
  function bindEvents() {
    document.addEventListener("keydown", (event) => {
      const isQuestionOpen = questionView?.classList.contains("open");

      if (/^[1-9]$/.test(event.key)) {
        const idx = Number(event.key) - 1;
        if (state.teams[idx]) setActiveTeam(idx);
      }

      if (!isQuestionOpen) return;

      if (event.key === "Escape") {
        event.preventDefault();
        closeQuestionView();
      }

      if (event.key === " " || event.code === "Space") {
        event.preventDefault();
        toggleReveal();
      }

      if (event.key.toLowerCase() === "c") {
        event.preventDefault();
        handleCorrect();
      }

      if (event.key.toLowerCase() === "w") {
        event.preventDefault();
        handleWrong();
      }
    });

    qvRevealBtn?.addEventListener("click", toggleReveal);
    qvContinueBtn?.addEventListener("click", () => closeQuestionView());
    qvMarkUsedBtn?.addEventListener("click", () => markCurrentUsed());
    qvCorrectBtn?.addEventListener("click", handleCorrect);
    qvWrongBtn?.addEventListener("click", handleWrong);

    addTeamBtn?.addEventListener("click", addTeam);
    renameTeamBtn?.addEventListener("click", renameTeam);
    removeTeamBtn?.addEventListener("click", removeTeam);

    resetLocalBtn?.addEventListener("click", () => resetSession());
  }

  // ---------- Global API for overlay ----------
  const api = window.AHWA_BOARDS || {};
  api.setTeamsCount = (count, opts) => setTeamsCount(count, opts || {});
  api.resetSession = () => resetSession({ showOverlay: false });
  api.getBoardMeta = () => ({ id: board.id, title: board.title });
  window.AHWA_BOARDS = api;

  window.dispatchEvent(
    new CustomEvent("ahwa:boardReady", { detail: { boardId: board.id, title: board.title } })
  );

  // ---------- Init ----------
  renderHeader();
  renderTeams();
  renderGrid();
  bindEvents();
})();
