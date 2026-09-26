import { Group, Mesh, ConeGeometry, CylinderGeometry, SphereGeometry, TorusGeometry, MeshStandardMaterial, Vector3, Box3 } from 'three';

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
      this.root.rotation.z=Math.sin(phase*Math.PI*2)*.06;
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
    this.props=new Group();this.props.name='party-hat-and-blower';this.root.add(this.props);
    const material=color=>new MeshStandardMaterial({color,roughness:.5});
    const hat=new Mesh(new ConeGeometry(.85,2.3,24),material('#fc69b3'));
    hat.position.set(this.center.x,this.center.y+this.half.y+1.05,this.center.z);hat.rotation.z=-.18;this.props.add(hat);
    const pom=new Mesh(new SphereGeometry(.23,12,8),material('#ffdd76'));
    pom.position.copy(hat.position).add(new Vector3(.2,1.15,0));this.props.add(pom);
    const brim=new Mesh(new CylinderGeometry(.92,.92,.12,24),material('#ffdd76'));
    brim.position.copy(hat.position).add(new Vector3(0,-1.1,0));this.props.add(brim);
    // A striped hat and a curled paper blower built with Three.js geometry.
    for(let i=0;i<12;i++){
      const angle=i*Math.PI*2/12;
      const dot=new Mesh(new SphereGeometry(.08,8,6),material(i%2?'#fff5dd':'#7857cb'));
      dot.position.copy(hat.position).add(new Vector3(Math.cos(angle)*.62,-.55,Math.sin(angle)*.62));this.props.add(dot);
    }
    this.blower=new Group();this.blower.position.set(this.center.x+.4,this.center.y,this.center.z+this.half.z);this.props.add(this.blower);
    const tube=new Mesh(new CylinderGeometry(.13,.2,1.5,16),material('#f7cb58'));
    tube.rotation.x=Math.PI/2;tube.position.z=.7;this.blower.add(tube);
    const paper=new Mesh(new CylinderGeometry(.17,.17,1.1,16),material('#49bca6'));
    paper.rotation.x=Math.PI/2;paper.position.z=1.85;this.blower.add(paper);
    const curl=new Mesh(new TorusGeometry(.28,.10,10,24,Math.PI*1.65),material('#49bca6'));
    curl.rotation.y=Math.PI/2;curl.position.set(0,.22,2.5);this.blower.add(curl);

  }
  follow(offset) {
    if(!this.props)return;
    if(!this.initialOffset)this.initialOffset=[...offset];
    this.props.position.fromArray(offset.map((v,i)=>v-this.initialOffset[i]));
  }
}
