# Neural Universe

**An interactive browser-based 3D laboratory for brain-inspired computational neural networks.**

Neural Universe combines an explorable Three.js neural field with a computational spiking-network engine running in a dedicated Web Worker. Neurons and synapses are computational entities; the 3D scene visualizes the live model state.

## Current capabilities (Alpha 0.3)

- Organic 3D neuron bodies with procedurally generated branching dendritic morphology.
- Curved, tapered synaptic fibres with optional full-network visibility and selected-neuron pathway emphasis.
- Animated signal particles following the same curved synaptic paths used by the model.
- Population halos and labels to make the network's spatial organization readable.
- Interactive Three.js camera, orbit, zoom, neuron picking and live state highlighting.
- Dedicated Web Worker simulation, keeping numerical stepping off the browser UI thread.
- Configurable excitatory and inhibitory populations.
- Two experimental neuron dynamics: leaky integrate-and-fire (LIF) and Izhikevich regular-spiking.
- Sparse distance-biased recurrent connectivity with delayed synaptic event delivery.
- Basic pair-based spike-timing-dependent plasticity (STDP) approximation.
- Add neuron populations (up to 1,200 neurons in this prototype).
- Circuit editor for creating and removing directed, weighted synapses with configurable delay.
- Live membrane state, spike count, connectivity and network metrics.
- Responsive browser-first interface.

## Run locally

Requirements: Node.js 20+ and npm 10+.

```bash
npm install
npm run dev
```

Vite prints the local URL (normally http://localhost:5173).

## Production build

```bash
npm run build
npm run preview
```

## Architecture

- `src/engine/BrainNetwork.ts` — computational model, populations, delayed synaptic events, plasticity and snapshots.
- `src/engine/protocol.ts` — typed messages between the application and worker.
- `src/engine/simulation.worker.ts` — background simulation scheduler and command processor.
- `src/components/NeuralScene.tsx` — organic 3D morphology, curved pathways, signal particles, navigation and neuron picking.
- `src/App.tsx` — browser laboratory interface, population builder, pathway controls and circuit editor.
- `src/style.css` — responsive application presentation.

The worker owns simulation state. React receives periodic serializable snapshots. Three.js renders those snapshots and never performs neural computation.

## Scientific scope and limitations

This is an experimental software prototype, **not a validated biological brain model**. The LIF implementation is simplified. The Izhikevich implementation uses regular-spiking parameters with a basic numerical integration scheme. The spatial positions, dendritic branches and synaptic fibre shapes are illustrative visual geometry, not reconstructed anatomy. Connectivity is generated procedurally from spatial distance, and STDP is a basic pair-trace approximation. Detailed ion-channel dynamics, neurotransmitter chemistry, anatomical brain regions, calibrated biological datasets and validation studies are not yet implemented. Metrics and visualizations should be treated as exploratory rather than neuroscientific evidence.

## Next milestones

1. Automated unit tests for neuron and synapse dynamics, including deterministic simulation/replay.
2. Population-specific parameter editing and configurable connectivity rules.
3. Raster plots, membrane-potential traces, weight distributions and experiment export.
4. Checkpointing and versioned experiment files.
5. Additional validated neuron models and benchmarks against published reference cases.
6. Cloud projects and collaboration after the local browser simulation is stable.

## License

No license has been selected yet. All rights remain with the repository owner until a license is added.
