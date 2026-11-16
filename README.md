# Neural Universe

**A browser-based 3D laboratory for brain-inspired computational neural networks.**

Neural Universe combines an explorable Three.js neural field with a simulation engine running in a dedicated Web Worker. Neurons and synapses are computational entities; the 3D scene visualizes the live model state.

## Current capabilities (Alpha 0.2)

- Interactive Three.js 3D network with orbit, zoom, neuron selection and animated in-flight synaptic events.
- Simulation runs in a dedicated Web Worker, keeping numerical stepping off the browser UI thread.
- Configurable excitatory and inhibitory populations.
- Two neuron dynamics: leaky integrate-and-fire (LIF) and Izhikevich regular-spiking.
- Sparse, distance-biased recurrent connectivity with delayed synaptic event delivery.
- Basic pair-based spike-timing-dependent plasticity (STDP) approximation.
- Add neuron populations (up to 1,200 neurons in this prototype).
- Circuit editor: create and remove directed weighted synapses with configurable delays.
- Live membrane state, spike count, connectivity and network metrics.
- Responsive browser-first interface.

## Requirements

Node.js 20+ and npm 10+.

## Run locally

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

- `src/engine/BrainNetwork.ts` — computational model, neuron populations, delayed synaptic events, plasticity and snapshots.
- `src/engine/protocol.ts` — typed messages between the application and worker.
- `src/engine/simulation.worker.ts` — background simulation scheduler and command processor.
- `src/components/NeuralScene.tsx` — Three.js visualization, navigation, picking and signal rendering.
- `src/App.tsx` — browser laboratory interface, population builder and circuit editor.
- `src/style.css` — responsive presentation.

The worker owns simulation state. React receives periodic serializable snapshots. Three.js renders those snapshots and never performs neural computation.

## Scientific scope and limitations

This is an experimental software prototype, **not a validated biological brain model**. The LIF implementation is simplified. The Izhikevich implementation uses regular-spiking parameters with a basic numerical integration scheme. Connectivity is generated procedurally from spatial distance, and STDP is a basic pair-trace approximation. Detailed ion-channel dynamics, neurotransmitter chemistry, anatomical brain regions, calibrated biological datasets and validation studies are not yet implemented. Metrics and visualizations should be treated as exploratory rather than neuroscientific evidence.

## Next milestones

1. Add deterministic simulation/replay and automated unit tests for neuron and synapse dynamics.
2. Add population-specific parameter editing and configurable connection rules.
3. Add raster plots, membrane-potential traces, weight distributions and experiment export.
4. Add checkpointing and versioned experiment files.
5. Add optional Hodgkin–Huxley and additional Izhikevich firing patterns.
6. Evaluate performance and numerical behavior against published reference cases.

## License

No license has been selected yet. All rights remain with the repository owner until a license is added.
