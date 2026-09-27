import { makePartyProps } from "./party-props.js";
import { Vector3, Box3 } from 'three';

// Temporary display transforms only: anatomical coordinates and saved clusters
// are never rotated. Stop/finish always restores an immediately explorable brain.
export class BrainParty {
  constructor(root) { this.root=root;this.active=false;this.props=null; }
  reset() {
    this.active=false;this.initialOffset=null;this.root.rotation.set(0,0,0);this.root.position.set(0,0,0);
    if(this.props){this.root.remove(this.props);this.props.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});this.props=null;}
  }
  start(floor,reduced,onDone) {
    this.reset();this.onDone=onDone;this.floor=floor;
    const box=new Box3().setFromObject(this.root);
    this.center=box.getCenter(new Vector3());this.half=box.getSize(new Vector3()).multiplyScalar(.5);
    this.age=0;this.active=true;this.reduced=reduced;
  }
  tick(dt) {
    if(!this.active)return;
    this.age+=dt;
    if(this.reduced || this.age>=8.2){this.stop();return;}
    if(this.age>=5.8){
      this.root.rotation.set(0,0,0);this.root.position.set(0,0,0);
      if(!this.props)this.addProps();
      const phase=(this.age-5.8)/1.2;
      const jump=Math.sin(Math.PI*(phase%1));
      this.root.position.y=1.8*jump;
      // Jump vertically, independent of where the completed cluster sits.
      this.blower.scale.z=.5+1.2*jump;
      return;
    }
    const t=this.age, ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
    const flip=Math.PI*(t<1.2?ease(t/1.2):t<4.4?1:1-ease((t-4.4)/1.4));
    this.root.rotation.set(0,Math.PI*4*ease((t-1)/3.5),flip,'YXZ');
    const rotated=this.center.clone().applyEuler(this.root.rotation);
    // Positive atlas Y is dorsal; the inverted dorsal surface meets the floor.
    const height=Math.abs(Math.cos(flip))*this.half.y+Math.abs(Math.sin(flip))*this.half.x;
    this.root.position.copy(this.center).sub(rotated);
    this.root.position.y+=this.floor+height+.12-this.center.y;
  }
  stop() {
    if(!this.active)return;
    this.active=false;this.root.rotation.set(0,0,0);this.root.position.set(0,0,0);
    if(!this.props)this.addProps();this.blower.scale.z=1;this.onDone?.();
  }
  addProps() {
    const model=makePartyProps(this.center,this.half);this.props=model.props;this.blower=model.blower;this.root.add(this.props);
  }
  follow(offset) {
    if(!this.props)return;
    if(!this.initialOffset)this.initialOffset=[...offset];
    this.props.position.fromArray(offset.map((v,i)=>v-this.initialOffset[i]));
  }
}
