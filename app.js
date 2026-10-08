const API_ENDPOINT=document.querySelector('meta[name="econodash-api-endpoint"]')?.content||'/api/refresh';
import {applyResults,cacheResponse} from './refresh-state.js';
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
  external:'<path d="M14 3h7v7m0-7L10 14M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5"/>',
  search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  close:'<path d="m6 6 12 12M6 18 18 6"/>',
};
const icon = name => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.info}</svg>`;
const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const groups = {
  stocks: { name:'주식', icon:'chart', note:'세계 주요 증시 · 포인트', basis:'각 시장의 최근 완료 종가. 중국 증시는 휴장으로 9월 30일 마감값을 유지합니다.' },
  bonds: { name:'금리', icon:'landmark', note:'1·3·10·30년 만기 국채 · 연율 %', basis:'상대 변화율과 실제 금리 차이(bp)를 함께 표시합니다. 1bp = 0.01%포인트.' },
  commodities: { name:'상품', icon:'box', note:'미국 달러 표시 · 동일 계약월 선물', basis:'10월 7일 확정 마감값은 확인 불가. 마지막 확인된 10월 6일 완료 자료입니다. 금·은·구리는 2026년 12월물, WTI는 11월물로 모든 비교 계약이 같습니다.' },
  fx: { name:'환율', icon:'exchange', note:'해당 외화당 원화 · 엔은 100엔', basis:'10월 7일 확정 마감 여부는 확인 불가. 마지막 확인된 10월 6일 자료입니다. 환율 하락은 해당 외화 대비 원화 강세를 뜻합니다.' },
  crypto: { name:'가상자산', icon:'coin', note:'업비트 원화시장 · 1개당 원', basis:'보고서 체결가격은 10월 8일 08:40:26 KST 기준. 비교 가격은 모두 완료된 업비트 일봉으로, 한국시간 오전 9시에 마감합니다.' },
};
const countries = { KR:'한국',US:'미국',CN:'중국',JP:'일본',HK:'홍콩',EU:'유럽',CH:'스위스',BTC:'비트코인',ETH:'이더리움',XRP:'리플',SOL:'솔라나' };
const storage = {
  get(key) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } },
  set(key,value) { try { localStorage.setItem(key,JSON.stringify(value)); return true; } catch { return false; } },
};
const savedFavorites = storage.get('econodash-favorites');
const state = { data:null,category:'all',query:'',sort:'default',selected:'kospi',pulsePeriod:'previous',favorites:new Set(Array.isArray(savedFavorites) ? savedFavorites.filter(v=>typeof v==='string') : []),refreshing:false,lastRun:null };
const pulsePeriods={previous:'직전 마감',week:'1주일',month:'1개월',quarter:'3개월'};
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
function sourceLabel(item) { return item.live ? item.provider : '10.08 보고서'; }
function delayLabel(minutes) {return minutes===0?'실시간':minutes%60===0?`${minutes/60}시간 지연`:`${minutes}분 지연`;}
function priceLabel(item) {const label=item.priceKind==='published'?'최신 공표값 · 장중 시세 미제공':item.priceKind==='market'?(item.marketState==='trading'?'장중 시세':item.marketState==='closed'?'최근 거래 시세':'현재 시세'):'저장된 확인값';return label+(item.priceKind==='market'&&Number.isInteger(item.delayMinutes)?' · '+delayLabel(item.delayMinutes):'');}
function rowStatus(item) {return item.refreshError?'조회 실패 · 이전 값':item.live?priceLabel(item)+(item.missing?.length?' · 비교 일부 확인 불가':''):'초기 보고서';}
function liveBasis(key) {return {stocks:'장중을 포함한 최신 시세와 직전 거래일의 완료 종가를 비교합니다. 시세 기준 시각은 한국시간입니다. 시장이 닫혀 있으면 마지막 거래 시세를 표시하며 출처의 시세 지연이 있을 수 있습니다.',bonds:'한국·일본의 1·3·10·30년물과 미국 1·3·30년물은 네이버 증권의 시장 수익률을 조회하며 일본은 출처 기준 2시간 지연입니다. 미국 10년물은 Yahoo Finance 기준입니다. 현재·직전·1주·1개월·3개월은 지표별 같은 출처를 사용하고 상대 변화율과 금리 차이(bp)를 표시합니다.',commodities:'동일 계약월의 현재 시세와 직전 완료 종가를 비교합니다. 저녁에 개장하는 미국 선물은 다음 거래일을 기준으로 비교합니다. 출처의 시세 지연이 있을 수 있습니다.',fx:'최신 환율과 직전 거래일 완료 종가를 비교합니다. 1외화당 원화, 엔은 100엔당 원화입니다. 위안은 같은 거래일·15분 이내 USD/KRW와 USD/CNY 시세의 교차 환율입니다.',crypto:'업비트 현재 체결가격과 완료된 일봉을 비교합니다. 일봉은 한국시간 오전 9시 마감이며 숫자 아래에 실제 기준 시각을 표시합니다.'}[key];}
function renderStatus() {
  const run=state.lastRun,total=state.data.indicators.length;
  $('#report-title').textContent=run?'시세 조회 · '+shortDate(run.completedAt):'현재 시세 자동 조회 준비';
  $('#report-description').textContent=run?`${run.succeeded}/${total}개 조회 완료 · 시세별 기준 시각 확인`:'저장된 확인값 표시 · 최신 시세를 곧 조회합니다';
  if(!run)return;
  const banner=$('#refresh-status'),failed=state.data.indicators.filter(i=>i.refreshError),gaps=state.data.indicators.filter(i=>i.live&&i.missing?.length),published=state.data.indicators.filter(i=>i.priceKind==='published'),delayed=state.data.indicators.filter(i=>i.live&&i.delayMinutes>0);
  banner.hidden=false;banner.classList.toggle('has-errors',failed.length>0);
  banner.textContent=`${run.succeeded}/${total}개 지표 조회 완료. 장중을 포함한 최신 시세를 직전 완료 종가와 비교합니다.${failed.length?' '+failed.map(i=>i.name).join('·')+' 조회 실패: 마지막 확인값을 유지합니다.':''}${gaps.length?' '+gaps.map(i=>i.name).join('·')+'의 일부 비교 자료는 확인 불가입니다.':''}${published.length?' '+published.map(i=>i.name).join('·')+'은 장중 시세 미제공으로 최신 공식 공표값을 표시합니다.':''}${delayed.length?' '+delayed.map(i=>i.name+' '+delayLabel(i.delayMinutes)).join(' · ')+'.':''} 시세 지연이나 시장 휴장에 따라 기준 시각이 다를 수 있습니다.`;
}
function starButton(item,extra='') { const pressed=state.favorites.has(item.id); return `<button class="star-button ${extra}" data-favorite="${item.id}" aria-pressed="${pressed}" aria-label="${esc(item.name)} ${pressed?'관심 지표에서 제거':'관심 지표에 추가'}">${icon('star')}</button>`; }
function filtered() { if(!state.data)return []; let rows=state.data.indicators.filter(item => (state.category==='all'||(state.category==='favorites'?state.favorites.has(item.id):item.category===state.category)) && (!state.query || `${item.name} ${item.ticker} ${countries[item.country]} ${groups[item.category].name}`.toLowerCase().includes(state.query.toLowerCase()))); if(state.sort==='down')rows.sort((a,b)=>(change(b.values.current,b.values.previous)??-Infinity)-(change(a.values.current,a.values.previous)??-Infinity));if(state.sort==='up')rows.sort((a,b)=>(change(a.values.current,a.values.previous)??Infinity)-(change(b.values.current,b.values.previous)??Infinity));if(state.sort==='name')rows.sort((a,b)=>a.name.localeCompare(b.name,'ko'));return rows; }
function renderKpis() {
  $('#kpi-grid').innerHTML=['kospi','sp500','kr10','us10','gold','btc','usd'].map(id=>{
    const item=state.data.indicators.find(i=>i.id===id);
    const label={kr10:'한국 10년물 금리',us10:'미국 10년물 금리',gold:'금 가격'}[id]||item.name;
    const unit=item.category==='bonds'?'%':id==='gold'?'$/트로이온스':item.category==='fx'||item.category==='crypto'?'원':'';
    return `<article class="kpi-card" data-detail="${id}" tabindex="0" role="button" aria-label="${esc(label)} 상세 보기"><div class="kpi-top"><span class="market-badge" data-country="${item.country}">${item.country}</span><span>${esc(label)}</span>${starButton(item,'kpi-star')}</div><div class="kpi-value">${number(item)}<small>${unit}</small></div><div class="kpi-bottom">${changeHtml(item,'previous',true)}<span>${item.priceKind==='published'?'직전 공표 대비':'직전 마감 대비'}</span></div><div class="kpi-meta">${esc(sourceLabel(item))} · ${shortDate(item.dates.current)}<br><span class="kpi-price-kind ${item.priceKind==='published'?'published-price':''}">${esc(priceLabel(item))}</span>${item.refreshError?'<br><span class="refresh-error">조회 실패 · 이전 값</span>':''}</div></article>`;
  }).join('');
}
function renderPulse() {
  if(!state.data)return;
  const items=state.data.indicators,period=state.pulsePeriod,label=pulsePeriods[period],{up,down,flat,missing}=pulseCounts(items,period),total=items.length||1;
  $('#pulse-period-label').textContent=label+' 대비';
  $('#pulse-period-note').textContent=`${label==='직전 마감'?label:label+' 전'} 대비 · ${items.length-missing}/${items.length}개 지표 비교${missing?' · 비교 자료 없는 '+missing+'개 제외':''}`;
  document.querySelectorAll('[data-pulse-period]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.pulsePeriod===period)));
  const rows=Object.entries(groups).map(([key,group])=>{const members=items.filter(i=>i.category===key),counts=pulseCounts(members,period),total=members.length||1;return `<div class="pulse-bar-row"><span>${group.name}</span><span class="pulse-bar"><i style="width:${counts.up/total*100}%;background:var(--up)"></i><i style="width:${counts.down/total*100}%;background:var(--down)"></i></span><span>${counts.up}↑ ${counts.down}↓</span></div>`;}).join('');
  $('#pulse-summary').innerHTML=`<div class="pulse-main"><div class="pulse-ring" style="--up-angle:${up/total*360}deg;--down-angle:${(up+down)/total*360}deg"><div>${items.length}<small>전체 지표</small></div></div><div class="pulse-counts"><div><i style="background:var(--up)"></i>상승<strong>${up}</strong></div><div><i style="background:var(--down)"></i>하락<strong>${down}</strong></div><div><i style="background:var(--line)"></i>보합<strong>${flat}</strong></div>${missing?`<div><i style="background:var(--muted)"></i>비교 불가<strong>${missing}</strong></div>`:''}</div></div><div>${rows}</div>`;
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
  const item=state.data.indicators.find(i=>i.id===state.selected);
  $('#chart-value').textContent=number(item);$('#chart-change').innerHTML=changeHtml(item,'month',true);$('#chart-unit').textContent=`${item.unit} · 1개월 대비`;
  const data=['quarter','month','week','previous','current'].map(key=>({key,value:item.values[key],date:item.dates[key]})).filter(p=>Number.isFinite(p.value));
  const container=$('#chart-container'),width=Math.max(container.clientWidth,240),height=173,pad={left:47,right:20,top:25,bottom:34};
  const values=data.map(d=>d.value),low=Math.min(...values),high=Math.max(...values),span=(high-low)||Math.abs(high)*.02||1,min=low-span*.27,max=high+span*.3;
  const x=i=>pad.left+i/(Math.max(data.length-1,1))*(width-pad.left-pad.right),y=v=>pad.top+(max-v)/(max-min)*(height-pad.top-pad.bottom);
  const points=data.map((d,i)=>[x(i),y(d.value)]),line=points.map(([px,py],i)=>`${i?'L':'M'}${px.toFixed(2)},${py.toFixed(2)}`).join(' ');
  const labels={quarter:'3개월 비교',month:'1개월 비교',week:'1주 비교',previous:'직전 마감',current:item.priceKind==='published'?'최신 공표':'현재 시세'};
  const ticks=Array.from({length:4},(_,i)=>min+(max-min)*i/3);
  const tickFormat=v=>Math.abs(v)>=1000000?`${(v/1000000).toFixed(1)}M`:Math.abs(v)>=10000?`${(v/1000).toFixed(1)}K`:v.toLocaleString('en-US',{maximumFractionDigits:item.category==='bonds'?2:Math.abs(v)<10?2:0});
  const chartAlt=`${item.name}, ${data.map(d=>`${labels[d.key]} ${number(item,d.value)}, ${longDate(d.date)}`).join('; ')}`;
  const end=points[points.length-1];
  container.innerHTML=`<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(chartAlt)}"><defs><linearGradient id="chart-gradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--chart)" stop-opacity=".14"/><stop offset="100%" stop-color="var(--chart)" stop-opacity=".01"/></linearGradient></defs>${ticks.map(t=>`<line class="chart-grid" x1="${pad.left}" x2="${width-pad.right}" y1="${y(t)}" y2="${y(t)}"/><text class="chart-axis-text" x="${pad.left-10}" y="${y(t)+3}" text-anchor="end">${tickFormat(t)}</text>`).join('')}<path d="${line} L${end[0]},${height-pad.bottom} L${points[0][0]},${height-pad.bottom} Z" fill="url(#chart-gradient)"/><path class="chart-line" d="${line}"/>${data.map((d,i)=>`<circle class="chart-point" cx="${x(i)}" cy="${y(d.value)}" r="3.5"><title>${labels[d.key]} · ${longDate(d.date)} · ${number(item,d.value)} ${item.unit}</title></circle><text class="chart-axis-text" x="${x(i)}" y="${height-17}" text-anchor="${i===0?'start':i===data.length-1?'end':'middle'}">${labels[d.key]}</text><text class="chart-axis-text" x="${x(i)}" y="${height-4}" text-anchor="${i===0?'start':i===data.length-1?'end':'middle'}">${displayDate(d.date).slice(5,10).replace('-','.')}</text>`).join('')}<text class="chart-value-label" x="${end[0]}" y="${Math.max(12,end[1]-12)}" text-anchor="end">${number(item)}</text></svg>`;
  $('#chart-caption-date').textContent=`${data[0].date.slice(0,10).replaceAll('-','.')} — ${displayDate(item.dates.current).replaceAll('-','.')}`;
}
function comparisonCell(item,key) {
  const bp=item.category==='bonds'&&Number.isFinite(item.values[key])?` · ${signed((item.values.current-item.values[key])*100,1)}bp`:'';
  return `<td><div class="cell-comparison"><span class="cell-value">${number(item,item.values[key])}${item.category==='bonds'?'%':''}</span>${changeHtml(item,key)}</div><span class="cell-meta">${shortDate(item.dates[key])}${bp}</span></td>`;
}
function renderTables() {
  const rows=filtered(),name=state.category==='all'?'전체 경제':state.category==='favorites'?'관심':groups[state.category].name;
  $('#indicators-title').innerHTML=`${name} 지표 <span id="visible-count">${rows.length}</span>`;
  $('#favorite-count').textContent=state.favorites.size;
  if(!rows.length){$('#tables-container').innerHTML=`<div class="empty-state"><h3>${state.category==='favorites'&&!state.query?'아직 저장한 관심 지표가 없어요':'검색 결과가 없습니다'}</h3><p>${state.category==='favorites'&&!state.query?'지표 옆의 별을 눌러 나만의 목록을 만들어보세요.':'다른 검색어나 분류로 다시 확인해보세요.'}</p><button class="button secondary" data-reset>전체 지표 보기</button></div>`;return;}
  $('#tables-container').innerHTML=Object.entries(groups).map(([key,group])=>{
    const members=rows.filter(i=>i.category===key);if(!members.length)return '';
    const isLive=members.some(i=>i.live),basis=isLive?liveBasis(key):group.basis;
    return `<div class="table-group"><div class="group-heading"><div class="group-title">${icon(group.icon)}${group.name}<span>${members.length}</span></div><span class="group-note">${group.note}${isLive?' · 새로 조회됨':''}</span></div><div class="table-scroll" tabindex="0" role="region" aria-label="${group.name} 지표 표, 좁은 화면에서는 좌우로 스크롤"><table><caption class="sr-only">${group.name} 현재·직전·1주·1개월·3개월 수치와 변화율</caption><thead><tr><th scope="col">지표</th><th scope="col">현재 수치</th><th scope="col">직전 마감 / 대비</th><th scope="col">1주 비교 / 대비</th><th scope="col">1개월 비교 / 대비</th><th scope="col">3개월 비교 / 대비</th></tr></thead><tbody>${members.map(item=>`<tr><td><div class="indicator-cell"><span class="market-badge" data-country="${item.country}">${item.country}</span><div><button class="indicator-name" data-detail="${item.id}">${esc(item.name)}</button><span class="ticker">${esc(item.ticker)}${item.contract?' · '+esc(item.contract.replace('년 ','/').replace('월물','')):''}</span></div>${starButton(item)}</div></td><td><span class="cell-value">${number(item)}${item.category==='bonds'?'%':''}</span><span class="cell-meta">${shortDate(item.dates.current)} · ${esc(item.unit)}</span><span class="row-source ${item.refreshError?'refresh-error':''}">${esc(sourceLabel(item))} · ${rowStatus(item)}</span></td>${['previous','week','month','quarter'].map(p=>comparisonCell(item,p)).join('')}</tr>`).join('')}</tbody></table></div><div class="basis-note">${icon('info')}<span>${esc(basis)}</span></div></div>`;
  }).join('');
}
function renderAll() { document.querySelectorAll('#navigation [data-category]').forEach(button=>{const category=button.dataset.category;button.querySelector('.nav-count').textContent=category==='all'?state.data.indicators.length:category==='favorites'?state.favorites.size:state.data.indicators.filter(i=>i.category===category).length;});renderStatus();renderKpis();renderPulse();renderChart();renderTables(); }
function setCategory(category) {
  if(!['all','favorites',...Object.keys(groups)].includes(category))return;
  state.category=category;
  document.querySelectorAll('#navigation [data-category]').forEach(button=>{const active=button.dataset.category===category;button.classList.toggle('active',active);if(active)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');});
  document.querySelectorAll('#category-tabs [data-category]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.category===category)));
  const label=category==='all'?'전체 현황':category==='favorites'?'관심 지표':groups[category].name;
  $('#breadcrumb-current').textContent=label;
  $('.page-heading h1').textContent=category==='all'?'경제의 흐름을, 한눈에.':`${label} 대시보드`;
  $('.page-heading p').textContent=category==='all'?'흩어진 시장 지표를 모아, 오늘의 변화를 읽어보세요.':category==='favorites'?'자주 확인하는 지표를 나만의 목록으로 모아보세요.':`${label}의 최근 수치와 직전·1주·1개월·3개월 변화를 비교하세요.`;
  $('#kpi-grid').hidden=category!=='all';$('.overview-grid').hidden=category!=='all';
  // The author stylesheet uses grid, so set display explicitly for the hidden sections.
  $('#kpi-grid').style.display=category==='all'?'':'none';$('.overview-grid').style.display=category==='all'?'':'none';
  renderTables();
}
function toggleFavorite(id) {
  if(!state.data?.indicators.some(i=>i.id===id))return;
  if(state.favorites.has(id))state.favorites.delete(id);else state.favorites.add(id);
  const persisted=storage.set('econodash-favorites',[...state.favorites]);renderKpis();renderTables();
  toast(`${state.favorites.has(id)?'관심 지표에 추가했습니다.':'관심 지표에서 제거했습니다.'}${persisted?'':' 이 브라우저에서는 저장할 수 없어 현재 화면에서만 유지됩니다.'}`);
}
function openDetail(id) {
  const item=state.data.indicators.find(i=>i.id===id);if(!item)return;
  $('#detail-content').innerHTML=`<div class="dialog-heading"><div><span class="section-kicker">${esc(item.ticker)} · ${groups[item.category].name}</span><h2>${esc(item.name)}</h2><p class="detail-unit">${esc(item.unit)}${item.contract?' · '+esc(item.contract):''}</p></div><button class="icon-button dialog-close" aria-label="상세 정보 닫기">${icon('close')}</button></div><div class="detail-big">${number(item)}${item.category==='bonds'?'%':''}</div><div class="detail-status">${esc(sourceLabel(item))} · ${longDate(item.dates.current)}</div><div class="detail-status ${item.refreshError?'refresh-error':''}">${rowStatus(item)}${item.retrievedAt?' · 마지막 성공 조회 '+longDate(item.retrievedAt):''}${item.refreshError?'<br>'+esc(item.refreshError):''}</div><div class="detail-comparisons">${[['previous','직전'],['week','1주 비교'],['month','1개월 비교'],['quarter','3개월 비교']].map(([key,label])=>`<div class="detail-box"><small>${label}</small><strong>${number(item,item.values[key])}${item.category==='bonds'?'%':''}</strong>${changeHtml(item,key)}<div class="date">${longDate(item.dates[key])}${item.category==='bonds'?'<br>'+(Number.isFinite(item.values[key])?signed((item.values.current-item.values[key])*100,1)+'bp':'금리 차이 확인 불가'):''}</div></div>`).join('')}</div><p class="detail-note">${esc(item.note||'보고서에서 확인한 완료 마감값을 비교합니다. 비교일이 휴장일이면 해당 날짜 이전의 가장 최근 마감값을 사용했습니다.')}</p><div class="detail-links"><a class="button primary" href="${esc(item.source)}" target="_blank" rel="noopener noreferrer">시세 출처 열기${icon('external')}</a>${(item.additionalSources||[]).map(url=>`<a class="button secondary" href="${esc(url)}" target="_blank" rel="noopener noreferrer">추가 자료 출처${icon('external')}</a>`).join('')}<a class="button secondary" href="${esc(state.data.reportUrl)}" target="_blank" rel="noopener noreferrer">원본 보고서${icon('external')}</a></div>`;
  $('#detail-dialog').showModal();
}
function exportCsv() {
  if(!state.data)return;const rows=filtered();if(!rows.length){toast('내보낼 지표가 없습니다.');return;}
  const header=['분류','지표','단위','계약월','최근수치','최근기준일','직전수치','직전기준일','직전변화율(%)','직전금리차이(bp)','1주비교수치','1주기준일','1주변화율(%)','1주금리차이(bp)','1개월비교수치','1개월기준일','1개월변화율(%)','1개월금리차이(bp)','3개월비교수치','3개월기준일','3개월변화율(%)','3개월금리차이(bp)','데이터출처','현재수치종류','시세지연분','현재시세현지거래일','교차환율시세별시각','조회상태','마지막성공조회시각','마지막시도시각','출처URL','추가출처URL','비교별출처','유의사항'];
  const quote=v=>'"'+String(v??'').replaceAll('"','""')+'"';
  const content=[header,...rows.map(item=>[groups[item.category].name,item.name,item.unit,item.contract,item.values.current,item.dates.current,...['previous','week','month','quarter'].flatMap(key=>[item.values[key]??'확인 불가',item.dates[key]??'확인 불가',change(item.values.current,item.values[key])?.toFixed(2)??'확인 불가',item.category==='bonds'?(Number.isFinite(item.values[key])?((item.values.current-item.values[key])*100).toFixed(1):'확인 불가'):'']),sourceLabel(item),priceLabel(item),item.delayMinutes,item.tradeDate,JSON.stringify(item.quoteComponents||[]),rowStatus(item),item.retrievedAt||state.data.reportDate,item.attemptedAt,item.source,item.additionalSources?.join(' | '),JSON.stringify(item.comparisonSources||{}),[item.note,item.refreshError].filter(Boolean).join(' · ')])].map(row=>row.map(quote).join(',')).join('\r\n');
  const url=URL.createObjectURL(new Blob(['\uFEFF'+content],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=`econodash-${(state.lastRun?.completedAt||state.data.reportDate).slice(0,10)}-${state.category}.csv`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);toast(`${rows.length}개 지표를 기준일·출처와 함께 내보냈습니다.`);
}
async function refreshMarkets(automatic=false) {
  if(state.refreshing||!state.data)return;
  state.refreshing=true;const total=state.data.indicators.length,button=$('#refresh-button'),banner=$('#refresh-status');
  button.disabled=true;button.innerHTML=icon('refresh')+'전체 조회 중…';button.setAttribute('aria-busy','true');
  $('#report-description').textContent='저장된 확인값 표시 · 현재 시세 조회 중…';
  banner.hidden=false;banner.classList.remove('has-errors');banner.textContent=(automatic?'첫 진입 자동 조회 · ':'')+total+'개 지표의 최신 시세와 직전 완료 종가를 조회하고 있습니다…';
  try {
    const response=await fetch(API_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ids:state.data.indicators.map(i=>i.id)}),signal:AbortSignal.timeout(120000),cache:'no-store'});
    if(!response.ok)throw new Error('전체 조회에 응답하지 못했습니다 (HTTP '+response.status+').');
    const result=await response.json();state.data=applyResults(state.data,result);
    state.lastRun={completedAt:result.completedAt,succeeded:result.results.filter(r=>r.ok).length,failed:result.results.filter(r=>!r.ok).length};
    storage.set('econodash-market-cache-v8',{snapshot:cacheResponse(state.data,result.completedAt),lastResponse:result});
    renderAll();if(!automatic||state.lastRun.failed)toast(state.lastRun.succeeded+'/'+total+'개 지표를 새로 조회했습니다.'+(state.lastRun.failed?' 실패한 지표는 이전 값을 유지합니다.':''));
  } catch(error) {
    const message=error.name==='TimeoutError'?'조회 시간이 초과되었습니다.':error.message;
    const completedAt=new Date().toISOString();
    state.data={...state.data,indicators:state.data.indicators.map(i=>({...i,refreshError:message,attemptedAt:completedAt}))};
    state.lastRun={completedAt,succeeded:0,failed:total};renderAll();toast(message+' 마지막 확인값을 유지합니다.');
  } finally {state.refreshing=false;button.disabled=false;button.removeAttribute('aria-busy');button.innerHTML=icon('refresh')+'전체 재조회';}
}
function applyTheme(theme) {document.documentElement.dataset.theme=theme;$('#theme-button').innerHTML=icon(theme==='dark'?'sun':'moon');$('#theme-button').setAttribute('aria-label',theme==='dark'?'밝은 테마로 전환':'어두운 테마로 전환');}
mountIcons();applyTheme(storage.get('econodash-theme')==='dark'?'dark':'light');
document.addEventListener('click',event=>{
  const period=event.target.closest('[data-pulse-period]');if(period){if(Object.hasOwn(pulsePeriods,period.dataset.pulsePeriod)){state.pulsePeriod=period.dataset.pulsePeriod;renderPulse();}return;}
  const favorite=event.target.closest('[data-favorite]');if(favorite){event.stopPropagation();toggleFavorite(favorite.dataset.favorite);return;}
  const category=event.target.closest('[data-category]');if(category){setCategory(category.dataset.category);return;}
  const detail=event.target.closest('[data-detail]');if(detail){openDetail(detail.dataset.detail);return;}
  if(event.target.closest('.dialog-close'))event.target.closest('dialog').close();
  if(event.target.closest('[data-reset]')){state.query='';$('#search-input').value='';setCategory('all');}
});
document.addEventListener('keydown',event=>{
  if((event.key==='Enter'||event.key===' ')&&event.target.matches('.kpi-card')){event.preventDefault();openDetail(event.target.dataset.detail);}
  if(event.key==='/'&&!['INPUT','TEXTAREA','SELECT'].includes(event.target.tagName)&&!document.querySelector('dialog[open]')){event.preventDefault();$('#search-input').focus();}
});
$('#search-input').addEventListener('input',event=>{state.query=event.target.value.trim();renderTables();});
$('#sort-select').addEventListener('change',event=>{state.sort=event.target.value;renderTables();});
$('#chart-select').addEventListener('change',event=>{state.selected=event.target.value;renderChart();});
$('#theme-button').addEventListener('click',()=>{const theme=document.documentElement.dataset.theme==='dark'?'light':'dark';applyTheme(theme);storage.set('econodash-theme',theme);});
$('#export-button').addEventListener('click',exportCsv);$('#refresh-button').addEventListener('click',()=>refreshMarkets());
for(const id of ['method-button','footer-method'])$('#'+id).addEventListener('click',()=>$('#method-dialog').showModal());
for(const dialog of document.querySelectorAll('dialog'))dialog.addEventListener('click',event=>{if(event.target===dialog){const box=dialog.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)dialog.close();}});
new ResizeObserver(()=>renderChart()).observe($('#chart-container'));
try {
  const response=await fetch('data.json');if(!response.ok)throw new Error('보고서 데이터를 불러오지 못했습니다.');state.data=await response.json();
  if(!Array.isArray(state.data.indicators)||!state.data.indicators.length||new Set(state.data.indicators.map(i=>i.id)).size!==state.data.indicators.length)throw new Error('지표 데이터 구성을 확인하지 못했습니다.');
  const cached=storage.get('econodash-market-cache-v8');
  if(cached?.snapshot&&cached?.lastResponse) {
    try {
      state.data=applyResults(state.data,cached.snapshot);state.data=applyResults(state.data,cached.lastResponse);
      state.lastRun={completedAt:cached.lastResponse.completedAt,succeeded:cached.lastResponse.results.filter(r=>r.ok).length,failed:cached.lastResponse.results.filter(r=>!r.ok).length};
    } catch { /* Invalid or outdated cache falls back to the initial report. */ }
  }
  state.favorites=new Set([...state.favorites].filter(id=>state.data.indicators.some(i=>i.id===id)));
  $('#chart-select').innerHTML=state.data.indicators.map(i=>`<option value="${i.id}">${esc(i.name)}</option>`).join('');
  $('#load-status').classList.add('hidden');renderAll();await refreshMarkets(true);
}catch(error){$('#load-status').textContent=`${error.message} 페이지를 새로고침해 주세요.`;$('#refresh-button').disabled=true;$('#export-button').disabled=true;}
