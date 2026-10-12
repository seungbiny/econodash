import assert from 'node:assert/strict';
import {createRefreshRequest,REFRESH_TIMEOUT_MS} from '../refresh-request.js';
import {createRefreshScheduler} from '../refresh-scheduler.js';

assert.equal(REFRESH_TIMEOUT_MS,30000);
const flush=async()=>{for(let i=0;i<15;i++)await Promise.resolve();};
function clock() {
  let time=0,next=0;const timers=new Map();
  const controls={now:()=>time,setTimer:(callback,delay)=>{const id=++next;timers.set(id,{at:time+delay,callback});return id;},clearTimer:id=>timers.delete(id)};
  async function advance(ms) {
    const end=time+ms;
    for(;;) {
      const first=[...timers].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!first)break;
      time=first[1].at;timers.delete(first[0]);first[1].callback();await flush();
    }
    time=end;await flush();
  }
  return {controls,advance,freeze:ms=>{time+=ms;},size:()=>timers.size};
}
const success={ok:true,json:async()=>({results:['latest']})};
{
  const c=clock();let options;
  const transport=createRefreshRequest({...c.controls,fetcher:async(_,value)=>{options=value;return success;}});
  assert.deepEqual(await transport.request('/api/refresh',['kospi','btc']),{results:['latest']});
  assert.deepEqual(JSON.parse(options.body),{ids:['kospi','btc']});assert.equal(options.method,'POST');assert.equal(options.signal.aborted,false);assert.equal(c.size(),0);
}
{
  const c=clock();let resolveOld,signal,calls=0;
  const old=new Promise(resolve=>{resolveOld=resolve;});
  const transport=createRefreshRequest({...c.controls,fetcher:async(_,options)=>{calls++;signal=options.signal;return calls===1?old:success;}});
  const first=transport.request('/api/refresh',['kospi']);const timedOut=assert.rejects(first,{name:'TimeoutError'});
  await c.advance(29999);assert.equal(signal.aborted,false);
  await c.advance(1);await timedOut;assert.equal(signal.aborted,true);assert.equal(c.size(),0);
  assert.deepEqual(await transport.request('/api/refresh',['kospi']),{results:['latest']},'A hung fetch that ignores abort cannot block a new request');
  resolveOld(success);await flush();assert.equal(c.size(),0,'A late old response does not restart a deadline');
}
{
  const c=clock();let signal;
  const transport=createRefreshRequest({...c.controls,fetcher:async(_,options)=>{signal=options.signal;return {ok:true,json:()=>new Promise(()=>{})};}});
  const timedOut=assert.rejects(transport.request('/api/refresh',['kospi']),{name:'TimeoutError'});
  await flush();await c.advance(30000);await timedOut;assert.equal(signal.aborted,true);assert.equal(c.size(),0,'The deadline also covers a response body that never ends');
}
{
  const c=clock();let calls=0;
  const transport=createRefreshRequest({...c.controls,fetcher:async()=>{
    calls++;
    if(calls===1)return {ok:false,status:503};
    if(calls===2)return {ok:true,json:async()=>{throw new SyntaxError('invalid JSON');}};
    return success;
  }});
  await assert.rejects(transport.request('/api/refresh',['kospi']),/HTTP 503/);
  await assert.rejects(transport.request('/api/refresh',['kospi']),/invalid JSON/);
  assert.deepEqual(await transport.request('/api/refresh',['kospi']),{results:['latest']});assert.equal(c.size(),0);
}
{
  const c=clock(),transport=createRefreshRequest({...c.controls,fetcher:()=>new Promise(()=>{})});
  const timedOut=assert.rejects(transport.request('/api/refresh',['kospi']),{name:'TimeoutError'});
  c.freeze(60000);transport.checkDeadline();await timedOut;assert.equal(c.size(),0,'Returning from a suspended page checks elapsed wall-clock time');
}
{
  const c=clock(),transport=createRefreshRequest({...c.controls,fetcher:()=>new Promise(()=>{})});
  const canceled=assert.rejects(transport.request('/api/refresh',['kospi']),{name:'AbortError'});
  transport.cancel();await canceled;assert.equal(c.size(),0);
}
{
  const c=clock(),events=[];let calls=0;
  const transport=createRefreshRequest({...c.controls,fetcher:()=>++calls===1?new Promise(()=>{}):Promise.resolve(success)});
  const scheduler=createRefreshScheduler(auto=>transport.request('/api/refresh',['kospi']).then(()=>events.push(auto?'auto':'manual')).catch(error=>events.push(error.name)),c.controls);
  const first=scheduler.run(true);await flush();await c.advance(30000);await first;
  await scheduler.run();assert.deepEqual(events,['TimeoutError','manual'],'Timeout releases the scheduler for manual retries');
  await c.advance(300000);assert.deepEqual(events,['TimeoutError','manual','auto']);scheduler.stop();
}
console.log('PASS: 30-second deadline, stalled fetch/body, HTTP/JSON failures, late responses, resume checks, cancellation, manual retry and automatic scheduling.');
