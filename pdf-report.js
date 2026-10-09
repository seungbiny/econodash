const periods=['previous','week','month','quarter','year'];
const labels={previous:'직전 마감',week:'1주일',month:'1개월',quarter:'3개월',year:'12개월'};
const groups={stocks:'주식',bonds:'금리',commodities:'상품',fx:'환율',crypto:'가상자산'};
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const numeric=value=>Number.isFinite(value);
const percent=(current,base)=>numeric(current)&&numeric(base)&&base!==0?(current-base)/base*100:null;
const signed=(value,decimals=2)=>{if(!numeric(value))return '확인 불가';const rounded=Number(value.toFixed(decimals));return `${rounded>0?'+':rounded<0?'-':''}${Math.abs(rounded).toFixed(decimals)}`;};
const value=(item,key='current')=>numeric(item.values[key])?item.values[key].toLocaleString('en-US',{minimumFractionDigits:item.decimals,maximumFractionDigits:item.decimals}):'확인 불가';
const tone=value=>value>0?'report-up':value<0?'report-down':'report-neutral';
function date(value){
  if(!value)return '기준일 확인 불가';
  if(!value.includes('T'))return esc(value.replaceAll('-','.'));
  const parts=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(value));
  return esc(parts.replaceAll('-','.'));
}
function status(item){
  if(item.refreshError)return '조회 실패 · 이전 확인값';
  if(!item.live)return '저장된 확인값';
  const kind=item.priceKind==='published'?'최신 공표값':item.marketState==='trading'?'장중 시세':item.marketState==='closed'?'최근 거래 시세':'현재 시세';
  return kind+(item.delayMinutes?` · ${item.delayMinutes%60===0?item.delayMinutes/60+'시간':item.delayMinutes+'분'} 지연`:'');
}
function delta(item,key){const p=percent(item.values.current,item.values[key]);return `<span class="${tone(p)}">${signed(p)}${numeric(p)?'%':''}</span>`;}
function comparison(item,key){
  const bp=item.category==='bonds'&&numeric(item.values.current)&&numeric(item.values[key])?` <span class="report-bp">(${signed((item.values.current-item.values[key])*100,1)}bp)</span>`:'';
  return `<td><div><strong class="report-inline">${value(item,key)}${item.category==='bonds'&&numeric(item.values[key])?'%':''}</strong> ${delta(item,key)}</div><small>${date(item.dates[key])}${bp}</small></td>`;
}
function table(indicators,key){
  const items=indicators.filter(item=>item.category===key);
  return `<section class="report-market"><h2>${groups[key]} <span>${items.length}개 지표</span></h2><table><caption class="report-sr-only">${groups[key]} 시세 및 기간별 비교</caption><colgroup><col style="width:17%"><col style="width:15%">${periods.map(()=>'<col style="width:13.6%">').join('')}</colgroup><thead><tr><th scope="col">지표 / 단위</th><th scope="col">현재 수치 / 기준 시각</th>${periods.map(key=>`<th scope="col">${labels[key]}<small>수치 · 변화율 · 기준일</small></th>`).join('')}</tr></thead><tbody>${items.map(item=>`<tr data-report-indicator="${esc(item.id)}"><th scope="row">${esc(item.name)}<small>${esc(item.ticker)} · ${esc(item.unit)}</small>${item.contract?`<small>${esc(item.contract)}</small>`:''}</th><td><div><strong class="${item.refreshError?'report-inline':''}">${value(item)}${item.category==='bonds'&&numeric(item.values.current)?'%':''}</strong>${item.refreshError?' <span class="report-error report-failed">조회 실패</span>':''}</div><small>${date(item.dates.current)}</small>${!item.refreshError&&(item.delayMinutes||item.priceKind==='published')?`<small>${esc(status(item))}</small>`:''}</td>${periods.map(key=>comparison(item,key)).join('')}</tr>`).join('')}</tbody></table></section>`;
}
export const reportStyles=`
#report-view{color-scheme:light;--report-ink:#253243;--report-muted:#617083;font-family:'DM Sans','Noto Sans KR','Malgun Gothic',system-ui,sans-serif;color:var(--report-ink);background:#e9edf2;line-height:1.45;min-height:100vh;padding-bottom:24px}
body.report-open{background:#e9edf2}body.report-open>.sidebar,body.report-open>.app-shell,body.report-open>.skip-link,body.report-open>dialog,body.report-open>.toast{display:none!important}
#report-view .report-toolbar{position:sticky;top:0;z-index:10;display:flex;align-items:center;justify-content:space-between;gap:12px;background:white;border-bottom:1px solid #d8e0e8;padding:14px 24px;font-size:12px}
#report-view .report-toolbar p{margin:4px 0 0;color:#617083;font-size:11px}#report-view .report-actions{display:flex;gap:8px;flex-shrink:0}#report-view button{font:inherit;border:1px solid #ccd6e0;border-radius:6px;color:#34455a;background:white;padding:9px 14px;cursor:pointer}#report-view button[data-report-print]{background:#337982;color:white;border-color:#337982}#report-view button:focus-visible{outline:3px solid #e77852;outline-offset:3px}
#report-view .report-scroll{overflow-x:auto;padding:24px 16px}#report-view .report-page{box-sizing:border-box;position:relative;width:297mm;min-height:210mm;margin:0 auto 24px;padding:0 0 13mm;background:white;box-shadow:0 3px 18px #22334415;border:12mm solid white}
#report-view .report-header{display:flex;align-items:flex-start;justify-content:space-between;border-bottom:2px solid #337982;padding-bottom:2mm;margin-bottom:3mm;gap:12px}#report-view .report-brand{font-size:11pt;font-weight:700}#report-view .report-brand em{font-style:normal;color:#337982}#report-view .report-header h1{margin:1mm 0 0;font-size:16pt;line-height:1.25;letter-spacing:-.6px}#report-view .report-stamp{text-align:right;font-size:8pt;line-height:1.6;color:#617083}
#report-view h2{font-size:11pt;line-height:1.4;margin:0 0 3mm;letter-spacing:0;font-weight:700}#report-view h2 span{font-size:8pt;font-weight:400;color:#617083;margin-left:6px}#report-view p{margin:0}
#report-view .report-up{color:#c74940}#report-view .report-down{color:#356bb4}#report-view .report-neutral{color:#617083}#report-view .report-failed{font-size:6.3pt;white-space:nowrap}#report-view .report-error{color:#aa5b19;font-weight:600}
#report-view .report-market{margin-bottom:5mm}#report-view table{table-layout:fixed;width:100%;min-width:0;border-collapse:collapse;font-size:7.5pt;line-height:1.25;font-variant-numeric:tabular-nums}#report-view th,#report-view td{width:auto;padding:.8mm 1.5mm;border-bottom:1px solid #dce4eb;vertical-align:top;text-align:right;overflow-wrap:anywhere}#report-view thead th{background:#f1f5f8;color:#405369;font-size:7.3pt;padding-top:1.5mm;padding-bottom:1.5mm}#report-view th:first-child{width:auto;text-align:left}#report-view tbody th{font-size:8pt;font-weight:600;position:static;background:transparent;color:#253243}#report-view tbody strong{font-size:8.2pt;font-weight:600;display:block}#report-view tbody strong.report-inline{display:inline;margin-right:2mm}#report-view table small{display:block;font-size:6.3pt;font-weight:400;color:#617083;line-height:1.2;margin-top:.3mm}#report-view tbody tr:nth-child(even){background:#fafbfd}#report-view .report-bp{font-size:6.3pt;white-space:nowrap}#report-view thead{display:table-header-group}#report-view tr{break-inside:avoid}
#report-view .report-note{font-size:7.3pt;line-height:1.7;color:#617083;padding:2mm;background:#f5f8fa;border-left:2px solid #d1dde8;margin-top:4mm}#report-view .report-reference{margin-top:14mm;padding:5mm;background:#f5f8fa;border-top:1px solid #dce4eb}#report-view .report-reference>h2{font-size:9pt;font-weight:600;color:#617083;margin:0 0 3mm}#report-view .report-notes{display:grid;grid-template-columns:1fr 1fr;gap:5mm}#report-view .report-notes h3{font-size:8pt;font-weight:600;color:#617083;margin:0 0 2mm}#report-view .report-notes p{font-size:7.5pt;color:#617083;line-height:1.7}#report-view .report-footer{position:absolute;bottom:0;left:0;right:0;display:flex;justify-content:space-between;align-items:center;border-top:1px solid #dce4eb;padding:3mm 0 0;margin:0;line-height:1.3;font-size:7pt;color:#617083}#report-view .report-sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}
@media(max-width:760px){#report-view .report-toolbar{align-items:flex-start;flex-direction:column;padding:12px 16px}#report-view .report-toolbar p{max-width:95vw}#report-view .report-scroll{padding:16px 12px}#report-view .report-page{margin-left:0}}
@page{size:A4 landscape;margin:12mm}
@media print{html,body{margin:0!important;padding:0!important;background:white!important;color-scheme:light}body.report-open>*:not(#report-view){display:none!important}#report-view{background:white;padding:0;min-height:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}#report-view .report-toolbar{display:none!important}#report-view .report-scroll{padding:0;overflow:visible}#report-view .report-page{width:100%;min-height:182mm;border:0;margin:0;padding:0 0 13mm;box-shadow:none;break-after:page;page-break-after:always}#report-view .report-page:last-child{break-after:auto;page-break-after:auto}#report-view .report-market,#report-view .report-reference,#report-view .report-notes{break-inside:avoid}#report-view a{text-decoration:none}}
`;

