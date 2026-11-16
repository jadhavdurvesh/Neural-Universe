import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { NetworkSnapshot } from '../engine/BrainNetwork';

type Props = {
  snapshot: NetworkSnapshot;
  running: boolean;
  selected: number | null;
  showConnections: boolean;
  onSelect: (id: number | null) => void;
};
type EdgePath = { from: number; to: number; curve: THREE.QuadraticBezierCurve3; firstInstance: number; segmentCount: number; weight: number };

const UP = new THREE.Vector3(0, 1, 0);
const dummy = new THREE.Object3D();
const seeded = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

function setSegment(mesh: THREE.InstancedMesh, index: number, start: THREE.Vector3, end: THREE.Vector3, radius: number) {
  const direction = new THREE.Vector3().subVectors(end, start);
  const length = direction.length();
  if (length < 0.0001) return;
  dummy.position.copy(start).add(end).multiplyScalar(0.5);
  dummy.quaternion.setFromUnitVectors(UP, direction.normalize());
  dummy.scale.set(radius, length, radius);
  dummy.updateMatrix();
  mesh.setMatrixAt(index, dummy.matrix);
}

function neuronColor(kind: string, model: string) {
  if (kind === 'inhibitory') return new THREE.Color('#ff907e');
  return model === 'izhikevich' ? new THREE.Color('#b49aff') : new THREE.Color('#78d7ff');
}

