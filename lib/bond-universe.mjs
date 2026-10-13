// Confirmed against Naver's country bond lists: KOR, USA, JPN.
// These are benchmark market-yield tenors, including remaining maturities.
const countries={
  kr:{prefix:'KR',nation:'KOR',currency:'KRW',zone:'Asia/Seoul',label:'한국',ticker:'KOREA',tenors:['1Y','2Y','3Y','4Y','5Y','10Y','20Y','30Y','50Y']},
  us:{prefix:'US',nation:'USA',currency:'USD',zone:'America/New_York',label:'미국',ticker:'US',tenors:['1M','2M','3M','6M','1Y','2Y','3Y','5Y','7Y','10Y','20Y','30Y']},
  jp:{prefix:'JP',nation:'JPN',currency:'JPY',zone:'Asia/Tokyo',label:'일본',ticker:'JAPAN',tenors:['1M','3M','6M','9M','1Y','2Y','3Y','4Y','5Y','6Y','7Y','8Y','9Y','10Y','15Y','20Y','30Y','40Y']},
};
export function bondGroupFor(maturity){
  const match=/^(\d+)(M|Y)$/.exec(maturity);
  if(!match||Number(match[1])<=0)throw new Error('Invalid bond maturity');
  const months=Number(match[1])*(match[2]==='Y'?12:1);
  return months<12?'ultra-short':months<=36?'short':months<=84?'intermediate':months<=120?'long':'ultra-long';
}
export const BOND_UNIVERSE=Object.freeze(Object.entries(countries).flatMap(([country,spec])=>spec.tenors.map(maturity=>{
  const count=Number(maturity.slice(0,-1)),monthly=maturity.endsWith('M');
  return {id:country+count+(monthly?'m':''),country:spec.prefix,code:`${spec.prefix}${maturity}T=RR`,maturity,maturityMonths:count*(monthly?1:12),bondGroup:bondGroupFor(maturity),nation:spec.nation,currency:spec.currency,zone:spec.zone,name:`${spec.label} ${count}${monthly?'개월':'년'}물`,ticker:`${spec.ticker} ${maturity}`};
})));