export function buildReport({data,generatedAt=new Date().toISOString()}){
  const indicators=data.indicators,created=date(generatedAt);
  const sections=[
    {title:'세계 주요 증시',body:table(indicators,'stocks')+'<p class="report-note">주식 수치는 지수 포인트입니다. 휴장 또는 장 종료 시 마지막 거래 시세를 사용하며, 모든 비교값은 실제 완료된 거래일의 값입니다. 현재 시세는 출처에서 지연될 수 있습니다.</p>'},
    {title:'국채 금리',body:table(indicators,'bonds')+'<p class="report-note">금리는 연율(%)입니다. 각 비교 칸은 당시 금리, 현재 대비 상대 변화율, 금리 차이(bp)를 함께 표시합니다. 1bp = 0.01%포인트이며 일본 국채는 출처 기준 2시간 지연 시세입니다.</p>'},
    {title:'상품과 환율',body:table(indicators,'commodities')+table(indicators,'fx')+'<p class="report-note">상품의 모든 비교값은 같은 선물 계약월을 사용합니다. 환율은 외화당 원화, 엔은 100엔당 원화입니다. 위안은 같은 거래일·15분 이내 두 시세의 교차 환율입니다.</p>'},
    {title:'가상자산',body:table(indicators,'crypto')+`<aside class="report-reference" aria-labelledby="report-reference-title"><h2 id="report-reference-title">참고사항</h2><div class="report-notes"><section><h3>비교 기간과 계산</h3><p>직전 마감은 현재 시세의 현지 거래일보다 앞선 최근 완료 종가입니다. 1주일은 7일 전, 1개월·3개월·12개월은 달력 기준으로 계산하며 휴장일에는 해당 날짜 이전의 완료 값을 사용합니다. 변화율은 (현재 수치 - 비교 수치) ÷ 비교 수치 × 100으로 계산합니다. 금리 차이는 (현재 금리 - 비교 금리) × 100bp입니다.</p></section><section><h3>시각과 조회 상태</h3><p>보고서 작성 시각은 데이터 시각과 다릅니다. 날짜만 있는 값은 현지 거래일이며 시각이 있는 값은 한국시간(KST)입니다. 조회 실패 지표는 이전 확인값과 실패 표시를 유지하고, 없는 비교값은 확인 불가로 표시합니다. 이 보고서는 버튼을 누른 당시 화면의 데이터로 작성하며 추가 시세 조회를 실행하지 않습니다. 가상자산은 업비트 원화시장 체결가격이며 일봉은 한국시간 오전 9시에 마감합니다. 자료 제공: Yahoo Finance, 네이버 증권, Tencent Finance / Eastmoney, 업비트.</p></section></div></aside>`}
  ];
  return sections.map(({title,body},index)=>`<article class="report-page" aria-label="보고서 ${index+1}쪽"><header class="report-header"><div><div class="report-brand">Econo<em>Dash</em></div><h1>${title}</h1></div><div class="report-stamp">보고서 작성 ${created} KST<br>전체 ${indicators.length}개 지표 · 현재 및 5개 비교 기간</div></header>${body}<footer class="report-footer"><span>EconoDash · 시각 표시는 KST / 날짜만 있는 값은 현지 거래일</span><span>${index+1} / ${sections.length}</span></footer></article>`).join('');
}

