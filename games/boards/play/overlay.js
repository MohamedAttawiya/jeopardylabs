import { clampTeamCount, loadStartState, saveStartState, storageKeys } from "./storage.js";

export function initStartOverlay({ boardId, overlayEls = {}, blurTargets = [], boardTitle = "", onStart }) {
  const keys = storageKeys(boardId);
  const startState = loadStartState(keys.start);

  const container = overlayEls.container ?? document.getElementById("start-overlay");
  const selectEl = overlayEls.selectEl ?? container?.querySelector("#team-count");
  const startBtn = overlayEls.startBtn ?? container?.querySelector("#start-game");
  const titleEl = overlayEls.titleEl ?? container?.querySelector("#start-title");

  const setBlur = (on) => {
    blurTargets.forEach((el) => {
      if (!el) return;
      el.classList.toggle("is-blurred", on);
    });
  };

  const hide = () => {
    container?.classList.add("hidden");
    container?.setAttribute("aria-hidden", "true");
    setBlur(false);
  };

  const show = () => {
    container?.classList.remove("hidden");
    container?.setAttribute("aria-hidden", "false");
    setBlur(true);
  };

  const startGame = (count) => {
    const teamCount = clampTeamCount(count ?? startState.teamCount);
    saveStartState(keys.start, { started: true, teamCount });
    hide();
    onStart?.(teamCount);
  };

  if (titleEl && boardTitle) titleEl.textContent = boardTitle;
  if (selectEl) selectEl.value = String(startState.teamCount);

  startBtn?.addEventListener("click", () => {
    startGame(selectEl?.value || startState.teamCount);
  });

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
    state: startState
  };
}
