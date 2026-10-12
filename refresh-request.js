export const REFRESH_TIMEOUT_MS=30000;

export function createRefreshRequest({fetcher=(...args)=>fetch(...args),now=Date.now,setTimer=setTimeout,clearTimer=clearTimeout,timeoutMs=REFRESH_TIMEOUT_MS}={}) {
  let active=null;
  async function request(endpoint,ids) {
    const controller=new AbortController(),task={deadline:now()+timeoutMs,done:false};
    let rejectDeadline;
    const deadline=new Promise((_,reject)=>{rejectDeadline=reject;});
    const fail=error=>{
      if(task.done)return;
      task.done=true;rejectDeadline(error);controller.abort(error);
    };
    task.expire=()=>fail(new DOMException('조회 시간이 30초를 초과했습니다.','TimeoutError'));
    task.cancel=()=>fail(new DOMException('조회 요청이 취소되었습니다.','AbortError'));
    active=task;
    const timer=setTimer(task.expire,timeoutMs);
    try {
      const work=(async()=>{
        const response=await fetcher(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ids}),signal:controller.signal,cache:'no-store'});
        if(!response.ok)throw new Error('전체 조회에 응답하지 못했습니다 (HTTP '+response.status+').');
        return await response.json();
      })();
      // Reject independently of transport cancellation, including a stalled JSON body.
      return await Promise.race([work,deadline]);
    } finally {
      task.done=true;clearTimer(timer);
      if(active===task)active=null;
    }
  }
  function checkDeadline() {if(active&&now()>=active.deadline)active.expire();}
  function cancel() {active?.cancel();}
  return {request,checkDeadline,cancel};
}
