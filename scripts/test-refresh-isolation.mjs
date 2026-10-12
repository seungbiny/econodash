import assert from 'node:assert/strict';
import {refreshAll,IDS} from '../lib/market-data.mjs';

const originalFetch=globalThis.fetch,held=[];let secondPhase=false,secondCalls=0;
globalThis.fetch=async()=>{
  if(!secondPhase)return new Promise(resolve=>held.push(resolve));
  secondCalls++;return new Response('',{status:503});
};
const tasks=[];
try {
  const first=refreshAll();tasks.push(first);await new Promise(setImmediate);assert.ok(held.length>0);
  secondPhase=true;let completed=false;
  const second=refreshAll().then(result=>{completed=true;return result;});tasks.push(second);
  await new Promise(setImmediate);
  assert.ok(secondCalls>0,'A new refresh makes its own provider requests');
  assert.equal(completed,true,'An earlier blocked request cannot strand a later Worker invocation');
  const result=await second;assert.equal(result.results.length,IDS.length);assert.ok(result.results.every(item=>item.ok===false));
} finally {
  secondPhase=true;for(const resolve of held)resolve(new Response('',{status:503}));
  await Promise.allSettled(tasks);globalThis.fetch=originalFetch;
}
console.log('PASS: overlapping refresh requests keep independent provider work and failures.');
