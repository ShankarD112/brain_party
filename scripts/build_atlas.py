import gzip
"""Derive all puzzle meshes and contact graphs from the unresampled 25 µm CCFv3.
Mesh decimation is rendering-only. Label coverage and contacts use original voxels.
"""
import argparse, json, hashlib, urllib.request
from pathlib import Path
import numpy as np
import nrrd
from scipy import ndimage
from skimage.measure import marching_cubes
import fast_simplification

SOURCES = {
 'annotation_25.nrrd': 'https://download.alleninstitute.org/informatics-archive/current-release/mouse_ccf/annotation/ccf_2017/annotation_25.nrrd',
 'structure_graph.json': 'https://api.brain-map.org/api/v2/structure_graph_download/1.json'
}
BROAD = {315,698,1089,703,477,803,549,1097,313,771,354,512,1009,73}

def main():
 p=argparse.ArgumentParser(); p.add_argument('--cache',default='.cache'); p.add_argument('--out',default='public/data'); args=p.parse_args()
 cache=Path(args.cache); cache.mkdir(parents=True,exist_ok=True)
 out=Path(args.out); out.mkdir(parents=True,exist_ok=True)
 for name,url in SOURCES.items():
  if not (cache/name).exists(): urllib.request.urlretrieve(url,cache/name)
 tree=json.loads((cache/'structure_graph.json').read_text())['msg'][0]; nodes={}; paths={}
 def walk(n,path):
  nodes[n['id']]=n; paths[n['id']]=path+[n['id']]
  for c in n['children']: walk(c,paths[n['id']])
 walk(tree,[])
 (out/'hierarchy.json').write_text(json.dumps({'source':SOURCES['structure_graph.json'],'nodes':[
  {'id':n['id'],'name':n['name'],'acronym':n['acronym'],'parent':n.get('parent_structure_id')} for n in nodes.values()
 ]},separators=(',',':')))
 vol,header=nrrd.read(str(cache/'annotation_25.nrrd'))
 assert vol.shape==(528,320,456), vol.shape
 assert np.allclose(np.linalg.norm(header['space directions'],axis=1),25)
 labels=np.unique(vol); labels=labels[labels!=0]
 assert all(int(i) in nodes for i in labels)
 # Dense IDs prevent enormous LUT allocations for large Allen structure IDs.
 dense=np.searchsorted(np.r_[0,labels],vol).astype(np.uint16); del vol
 def ancestor(label,mode):
  path=paths[int(label)]
  if mode=='hard': return int(label)
  k=next((j for j,v in enumerate(path) if v in BROAD),len(path)-1)
  return path[min(k+(2 if mode=='medium' else 0),len(path)-1)]
 manifest={'atlas':'Allen Mouse CCFv3 (2017)', 'resolutionUm':25,'shape':[528,320,456],
 'sources':SOURCES,'sha256':{n:hashlib.sha256((cache/n).read_bytes()).hexdigest() for n in SOURCES},
 'note':'All nonzero annotation labels retained, including residual parent labels, fiber tracts and ventricular systems. Bilateral regions are one piece. Surface meshes are decimated; adjacency uses original 25 µm voxels.', 'levels':{}}
 for mode in ['easy','medium','hard']:
  mapped=[ancestor(i,mode) for i in labels]; ids=sorted(set(mapped)); n=len(ids)
  lut=np.array([0]+[ids.index(i)+1 for i in mapped],dtype=np.uint16)
  v=lut[dense]; bounds=ndimage.find_objects(v); counts=np.bincount(v.ravel(),minlength=n+1)
  contacts=set()
  for axis in range(3):
   for i in range(v.shape[axis]-1):
    a=np.take(v,i,axis=axis).ravel().astype(np.uint32); b=np.take(v,i+1,axis=axis).ravel().astype(np.uint32)
    keep=(a!=b)&(a!=0)&(b!=0); a=a[keep]; b=b[keep]
    contacts.update(np.unique(np.minimum(a,b)*(n+1)+np.maximum(a,b)).tolist())
  edges=[[ids[c//(n+1)-1],ids[c%(n+1)-1]] for c in sorted(contacts)]
  chunks=[]; offset=0; pieces=[]
  for j,sid in enumerate(ids,1):
   sl=bounds[j-1]; mask=np.pad(v[sl]==j,1)
   verts,faces,_,_=marching_cubes(mask.astype(np.uint8),.5,allow_degenerate=False)
   verts+=np.array([s.start for s in sl])-1
   # CCF AP, DV, LR -> game X=LR, Y=-DV, Z=-AP in millimetres.
   verts=(verts-np.array([264,160,228]))*.025
   verts=verts[:,[2,1,0]]*np.array([1,-1,-1]); faces=faces[:,::-1].copy()
   budget=10000 if mode=='easy' else 2400 if mode=='medium' else 1000
   if len(faces)>budget:
    verts,faces=fast_simplification.simplify(verts,faces,target_count=budget,agg=5)
   center=(verts.min(axis=0)+verts.max(axis=0))/2
   radius=float(np.linalg.norm(verts-center,axis=1).max())
   vertex_data=(verts-center).astype('<f4').tobytes(); face_data=faces.astype('<u4').tobytes()
   node=nodes[sid]
   pieces.append({'id':sid,'name':node['name'],'acronym':node['acronym'],'color':'#'+node['color_hex_triplet'],
    'center':center.tolist(),'radius':radius,'voxels':int(counts[j]),'path':[nodes[i]['name'] for i in paths[sid]],
    'offset':offset,'vertices':len(verts),'triangles':len(faces)})
   chunks.extend([vertex_data,face_data]); offset+=len(vertex_data)+len(face_data)
   if j%50==0: print(mode,j,'/',n,flush=True)
  (out/f'{mode}.bin.gz').write_bytes(gzip.compress(b''.join(chunks), compresslevel=9, mtime=0))
  # Graph components are exposed: isolated labels may dock to the anatomical guide.
  neighbors={i:set() for i in ids}
  for a,b in edges: neighbors[a].add(b); neighbors[b].add(a)
  remaining=set(ids); components=[]
  while remaining:
   stack=[min(remaining)]; component=[]
   while stack:
    k=stack.pop()
    if k not in remaining: continue
    remaining.remove(k); component.append(k); stack.extend(neighbors[k]&remaining)
   components.append(sorted(component))
  level={'pieces':pieces,'edges':edges,'components':components}
  (out/f'{mode}.json').write_text(json.dumps(level,separators=(',',':')))
  assert sum(p['voxels'] for p in pieces)==int((dense!=0).sum())
  manifest['levels'][mode]={'pieces':n,'triangles':sum(p['triangles'] for p in pieces),'components':len(components),'bytes':offset}
  print(mode,manifest['levels'][mode],flush=True)
 (out/'manifest.json').write_text(json.dumps(manifest,indent=2))
if __name__=='__main__': main()

