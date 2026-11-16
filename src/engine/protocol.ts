import type { NetworkSnapshot, PopulationConfig } from './BrainNetwork';
export type WorkerCommand =
 | {type:'INIT';populations?:PopulationConfig[]}
 | {type:'SET_RUNNING';running:boolean}
 | {type:'SET_SPEED';speed:number}
 | {type:'SET_PLASTICITY';enabled:boolean}
 | {type:'STIMULATE';strength:number}
 | {type:'RESET'}
 | {type:'ADD_POPULATION';population:Omit<PopulationConfig,'id'>}
 | {type:'CONNECT';from:number;to:number;weight:number;delay:number}
 | {type:'DISCONNECT';from:number;to:number};
export type WorkerResponse =
 | {type:'SNAPSHOT';snapshot:NetworkSnapshot}
 | {type:'ERROR';message:string};
