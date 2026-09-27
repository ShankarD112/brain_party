export const themes = {
  sand: {xrayOpacity:.24,highlight:.12,sliceFade:.38,background:'#eee4d3',floor:'#dfd1ba',surface:'#faf5eb',ink:'#302c28',muted:'#706052',line:'#c5b398',accent:'#754139',slice:'#f4ecdE',palette:['#9c304f','#206a78','#7151a0','#ac5923','#287d5d','#3152a0','#93661c','#a53c89']},
  ocean: {xrayOpacity:.03,highlight:.55,sliceFade:.16,background:'#0d222d',floor:'#153845',surface:'#122d39',ink:'#edf8f5',muted:'#aec6cd',line:'#416675',accent:'#8ef0d2',slice:'#091d28',palette:['#ef8799','#68d5d4','#c4a4ef','#ffc17d','#a6dc85','#8ebaff','#ffe28a','#ee9bd3']},
};
// Greedy colouring keeps directly adjacent structures in different palette slots.
export function regionColors(data,theme) {
  const colors=new Map(), slots=new Map(),neighbors=new Map(data.pieces.map(p=>[p.id,[]]));
  for(const [a,b] of data.edges){neighbors.get(a)?.push(b);neighbors.get(b)?.push(a);}
  for(const p of [...data.pieces].sort((a,b)=>neighbors.get(b.id).length-neighbors.get(a.id).length)){
    const used=neighbors.get(p.id).map(n=>slots.get(n));let slot=0;
    for(let i=0;i<theme.palette.length;i++)if(!used.includes(i)){slot=i;break;}
    if(used.includes(slot))slot=p.id%theme.palette.length;
    slots.set(p.id,slot);colors.set(p.id,theme.palette[slot]);
  }
  return colors;
}
