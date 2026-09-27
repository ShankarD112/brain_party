import {WebGLRenderer,Scene,PerspectiveCamera,HemisphereLight,DirectionalLight,BufferGeometry,BufferAttribute,Mesh,MeshStandardMaterial,Color,Box3,Vector3,DoubleSide} from 'three';
import {decodeGeometry} from './atlas.js';
import {themes} from './themes.js';
export class BrainPreview {
 constructor(canvas,fallback,reduced){
  this.canvas=canvas;this.fallback=fallback;this.reduced=reduced;this.cache=new Map();this.theme='ocean';this.mode=null;this.token=0;
  try{this.renderer=new WebGLRenderer({canvas,alpha:true,antialias:true});}catch{return;}
  this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.setSize(360,300,false);
  this.scene=new Scene();this.camera=new PerspectiveCamera(36,1.2,.1,100);this.camera.position.set(12,9,17);this.camera.lookAt(0,0,0);
  this.scene.add(new HemisphereLight(0xffffff,0x48515b,2));const light=new DirectionalLight(0xffffff,2);light.position.set(5,10,10);this.scene.add(light);
  this.last=performance.now();const tick=now=>{requestAnimationFrame(tick);const dt=Math.min((now-this.last)/1000,.05);this.last=now;
   if(!document.body.classList.contains('at-home')||!this.mesh)return;
   if(!this.reduced)this.mesh.rotation.y+=dt*.55;
   this.renderer.render(this.scene,this.camera);
  };requestAnimationFrame(tick);
 }
 async show(mode,theme){
  this.mode=mode;this.theme=theme;const token=++this.token;if(!this.renderer)return;
  const key=mode||'easy';
  try{
   if(!this.cache.has(key))this.cache.set(key,(async()=>{
    const [metaResponse,meshResponse]=await Promise.all([fetch(`./previews/${key}-preview.json`),fetch(`./previews/${key}-preview.bin.gz`)]);
    if(!metaResponse.ok||!meshResponse.ok)throw Error('Preview unavailable');
    const meta=await metaResponse.json(),buffer=await decodeGeometry(await meshResponse.blob());
    const geometry=new BufferGeometry();geometry.setAttribute('position',new BufferAttribute(new Float32Array(buffer,0,meta.vertices*3),3));
    geometry.setIndex(new BufferAttribute(new Uint32Array(buffer,meta.vertices*12,meta.triangles*3),1));geometry.computeVertexNormals();geometry.center();
    return {geometry,meta};
   })());
   const {geometry,meta}=await this.cache.get(key);if(token!==this.token)return;
   const rotation=this.mesh?.rotation.y??.4;
   if(this.mesh){this.scene.remove(this.mesh);this.mesh.material.dispose();}
   const colors=new Float32Array(meta.vertices*3),palette=themes[theme].palette;
   for(const r of meta.regions){const c=new Color(mode?palette[r.slot]:(theme==='sand'?'#b58f74':'#91c9c4'));for(let v=r.start;v<r.start+r.count;v++)c.toArray(colors,v*3);}
   geometry.setAttribute('color',new BufferAttribute(colors,3));
   this.mesh=new Mesh(geometry,new MeshStandardMaterial({vertexColors:true,roughness:.8,side:DoubleSide}));this.mesh.rotation.y=rotation;this.scene.add(this.mesh);
   const radius=new Box3().setFromObject(this.mesh).getSize(new Vector3()).length()/2;
   this.camera.position.set(1,.65,1.4).normalize().multiplyScalar(radius*2.85);this.camera.lookAt(0,0,0);
   this.canvas.hidden=false;this.fallback.hidden=true;
  }catch{if(token===this.token){this.canvas.hidden=true;this.fallback.hidden=false;}this.cache.delete(key);}
 }
}
