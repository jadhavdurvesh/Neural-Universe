export type NeuronModel = 'lif' | 'izhikevich';
export type NeuronKind = 'excitatory' | 'inhibitory';
export type PopulationConfig = {
 id:string; name:string; count:number; model:NeuronModel; kind:NeuronKind;
 center:[number,number,number];
};
export type Neuron = {
 id:number; populationId:string; model:NeuronModel; kind:NeuronKind;
 x:number;y:number;z:number;v:number;u:number;threshold:number;rest:number;
 tau:number;refractory:number;refractoryLeft:number;spikes:number;lastSpike:number;
 activity:number;externalCurrent:number;
};
export type Synapse = {id:number;from:number;to:number;weight:number;delay:number;pending:number;preTrace:number;postTrace:number};
export type SignalSnapshot = {from:number;to:number;progress:number;weight:number};
export type NetworkSnapshot = {
 time:number;totalSpikes:number;meanActivity:number;meanWeight:number;
 neurons:Neuron[];synapses:Synapse[];populations:PopulationConfig[];
 signals:SignalSnapshot[];topologyVersion:number;plasticity:boolean;
};

export const DEFAULT_POPULATIONS:PopulationConfig[]=[
 {id:'sensory',name:'Sensory input',count:40,model:'lif',kind:'excitatory',center:[-4.2,0,0]},
 {id:'association',name:'Association',count:32,model:'izhikevich',kind:'excitatory',center:[0,.2,0]},
 {id:'interneurons',name:'Interneurons',count:24,model:'lif',kind:'inhibitory',center:[4.2,0,0]},
];

