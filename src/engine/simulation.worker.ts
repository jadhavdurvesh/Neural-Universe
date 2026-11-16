/// <reference lib="webworker" />
import {BrainNetwork,DEFAULT_POPULATIONS} from './BrainNetwork';
import type {WorkerCommand,WorkerResponse} from './protocol';
const scope=self as DedicatedWorkerGlobalScope;
let network=new BrainNetwork(DEFAULT_POPULATIONS),running=true,speed=1,accumulator=0,lastBroadcast=0;
function publish(){const message:WorkerResponse={type:'SNAPSHOT',snapshot:network.snapshot()};scope.postMessage(message);}
function report(error:unknown){const message:WorkerResponse={type:'ERROR',message:error instanceof Error?error.message:'Simulation worker error.'};scope.postMessage(message);}
scope.onmessage=(event:MessageEvent<WorkerCommand>)=>{
 const command=event.data;
 try{
  switch(command.type){
   case 'INIT':network=new BrainNetwork(command.populations??DEFAULT_POPULATIONS);running=true;speed=1;accumulator=0;publish();break;
   case 'SET_RUNNING':running=command.running;publish();break;
   case 'SET_SPEED':speed=Math.max(.25,Math.min(8,command.speed));break;
   case 'SET_PLASTICITY':network.enabledPlasticity=command.enabled;publish();break;
   case 'STIMULATE':network.stimulate(command.strength);publish();break;
   case 'RESET':network.reset();publish();break;
   case 'ADD_POPULATION':network.addPopulation(command.population);publish();break;
   case 'CONNECT':network.connect(command.from,command.to,command.weight,command.delay);publish();break;
   case 'DISCONNECT':network.disconnect(command.from,command.to);publish();break;
  }
 }catch(error){report(error);}
};
setInterval(()=>{
 if(running){accumulator+=speed;let steps=0;while(accumulator>=1&&steps<8){network.step();accumulator-=1;steps++;}}
 const now=Date.now();if(now-lastBroadcast>=100){publish();lastBroadcast=now;}
},16);
