import test from "node:test";
import assert from "node:assert/strict";
import { Puzzle } from "../src/puzzle.js";
import { Physics } from "../src/physics.js";
import {
  snapshot,
  restore,
  readSave,
  writeSave,
  SAVE_KEY,
} from "../src/session.js";
const data = {
  pieces: [1, 2, 3, 4].map((id) => ({ id, voxels: 5 - id, center: [0, 0, 0] })),
  edges: [
    [1, 2],
    [2, 3],
    [3, 4],
  ],
  components: [[1, 2, 3, 4]],
};
const bounds = new Map(
  data.pieces.map((p) => [
    p.id,
    { min: [-1, -1, -1], max: [1, 1, 1], area: 4 },
  ]),
);
const state = {
  mode: "easy",
  seed: 42,
  elapsed: 19.5,
  started: true,
  assisted: true,
};
test("save/restore preserves floating clusters, moves, and elapsed state", () => {
  const p = new Puzzle(data, 42);
  p.move(3, [8, 4, 2]);
  p.move(4, [8, 4, 2]);
  p.snap(4, 0.2);
  const saved = snapshot(p, state),
    copy = restore(data, saved);
  assert.equal(copy.group(3), copy.group(4));
  assert.deepEqual(copy.group(3).offset, [8, 4, 2]);
  assert.equal(copy.group(1).anchored, false);
  assert.equal(copy.moves, p.moves);
  assert.equal(saved.elapsed, 19.5);
  copy.move(3, [10, 4, 2]);
  assert.deepEqual(p.group(3).offset, [8, 4, 2]);
});
test("corrupt saves cannot create missing, duplicate, disconnected, or displaced anatomy", () => {
  const saved = snapshot(new Puzzle(data, 42), state);
  for (const mutate of [
    (s) => s.groups.pop(),
    (s) => (s.groups[1].members = [1]),
    (s) => (s.groups[0].offset = [Infinity, 0, 0]),
    (s) => (s.groups[2].offset = [NaN, 0, 0]),
    (s) => (s.elapsed = -1),
    (s) => (s.version = 9),
    (s) => {
      s.groups[1].members = [2, 4];
      s.groups.pop();
    },
  ]) {
    const s = structuredClone(saved);
    mutate(s);
    assert.throws(() => restore(data, s));
  }
});
test("storage denial and malformed JSON fail safely", () => {
  const denied = {
    getItem() {
      throw Error("denied");
    },
    setItem() {
      throw Error("quota");
    },
  };
  assert.equal(readSave(denied), null);
  assert.equal(writeSave(denied, {}), false);
  assert.equal(
    readSave({
      getItem() {
        return "{";
      },
    }),
    null,
  );
  let text;
  const storage = {
    setItem(k, v) {
      assert.equal(k, SAVE_KEY);
      text = v;
    },
    getItem() {
      return text;
    },
  };
  assert.equal(writeSave(storage, snapshot(new Puzzle(data), state)), true);
  assert.equal(readSave(storage).seed, 42);
});
test("floor, optional gravity, and height-assisted snapping behave consistently", () => {
  const p = new Puzzle(data),
    physics = new Physics(p, bounds, 1);
  physics.skipIntro();
  physics.move(2, [0, 2, 0]);
  physics.gravity = false;
  physics.tick(0.1);
  assert.ok(p.group(2).offset[1] > 2);
  physics.gravity = true;
  physics.tick(0.1);
  assert.ok(p.group(2).offset[1] < 2);
  physics.move(2, [0, -100, 0]);
  assert.equal(p.group(2).offset[1], physics.floorOffset(p.group(2)));
  physics.move(1, [0, 0, 0]);
  physics.move(2, [0, 5, 0]);
  physics.heightAssist = false;
  assert.equal(physics.snap(2, 0.2), 0);
  physics.heightAssist = true;
  assert.equal(physics.snap(2, 0.2), 1);
  assert.deepEqual(p.group(2).offset, [0, 0, 0]);
});
test("shuffle preserves connected clusters while moving every loose piece", () => {
  const p = new Puzzle(data),
    physics = new Physics(p, bounds, 1);
  physics.skipIntro();
  physics.move(3, [8, 4, 2]);
  physics.move(4, [8, 4, 2]);
  p.snap(4, 0.2);
  const before = [...p.group(3).offset];
  const first=[...p.group(1).offset];
  assert.equal(physics.shuffle(99), 2);
  assert.deepEqual(p.group(3).offset, before);
  assert.notDeepEqual(p.group(1).offset, first);
});


test("free clusters stay inside the board and smaller clusters drift faster",()=>{
 const p=new Puzzle(data),world=new Physics(p,bounds,3);world.skipIntro();
 world.move(1,[1e5,1e5,-1e5]);const box=world.groupBounds(p.group(1));
 assert.ok(box.max[0]<=world.arenaHalf && box.min[2]>=-world.arenaHalf);
 assert.ok(world.driftSpeed(p.group(4))>world.driftSpeed(p.group(1)));
 world.gravity=false;world.move(4,[0,0,0]);world.tick(.1,new Set([4]));assert.equal(p.group(4).offset[1],0);
});
test("old sessions migrate to movable clusters",()=>{
 const p=new Puzzle(data),save=snapshot(p,state);save.version=1;
 const restored=restore(data,save);const before=[...restored.group(1).offset];
 restored.move(1,[1,2,3]);assert.notDeepEqual(restored.group(1).offset,before);
 assert.deepEqual(restored.group(1).offset,[1,2,3]);
});

test('gravity-off drift and manual lifting both respect the floating ceiling',()=>{
 const p=new Puzzle(data),world=new Physics(p,bounds,3);world.skipIntro();world.gravity=false;
 const g=p.group(4),ceiling=world.floorOffset(g)+3;
 world.move(4,[0,1e6,0]);assert.equal(g.offset[1],ceiling);
 for(let i=0;i<1000;i++)world.tick(.1);
 assert.equal(g.offset[1],ceiling);
 world.move(4,[0,ceiling-.01,0]);world.tick(100);
 assert.ok(g.offset[1]<=ceiling);
});