// Experimental spiking-network model. This is not a validated anatomical brain model.
type Delivery={synapseId:number;from:number;to:number;due:number;born:number;weight:number};
export class BrainNetwork{
 neurons:Neuron[]=[];synapses:Synapse[]=[];populations:PopulationConfig[]=[];
 time=0;totalSpikes=0;enabledPlasticity=true;topologyVersion=1;
 private incoming:Synapse[][]=[];private outgoing:Synapse[][]=[];private deliveries:Delivery[]=[];
 private rng=0x6d2b79f5;
 constructor(populations:PopulationConfig[]=DEFAULT_POPULATIONS){this.configure(populations);}
 private random(){this.rng=(this.rng+0x6d2b79f5)|0;let t=Math.imul(this.rng^(this.rng>>>15),1|this.rng);t^=t+Math.imul(t^(t>>>7),61|t);return((t^(t>>>14))>>>0)/4294967296;}
 private configure(populations:PopulationConfig[]){
  this.neurons=[];this.synapses=[];this.populations=[];this.deliveries=[];this.time=0;this.totalSpikes=0;this.rng=0x6d2b79f5;
  for(const population of populations)this.appendPopulation(population,false);
  for(let i=0;i<this.neurons.length;i++)for(let j=0;j<this.neurons.length;j++)if(i!==j){
   const a=this.neurons[i],b=this.neurons[j],d=Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
   if(this.random()<.075*Math.exp(-d/6.2))this.addSynapse(i,j,undefined,Math.max(1,Math.round(d/2.2)));
  }
  this.rebuildAdjacency();
 }
 private appendPopulation(input:PopulationConfig,connect:boolean){
  const p={...input,id:input.id||`population-${this.populations.length+1}`,name:input.name.trim()||`Population ${this.populations.length+1}`,count:Math.max(1,Math.min(500,Math.floor(input.count))),center:[...input.center] as [number,number,number]};
  const start=this.neurons.length;
  for(let i=0;i<p.count;i++){
   const u=this.random(),v=this.random(),w=this.random(),r=1.05*Math.cbrt(u),theta=v*Math.PI*2,phi=Math.acos(2*w-1),[cx,cy,cz]=p.center;
   this.neurons.push({id:this.neurons.length,populationId:p.id,model:p.model,kind:p.kind,x:cx+r*Math.sin(phi)*Math.cos(theta),y:cy+r*Math.sin(phi)*Math.sin(theta),z:cz+r*Math.cos(phi),v:-65,u:-13,threshold:p.model==='izhikevich'?30:-50,rest:-65,tau:18,refractory:3,refractoryLeft:0,spikes:0,lastSpike:-1000,activity:0,externalCurrent:0});
  }
  this.populations.push(p);
  if(connect)for(let i=start;i<this.neurons.length;i++)for(let j=0;j<this.neurons.length;j++)if(i!==j){const a=this.neurons[i],b=this.neurons[j],d=Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);if(this.random()<.075*Math.exp(-d/6.2))this.addSynapse(i,j,undefined,Math.max(1,Math.round(d/2.2)));}
 }
 private addSynapse(from:number,to:number,weight?:number,delay=1){
  const sign=this.neurons[from].kind==='inhibitory'?-1:1,mag=weight===undefined?.8+this.random()*2.4:Math.max(.08,Math.abs(weight));
  const s:Synapse={id:this.synapses.length,from,to,weight:sign*mag,delay:Math.max(1,Math.floor(delay)),pending:0,preTrace:0,postTrace:0};this.synapses.push(s);return s;
 }
 private rebuildAdjacency(){this.incoming=Array.from({length:this.neurons.length},()=>[]);this.outgoing=Array.from({length:this.neurons.length},()=>[]);for(const s of this.synapses){this.incoming[s.to]?.push(s);this.outgoing[s.from]?.push(s);}}
 addPopulation(input:Omit<PopulationConfig,'id'>&{id?:string}){
  if(this.neurons.length+input.count>1200)throw new Error('The prototype currently limits the network to 1,200 neurons.');
  this.appendPopulation({...input,id:input.id||`population-${this.populations.length+1}-${this.time}`},true);this.rebuildAdjacency();this.topologyVersion++;
 }
 connect(from:number,to:number,weight=1.5,delay=2){
  if(!this.neurons[from]||!this.neurons[to])throw new Error('Both neuron IDs must exist.');
  if(from===to)throw new Error('Self-connections are disabled.');
  const existing=this.outgoing[from]?.find(s=>s.to===to);
  if(existing){existing.weight=(this.neurons[from].kind==='inhibitory'?-1:1)*Math.max(.08,Math.min(5,Math.abs(weight)));existing.delay=Math.max(1,Math.min(100,Math.floor(delay)));this.topologyVersion++;return;}
  this.addSynapse(from,to,weight,Math.max(1,Math.min(100,Math.floor(delay))));this.rebuildAdjacency();this.topologyVersion++;
 }
 disconnect(from:number,to:number){
  const n=this.synapses.length;this.synapses=this.synapses.filter(s=>!(s.from===from&&s.to===to));
  if(this.synapses.length!==n){this.synapses.forEach((s,i)=>s.id=i);this.deliveries=this.deliveries.filter(e=>!(e.from===from&&e.to===to));this.rebuildAdjacency();this.topologyVersion++;}
 }
 stimulate(strength=18){for(const n of this.neurons)if(n.id%7===0)n.externalCurrent+=strength;}
 step(input=0){
  this.time++;const current=new Float64Array(this.neurons.length),waiting:Delivery[]=[];
  for(const e of this.deliveries){if(e.due<=this.time){current[e.to]+=e.weight;const s=this.synapses[e.synapseId];if(s)s.pending=Math.max(0,s.pending-1);}else waiting.push(e);}this.deliveries=waiting;
  const fired:number[]=[];
  for(const n of this.neurons){
   n.activity*=.86;
   if(n.model==='lif'&&n.refractoryLeft>0){n.refractoryLeft--;n.v=n.rest;n.externalCurrent=0;continue;}
   const noise=this.random()<.018?2.3:0,I=current[n.id]+noise+n.externalCurrent+input*(n.id%7===0?1:0);n.externalCurrent=0;
   if(n.model==='izhikevich'){
    // Regular-spiking parameter set: a=.02, b=.2, c=-65, d=8.
    for(let k=0;k<2;k++){const v=n.v,u=n.u;n.v+=.5*(.04*v*v+5*v+140-u+I);n.u+=.5*(.02*(.2*v-u));}
    if(n.v>=30){n.v=-65;n.u+=8;fired.push(n.id);}
   }else{
    n.v+=((n.rest-n.v)+I*.85)/n.tau;
    if(n.v>=n.threshold){n.v=25;n.refractoryLeft=n.refractory;fired.push(n.id);}
   }
   if(fired[fired.length-1]===n.id){n.spikes++;n.lastSpike=this.time;n.activity=1;this.totalSpikes++;}
  }
  const firedSet=new Set(fired);
  for(const id of fired){
   for(const s of this.outgoing[id]){if(s.pending<4){s.pending++;this.deliveries.push({synapseId:s.id,from:id,to:s.to,due:this.time+s.delay,born:this.time,weight:s.weight});}if(this.enabledPlasticity)this.adjustWeight(s,.012*s.postTrace);}
   if(this.enabledPlasticity)for(const s of this.incoming[id])this.adjustWeight(s,-.009*s.preTrace);
  }
  for(const s of this.synapses){s.preTrace*=.96;s.postTrace*=.96;if(firedSet.has(s.from))s.preTrace++;if(firedSet.has(s.to))s.postTrace++;}
  return fired.length;
 }
 private adjustWeight(s:Synapse,delta:number){const sign=Math.sign(s.weight)||1;s.weight=sign*Math.max(.08,Math.min(5,Math.abs(s.weight)+delta));}
 reset(){for(const n of this.neurons){n.v=n.rest;n.u=-13;n.refractoryLeft=0;n.spikes=0;n.activity=0;n.lastSpike=-1000;n.externalCurrent=0;}for(const s of this.synapses){s.pending=0;s.preTrace=0;s.postTrace=0;}this.deliveries=[];this.time=0;this.totalSpikes=0;}
 snapshot():NetworkSnapshot{return{time:this.time,totalSpikes:this.totalSpikes,meanActivity:this.neurons.reduce((a,n)=>a+n.activity,0)/(this.neurons.length||1),meanWeight:this.synapses.reduce((a,s)=>a+Math.abs(s.weight),0)/(this.synapses.length||1),neurons:this.neurons.map(n=>({...n})),synapses:this.synapses.map(s=>({...s})),populations:this.populations.map(p=>({...p,center:[...p.center] as [number,number,number]})),signals:this.deliveries.map(e=>({from:e.from,to:e.to,progress:Math.max(0,Math.min(1,(this.time-e.born)/Math.max(1,e.due-e.born))),weight:e.weight})),topologyVersion:this.topologyVersion,plasticity:this.enabledPlasticity};}
}
