import { Puzzle } from "./puzzle.js";

export const SAVE_KEY = "brain-party-session-v1";
export const ATLAS_VERSION = "ccfv3-2017-web-v1";
const modes = new Set(["easy", "medium", "hard"]);
const vector = (value) =>
  Array.isArray(value) &&
  value.length === 3 &&
  value.every((n) => Number.isFinite(n) && Math.abs(n) < 10000);

export function snapshot(puzzle, state) {
  return {
    ...state,
    version: 1,
    atlas: ATLAS_VERSION,
    savedAt: Date.now(),
    moves: puzzle.moves,
    groups: [...puzzle.groups.values()].map((g) => ({
      members: [...g.members],
      offset: [...g.offset],
    })),
  };
}

export function readSave(storage) {
  try {
    const save = JSON.parse(storage.getItem(SAVE_KEY));
    if (
      !save ||
      save.version !== 1 ||
      save.atlas !== ATLAS_VERSION ||
      !modes.has(save.mode)
    )
      return null;
    return save;
  } catch {
    return null;
  }
}

export function restore(data, save) {
  if (
    !save ||
    save.version !== 1 ||
    save.atlas !== ATLAS_VERSION ||
    !modes.has(save.mode) ||
    !Number.isInteger(save.seed) ||
    save.seed < 0 ||
    save.seed > 0xffffffff ||
    !Number.isFinite(save.elapsed) ||
    save.elapsed < 0 ||
    !Number.isSafeInteger(save.moves) ||
    save.moves < 0 ||
    !Array.isArray(save.groups) ||
    !save.groups.length ||
    save.groups.length > data.pieces.length
  )
    throw new Error("Invalid saved puzzle");
  const puzzle = new Puzzle(data, save.seed);
  const anchors = new Set(
    [...puzzle.groups.values()].filter((g) => g.anchored).map((g) => g.id),
  );
  const seen = new Set(),
    groups = new Map(),
    membership = new Map();
  for (const entry of save.groups) {
    if (
      !entry ||
      !vector(entry.offset) ||
      !Array.isArray(entry.members) ||
      !entry.members.length
    )
      throw new Error("Invalid saved cluster");
    const members = new Set();
    for (const id of entry.members) {
      if (!puzzle.neighbors.has(id) || seen.has(id))
        throw new Error("Unknown or repeated region");
      seen.add(id);
      members.add(id);
    }
    // Only connected anatomical regions may form a saved cluster.
    const reached = new Set([entry.members[0]]),
      pending = [entry.members[0]];
    while (pending.length)
      for (const id of puzzle.neighbors.get(pending.pop())) {
        if (members.has(id) && !reached.has(id)) {
          reached.add(id);
          pending.push(id);
        }
      }
    if (reached.size !== members.size)
      throw new Error("Disconnected saved cluster");
    const anchored = entry.members.some((id) => anchors.has(id));
    if (anchored && entry.offset.some((n) => n !== 0))
      throw new Error("Displaced reference");
    const id = entry.members[0];
    groups.set(id, { id, members, anchored, offset: [...entry.offset] });
    for (const member of members) membership.set(member, id);
  }
  if (seen.size !== data.pieces.length)
    throw new Error("Missing saved regions");
  puzzle.groups = groups;
  puzzle.membership = membership;
  puzzle.moves = save.moves;
  return puzzle;
}

export function writeSave(storage, value) {
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
