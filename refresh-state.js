const keys=['current','previous','week','month','quarter','year'];
const hosts=new Set(['query1.finance.yahoo.com','query2.finance.yahoo.com','push2his.eastmoney.com','push2.eastmoney.com','web.ifzq.gtimg.cn','stock.naver.com','ecos.bok.or.kr','www.mof.go.jp','api.upbit.com']);
const date=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}(?:T.*Z)?$/.test(value)&&Number.isFinite(Date.parse(value));
const source=value=>{try{const url=new URL(value);return url.protocol==='https:'&&hosts.has(url.hostname);}catch{return false;}};
export function validateResponse(data,response) {
  if(!date(response?.completedAt)||!Array.isArray(response.results)||response.results.length!==data.indicators.length)throw new Error('전체 지표의 조회 응답을 확인하지 못했습니다.');
  const ids=new Set(data.indicators.map(i=>i.id)),seen=new Set();
  for(const update of response.results) {
    if(!ids.has(update.id)||seen.has(update.id)||typeof update.ok!=='boolean')throw new Error('중복되거나 알 수 없는 지표 응답입니다.');
    seen.add(update.id);
    if(!update.ok)continue;
    if(!Number.isFinite(update.values?.current)||!date(update.retrievedAt)||!source(update.source)||typeof update.provider!=='string'||update.provider.length>100)throw new Error('조회 수치 또는 출처를 확인하지 못했습니다.');
    for(const key of keys) {
      const value=update.values[key],when=update.dates?.[key];
      if(value===null) {if(key==='current'||when!==null)throw new Error('누락된 비교 자료의 기준일이 잘못되었습니다.');}
      else if(!Number.isFinite(value)||!date(when))throw new Error('비교 자료의 수치 또는 기준일이 잘못되었습니다.');
      const link=update.comparisonSources?.[key];if(link!=null&&!source(link))throw new Error('비교 자료의 출처가 잘못되었습니다.');
    }
    if(update.additionalSources!=null&&(!Array.isArray(update.additionalSources)||update.additionalSources.some(s=>!source(s))))throw new Error('추가 출처를 확인하지 못했습니다.');
    if(update.delayMinutes!=null&&(!Number.isInteger(update.delayMinutes)||update.delayMinutes<0||update.delayMinutes>1440))throw new Error('시세 지연 시간을 확인하지 못했습니다.');
  }
  return response;
}
export function applyResults(data,response) {
  validateResponse(data,response);
  const updates=new Map(response.results.map(r=>[r.id,r]));
  return {...data,indicators:data.indicators.map(item=>{
    const update=updates.get(item.id);
    if(!update.ok)return {...item,refreshError:String(update.error||'자료를 확인하지 못했습니다.').slice(0,300),attemptedAt:response.completedAt};
    return {...item,live:true,values:{...update.values},dates:{...update.dates},source:update.source,comparisonSources:{...update.comparisonSources},additionalSources:update.additionalSources||[],provider:update.provider,note:String(update.note||''),contract:update.contract||item.contract,retrievedAt:update.retrievedAt,attemptedAt:response.completedAt,priceKind:update.priceKind==='market'?'market':update.priceKind==='published'?'published':undefined,marketState:update.marketState==='trading'?'trading':update.marketState==='closed'?'closed':undefined,tradeDate:update.tradeDate,delayMinutes:update.delayMinutes,quoteComponents:update.quoteComponents,missing:keys.filter(k=>update.values[k]===null),refreshError:''};
  })};
}
export function cacheResponse(data,completedAt) {
  return {completedAt,results:data.indicators.map(item=>item.live?{id:item.id,ok:true,values:item.values,dates:item.dates,source:item.source,comparisonSources:item.comparisonSources,additionalSources:item.additionalSources,provider:item.provider,note:item.note,contract:item.contract,retrievedAt:item.retrievedAt,priceKind:item.priceKind,marketState:item.marketState,tradeDate:item.tradeDate,delayMinutes:item.delayMinutes,quoteComponents:item.quoteComponents}:{id:item.id,ok:false,error:item.refreshError||'저장된 조회값이 없습니다.'})};
}
