const API_ENDPOINT=document.querySelector('meta[name="econodash-api-endpoint"]')?.content||'/api/refresh';
import {applyResults,cacheResponse} from './refresh-state.js';
import {chartPeriods,chartPeriodLabels,compareIndicators} from './chart-comparison.js';
import {createRefreshScheduler} from './refresh-scheduler.js';
import {createRefreshRequest} from './refresh-request.js';
const paths = {
  grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  chart:'<path d="M4 4v16h16M7 14l4-4 4 3 5-7"/>',
  landmark:'<path d="M3 9l9-5 9 5H3Zm3 3v6m6-6v6m6-6v6M3 21h18"/>',
  box:'<path d="m12 3 9 5v8l-9 5-9-5V8l9-5Zm0 10v8M3 8l9 5 9-5M7.5 5.5l9 5"/>',
  exchange:'<path d="M4 7h15m-4-4 4 4-4 4M20 17H5m4-4-4 4 4 4"/>',
  coin:'<circle cx="12" cy="12" r="9"/><path d="M9 7h4a3 3 0 0 1 0 6H9m0-6v11m0-5h5a2.5 2.5 0 0 1 0 5H9m2-13v2m3-2v2m-3 11v2m3-2v2"/>',
  star:'<path d="m12 3 2.8 5.8 6.4.9-4.6 4.5 1.1 6.4L12 17.5l-5.7 3.1 1.1-6.4-4.6-4.5 6.4-.9L12 3Z"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.1"/>',
  chevron:'<path d="m9 5 7 7-7 7"/>',
  moon:'<path d="M20.5 13A8.5 8.5 0 0 1 11 3.5 8.5 8.5 0 1 0 20.5 13Z"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v4h16v-4"/>',
  refresh:'<path d="M20 7v5h-5M4 17v-5h5M6.3 6a8 8 0 0 1 13.3 4M4.4 14a8 8 0 0 0 13.3 4"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 11h18"/>',
  search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  close:'<path d="m6 6 12 12M6 18 18 6"/>',
};
const icon = name => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.info}</svg>`;
const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const groups = {
  stocks: { name:'주식', icon:'chart', note:'세계 주요 증시 · 포인트', basis:'각 시장의 최근 완료 종가. 중국 증시는 휴장으로 9월 30일 마감값을 유지합니다.' },
  bonds: { name:'금리', icon:'landmark', note:'1개월~50년 만기별 국채 시장 수익률 · 연율 %', basis:'상대 변화율과 실제 금리 차이(bp)를 함께 표시합니다. 1bp = 0.01%포인트.' },
  commodities: { name:'상품', icon:'box', note:'대표 상품 선물 · 달러·미국 센트', basis:'상품별 표시 단위와 선택 계약월을 확인하세요. 모든 기간의 가격은 각 상품의 같은 계약월로 비교합니다.' },
  fx: { name:'환율', icon:'exchange', note:'해당 외화당 원화 · 엔은 100엔', basis:'10월 7일 확정 마감 여부는 확인 불가. 마지막 확인된 10월 6일 자료입니다. 환율 하락은 해당 외화 대비 원화 강세를 뜻합니다.' },
  crypto: { name:'가상자산', icon:'coin', note:'업비트 원화시장 · 1개당 원', basis:'보고서 체결가격은 10월 8일 08:40:26 KST 기준. 비교 가격은 모두 완료된 업비트 일봉으로, 한국시간 오전 9시에 마감합니다.' },
};
const countries = { KR:'한국',US:'미국',CN:'중국',JP:'일본',HK:'홍콩',IN:'인도',EU:'유럽 유로존',CH:'스위스',BTC:'비트코인',ETH:'이더리움',XRP:'리플',SOL:'솔라나' };
const stockGroups={
  country:{name:'국가',note:'세계 주요 증시 · 지수 포인트',description:'국가별 대표 주가지수의 현재 수치와 기간별 변화를 비교하세요.'},
  'us-sectors':{name:'미국 섹터',note:'미국 11개 섹터 · 대표 ETF · 달러/주',description:'미국 11개 섹터를 대표하는 ETF의 가격을 비교합니다. 변화율은 분배금을 제외한 가격 기준입니다.'},
  'kr-sectors':{name:'한국 섹터',note:'한국 주요 산업 · 대표 ETF · 원/주',description:'한국 주요 산업을 대표하는 ETF의 가격을 비교합니다. 섹터 구성은 미국과 다르며 변화율은 분배금을 제외한 가격 기준입니다.'},
  'us-factors':{name:'미국 팩터',note:'성장·가치·로우볼 등 · 대표 ETF · 달러/주',description:'성장·가치·로우볼·모멘텀·퀄리티·소형주·배당성장 ETF를 비교합니다. 변화율은 분배금을 제외한 가격 기준입니다.'},
  'kr-factors':{name:'한국 팩터',note:'성장·가치·로우볼 등 · 대표 ETF · 원/주',description:'성장·가치·로우볼·모멘텀·퀄리티·배당·중소형주 ETF를 비교합니다. 변화율은 분배금을 제외한 가격 기준입니다.'},
};
const bondGroups={
  'ultra-short':{name:'초단기',note:'1년 미만 · 국채 시장 수익률 · 연율 %',description:'1~9개월 만기별 국채 시장 수익률입니다. 한국의 1년 미만 자료는 연결 출처에 없어 미국·일본만 표시합니다.'},
  short:{name:'단기',note:'1~3년 · 국채 시장 수익률 · 연율 %',description:'한국·미국·일본의 1·2·3년물 시장 수익률을 비교합니다.'},
  intermediate:{name:'중기',note:'4~7년 · 국채 시장 수익률 · 연율 %',description:'한국·미국·일본에서 제공하는 4~7년물 시장 수익률을 비교합니다. 국가별 제공 만기는 다를 수 있습니다.'},
  long:{name:'장기',note:'8~10년 · 국채 시장 수익률 · 연율 %',description:'한국·미국·일본의 10년물과 일본의 8·9년물 시장 수익률을 비교합니다.'},
  'ultra-long':{name:'초장기',note:'10년 초과 · 국채 시장 수익률 · 연율 %',description:'한국·미국·일본에서 제공하는 15~50년물 시장 수익률을 비교합니다. 국가별 제공 만기는 다를 수 있습니다.'},
};
const commodityGroups={
  metals:{name:'금속',note:'귀금속·구리 · 선택 계약월 선물',description:'금·은·구리·백금·팔라듐의 선물 가격을 비교합니다. 현재와 과거 비교값은 같은 계약월이며 상품별 표시 단위는 다를 수 있습니다.'},
  energy:{name:'에너지',note:'원유·가스·정제유 · 선택 계약월 선물',description:'WTI·브렌트 원유, 천연가스, 휘발유, 경유의 선물 가격을 비교합니다. 배럴·MMBtu·갤런 등 각 상품의 단위를 함께 표시합니다.'},
  agriculture:{name:'농산물',note:'곡물·커피·원당·코코아·면화 · 선택 계약월 선물',description:'옥수수·밀·대두·커피·원당·코코아·면화의 선물 가격을 비교합니다. 대부분 미국 센트 단위이고 코코아는 달러/메트릭톤입니다. 100센트는 1달러입니다.'},
};
const storage = {
  get(key) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } },
  set(key,value) { try { localStorage.setItem(key,JSON.stringify(value)); return true; } catch { return false; } },
};
const savedFavorites = storage.get('econodash-favorites');
const savedChartStart = storage.get('econodash-chart-start');
const state = { data:null,category:'all',stockGroup:'country',bondGroup:'ultra-short',commodityGroup:'metals',query:'',sort:'default',selected:'kospi',compared:'sp500',chartStart:chartPeriods.slice(0,-1).includes(savedChartStart)?savedChartStart:'year',pulsePeriod:'previous',favorites:new Set(Array.isArray(savedFavorites) ? savedFavorites.filter(v=>typeof v==='string') : []),refreshing:false,lastRun:null };
const pulsePeriods={previous:'직전 마감',week:'1주일',month:'1개월',quarter:'3개월',year:'12개월'};
let toastTimer;
function toast(message, persistent = false) {
  clearTimeout(toastTimer); $('#toast').textContent=message; $('#toast').classList.add('visible');
  if(!persistent) toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),5000);
}
function mountIcons(root = document) { root.querySelectorAll('[data-icon]').forEach(el=>el.innerHTML=icon(el.dataset.icon)); }
function change(current, baseline) { return Number.isFinite(current) && Number.isFinite(baseline) && baseline !== 0 ? (current-baseline)/baseline*100 : null; }
function signed(value,decimals=2) { if(value==null||!Number.isFinite(value))return '확인 불가'; const rounded=Number(value.toFixed(decimals)); return `${rounded>0?'+':rounded<0?'−':''}${Math.abs(rounded).toFixed(decimals)}`; }
function changeClass(value) { return value>0.00001?'positive':value<-.00001?'negative':'neutral'; }
function changeHtml(item, key='previous',pill=false) { const value=change(item.values.current,item.values[key]); return `<span class="change ${changeClass(value)}${pill?' pill':''}">${pill&&value!==null?(value>0?'↗ ':value<0?'↘ ':''):''}${signed(value)}${value==null?'':'%'}</span>`; }
function number(item,value=item.values.current) { return Number.isFinite(value)?value.toLocaleString('en-US',{minimumFractionDigits:item.decimals,maximumFractionDigits:item.decimals}):'확인 불가'; }
function displayDate(value) {return value.includes('T')?new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value)):value.slice(0,10);}
function shortDate(value) { if(!value)return '기준일 확인 불가'; const date=displayDate(value); return `${date.slice(5,7)}.${date.slice(8,10)}${value.includes('T')?' · '+new Date(value).toLocaleTimeString('ko-KR',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',hour12:false})+' KST':''}`; }
function longDate(value) { if(!value)return '기준일 확인 불가'; return value.includes('T')?new Date(value).toLocaleString('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false})+' KST':value+' 현지 거래일'; }
function sourceLabel(item) { return item.live ? item.provider : item.instrument==='etf'?'ETF 시세':'10.08 보고서'; }
function delayLabel(minutes) {return minutes===0?'실시간':minutes%60===0?`${minutes/60}시간 지연`:`${minutes}분 지연`;}
function priceLabel(item) {const label=item.priceKind==='published'?'최신 공표값 · 장중 시세 미제공':item.priceKind==='market'?(item.marketState==='trading'?'장중 시세':item.marketState==='closed'?'최근 거래 시세':'현재 시세'):'저장된 확인값';return label+(item.priceKind==='market'&&Number.isInteger(item.delayMinutes)?' · '+delayLabel(item.delayMinutes):'');}
function rowStatus(item) {return item.refreshError?'조회 실패 · 이전 값':item.live?priceLabel(item)+(item.missing?.length?' · 비교 일부 확인 불가':''):'초기 보고서';}
function liveBasis(key) {return {stocks:'장중을 포함한 최신 시세와 직전 거래일의 완료 종가를 비교합니다. 시세 기준 시각은 한국시간입니다. 시장이 닫혀 있으면 마지막 거래 시세를 표시하며 출처의 시세 지연이 있을 수 있습니다.',bonds:'한국·미국·일본의 만기별 국채 시장 수익률은 네이버 증권 기준이며 일본은 출처 기준 2시간 지연입니다. 신규 발행 만기 목록이 아닌 잔존만기별 시장 수익률 계열입니다. 현재·직전·1주·1개월·3개월·12개월은 지표별 같은 출처를 사용하고 상대 변화율과 금리 차이(bp)를 표시합니다.',commodities:'동일 계약월의 현재 시세와 직전 완료 종가를 비교합니다. 저녁에 개장하는 미국 선물은 다음 거래일을 기준으로 비교합니다. 출처의 시세 지연이 있을 수 있습니다.',fx:'최신 환율과 직전 거래일 완료 종가를 비교합니다. 1외화당 원화, 엔은 100엔당 원화입니다. 위안은 같은 거래일·15분 이내 USD/KRW와 USD/CNY 시세의 교차 환율입니다.',crypto:'업비트 현재 체결가격과 완료된 일봉을 비교합니다. 일봉은 한국시간 오전 9시 마감이며 숫자 아래에 실제 기준 시각을 표시합니다.'}[key];}
function starButton(item,extra='') { const pressed=state.favorites.has(item.id); return `<button class="star-button ${extra}" data-favorite="${item.id}" aria-pressed="${pressed}" aria-label="${esc(item.name)} ${pressed?'관심 지표에서 제거':'관심 지표에 추가'}">${icon('star')}</button>`; }
function filtered() { if(!state.data)return []; let rows=state.data.indicators.filter(item => (state.category==='all'||(state.category==='favorites'?state.favorites.has(item.id):item.category===state.category)) && (state.category!=='stocks'||(item.stockGroup||'country')===state.stockGroup) && (state.category!=='bonds'||item.bondGroup===state.bondGroup) && (state.category!=='commodities'||item.commodityGroup===state.commodityGroup) && (!state.query || `${item.name} ${item.ticker} ${item.fundName||''} ${countries[item.country]} ${groups[item.category].name}`.toLowerCase().includes(state.query.toLowerCase()))); if(state.sort==='down')rows.sort((a,b)=>(change(b.values.current,b.values.previous)??-Infinity)-(change(a.values.current,a.values.previous)??-Infinity));if(state.sort==='up')rows.sort((a,b)=>(change(a.values.current,a.values.previous)??Infinity)-(change(b.values.current,b.values.previous)??Infinity));if(state.sort==='name')rows.sort((a,b)=>a.name.localeCompare(b.name,'ko'));return rows; }
function renderKpis() {
  $('#kpi-grid').innerHTML=['kospi','sp500','nasdaq','kr10','us10','gold','btc','usd'].map(id=>{
    const item=state.data.indicators.find(i=>i.id===id);
    const label={kr10:'한국 10년물 금리',us10:'미국 10년물 금리',gold:'금 가격'}[id]||item.name;
    const unit=item.category==='bonds'?'%':id==='gold'?'$/트로이온스':item.category==='fx'||item.category==='crypto'?'원':'';
    return `<article class="kpi-card" data-detail="${id}" tabindex="0" role="button" aria-label="${esc(label)} 상세 보기"><div class="kpi-top"><span class="market-badge" data-country="${item.country}">${item.country}</span><span>${esc(label)}</span>${starButton(item,'kpi-star')}</div><div class="kpi-value">${number(item)}<small>${unit}</small></div><div class="kpi-bottom">${changeHtml(item,'previous',true)}<span>${item.priceKind==='published'?'직전 공표 대비':'직전 마감 대비'}</span></div><div class="kpi-meta">${esc(sourceLabel(item))} · ${shortDate(item.dates.current)}<br><span class="kpi-price-kind ${item.priceKind==='published'?'published-price':''}">${esc(priceLabel(item))}</span>${item.refreshError?'<br><span class="refresh-error">조회 실패 · 이전 값</span>':''}</div></article>`;
  }).join('');
}
function renderPulse() {
  if(!state.data)return;
  const items=state.data.indicators,period=state.pulsePeriod,label=pulsePeriods[period];
  $('#pulse-period-label').textContent=label+' 대비';
  document.querySelectorAll('[data-pulse-period]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.pulsePeriod===period)));
  const rows=Object.entries(groups).map(([key,group])=>{const members=items.filter(i=>i.category===key&&(key!=='stocks'||(i.stockGroup||'country')==='country')),counts=pulseCounts(members,period),total=members.length||1;return `<div class="pulse-bar-row"><span>${group.name}</span><span class="pulse-bar"><i style="width:${counts.up/total*100}%;background:var(--up)"></i><i style="width:${counts.down/total*100}%;background:var(--down)"></i></span><span>${counts.up}↑ ${counts.down}↓</span></div>`;}).join('');
  $('#pulse-summary').innerHTML=rows;
}
function pulseCounts(items,period) {
  const counts={up:0,down:0,flat:0,missing:0};
  for(const item of items) {
    const current=item.values.current,baseline=item.values[period];
    if(!Number.isFinite(current)||!Number.isFinite(baseline)){counts.missing++;continue;}
    counts[current>baseline?'up':current<baseline?'down':'flat']++;
  }
  return counts;
}
function renderChart() {
  if(!state.data)return;
  const items=[state.selected,state.compared].map(id=>state.data.indicators.find(i=>i.id===id));
  const {baseline,periods,series,startPeriod}=compareIndicators(items,state.chartStart),baseLabel=chartPeriodLabels[baseline],startLabel=chartPeriodLabels[startPeriod];
  $('#chart-start-period').value=startPeriod;
  $('#chart-legend').innerHTML=series.map(({item,points},index)=>`<div class="chart-series-card" data-series="${index}"><span class="chart-series-name"><i></i>${esc(item.name)}</span><strong>${number(item)} <small>${esc(item.unit)}</small></strong><span class="change ${changeClass(points.at(-1).percent)}">${signed(points.at(-1).percent)}${points.at(-1).percent===null?'':'%'}<small>${baseline?` · ${baseLabel} 대비`:''}</small></span></div>`).join('');
  $('#chart-basis').textContent=baseline?`각 지표의 ${baseLabel} 값을 0%로 맞춘 변화율`:`선택한 ${startLabel} 기준값이 없거나 0인 지표가 있어 변화율을 비교할 수 없습니다.`;
  $('#chart-caption-count').textContent=`비교 시점 ${periods.length}개의 관측값`;
  $('#chart-caption-date').textContent='기준일은 지표마다 다를 수 있습니다.';
  $('#chart-point-detail').textContent='점에 마우스를 올리거나 선택하면 실제 수치와 기준일을 볼 수 있습니다.';
  const container=$('#chart-container');
  if(!baseline){container.innerHTML=`<div class="chart-empty">${startLabel} 기준으로 비교할 수 없습니다.</div>`;return;}
  const width=Math.max(container.clientWidth,240),height=207,pad={left:54,right:22,top:15,bottom:32};
  const values=series.flatMap(s=>s.points.map(p=>p.percent)).filter(Number.isFinite),low=Math.min(0,...values),high=Math.max(0,...values),span=high-low||2,min=low-span*.16,max=high+span*.16;
  const x=index=>pad.left+index/(periods.length-1)*(width-pad.left-pad.right),y=value=>pad.top+(max-value)/(max-min)*(height-pad.top-pad.bottom);
  const ticks=[...Array.from({length:5},(_,index)=>min+(max-min)*index/4).filter(value=>Math.abs(value)>(max-min)/20),0].sort((a,b)=>a-b);
  const tickFormat=value=>`${signed(value,Math.max(Math.abs(min),Math.abs(max))<1?2:1)}%`;
  const chartAlt=`${baseLabel} 대비 변화율. ${series.map(({item,points})=>`${item.name}: ${points.map(p=>`${chartPeriodLabels[p.key]} ${number(item,p.value)} ${item.unit}, ${signed(p.percent)}${p.percent===null?'':'%'}, ${longDate(p.date)}`).join('; ')}`).join('. ')}`;
  const lines=series.map(({item,points},index)=>{
    let connected=false;
    const line=points.map(p=>{if(p.percent===null){connected=false;return '';}const command=connected?'L':'M';connected=true;return `${command}${x(p.index).toFixed(2)},${y(p.percent).toFixed(2)}`;}).join(' ');
    return `<g class="chart-series" data-series="${index}" data-indicator="${esc(item.id)}"><path class="chart-line" d="${line}"/>${points.filter(p=>p.percent!==null).map(p=>`<circle class="chart-point" cx="${x(p.index)}" cy="${y(p.percent)}" r="${index?4:3}" tabindex="0" data-chart-point data-series="${index}" data-period="${p.key}" aria-label="${esc(`${item.name} · ${chartPeriodLabels[p.key]} · ${number(item,p.value)} ${item.unit} · ${signed(p.percent)}% · ${longDate(p.date)}`)}"><title>${esc(`${item.name} · ${chartPeriodLabels[p.key]} · ${number(item,p.value)} ${item.unit} · ${signed(p.percent)}% · ${longDate(p.date)}`)}</title></circle>`).join('')}</g>`;
  }).join('');
  container.innerHTML=`<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(chartAlt)}">${ticks.map(t=>`<line class="chart-grid ${t===0?'chart-zero':''}" x1="${pad.left}" x2="${width-pad.right}" y1="${y(t)}" y2="${y(t)}"/><text class="chart-axis-text" x="${pad.left-8}" y="${y(t)+3}" text-anchor="end">${tickFormat(t)}</text>`).join('')}${lines}${periods.map((key,index)=>`<text class="chart-axis-text" x="${x(index)}" y="${height-12}" text-anchor="middle">${chartPeriodLabels[key]}</text>`).join('')}</svg>`;
}
function showChartPoint(target) {
  const point=target.closest?.('[data-chart-point]');
  if(point)$('#chart-point-detail').textContent=point.getAttribute('aria-label');
}
function comparisonCell(item,key) {
  const bp=item.category==='bonds'&&Number.isFinite(item.values[key])?` · ${signed((item.values.current-item.values[key])*100,1)}bp`:'';
  const date=key==='year'&&item.dates[key]?displayDate(item.dates[key]).slice(0,4)+'.'+shortDate(item.dates[key]):shortDate(item.dates[key]);
  return `<td><div class="cell-comparison"><span class="cell-value">${number(item,item.values[key])}${item.category==='bonds'&&Number.isFinite(item.values[key])?'%':''}</span>${changeHtml(item,key)}</div><span class="cell-meta">${date}${bp}</span></td>`;
}
function renderTables() {
  const overview=state.category==='all';
  $('#indicators-section').hidden=overview;
  const stocks=state.category==='stocks',bonds=state.category==='bonds',commodities=state.category==='commodities',stockGroup=stockGroups[state.stockGroup],bondGroup=bondGroups[state.bondGroup],commodityGroup=commodityGroups[state.commodityGroup];
  $('#stock-tabs').hidden=!stocks;$('#stock-tab-description').hidden=!stocks;
  $('#bond-tabs').hidden=!bonds;$('#bond-tab-description').hidden=!bonds;
  $('#commodity-tabs').hidden=!commodities;$('#commodity-tab-description').hidden=!commodities;
  if(stocks){
    $('#stock-tab-description').textContent=stockGroup.description;
    document.querySelectorAll('[data-stock-group]').forEach(button=>{const active=button.dataset.stockGroup===state.stockGroup;button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;});
    $('#tables-container').setAttribute('role','tabpanel');$('#tables-container').setAttribute('aria-labelledby','stock-tab-'+state.stockGroup);
   }else if(bonds){
    $('#bond-tab-description').textContent=bondGroup.description;
    document.querySelectorAll('[data-bond-group]').forEach(button=>{const active=button.dataset.bondGroup===state.bondGroup;button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;});
    $('#tables-container').setAttribute('role','tabpanel');$('#tables-container').setAttribute('aria-labelledby','bond-tab-'+state.bondGroup);
   }else if(commodities){
    $('#commodity-tab-description').textContent=commodityGroup.description;
    document.querySelectorAll('[data-commodity-group]').forEach(button=>{const active=button.dataset.commodityGroup===state.commodityGroup;button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;});
    $('#tables-container').setAttribute('role','tabpanel');$('#tables-container').setAttribute('aria-labelledby','commodity-tab-'+state.commodityGroup);
  }else{$('#tables-container').removeAttribute('role');$('#tables-container').removeAttribute('aria-labelledby');}
  $('#favorite-count').textContent=state.favorites.size;
  if(overview){$('#tables-container').innerHTML='';return;}
  const rows=filtered(),name=state.category==='favorites'?'관심':groups[state.category].name;
  $('#indicators-title').innerHTML=`${name} 지표 <span id="visible-count">${rows.length}</span>`;
  if(!rows.length){$('#tables-container').innerHTML=`<div class="empty-state"><h3>${state.category==='favorites'&&!state.query?'아직 저장한 관심 지표가 없어요':'검색 결과가 없습니다'}</h3><p>${state.category==='favorites'&&!state.query?'지표 옆의 별을 눌러 나만의 목록을 만들어보세요.':'다른 검색어로 다시 확인해보세요.'}</p>${state.query?'<button class="button secondary" data-reset>검색 초기화</button>':''}</div>`;return;}
  $('#tables-container').innerHTML=Object.entries(groups).map(([key,group])=>{
    const members=rows.filter(i=>i.category===key);if(!members.length)return '';
    const isLive=members.some(i=>i.live),etfs=members.some(i=>i.instrument==='etf');
    const basis=(isLive?liveBasis(key):group.basis)+(etfs?' ETF는 지수 자체가 아닌 거래소 시장가격이며 분배금을 제외한 가격 변화율입니다.':''),title=stocks?stockGroup.name==='국가'?'국가별 지수':stockGroup.name:bonds?bondGroup.name:commodities?commodityGroup.name:group.name,note=stocks?stockGroup.note:bonds?bondGroup.note:commodities?commodityGroup.note:group.note;
    return `<div class="table-group"><div class="group-heading"><div class="group-title">${icon(group.icon)}${title}<span>${members.length}</span></div><span class="group-note">${note}${isLive?' · 새로 조회됨':''}</span></div><div class="table-scroll" tabindex="0" role="region" aria-label="${group.name} 지표 표, 좁은 화면에서는 좌우로 스크롤"><table><caption class="sr-only">${group.name} 현재·직전·1주·1개월·3개월·12개월 수치와 변화율</caption><thead><tr><th scope="col">지표</th><th scope="col">현재 수치</th><th scope="col">직전 마감 / 대비</th><th scope="col">1주 비교 / 대비</th><th scope="col">1개월 비교 / 대비</th><th scope="col">3개월 비교 / 대비</th><th scope="col">12개월 비교 / 대비</th></tr></thead><tbody>${members.map(item=>`<tr><td><div class="indicator-cell"><span class="market-badge" data-country="${item.country}">${item.country}</span><div><button class="indicator-name" data-detail="${item.id}">${esc(item.name)}</button><span class="ticker">${esc(item.ticker)}${item.fundName?' · '+esc(item.fundName):''}${item.contract?' · '+esc(item.contract.replace('년 ','/').replace('월물','')):''}</span></div>${starButton(item)}</div></td><td><span class="cell-value">${number(item)}${item.category==='bonds'?'%':''}</span><span class="cell-meta">${shortDate(item.dates.current)} · ${esc(item.unit)}</span><span class="row-source ${item.refreshError?'refresh-error':''}">${esc(sourceLabel(item))} · ${rowStatus(item)}</span></td>${['previous','week','month','quarter','year'].map(p=>comparisonCell(item,p)).join('')}</tr>`).join('')}</tbody></table></div><div class="basis-note">${icon('info')}<span>${esc(basis)}</span></div></div>`;
  }).join('');
}
function renderAll() {
  document.querySelectorAll('#navigation [data-category]').forEach(button=>{
    const count=button.querySelector('.nav-count');
    if(!count)return;
    const category=button.dataset.category;
    count.textContent=category==='favorites'?state.favorites.size:state.data.indicators.filter(i=>i.category===category).length;
  });
  renderKpis();renderPulse();renderChart();renderTables();
}
function setCategory(category) {
  if(!['all','favorites',...Object.keys(groups)].includes(category))return;
  if(state.category!==category){state.query='';$('#search-input').value='';}
  state.category=category;
  document.querySelectorAll('#navigation [data-category]').forEach(button=>{const active=button.dataset.category===category;button.classList.toggle('active',active);if(active)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');});
  const label=category==='all'?'전체 현황':category==='favorites'?'관심 지표':groups[category].name;
  $('#breadcrumb-current').textContent=label;
  $('.page-heading h1').textContent=category==='all'?'경제의 흐름을, 한눈에.':`${label} 대시보드`;
  $('.page-heading p').textContent=category==='all'?'흩어진 시장 지표를 모아, 오늘의 변화를 읽어보세요.':category==='favorites'?'자주 확인하는 지표를 나만의 목록으로 모아보세요.':`${label}의 최근 수치와 직전·1주·1개월·3개월·12개월 변화를 비교하세요.`;
  $('#kpi-grid').hidden=category!=='all';$('.overview-grid').hidden=category!=='all';
  // The author stylesheet uses grid, so set display explicitly for the hidden sections.
  $('#kpi-grid').style.display=category==='all'?'':'none';$('.overview-grid').style.display=category==='all'?'':'none';
  renderTables();
}
function setStockGroup(group) {
  if(state.category!=='stocks'||!Object.hasOwn(stockGroups,group))return;
  state.stockGroup=group;state.query='';$('#search-input').value='';renderTables();
}
function setBondGroup(group) {
  if(state.category!=='bonds'||!Object.hasOwn(bondGroups,group))return;
  state.bondGroup=group;state.query='';$('#search-input').value='';renderTables();
}
function setCommodityGroup(group) {
  if(state.category!=='commodities'||!Object.hasOwn(commodityGroups,group))return;
  state.commodityGroup=group;state.query='';$('#search-input').value='';renderTables();
}
function toggleFavorite(id) {
  if(!state.data?.indicators.some(i=>i.id===id))return;
  if(state.favorites.has(id))state.favorites.delete(id);else state.favorites.add(id);
  const persisted=storage.set('econodash-favorites',[...state.favorites]);renderKpis();renderTables();
  toast(`${state.favorites.has(id)?'관심 지표에 추가했습니다.':'관심 지표에서 제거했습니다.'}${persisted?'':' 이 브라우저에서는 저장할 수 없어 현재 화면에서만 유지됩니다.'}`);
}
function openDetail(id) {
  const item=state.data.indicators.find(i=>i.id===id);if(!item)return;
  $('#detail-content').innerHTML=`<div class="dialog-heading"><div><span class="section-kicker">${esc(item.ticker)} · ${groups[item.category].name}</span><h2>${esc(item.name)}</h2><p class="detail-unit">${esc(item.unit)}${item.fundName?' · '+esc(item.fundName):''}${item.contract?' · '+esc(item.contract):''}</p></div><button class="icon-button dialog-close" aria-label="상세 정보 닫기">${icon('close')}</button></div><div class="detail-big">${number(item)}${item.category==='bonds'?'%':''}</div><div class="detail-status">${esc(sourceLabel(item))} · ${longDate(item.dates.current)}</div><div class="detail-status ${item.refreshError?'refresh-error':''}">${rowStatus(item)}${item.retrievedAt?' · 마지막 성공 조회 '+longDate(item.retrievedAt):''}${item.refreshError?'<br>'+esc(item.refreshError):''}</div><div class="detail-comparisons">${[['previous','직전'],['week','1주 비교'],['month','1개월 비교'],['quarter','3개월 비교'],['year','12개월 비교']].map(([key,label])=>`<div class="detail-box"><small>${label}</small><strong>${number(item,item.values[key])}${item.category==='bonds'?'%':''}</strong>${changeHtml(item,key)}<div class="date">${longDate(item.dates[key])}${item.category==='bonds'?'<br>'+(Number.isFinite(item.values[key])?signed((item.values.current-item.values[key])*100,1)+'bp':'금리 차이 확인 불가'):''}</div></div>`).join('')}</div><p class="detail-note">${esc(item.note||'보고서에서 확인한 완료 마감값을 비교합니다. 비교일이 휴장일이면 해당 날짜 이전의 가장 최근 마감값을 사용했습니다.')}</p>`;
  $('#detail-dialog').showModal();
}
async function exportReport() {
  if(!state.data)return;
  const button=$('#export-button');button.disabled=true;button.setAttribute('aria-busy','true');
  try {
    const {openReport}=await import('./pdf-report.js');
    openReport({data:state.data});
  } catch {toast('보고서를 열지 못했습니다. 다시 시도해 주세요.');}
  finally {button.disabled=false;button.removeAttribute('aria-busy');}
}
async function refreshMarkets(automatic=false) {
  if(state.refreshing||!state.data)return;
  state.refreshing=true;const total=state.data.indicators.length,button=$('#refresh-button');
  button.disabled=true;button.innerHTML=icon('refresh')+'전체 조회 중…';button.setAttribute('aria-busy','true');
  try {
    const result=await refreshRequest.request(API_ENDPOINT,state.data.indicators.map(i=>i.id));state.data=applyResults(state.data,result);
    state.lastRun={completedAt:result.completedAt,succeeded:result.results.filter(r=>r.ok).length,failed:result.results.filter(r=>!r.ok).length};
    storage.set('econodash-market-cache-v10',{snapshot:cacheResponse(state.data,result.completedAt),lastResponse:result});
    renderAll();if(!automatic||state.lastRun.failed)toast(state.lastRun.succeeded+'/'+total+'개 지표를 새로 조회했습니다.'+(state.lastRun.failed?' 실패한 지표는 이전 값을 유지합니다.':''));
  } catch(error) {
    const message=error.name==='TimeoutError'?'조회 시간이 30초를 초과했습니다. 다시 재조회해 주세요.':error.message;
    const completedAt=new Date().toISOString();
    state.data={...state.data,indicators:state.data.indicators.map(i=>({...i,refreshError:message,attemptedAt:completedAt}))};
    state.lastRun={completedAt,succeeded:0,failed:total};renderAll();toast(message+' 마지막 확인값을 유지합니다.');
  } finally {state.refreshing=false;button.disabled=false;button.removeAttribute('aria-busy');button.innerHTML=icon('refresh')+'전체 재조회';}
}
const refreshScheduler=createRefreshScheduler(refreshMarkets);
const refreshRequest=createRefreshRequest();
function resumeRefresh() {refreshRequest.checkDeadline();refreshScheduler.checkDue().catch(()=>{});}
function applyTheme(theme) {document.documentElement.dataset.theme=theme;$('#theme-button').innerHTML=icon(theme==='dark'?'sun':'moon');$('#theme-button').setAttribute('aria-label',theme==='dark'?'밝은 테마로 전환':'어두운 테마로 전환');}
mountIcons();applyTheme(storage.get('econodash-theme')==='dark'?'dark':'light');
document.addEventListener('click',event=>{
  const period=event.target.closest('[data-pulse-period]');if(period){if(Object.hasOwn(pulsePeriods,period.dataset.pulsePeriod)){state.pulsePeriod=period.dataset.pulsePeriod;renderPulse();}return;}
  const favorite=event.target.closest('[data-favorite]');if(favorite){event.stopPropagation();toggleFavorite(favorite.dataset.favorite);return;}
  const commodityGroup=event.target.closest('[data-commodity-group]');if(commodityGroup){setCommodityGroup(commodityGroup.dataset.commodityGroup);return;}
  const bondGroup=event.target.closest('[data-bond-group]');if(bondGroup){setBondGroup(bondGroup.dataset.bondGroup);return;}
  const stockGroup=event.target.closest('[data-stock-group]');if(stockGroup){setStockGroup(stockGroup.dataset.stockGroup);return;}
  const category=event.target.closest('[data-category]');if(category){setCategory(category.dataset.category);return;}
  const detail=event.target.closest('[data-detail]');if(detail){openDetail(detail.dataset.detail);return;}
  if(event.target.closest('.dialog-close'))event.target.closest('dialog').close();
  if(event.target.closest('[data-reset]')){state.query='';$('#search-input').value='';renderTables();}
});
document.addEventListener('keydown',event=>{
  if(event.target.matches('[data-commodity-group]')&&['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){
    event.preventDefault();const keys=Object.keys(commodityGroups),index=keys.indexOf(event.target.dataset.commodityGroup),next=event.key==='Home'?0:event.key==='End'?keys.length-1:(index+(event.key==='ArrowRight'?1:-1)+keys.length)%keys.length;
    setCommodityGroup(keys[next]);$('#commodity-tab-'+keys[next]).focus();return;
  }
  if(event.target.matches('[data-bond-group]')&&['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){
    event.preventDefault();const keys=Object.keys(bondGroups),index=keys.indexOf(event.target.dataset.bondGroup),next=event.key==='Home'?0:event.key==='End'?keys.length-1:(index+(event.key==='ArrowRight'?1:-1)+keys.length)%keys.length;
    setBondGroup(keys[next]);$('#bond-tab-'+keys[next]).focus();return;
  }
  if(event.target.matches('[data-stock-group]')&&['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){
    event.preventDefault();const keys=Object.keys(stockGroups),index=keys.indexOf(event.target.dataset.stockGroup),next=event.key==='Home'?0:event.key==='End'?keys.length-1:(index+(event.key==='ArrowRight'?1:-1)+keys.length)%keys.length;
    setStockGroup(keys[next]);$('#stock-tab-'+keys[next]).focus();return;
  }
  if((event.key==='Enter'||event.key===' ')&&event.target.matches('.kpi-card')){event.preventDefault();openDetail(event.target.dataset.detail);}
  if(event.key==='/'&&!$('#indicators-section').hidden&&!['INPUT','TEXTAREA','SELECT'].includes(event.target.tagName)&&!document.querySelector('dialog[open]')){event.preventDefault();$('#search-input').focus();}
});
$('#search-input').addEventListener('input',event=>{state.query=event.target.value.trim();renderTables();});
$('#sort-select').addEventListener('change',event=>{state.sort=event.target.value;renderTables();});
$('#chart-select').addEventListener('change',event=>{state.selected=event.target.value;renderChart();});
$('#chart-select-second').addEventListener('change',event=>{state.compared=event.target.value;renderChart();});
$('#chart-start-period').addEventListener('change',event=>{if(chartPeriods.slice(0,-1).includes(event.target.value)){state.chartStart=event.target.value;storage.set('econodash-chart-start',state.chartStart);renderChart();}});
for(const event of ['pointerover','focusin','click'])$('#chart-container').addEventListener(event,event=>showChartPoint(event.target));
$('#theme-button').addEventListener('click',()=>{const theme=document.documentElement.dataset.theme==='dark'?'light':'dark';applyTheme(theme);storage.set('econodash-theme',theme);});
$('#export-button').addEventListener('click',exportReport);$('#refresh-button').addEventListener('click',()=>refreshScheduler.run());
$('#refresh-button').title='5분마다 자동 재조회 · 수동 조회 시 누른 시점부터 5분을 다시 계산합니다.';
document.addEventListener('visibilitychange',()=>{if(!document.hidden)resumeRefresh();});
window.addEventListener('pageshow',resumeRefresh);
window.addEventListener('focus',resumeRefresh);
window.addEventListener('pagehide',event=>{if(!event.persisted){refreshScheduler.stop();refreshRequest.cancel();}});
for(const id of ['method-button','footer-method'])$('#'+id).addEventListener('click',()=>$('#method-dialog').showModal());
for(const dialog of document.querySelectorAll('dialog'))dialog.addEventListener('click',event=>{if(event.target===dialog){const box=dialog.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)dialog.close();}});
new ResizeObserver(()=>renderChart()).observe($('#chart-container'));
try {
  const response=await fetch('data.json');if(!response.ok)throw new Error('보고서 데이터를 불러오지 못했습니다.');state.data=await response.json();
  if(!Array.isArray(state.data.indicators)||!state.data.indicators.length||new Set(state.data.indicators.map(i=>i.id)).size!==state.data.indicators.length)throw new Error('지표 데이터 구성을 확인하지 못했습니다.');
  const cached=storage.get('econodash-market-cache-v10');
  if(cached?.snapshot&&cached?.lastResponse) {
    try {
      state.data=applyResults(state.data,cached.snapshot);state.data=applyResults(state.data,cached.lastResponse);
      state.lastRun={completedAt:cached.lastResponse.completedAt,succeeded:cached.lastResponse.results.filter(r=>r.ok).length,failed:cached.lastResponse.results.filter(r=>!r.ok).length};
    } catch { /* Invalid or outdated cache falls back to the initial report. */ }
  }
  state.favorites=new Set([...state.favorites].filter(id=>state.data.indicators.some(i=>i.id===id)));
  for(const [id,key] of [['chart-select','selected'],['chart-select-second','compared']]) {
    const select=$('#'+id),options=members=>members.map(i=>`<option value="${i.id}">${esc(i.name)}</option>`).join('');
    select.innerHTML=Object.entries(stockGroups).map(([key,group])=>`<optgroup label="주식 · ${group.name}">${options(state.data.indicators.filter(i=>i.category==='stocks'&&(i.stockGroup||'country')===key))}</optgroup>`).join('')+Object.entries(bondGroups).map(([key,group])=>`<optgroup label="금리 · ${group.name}">${options(state.data.indicators.filter(i=>i.category==='bonds'&&i.bondGroup===key))}</optgroup>`).join('')+Object.entries(commodityGroups).map(([key,group])=>`<optgroup label="상품 · ${group.name}">${options(state.data.indicators.filter(i=>i.category==='commodities'&&i.commodityGroup===key))}</optgroup>`).join('')+Object.entries(groups).filter(([key])=>!['stocks','bonds','commodities'].includes(key)).map(([key,group])=>`<optgroup label="${group.name}">${options(state.data.indicators.filter(i=>i.category===key))}</optgroup>`).join('');
    select.value=state[key];
  }
  document.querySelectorAll('[data-total-indicators]').forEach(el=>el.textContent=state.data.indicators.length);
  $('#load-status').classList.add('hidden');renderAll();await refreshScheduler.run(true);
}catch(error){$('#load-status').textContent=`${error.message} 페이지를 새로고침해 주세요.`;$('#refresh-button').disabled=true;$('#export-button').disabled=true;}
