import {AsyncLocalStorage} from 'node:async_hooks';
const scope=new AsyncLocalStorage();
// Workers must retain work explicitly after a response. Node keeps the same
// promises alive through its persistent event loop.
export function runWithBackground(context,action){return scope.run({context,researchRequests:0},action);}
export function retainBackground(promise){scope.getStore()?.context.waitUntil(promise);return promise;}
export function takeResearchRequest(){const current=scope.getStore();if(current&&++current.researchRequests>24)throw new Error('Research paused after a bounded batch; cached progress resumes on the next refresh.');}
export function assertResearchBudget(){const current=scope.getStore();if(current&&current.researchRequests>24)throw new Error('Research paused after a bounded batch; cached progress resumes on the next refresh.');}
export function isHostedRequest(){return !!scope.getStore();}
