export const MIN_TEAMS = 2;
export const MAX_TEAMS = 6;

export const clampTeamCount = (value) => {
  const num = Number(value) || MIN_TEAMS;
  return Math.min(MAX_TEAMS, Math.max(MIN_TEAMS, num));
};

export const storageKeys = (boardId) => {
  const base = `boards.play.${boardId}`;
  return {
    used: `${base}.used`,
    teams: `${base}.teams`,
    start: `${base}.start`
  };
};

export const defaultTeams = (count) =>
  Array.from({ length: count }, (_, idx) => ({
    name: `Team ${idx + 1}`,
    score: 0
  }));

export const loadUsedSet = (key) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed);
  } catch {
    return new Set();
  }
};

export const saveUsedSet = (key, usedSet) => {
  localStorage.setItem(key, JSON.stringify([...usedSet]));
};

export const loadTeamsState = (key, fallbackCount = MIN_TEAMS) => {
  const count = clampTeamCount(fallbackCount);
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultTeams(count);
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.length) return defaultTeams(count);
    return parsed.map((team, idx) => ({
      name: String(team?.name || `Team ${idx + 1}`),
      score: Number.isFinite(Number(team?.score)) ? Number(team.score) : 0
    }));
  } catch {
    return defaultTeams(count);
  }
};

export const saveTeamsState = (key, teams) => {
  localStorage.setItem(key, JSON.stringify(teams));
};

export const loadStartState = (key, fallbackCount = MIN_TEAMS) => {
  const count = clampTeamCount(fallbackCount);
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { started: false, teamCount: count };
    const parsed = JSON.parse(raw);
    return {
      started: Boolean(parsed.started),
      teamCount: clampTeamCount(parsed.teamCount ?? count)
    };
  } catch {
    return { started: false, teamCount: count };
  }
};

export const saveStartState = (key, state) => {
  localStorage.setItem(key, JSON.stringify(state));
};
