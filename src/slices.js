import { Mesh, PlaneGeometry, MeshBasicMaterial, DoubleSide } from 'three';
import { sectionContours } from './sections.js';

export class SliceViewer {
  constructor(scene, onSelect) {
    this.canvas=document.getElementById('slice-canvas');this.ctx=this.canvas.getContext('2d');
    this.axis=2;this.level=0;this.selected=null;this.cache=new Map();this.hitPaths=[];
    this.scene=scene;this.onSelect=onSelect;
    this.plane=new Mesh(new PlaneGeometry(1,1),new MeshBasicMaterial({color:'#ffcd71',transparent:true,opacity:.16,side:DoubleSide,depthWrite:false}));
    this.plane.visible=false;scene.add(this.plane);
    document.getElementById('slice-axis').onchange=e=>{this.axis=Number(e.target.value);this.focus(this.selected);};
    document.getElementById('slice-depth').oninput=e=>{this.level=Number(e.target.value);this.schedule();};
    document.getElementById('slice-plane').onchange=()=>this.updatePlane();
    document.getElementById('slice-focus').onclick=()=>this.focus(this.selected);
    this.canvas.onclick=e=>{
      const r=this.canvas.getBoundingClientRect(),x=(e.clientX-r.left)*this.canvas.width/r.width,y=(e.clientY-r.top)*this.canvas.height/r.height;
      const hit=[...this.hitPaths].reverse().find(({path})=>this.ctx.isPointInPath(path,x,y,'evenodd'));
      if(hit)this.onSelect(hit.id);
    };
    new ResizeObserver(()=>this.schedule()).observe(this.canvas);
  }
  setData(meshes,bounds,puzzle) {
    this.meshes=meshes;this.bounds=bounds;this.puzzle=puzzle;this.selected=null;this.cache.clear();
    this.min=[0,1,2].map(a=>Math.min(...[...bounds.values()].map(b=>b.min[a])));
    this.max=[0,1,2].map(a=>Math.max(...[...bounds.values()].map(b=>b.max[a])));
  }
  focus(id) {
    if(!this.bounds?.has(id))return;
    this.selected=id;
    const b=this.bounds.get(id);this.level=(b.min[this.axis]+b.max[this.axis])/2;
    const slider=document.getElementById('slice-depth');slider.min=this.min[this.axis]+.001;slider.max=this.max[this.axis]-.001;slider.step=.025;slider.value=this.level;
    this.schedule();
  }
  select(id,keepDepth=false) {if(!keepDepth && this.selected!==id)this.focus(id);else{this.selected=id;this.schedule();}}
  schedule() {if(this.pending)return;this.pending=true;requestAnimationFrame(()=>{this.pending=false;this.draw();});}
  updatePlane() {
    const visible=document.getElementById('slice-plane').checked && this.meshes?.has(this.selected) && !document.body.classList.contains('at-home');
    this.plane.visible=!!visible;if(!visible)return;
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
      ctx.globalAlpha=selected?1:connected?(document.getElementById("xray").checked?.12:.85):.045;
      ctx.fillStyle=this.meshes.get(id).userData.displayColor||this.meshes.get(id).userData.piece.color;ctx.fill(path,'evenodd');
      ctx.strokeStyle=selected?(this.theme?.ink||'#fff5cc'):(this.theme?.muted||'#6a8497');ctx.lineWidth=(selected?1.7:.6)*devicePixelRatio;ctx.stroke(outline);
      if(connected || selected)this.hitPaths.push({id,path});
      if(selected && contours.length){visibleSelected=true;if(this.highlights?.has(id))highlightedInSlice++;}
    }
    ctx.globalAlpha=1;
    document.getElementById('slice-location').textContent=`${this.level.toFixed(2)} mm · ${['LR','DV (inverted)','AP (inverted)'][this.axis]} from atlas centre`;
    document.getElementById('slice-orientation').textContent=this.axis===1?'Anterior ↑ · Left–right ↔':'Dorsal ↑ · '+(this.axis===2?'Left–right ↔':'Anterior–posterior ↔');
    document.getElementById('slice-caption').textContent=`${joined} joined regions shown in colour. ${this.highlights?.size?`${highlightedInSlice} of ${this.highlights.size} search highlights intersect this slice. `:""}${visibleSelected?'Click a coloured section to select it.':'Selected region is outside this slice; use Find selected.'}`;
    this.updatePlane();
  }
}
