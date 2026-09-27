// Intersect a triangle surface with a plane in atlas coordinates (millimetres).
// Shared edge intersections are joined into contours; holes use even-odd fill.
export function sectionContours(positions, indices, center, axis, level) {
  const axes = [0,1,2].filter(a => a !== axis), segments = [];
  const point = (id) => [0,1,2].map(a => positions[id*3+a]+center[a]);
  for (let i=0;i<indices.length;i+=3) {
    const vertices = [point(indices[i]),point(indices[i+1]),point(indices[i+2])];
    const hits=[];
    for(let e=0;e<3;e++) {
      const a=vertices[e],b=vertices[(e+1)%3],da=a[axis]-level,db=b[axis]-level;
      if((da<=0 && db>0)||(db<=0 && da>0)) {
        const t=da/(da-db);
        hits.push(axes.map(k=>a[k]+t*(b[k]-a[k])));
      }
    }
    if(hits.length===2) segments.push(hits);
  }
  const key=p=>p.map(x=>Math.round(x*10000)).join(',');
  const ends=new Map();
  segments.forEach((s,i)=>s.forEach(p=>{const k=key(p);if(!ends.has(k))ends.set(k,[]);ends.get(k).push(i);}));
  const used=new Set(), contours=[];
  for(let i=0;i<segments.length;i++) {
    if(used.has(i))continue;
    used.add(i);
    const line=[...segments[i]], first=key(line[0]);
    while(key(line.at(-1))!==first) {
      const last=key(line.at(-1)),next=(ends.get(last)||[]).find(id=>!used.has(id));
      if(next===undefined)break;
      used.add(next); const seg=segments[next];line.push(key(seg[0])===last?seg[1]:seg[0]);
    }
    contours.push({points:line,closed:key(line.at(-1))===first && line.length>3});
  }
  return contours;
}
