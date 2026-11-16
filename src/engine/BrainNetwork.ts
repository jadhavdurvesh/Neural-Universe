export type Neuron={id:number;x:number;y:number;z:number;v:number;threshold:number;rest:number;tau:number;refractory:number;refractoryLeft:number;spikes:number;lastSpike:number;activity:number;kind:'excitatory'|'inhibitory'};
export type Synapse={from:number;to:number;weight:number;delay:number;pending:number;preTrace:number;postTrace:number};
export type Spike={neuron:number;age:number;strength:number};

// Simplified leaky integrate-and-fire network with delayed events and pair-based STDP.
export class BrainNetwork{
 neurons:Neuron[]=[];synapses:Synapse[]=[];spikes:Spike[]=[];time=0;totalSpikes=0;enabledPlasticity=true;
 private incoming:Synapse[][]=[];private outgoing:Synapse[][]=[];
 constructor(count=96,seed=17){this.build(count,seed);}
 private rand(seed:{v:number}){seed.v=(seed.v*1664525+1013904223)>>>0;return seed.v/4294967296;}
 build(count:number,seedValue=17){
  const seed={v:seedValue>>>0};this.neurons=[];this.synapses=[];this.spikes=[];this.time=0;this.totalSpikes=0;
  for(let i=0;i<count;i++){const u=this.rand(seed),v=this.rand(seed),w=this.rand(seed),r=5.1*Math.cbrt(u),theta=v*Math.PI*2,phi=Math.acos(2*w-1);
   this.neurons.push({id:i,x:r*Math.sin(phi)*Math.cos(theta),y:r*Math.sin(phi)*Math.sin(theta),z:r*Math.cos(phi),v:-65,threshold:-50,rest:-65,tau:18,refractory:3,refractoryLeft:0,spikes:0,lastSpike:-1000,activity:0,kind:this.rand(seed)>.2?'excitatory':'inhibitory'});}
  for(let i=0;i<count;i++)for(let j=0;j<count;j++)if(i!==j){const a=this.neurons[i],b=this.neurons[j],d=Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);if(this.rand(seed)<.11*Math.exp(-d/5.1)){const sign=a.kind==='inhibitory'?-1:1;this.synapses.push({from:i,to:j,weight:sign*(.8+this.rand(seed)*2.4),delay:Math.max(1,Math.round(d/2.2)),pending:0,preTrace:0,postTrace:0});}}
  this.incoming=Array.from({length:count},()=>[]);this.outgoing=Array.from({length:count},()=>[]);for(const s of this.synapses){this.incoming[s.to].push(s);this.outgoing[s.from].push(s);}
 }
 step(input=0){
  this.time++;const fired:number[]=[];
  for(const n of this.neurons){n.activity*=.86;if(n.refractoryLeft>0){n.refractoryLeft--;n.v=n.rest;continue;}
   let current=0;for(const s of this.incoming[n.id])if(s.pending>0){current+=s.weight*s.pending;s.pending=0;}
   const background=Math.random()<.018?2.3:0;n.v+=((n.rest-n.v)+(current+background+input*(n.id%7===0?1:0))*.85)/n.tau;
   if(n.v>=n.threshold){n.v=25;n.refractoryLeft=n.refractory;n.spikes++;n.lastSpike=this.time;n.activity=1;fired.push(n.id);this.totalSpikes++;}}
  const firedSet=new Set(fired);
  for(const id of fired){for(const s of this.outgoing[id]){s.pending=Math.min(4,s.pending+1);if(this.enabledPlasticity){s.weight+=.012*s.postTrace;s.weight=Math.max(s.weight<0?-5:.08,Math.min(5,s.weight));}}
   if(this.enabledPlasticity)for(const s of this.incoming[id]){s.weight-=.009*s.preTrace;s.weight=Math.max(s.weight<0?-5:.08,Math.min(5,s.weight));}}
  for(const s of this.synapses){s.preTrace*=.96;s.postTrace*=.96;if(firedSet.has(s.from))s.preTrace+=1;if(firedSet.has(s.to))s.postTrace+=1;}
  this.spikes.push(...fired.map(neuron=>({neuron,age:0,strength:1})));this.spikes=this.spikes.filter(s=>s.age<18);for(const s of this.spikes)s.age++;return fired.length;
 }
 stimulate(strength=18){for(const n of this.neurons)if(n.id%7===0)n.v+=strength;}
 reset(){for(const n of this.neurons){n.v=n.rest;n.refractoryLeft=0;n.spikes=0;n.activity=0;n.lastSpike=-1000;}for(const s of this.synapses){s.pending=0;s.preTrace=0;s.postTrace=0;}this.time=0;this.totalSpikes=0;this.spikes=[];}
 get meanActivity(){return this.neurons.reduce((a,n)=>a+n.activity,0)/(this.neurons.length||1);}
 get meanWeight(){return this.synapses.reduce((a,s)=>a+Math.abs(s.weight),0)/(this.synapses.length||1);}
}