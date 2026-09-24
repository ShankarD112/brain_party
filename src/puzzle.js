// Pure puzzle rules. Every group has one translation relative to atlas coordinates.
export const distance = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
export function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export class Puzzle {
  constructor(data, seed = 1) {
    this.data = data;
    this.groups = new Map();
    this.membership = new Map();
    this.moves = 0;
    this.neighbors = new Map(data.pieces.map((p) => [p.id, new Set()]));
    for (const [a, b] of data.edges) {
      this.neighbors.get(a).add(b);
      this.neighbors.get(b).add(a);
    }
    const random = seededRandom(seed),
      anchors = new Set(
        data.components.map((c) =>
          c.reduce((a, b) =>
            data.pieces.find((p) => p.id === a).voxels >=
            data.pieces.find((p) => p.id === b).voxels
              ? a
              : b,
          ),
        ),
      );
    const spread = 12 + Math.cbrt(data.pieces.length) * 1.4;
    for (const p of data.pieces) {
      let offset = [0, 0, 0];
      if (!anchors.has(p.id)) {
        const theta = random() * Math.PI * 2,
          z = random() * 2 - 1,
          r = spread * (0.65 + random() * 0.5),
          s = Math.sqrt(1 - z * z);
        offset = [r * s * Math.cos(theta), r * z, r * s * Math.sin(theta)];
      }
      this.groups.set(p.id, {
        id: p.id,
        members: new Set([p.id]),
        offset,
        anchored: anchors.has(p.id),
      });
      this.membership.set(p.id, p.id);
    }
  }
  group(id) {
    return this.groups.get(this.membership.get(id));
  }
  move(id, offset) {
    const g = this.group(id);
    if (!g.anchored) g.offset = [...offset];
  }
  adjacent(a, b) {
    if (a.members.size > b.members.size) [a, b] = [b, a];
    for (const id of a.members)
      for (const neighbor of this.neighbors.get(id))
        if (b.members.has(neighbor)) return true;
    return false;
  }
  snap(id, tolerance) {
    let group = this.group(id),
      joined = 0;
    this.moves++;
    if (group.anchored) return 0;
    let found = true;
    while (found) {
      found = false;
      const candidates = [...this.groups.values()]
        .filter(
          (g) =>
            g !== group &&
            this.adjacent(group, g) &&
            distance(group.offset, g.offset) <= tolerance,
        )
        .sort(
          (a, b) =>
            Number(b.anchored) - Number(a.anchored) ||
            distance(group.offset, a.offset) - distance(group.offset, b.offset),
        );
      const other = candidates[0];
      if (!other) break;
      group.offset = [...(group.anchored ? group.offset : other.offset)];
      group.anchored = group.anchored || other.anchored;
      for (const member of other.members) {
        group.members.add(member);
        this.membership.set(member, group.id);
      }
      this.groups.delete(other.id);
      joined++;
      found = true;
    }
    return joined;
  }
  get placed() {
    return [...this.groups.values()]
      .filter((g) => g.anchored)
      .reduce((n, g) => n + g.members.size, 0);
  }
  get complete() {
    return this.placed === this.data.pieces.length;
  }
}
