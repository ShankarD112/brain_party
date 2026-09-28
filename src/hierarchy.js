// Allen hierarchy includes parent labels with their own residual atlas voxels.
export class RegionHierarchy {
 constructor(nodes,pieces){
  this.nodes=new Map(nodes.map(n=>[n.id,{...n,children:[],members:[]}])) ;
  for(const n of this.nodes.values())this.nodes.get(n.parent)?.children.push(n.id);
  for(const p of pieces){let n=this.nodes.get(p.id);while(n){n.members.push(p.id);n=this.nodes.get(n.parent);}}
  this.roots=[...this.nodes.values()].filter(n=>!this.nodes.has(n.parent)&&n.members.length);
 }
 search(query){
  const q=query.trim().toLowerCase();
  return [...this.nodes.values()].filter(n=>n.members.length&&(n.acronym+' '+n.name+' '+n.id).toLowerCase().includes(q))
   .sort((a,b)=>Number(b.acronym.toLowerCase()===q)-Number(a.acronym.toLowerCase()===q)).slice(0,45);
 }
 path(id){const path=[];let n=this.nodes.get(id);while(n){path.unshift(n);n=this.nodes.get(n.parent);}return path;}
 render(container,onSelect){
  container.replaceChildren();this.buttons=new Map();
  const make=id=>{
   const n=this.nodes.get(id),children=n.children.filter(id=>this.nodes.get(id).members.length);
   const row=document.createElement(children.length?'details':'div');row.className='hierarchy-node';
   const head=document.createElement(children.length?'summary':'div');
   const b=document.createElement('button');b.textContent=n.acronym+' · '+n.name;b.title=n.members.length+' represented regions';b.dataset.region=id;
   b.onclick=e=>{e.preventDefault();onSelect(id);};head.append(b);row.append(head);this.buttons.set(id,b);
   if(children.length){const list=document.createElement('div');list.className='hierarchy-children';for(const child of children)list.append(make(child));row.append(list);if(n.parent===null)row.open=true;}
   return row;
  };
  for(const root of this.roots)container.append(make(root.id));
 }
 markSelected(ids){for(const [id,b] of this.buttons)b.setAttribute('aria-pressed',String(ids.has(id)));}
 reveal(id){

  const button=this.buttons.get(id);let parent=button?.parentElement;
  while(parent){if(parent.tagName==='DETAILS')parent.open=true;parent=parent.parentElement;}
  button?.scrollIntoView({block:'nearest'});
 }
}
