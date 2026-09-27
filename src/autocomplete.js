// Join one existing cluster at a time; preserve all connections already made.
export class AutoComplete {
  constructor(puzzle,onJoin=()=>{}) {this.puzzle=puzzle;this.onJoin=onJoin;this.active=false;this.step=null;}
  start() {this.active=!this.puzzle.complete;this.step=null;}
  stop() {this.active=false;this.step=null;}
  tick(dt) {
    if(!this.active)return;
    const p=this.puzzle;
    if(!this.step){
      const target=[...p.groups.values()].sort((a,b)=>b.members.size-a.members.size)[0];
      const moving=[...p.groups.values()].find(g=>g!==target && p.adjacent(g,target));
      if(!moving){this.stop();return;}
      this.step={moving,target,from:[...moving.offset],to:[...target.offset],age:0};
    }
    const s=this.step;s.age+=dt;const u=Math.min(1,s.age/.35),t=u*u*(3-2*u);
    s.moving.offset=s.from.map((v,i)=>v+(s.to[i]-v)*t);
    if(u===1){
      // Merge only this pair, without the cascading snap used by manual play.
      for(const id of s.moving.members){s.target.members.add(id);p.membership.set(id,s.target.id);}
      p.groups.delete(s.moving.id);p.moves++;this.step=null;
      this.onJoin([...s.target.members][0]);
      if(p.complete)this.stop();
    }
  }
}
