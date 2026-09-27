"""Generate genuine atlas GIF turntables, with static reduced-motion posters."""
import gzip,json,colorsys
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw
root=Path(__file__).resolve().parents[1]
out=root/'public/previews';out.mkdir(exist_ok=True)
palettes={'sand':['#9c304f','#206a78','#7151a0','#ac5923','#287d5d','#3152a0','#93661c','#a53c89'],'ocean':['#ef8799','#68d5d4','#c4a4ef','#ffc17d','#a6dc85','#8ebaff','#ffe28a','#ee9bd3'],'midnight':['#fa899f','#75d8df','#c7a0f3','#ffc08a','#a4dc91','#8fb8ff','#ffe391','#f4a6d8']}
backgrounds={'sand':'#eee4d3','ocean':'#0d222d','midnight':'#191921'}
for mode in ['easy','medium','hard']:
 d=json.loads((root/f'public/data/{mode}.json').read_text());buf=gzip.decompress((root/f'public/data/{mode}.bin.gz').read_bytes())
 neighbors={p['id']:[] for p in d['pieces']};slots={}
 for a,b in d['edges']:neighbors[a].append(b);neighbors[b].append(a)
 for p in sorted(d['pieces'],key=lambda p:-len(neighbors[p['id']])):
  used=[slots.get(n) for n in neighbors[p['id']]];slots[p['id']]=next((i for i in range(8) if i not in used),p['id']%8)
 tris=[];cs=[]
 for p in d['pieces']:
  v=np.frombuffer(buf,dtype='<f4',count=p['vertices']*3,offset=p['offset']).reshape(-1,3).astype(float)+np.array(p['center'])*1.035
  idx=np.frombuffer(buf,dtype='<u4',count=p['triangles']*3,offset=p['offset']+p['vertices']*12).reshape(-1,3)
  tris.append(v[idx]);cs.extend([slots[p['id']]]*len(idx))
 tri=np.concatenate(tris);cs=np.array(cs);norm=np.cross(tri[:,1]-tri[:,0],tri[:,2]-tri[:,0]);norm/=np.maximum(np.linalg.norm(norm,axis=1,keepdims=True),1e-9)
 frames={k:[] for k in palettes}
 for f in range(16):
  angle=.6+f*2*np.pi/16;forward=np.array([np.sin(angle),.75,np.cos(angle)]);forward/=np.linalg.norm(forward)
  right=np.cross([0,1,0],forward);right/=np.linalg.norm(right);up=np.cross(forward,right)
  xy=np.stack([tri@right,-tri@up],axis=-1)*19+np.array([180,148]);order=np.argsort(tri.mean(axis=1)@forward)
  light=forward+np.array([0,1,0]);light/=np.linalg.norm(light);shade=.5+.5*np.abs(norm@light)
  polys=[list(map(tuple,p)) for p in xy]
  for theme,palette in palettes.items():
   rgb=np.array([[int(c[i:i+2],16) for i in (1,3,5)] for c in palette]);col=(rgb[cs]*shade[:,None]).astype('uint8')
   im=Image.new('RGB',(360,300),backgrounds[theme]);draw=ImageDraw.Draw(im)
   for i in order:draw.polygon(polys[i],fill=tuple(col[i]))
   frames[theme].append(im)
 for theme,ims in frames.items():
  ims[0].save(out/f'{theme}-{mode}.png');ims[0].save(out/f'{theme}-{mode}.gif',save_all=True,append_images=ims[1:],duration=110,loop=0,optimize=True)
 print(mode,flush=True)
