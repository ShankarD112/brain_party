import { distance, seededRandom } from "./puzzle.js";
const smoothstep = (i) => (
  (i = Math.max(0, Math.min(1, i))),
  i * i * (3 - 2 * i)
);
class Physics {
  constructor(t, e, n = 1) {
    ((this.pieces = new Map(t.data.pieces.map((r) => [r.id, r]))),
      (this.puzzle = t),
      (this.bounds = e),
      (this.floor = Math.min(...[...e.values()].map((r) => r.min[1])) - 0.15),
      (this.gravity = true),
      (this.heightAssist = true),
      (this.velocity = /* @__PURE__ */ new Map()),
      (this.seed = n),
      (this.age = 0),
      (this.intro = true),
      (this.phase = "assembled"),
      (this.maxVolume = Math.max(...t.data.pieces.map(p => p.voxels))),
      (this.arenaHalf = null),
      (this.targets = this.scatter(n)),
      (this.exploded = /* @__PURE__ */ new Map()));
    for (const r of t.data.pieces) {
      const s = r.center || [0, 0, 0],
        a = Math.hypot(s[0], s[2]) || 1;
      this.exploded.set(r.id, [
        (s[0] / a) * 3.2,
        1.2 + Math.abs(s[1]) * 0.25,
        (s[2] / a) * 3.2,
      ]);
    }
    this.arenaHalf = Math.max(16, ...[...this.targets].flatMap(([id, offset]) => {
      const b = this.bounds.get(id);
      return [Math.abs(b.min[0]+offset[0])+2, Math.abs(b.max[0]+offset[0])+2,
              Math.abs(b.min[2]+offset[2])+2, Math.abs(b.max[2]+offset[2])+2];
    }));
    for (const r of t.groups.values()) r.offset = [0, 0, 0];
  }
  floorOffset(t) {
    return (
      this.floor -
      Math.min(...[...t.members].map((e) => this.bounds.get(e).min[1]))
    );
  }
  groupBounds(t) {
    let e = [1 / 0, 1 / 0, 1 / 0],
      n = [-1 / 0, -1 / 0, -1 / 0];
    for (const r of t.members) {
      const s = this.bounds.get(r);
      for (let a = 0; a < 3; a++)
        ((e[a] = Math.min(e[a], s.min[a] + t.offset[a])),
          (n[a] = Math.max(n[a], s.max[a] + t.offset[a])));
    }
    return { min: e, max: n };
  }
  scatter(t, e = false) {
    const n = seededRandom(t),
      r = /* @__PURE__ */ new Map(),
      s = [],
      a = [...this.puzzle.groups.values()].filter(
        (c) => (!e || c.members.size === 1),
      );
    for (const c of this.puzzle.groups.values())
      if (!a.includes(c)) {
        const l = this.groupBounds(c);
        s.push({
          x: (l.min[0] + l.max[0]) / 2,
          z: (l.min[2] + l.max[2]) / 2,
          w: (l.max[0] - l.min[0]) / 2 + 0.35,
          d: (l.max[2] - l.min[2]) / 2 + 0.35,
        });
      }
    a.sort(
      (c, l) =>
        this.bounds.get([...l.members][0]).area -
        this.bounds.get([...c.members][0]).area,
    );
    let o = this.arenaHalf ? this.arenaHalf - 4 : 6 + Math.sqrt(a.length) * 0.65;
    for (const c of a) {
      const l = [...c.members][0],
        u = this.bounds.get(l),
        d = (u.min[0] + u.max[0]) / 2,
        f = (u.min[2] + u.max[2]) / 2,
        m = (u.max[0] - u.min[0]) / 2 + 0.4,
        g = (u.max[2] - u.min[2]) / 2 + 0.4;
      let x;
      for (let p = 0; !x; p++) {
        if (p > 4000 && this.arenaHalf) { x = {x:d+c.offset[0],z:f+c.offset[2],w:m,d:g}; break; }
        if (!this.arenaHalf && p && p % 250 === 0) o *= 1.08;
        const h = n() * Math.PI * 2,
          A = Math.sqrt(n()) * o,
          b = Math.cos(h) * A,
          y = Math.sin(h) * A;
        ( !this.arenaHalf || (Math.abs(b)+m <= this.arenaHalf && Math.abs(y)+g <= this.arenaHalf)) && s.every(
          (R) => Math.abs(b - R.x) >= m + R.w || Math.abs(y - R.z) >= g + R.d,
        ) && (x = { x: b, z: y, w: m, d: g });
      }
      (s.push(x), r.set(c.id, [x.x - d, this.floorOffset(c), x.z - f]));
    }
    return r;
  }
  skipIntro() {
    for (const t of this.puzzle.groups.values())
      ((t.offset = [...this.targets.get(t.id)]),
        this.velocity.set(t.id, 0));
    ((this.intro = false), (this.phase = "ready"));
  }
  tornado(t, e) {
    const n = this.pieces.get(t),
      r = n.center || [0, 0, 0],
      s = t * 0.723,
      a = 5 + ((t % 19) / 19) * 5,
      o = e * 2.8 + s;
    return [
      Math.cos(o) * a - r[0],
      4 + ((t % 13) / 13) * 7 + Math.sin(o * 0.6) - r[1],
      Math.sin(o) * a - r[2],
    ];
  }
  tick(t, e = /* @__PURE__ */ new Set(), n = 1) {
    if (!(!Number.isFinite(t) || t <= 0)) {
      if (((t = Math.min(t, 0.1)), this.intro)) {
        this.age += t;
        const r = this.age;
        this.phase =
          r < 1.2
            ? "assembled"
            : r < 2.8
              ? "separate"
              : r < 5.6
                ? "tornado"
                : "fall";
        for (const s of this.puzzle.groups.values()) {
          const a = [...s.members][0],
            o = this.exploded.get(a),
            c = this.targets.get(s.id);
          if (r < 1.2) s.offset = [0, 0, 0];
          else if (r < 2.8) {
            const l = smoothstep((r - 1.2) / 1.6);
            s.offset = o.map((u) => u * l);
          } else if (r < 5.6) {
            const l = smoothstep((r - 2.8) / 0.8),
              u = this.tornado(a, r - 2.8);
            s.offset = o.map((d, f) => d + (u[f] - d) * l);
          } else if (r < 6.7) {
            const l = smoothstep((r - 5.6) / 1.1),
              u = this.tornado(a, 2.8);
            s.offset = [
              u[0] + (c[0] - u[0]) * l,
              u[1] + (Math.max(c[1] + 7, 4) - u[1]) * l,
              u[2] + (c[2] - u[2]) * l,
            ];
          } else this.fall(s, t);
        }
        r >= 6.7 &&
          ([...this.puzzle.groups.values()].every(
            (s) =>
              Math.abs(s.offset[1] - this.floorOffset(s)) < 1e-3,
          ) ||
            r > 11) &&
          this.skipIntro();
        return;
      }
      for (const r of this.puzzle.groups.values()) {
        if ([...r.members].some((s) => e.has(s))) {
          this.velocity.set(r.id, 0);
          continue;
        }
        if (this.gravity) this.fall(r, t);
        else {
          this.velocity.set(r.id, 0);
          const room = Math.max(0, this.floorOffset(r) + 3 - r.offset[1]);
          r.offset[1] += this.driftSpeed(r) * t * Math.min(1, room);
        }
        r.offset = this.constrain(r, r.offset);
      }
    }
  }
  fall(t, e) {
    const n = (this.velocity.get(t.id) || 0) - 9 * e,
      r = this.floorOffset(t);
    ((t.offset[1] += n * e),
      t.offset[1] <= r
        ? ((t.offset[1] = r), this.velocity.set(t.id, 0))
        : this.velocity.set(t.id, n));
  }
  driftSpeed(group) {
    const volume = [...group.members].reduce((sum,id) => sum + this.pieces.get(id).voxels, 0);
    return 0.08 + 0.45 * (1 - Math.min(1, Math.cbrt(volume / this.maxVolume)));
  }
  constrain(group, offset) {
    const local = this.groupBounds({...group, offset:[0,0,0]});
    const result = [...offset];
    for (const axis of [0,2]) result[axis] = Math.max(-this.arenaHalf-local.min[axis], Math.min(this.arenaHalf-local.max[axis], result[axis]));
    result[1] = Math.max(this.floorOffset(group), Math.min(this.floorOffset(group)+3, result[1]));
    return result;
  }
  move(id, offset) {
    const group = this.puzzle.group(id);
    this.puzzle.move(id, this.constrain(group, offset));
    this.velocity.set(group.id, 0);
  }
  candidate(t, e) {
    const n = this.puzzle.group(t);
    return this.intro
      ? null
      : [...this.puzzle.groups.values()]
          .filter(
            (r) =>
              n !== r &&
              this.puzzle.adjacent(n, r) &&
              (this.heightAssist
                ? Math.hypot(
                    n.offset[0] - r.offset[0],
                    n.offset[2] - r.offset[2],
                  )
                : distance(n.offset, r.offset)) <= e,
          )
          .sort((r,s) => distance(n.offset,r.offset)-distance(n.offset,s.offset))[0] || null;
  }
  snap(t, e) {
    const n = this.puzzle.group(t),
      r = this.candidate(t, e);
    if (!r) return 0;
    if (this.heightAssist) {
      // Align vertically with the target cluster without pinning either one.
      const a = Math.max(this.floorOffset(n), this.floorOffset(r), r.offset[1]);
      n.offset[1] = a; r.offset[1] = a;
    }
    const s = this.puzzle.snap(t, e);
    const merged = this.puzzle.group(t);
    merged.offset = this.constrain(merged, merged.offset);
    this.velocity.set(merged.id,0);
    return s;
  }
  shuffle(t) {
    if (this.intro) return 0;
    const e = this.scatter(t, true);
    for (const [n, r] of e)
      ((this.puzzle.groups.get(n).offset = [...r]), this.velocity.set(n, 0));
    return e.size;
  }
  get connections() {
    return this.puzzle.data.pieces.length - this.puzzle.groups.size;
  }
  get requiredConnections() {
    return this.puzzle.data.pieces.length - this.puzzle.data.components.length;
  }
  get percent() {
    return this.puzzle.complete
      ? 100
      : Math.floor(
          (this.connections / Math.max(1, this.requiredConnections)) * 100,
        );
  }
}
export { Physics };

