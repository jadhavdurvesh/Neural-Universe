import { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, Brain, Cable, CircleHelp, Eye, EyeOff, Gauge, Pause, Play, Plus, Radio, RotateCcw, Settings2, Sparkles, Zap } from 'lucide-react';
import NeuralScene from './components/NeuralScene';
import { DEFAULT_POPULATIONS, type NetworkSnapshot, type NeuronKind, type NeuronModel } from './engine/BrainNetwork';
import type { WorkerCommand, WorkerResponse } from './engine/protocol';

const EMPTY: NetworkSnapshot = { time: 0, totalSpikes: 0, meanActivity: 0, meanWeight: 0, neurons: [], synapses: [], populations: [], signals: [], topologyVersion: 0, plasticity: true };

export default function App() {
  const workerRef = useRef<Worker | null>(null);
  const [snapshot, setSnapshot] = useState<NetworkSnapshot>(EMPTY);
  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [selected, setSelected] = useState<number | null>(null);
  const [showConnections, setShowConnections] = useState(false);
  const [tab, setTab] = useState<'overview' | 'inspector'>('overview');
  const [workerError, setWorkerError] = useState('');
  const [populationName, setPopulationName] = useState('New population');
  const [populationCount, setPopulationCount] = useState(24);
  const [populationKind, setPopulationKind] = useState<NeuronKind>('excitatory');
  const [populationModel, setPopulationModel] = useState<NeuronModel>('lif');
  const [targetNeuron, setTargetNeuron] = useState('1');
  const [connectionWeight, setConnectionWeight] = useState('1.5');
  const [connectionDelay, setConnectionDelay] = useState('2');

  useEffect(() => {
    const worker = new Worker(new URL('./engine/simulation.worker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const message = event.data;
      if (message.type === 'SNAPSHOT') {
        setSnapshot(message.snapshot);
        setWorkerError('');
        setSelected(current => current !== null && current < message.snapshot.neurons.length ? current : null);
      } else setWorkerError(message.message);
    };
    worker.onerror = event => setWorkerError(event.message || 'The simulation worker failed to start.');
    worker.postMessage({ type: 'INIT', populations: DEFAULT_POPULATIONS } satisfies WorkerCommand);
    return () => { worker.terminate(); workerRef.current = null; };
  }, []);

  const selectedNeuron = selected === null ? null : snapshot.neurons[selected] ?? null;
  const selectedPopulation = selectedNeuron ? snapshot.populations.find(p => p.id === selectedNeuron.populationId) : null;
  const outgoing = useMemo(() => selected === null ? [] : snapshot.synapses.filter(s => s.from === selected), [snapshot.synapses, selected]);
  const incoming = useMemo(() => selected === null ? [] : snapshot.synapses.filter(s => s.to === selected), [snapshot.synapses, selected]);
  const firingRate = snapshot.time > 0 ? (snapshot.totalSpikes / (snapshot.time / 1000)).toFixed(1) : '0.0';
  const send = (command: WorkerCommand) => workerRef.current?.postMessage(command);

  const addPopulation = () => {
    const count = Math.max(1, Math.min(500, Math.floor(populationCount)));
    if (!Number.isFinite(count) || snapshot.neurons.length + count > 1200) {
      setWorkerError('The prototype currently supports up to 1,200 neurons.');
      return;
    }
    const index = snapshot.populations.length;
    send({ type: 'ADD_POPULATION', population: {
      name: populationName.trim() || `Population ${index + 1}`, count,
      model: populationModel, kind: populationKind,
      center: [((index % 5) - 2) * 2.8, (index % 2) * 2.2, ((index % 3) - 1) * 2.2],
    }});
    setPopulationName('New population');
    setWorkerError('');
  };

  const connect = () => {
    if (selected === null) return;
    const target = Number(targetNeuron), weight = Number(connectionWeight), delay = Number(connectionDelay);
    if (!Number.isInteger(target) || target < 0 || target >= snapshot.neurons.length) {
      setWorkerError('Target neuron ID is outside the current network.'); return;
    }
    if (!Number.isFinite(weight) || weight <= 0 || weight > 5 || !Number.isFinite(delay) || delay < 1 || delay > 100) {
      setWorkerError('Use a weight between 0 and 5 and a delay between 1 and 100 ms.'); return;
    }
    send({ type: 'CONNECT', from: selected, to: target, weight, delay: Math.floor(delay) });
    setWorkerError('');
  };

  const removeConnection = (from: number, to: number) => send({ type: 'DISCONNECT', from, to });

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand"><div className="brand-mark"><Brain size={20}/></div><div><div className="brand-name">NEURAL UNIVERSE</div><div className="brand-sub">BRAIN-INSPIRED COMPUTATIONAL LAB</div></div></div>
        <div className="top-status"><span className={running ? 'live-dot' : 'paused-dot'}/>{running ? 'SIMULATION RUNNING' : 'SIMULATION PAUSED'}<span className="version">WEB WORKER · ALPHA 0.2</span></div>
        <button className="icon-button" title="About this prototype"><CircleHelp size={17}/></button>
      </header>

      <div className="workspace">
        <aside className="left-panel">
          <div className="panel-label">EXPERIMENT</div>
          <div className="environment-card active"><div className="env-icon"><Brain size={18}/></div><div><b>Neural Universe</b><small>3D recurrent neural field</small></div><span className="active-mark"/></div>

          <div className="panel-label section-gap">SIMULATION CONTROL</div>
          <div className="control-row"><span><Radio size={15}/> Synaptic plasticity</span><button className={snapshot.plasticity ? 'toggle on' : 'toggle'} onClick={() => send({ type: 'SET_PLASTICITY', enabled: !snapshot.plasticity })} aria-label="Toggle synaptic plasticity"/></div>
          <div className="slider-heading"><span>External input</span><b>Pulse</b></div>
          <button className="wide-button accent-button" onClick={() => send({ type: 'STIMULATE', strength: 320 })}><Zap size={15}/> Stimulate input population</button>

          <div className="panel-label section-gap">SIMULATION SPEED</div>
          <div className="speed-options">{[0.5, 1, 2, 4].map(value => <button key={value} className={speed === value ? 'speed active' : 'speed'} onClick={() => { setSpeed(value); send({ type: 'SET_SPEED', speed: value }); }}>{value}×</button>)}</div>
          <div className="transport"><button className="transport-main" onClick={() => { setRunning(value => !value); send({ type: 'SET_RUNNING', running: !running }); }}>{running ? <Pause size={16}/> : <Play size={16}/>} {running ? 'Pause' : 'Resume'}</button><button className="transport-reset" onClick={() => send({ type: 'RESET' })} title="Reset simulation"><RotateCcw size={16}/></button></div>

          <div className="panel-label section-gap">NEURAL POPULATIONS <span className="muted-inline">{snapshot.populations.length}</span></div>
          <div className="population-list">
            {snapshot.populations.map(population => <div className="population-row" key={population.id}><span className={population.kind === 'inhibitory' ? 'population-dot inhibitory' : population.model === 'izhikevich' ? 'population-dot izh' : 'population-dot'}/><div><b>{population.name}</b><small>{population.count} neurons · {population.model === 'lif' ? 'LIF' : 'Izhikevich'} · {population.kind}</small></div></div>)}
            {!snapshot.populations.length && <div className="muted-note">Initializing populations…</div>}
          </div>

          <div className="panel-label section-gap">ADD POPULATION</div>
          <div className="form-stack">
            <input value={populationName} onChange={e => setPopulationName(e.target.value)} aria-label="Population name" placeholder="Population name" maxLength={32}/>
            <div className="form-row"><label>Neurons<input type="number" min="1" max="500" value={populationCount} onChange={e => setPopulationCount(Number(e.target.value))}/></label><label>Cell type<select value={populationKind} onChange={e => setPopulationKind(e.target.value as NeuronKind)}><option value="excitatory">Excitatory</option><option value="inhibitory">Inhibitory</option></select></label></div>
            <label>Neuron dynamics<select value={populationModel} onChange={e => setPopulationModel(e.target.value as NeuronModel)}><option value="lif">Leaky integrate-and-fire</option><option value="izhikevich">Izhikevich regular-spiking</option></select></label>
            <button className="wide-button" onClick={addPopulation}><Plus size={14}/> Add population</button>
          </div>
          <div className="panel-foot"><span className="status-square"/> WORKER ENGINE <span>LOCAL</span></div>
        </aside>

        <section className="center-stage">
          <div className="stage-toolbar"><div className="stage-title"><span className="eyebrow">LIVE ENVIRONMENT</span><b>Interconnected neural populations</b></div><div className="stage-actions"><button className={showConnections ? 'tool active' : 'tool'} onClick={() => setShowConnections(value => !value)} title="Show or hide all synaptic pathways">{showConnections ? <Eye size={14}/> : <EyeOff size={14}/>} Pathways</button><button className={tab === 'overview' ? 'tool active' : 'tool'} onClick={() => setTab('overview')}><Gauge size={14}/> Overview</button><button className={tab === 'inspector' ? 'tool active' : 'tool'} onClick={() => setTab('inspector')}><Settings2 size={14}/> Circuit editor</button></div></div>
          <div className="scene-wrap">
            {snapshot.neurons.length ? <NeuralScene snapshot={snapshot} running={running} selected={selected} showConnections={showConnections} onSelect={id => { setSelected(id); if (id !== null) setTab('inspector'); }}/> : <div className="scene-loading"><Brain size={28}/> Initializing neural simulation…</div>}
            <div className="scene-label scene-label-top"><span className="legend-dot excitatory"/> Excitatory <span className="legend-dot inhibitory"/> Inhibitory <span className="legend-dot izh"/> Izhikevich <span className="legend-dot pulse"/> In-flight signal</div>
            <div className="scene-label scene-label-bottom">3D NEURAL FIELD <span>{snapshot.neurons.length} NEURONS · {snapshot.synapses.length.toLocaleString()} SYNAPSES</span></div>
          </div>
          <div className="timeline"><div><span className="eyebrow">SIMULATION TIME</span><b>{snapshot.time} <small>ms</small></b></div><div className="timeline-track"><div className="timeline-fill" style={{ width: `${Math.min(100, (snapshot.time % 1000) / 10)}%` }}/></div><div className="timeline-end">STEP {snapshot.time.toLocaleString()}</div></div>
        </section>

        <aside className="right-panel">
          <div className="right-tabs"><button className={tab === 'overview' ? 'selected' : ''} onClick={() => setTab('overview')}>OVERVIEW</button><button className={tab === 'inspector' ? 'selected' : ''} onClick={() => setTab('inspector')}>CIRCUIT EDITOR</button></div>
          {tab === 'overview' ? <>
            <div className="panel-label">NETWORK METRICS</div>
            <div className="metric-grid"><div className="metric-card"><span>NEURONS</span><b>{snapshot.neurons.length}</b><small>Computational units</small></div><div className="metric-card"><span>SYNAPSES</span><b>{snapshot.synapses.length.toLocaleString()}</b><small>Directed connections</small></div><div className="metric-card"><span>SPIKES</span><b>{snapshot.totalSpikes.toLocaleString()}</b><small>Total events</small></div><div className="metric-card"><span>MEAN ACTIVITY</span><b>{(snapshot.meanActivity * 100).toFixed(1)}<i>%</i></b><small>Population average</small></div></div>
            <div className="panel-label section-gap">SIGNAL DYNAMICS</div><div className="signal-card"><div className="signal-head"><span>Mean population firing rate</span><b>{firingRate} <small>Hz*</small></b></div><div className="mini-bars">{Array.from({ length: 26 }, (_, i) => <i key={i} style={{ height: `${8 + Math.abs(Math.sin((snapshot.time - i) * 0.08)) * 38}px` }}/>)}</div><small className="muted-note">*Approximate network-wide mean from simulated time.</small></div>
            <div className="panel-label section-gap">SYNAPTIC STATE</div><div className="state-row"><span>Mean absolute weight</span><b>{snapshot.meanWeight.toFixed(2)}</b></div><div className="state-row"><span>In-flight signals</span><b>{snapshot.signals.length}</b></div><div className="state-row"><span>Plasticity</span><b className={snapshot.plasticity ? 'positive' : 'muted'}>{snapshot.plasticity ? 'ENABLED' : 'DISABLED'}</b></div>
            <div className="callout"><Sparkles size={16}/><p><b>Experimental models</b><br/>LIF and Izhikevich regular-spiking dynamics run in a dedicated worker.</p></div>
          </> : <>
            <div className="panel-label">SELECTED NEURON</div>
            {selectedNeuron ? <>
              <div className="selected-neuron"><div className="neuron-avatar"><Activity size={20}/></div><div><b>Neuron {selectedNeuron.id.toString().padStart(3, '0')}</b><small>{selectedNeuron.kind.toUpperCase()} · {selectedNeuron.model.toUpperCase()}</small></div></div>
              <div className="inspector-stats"><div><span>MEMBRANE</span><b>{selectedNeuron.v.toFixed(1)} mV</b></div><div><span>SPIKES</span><b>{selectedNeuron.spikes}</b></div><div><span>INCOMING</span><b>{incoming.length}</b></div><div><span>OUTGOING</span><b>{outgoing.length}</b></div></div>
              <div className="state-row"><span>Population</span><b>{selectedPopulation?.name ?? '—'}</b></div>
              <div className="state-row"><span>Activity</span><b>{(selectedNeuron.activity * 100).toFixed(1)}%</b></div>
              <div className="panel-label section-gap">CREATE SYNAPSE</div>
              <div className="form-stack"><label>Target neuron ID<input type="number" min="0" max={snapshot.neurons.length - 1} value={targetNeuron} onChange={e => setTargetNeuron(e.target.value)}/></label><div className="form-row"><label>Weight<input type="number" min="0.08" max="5" step="0.1" value={connectionWeight} onChange={e => setConnectionWeight(e.target.value)}/></label><label>Delay (ms)<input type="number" min="1" max="100" value={connectionDelay} onChange={e => setConnectionDelay(e.target.value)}/></label></div><button className="wide-button accent-button" onClick={connect}><Cable size={14}/> Connect selected → target</button></div>
              <div className="panel-label section-gap">OUTGOING CONNECTIONS</div>
              <div className="connection-list">{outgoing.slice(0, 14).map(connection => <div className="connection-row" key={connection.id}><span>→ Neuron {connection.to}</span><b>{connection.weight.toFixed(2)}</b><button onClick={() => removeConnection(connection.from, connection.to)} title="Remove connection">×</button></div>)}{!outgoing.length && <div className="muted-note">No outgoing connections.</div>}</div>
            </> : <div className="empty-state">Select a neuron in the 3D field to inspect it and create or remove synaptic connections.</div>}
            <button className="text-button" onClick={() => setSelected(null)}>Clear selection</button>
          </>}
          {workerError && <div className="error-callout">{workerError}</div>}
          <div className="right-foot">NEURAL UNIVERSE <span>ALPHA 0.2</span></div>
        </aside>
      </div>
    </main>
  );
}
