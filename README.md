# Neural Universe

**A browser-based interactive 3D laboratory for brain-inspired computational neural networks.**

Neural Universe presents a live spiking neural simulation as an explorable 3D environment. Neurons are computational units; synapses are weighted, directed connections; the 3D scene visualizes the running model state.

## Features in v0.1.0

- Three.js 3D neural field with orbit, zoom and neuron selection.
- Leaky integrate-and-fire (LIF) neuron dynamics.
- Excitatory and inhibitory neuron populations.
- Sparse, distance-biased recurrent synaptic connectivity.
- Delayed synaptic event delivery.
- Pair-based spike-timing-dependent plasticity (STDP) approximation.
- External population stimulation, pause/resume, reset and speed controls.
- Live membrane-state inspector and network metrics.
- Responsive browser interface.

## Requirements

Node.js 20+ and npm 10+.

## Local development

```bash
npm install
npm run dev
```

Open the local address printed by Vite (normally http://localhost:5173).

## Production build

```bash
npm run build
npm run preview
```

## Architecture

- `src/engine/BrainNetwork.ts` — computational network state and simulation stepping.
- `src/components/NeuralScene.tsx` — Three.js rendering and interaction.
- `src/App.tsx` — laboratory UI, controls and metrics.
- `src/style.css` — responsive interface styling.

The simulation owns neuron and synapse state. The renderer reads that state and visualizes it; it does not determine neural computation.

## Scientific scope and limitations

This is an experimental software prototype, **not a validated biological brain model**. It uses a simplified leaky integrate-and-fire model, distance-biased random connectivity, stochastic background input and a basic pair-based STDP rule. Parameters are illustrative. Detailed ion-channel dynamics, neurotransmitter chemistry, anatomical brain regions and validated biological datasets are not implemented. It does not claim brain-level intelligence.

## Roadmap

1. Move simulation stepping into a Web Worker and make simulation time deterministic.
2. Add configurable neuron populations, connection rules and parameter editors.
3. Add raster plots, membrane-potential traces, weight distributions and experiment export.
4. Add checkpointing and versioned experiment files.
5. Add persistent projects and collaboration for cloud workflows.
6. Add optional Izhikevich and Hodgkin–Huxley neuron models.

## License

No license has been selected yet. All rights remain with the repository owner until a license is added.
