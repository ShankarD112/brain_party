import {atlasCoordinates,pointOnSlice} from "./coordinates.js";
import { Mesh, PlaneGeometry, MeshBasicMaterial, DoubleSide, SphereGeometry } from 'three';
import { sectionContours } from './sections.js';

export class SliceViewer {
  constructor(scene, onSelect) {
    this.canvas=document.getElementById('slice-canvas');this.ctx=this.canvas.getContext('2d');
    this.base=document.createElement("canvas");this.markerPoint=null;this.pinned=false;
    this.marker=new Mesh(new SphereGeometry(.065,12,8),new MeshBasicMaterial({color:"#ffba53",depthTest:false}));this.marker.renderOrder=10;this.marker.visible=false;scene.add(this.marker);
    this.axis=2;this.level=0;this.selected=null;this.cache=new Map();this.hitPaths=[];
    this.scene=scene;this.onSelect=onSelect;
    this.plane=new Mesh(new PlaneGeometry(1,1),new MeshBasicMaterial({color:'#ffcd71',transparent:true,opacity:.16,side:DoubleSide,depthWrite:false}));
    this.plane.visible=false;scene.add(this.plane);
    document.getElementById('slice-axis').onchange=e=>{this.axis=Number(e.target.value);this.setMarker(this.markerPoint||this.min.map((v,a)=>(v+this.max[a])/2),true);};
    document.getElementById('slice-depth').oninput=e=>{this.level=Number(e.target.value);if(this.markerPoint)this.markerPoint[this.axis]=this.level;this.schedule();};
    document.getElementById('slice-plane').onchange=()=>this.updatePlane();
    document.getElementById('slice-focus').onclick=()=>this.focus(this.selected);
    const hitAt=e=>{
      const r=this.canvas.getBoundingClientRect(),x=(e.clientX-r.left)*this.canvas.width/r.width,y=(e.clientY-r.top)*this.canvas.height/r.height;
      return [...this.hitPaths].reverse().find(({path})=>this.ctx.isPointInPath(path,x,y,'evenodd'));
    };
    this.canvas.onpointermove=e=>{
      if(!this.pinned)this.markerFromEvent(e);
      const hit=hitAt(e),label=document.getElementById('slice-hover');
      label.textContent=hit?(hit.connected?`${this.meshes.get(hit.id).userData.piece.acronym} · ${this.meshes.get(hit.id).userData.piece.name}`:'???'):'Hover over a section';
    };
    this.canvas.addEventListener('pointermove',()=>{const label=document.getElementById('slice-hover');label.title=label.textContent;});
    this.canvas.onpointerleave=()=>{const label=document.getElementById('slice-hover');label.textContent='Hover over a section';label.title='';};
    this.canvas.onclick=e=>{
      this.markerFromEvent(e);const point=[...this.markerPoint];const hit=hitAt(e);if(hit?.connected)this.onSelect(hit.id);
      this.pinned=true;this.setMarker(point,true);document.getElementById('marker-unpin').hidden=false;
    };
    document.getElementById('marker-unpin').onclick=()=>{this.pinned=false;document.getElementById('marker-unpin').hidden=true;};
    new ResizeObserver(()=>this.schedule()).observe(this.canvas);
  }
  setData(meshes,bounds,puzzle) {
    this.meshes=meshes;this.bounds=bounds;this.puzzle=puzzle;this.selected=null;this.cache.clear();this.markerPoint=null;this.pinned=false;document.getElementById("marker-unpin").hidden=true;
    this.min=[0,1,2].map(a=>Math.min(...[...bounds.values()].map(b=>b.min[a])));
    this.max=[0,1,2].map(a=>Math.max(...[...bounds.values()].map(b=>b.max[a])));
  }
  focus(id) {
    if(!this.bounds?.has(id))return;
    this.selected=id;
    const b=this.bounds.get(id);this.markerPoint=b.min.map((v,a)=>(v+b.max[a])/2);this.level=this.markerPoint[this.axis];this.pinned=false;document.getElementById("marker-unpin").hidden=true;
    const slider=document.getElementById('slice-depth');slider.min=this.min[this.axis]+.001;slider.max=this.max[this.axis]-.001;slider.step=.025;slider.value=this.level;
    this.schedule();
  }
  select(id,keepDepth=false) {if(!keepDepth && this.selected!==id)this.focus(id);else{this.selected=id;this.schedule();}}
  schedule() {if(this.pending)return;this.pending=true;requestAnimationFrame(()=>{this.pending=false;this.draw();});}
  updatePlane() {
    const visible=document.getElementById('slice-plane').checked && this.meshes?.has(this.selected) && !document.body.classList.contains('at-home');
    this.plane.visible=!!visible;this.updateMarker3D();if(!visible)return;
    const axes=[0,1,2].filter(a=>a!==this.axis), center=this.min.map((v,a)=>(v+this.max[a])/2);
    center[this.axis]=this.level;
    const offset=this.puzzle.group(this.selected).offset;
    this.plane.position.set(...center.map((v,a)=>v+offset[a]));
    this.plane.rotation.set(0,0,0);
    if(this.axis===0)this.plane.rotation.y=Math.PI/2;
    if(this.axis===1)this.plane.rotation.x=-Math.PI/2;
    // Plane local X/Y dimensions differ for a sagittal rotation.
    const widthAxis=this.axis===0?2:axes[0],heightAxis=this.axis===0?1:axes[1];
    this.plane.scale.set(this.max[widthAxis]-this.min[widthAxis]+.6,this.max[heightAxis]-this.min[heightAxis]+.6,1);
  }
  draw() {
    if(!this.meshes || !this.canvas.clientWidth)return;
    const width=Math.round(this.canvas.clientWidth*devicePixelRatio),height=Math.round(this.canvas.clientHeight*devicePixelRatio);
    this.canvas.width=width;this.canvas.height=height;
    const ctx=this.ctx;ctx.fillStyle=this.theme?.slice||'#07131f';ctx.fillRect(0,0,width,height);
    const axes=[0,1,2].filter(a=>a!==this.axis);
    // Coronal: LR/DV. Sagittal: AP/DV. Horizontal: LR/AP.
    const h=this.axis===0?2:axes[0],v=this.axis===0?1:axes[1];
    const scale=Math.min((width-32)/(this.max[h]-this.min[h]),(height-32)/(this.max[v]-this.min[v]));
    const mx=(this.min[h]+this.max[h])/2,my=(this.min[v]+this.max[v])/2;
    const project=p=>[width/2+(p[axes.indexOf(h)]-mx)*scale,height/2-(p[axes.indexOf(v)]-my)*scale];
    this.projection={h,v,scale,mx,my,width,height};
    this.hitPaths=[];let joined=0,visibleSelected=false,highlightedInSlice=0;
    const ids=[...this.meshes.keys()].sort((a,b)=>Number(a===this.selected||this.highlights?.has(a))-Number(b===this.selected||this.highlights?.has(b)));
    for(const id of ids) {
      const group=this.puzzle.group(id), connected=group.members.size>1 || this.puzzle.complete;
      if(connected)joined++;
      const b=this.bounds.get(id);if(this.level<b.min[this.axis] || this.level>b.max[this.axis])continue;
      const key=`${id}:${this.axis}:${this.level.toFixed(4)}`;
      let contours=this.cache.get(key);
      if(!contours){const m=this.meshes.get(id);contours=sectionContours(m.geometry.attributes.position.array,m.geometry.index.array,m.userData.piece.center,this.axis,this.level);if(this.cache.size>1600)this.cache.clear();this.cache.set(key,contours);}
      const path=new Path2D(),outline=new Path2D();
      for(const c of contours){const pts=c.points.map(project);for(const dest of c.closed?[path,outline]:[outline]){dest.moveTo(...pts[0]);for(const p of pts.slice(1))dest.lineTo(...p);if(c.closed)dest.closePath();}}
      const selected=id===this.selected || this.highlights?.has(id);
      ctx.globalAlpha=selected?1:connected?(document.getElementById("xray").checked?(this.theme?.sliceFade||.16):.85):.045;
      ctx.fillStyle=this.meshes.get(id).userData.displayColor||this.meshes.get(id).userData.piece.color;ctx.fill(path,'evenodd');
      ctx.strokeStyle=selected?(this.theme?.ink||'#fff5cc'):(this.theme?.muted||'#6a8497');ctx.lineWidth=(document.body.dataset.theme==='cartoon'?(selected?2.2:1.2):(selected?1.7:.6))*devicePixelRatio;ctx.stroke(outline);
      this.hitPaths.push({id,path,connected});
      if(selected && contours.length){visibleSelected=true;if(this.highlights?.has(id))highlightedInSlice++;}
    }
    ctx.globalAlpha=1;
    document.getElementById('slice-location').textContent=`${this.level.toFixed(2)} mm · ${['LR','DV (inverted)','AP (inverted)'][this.axis]} from atlas centre`;
    document.getElementById('slice-orientation').textContent=this.axis===1?'Anterior ↑ · Left–right ↔':'Dorsal ↑ · '+(this.axis===2?'Left–right ↔':'Anterior–posterior ↔');
    document.getElementById('slice-caption').textContent=`${joined} joined regions shown in colour. ${this.highlights?.size?`${highlightedInSlice} of ${this.highlights.size} search highlights intersect this slice. `:""}${visibleSelected?'Click a coloured section to select it.':'Selected region is outside this slice; use Find selected.'}`;
    this.updatePlane();
    this.base.width=width;this.base.height=height;this.base.getContext('2d').drawImage(this.canvas,0,0);this.drawMarker();
  }
  setMarker(point,followDepth=false){
    if(!point)return;this.markerPoint=[...point];
    if(followDepth){this.level=point[this.axis];const slider=document.getElementById('slice-depth');slider.min=this.min[this.axis]+.001;slider.max=this.max[this.axis]-.001;slider.step=.025;slider.value=this.level;this.schedule();}
    else this.drawMarker();
  }
  markerFromEvent(e){
    if(!this.projection)return;const r=this.canvas.getBoundingClientRect();
    const p=pointOnSlice((e.clientX-r.left)*this.canvas.width/r.width,(e.clientY-r.top)*this.canvas.height/r.height,this.projection,this.axis,this.level);
    this.setMarker(p.map((v,a)=>Math.max(this.min[a],Math.min(this.max[a],v))));
  }
  drawMarker(){
    if(!this.projection||!this.markerPoint||!this.base.width)return;
    const {h,v,scale,mx,my,width,height}=this.projection,p=this.markerPoint,ctx=this.ctx;
    ctx.drawImage(this.base,0,0);const x=width/2+(p[h]-mx)*scale,y=height/2-(p[v]-my)*scale,r=7*devicePixelRatio;
    ctx.save();ctx.strokeStyle=this.theme?.ink||'#fff';ctx.lineWidth=3*devicePixelRatio;ctx.beginPath();ctx.moveTo(x-r,y);ctx.lineTo(x+r,y);ctx.moveTo(x,y-r);ctx.lineTo(x,y+r);ctx.stroke();
    ctx.strokeStyle=this.theme?.accent||'#ffba53';ctx.lineWidth=1.4*devicePixelRatio;ctx.stroke();ctx.restore();
    const coords=atlasCoordinates(p);document.getElementById('marker-coordinates').textContent=Object.entries(coords).map(([axis,value])=>axis+' '+value.toFixed(2)).join(' · ');
    this.updateMarker3D();
  }
  updateMarker3D(){
    this.marker.visible=!!this.markerPoint&&document.getElementById('slice-plane').checked&&!document.body.classList.contains('at-home');
    if(this.markerPoint&&this.puzzle?.group(this.selected))this.marker.position.fromArray(this.markerPoint.map((v,a)=>v+this.puzzle.group(this.selected).offset[a]));
  }
}