function makeLabelTexture(label: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 112;
  const context = canvas.getContext('2d')!;
  context.fillStyle = 'rgba(7, 15, 27, 0.72)';
  context.strokeStyle = 'rgba(107, 174, 215, 0.24)';
  context.lineWidth = 2;
  context.beginPath();
  context.roundRect(8, 8, 496, 96, 22);
  context.fill(); context.stroke();
  context.font = '600 30px ui-monospace, SFMono-Regular, Menlo, monospace';
  context.fillStyle = '#b9dbf0';
  context.textAlign = 'center'; context.textBaseline = 'middle';
  context.fillText(label.toUpperCase(), 256, 57, 460);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default function NeuralScene({ snapshot, running, selected, showConnections, onSelect }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const state = useRef({ snapshot, running, selected, showConnections, onSelect });
  state.current = { snapshot, running, selected, showConnections, onSelect };

  useEffect(() => {
    const root = host.current;
    if (!root) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#070d17');
    scene.fog = new THREE.FogExp2('#070d17', 0.015);
    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 220);
    camera.position.set(0, 5.2, 17.5);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.65));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    root.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.055;
    controls.minDistance = 4.5;
    controls.maxDistance = 42;
    controls.target.set(0, 0.1, 0);

    scene.add(new THREE.HemisphereLight(0x9fcfff, 0x101827, 1.6));
    const keyLight = new THREE.PointLight(0x64bfff, 3.2, 34);
    keyLight.position.set(-2, 7, 7);
    scene.add(keyLight);
    const rimLight = new THREE.PointLight(0x6a58d9, 2.1, 28);
    rimLight.position.set(5, -1, -7);
    scene.add(rimLight);

    // Deep-space particles and a restrained orbital reference plane.
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(680 * 3);
    for (let i = 0; i < 680; i++) {
      starPositions[i * 3] = (Math.random() - 0.5) * 62;
      starPositions[i * 3 + 1] = (Math.random() - 0.5) * 42;
      starPositions[i * 3 + 2] = (Math.random() - 0.5) * 62;
    }
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const stars = new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0x7897b8, size: 0.025, transparent: true, opacity: 0.5, sizeAttenuation: true }));
    scene.add(stars);

    for (const radius of [5.6, 6.3, 7.0]) {
      const ringGeometry = new THREE.BufferGeometry();
      const ringPoints = new THREE.Path().absarc(0, 0, radius, 0, Math.PI * 2, false).getPoints(160);
      ringGeometry.setFromPoints(ringPoints);
      const ring = new THREE.LineLoop(ringGeometry, new THREE.LineBasicMaterial({ color: 0x294766, transparent: true, opacity: 0.22 }));
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = -4.2;
      scene.add(ring);
    }

    const populationColors = ['#3baedb', '#a58bff', '#ff8b77', '#66d6b3', '#e5b66f'];
    for (let i = 0; i < snapshot.populations.length; i++) {
      const population = snapshot.populations[i];
      const center = new THREE.Vector3(...population.center);
      const color = new THREE.Color(population.kind === 'inhibitory' ? '#ff8b77' : populationColors[i % populationColors.length]);
      const shell = new THREE.Mesh(
        new THREE.SphereGeometry(1.7, 28, 20),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.026, depthWrite: false, side: THREE.BackSide }),
      );
      shell.position.copy(center);
      scene.add(shell);
      const orbit = new THREE.Mesh(
        new THREE.TorusGeometry(1.48, 0.006, 5, 84),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.22 }),
      );
      orbit.position.copy(center);
      orbit.rotation.x = Math.PI / 2.8;
      scene.add(orbit);
      const texture = makeLabelTexture(population.name);
      const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, opacity: 0.84 }));
      label.position.copy(center).add(new THREE.Vector3(0, 2.05, 0));
      label.scale.set(2.15, 0.47, 1);
      scene.add(label);
    }

    // Neuron bodies are real rounded meshes, not square point sprites.
    const neurons = snapshot.neurons;
    const somaGeometry = new THREE.SphereGeometry(0.105, 18, 14);
    const somaMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.32, metalness: 0.12, emissive: 0x14334b, emissiveIntensity: 0.75 });
    const somaMesh = new THREE.InstancedMesh(somaGeometry, somaMaterial, neurons.length);
    somaMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const neuronPositions: THREE.Vector3[] = [];
    for (let i = 0; i < neurons.length; i++) {
      const neuron = neurons[i];
      const position = new THREE.Vector3(neuron.x, neuron.y, neuron.z);
      neuronPositions.push(position);
      dummy.position.copy(position);
      const scale = neuron.model === 'izhikevich' ? 1.12 : 1;
      dummy.scale.setScalar(scale);
      dummy.quaternion.identity();
      dummy.updateMatrix();
      somaMesh.setMatrixAt(i, dummy.matrix);
      somaMesh.setColorAt(i, neuronColor(neuron.kind, neuron.model));
    }
    somaMesh.instanceMatrix.needsUpdate = true;
    if (somaMesh.instanceColor) somaMesh.instanceColor.needsUpdate = true;
    scene.add(somaMesh);

    // Procedural dendritic trees: tapered branching processes attached to each soma.
    const primaryBranches = 6;
    const branchesPerNeuron = primaryBranches * 3;
    const branchGeometry = new THREE.CylinderGeometry(0.42, 1, 1, 6, 1, false);
    const branchMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.48, metalness: 0.03, emissive: 0x0c2639, emissiveIntensity: 0.55 });
    const dendrites = new THREE.InstancedMesh(branchGeometry, branchMaterial, Math.max(1, neurons.length * branchesPerNeuron));
    let branchIndex = 0;
    for (const neuron of neurons) {
      const origin = neuronPositions[neuron.id];
      for (let branch = 0; branch < primaryBranches; branch++) {
        const y = 1 - 2 * (branch + 0.5) / primaryBranches;
        const radial = Math.sqrt(1 - y * y);
        const angle = branch * 2.399963 + neuron.id * 0.37;
        const direction = new THREE.Vector3(Math.cos(angle) * radial, y, Math.sin(angle) * radial).normalize();
        const length = 0.31 + seeded(neuron.id * 31 + branch * 7) * 0.25;
        const start = origin.clone().addScaledVector(direction, 0.065);
        const end = origin.clone().addScaledVector(direction, length);
        setSegment(dendrites, branchIndex, start, end, 0.012);
        dendrites.setColorAt(branchIndex++, neuronColor(neuron.kind, neuron.model).multiplyScalar(0.72));

        let tangent = new THREE.Vector3().crossVectors(direction, UP);
        if (tangent.lengthSq() < 0.05) tangent = new THREE.Vector3().crossVectors(direction, new THREE.Vector3(1, 0, 0));
        tangent.normalize();
        const split = start.clone().lerp(end, 0.61);
        const sideA = direction.clone().multiplyScalar(0.3).addScaledVector(tangent, seeded(neuron.id * 13 + branch) > 0.5 ? 0.92 : -0.92).normalize();
        const tipA = split.clone().addScaledVector(sideA, 0.19 + seeded(neuron.id * 19 + branch) * 0.12);
        setSegment(dendrites, branchIndex, split, tipA, 0.0065);
        dendrites.setColorAt(branchIndex++, neuronColor(neuron.kind, neuron.model).multiplyScalar(0.62));

        const sideB = direction.clone().multiplyScalar(0.32).addScaledVector(tangent, sideA.dot(tangent) > 0 ? -0.85 : 0.85).normalize();
        const tipB = end.clone().addScaledVector(sideB, 0.13 + seeded(neuron.id * 23 + branch) * 0.1);
        setSegment(dendrites, branchIndex, end.clone().lerp(tipB, 0.18), tipB, 0.005);
        dendrites.setColorAt(branchIndex++, neuronColor(neuron.kind, neuron.model).multiplyScalar(0.55));
      }
    }
    dendrites.count = branchIndex;
    dendrites.instanceMatrix.needsUpdate = true;
    if (dendrites.instanceColor) dendrites.instanceColor.needsUpdate = true;
    scene.add(dendrites);

    // Curved, tapered synaptic fibres replace the old straight-line web.
    const segmentsPerPath = 8;
    const edgeGeometry = new THREE.CylinderGeometry(0.58, 1, 1, 5, 1, false);
    const edgeMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: true, transparent: true, opacity: 0.34, depthWrite: false });
    const edgeMesh = new THREE.InstancedMesh(edgeGeometry, edgeMaterial, Math.max(1, snapshot.synapses.length * segmentsPerPath));
    edgeMesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    const edgePaths: EdgePath[] = [];
    const edgeLookup = new Map<string, THREE.QuadraticBezierCurve3>();
    let edgeSlot = 0;
    for (const synapse of snapshot.synapses) {
      const from = neuronPositions[synapse.from], to = neuronPositions[synapse.to];
      if (!from || !to) continue;
      const direction = new THREE.Vector3().subVectors(to, from).normalize();
      let perpendicular = new THREE.Vector3().crossVectors(direction, UP);
      if (perpendicular.lengthSq() < 0.05) perpendicular = new THREE.Vector3().crossVectors(direction, new THREE.Vector3(1, 0, 0));
      perpendicular.normalize();
      const distance = from.distanceTo(to);
      const bend = (seeded(synapse.from * 97 + synapse.to * 17) > 0.5 ? 1 : -1) * (0.13 + seeded(synapse.from * 11 + synapse.to * 29) * 0.22 + distance * 0.035);
      const start = from.clone().addScaledVector(direction, 0.095);
      const end = to.clone().addScaledVector(direction, -0.095);
      const control = start.clone().add(end).multiplyScalar(0.5).addScaledVector(perpendicular, bend);
      control.y += (seeded(synapse.from * 7 + synapse.to * 43) - 0.5) * 0.18;
      const curve = new THREE.QuadraticBezierCurve3(start, control, end);
      const points = curve.getPoints(segmentsPerPath);
      const firstInstance = edgeSlot;
      const radius = 0.0045 + Math.min(0.003, Math.abs(synapse.weight) * 0.0007);
      for (let segment = 0; segment < segmentsPerPath; segment++) {
        setSegment(edgeMesh, edgeSlot, points[segment], points[segment + 1], radius);
        const color = neuronColor(neurons[synapse.from].kind, neurons[synapse.from].model).multiplyScalar(0.25);
        edgeMesh.setColorAt(edgeSlot, color);
        edgeSlot++;
      }
      edgePaths.push({ from: synapse.from, to: synapse.to, curve, firstInstance, segmentCount: segmentsPerPath, weight: synapse.weight });
      edgeLookup.set(`${synapse.from}:${synapse.to}`, curve);
    }
    edgeMesh.count = edgeSlot;
    edgeMesh.instanceMatrix.needsUpdate = true;
    if (edgeMesh.instanceColor) edgeMesh.instanceColor.needsUpdate = true;
    scene.add(edgeMesh);

    // Spikes are glowing particles that travel along the same curved synaptic paths.
    const signalCapacity = Math.max(32, Math.min(6000, snapshot.synapses.length * 2));
    const signalGeometry = new THREE.SphereGeometry(0.036, 9, 7);
    const signalMaterial = new THREE.MeshBasicMaterial({ color: '#fff0b2', transparent: true, opacity: 0.96, depthWrite: false });
    const signals = new THREE.InstancedMesh(signalGeometry, signalMaterial, signalCapacity);
    signals.count = 0;
    scene.add(signals);

    const selectionHalo = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 20, 16),
      new THREE.MeshBasicMaterial({ color: '#e4f6ff', wireframe: true, transparent: true, opacity: 0.75 }),
    );
    selectionHalo.visible = false;
    scene.add(selectionHalo);

    const raycaster = new THREE.Raycaster();
    raycaster.params.Mesh = { threshold: 0.1 };
    const pointer = new THREE.Vector2();
    let pointerDown: { x: number; y: number } | null = null;
    const onPointerDown = (event: PointerEvent) => { pointerDown = { x: event.clientX, y: event.clientY }; };
    const onPointerUp = (event: PointerEvent) => {
      if (!pointerDown || Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y) > 5) { pointerDown = null; return; }
      pointerDown = null;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      const intersections = raycaster.intersectObject(somaMesh);
      if (intersections.length && intersections[0].instanceId !== undefined) state.current.onSelect(intersections[0].instanceId);
      else state.current.onSelect(null);
    };
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

    let frame = 0;
    const resize = () => {
      const width = root.clientWidth || 1, height = root.clientHeight || 1;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(root);
    resize();

    const animate = () => {
      frame = requestAnimationFrame(animate);
      controls.update();
      const current = state.current;
      const net = current.snapshot;

      for (let i = 0; i < net.neurons.length; i++) {
        const neuron = net.neurons[i];
        const color = neuronColor(neuron.kind, neuron.model);
        color.lerp(new THREE.Color('#fff1bd'), Math.min(0.92, neuron.activity * 0.92));
        if (current.selected === i) color.lerp(new THREE.Color('#ffffff'), 0.7);
        somaMesh.setColorAt(i, color);
      }
      if (somaMesh.instanceColor) somaMesh.instanceColor.needsUpdate = true;

      edgeMesh.visible = current.showConnections || current.selected !== null;
      for (const edge of edgePaths) {
        const selectedPath = current.selected !== null && (edge.from === current.selected || edge.to === current.selected);
        const intensity = selectedPath ? 1.1 : current.showConnections ? 0.22 : 0;
        const color = neuronColor(net.neurons[edge.from].kind, net.neurons[edge.from].model).multiplyScalar(intensity);
        for (let k = 0; k < edge.segmentCount; k++) edgeMesh.setColorAt(edge.firstInstance + k, color);
      }
      if (edgeMesh.instanceColor) edgeMesh.instanceColor.needsUpdate = true;

      let visibleSignals = 0;
      for (const signal of net.signals) {
        if (visibleSignals >= signalCapacity) break;
        const curve = edgeLookup.get(`${signal.from}:${signal.to}`);
        if (!curve) continue;
        const position = curve.getPoint(Math.max(0, Math.min(1, signal.progress)));
        dummy.position.copy(position);
        const scale = 0.75 + Math.min(1.4, Math.abs(signal.weight) * 0.18);
        dummy.scale.setScalar(scale);
        dummy.quaternion.identity();
        dummy.updateMatrix();
        signals.setMatrixAt(visibleSignals, dummy.matrix);
        signals.setColorAt(visibleSignals, signal.weight < 0 ? new THREE.Color('#ffad9a') : new THREE.Color('#fff0b2'));
        visibleSignals++;
      }
      signals.count = visibleSignals;
      if (visibleSignals) {
        signals.instanceMatrix.needsUpdate = true;
        if (signals.instanceColor) signals.instanceColor.needsUpdate = true;
      }

      if (current.selected !== null && neuronPositions[current.selected]) {
        selectionHalo.position.copy(neuronPositions[current.selected]);
        selectionHalo.visible = true;
        selectionHalo.rotation.x += 0.004;
        selectionHalo.rotation.y += 0.007;
      } else selectionHalo.visible = false;

      if (current.running) somaMesh.rotation.y += 0.00008;
      stars.rotation.y += 0.000018;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      controls.dispose();
      somaGeometry.dispose(); somaMaterial.dispose();
      branchGeometry.dispose(); branchMaterial.dispose();
      edgeGeometry.dispose(); edgeMaterial.dispose();
      signalGeometry.dispose(); signalMaterial.dispose();
      starGeometry.dispose();
      (selectionHalo.geometry as THREE.BufferGeometry).dispose();
      (selectionHalo.material as THREE.Material).dispose();
      const managedObjects = new Set<THREE.Object3D>([somaMesh, dendrites, edgeMesh, signals, selectionHalo]);
      scene.traverse(object => {
        if (object instanceof THREE.Sprite) {
          const material = object.material as THREE.SpriteMaterial;
          material.map?.dispose();
          material.dispose();
        } else if (object instanceof THREE.Mesh && !managedObjects.has(object)) {
          (object.geometry as THREE.BufferGeometry).dispose();
          const material = object.material as THREE.Material | THREE.Material[];
          if (Array.isArray(material)) material.forEach(item => item.dispose()); else material.dispose();
        } else if (object instanceof THREE.Line || object instanceof THREE.LineLoop) {
          (object.geometry as THREE.BufferGeometry).dispose();
          const material = object.material as THREE.Material;
          material.dispose();
        }
      });
      renderer.dispose();
      if (root.contains(renderer.domElement)) root.removeChild(renderer.domElement);
    };
  }, [snapshot.topologyVersion]);

  return <div className="scene-host" ref={host}>
    <div className="scene-hint">DRAG TO EXPLORE <span>•</span> SCROLL TO FOCUS <span>•</span> SELECT A NEURON</div>
  </div>;
}
