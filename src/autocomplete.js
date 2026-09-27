// A whole run lasts about four seconds, regardless of remaining region count.
// Carry unused frame time across joins so large puzzles are not frame-limited.
export class AutoComplete {
 constructor(puzzle,onJoin=()=>{}) {this.puzzle=puzzle;this.onJoin=onJoin;this.active=false;this.step=null;}
 start(){this.active=!this.puzzle.complete;this.step=null;this.duration=Math.min(.2,4/Math.max(1,this.puzzle.groups.size-this.puzzle.data.components.length));}
 stop(){this.active=false;this.step=null;}
 tick(dt){
  if(!this.active)return;
  const p=this.puzzle;let remaining=Math.max(0,Math.min(dt,.25)),joined=false,lastId;
  while(this.active&&remaining>0){
   if(!this.step){
    const target=[...p.groups.values()].sort((a,b)=>b.members.size-a.members.size)[0];
    const moving=[...p.groups.values()].find(g=>g!==target&&p.adjacent(g,target));
    if(!moving){this.stop();break;}
    this.step={moving,target,from:[...moving.offset],to:[...target.offset],age:0};
   }
   const s=this.step,used=Math.min(remaining,this.duration-s.age);remaining-=used;s.age+=used;
   const u=Math.min(1,s.age/this.duration),ease=u*u*(3-2*u);s.moving.offset=s.from.map((v,i)=>v+(s.to[i]-v)*ease);
   if(u>=1){
    for(const id of s.moving.members){s.target.members.add(id);p.membership.set(id,s.target.id);}
    p.groups.delete(s.moving.id);p.moves++;this.step=null;joined=true;lastId=[...s.target.members][0];
    if(p.complete)this.stop();
   }
  }
  // Update slices and storage once per frame, not once for every tiny region.
  if(joined)this.onJoin(lastId);
 }
}
