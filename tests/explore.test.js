import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {RegionHierarchy} from '../src/hierarchy.js';
import {Puzzle} from '../src/puzzle.js';
import {AutoComplete} from '../src/autocomplete.js';
import {atlasCoordinates,pointOnSlice} from '../src/coordinates.js';
const data=JSON.parse(readFileSync(new URL('../public/data/hard.json',import.meta.url)));
const graph=JSON.parse(readFileSync(new URL('../public/data/hierarchy.json',import.meta.url)));
test('hierarchy maps every atlas label and parent including residual parent voxels',()=>{
 const h=new RegionHierarchy(graph.nodes,data.pieces);
 assert.equal(h.roots[0].members.length,671);assert.equal(new Set(h.roots[0].members).size,671);
 for(const p of data.pieces){assert.equal(h.nodes.get(p.id).acronym,p.acronym);assert.deepEqual(h.path(p.id).map(n=>n.name),p.path);}
 const th=h.search('TH')[0];assert.equal(th.acronym,'TH');assert.ok(th.members.length>1);
 assert.ok(th.members.every(id=>h.path(id).some(n=>n.id===th.id)));
});
test('exploration assembles every region at atlas coordinates without recording moves',()=>{
 const p=new Puzzle(data);p.assemble();assert.ok(p.complete);assert.equal(p.moves,0);
 for(const region of data.pieces)assert.deepEqual(p.group(region.id).offset,[0,0,0]);
});
test('hard auto-complete finishes within 4.1 simulation seconds at 20 FPS',()=>{
 const p=new Puzzle(data,2);let callbacks=0;const a=new AutoComplete(p,()=>callbacks++);a.start();
 let elapsed=0;while(a.active&&elapsed<4.1){a.tick(.05);elapsed+=.05;}
 assert.ok(p.complete);assert.equal(p.moves,670);assert.ok(callbacks<=82);
});
test('slice markers round trip all three planes to CCF volume millimetres',()=>{
 assert.deepEqual(atlasCoordinates([0,0,0]),{ML:5.7,DV:4,AP:6.6});
 const point=[1,2,3];
 for(const axis of [0,1,2]){
  const h=axis===0?2:0,v=axis===1?2:1,projection={h,v,scale:20,mx:0,my:0,width:200,height:180};
  const result=pointOnSlice(100+point[h]*20,90-point[v]*20,projection,axis,point[axis]);assert.deepEqual(result,point);
  const c=atlasCoordinates(result);assert.equal(c.ML,6.7);assert.equal(c.DV,2);assert.equal(c.AP,3.5999999999999996);
 }
});
