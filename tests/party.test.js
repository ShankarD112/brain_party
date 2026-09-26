import test from 'node:test';
import assert from 'node:assert/strict';
import { Group, Mesh, BoxGeometry, MeshBasicMaterial, Vector3 } from 'three';
import { BrainParty } from '../src/party.js';

test('headspin places the dorsal side near the floor and restores exploration',()=>{
  const root=new Group(),mesh=new Mesh(new BoxGeometry(6,4,8),new MeshBasicMaterial());
  mesh.position.set(5,2,-3);root.add(mesh);
  const party=new BrainParty(root);let finished=0;
  party.start(0,false,()=>finished++);party.tick(2.8);root.updateMatrixWorld(true);
  const dorsal=new Vector3(5,4,-3).applyMatrix4(root.matrixWorld);
  assert.ok(Math.abs(dorsal.y-.12)<1e-6);
  party.stop();assert.equal(finished,1);assert.equal(party.active,false);
  assert.deepEqual(root.position.toArray(),[0,0,0]);assert.equal(root.rotation.z,0);
  assert.deepEqual(mesh.position.toArray(),[5,2,-3]);assert.ok(party.props);
  party.start(0,true,()=>finished++);party.tick(.01);assert.equal(finished,2);assert.equal(party.active,false);
  party.reset();assert.equal(root.children.length,1);mesh.geometry.dispose();mesh.material.dispose();
});
