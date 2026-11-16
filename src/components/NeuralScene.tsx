import {useEffect,useRef} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import type {BrainNetwork} from '../engine/BrainNetwork';
type Props={network:BrainNetwork;running:boolean;selected:number|null;onSelect:(id:number|null)=>void};
export default function NeuralScene({network,running,selected,onSelect}:Props){
 const host=useRef<HTMLDivElement>(null);const state=useRef({network,running,selected,onSelect});state.current={network,running,selected,onSelect};
 useEffect(()=>{const root=host.current;if(!root)return;
  const scene=new THREE.Scene();scene.background=new THREE.Color('#080c14');scene.fog=new THREE.FogExp2('#080c14',.022);
  const camera=new THREE.PerspectiveCamera(55,1,.1,200);camera.position.set(0,5,19);
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.7));renderer.outputColorSpace=THREE.SRGBColorSpace;root.appendChild(renderer.domElement);
  const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.055;controls.minDistance=5;controls.maxDistance=38;
  scene.add(new THREE.AmbientLight(0x8096c0,1.1));const key=new THREE.PointLight(0x4b9dff,2.2,30);key.position.set(4,7,8);scene.add(key);
  const grid=new THREE.GridHelper(30,30,0x1d334d,0x132235);grid.position.y=-6.1;scene.add(grid);
  const starGeo=new THREE.BufferGeometry(),starPos=new Float32Array(500*3);for(let i=0;i<500;i++){starPos[i*3]=(Math.random()-.5)*55;starPos[i*3+1]=(Math.random()-.5)*35;starPos[i*3+2]=(Math.random()-.5)*55;}starGeo.setAttribute('position',new THREE.BufferAttribute(starPos,3));const stars=new THREE.Points(starGeo,new THREE.PointsMaterial({color:0x52718f,size:.035,transparent:true,opacity:.55}));scene.add(stars);
  const count=network.neurons.length,positions=new Float32Array(count*3),colors=new Float32Array(count*3),geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
  const material=new THREE.PointsMaterial({size:.17,vertexColors:true,transparent:true,opacity:.98,sizeAttenuation:true});const points=new THREE.Points(geometry,material);scene.add(points);
  const edgePositions=new Float32Array(network.synapses.length*6),edgeColors=new Float32Array(network.synapses.length*6),edgeGeo=new THREE.BufferGeometry();edgeGeo.setAttribute('position',new THREE.BufferAttribute(edgePositions,3));edgeGeo.setAttribute('color',new THREE.BufferAttribute(edgeColors,3));
  const edgeMat=new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.22,depthWrite:false});const edges=new THREE.LineSegments(edgeGeo,edgeMat);scene.add(edges);
  const pulseGeo=new THREE.BufferGeometry();pulseGeo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(0),3));const pulseMat=new THREE.PointsMaterial({color:0xffffff,size:.11,transparent:true,opacity:.95});const pulses=new THREE.Points(pulseGeo,pulseMat);scene.add(pulses);
  const raycaster=new THREE.Raycaster();raycaster.params.Points={threshold:.28};const pointer=new THREE.Vector2();
  const click=(event:PointerEvent)=>{const rect=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObject(points);if(hit.length){const id=hit[0].index;if(id!==undefined)state.current.onSelect(id);}else state.current.onSelect(null);};
  renderer.domElement.addEventListener('pointerdown',click);let frame=0;
  const resize=()=>{const w=root.clientWidth||1,h=root.clientHeight||1;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);};const observer=new ResizeObserver(resize);observer.observe(root);resize();
  const animate=()=>{frame=requestAnimationFrame(animate);controls.update();const net=state.current.network;
   for(let i=0;i<net.neurons.length;i++){const n=net.neurons[i],k=i*3;positions[k]=n.x;positions[k+1]=n.y;positions[k+2]=n.z;const c=n.kind==='inhibitory'?new THREE.Color('#ff8a72'):new THREE.Color('#64caff');c.lerp(new THREE.Color('#fff0a8'),Math.min(1,n.activity*.9));if(state.current.selected===i)c.set('#ffffff');colors[k]=c.r;colors[k+1]=c.g;colors[k+2]=c.b;}
   geometry.attributes.position.needsUpdate=true;geometry.attributes.color.needsUpdate=true;
   for(let i=0;i<net.synapses.length;i++){const s=net.synapses[i],a=net.neurons[s.from],b=net.neurons[s.to],k=i*6;edgePositions.set([a.x,a.y,a.z,b.x,b.y,b.z],k);const c=s.weight<0?new THREE.Color('#ff806e'):new THREE.Color('#477ca8'),alpha=Math.min(.8,.12+Math.abs(s.weight)*.075);edgeColors.set([c.r*alpha,c.g*alpha,c.b*alpha,c.r*alpha,c.g*alpha,c.b*alpha],k);}
   edgeGeo.attributes.position.needsUpdate=true;edgeGeo.attributes.color.needsUpdate=true;
   const active=net.spikes,pulsePositions=new Float32Array(active.length*3);active.forEach((p,i)=>{const n=net.neurons[p.neuron];pulsePositions[i*3]=n.x;pulsePositions[i*3+1]=n.y;pulsePositions[i*3+2]=n.z;});pulseGeo.setAttribute('position',new THREE.BufferAttribute(pulsePositions,3));
   points.rotation.y+=state.current.running?.00035:0;stars.rotation.y+=.000025;renderer.render(scene,camera);
  };animate();
  return()=>{cancelAnimationFrame(frame);observer.disconnect();renderer.domElement.removeEventListener('pointerdown',click);controls.dispose();geometry.dispose();material.dispose();edgeGeo.dispose();edgeMat.dispose();pulseGeo.dispose();pulseMat.dispose();starGeo.dispose();renderer.dispose();root.removeChild(renderer.domElement);};
 },[]);
 return <div className="scene-host" ref={host}><div className="scene-hint">DRAG TO ORBIT <span>•</span> SCROLL TO ZOOM <span>•</span> SELECT A NEURON</div></div>;
}