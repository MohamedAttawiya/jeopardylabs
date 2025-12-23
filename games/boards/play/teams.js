// AHWA.GAMES — Boards Play (teams module)
import {
  clampTeamCount,
  defaultTeams,
  loadTeamsState,
  saveTeamsState,
  storageKeys
} from "./storage.js";

const DEFAULT_STEP = 100;

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
    minus.textContent = "−";
    minus.setAttribute("aria-label", `Subtract ${scoreStep}`);
    minus.title = `Subtract ${scoreStep}`;
    minus.addEventListener("click", () => onScore(idx, -scoreStep));

    const plus = document.createElement("button");
    plus.type = "button";
    plus.className = "accent";
    plus.textContent = "+";
    plus.setAttribute("aria-label", `Add ${scoreStep}`);
    plus.title = `Add ${scoreStep}`;
    plus.addEventListener("click", () => onScore(idx, scoreStep));

    controls.append(minus, plus);

    row.append(name, score, controls);
    container.appendChild(row);
  });
}

export function initTeams({ boardId, mountEls = [], initialCount = clampTeamCount() }) {
  const keys = storageKeys(boardId);
  let teams = loadTeamsState(keys.teams, initialCount);
  let scoreStep = DEFAULT_STEP;

  let readyResolve;
  const ready = new Promise((resolve) => {
    readyResolve = resolve;
  });

  const onScore = (idx, delta) => {
    if (!teams[idx]) return;
    teams[idx].score += delta;
    saveTeamsState(keys.teams, teams);
    renderAll();
  };

  const onRename = (idx, value) => {
    if (!teams[idx]) return;
    teams[idx].name = value;
    saveTeamsState(keys.teams, teams);
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

  const setTeamsCount = (count) => {
    const teamCount = clampTeamCount(count);
    teams = loadTeamsState(keys.teams, teamCount);
    if (!teams.length || teams.length !== teamCount) {
      teams = defaultTeams(teamCount);
      saveTeamsState(keys.teams, teams);
    }
    renderAll();
    readyResolve?.();
  };

  renderAll();

  return {
    ready,
    getTeamsState: () => structuredClone(teams),
    setTeamsState: (next) => {
      if (!Array.isArray(next) || !next.length) return;
      teams = next.map((team, idx) => ({
        name: String(team?.name || `Team ${idx + 1}`),
        score: Number.isFinite(Number(team?.score)) ? Number(team.score) : 0
      }));
      saveTeamsState(keys.teams, teams);
      renderAll();
    },
    setTeamsCount,
    setScoreStep: (value) => {
      const next = Number(value);
      if (!Number.isFinite(next) || next <= 0) return;
      scoreStep = next;
      renderAll();
    },
    resetTeams: (count) => {
      const teamCount = clampTeamCount(count ?? teams.length);
      teams = defaultTeams(teamCount);
      saveTeamsState(keys.teams, teams);
      renderAll();
    },
    getTeamCount: () => teams.length
  };
}
