"""Small atlas meshes for smooth, one-draw-call homepage turntables."""
import gzip,json
from pathlib import Path
import numpy as np
root=Path(__file__).resolve().parents[1];out=root/'public/previews'
for mode in ['easy','medium','hard']:
 d=json.loads((root/f'public/data/{mode}.json').read_text());buf=gzip.decompress((root/f'public/data/{mode}.bin.gz').read_bytes())
 neighbors={p['id']:[] for p in d['pieces']};slots={}
 for a,b in d['edges']:neighbors[a].append(b);neighbors[b].append(a)
 for p in sorted(d['pieces'],key=lambda p:-len(neighbors[p['id']])):
  used=[slots.get(n) for n in neighbors[p['id']]];slots[p['id']]=next((i for i in range(8) if i not in used),p['id']%8)
 positions=[];indices=[];regions=[];count=0
 for p in d['pieces']:
  v=np.frombuffer(buf,dtype='<f4',count=p['vertices']*3,offset=p['offset']).reshape(-1,3).astype(float)+np.array(p['center'])
  faces=np.frombuffer(buf,dtype='<u4',count=p['triangles']*3,offset=p['offset']+p['vertices']*12).reshape(-1,3)
  cells,inverse=np.unique(np.round(v/.22).astype(int),axis=0,return_inverse=True)
  sums=np.zeros((len(cells),3));np.add.at(sums,inverse,v);sums/=np.bincount(inverse)[:,None]
  f=inverse[faces];f=f[(f[:,0]!=f[:,1])&(f[:,1]!=f[:,2])&(f[:,0]!=f[:,2])]
  positions.append(sums.astype('<f4'));indices.append((f+count).astype('<u4'));regions.append({'start':count,'count':len(sums),'slot':slots[p['id']]});count+=len(sums)
 pos=np.concatenate(positions);idx=np.concatenate(indices);binary=pos.tobytes()+idx.tobytes()
 (out/f'{mode}-preview.bin.gz').write_bytes(gzip.compress(binary))
 (out/f'{mode}-preview.json').write_text(json.dumps({'vertices':len(pos),'triangles':len(idx),'regions':regions},separators=(',',':')))
 print(mode,len(pos),len(idx),len(gzip.compress(binary)),flush=True)
