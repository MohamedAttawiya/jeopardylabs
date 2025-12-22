// AHWA.GAMES — Boards Play (teams + start overlay)
const MIN_TEAMS = 2;
const MAX_TEAMS = 6;
const DEFAULT_STEP = 100;

const defaultTeams = (count) =>
  Array.from({ length: count }, (_, idx) => ({
    name: `Team ${idx + 1}`,
    score: 0
  }));

function clampCount(n) {
  const num = Number(n) || MIN_TEAMS;
  return Math.min(MAX_TEAMS, Math.max(MIN_TEAMS, num));
}

function storageKeys(boardId) {
  const base = `boards.play.${boardId}`;
  return {
    teams: `${base}.teams`,
    start: `${base}.start`
  };
}

function loadTeams(key, fallbackCount) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultTeams(fallbackCount);
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.length) return defaultTeams(fallbackCount);
    return parsed.map((team, idx) => ({
      name: String(team?.name || `Team ${idx + 1}`),
      score: Number.isFinite(Number(team?.score)) ? Number(team.score) : 0
    }));
  } catch {
    return defaultTeams(fallbackCount);
  }
}

function saveTeams(key, teams) {
  localStorage.setItem(key, JSON.stringify(teams));
}

function loadStart(key, fallbackCount) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { started: false, teamCount: fallbackCount };
    const parsed = JSON.parse(raw);
    return {
      started: Boolean(parsed.started),
      teamCount: clampCount(parsed.teamCount ?? fallbackCount)
    };
  } catch {
    return { started: false, teamCount: fallbackCount };
  }
}

function saveStart(key, state) {
  localStorage.setItem(key, JSON.stringify(state));
}

function renderTeams(container, teams, { onScore, onRename, scoreStep }) {
  if (!container) return;
  container.innerHTML = "";

  teams.forEach((team, idx) => {
    const row = document.createElement("div");
    row.className = "team";

    const name = document.createElement("div");
    name.className = "team-name";
    name.contentEditable = "true";
    name.spellcheck = false;
    name.textContent = team.name;
    name.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        name.blur();
      }
    });
    name.addEventListener("blur", () => {
      const value = name.textContent?.trim() || `Team ${idx + 1}`;
      onRename(idx, value);
      name.textContent = value;
    });

    const score = document.createElement("div");
    score.className = "score";
    score.textContent = String(team.score);

    const controls = document.createElement("div");
    controls.className = "controls";

    const minus = document.createElement("button");
    minus.type = "button";
    minus.className = "ghost";
    minus.textContent = `−${scoreStep}`;
    minus.addEventListener("click", () => onScore(idx, -scoreStep));

    const plus = document.createElement("button");
    plus.type = "button";
    plus.className = "accent";
    plus.textContent = `+${scoreStep}`;
    plus.addEventListener("click", () => onScore(idx, scoreStep));

    controls.append(minus, plus);

    row.append(name, score, controls);
    container.appendChild(row);
  });
}

export function initTeams({ boardId, mountEls = [], overlay, blurTargets = [], boardTitle = "" }) {
  const keys = storageKeys(boardId);
  const startState = loadStart(keys.start, MIN_TEAMS);
  let teams = loadTeams(keys.teams, startState.teamCount);
  let scoreStep = DEFAULT_STEP;

  let readyResolve;
  const ready = new Promise((resolve) => {
    readyResolve = resolve;
  });

  const setBlur = (on) => {
    blurTargets.forEach((el) => {
      if (!el) return;
      el.classList.toggle("is-blurred", on);
    });
  };

  const overlayTitle = overlay?.titleEl;
  if (overlayTitle && boardTitle) overlayTitle.textContent = boardTitle;

  const setStarted = (count) => {
    saveStart(keys.start, { started: true, teamCount: count });
    setBlur(false);
    overlay?.container?.classList.add("hidden");
    renderAll();
    readyResolve?.();
  };

  const onScore = (idx, delta) => {
    if (!teams[idx]) return;
    teams[idx].score += delta;
    saveTeams(keys.teams, teams);
    renderAll();
  };

  const onRename = (idx, value) => {
    if (!teams[idx]) return;
    teams[idx].name = value;
    saveTeams(keys.teams, teams);
    renderAll();
  };

  const renderAll = () => {
    mountEls.forEach((el) =>
      renderTeams(el, teams, {
        onScore,
        onRename,
        scoreStep
      })
    );
  };

  const startSelect = overlay?.selectEl;
  const startBtn = overlay?.startBtn;

  if (startSelect) startSelect.value = String(startState.teamCount);

  const handleStart = () => {
    const count = clampCount(startSelect?.value || startState.teamCount);
    teams = loadTeams(keys.teams, count);
    if (!teams.length || teams.length !== count) {
      teams = defaultTeams(count);
      saveTeams(keys.teams, teams);
    }
    setStarted(count);
  };

  startBtn?.addEventListener("click", handleStart);

  if (startState.started) {
    setBlur(false);
    overlay?.container?.classList.add("hidden");
    renderAll();
    readyResolve?.();
  } else {
    setBlur(true);
    overlay?.container?.classList.remove("hidden");
  }

  return {
    ready,
    getTeamsState: () => structuredClone(teams),
    setTeamsState: (next) => {
      if (!Array.isArray(next) || !next.length) return;
      teams = next.map((team, idx) => ({
        name: String(team?.name || `Team ${idx + 1}`),
        score: Number.isFinite(Number(team?.score)) ? Number(team.score) : 0
      }));
      saveTeams(keys.teams, teams);
      renderAll();
    },
    setScoreStep: (value) => {
      const next = Number(value);
      if (!Number.isFinite(next) || next <= 0) return;
      scoreStep = next;
      renderAll();
    }
  };
}
