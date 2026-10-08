const DAY = 86400000;
const SYMBOLS = {kospi:'^KS11',kosdaq:'^KQ11',sp500:'^GSPC',nasdaq:'^IXIC',dow:'^DJI',shanghai:'000001.SS',nikkei:'^N225',hangseng:'^HSI',us10:'^TNX',usd:'KRW=X',eur:'EURKRW=X',jpy:'JPYKRW=X',cny:'CNYKRW=X',chf:'CHFKRW=X'};
const FX_IDS=['usd','eur','jpy','cny','chf'];
export const CRYPTO_MARKETS = Object.freeze({btc:'KRW-BTC',eth:'KRW-ETH',xrp:'KRW-XRP',sol:'KRW-SOL'});
const FUTURES = {gold:{front:'GC=F',root:'GC',suffix:'CMX'},silver:{front:'SI=F',root:'SI',suffix:'CMX'},copper:{front:'HG=F',root:'HG',suffix:'CMX'},wti:{front:'CL=F',root:'CL',suffix:'NYM'}};
const MONTHS = {Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,Jul:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12};
const MONTH_CODES = 'FGHJKMNQUVXZ';
const BOND_COUNTRIES = {kr:{prefix:'KR',nation:'KOR',currency:'KRW',zone:'Asia/Seoul'},us:{prefix:'US',nation:'USA',currency:'USD',zone:'America/New_York'},jp:{prefix:'JP',nation:'JPN',currency:'JPY',zone:'Asia/Tokyo'}};
const BONDS = Object.fromEntries(Object.entries(BOND_COUNTRIES).flatMap(([country,spec])=>[1,3,10,30].filter(year=>country!=='us'||year!==10).map(year=>[`${country}${year}`,{...spec,code:`${spec.prefix}${year}YT=RR`,maturity:`${year}Y`}])));
export const LEGACY_IDS = [...Object.keys(SYMBOLS).filter(id=>id!=='chf'),'shenzhen','kr10','jp10',...Object.keys(FUTURES),'btc','eth'];
export const IDS = [...Object.keys(SYMBOLS),'shenzhen',...Object.keys(BONDS),...Object.keys(FUTURES),...Object.keys(CRYPTO_MARKETS)];

export function dateInZone(timestamp, zone='UTC') {
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(timestamp));
  const get=type=>parts.find(p=>p.type===type).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
