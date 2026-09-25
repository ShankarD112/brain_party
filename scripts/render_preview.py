"""Render a lightweight menu thumbnail from the shipped atlas, without WebGL."""
import gzip, json
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
root = Path(__file__).resolve().parents[1]
data = json.loads((root/'public/data/easy.json').read_text())
buffer = gzip.decompress((root/'public/data/easy.bin.gz').read_bytes())
forward = np.array([1., .65, 1.1]); forward /= np.linalg.norm(forward)
right = np.cross([0,1,0],forward); right /= np.linalg.norm(right)
up = np.cross(forward,right)
light = np.array([.2,.85,1.]); light /= np.linalg.norm(light)
faces=[]
for p in data['pieces']:
 vertices=np.frombuffer(buffer,dtype='<f4',count=p['vertices']*3,offset=p['offset']).reshape(-1,3).astype(float)
 center=np.array(p['center']); vertices += center * 1.35
 indices=np.frombuffer(buffer,dtype='<u4',count=p['triangles']*3,offset=p['offset']+p['vertices']*12).reshape(-1,3)
 tri=vertices[indices];normals=np.cross(tri[:,1]-tri[:,0],tri[:,2]-tri[:,0]);normals/=np.maximum(np.linalg.norm(normals,axis=1,keepdims=True),1e-9)
 shade=.42+.58*np.abs(normals@light)
 color=np.array([int(p['color'].lstrip('#')[i:i+2],16) for i in (0,2,4)])
 xy=np.stack([tri@right,-tri@up],axis=-1)*50+420
 depth=tri.mean(axis=1)@forward
 for i in range(len(tri)):faces.append((depth[i],xy[i],tuple((color*shade[i]).astype(int))))
image=Image.new('RGBA',(900,900)); draw=ImageDraw.Draw(image)
for _,tri,color in sorted(faces,key=lambda f:f[0]):draw.polygon([tuple(v) for v in tri],fill=color+(255,))
image.resize((720,720),Image.Resampling.LANCZOS).save(root/'public/brain-preview.png',optimize=True)
