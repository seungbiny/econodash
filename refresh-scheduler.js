export const REFRESH_INTERVAL_MS=5*60*1000;

export function createRefreshScheduler(refresh,{now=Date.now,setTimer=setTimeout,clearTimer=clearTimeout}={}) {
  let timer=null,dueAt=null,pending=null,stopped=false;
  function arm() {
    if(timer!==null)clearTimer(timer);
    timer=setTimer(()=>{
      timer=null;
      if(now()<dueAt)arm();
      else run(true).catch(()=>{});
    },Math.max(0,dueAt-now()));
  }
  function run(automatic=false) {
    if(stopped)return Promise.resolve();
    if(pending)return pending;
    dueAt=now()+REFRESH_INTERVAL_MS;
    arm();
    pending=Promise.resolve().then(()=>refresh(automatic)).finally(()=>{
      pending=null;
      // An overdue timer waits for the current request, then catches up once.
      if(!stopped&&timer===null)arm();
    });
    return pending;
  }
  function checkDue() {
    if(!stopped&&dueAt!==null&&now()>=dueAt)return run(true);
    return pending||Promise.resolve();
  }
  function stop() {
    stopped=true;
    if(timer!==null)clearTimer(timer);
    timer=null;dueAt=null;
  }
  return {run,checkDue,stop};
}
