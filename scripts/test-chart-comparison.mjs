import assert from 'node:assert/strict';
import {chartPeriods,compareIndicators} from '../chart-comparison.js';

assert.deepEqual(chartPeriods,['year','quarter','month','week','previous','current']);
const indicator = (values, scale=1) => ({values:Object.fromEntries(chartPeriods.map((key,index)=>[key,values[index]===null?null:values[index]*scale])),dates:Object.fromEntries(chartPeriods.map(key=>[key,key+'-date']))});
const stocks=indicator([100,105,110,115,95,120]),currency=indicator([1000,1050,950,980,1020,1100]);
let result=compareIndicators([stocks,currency]);
assert.equal(result.baseline,'year');
assert.deepEqual(result.series[0].points.map(p=>p.percent),[0,5,10,15,-5,20]);
assert.deepEqual(result.series[1].points.map(p=>p.percent),[0,5,-5,-2,2,10]);
// Unit conversions must not alter a comparison (e.g. dollars vs cents).
assert.deepEqual(compareIndicators([stocks,indicator([1000,1050,950,980,1020,1100],100)]).series[1].points.map(p=>p.percent),result.series[1].points.map(p=>p.percent));
// Missing observations retain their original period and never become zero.
result=compareIndicators([indicator([null,null,100,null,110,120]),currency],'month');
assert.equal(result.baseline,'month');
assert.deepEqual(result.periods,['month','week','previous','current']);
assert.equal(result.series[0].points[1].percent,null);
assert.equal(result.series[0].points[1].index,1);
assert.equal(result.series[0].points.at(-1).percent,20);
assert.equal(result.series[0].points.at(-1).date,'current-date');
// Keep the requested period: never silently substitute a different baseline.
assert.equal(compareIndicators([indicator([0,0,10,11,12,13]),currency]).baseline,undefined);
assert.equal(compareIndicators([indicator([0,0,10,11,12,13]),currency],'month').baseline,'month');
assert.equal(compareIndicators([indicator([null,100,110,120,130,140]),currency],'year').baseline,undefined);
assert.equal(compareIndicators([indicator([0,null,null,null,null,null]),currency]).baseline,undefined);
assert.equal(compareIndicators([indicator([0,null,null,null,null,null]),currency]).series[0].points[0].percent,null);
// Negative yields crossing zero preserve the direction of their change.
result=compareIndicators([indicator([-1,-.75,-.5,0,.5,1]),currency]);
assert.deepEqual(result.series[0].points.map(p=>p.percent),[0,25,50,100,150,200]);
assert.equal(compareIndicators([stocks,stocks]).series[1].points.at(-1).percent,20);
// Each selectable start truncates older observations and normalizes both series.
for(const [index,start] of chartPeriods.slice(0,-1).entries()) {
  result=compareIndicators([stocks,currency],start);
  assert.equal(result.baseline,start);
  assert.equal(result.startPeriod,start);
  assert.deepEqual(result.periods,chartPeriods.slice(index));
  for(const series of result.series) {
    assert.equal(series.points[0].percent,0);
    assert.equal(series.points[0].date,start+'-date');
    assert.equal(series.points[0].index,0);
    assert.equal(series.points.at(-1).key,'current');
    assert.equal(series.points.length,6-index);
    assert.ok(Math.abs(series.points.at(-1).percent-(series.item.values.current-series.item.values[start])/Math.abs(series.item.values[start])*100)<1e-9);
  }
}
assert.deepEqual(compareIndicators([stocks,currency],'previous').periods,['previous','current']);
assert.equal(compareIndicators([stocks,currency],'current').startPeriod,'year');
assert.equal(compareIndicators([stocks,currency],'invalid').startPeriod,'year');
console.log('PASS: all five selectable starts, cropped periods, common normalization, missing/zero values, unit invariance and negative baselines.');
