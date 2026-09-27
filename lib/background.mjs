import {AsyncLocalStorage} from 'node:async_hooks';
const scope=new AsyncLocalStorage();
// Workers must retain work explicitly after a response. Node keeps the same
// promises alive through its persistent event loop.
export function runWithBackground(context,action){return scope.run({context,researchRequests:0,states:new Map(),started:Date.now()},action);}
const localStates=new Map();
// I/O promises belong to their originating Worker request. A canceled request
// must never leave a promise that another request waits on indefinitely.
export function requestState(key,create){const states=scope.getStore()?.states||localStates;if(!states.has(key))states.set(key,create());return states.get(key);}
export function requestMemo(key,create){const states=scope.getStore()?.states;if(!states)return create();if(!states.has(key))states.set(key,create());return states.get(key);}
export function researchTimeRemaining(){const current=scope.getStore();return !current||Date.now()-current.started<18000;}
export function retainBackground(promise){scope.getStore()?.context.waitUntil(promise);return promise;}
export function takeResearchRequest(){const current=scope.getStore();if(current&&++current.researchRequests>24)throw new Error('Research paused after a bounded batch; cached progress resumes on the next refresh.');}
export function assertResearchBudget(){const current=scope.getStore();if(current&&(current.researchRequests>24||!researchTimeRemaining()))throw new Error('Research paused after a bounded batch; cached progress resumes on the next refresh.');}
export function isHostedRequest(){return !!scope.getStore();}
