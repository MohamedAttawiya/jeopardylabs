import { clampTeamCount, loadStartState, saveStartState, storageKeys } from "./storage.js";

export function initStartOverlay({
  boardId,
  overlayEls = {},
  blurTargets = [],
  boardTitle = "",
  onStart,
  onReset
}) {
  const keys = storageKeys(boardId);
  const startState = loadStartState(keys.start);
  let currentTeamCount = startState.teamCount;
  let started = Boolean(startState.started);
  const pageRoot = document.body;

  const container = overlayEls.container ?? document.getElementById("start-overlay");
  const selectEl = overlayEls.selectEl ?? container?.querySelector("#team-count");
  const startBtn = overlayEls.startBtn ?? container?.querySelector("#start-game");
  const titleEl = overlayEls.titleEl ?? container?.querySelector("#start-title");
  const resetBtn = overlayEls.resetBtn ?? container?.querySelector("#reset-board");

  const setBlur = (on) => {
    blurTargets.forEach((el) => {
      if (!el) return;
      el.classList.toggle("is-blurred", on);
    });
  };

  const setSelectValue = (count) => {
    if (!selectEl) return;
    const next = clampTeamCount(count ?? currentTeamCount);
    selectEl.value = String(next);
    currentTeamCount = next;
  };

  const hide = () => {
    container?.classList.add("hidden");
    container?.setAttribute("aria-hidden", "true");
    pageRoot?.classList.remove("overlay-visible");
    setBlur(false);
  };

  const show = (teamCount) => {
    container?.classList.remove("hidden");
    container?.setAttribute("aria-hidden", "false");
    setSelectValue(teamCount ?? currentTeamCount);
    pageRoot?.classList.add("overlay-visible");
    setBlur(true);
  };

  const startGame = (count) => {
    const teamCount = clampTeamCount(count ?? startState.teamCount);
    currentTeamCount = teamCount;
    started = true;
    saveStartState(keys.start, { started: true, teamCount });
    hide();
    onStart?.(teamCount);
  };

  const resetBoard = () => {
    const teamCount = clampTeamCount(selectEl?.value || currentTeamCount);
    currentTeamCount = teamCount;
    started = false;
    saveStartState(keys.start, { started: false, teamCount });
    onReset?.(teamCount);
    setBlur(true);
  };

  if (titleEl && boardTitle) titleEl.textContent = boardTitle;
  if (selectEl) selectEl.value = String(startState.teamCount);

  startBtn?.addEventListener("click", () => {
    startGame(selectEl?.value || startState.teamCount);
  });

  resetBtn?.addEventListener("click", resetBoard);

  if (startState.started) {
    hide();
    onStart?.(startState.teamCount);
  } else {
    show();
  }

  return {
    show,
    hide,
    start: startGame,
    reset: resetBoard,
    setTeamCount: setSelectValue,
    state: () => ({ started, teamCount: currentTeamCount })
  };
}
