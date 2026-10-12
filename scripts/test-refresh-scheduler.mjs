import assert from 'node:assert/strict';
import {createRefreshScheduler,REFRESH_INTERVAL_MS} from '../refresh-scheduler.js';

assert.equal(REFRESH_INTERVAL_MS,300000);
const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
function clock() {
  let time=0,next=0;
  const tasks=new Map();
  const controls={now:()=>time,setTimer:(callback,delay)=>{const id=++next;tasks.set(id,{at:time+delay,callback});return id;},clearTimer:id=>tasks.delete(id)};
  async function advance(ms) {
    const end=time+ms;
    for(;;) {
      const first=[...tasks].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];
      if(!first)break;
      time=first[1].at;tasks.delete(first[0]);first[1].callback();await flush();
    }
    time=end;await flush();
  }
  return {controls,advance,freeze:ms=>{time+=ms;},now:()=>time};
}

{
  const c=clock(),calls=[],scheduler=createRefreshScheduler(auto=>calls.push({at:c.now(),auto}),c.controls);
  await scheduler.run(true);
  await c.advance(299999);assert.equal(calls.length,1);
  await c.advance(1);await c.advance(300000);
  assert.deepEqual(calls,[{at:0,auto:true},{at:300000,auto:true},{at:600000,auto:true}]);
  scheduler.stop();
}
{
  const c=clock(),calls=[],scheduler=createRefreshScheduler(auto=>calls.push({at:c.now(),auto}),c.controls);
  await scheduler.run(true);await c.advance(120000);await scheduler.run();
  await c.advance(180000);assert.equal(calls.length,2,'The original five-minute deadline is cancelled');
  await c.advance(119999);assert.equal(calls.length,2);
  await c.advance(1);await c.advance(300000);
  assert.deepEqual(calls,[{at:0,auto:true},{at:120000,auto:false},{at:420000,auto:true},{at:720000,auto:true}]);
  scheduler.stop();
}
{
  const c=clock(),calls=[],scheduler=createRefreshScheduler(auto=>calls.push({at:c.now(),auto}),c.controls);
  await scheduler.run(true);await c.advance(250000);await scheduler.run();
  await c.advance(100000);await scheduler.run();
  await c.advance(299999);assert.equal(calls.length,3);
  await c.advance(1);assert.deepEqual(calls.at(-1),{at:650000,auto:true},'Repeated manual refreshes keep only the latest deadline');
  scheduler.stop();
}
{
  const c=clock(),calls=[];let resolve;
  const waiting=new Promise(r=>{resolve=r;});
  const scheduler=createRefreshScheduler(auto=>{calls.push({at:c.now(),auto});return calls.length===1?waiting:undefined;},c.controls);
  const initial=scheduler.run(true);await flush();await c.advance(120000);resolve();await initial;
  await c.advance(180000);
  assert.equal(calls[1].at,300000,'Countdown starts when the request starts, not when it finishes');
  scheduler.stop();
}
{
  const c=clock(),calls=[];let resolve;
  const waiting=new Promise(r=>{resolve=r;});
  const scheduler=createRefreshScheduler(auto=>{calls.push({at:c.now(),auto});return calls.length===1?waiting:undefined;},c.controls);
  const initial=scheduler.run(true);await flush();await c.advance(600000);
  assert.equal(calls.length,1,'A slow request never overlaps another request');
  scheduler.checkDue();assert.equal(calls.length,1);
  resolve();await initial;await c.advance(0);
  assert.equal(calls.length,2,'An overdue request catches up only once');
  await c.advance(300000);assert.equal(calls.length,3);
  scheduler.stop();
}
{
  const c=clock(),calls=[],scheduler=createRefreshScheduler(auto=>calls.push({at:c.now(),auto}),c.controls);
  await scheduler.run(true);c.freeze(900000);
  await Promise.all([scheduler.checkDue(),scheduler.checkDue()]);await c.advance(0);
  assert.equal(calls.length,2,'Returning from a suspended tab makes one request, with no backlog burst');
  await c.advance(300000);assert.equal(calls.length,3);
  scheduler.stop();await c.advance(600000);await scheduler.checkDue();assert.equal(calls.length,3);
}
{
  const c=clock();let calls=0;
  const scheduler=createRefreshScheduler(()=>{calls++;if(calls===1)throw new Error('network failure');},c.controls);
  await assert.rejects(scheduler.run(true),/network failure/);
  await c.advance(300000);assert.equal(calls,2,'A failure leaves the next automatic refresh scheduled');
  scheduler.stop();
}
console.log('PASS: initial and periodic refresh, manual deadline resets, request-start timing, no overlap, suspended-tab catch-up, failure recovery and stop.');
