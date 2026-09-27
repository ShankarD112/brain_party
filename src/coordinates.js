// Inverse of build_atlas.py: CCF AP,DV,ML voxel indices are centred at
// [264,160,228], scaled by .025 mm and reordered to game [ML,-DV,-AP].
export function atlasCoordinates([x,y,z]) {return {ML:x+5.7,DV:4-y,AP:6.6-z};}
export function pointOnSlice(x,y,{h,v,scale,mx,my,width,height},axis,level){
 const p=[0,0,0];p[h]=(x-width/2)/scale+mx;p[v]=(height/2-y)/scale+my;p[axis]=level;return p;
}