export function monthBefore(date,months=1) {
  const value=new Date(date+'T00:00:00Z'),day=value.getUTCDate();value.setUTCDate(1);value.setUTCMonth(value.getUTCMonth()-months);
  const last=new Date(Date.UTC(value.getUTCFullYear(),value.getUTCMonth()+1,0)).getUTCDate();value.setUTCDate(Math.min(day,last));return value.toISOString().slice(0,10);
}
export function shiftDate(date,days) {return new Date(Date.parse(date+'T00:00:00Z')+days*DAY).toISOString().slice(0,10);}
export function compareSeries(rows) {
  const unique=new Map();for(const row of rows)if(/^\d{4}-\d{2}-\d{2}$/.test(row.date)&&Number.isFinite(row.value))unique.set(row.date,row);
  const sorted=[...unique.values()].sort((a,b)=>a.date.localeCompare(b.date));
  const current=sorted.at(-1);if(!current)throw new Error('완료된 일별 자료를 확인하지 못했습니다.');
  const previous=sorted.at(-2),week=sorted.findLast(r=>r.date<=shiftDate(current.date,-7)),month=sorted.findLast(r=>r.date<=monthBefore(current.date));
  const quarter=sorted.findLast(r=>r.date<=monthBefore(current.date,3));
  const points={current,previous,week,month,quarter};
  return {values:Object.fromEntries(Object.entries(points).map(([k,r])=>[k,r?.value??null])),dates:Object.fromEntries(Object.entries(points).map(([k,r])=>[k,r?.date??null])),comparisonSources:Object.fromEntries(Object.entries(points).map(([k,r])=>[k,r?.source??null])),missing:Object.entries(points).filter(([,r])=>!r).map(([k])=>k)};
}
export function compareQuote(rows,quote) {
  if(!Number.isFinite(quote.value)||!/^\d{4}-\d{2}-\d{2}$/.test(quote.tradeDate)||!Number.isFinite(Date.parse(quote.date)))throw new Error('현재 시세와 기준 시각을 확인하지 못했습니다.');
  const unique=new Map();for(const row of rows)if(/^\d{4}-\d{2}-\d{2}$/.test(row.date)&&Number.isFinite(row.value)&&row.date<quote.tradeDate)unique.set(row.date,row);
  const completed=[...unique.values()].sort((a,b)=>a.date.localeCompare(b.date));
  const current={value:quote.value,date:quote.date,source:quote.source},previous=completed.at(-1),week=completed.findLast(r=>r.date<=shiftDate(quote.tradeDate,-7)),month=completed.findLast(r=>r.date<=monthBefore(quote.tradeDate));
  const quarter=completed.findLast(r=>r.date<=monthBefore(quote.tradeDate,3));
  const points={current,previous,week,month,quarter};
  return {values:Object.fromEntries(Object.entries(points).map(([k,r])=>[k,r?.value??null])),dates:Object.fromEntries(Object.entries(points).map(([k,r])=>[k,r?.date??null])),comparisonSources:Object.fromEntries(Object.entries(points).map(([k,r])=>[k,r?.source??null])),missing:Object.entries(points).filter(([,r])=>!r).map(([k])=>k),priceKind:'market',tradeDate:quote.tradeDate};
}
async function request(url,type='json') {
  const response=await fetch(url,{headers:{Accept:type==='json'?'application/json':'text/csv,text/plain', 'User-Agent':'EconoDash/1.0'},signal:AbortSignal.timeout(14000),cache:'no-store'});
  if(!response.ok)throw new Error(response.status===429?'출처의 조회 한도를 초과했습니다. 잠시 후 재조회해 주세요.':`출처가 응답하지 않았습니다 (HTTP ${response.status}).`);
  return type==='json'?response.json():response.text();
}
async function yahoo(symbol,range='6mo') {
  let error;
  for(const host of ['query1.finance.yahoo.com','query2.finance.yahoo.com']) {
    const source=`https://${host}/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=1d`;
    try {const body=await request(source);const result=body.chart?.result?.[0];if(!result?.meta||!Array.isArray(result.timestamp)||!result.indicators?.quote?.[0]?.close)throw new Error('출처에서 일별 가격을 제공하지 않았습니다.');return {result,source};}catch(e){error=e;}
  }
  throw error;
}
export function yahooRows(result,source,now,{factor=1,alwaysPreviousDay=false}={}) {
  const today=yahooTradeDate(result.meta,now),period=result.meta.currentTradingPeriod?.regular;
  const prices=result.indicators.quote[0].close;
  return result.timestamp.flatMap((stamp,index)=>{
    const value=prices[index];if(!Number.isFinite(value)||stamp*1000>now)return [];
    const date=yahooTradeDate(result.meta,stamp*1000);
    if(date>today)return [];
    // A daily quote for the active session is not a confirmed closing price.
    if(period&&stamp>=period.start&&now<period.end*1000)return [];
    if(date===today&&(alwaysPreviousDay||!period||now<period.end*1000))return [];
    return [{date,value:value*factor,source}];
  });
}
export function yahooTradeDate(meta,timestamp) {
  const zone=meta.exchangeTimezoneName||'UTC';
  if(meta.instrumentType==='FUTURE') {
    const hour=Number(new Intl.DateTimeFormat('en-US',{timeZone:zone,hour:'2-digit',hour12:false}).format(new Date(timestamp)));
    // US futures open the evening before their trading date.
    if(hour>=18)return dateInZone(timestamp+12*3600000,zone);
  }
  return dateInZone(timestamp,zone);
}
export function yahooQuote(result,source,now,factor=1) {
  const meta=result.meta,stamp=meta.regularMarketTime*1000,value=meta.regularMarketPrice;
  if(!Number.isFinite(value)||!Number.isFinite(stamp)||stamp>now+300000)throw new Error('현재 시세의 가격과 실제 체결 시각을 확인하지 못했습니다.');
  const period=meta.currentTradingPeriod?.regular;
  return {value:value*factor,date:new Date(stamp).toISOString(),tradeDate:yahooTradeDate(meta,stamp),source,marketState:period&&now>=period.start*1000&&now<period.end*1000&&stamp>=period.start*1000?'trading':'closed'};
}
async function yahooIndicator(id,now) {
  if(id==='cny') {
    const [won,yuan]=await Promise.all([yahoo('KRW=X'),yahoo('CNY=X')]);
    if(won.result.meta.currency!=='KRW'||yuan.result.meta.currency!=='CNY'||won.result.meta.exchangeTimezoneName!==yuan.result.meta.exchangeTimezoneName)throw new Error('위안 교차 환율의 단위와 거래일을 검증하지 못했습니다.');
    const denominator=new Map(yahooRows(yuan.result,yuan.source,now,{alwaysPreviousDay:true}).map(row=>[row.date,row.value]));
    const rows=yahooRows(won.result,won.source,now,{alwaysPreviousDay:true}).flatMap(row=>denominator.get(row.date)>0?[{...row,value:row.value/denominator.get(row.date)}]:[]);
    const wonQuote=yahooQuote(won.result,won.source,now),yuanQuote=yahooQuote(yuan.result,yuan.source,now);
    if(wonQuote.tradeDate!==yuanQuote.tradeDate||Math.abs(Date.parse(wonQuote.date)-Date.parse(yuanQuote.date))>15*60000||yuanQuote.value<=0)throw new Error('위안 교차 환율의 두 현재 시세 시점을 맞추지 못했습니다.');
    const quote={...wonQuote,value:wonQuote.value/yuanQuote.value,date:wonQuote.date<yuanQuote.date?wonQuote.date:yuanQuote.date};
    return {...compareQuote(rows,quote),marketState:quote.marketState,quoteComponents:[{source:won.source,date:wonQuote.date},{source:yuan.source,date:yuanQuote.date}],source:won.source,additionalSources:[yuan.source],provider:'Yahoo Finance · 교차 환율',note:'USD/KRW와 USD/CNY의 최신 시세를 나눈 1위안당 원화 교차 환율입니다. 두 시세는 같은 거래일·15분 이내 시점만 사용하고 기준 시각은 둘 중 이전 시각입니다. 직전·1주·1개월·3개월은 두 계열에 모두 완료된 종가가 있는 날짜만 사용합니다. 직접 고시된 CNY/KRW 가격과 차이가 날 수 있습니다.'};
  }
  const {result,source}=await yahoo(SYMBOLS[id]);
  if(FX_IDS.includes(id)&&result.meta.currency!=='KRW')throw new Error('원화 표시 환율의 단위를 검증하지 못했습니다.');
  const fx=FX_IDS.includes(id);
  const factor=id==='jpy'?100:1,quote=yahooQuote(result,source,now,factor);
  const comparison=compareQuote(yahooRows(result,source,now,{factor,alwaysPreviousDay:fx}),quote);
  return {...comparison,marketState:quote.marketState,source,provider:'Yahoo Finance',note:`Yahoo Finance의 최신 시세(장중 포함)를 직전 거래일 완료 종가와 비교합니다. 현재 시세의 실제 기준 시각을 표시하며 출처의 지연 시세일 수 있습니다. 시장이 닫혀 있으면 마지막 거래 시세를 표시합니다.${id==='jpy'?' 100엔당 원화로 환산했습니다.':''}${id==='us10'?' 미국 10년물은 CBOE 10년 국채 수익률 지수(^TNX) 기준입니다.':''}`};
}
export function futuresContract(spec,meta) {
  const match=(meta.shortName||meta.longName||'').match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{2}|\d{4})\b/);
  if(!match)throw new Error('현재 선물 계약월을 확인하지 못했습니다.');
  const month=MONTHS[match[1]],year=match[2].length===2?2000+Number(match[2]):Number(match[2]);
  return {symbol:`${spec.root}${MONTH_CODES[month-1]}${String(year).slice(-2)}.${spec.suffix}`,contract:`${year}년 ${month}월물`};
}
async function futureIndicator(id,now) {
  const spec=FUTURES[id],front=await yahoo(spec.front,'5d'),resolved=futuresContract(spec,front.result.meta);
  const {result,source}=await yahoo(resolved.symbol);
  if(result.meta.symbol!==resolved.symbol)throw new Error('선물 계약의 동일성을 확인하지 못했습니다.');
  const quote=yahooQuote(result,source,now);
  const comparison=compareQuote(yahooRows(result,source,now),quote);
  return {...comparison,marketState:quote.marketState,source,provider:'Yahoo Finance',contract:resolved.contract,note:`${resolved.contract}(${resolved.symbol})의 최신 시세(장중 포함)를 직전 거래일 완료 종가와 비교합니다. 선물의 저녁 개장 일봉은 다음 거래일 기준으로 표시합니다. 현재·직전·1주·1개월·3개월을 모두 동일 계약으로 비교하며, 출처의 시세 지연이 있을 수 있습니다.`};
}
export function tencentIndexRows(body,source) {
  const data=body?.data?.sz399106,quote=data?.qt?.sz399106;
  if(body?.code!==0||quote?.[2]!=='399106'||!['深证综指','深證綜指'].includes(quote?.[1])||!Array.isArray(data?.day))throw new Error('선전 종합지수(399106)의 일별 자료를 확인하지 못했습니다.');
  return data.day.map(cells=>({date:cells[0],value:Number(cells[2]),source}));
}
export function tencentIndexQuote(body,source) {
  tencentIndexRows(body,source);
  const quote=body.data.sz399106.qt.sz399106,time=quote[30];
  if(!/^\d{14}$/.test(time))throw new Error('선전 종합지수의 실제 시세 시각을 확인하지 못했습니다.');
  const tradeDate=`${time.slice(0,4)}-${time.slice(4,6)}-${time.slice(6,8)}`;
  return {value:Number(quote[3]),tradeDate,date:new Date(`${tradeDate}T${time.slice(8,10)}:${time.slice(10,12)}:${time.slice(12,14)}+08:00`).toISOString(),source};
}
async function shenzhen(now) {
  const source='https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=sz399106,day,,,100,qfq';
  try {
    const body=await request(source),rows=tencentIndexRows(body,source),quote=tencentIndexQuote(body,source);
    if(Date.parse(quote.date)>now+300000)throw new Error('선전 종합지수의 시세 시각이 유효하지 않습니다.');
    return {...compareQuote(rows,quote),source,provider:'Tencent Finance',note:'선전 종합지수(SZSE Composite, 399106)의 최신 시세(장중 포함)를 직전 완료 종가와 비교합니다. 현재·직전·1주·1개월·3개월은 모두 같은 출처이며 장중 일봉을 직전 종가로 사용하지 않습니다. 출처의 시세 지연이 있을 수 있습니다.'};
  } catch {
    return eastmoneyShenzhen(now);
  }
}
async function eastmoneyShenzhen(now) {
  const today=dateInZone(now,'Asia/Shanghai');
  const source=`https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=0.399106&klt=101&fqt=0&beg=${shiftDate(today,-180).replaceAll('-','')}&end=${today.replaceAll('-','')}&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61`;
  const quoteSource='https://push2.eastmoney.com/api/qt/stock/get?secid=0.399106&fields=f57,f58,f43,f60,f86,f59';
  const [body,quoteBody]=await Promise.all([request(source),request(quoteSource)]),data=body.data,q=quoteBody.data;
  if(data?.code!=='399106'||!Array.isArray(data.klines)||!['深证综指','深證綜指'].includes(data.name))throw new Error('선전 종합지수(399106)의 일별 자료를 확인하지 못했습니다.');
  if(q?.f57!=='399106'||!Number.isFinite(q.f86)||!Number.isFinite(q.f43)||!Number.isInteger(q.f59)||q.f86*1000>now+300000)throw new Error('선전 종합지수의 현재 시세를 검증하지 못했습니다.');
  const rows=data.klines.map(line=>{const cells=line.split(',');return {date:cells[0],value:Number(cells[2]),source};});
  const quote={value:q.f43/10**q.f59,tradeDate:dateInZone(q.f86*1000,'Asia/Shanghai'),date:new Date(q.f86*1000).toISOString(),source:quoteSource};
  return {...compareQuote(rows,quote),source:quoteSource,additionalSources:[source],provider:'Eastmoney',note:'선전 종합지수(SZSE Composite, 399106)의 최신 시세(장중 포함)와 같은 출처의 완료된 일별 종가를 비교합니다. 출처의 시세 지연이 있을 수 있습니다.'};
}
function bondSources(id) {
  const spec=BONDS[id];if(!spec)throw new Error('지원하지 않는 국채 지표입니다.');
  const code=encodeURIComponent(spec.code);
  return {spec,quoteSource:`https://stock.naver.com/api/securityService/economic/bond/${code}`,historySource:`https://stock.naver.com/api/securityService/marketindex/bond/${code}/prices?page=1&pageSize=60`,source:`https://stock.naver.com/marketindex/bond/${code}/price`};
}
export function naverBondSnapshot(id,body,history,now) {
  const {spec,quoteSource,historySource,source}=bondSources(id);
  if(body?.dataType!=='BOND'||body.reutersCode!==spec.code||body.nationType!==spec.nation||body.maturityType!==spec.maturity||body.currencyType?.code!==spec.currency)throw new Error('국채 시세의 국가·종목·만기·통화를 검증하지 못했습니다.');
  const stamp=Date.parse(body.localTradedAt);
  if(!Number.isFinite(body.closePriceYield)||!/(Z|[+-]\d{2}:\d{2})$/.test(body.localTradedAt)||!Number.isFinite(stamp)||stamp>now+300000||!Number.isInteger(body.delayTime)||body.delayTime<0||body.delayTime>1440)throw new Error('국채 수익률의 현재 시세·기준 시각·지연 시간을 확인하지 못했습니다.');
  if(!Array.isArray(history)||!history.length)throw new Error('같은 국채의 과거 수익률을 확인하지 못했습니다.');
  const rows=history.flatMap(row=>{
    const time=Date.parse(row.localTradedAt),text=String(row.closePrice??'');
    return Number.isFinite(time)&&/(Z|[+-]\d{2}:\d{2})$/.test(row.localTradedAt)&&time<=now&&/^[+-]?\d+(?:\.\d+)?$/.test(text)?[{date:dateInZone(time,spec.zone),value:Number(text),source:row.historyPage===2?historySource.replace('page=1','page=2'):historySource}]:[];
  });
  const quote={value:body.closePriceYield,date:new Date(stamp).toISOString(),tradeDate:dateInZone(stamp,spec.zone),source:quoteSource};
  const comparison=compareQuote(rows,quote);
  // On a new day before a fresh quote, the reference close can equal the retained quote itself.
  if(quote.tradeDate===dateInZone(now,spec.zone)&&Number.isFinite(body.yieldToLastClosePrice)&&comparison.values.previous!==null&&Math.abs(comparison.values.previous-body.yieldToLastClosePrice)>0.0002)throw new Error('현재 국채 시세와 과거 자료의 직전 종가가 일치하지 않습니다.');
  return {...comparison,marketState:body.marketStatus==='OPEN'?(quote.tradeDate===dateInZone(now,spec.zone)?'trading':'closed'):['CLOSE','PREOPEN'].includes(body.marketStatus)?'closed':undefined,delayMinutes:body.delayTime,source,additionalSources:[quoteSource,historySource],provider:'네이버 증권',note:`네이버 증권의 ${body.name}(${spec.code}) 시장 수익률, 연% 기준입니다. 출처가 표시한 시세 지연은 ${body.delayTime}분이며 현재 수치의 실제 기준 시각을 별도로 표시합니다. 현재·직전·1주·1개월·3개월을 같은 네이버 시장 수익률 계열로 비교하고 장중 일봉은 직전 종가에서 제외합니다. 기존 한국은행·일본 재무성 공식 일별 통계와 수치가 다를 수 있습니다.`};
}
async function naverBond(id,now) {
  const {quoteSource,historySource}=bondSources(id);
  const [quote,history,older]=await Promise.all([request(quoteSource),request(historySource),request(historySource.replace('page=1','page=2'))]);
  if(!Array.isArray(history)||!Array.isArray(older))throw new Error('국채 과거 수익률의 페이지 자료를 확인하지 못했습니다.');
  const snapshot=naverBondSnapshot(id,quote,[...history,...older.map(row=>({...row,historyPage:2}))],now);
  return {...snapshot,additionalSources:[quoteSource,historySource,historySource.replace('page=1','page=2')]};
}
export function cryptoComparisons(ticker,candles) {
  if(!Number.isFinite(ticker.trade_price)||!Number.isFinite(ticker.timestamp))throw new Error('가상자산 체결가격과 시각을 확인하지 못했습니다.');
  const now=ticker.timestamp,market=ticker.market;
  const rows=candles.map(c=>({time:Date.parse(c.candle_date_time_utc+'Z')+DAY,value:c.trade_price})).filter(r=>r.time<=now&&Number.isFinite(r.value)).sort((a,b)=>b.time-a.time);
  const currentKst=new Date(now+9*3600000);
  const target=months=>Date.parse(monthBefore(dateInZone(now,'Asia/Seoul'),months)+'T'+currentKst.toISOString().slice(11,23)+'Z')-9*3600000;
  const previous=rows[0],week=rows.find(r=>r.time<=now-7*DAY),month=rows.find(r=>r.time<=target(1)),quarter=rows.find(r=>r.time<=target(3)),points={previous,week,month,quarter};
  const source=`https://api.upbit.com/v1/ticker?markets=${market}`;
  return {priceKind:'market',values:{current:ticker.trade_price,...Object.fromEntries(Object.entries(points).map(([k,r])=>[k,r?.value??null]))},dates:{current:new Date(now).toISOString(),...Object.fromEntries(Object.entries(points).map(([k,r])=>[k,r?new Date(r.time).toISOString():null]))},comparisonSources:{current:source,...Object.fromEntries(Object.entries(points).map(([k,r])=>[k,r?`https://api.upbit.com/v1/candles/days?market=${market}&to=${encodeURIComponent(new Date(r.time).toISOString())}&count=1`:null]))},missing:Object.entries(points).filter(([,r])=>!r).map(([k])=>k),source,provider:'업비트',note:'업비트 원화시장 체결가격을 완료된 일봉 종가와 비교합니다. 일봉은 한국시간 오전 9시에 마감하며, 1주·1개월·3개월 비교는 체결가격 시점에서 각 비교 시점까지 완료된 최근 일봉 기준입니다.'};
}
async function cryptoPair(id,tickers) {
  const market=CRYPTO_MARKETS[id],ticker=tickers.find(t=>t.market===market);if(!market||!ticker)throw new Error('가상자산 체결가격을 확인하지 못했습니다.');
  const candles=await request(`https://api.upbit.com/v1/candles/days?market=${market}&to=${encodeURIComponent(new Date(ticker.timestamp).toISOString())}&count=120`);
  return cryptoComparisons(ticker,candles);
}
async function boundedMap(items,concurrency,operation) {
  const result=new Array(items.length);let index=0;
  await Promise.all(Array.from({length:concurrency},async()=>{while(index<items.length){const at=index++;result[at]=await operation(items[at]);}}));return result;
}
let inFlight;
export async function refreshAll() {
  if(inFlight)return inFlight;
  inFlight=performRefresh().finally(()=>{inFlight=null;});return inFlight;
}
async function performRefresh() {
  const now=Date.now(),startedAt=new Date(now).toISOString();
  const cryptoIds=Object.keys(CRYPTO_MARKETS),marketIds=IDS.filter(id=>!CRYPTO_MARKETS[id]);
  const markets=boundedMap(marketIds,4,async id=>{
    try {const data=id==='shenzhen'?await shenzhen(now):BONDS[id]?await naverBond(id,now):FUTURES[id]?await futureIndicator(id,now):await yahooIndicator(id,now);return {id,ok:true,live:true,retrievedAt:new Date().toISOString(),...data};}
    catch(error){return {id,ok:false,error:error.message||'자료를 확인하지 못했습니다.',attemptedAt:new Date().toISOString()};}
  });
  const crypto=(async()=>{try{const tickers=await request(`https://api.upbit.com/v1/ticker?markets=${Object.values(CRYPTO_MARKETS).join(',')}`);return await boundedMap(cryptoIds,2,async id=>{try{return {id,ok:true,live:true,retrievedAt:new Date().toISOString(),...await cryptoPair(id,tickers)};}catch(error){return {id,ok:false,error:error.message,attemptedAt:new Date().toISOString()};}});}catch(error){return cryptoIds.map(id=>({id,ok:false,error:error.message,attemptedAt:new Date().toISOString()}));}})();
  const [marketResults,cryptoResults]=await Promise.all([markets,crypto]);
  const results=[...marketResults,...cryptoResults];
  return {startedAt,completedAt:new Date().toISOString(),succeeded:results.filter(r=>r.ok).length,failed:results.filter(r=>!r.ok).length,results};
}
