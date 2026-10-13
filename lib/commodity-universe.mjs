const cme=path=>'https://www.cmegroup.com/markets/'+path+'.contractSpecs.html';
const months=[1,2,3,4,5,6,7,8,9,10,11,12],grains=[3,5,7,9,12];
export const COMMODITY_UNIVERSE=Object.freeze([
  {id:'gold',name:'금',commodityGroup:'metals',root:'GC',suffix:'CMX',quoteCurrency:'USD',unit:'$/트로이온스',decimals:2,deliveryMonths:months,unitSpecUrl:cme('metals/precious/gold')},
  {id:'silver',name:'은',commodityGroup:'metals',root:'SI',suffix:'CMX',quoteCurrency:'USD',unit:'$/트로이온스',decimals:3,deliveryMonths:months,unitSpecUrl:cme('metals/precious/silver')},
  {id:'copper',name:'동(구리)',commodityGroup:'metals',root:'HG',suffix:'CMX',quoteCurrency:'USD',unit:'$/파운드',decimals:4,deliveryMonths:months,unitSpecUrl:cme('metals/base/copper')},
  {id:'platinum',name:'백금',commodityGroup:'metals',root:'PL',suffix:'NYM',quoteCurrency:'USD',unit:'$/트로이온스',decimals:2,deliveryMonths:[1,4,7,10],unitSpecUrl:cme('metals/precious/platinum')},
  {id:'palladium',name:'팔라듐',commodityGroup:'metals',root:'PA',suffix:'NYM',quoteCurrency:'USD',unit:'$/트로이온스',decimals:2,deliveryMonths:[3,6,9,12],unitSpecUrl:cme('metals/precious/palladium')},
  {id:'wti',name:'WTI 원유',commodityGroup:'energy',root:'CL',suffix:'NYM',quoteCurrency:'USD',unit:'$/배럴',decimals:2,deliveryMonths:months,unitSpecUrl:cme('energy/crude-oil/light-sweet-crude')},
  {id:'brent',name:'브렌트 원유',commodityGroup:'energy',root:'BZ',suffix:'NYM',quoteCurrency:'USD',unit:'$/배럴',decimals:2,deliveryMonths:months,selectContract:'calendar',minMonthOffset:2,unitSpecUrl:cme('energy/crude-oil/brent-crude-oil')},
  {id:'naturalgas',name:'천연가스',commodityGroup:'energy',root:'NG',suffix:'NYM',quoteCurrency:'USD',unit:'$/MMBtu',decimals:3,deliveryMonths:months,unitSpecUrl:cme('energy/natural-gas/natural-gas')},
  {id:'gasoline',name:'휘발유(RBOB)',commodityGroup:'energy',root:'RB',suffix:'NYM',quoteCurrency:'USD',unit:'$/갤런',decimals:4,deliveryMonths:months,unitSpecUrl:cme('energy/refined-products/rbob-gasoline')},
  {id:'heatingoil',name:'경유(ULSD)',commodityGroup:'energy',root:'HO',suffix:'NYM',quoteCurrency:'USD',unit:'$/갤런',decimals:4,deliveryMonths:months,unitSpecUrl:cme('energy/refined-products/heating-oil')},
  {id:'corn',name:'옥수수',commodityGroup:'agriculture',root:'ZC',suffix:'CBT',quoteCurrency:'USX',unit:'센트/부셸',decimals:2,deliveryMonths:grains,unitSpecUrl:'https://www.cmegroup.com/markets/agriculture/grains/corn/specs'},
  {id:'wheat',name:'밀(시카고 SRW)',commodityGroup:'agriculture',root:'ZW',suffix:'CBT',quoteCurrency:'USX',unit:'센트/부셸',decimals:2,deliveryMonths:grains,selectContract:'calendar',unitSpecUrl:'https://www.cmegroup.com/education/brochures-and-handbooks/wheat-futures-and-options'},
  {id:'soybeans',name:'대두',commodityGroup:'agriculture',root:'ZS',suffix:'CBT',quoteCurrency:'USX',unit:'센트/부셸',decimals:2,deliveryMonths:[1,3,5,7,8,9,11],unitSpecUrl:'https://www.cmegroup.com/trading/agricultural/files/grain-and-oilseed-futures-options-fact-card.pdf'},
  {id:'coffee',name:'커피(아라비카)',commodityGroup:'agriculture',root:'KC',suffix:'NYB',quoteCurrency:'USX',unit:'센트/파운드',decimals:2,deliveryMonths:grains,unitSpecUrl:'https://www.ice.com/products/15'},
  {id:'sugar',name:'원당(설탕)',commodityGroup:'agriculture',root:'SB',suffix:'NYB',quoteCurrency:'USX',unit:'센트/파운드',decimals:2,deliveryMonths:[3,5,7,10],selectContract:'calendar',unitSpecUrl:'https://www.ice.com/products/23/Sugar-'},
  {id:'cocoa',name:'코코아',commodityGroup:'agriculture',root:'CC',suffix:'NYB',quoteCurrency:'USD',unit:'$/메트릭톤',decimals:0,deliveryMonths:grains,unitSpecUrl:'https://www.ice.com/products/7/Cocoa-Futures'},
  {id:'cotton',name:'면화',commodityGroup:'agriculture',root:'CT',suffix:'NYB',quoteCurrency:'USX',unit:'센트/파운드',decimals:2,deliveryMonths:[3,5,7,10,12],selectContract:'calendar',unitSpecUrl:'https://www.ice.com/products/254/Cotton-No-2-Futures/specs'},
].map(spec=>({...spec,front:spec.root+'=F'})));
