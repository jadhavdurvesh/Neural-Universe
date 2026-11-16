import {useEffect,useRef} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import type {NetworkSnapshot} from '../engine/BrainNetwork';
type Props={snapshot:NetworkSnapshot;running:boolean;selected:number|null;onSelect:(id:number|null)=>void};
export default function NeuralScene({snapshot,running,selected,onSelect}:Props){
 const host=useRef<HTMLDivElement>(null);
 const state=useRef({snapshot,running,selected,onSelect});
 state.current={snapshot,running,selected,onSelect};
 useEffect(()=>{
  const root=host.current;if(!root)return;
  const scene=new THREE.Scene();scene.background=new THREE.Color('#080c14');scene.fog=new THREE.FogExp2('#080c14',.018);
  const camera=new THREE.PerspectiveCamera(55,1,.1,200);camera.position.set(0,5,19);
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.6));renderer.outputColorSpace=THREE.SRGBColorSpace;root.appendChild(renderer.domElement);
  const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.055;controls.minDistance=4;controls.maxDistance=48;
  scene.add(new THREE.AmbientLight(0x8096c0,1.1));const light=new THREE.PointLight(0x4b9dff,2.2,38);light.position.set(4,7,8);scene.add(light);
  const grid=new THREE.GridHelper(34,34,0x1d334d,0x132235);grid.position.y=-6.5;scene.add(grid);
  const starGeo=new THREE.BufferGeometry(),starPositions=new Float32Array(420*3);
  for(let i=0;i<420;i++){starPositions[i*3]=(Math.random()-.5)*58;starPositions[i*3+1]=(Math.random()-.5)*36;starPositions[i*3+2]=(Math.random()-.5)*58;}
  starGeo.setAttribute('position',new THREE.BufferAttribute(starPositions,3));const stars=new THREE.Points(starGeo,new THREE.PointsMaterial({color:0x52718f,size:.035,transparent:true,opacity:.55}));scene.add(stars);
  const nodeGeometry=new THREE.BufferGeometry(),nodePositions=new Float32Array(snapshot.neurons.length*3),nodeColors=new Float32Array(snapshot.neurons.length*3);
  nodeGeometry.setAttribute('position',new THREE.BufferAttribute(nodePositions,3));nodeGeometry.setAttribute('color',new THREE.BufferAttribute(nodeColors,3));
  const nodeMaterial=new THREE.PointsMaterial({size:.19,vertexColors:true,transparent:true,opacity:.98,sizeAttenuation:true});const nodes=new THREE.Points(nodeGeometry,nodeMaterial);scene.add(nodes);
  const edgeGeometry=new THREE.BufferGeometry(),edgePositions=new Float32Array(snapshot.synapses.length*6),edgeColors=new Float32Array(snapshot.synapses.length*6);
  edgeGeometry.setAttribute('position',new THREE.BufferAttribute(edgePositions,3));edgeGeometry.setAttribute('color',new THREE.BufferAttribute(edgeColors,3));
  const edgeMaterial=new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.23,depthWrite:false});const edges=new THREE.LineSegments(edgeGeometry,edgeMaterial);scene.add(edges);
  const signalGeometry=new THREE.BufferGeometry();signalGeometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(0),3));
  const signalMaterial=new THREE.PointsMaterial({color:0xffe9a4,size:.14,transparent:true,opacity:.98});const signalPoints=new THREE.Points(signalGeometry,signalMaterial);scene.add(signalPoints);
  const selectedMarker=new THREE.Mesh(new THREE.SphereGeometry(.29,16,16),new THREE.MeshBasicMaterial({color:0xffffff,wireframe:true,transparent:true,opacity:.9}));selectedMarker.visible=false;scene.add(selectedMarker);
  const raycaster=new THREE.Raycaster();raycaster.params.Points={threshold:.32};const pointer=new THREE.Vector2();let down:{x:number;y:number}|null=null;
  const onPointerDown=(event:PointerEvent)=>{down={x:event.clientX,y:event.clientY};};
  const onPointerUp=(event:PointerEvent)=>{
   if(!down||Math.hypot(event.clientX-down.x,event.clientY-down.y)>5){down=null;return;}down=null;
   const rect=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);
   const hit=raycaster.intersectObject(nodes);if(hit.length&&hit[0].index!==undefined)state.current.onSelect(hit[0].index);else state.current.onSelect(null);
  };
  renderer.domElement.addEventListener('pointerdown',onPointerDown);renderer.domElement.addEventListener('pointerup',onPointerUp);
  let frame=0;const resize=()=>{const w=root.clientWidth||1,h=root.clientHeight||1;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);};
  const observer=new ResizeObserver(resize);observer.observe(root);resize();
  const animate=()=>{
   frame=requestAnimationFrame(animate);controls.update();const current=state.current,net=current.snapshot;
   for(let i=0;i<net.neurons.length;i++){
    const n=net.neurons[i],k=i*3;nodePositions[k]=n.x;nodePositions[k+1]=n.y;nodePositions[k+2]=n.z;
    const color=n.kind==='inhibitory'?new THREE.Color('#ff8a72'):new THREE.Color(n.model==='izhikevich'?'#b49aff':'#64caff');
    color.lerp(new THREE.Color('#fff0a8'),Math.min(1,n.activity*.9));if(current.selected===i)color.set('#ffffff');
    nodeColors[k]=color.r;nodeColors[k+1]=color.g;nodeColors[k+2]=color.b;
   }
   nodeGeometry.attributes.position.needsUpdate=true;nodeGeometry.attributes.color.needsUpdate=true;
   for(let i=0;i<net.synapses.length;i++){
    const s=net.synapses[i],a=net.neurons[s.from],b=net.neurons[s.to],k=i*6;edgePositions.set([a.x,a.y,a.z,b.x,b.y,b.z],k);
    const c=s.weight<0?new THREE.Color('#ff806e'):new THREE.Color('#477ca8'),alpha=Math.min(.85,.12+Math.abs(s.weight)*.075);
    edgeColors.set([c.r*alpha,c.g*alpha,c.b*alpha,c.r*alpha,c.g*alpha,c.b*alpha],k);
   }
   edgeGeometry.attributes.position.needsUpdate=true;edgeGeometry.attributes.color.needsUpdate=true;
   const pulse=new Float32Array(net.signals.length*3);
   net.signals.forEach((signal,i)=>{const a=net.neurons[signal.from],b=net.neurons[signal.to],t=signal.progress,k=i*3;pulse[k]=a.x+(b.x-a.x)*t;pulse[k+1]=a.y+(b.y-a.y)*t;pulse[k+2]=a.z+(b.z-a.z)*t;});
   signalGeometry.setAttribute('position',new THREE.BufferAttribute(pulse,3));
   if(current.selected!==null&&net.neurons[current.selected]){const n=net.neurons[current.selected];selectedMarker.position.set(n.x,n.y,n.z);selectedMarker.visible=true;selectedMarker.rotation.x+=.006;selectedMarker.rotation.y+=.009;}else selectedMarker.visible=false;
   if(current.running)nodes.rotation.y+=.00012;stars.rotation.y+=.00002;renderer.render(scene,camera);
  };animate();
  return()=>{
   cancelAnimationFrame(frame);observer.disconnect();renderer.domElement.removeEventListener('pointerdown',onPointerDown);renderer.domElement.removeEventListener('pointerup',onPointerUp);controls.dispose();
   nodeGeometry.dispose();nodeMaterial.dispose();edgeGeometry.dispose();edgeMaterial.dispose();signalGeometry.dispose();signalMaterial.dispose();starGeo.dispose();
   (selectedMarker.geometry as THREE.BufferGeometry).dispose();(selectedMarker.material as THREE.Material).dispose();renderer.dispose();if(root.contains(renderer.domElement))root.removeChild(renderer.domElement);
  };
 },[snapshot.topologyVersion]);
 return <div className="scene-host" ref={host}><div className="scene-hint">DRAG TO ORBIT <span>•</span> SCROLL TO ZOOM <span>•</span> SELECT A NEURON</div></div>;
}
