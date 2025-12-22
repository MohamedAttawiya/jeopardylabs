(function () {
  const dataEl = document.getElementById("board-data");
  const overlay = document.getElementById("start-overlay");
  const gameplay = document.getElementById("gameplay");
  const teamsBar = document.getElementById("teams-bar");
  const titleEl = document.getElementById("start-title");
  const selectEl = document.getElementById("team-count");
  const startBtn = document.getElementById("start-game");

  if (!dataEl || !overlay || !selectEl || !startBtn) return;

  let board;
  try {
    board = JSON.parse(dataEl.textContent.trim());
  } catch {
    board = { id: "unknown", title: "Boards" };
  }

  const storageKey = `ahwa.board.start.${board.id || "unknown"}`;

  const defaultOverlayState = { started: false, teamCount: 2 };

  function loadOverlayState() {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return { ...defaultOverlayState };
      const parsed = JSON.parse(raw);
      return {
        started: Boolean(parsed.started),
        teamCount: Math.min(6, Math.max(2, Number(parsed.teamCount) || 2))
      };
    } catch {
      return { ...defaultOverlayState };
    }
  }

  function saveOverlayState(next) {
    localStorage.setItem(storageKey, JSON.stringify(next));
  }

  function blurGameplay(on) {
    if (gameplay) gameplay.classList.toggle("blurred", on);
    if (teamsBar) teamsBar.classList.toggle("blurred", on);
  }

  function hideOverlay() {
    overlay.classList.add("hidden");
    overlay.setAttribute("aria-hidden", "true");
    blurGameplay(false);
  }

  function showOverlay() {
    overlay.classList.remove("hidden");
    overlay.setAttribute("aria-hidden", "false");
    blurGameplay(true);
  }

  const overlayState = loadOverlayState();

  if (titleEl) {
    titleEl.textContent = board.title || "Untitled board";
  }

  selectEl.value = String(overlayState.teamCount || 2);

  function startGame() {
    const count = Math.min(6, Math.max(2, Number(selectEl.value) || 2));
    saveOverlayState({ started: true, teamCount: count });

    if (window.AHWA_BOARDS?.setTeamsCount) {
      window.AHWA_BOARDS.setTeamsCount(count, { resetUsed: true });
    }

    hideOverlay();
  }

  startBtn.addEventListener("click", startGame);

  if (overlayState.started) {
    hideOverlay();
  } else {
    showOverlay();
  }

  window.addEventListener("ahwa:boardSessionReset", (event) => {
    if (event?.detail?.boardId && event.detail.boardId !== board.id) return;
    localStorage.removeItem(storageKey);
    selectEl.value = String(defaultOverlayState.teamCount);
    showOverlay();
  });

  window.AHWA_BOARDS_START = {
    showOverlay: () => {
      localStorage.removeItem(storageKey);
      selectEl.value = String(defaultOverlayState.teamCount);
      showOverlay();
    }
  };
})();
