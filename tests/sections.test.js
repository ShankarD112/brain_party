import test from 'node:test';
import assert from 'node:assert/strict';
import { BoxGeometry } from 'three';
import { sectionContours } from '../src/sections.js';

test('mesh slices form closed square contours in all three planes',()=>{
  const box=new BoxGeometry(2,2,2);
  for(const axis of [0,1,2]) {
    const center=[4,5,6], lines=sectionContours(box.attributes.position.array,box.index.array,center,axis,center[axis]);
    assert.equal(lines.length,1);assert.equal(lines[0].closed,true);
    const p=lines[0].points;
    const area=Math.abs(p.reduce((sum,a,i)=>{const b=p[(i+1)%p.length];return sum+a[0]*b[1]-a[1]*b[0];},0)/2);
    assert.ok(Math.abs(area-4)<1e-5);
    assert.deepEqual(sectionContours(box.attributes.position.array,box.index.array,center,axis,center[axis]+2),[]);
  }
  box.dispose();
});
test('nested surfaces keep separate contours for even-odd holes',()=>{
  const outer=new BoxGeometry(2,2,2),inner=new BoxGeometry(1,1,1);
  const vertices=new Float32Array([...outer.attributes.position.array,...inner.attributes.position.array]);
  const indices=new Uint32Array([...outer.index.array,...inner.index.array.map(i=>i+outer.attributes.position.count)]);
  const lines=sectionContours(vertices,indices,[0,0,0],2,0);
  assert.equal(lines.length,2);assert.ok(lines.every(l=>l.closed));outer.dispose();inner.dispose();
});
