import {Group,Mesh,ConeGeometry,TorusGeometry,SphereGeometry,CylinderGeometry,MeshStandardMaterial,TubeGeometry,CatmullRomCurve3,Vector3,DoubleSide} from 'three';
// Reusable, coherent prop models: all decorations follow the hat's local axis.
export function makePartyProps(center,half){
 const props=new Group();props.name='party-hat-and-blower';
 const material=color=>new MeshStandardMaterial({color,roughness:.55,side:DoubleSide});
 const coral=material('#ef697c'),cream=material('#ffedc7'),teal=material('#36bea9'),gold=material('#eaba4c');
 const hat=new Group();hat.position.set(center.x,center.y+half.y+.06,center.z);hat.rotation.z=-.12;props.add(hat);
 const cone=new Mesh(new ConeGeometry(.85,2.15,48,1,true),coral);cone.position.y=1.075;hat.add(cone);
 // Alternate coloured paper panels fitted precisely to the cone surface.
 for(let i=0;i<6;i++){
  const panel=new Mesh(new ConeGeometry(.856,2.15,8,1,true,i*Math.PI/3,Math.PI/7),i%2?teal:cream);panel.position.y=1.075;hat.add(panel);
 }
 const brim=new Mesh(new TorusGeometry(.85,.065,10,48),gold);brim.rotation.x=Math.PI/2;hat.add(brim);
 const pom=new Group();pom.position.y=2.2;hat.add(pom);
 for(let i=0;i<9;i++){const puff=new Mesh(new SphereGeometry(.10,10,8),cream);const a=i*Math.PI*2/9;puff.position.set(Math.cos(a)*.12,(i%3-1)*.055,Math.sin(a)*.12);pom.add(puff);}
 const blower=new Group();blower.position.set(center.x+.4,center.y,center.z+half.z-.1);props.add(blower);
 const mouth=new Mesh(new CylinderGeometry(.15,.22,.8,24),gold);mouth.rotation.x=Math.PI/2;mouth.position.z=.4;blower.add(mouth);
 const points=[new Vector3(0,0,.65),new Vector3(0,0,1.3),new Vector3(0,0,1.9),new Vector3(0,.1,2.25),new Vector3(0,.42,2.3),new Vector3(0,.58,2.05),new Vector3(0,.43,1.88),new Vector3(0,.29,2.02)];
 const paper=new Mesh(new TubeGeometry(new CatmullRomCurve3(points),64,.14,12,false),teal);blower.add(paper);
 for(let i=0;i<4;i++){const band=new Mesh(new TorusGeometry(.145,.035,8,24),cream);band.position.z=.9+i*.28;blower.add(band);}
 return {props,blower};
}
