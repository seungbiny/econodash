const sectorSource='https://www.ssga.com/us/en/intermediary/capabilities/equities/sector-investing/select-sector-etfs';
const koreaSource='https://www.samsungfund.com/upload/kodex/newsroom/2026011317101936.pdf';
const usSectors=[
  ['소재','XLB','Materials'],['커뮤니케이션','XLC','Communication Services'],['에너지','XLE','Energy'],['금융','XLF','Financial'],['산업재','XLI','Industrial'],['정보기술','XLK','Technology'],['필수소비재','XLP','Consumer Staples'],['부동산','XLRE','Real Estate'],['유틸리티','XLU','Utilities'],['헬스케어','XLV','Health Care'],['경기소비재','XLY','Consumer Discretionary'],
];
const krSectors=[
  ['반도체','091160','KODEX 반도체'],['IT','266370','KODEX IT'],['헬스케어','266420','KODEX 헬스케어'],['은행','091170','KODEX 은행'],['증권','102970','KODEX 증권'],['자동차','091180','KODEX 자동차'],['에너지·화학','117460','KODEX 에너지화학'],['철강','117680','KODEX 철강'],['건설','117700','KODEX 건설'],['기계·장비','102960','KODEX 기계장비'],['필수소비재','266410','KODEX 필수소비재'],['경기소비재','266390','KODEX 경기소비재'],
];
const usFactors=[
  ['성장주','IWF','iShares Russell 1000 Growth ETF','https://www.ishares.com/us/products/239706/ishares-russell-1000-growth-etf'],
  ['가치주','IWD','iShares Russell 1000 Value ETF','https://www.ishares.com/us/products/239708/ishares-russell-1000-etf'],
  ['로우볼','USMV','iShares MSCI USA Min Vol Factor ETF','https://www.ishares.com/us/products/239695/ishares-msci-usa-min-vol-etf'],
  ['모멘텀','MTUM','iShares MSCI USA Momentum Factor ETF','https://www.ishares.com/us/products/251614/MTUM'],
  ['퀄리티','QUAL','iShares MSCI USA Quality Factor ETF','https://www.ishares.com/us/products/256101/QUAL'],
  ['소형주','IWM','iShares Russell 2000 ETF','https://www.ishares.com/us/products/239710/ishares-russell-2000-etf'],
  ['배당성장','VIG','Vanguard Dividend Appreciation ETF','https://advisors.vanguard.com/investments/products/new/vig/vanguard-dividend-appreciation-etf'],
];
const krFactors=[
  ['성장주','325010','KODEX 성장주'],['가치주','275290','KODEX 가치주'],['로우볼','279540','KODEX 최소변동성'],['모멘텀','275280','KODEX 모멘텀주'],['퀄리티','275300','KODEX 우량주'],['고배당','279530','KODEX 고배당주'],['중소형주','226980','KODEX 200 중소형'],
];
export const STOCK_ETFS=Object.freeze([
  ...usSectors.map(([label,symbol,sector])=>({id:'us-sector-'+symbol.toLowerCase(),symbol,country:'US',stockGroup:'us-sectors',name:'미국 '+label,fundName:`State Street ${sector} Select Sector SPDR ETF`,fundUrl:sectorSource})),
  ...krSectors.map(([label,symbol,fundName])=>({id:'kr-sector-'+symbol,symbol,country:'KR',stockGroup:'kr-sectors',name:'한국 '+label,fundName,fundUrl:koreaSource})),
  ...usFactors.map(([label,symbol,fundName,fundUrl])=>({id:'us-factor-'+symbol.toLowerCase(),symbol,country:'US',stockGroup:'us-factors',name:'미국 '+label,fundName,fundUrl})),
  ...krFactors.map(([label,symbol,fundName])=>({id:'kr-factor-'+symbol,symbol,country:'KR',stockGroup:'kr-factors',name:'한국 '+label,fundName,fundUrl:koreaSource})),
]);
