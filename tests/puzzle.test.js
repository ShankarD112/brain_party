import { gunzipSync } from "node:zlib";
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Puzzle, distance } from "../src/puzzle.js";
const fixture = {
  pieces: [1, 2, 3, 4].map((id) => ({ id, voxels: 5 - id })),
  edges: [
    [1, 2],
    [2, 3],
    [3, 4],
  ],
  components: [[1, 2, 3, 4]],
};
test("scatter is reproducible for a seed, differs across seeds, and is truly 3D", () => {
  const a = new Puzzle(fixture, 1),
    b = new Puzzle(fixture, 1),
    c = new Puzzle(fixture, 2);
  assert.deepEqual(a.group(2).offset, b.group(2).offset);
  assert.notDeepEqual(a.group(2).offset, c.group(2).offset);
  assert.ok(a.group(2).offset.every((v) => v !== 0));
});
test("nearby non-neighbors never snap", () => {
  const p = new Puzzle(fixture);
  p.move(1, [0, 0, 0]);
  p.move(3, [0, 0, 0]);
  assert.equal(p.snap(3, 0.2), 0);
  assert.equal(p.placed, 0);
});
test("true neighbors must also have anatomically correct relative placement", () => {
  const p = new Puzzle(fixture);
  p.move(1, [0, 0, 0]);
  p.move(2, [2, 0, 0]);
  assert.equal(p.snap(2, 0.2), 0);
  p.move(2, [0.1, 0, 0]);
  assert.equal(p.snap(2, 0.2), 1);
  assert.equal(p.placed, 2);
  assert.deepEqual(p.group(2).offset, [0, 0, 0]);
});
test("floating clusters join and move together before docking", () => {
  const p = new Puzzle(fixture);
  p.move(3, [5, 2, 1]);
  p.move(4, [5.1, 2, 1]);
  assert.equal(p.snap(4, 0.2), 1);
  assert.equal(p.group(3), p.group(4));
  p.move(4, [0, 0, 0]);
  assert.deepEqual(p.group(3).offset, [0, 0, 0]);
  assert.equal(p.placed, 2);
  p.move(1, [0, 0, 0]);
  p.move(2, [0.1, 0, 0]);
  p.snap(2, 0.2);
  assert.ok(p.complete);
});
test("completed assemblies remain movable and have no fixed reference", () => {

  const p = new Puzzle(fixture);
  p.move(1, [0, 0, 0]);
  p.move(2, [0.1, 0, 0]);
  p.move(3, [0.15, 0, 0]);
  p.move(4, [0.19, 0, 0]);
  p.snap(2, 0.2);
  assert.ok(p.complete);
  assert.ok([...p.groups.values()].every(g=>!g.anchored));
  p.move(1, [9, 3, 2]);
  assert.deepEqual(p.group(4).offset, [9, 3, 2]);
});
let volume;
for (const mode of ["easy", "medium", "hard"])
  test(`${mode}: actual atlas geometry, coverage, contact graph and full completion`, () => {
    const d = JSON.parse(
        readFileSync(new URL(`../public/data/${mode}.json`, import.meta.url)),
      ),
      binary = gunzipSync(
        readFileSync(new URL(`../public/data/${mode}.bin.gz`, import.meta.url)),
      );
    assert.equal(d.components.length, 1);
    const ids = new Set(d.pieces.map((p) => p.id));
    const total = d.pieces.reduce((s, p) => s + p.voxels, 0);
    if (volume === undefined) volume = total;
    else assert.equal(total, volume);
    let end = 0;
    for (const p of d.pieces) {
      assert.equal(p.offset, end);
      end += 12 * (p.vertices + p.triangles);
      assert.ok(p.vertices > 0 && p.triangles > 0);
      assert.ok(p.center.every(Number.isFinite));
      const indices = new Uint32Array(
        binary.buffer,
        binary.byteOffset + p.offset + p.vertices * 12,
        p.triangles * 3,
      );
      assert.ok(indices.every((i) => i < p.vertices));
    }
    assert.equal(end, binary.length);
    for (const [a, b] of d.edges) {
      assert.ok(ids.has(a) && ids.has(b) && a !== b);
    }
    const puzzle = new Puzzle(d, 321);
    let safety = d.pieces.length;
    while (!puzzle.complete && safety--) {
      const edge = d.edges.find(
        ([a, b]) => puzzle.group(a) !== puzzle.group(b),
      );
      assert.ok(
        edge,
        "Every remaining piece must have a path to another cluster",
      );
      const id = edge[0];
      const target=puzzle.group(edge[1]).offset;
      puzzle.move(id, [target[0]+0.02,target[1],target[2]]);
      puzzle.snap(id, 0.1);
    }
    assert.ok(puzzle.complete);
    assert.equal(puzzle.groups.size, 1);
    assert.ok([...puzzle.groups.values()].every(g=>!g.anchored));
  });