export function openReport(options){
  let root=document.getElementById('report-view');
  if(!root){root=document.createElement('section');root.id='report-view';root.setAttribute('aria-label','경제 지표 PDF 리포트');root.hidden=true;document.body.append(root);const style=document.createElement('style');style.textContent=reportStyles;document.head.append(style);}
  const previousScroll=window.scrollY,previousTitle=document.title;
  root.innerHTML=`<div class="report-toolbar"><div><strong>PDF 리포트 미리보기</strong><p>인쇄 창에서 ‘PDF로 저장’을 선택하세요. A4 가로 · 머리글과 바닥글 해제를 권장합니다.</p></div><div class="report-actions"><button type="button" data-report-close>대시보드로 돌아가기</button><button type="button" data-report-print>인쇄 / PDF 저장</button></div></div><div class="report-scroll">${buildReport(options)}</div>`;
  root.hidden=false;document.body.classList.add('report-open');document.title=`EconoDash-경제리포트-${new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Seoul'})}`;window.scrollTo(0,0);
  const close=()=>{root.hidden=true;root.innerHTML='';document.body.classList.remove('report-open');document.title=previousTitle;document.removeEventListener('keydown',onKey);window.scrollTo(0,previousScroll);document.getElementById('export-button').focus({preventScroll:true});};
  const onKey=event=>{if(event.key==='Escape')close();};
  root.querySelector('[data-report-close]').addEventListener('click',close);
  root.querySelector('[data-report-print]').addEventListener('click',async event=>{
    const button=event.currentTarget;button.disabled=true;
    try{await document.fonts.ready;window.print();}finally{button.disabled=false;}
  });
  document.addEventListener('keydown',onKey);root.querySelector('[data-report-print]').focus({preventScroll:true});
}
