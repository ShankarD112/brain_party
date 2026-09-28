import { Mesh, ShaderMaterial, BackSide } from 'three';

// Reuse the anatomical geometry; a thin back-face shell draws its silhouette.
export function setCartoonOutline(mesh, enabled) {
  let outline=mesh.userData.cartoonOutline;
  if(enabled&&!outline){
    const material=new ShaderMaterial({
      side:BackSide,
      vertexShader:'void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position+normal*0.025,1.0);}',
      fragmentShader:'void main(){gl_FragColor=vec4(0.025,0.018,0.045,1.0);}',
    });
    outline=new Mesh(mesh.geometry,material);outline.raycast=()=>{};
    mesh.add(outline);mesh.userData.cartoonOutline=outline;
  }
  if(outline)outline.visible=enabled;
}
